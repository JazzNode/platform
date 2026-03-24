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

  // Verify tier >= 2
  const { data: venue } = await supabase
    .from('venues')
    .select('tier')
    .eq('venue_id', venueId)
    .single();

  if (!venue || venue.tier < 2) {
    return NextResponse.json({ error: 'Premium required' }, { status: 403 });
  }

  const threeMonthsAgo = new Date(
    Date.now() - 90 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // ── Fan Growth: follows per week for the past 3 months ──
  const { data: follows } = await supabase
    .from('follows')
    .select('created_at')
    .eq('target_type', 'venue')
    .eq('target_id', venueId)
    .gte('created_at', threeMonthsAgo)
    .order('created_at', { ascending: true });

  const weekBuckets: Record<string, number> = {};
  for (const f of follows || []) {
    const d = new Date(f.created_at);
    // Get ISO week start (Monday)
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(d);
    weekStart.setDate(diff);
    const key = weekStart.toISOString().slice(0, 10);
    weekBuckets[key] = (weekBuckets[key] || 0) + 1;
  }

  const fanGrowth = Object.entries(weekBuckets)
    .map(([week, count]) => ({ week, count }))
    .sort((a, b) => a.week.localeCompare(b.week));

  // ── Top Cities: top 5 cities by page views ──
  const { data: views } = await supabase
    .from('venue_page_views')
    .select('viewed_at, city')
    .eq('venue_id', venueId)
    .gte('viewed_at', threeMonthsAgo);

  const cityCounts: Record<string, number> = {};
  for (const v of views || []) {
    const city = v.city || 'Unknown';
    cityCounts[city] = (cityCounts[city] || 0) + 1;
  }

  const topCities = Object.entries(cityCounts)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ── Best-Performing Events: top 5 events by page views around event date (+-3 days) ──
  const { data: events } = await supabase
    .from('events')
    .select('event_id, title_local, start_at')
    .eq('venue_id', venueId)
    .gte('start_at', threeMonthsAgo)
    .order('start_at', { ascending: false })
    .limit(50);

  const bestEvents: { eventName: string; date: string; views: number }[] = [];

  if (events && events.length > 0 && views) {
    for (const event of events) {
      if (!event.start_at) continue;
      const eventDate = new Date(event.start_at);
      const windowStart = new Date(
        eventDate.getTime() - 3 * 24 * 60 * 60 * 1000,
      );
      const windowEnd = new Date(
        eventDate.getTime() + 3 * 24 * 60 * 60 * 1000,
      );

      const viewCount = (views || []).filter((v) => {
        const viewDate = new Date(v.viewed_at);
        return viewDate >= windowStart && viewDate <= windowEnd;
      }).length;

      bestEvents.push({
        eventName: event.title_local || event.event_id,
        date: event.start_at.slice(0, 10),
        views: viewCount,
      });
    }

    bestEvents.sort((a, b) => b.views - a.views);
  }

  // ── Peak Engagement Hours: page views grouped by hour (0–23) ──
  const hourCounts: number[] = new Array(24).fill(0);
  for (const v of views || []) {
    const hour = new Date(v.viewed_at).getUTCHours();
    hourCounts[hour]++;
  }

  const peakHours = hourCounts.map((count, hour) => ({ hour, count }));

  return NextResponse.json({
    fanGrowth,
    topCities,
    bestEvents: bestEvents.slice(0, 5),
    peakHours,
  });
}
