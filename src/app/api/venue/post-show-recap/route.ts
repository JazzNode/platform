import { NextRequest, NextResponse } from 'next/server';
import { verifyVenueClaimToken } from '@/lib/venue-auth';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get('venueId');
  const eventId = req.nextUrl.searchParams.get('eventId');
  if (!venueId) return NextResponse.json({ error: 'Missing venueId' }, { status: 400 });

  const { isAuthorized } = await verifyVenueClaimToken(
    req.headers.get('authorization'),
    venueId,
  );
  if (!isAuthorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();

  // Tier gate: require tier >= 2
  const { data: venue } = await supabase
    .from('venues')
    .select('tier')
    .eq('venue_id', venueId)
    .single();

  if (!venue || (venue.tier ?? 0) < 2) {
    return NextResponse.json({ error: 'Premium required' }, { status: 403 });
  }

  // If a specific eventId is provided, return recap for that event only.
  // Otherwise return recaps for recent past events (last 30 days).
  if (eventId) {
    const recap = await buildVenueRecap(supabase, venueId, eventId);
    if (!recap) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    return NextResponse.json({ recaps: [recap] });
  }

  // Fetch recent past events for this venue (ended in last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const { data: events } = await supabase
    .from('events')
    .select('event_id, title_local, title_en, start_at, end_at, lifecycle_status')
    .eq('venue_id', venueId)
    .gte('start_at', thirtyDaysAgo)
    .lt('start_at', now)
    .in('lifecycle_status', ['upcoming', 'past', 'completed'])
    .order('start_at', { ascending: false })
    .limit(10);

  if (!events || events.length === 0) {
    return NextResponse.json({ recaps: [] });
  }

  const recaps = [];
  for (const event of events) {
    const recap = await buildVenueRecap(supabase, venueId, event.event_id, event);
    if (recap) recaps.push(recap);
  }

  return NextResponse.json({ recaps });
}

async function buildVenueRecap(
  supabase: ReturnType<typeof createAdminClient>,
  venueId: string,
  eventId: string,
  eventData?: Record<string, unknown>,
) {
  // Fetch event if not provided
  let event = eventData;
  if (!event) {
    const { data } = await supabase
      .from('events')
      .select('event_id, title_local, title_en, start_at, end_at, venue_id, lifecycle_status')
      .eq('event_id', eventId)
      .eq('venue_id', venueId)
      .maybeSingle();

    if (!data) return null;
    event = data;
  }

  const eventStart = new Date(event.start_at as string);
  const eventEnd = event.end_at ? new Date(event.end_at as string) : new Date(eventStart.getTime() + 3 * 60 * 60 * 1000);

  const threeDaysBefore = new Date(eventStart.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const threeDaysAfter = new Date(eventEnd.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const weekBefore = new Date(eventStart.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const weekAfter = new Date(eventEnd.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Check if event is too recent (less than 3 days after end)
  const now = Date.now();
  const tooRecent = now < eventEnd.getTime() + 3 * 24 * 60 * 60 * 1000;

  // Page views before event (3 days)
  const { count: viewsBefore } = await supabase
    .from('venue_page_views')
    .select('*', { count: 'exact', head: true })
    .eq('venue_id', venueId)
    .gte('viewed_at', threeDaysBefore)
    .lt('viewed_at', eventStart.toISOString());

  // Page views after event (3 days)
  const { count: viewsAfter } = await supabase
    .from('venue_page_views')
    .select('*', { count: 'exact', head: true })
    .eq('venue_id', venueId)
    .gt('viewed_at', eventEnd.toISOString())
    .lte('viewed_at', threeDaysAfter);

  // New followers in the week around the event
  const { count: newFollowers } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('target_type', 'venue')
    .eq('target_id', venueId)
    .gte('created_at', weekBefore)
    .lte('created_at', weekAfter);

  // Top referrers during event week
  const { data: eventWeekViews } = await supabase
    .from('venue_page_views')
    .select('referrer, city')
    .eq('venue_id', venueId)
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

  // Lineup boost: for each artist, compare before/after views
  const { data: lineups } = await supabase
    .from('lineups')
    .select('artist_id')
    .eq('event_id', eventId);

  const lineupBoost: { artistId: string; name: string; viewsBefore: number; viewsAfter: number }[] = [];

  if (lineups && lineups.length > 0) {
    const artistIds = [...new Set(lineups.map((l) => l.artist_id).filter(Boolean))];

    // Fetch artist names
    const { data: artists } = await supabase
      .from('artists')
      .select('artist_id, display_name, name_en, name_local')
      .in('artist_id', artistIds);

    const nameMap = Object.fromEntries(
      (artists || []).map((a) => [a.artist_id, a.display_name || a.name_en || a.name_local || a.artist_id]),
    );

    for (const artistId of artistIds) {
      const { count: aBefore } = await supabase
        .from('artist_page_views')
        .select('*', { count: 'exact', head: true })
        .eq('artist_id', artistId)
        .gte('viewed_at', threeDaysBefore)
        .lt('viewed_at', eventStart.toISOString());

      const { count: aAfter } = await supabase
        .from('artist_page_views')
        .select('*', { count: 'exact', head: true })
        .eq('artist_id', artistId)
        .gt('viewed_at', eventEnd.toISOString())
        .lte('viewed_at', threeDaysAfter);

      lineupBoost.push({
        artistId,
        name: nameMap[artistId] || artistId,
        viewsBefore: aBefore ?? 0,
        viewsAfter: aAfter ?? 0,
      });
    }
  }

  const before = viewsBefore ?? 0;
  const after = viewsAfter ?? 0;
  const liftPct = before > 0 ? Math.round(((after - before) / before) * 100) : (after > 0 ? 100 : 0);

  return {
    eventId: event.event_id ?? eventId,
    title: (event.title_en || event.title_local || 'Untitled Event') as string,
    startAt: event.start_at,
    endAt: event.end_at,
    tooRecent,
    viewsBefore: before,
    viewsAfter: after,
    liftPct,
    newFollowers: newFollowers ?? 0,
    topReferrers,
    citiesReached: citiesSet.size,
    lineupBoost,
  };
}
