import { NextRequest, NextResponse } from 'next/server';
import { verifyArtistClaimToken } from '@/lib/artist-auth';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(req: NextRequest) {
  const artistId = req.nextUrl.searchParams.get('artistId');
  const eventId = req.nextUrl.searchParams.get('eventId');
  if (!artistId) return NextResponse.json({ error: 'Missing artistId' }, { status: 400 });

  const { isAuthorized } = await verifyArtistClaimToken(
    req.headers.get('authorization'),
    artistId,
  );
  if (!isAuthorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();

  // Tier gate: require tier >= 2
  const { data: artist } = await supabase
    .from('artists')
    .select('tier')
    .eq('artist_id', artistId)
    .single();

  if (!artist || (artist.tier ?? 0) < 2) {
    return NextResponse.json({ error: 'Premium required' }, { status: 403 });
  }

  // If a specific eventId is provided, return recap for that event only.
  if (eventId) {
    const recap = await buildArtistRecap(supabase, artistId, eventId);
    if (!recap) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    return NextResponse.json({ recaps: [recap] });
  }

  // Find recent events this artist performed at (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const { data: lineups } = await supabase
    .from('lineups')
    .select('event_id')
    .eq('artist_id', artistId);

  if (!lineups || lineups.length === 0) {
    return NextResponse.json({ recaps: [] });
  }

  const eventIds = [...new Set(lineups.map((l) => l.event_id).filter(Boolean))];

  const { data: events } = await supabase
    .from('events')
    .select('event_id, title_local, title_en, start_at, end_at, venue_id, lifecycle_status')
    .in('event_id', eventIds)
    .gte('start_at', thirtyDaysAgo)
    .lt('start_at', now)
    .in('lifecycle_status', ['upcoming', 'past', 'completed'])
    .order('start_at', { ascending: false })
    .limit(10);

  if (!events || events.length === 0) {
    return NextResponse.json({ recaps: [] });
  }

  // Fetch venue names for display
  const venueIds = [...new Set(events.map((e) => e.venue_id).filter(Boolean))];
  const { data: venues } = await supabase
    .from('venues')
    .select('venue_id, name_local, name_en')
    .in('venue_id', venueIds);

  const venueMap = Object.fromEntries(
    (venues || []).map((v) => [v.venue_id, v.name_en || v.name_local || v.venue_id]),
  );

  const recaps = [];
  for (const event of events) {
    const recap = await buildArtistRecap(supabase, artistId, event.event_id, event, venueMap);
    if (recap) recaps.push(recap);
  }

  return NextResponse.json({ recaps });
}

async function buildArtistRecap(
  supabase: ReturnType<typeof createAdminClient>,
  artistId: string,
  eventId: string,
  eventData?: Record<string, unknown>,
  venueMap?: Record<string, string>,
) {
  // Fetch event if not provided
  let event = eventData;
  if (!event) {
    const { data } = await supabase
      .from('events')
      .select('event_id, title_local, title_en, start_at, end_at, venue_id, lifecycle_status')
      .eq('event_id', eventId)
      .maybeSingle();

    if (!data) return null;
    event = data;
  }

  // Verify this artist is in the lineup
  if (!eventData) {
    const { count } = await supabase
      .from('lineups')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('artist_id', artistId);

    if (!count || count === 0) return null;
  }

  const eventStart = new Date(event.start_at as string);
  const eventEnd = event.end_at ? new Date(event.end_at as string) : new Date(eventStart.getTime() + 3 * 60 * 60 * 1000);

  const threeDaysBefore = new Date(eventStart.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const threeDaysAfter = new Date(eventEnd.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const weekBefore = new Date(eventStart.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const weekAfter = new Date(eventEnd.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Check if event is too recent
  const now = Date.now();
  const tooRecent = now < eventEnd.getTime() + 3 * 24 * 60 * 60 * 1000;

  // Page views before event (3 days)
  const { count: viewsBefore } = await supabase
    .from('artist_page_views')
    .select('*', { count: 'exact', head: true })
    .eq('artist_id', artistId)
    .gte('viewed_at', threeDaysBefore)
    .lt('viewed_at', eventStart.toISOString());

  // Page views after event (3 days)
  const { count: viewsAfter } = await supabase
    .from('artist_page_views')
    .select('*', { count: 'exact', head: true })
    .eq('artist_id', artistId)
    .gt('viewed_at', eventEnd.toISOString())
    .lte('viewed_at', threeDaysAfter);

  // New followers in the week around the event
  const { count: newFollowers } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('target_type', 'artist')
    .eq('target_id', artistId)
    .gte('created_at', weekBefore)
    .lte('created_at', weekAfter);

  // Top referrers during event week
  const { data: eventWeekViews } = await supabase
    .from('artist_page_views')
    .select('referrer, city')
    .eq('artist_id', artistId)
    .gte('viewed_at', weekBefore)
    .lte('viewed_at', weekAfter);

  const referrerCounts: Record<string, number> = {};
  const citiesSet = new Set<string>();
  for (const v of eventWeekViews || []) {
    let ref = 'direct';
    if (v.referrer) {
      try { ref = new URL(v.referrer).hostname; } catch { /* keep direct */ }
    }
    referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;
    if (v.city) citiesSet.add(v.city);
  }

  const topReferrers = Object.entries(referrerCounts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const before = viewsBefore ?? 0;
  const after = viewsAfter ?? 0;
  const liftPct = before > 0 ? Math.round(((after - before) / before) * 100) : (after > 0 ? 100 : 0);

  // Get venue name
  let venueName = '';
  if (venueMap && event.venue_id) {
    venueName = venueMap[event.venue_id as string] || '';
  } else if (event.venue_id) {
    const { data: v } = await supabase
      .from('venues')
      .select('name_en, name_local')
      .eq('venue_id', event.venue_id)
      .maybeSingle();
    venueName = v?.name_en || v?.name_local || '';
  }

  return {
    eventId: event.event_id ?? eventId,
    title: (event.title_en || event.title_local || 'Untitled Event') as string,
    venueName,
    startAt: event.start_at,
    endAt: event.end_at,
    tooRecent,
    viewsBefore: before,
    viewsAfter: after,
    liftPct,
    newFollowers: newFollowers ?? 0,
    topReferrers,
    citiesReached: citiesSet.size,
  };
}
