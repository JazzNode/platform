import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/venue/seo-trends?venueId=...
 *
 * Returns SEO ranking trend data from gsc_search_analytics for a venue.
 * Requires authenticated venue owner + tier >= 3 (Elite).
 *
 * Response: top 10 search queries with daily position/clicks/impressions
 * over the last 30 days.
 */
export async function GET(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get('venueId');
  if (!venueId) {
    return NextResponse.json({ error: 'Missing venueId' }, { status: 400 });
  }

  // Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('claimed_venue_ids, role')
    .eq('id', user.id)
    .single();

  const isOwner = profile?.claimed_venue_ids?.includes(venueId);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner';
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminClient = createAdminClient();

  // Tier gate
  const { data: venue } = await adminClient
    .from('venues')
    .select('tier')
    .eq('venue_id', venueId)
    .single();

  if (!isAdmin && (!venue || (venue.tier ?? 0) < 3)) {
    return NextResponse.json({ error: 'Elite tier required' }, { status: 403 });
  }

  // Query GSC data for pages containing this venue's ID (last 30 days)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: rows, error: gscErr } = await adminClient
    .from('gsc_search_analytics')
    .select('query, date, clicks, impressions, position')
    .like('page', `%/venues/${venueId}%`)
    .gte('date', since)
    .order('date', { ascending: true });

  if (gscErr) {
    console.error('[venue-seo-trends] GSC query error:', gscErr.message);
    return NextResponse.json({ error: 'Failed to fetch SEO data' }, { status: 500 });
  }

  // Group by query, aggregate totals + daily trend
  const queryMap = new Map<
    string,
    { totalClicks: number; totalImpressions: number; positions: number[]; trend: { date: string; position: number; clicks: number }[] }
  >();

  for (const row of rows ?? []) {
    const q = row.query || '(not set)';
    if (!queryMap.has(q)) {
      queryMap.set(q, { totalClicks: 0, totalImpressions: 0, positions: [], trend: [] });
    }
    const entry = queryMap.get(q)!;
    entry.totalClicks += row.clicks;
    entry.totalImpressions += row.impressions;
    entry.positions.push(row.position);
    entry.trend.push({ date: row.date, position: row.position, clicks: row.clicks });
  }

  const topQueries = [...queryMap.entries()]
    .map(([query, data]) => ({
      query,
      totalClicks: data.totalClicks,
      totalImpressions: data.totalImpressions,
      avgPosition: Math.round((data.positions.reduce((a, b) => a + b, 0) / data.positions.length) * 10) / 10,
      trend: data.trend,
    }))
    .sort((a, b) => b.totalClicks - a.totalClicks)
    .slice(0, 10);

  return NextResponse.json({ topQueries });
}
