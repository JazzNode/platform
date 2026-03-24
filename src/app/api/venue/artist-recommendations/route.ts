import { NextRequest, NextResponse } from 'next/server';
import { verifyVenueClaimToken } from '@/lib/venue-auth';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get('venueId');
  if (!venueId) {
    return NextResponse.json({ error: 'Missing venueId' }, { status: 400 });
  }

  const { isAuthorized } = await verifyVenueClaimToken(
    req.headers.get('authorization'),
    venueId,
  );
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Tier gate: require tier >= 2
  const { data: venue } = await supabase
    .from('venues')
    .select('tier')
    .eq('venue_id', venueId)
    .single();

  if (!venue || (venue.tier ?? 0) < 2) {
    return NextResponse.json({ error: 'Requires Premium (tier 2+)' }, { status: 403 });
  }

  // Recommendation query using collaborative filtering:
  // 1. Find artists who performed at this venue
  // 2. Find other venues those artists also performed at (similar venues)
  // 3. Find artists at similar venues who have NOT performed at this venue
  // 4. Rank by how many similar venues they appear at
  const { data: recommendations, error } = await supabase.rpc(
    'get_artist_recommendations',
    { target_venue_id: venueId },
  ).select('*');

  // If RPC doesn't exist yet, fall back to raw SQL via multiple queries
  if (error) {
    return await fallbackRecommendations(supabase, venueId);
  }

  return NextResponse.json({ recommendations: recommendations ?? [] });
}

/**
 * Fallback approach using multiple Supabase queries instead of an RPC.
 * This implements the same collaborative filtering algorithm.
 */
async function fallbackRecommendations(
  supabase: ReturnType<typeof createAdminClient>,
  venueId: string,
) {
  // Step 1: Get all artist IDs who have performed at this venue
  const { data: venueEvents } = await supabase
    .from('events')
    .select('event_id')
    .eq('venue_id', venueId);

  if (!venueEvents || venueEvents.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  const eventIds = venueEvents.map((e) => e.event_id);

  const { data: venueLineups } = await supabase
    .from('lineups')
    .select('artist_id')
    .in('event_id', eventIds);

  if (!venueLineups || venueLineups.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  const venueArtistIds = [...new Set(venueLineups.map((l) => l.artist_id))];

  // Step 2: Find other venues where those artists also performed (similar venues)
  const { data: crossLineups } = await supabase
    .from('lineups')
    .select('event_id, artist_id')
    .in('artist_id', venueArtistIds);

  if (!crossLineups || crossLineups.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  const crossEventIds = [...new Set(crossLineups.map((l) => l.event_id))];

  const { data: crossEvents } = await supabase
    .from('events')
    .select('event_id, venue_id')
    .in('event_id', crossEventIds)
    .neq('venue_id', venueId);

  if (!crossEvents || crossEvents.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  const similarVenueIds = [...new Set(crossEvents.map((e) => e.venue_id))];

  // Step 3: Find artists at similar venues who have NOT performed at this venue
  const { data: similarVenueEvents } = await supabase
    .from('events')
    .select('event_id, venue_id')
    .in('venue_id', similarVenueIds);

  if (!similarVenueEvents || similarVenueEvents.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  const similarEventIds = similarVenueEvents.map((e) => e.event_id);

  const { data: candidateLineups } = await supabase
    .from('lineups')
    .select('artist_id, event_id')
    .in('event_id', similarEventIds);

  if (!candidateLineups || candidateLineups.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  // Build event_id -> venue_id lookup
  const eventVenueMap = new Map<string, string>();
  for (const e of similarVenueEvents) {
    eventVenueMap.set(e.event_id, e.venue_id);
  }

  // Count how many distinct similar venues each candidate artist appears at
  const venueArtistSet = new Set(venueArtistIds);
  const artistVenueOverlap = new Map<string, Set<string>>();

  for (const l of candidateLineups) {
    if (venueArtistSet.has(l.artist_id)) continue; // skip artists already at this venue
    const vId = eventVenueMap.get(l.event_id);
    if (!vId) continue;
    if (!artistVenueOverlap.has(l.artist_id)) {
      artistVenueOverlap.set(l.artist_id, new Set());
    }
    artistVenueOverlap.get(l.artist_id)!.add(vId);
  }

  // Step 4: Rank and take top 10
  const ranked = [...artistVenueOverlap.entries()]
    .map(([artistId, venues]) => ({ artistId, venueOverlap: venues.size }))
    .sort((a, b) => b.venueOverlap - a.venueOverlap)
    .slice(0, 10);

  if (ranked.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  // Fetch artist details
  const { data: artists } = await supabase
    .from('artists')
    .select('artist_id, display_name, slug, instrument, avatar_url, city')
    .in('artist_id', ranked.map((r) => r.artistId));

  const artistMap = new Map(
    (artists ?? []).map((a) => [a.artist_id, a]),
  );

  // Also get the most common instruments at this venue for instrument-based reasoning
  const instrumentCounts = new Map<string, number>();
  for (const aId of venueArtistIds) {
    const artist = artistMap.get(aId);
    if (artist?.instrument) {
      instrumentCounts.set(
        artist.instrument,
        (instrumentCounts.get(artist.instrument) ?? 0) + 1,
      );
    }
  }

  // Fetch venue artist instruments for reason generation
  const { data: venueArtistDetails } = await supabase
    .from('artists')
    .select('instrument')
    .in('artist_id', venueArtistIds);

  const venueInstruments = new Set(
    (venueArtistDetails ?? [])
      .map((a) => a.instrument)
      .filter(Boolean),
  );

  const recommendations = ranked.map((r) => {
    const artist = artistMap.get(r.artistId);
    // Generate reason string
    let reason: string;
    if (r.venueOverlap >= 2) {
      reason = `Performed at ${r.venueOverlap} similar venues`;
    } else if (artist?.instrument && venueInstruments.has(artist.instrument)) {
      reason = `Plays ${artist.instrument} at similar venues`;
    } else {
      reason = 'Performed at a similar venue';
    }

    return {
      artist_id: r.artistId,
      display_name: artist?.display_name ?? 'Unknown',
      slug: artist?.slug ?? r.artistId,
      instrument: artist?.instrument ?? null,
      avatar_url: artist?.avatar_url ?? null,
      city: artist?.city ?? null,
      venue_overlap: r.venueOverlap,
      reason,
    };
  });

  return NextResponse.json({ recommendations });
}
