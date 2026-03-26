import { NextRequest, NextResponse } from 'next/server';
import { verifyArtistClaimToken } from '@/lib/artist-auth';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(req: NextRequest) {
  const artistId = req.nextUrl.searchParams.get('artistId');
  if (!artistId) {
    return NextResponse.json({ error: 'Missing artistId' }, { status: 400 });
  }

  const { isAuthorized } = await verifyArtistClaimToken(
    req.headers.get('authorization'),
    artistId,
  );
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Verify tier >= 2
  const { data: artist } = await supabase
    .from('artists')
    .select('tier')
    .eq('artist_id', artistId)
    .single();

  if (!artist || artist.tier < 2) {
    return NextResponse.json({ error: 'Premium required' }, { status: 403 });
  }

  // ── 1. Get all events this artist performed at ──
  const { data: myLineups } = await supabase
    .from('lineups')
    .select('event_id')
    .eq('artist_id', artistId);

  if (!myLineups || myLineups.length === 0) {
    return NextResponse.json({
      stats: { totalCollaborators: 0, totalGigs: 0, mostFrequent: null, gigsThisYear: 0 },
      topCollaborators: [],
      timeline: [],
      suggestedCollaborators: [],
    });
  }

  const myEventIds = [...new Set(myLineups.map((l) => l.event_id).filter(Boolean))];

  // ── 2. Get event details (dates, venues) ──
  const { data: events } = await supabase
    .from('events')
    .select('event_id, title_local, start_at, venue_id')
    .in('event_id', myEventIds)
    .order('start_at', { ascending: false });

  const eventMap = new Map((events || []).map((e) => [e.event_id, e]));

  // ── 3. Get all other artists in those events ──
  const { data: allLineups } = await supabase
    .from('lineups')
    .select('event_id, artist_id')
    .in('event_id', myEventIds)
    .neq('artist_id', artistId);

  // Build co-artist map: artistId → { eventIds, venues }
  const coArtistMap = new Map<string, { eventIds: Set<string>; venues: Set<string>; lastDate: string }>();

  for (const lineup of allLineups || []) {
    const event = eventMap.get(lineup.event_id);
    if (!event) continue;

    let entry = coArtistMap.get(lineup.artist_id);
    if (!entry) {
      entry = { eventIds: new Set(), venues: new Set(), lastDate: '' };
      coArtistMap.set(lineup.artist_id, entry);
    }
    entry.eventIds.add(lineup.event_id);
    if (event.venue_id) entry.venues.add(event.venue_id);
    if (event.start_at && event.start_at > entry.lastDate) {
      entry.lastDate = event.start_at;
    }
  }

  // ── 4. Stats ──
  const totalCollaborators = coArtistMap.size;
  const totalGigs = myEventIds.length;

  let mostFrequent: { id: string; name: string; count: number } | null = null;
  let maxCount = 0;
  for (const [id, data] of coArtistMap) {
    if (data.eventIds.size > maxCount) {
      maxCount = data.eventIds.size;
      mostFrequent = { id, name: '', count: maxCount };
    }
  }

  // Gigs this year
  const thisYear = new Date().getFullYear().toString();
  const gigsThisYear = (events || []).filter((e) => e.start_at?.startsWith(thisYear)).length;

  // ── 5. Top Collaborators (top 15) ──
  const topCollabIds = [...coArtistMap.entries()]
    .sort((a, b) => b[1].eventIds.size - a[1].eventIds.size)
    .slice(0, 15)
    .map(([id]) => id);

  // Fetch artist info for top collaborators + most frequent
  const lookupIds = [...new Set([...topCollabIds, ...(mostFrequent ? [mostFrequent.id] : [])])];

  let artistInfoMap = new Map<string, { display_name: string; name_local: string | null; photo_url: string | null }>();
  if (lookupIds.length > 0) {
    const { data: artists } = await supabase
      .from('artists')
      .select('artist_id, display_name, name_local, photo_url')
      .in('artist_id', lookupIds);

    artistInfoMap = new Map((artists || []).map((a) => [a.artist_id, a]));
  }

  if (mostFrequent) {
    const info = artistInfoMap.get(mostFrequent.id);
    mostFrequent.name = info?.name_local || info?.display_name || mostFrequent.id;
  }

  // Fetch venue names
  const allVenueIds = new Set<string>();
  for (const data of coArtistMap.values()) {
    for (const v of data.venues) allVenueIds.add(v);
  }

  let venueNameMap = new Map<string, string>();
  if (allVenueIds.size > 0) {
    const { data: venues } = await supabase
      .from('venues')
      .select('venue_id, name_local, name_en')
      .in('venue_id', [...allVenueIds]);

    venueNameMap = new Map((venues || []).map((v) => [v.venue_id, v.name_local || v.name_en || v.venue_id]));
  }

  const topCollaborators = topCollabIds.map((id) => {
    const data = coArtistMap.get(id)!;
    const info = artistInfoMap.get(id);
    return {
      artistId: id,
      name: info?.name_local || info?.display_name || id,
      photoUrl: info?.photo_url || null,
      sharedGigs: data.eventIds.size,
      lastGigDate: data.lastDate.slice(0, 10),
      venuesTogether: [...data.venues].map((v) => venueNameMap.get(v) || v).slice(0, 5),
    };
  });

  // ── 6. Timeline: gigs per quarter ──
  const quarterBuckets: Record<string, number> = {};
  for (const event of events || []) {
    if (!event.start_at) continue;
    const date = new Date(event.start_at);
    const q = Math.ceil((date.getMonth() + 1) / 3);
    const key = `${date.getFullYear()}-Q${q}`;
    quarterBuckets[key] = (quarterBuckets[key] || 0) + 1;
  }

  const timeline = Object.entries(quarterBuckets)
    .map(([quarter, count]) => ({ quarter, count }))
    .sort((a, b) => a.quarter.localeCompare(b.quarter));

  // ── 7. Suggested Collaborators (2nd-degree connections) ──
  // Find artists who share 2+ collaborators with this artist but never played together
  const myCollaboratorIds = new Set(coArtistMap.keys());
  const mutualMap = new Map<string, Set<string>>(); // candidateId → set of mutual collaborator names

  if (myCollaboratorIds.size > 0) {
    // Get events of direct collaborators (sample: top 30 by shared gigs)
    const sampleCollabIds = [...coArtistMap.entries()]
      .sort((a, b) => b[1].eventIds.size - a[1].eventIds.size)
      .slice(0, 30)
      .map(([id]) => id);

    const { data: collabLineups } = await supabase
      .from('lineups')
      .select('event_id, artist_id')
      .in('artist_id', sampleCollabIds);

    // Group by event → get co-artists of our collaborators
    const collabEventMap = new Map<string, Set<string>>();
    for (const l of collabLineups || []) {
      let set = collabEventMap.get(l.event_id);
      if (!set) { set = new Set(); collabEventMap.set(l.event_id, set); }
      set.add(l.artist_id);
    }

    // For each event, find artists that are NOT me and NOT my direct collaborators
    for (const [, artistsInEvent] of collabEventMap) {
      const candidates = [...artistsInEvent].filter(
        (id) => id !== artistId && !myCollaboratorIds.has(id),
      );
      const bridges = [...artistsInEvent].filter((id) => myCollaboratorIds.has(id));

      for (const candidate of candidates) {
        for (const bridge of bridges) {
          let set = mutualMap.get(candidate);
          if (!set) { set = new Set(); mutualMap.set(candidate, set); }
          const bridgeInfo = artistInfoMap.get(bridge);
          set.add(bridgeInfo?.name_local || bridgeInfo?.display_name || bridge);
        }
      }
    }
  }

  // Filter to candidates with 2+ mutual connections, sorted by count
  const suggestedIds = [...mutualMap.entries()]
    .filter(([, mutuals]) => mutuals.size >= 2)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 5)
    .map(([id]) => id);

  // Fetch artist info for suggestions
  let suggestedInfoMap = new Map<string, { display_name: string; name_local: string | null; photo_url: string | null }>();
  if (suggestedIds.length > 0) {
    const { data: suggestedArtists } = await supabase
      .from('artists')
      .select('artist_id, display_name, name_local, photo_url')
      .in('artist_id', suggestedIds);

    suggestedInfoMap = new Map((suggestedArtists || []).map((a) => [a.artist_id, a]));
  }

  const suggestedCollaborators = suggestedIds.map((id) => {
    const info = suggestedInfoMap.get(id);
    const mutuals = mutualMap.get(id)!;
    return {
      artistId: id,
      name: info?.name_local || info?.display_name || id,
      photoUrl: info?.photo_url || null,
      mutualCount: mutuals.size,
      mutualNames: [...mutuals].slice(0, 3),
    };
  });

  return NextResponse.json({
    stats: { totalCollaborators, totalGigs, mostFrequent, gigsThisYear },
    topCollaborators,
    timeline,
    suggestedCollaborators,
  });
}
