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

  const threeMonthsAgo = new Date(
    Date.now() - 90 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // ── Fan Growth: follows per week for the past 3 months ──
  const { data: follows } = await supabase
    .from('follows')
    .select('created_at')
    .eq('target_type', 'artist')
    .eq('target_id', artistId)
    .gte('created_at', threeMonthsAgo)
    .order('created_at', { ascending: true });

  const weekBuckets: Record<string, number> = {};
  for (const f of follows || []) {
    const d = new Date(f.created_at);
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
    .from('artist_page_views')
    .select('viewed_at, city')
    .eq('artist_id', artistId)
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

  // ── Best-Performing Events: top 5 events (via lineups) by page views around event date ──
  const { data: lineups } = await supabase
    .from('lineups')
    .select('event_id')
    .eq('artist_id', artistId);

  const eventIds = [...new Set((lineups || []).map((l) => l.event_id))];

  const bestEvents: { eventName: string; date: string; views: number }[] = [];

  if (eventIds.length > 0) {
    const { data: events } = await supabase
      .from('events')
      .select('event_id, title_local, start_at, venue_id')
      .in('event_id', eventIds)
      .gte('start_at', threeMonthsAgo)
      .order('start_at', { ascending: false })
      .limit(50);

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
