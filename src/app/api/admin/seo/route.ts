import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/admin/seo — SEO dashboard data from GSC search analytics
 * Query params: range = 7d | 14d | 28d
 */
export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdminToken(request.headers.get('authorization'));
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ALLOWED_RANGES: Record<string, number> = { '7d': 7, '14d': 14, '28d': 28 };
  const range = request.nextUrl.searchParams.get('range') || '14d';
  const days = ALLOWED_RANGES[range] ?? 14;

  const supabase = createAdminClient();

  const now = new Date();
  const currentStart = new Date(now.getTime() - days * 86400000);
  const previousStart = new Date(currentStart.getTime() - days * 86400000);

  const currentSince = currentStart.toISOString().split('T')[0];
  const previousSince = previousStart.toISOString().split('T')[0];
  const currentEnd = now.toISOString().split('T')[0];

  // Run all queries in parallel
  const [
    currentTotals,
    previousTotals,
    dailyData,
    topQueries,
    topPages,
    countryBreakdown,
    deviceBreakdown,
    pageTypeBreakdown,
    highImpLowCtr,
    unclaimedArtists,
    lastSync,
  ] = await Promise.all([
    // Current period totals
    supabase.rpc('gsc_period_totals', { start_date: currentSince, end_date: currentEnd }).single(),

    // Previous period totals (for comparison)
    supabase.rpc('gsc_period_totals', { start_date: previousSince, end_date: currentSince }).single(),

    // Daily clicks & impressions
    supabase
      .from('gsc_search_analytics')
      .select('date, clicks, impressions')
      .gte('date', currentSince)
      .lte('date', currentEnd)
      .order('date', { ascending: true }),

    // Top queries by impressions
    supabase.rpc('gsc_top_queries', { start_date: currentSince, end_date: currentEnd, row_limit: 20 }),

    // Top pages by impressions
    supabase.rpc('gsc_top_pages', { start_date: currentSince, end_date: currentEnd, row_limit: 20 }),

    // Country breakdown
    supabase.rpc('gsc_country_breakdown', { start_date: currentSince, end_date: currentEnd }),

    // Device breakdown
    supabase.rpc('gsc_device_breakdown', { start_date: currentSince, end_date: currentEnd }),

    // Page type breakdown (artist/venue/event/other)
    supabase.rpc('gsc_page_type_breakdown', { start_date: currentSince, end_date: currentEnd }),

    // High impression, low CTR pages (optimization opportunities)
    supabase.rpc('gsc_high_imp_low_ctr', { start_date: currentSince, end_date: currentEnd, row_limit: 10 }),

    // High impression unclaimed artists (business development leads)
    supabase.rpc('gsc_unclaimed_artists', { start_date: currentSince, end_date: currentEnd, row_limit: 15 }),

    // Last sync log
    supabase.from('gsc_sync_logs').select('*').order('created_at', { ascending: false }).limit(1),
  ]);

  // Aggregate daily data
  const dailyMap = new Map<string, { clicks: number; impressions: number }>();
  for (const row of dailyData.data || []) {
    const existing = dailyMap.get(row.date) || { clicks: 0, impressions: 0 };
    existing.clicks += row.clicks;
    existing.impressions += row.impressions;
    dailyMap.set(row.date, existing);
  }
  const daily = Array.from(dailyMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Compute KPIs
  interface PeriodTotals { total_clicks: number; total_impressions: number; avg_ctr: number; avg_position: number }
  const defaultTotals: PeriodTotals = { total_clicks: 0, total_impressions: 0, avg_ctr: 0, avg_position: 0 };
  const cur: PeriodTotals = (currentTotals.data as PeriodTotals) || defaultTotals;
  const prev: PeriodTotals = (previousTotals.data as PeriodTotals) || defaultTotals;

  function pctChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  return NextResponse.json({
    kpis: {
      clicks: { current: cur.total_clicks, previous: prev.total_clicks, change: pctChange(cur.total_clicks, prev.total_clicks) },
      impressions: { current: cur.total_impressions, previous: prev.total_impressions, change: pctChange(cur.total_impressions, prev.total_impressions) },
      ctr: { current: Math.round(cur.avg_ctr * 1000) / 10, previous: Math.round(prev.avg_ctr * 1000) / 10, change: pctChange(cur.avg_ctr, prev.avg_ctr) },
      position: { current: Math.round(cur.avg_position * 10) / 10, previous: Math.round(prev.avg_position * 10) / 10, change: pctChange(prev.avg_position, cur.avg_position) }, // inverted: lower is better
    },
    daily,
    topQueries: topQueries.data || [],
    topPages: topPages.data || [],
    countries: countryBreakdown.data || [],
    devices: deviceBreakdown.data || [],
    pageTypes: pageTypeBreakdown.data || [],
    opportunities: highImpLowCtr.data || [],
    unclaimedArtists: unclaimedArtists.data || [],
    lastSync: (lastSync.data || [])[0] || null,
  });
}
