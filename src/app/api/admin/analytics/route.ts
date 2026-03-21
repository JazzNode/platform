import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/admin/analytics — Platform trend analytics (admin only)
 * Query params: range = 7d | 28d | 90d | 365d
 */
export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdminToken(request.headers.get('authorization'));
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ALLOWED_RANGES: Record<string, number> = { '7d': 7, '28d': 28, '90d': 90, '365d': 365 };
  const range = request.nextUrl.searchParams.get('range') || '28d';
  const days = ALLOWED_RANGES[range] ?? 28;

  const now = new Date();
  const currentStart = new Date(now.getTime() - days * 86400000);
  const previousStart = new Date(currentStart.getTime() - days * 86400000);

  const currentSince = currentStart.toISOString();
  const previousSince = previousStart.toISOString();
  const currentEnd = now.toISOString();

  const supabase = createAdminClient();

  // Run all queries in parallel
  const [
    artistViewsCurrent,
    artistViewsPrevious,
    venueViewsCurrent,
    venueViewsPrevious,
    newUsersCurrent,
    newUsersPrevious,
    newFollowsCurrent,
    newFollowsPrevious,
    newEventsCurrent,
    newEventsPrevious,
    claimsCurrent,
    claimsPrevious,
    topArtistViews,
    topVenueViews,
    cityViews,
  ] = await Promise.all([
    // Artist page views - current period
    supabase
      .from('artist_page_views')
      .select('viewed_at, city')
      .gte('viewed_at', currentSince)
      .lte('viewed_at', currentEnd),
    // Artist page views - previous period
    supabase
      .from('artist_page_views')
      .select('viewed_at')
      .gte('viewed_at', previousSince)
      .lt('viewed_at', currentSince),
    // Venue page views - current period
    supabase
      .from('venue_page_views')
      .select('viewed_at, city')
      .gte('viewed_at', currentSince)
      .lte('viewed_at', currentEnd),
    // Venue page views - previous period
    supabase
      .from('venue_page_views')
      .select('viewed_at')
      .gte('viewed_at', previousSince)
      .lt('viewed_at', currentSince),
    // New users - current
    supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', currentSince)
      .lte('created_at', currentEnd),
    // New users - previous
    supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', previousSince)
      .lt('created_at', currentSince),
    // New follows - current
    supabase
      .from('follows')
      .select('created_at')
      .gte('created_at', currentSince)
      .lte('created_at', currentEnd),
    // New follows - previous
    supabase
      .from('follows')
      .select('created_at')
      .gte('created_at', previousSince)
      .lt('created_at', currentSince),
    // New events - current
    supabase
      .from('events')
      .select('created_at')
      .gte('created_at', currentSince)
      .lte('created_at', currentEnd),
    // New events - previous
    supabase
      .from('events')
      .select('created_at')
      .gte('created_at', previousSince)
      .lt('created_at', currentSince),
    // Claims - current period
    supabase
      .from('claims')
      .select('submitted_at, status')
      .gte('submitted_at', currentSince)
      .lte('submitted_at', currentEnd),
    // Claims - previous period
    supabase
      .from('claims')
      .select('submitted_at')
      .gte('submitted_at', previousSince)
      .lt('submitted_at', currentSince),
    // Top artists by views (current period) - need artist_id
    supabase
      .from('artist_page_views')
      .select('artist_id')
      .gte('viewed_at', currentSince)
      .lte('viewed_at', currentEnd),
    // Top venues by views (current period)
    supabase
      .from('venue_page_views')
      .select('venue_id')
      .gte('viewed_at', currentSince)
      .lte('viewed_at', currentEnd),
    // City views (combined from artist views current period - already fetched above, reuse)
    // We'll compute from artistViewsCurrent + venueViewsCurrent
    Promise.resolve(null),
  ]);

  const aViewsCurr = artistViewsCurrent.data || [];
  const aViewsPrev = artistViewsPrevious.data || [];
  const vViewsCurr = venueViewsCurrent.data || [];
  const vViewsPrev = venueViewsPrevious.data || [];
  const usersCurr = newUsersCurrent.data || [];
  const usersPrev = newUsersPrevious.data || [];
  const followsCurr = newFollowsCurrent.data || [];
  const followsPrev = newFollowsPrevious.data || [];
  const eventsCurr = newEventsCurrent.data || [];
  const eventsPrev = newEventsPrevious.data || [];
  const claimsCurr = claimsCurrent.data || [];
  const claimsPrev = claimsPrevious.data || [];

  // --- KPIs ---
  const totalViewsCurr = aViewsCurr.length + vViewsCurr.length;
  const totalViewsPrev = aViewsPrev.length + vViewsPrev.length;

  function pctChange(curr: number, prev: number): number {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  }

  const kpis = {
    views: { current: totalViewsCurr, previous: totalViewsPrev, change: pctChange(totalViewsCurr, totalViewsPrev) },
    users: { current: usersCurr.length, previous: usersPrev.length, change: pctChange(usersCurr.length, usersPrev.length) },
    follows: { current: followsCurr.length, previous: followsPrev.length, change: pctChange(followsCurr.length, followsPrev.length) },
    events: { current: eventsCurr.length, previous: eventsPrev.length, change: pctChange(eventsCurr.length, eventsPrev.length) },
    claims: { current: claimsCurr.length, previous: claimsPrev.length, change: pctChange(claimsCurr.length, claimsPrev.length) },
  };

  // --- Views by Day ---
  const viewsByDayMap: Record<string, { artistViews: number; venueViews: number }> = {};
  // Initialize all days in range
  for (let i = 0; i < days; i++) {
    const d = new Date(currentStart.getTime() + i * 86400000);
    const key = d.toISOString().slice(0, 10);
    viewsByDayMap[key] = { artistViews: 0, venueViews: 0 };
  }
  for (const v of aViewsCurr) {
    const day = v.viewed_at?.slice(0, 10);
    if (day && viewsByDayMap[day]) viewsByDayMap[day].artistViews++;
  }
  for (const v of vViewsCurr) {
    const day = v.viewed_at?.slice(0, 10);
    if (day && viewsByDayMap[day]) viewsByDayMap[day].venueViews++;
  }
  const viewsByDay = Object.entries(viewsByDayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts, total: counts.artistViews + counts.venueViews }));

  // --- Users by Day ---
  const usersByDayMap: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(currentStart.getTime() + i * 86400000);
    usersByDayMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const u of usersCurr) {
    const day = u.created_at?.slice(0, 10);
    if (day && usersByDayMap[day] !== undefined) usersByDayMap[day]++;
  }
  const usersByDay = Object.entries(usersByDayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  // --- Follows by Day ---
  const followsByDayMap: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(currentStart.getTime() + i * 86400000);
    followsByDayMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const f of followsCurr) {
    const day = f.created_at?.slice(0, 10);
    if (day && followsByDayMap[day] !== undefined) followsByDayMap[day]++;
  }
  const followsByDay = Object.entries(followsByDayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  // --- Top Artists ---
  const artistCountMap: Record<string, number> = {};
  for (const v of (topArtistViews.data || [])) {
    artistCountMap[v.artist_id] = (artistCountMap[v.artist_id] || 0) + 1;
  }
  const topArtistIds = Object.entries(artistCountMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  let topArtists: { id: string; name: string; views: number }[] = [];
  if (topArtistIds.length > 0) {
    const { data: artistNames } = await supabase
      .from('artists')
      .select('artist_id, display_name, name_en')
      .in('artist_id', topArtistIds.map(([id]) => id));
    const nameMap = new Map((artistNames || []).map((a) => [a.artist_id, a.display_name || a.name_en || a.artist_id]));
    topArtists = topArtistIds.map(([id, views]) => ({
      id,
      name: nameMap.get(id) || id,
      views,
    }));
  }

  // --- Top Venues ---
  const venueCountMap: Record<string, number> = {};
  for (const v of (topVenueViews.data || [])) {
    venueCountMap[v.venue_id] = (venueCountMap[v.venue_id] || 0) + 1;
  }
  const topVenueIds = Object.entries(venueCountMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  let topVenues: { id: string; name: string; views: number }[] = [];
  if (topVenueIds.length > 0) {
    const { data: venueNames } = await supabase
      .from('venues')
      .select('venue_id, display_name')
      .in('venue_id', topVenueIds.map(([id]) => id));
    const nameMap = new Map((venueNames || []).map((v) => [v.venue_id, v.display_name || v.venue_id]));
    topVenues = topVenueIds.map(([id, views]) => ({
      id,
      name: nameMap.get(id) || id,
      views,
    }));
  }

  // --- Top Cities ---
  const cityCountMap: Record<string, number> = {};
  for (const v of aViewsCurr) {
    if (!v.city) continue; // Skip views without GeoIP data
    cityCountMap[v.city] = (cityCountMap[v.city] || 0) + 1;
  }
  for (const v of vViewsCurr) {
    if (!v.city) continue;
    cityCountMap[v.city] = (cityCountMap[v.city] || 0) + 1;
  }
  const topCities = Object.entries(cityCountMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 12)
    .map(([city, views]) => ({ city, views }));

  // --- Claims by Day ---
  const claimsByDayMap: Record<string, { submitted: number; approved: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(currentStart.getTime() + i * 86400000);
    claimsByDayMap[d.toISOString().slice(0, 10)] = { submitted: 0, approved: 0 };
  }
  for (const c of claimsCurr) {
    const day = c.submitted_at?.slice(0, 10);
    if (day && claimsByDayMap[day]) {
      claimsByDayMap[day].submitted++;
      if (c.status === 'approved') claimsByDayMap[day].approved++;
    }
  }
  const claimsByDay = Object.entries(claimsByDayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));

  return NextResponse.json({
    kpis,
    viewsByDay,
    usersByDay,
    followsByDay,
    topArtists,
    topVenues,
    topCities,
    claimsByDay,
  });
}
