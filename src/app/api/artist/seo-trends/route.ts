import { NextRequest, NextResponse } from 'next/server';
import { verifyArtistClaimToken } from '@/lib/artist-auth';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/artist/seo-trends?artistId=...
 *
 * Returns SEO ranking trend data from gsc_search_analytics for an artist.
 * Auth: verifyArtistClaimToken + tier >= 3 (Elite)
 *
 * Response: top 10 search queries with daily position/clicks/impressions
 * over the last 30 days.
 */
export async function GET(req: NextRequest) {
  const artistId = req.nextUrl.searchParams.get('artistId');
  if (!artistId) {
    return NextResponse.json({ error: 'Missing artistId' }, { status: 400 });
  }

  // Auth: verify claim token
  const { isAuthorized } = await verifyArtistClaimToken(
    req.headers.get('authorization'),
    artistId,
  );
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Tier gate: require tier >= 3
  const { data: artist } = await supabase
    .from('artists')
    .select('tier')
    .eq('artist_id', artistId)
    .single();

  if (!artist || (artist.tier ?? 0) < 3) {
    return NextResponse.json(
      { error: 'This feature requires Elite tier (tier 3+)' },
      { status: 403 },
    );
  }

  // Query GSC data for pages containing this artist's ID (last 30 days)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: rows, error: gscErr } = await supabase
    .from('gsc_search_analytics')
    .select('query, date, clicks, impressions, position')
    .like('page', `%/artists/${artistId}%`)
    .gte('date', since)
    .order('date', { ascending: true });

  if (gscErr) {
    console.error('[seo-trends] GSC query error:', gscErr.message);
    return NextResponse.json({ error: 'Failed to fetch SEO data' }, { status: 500 });
  }

  // Group by query, aggregate totals + daily trend
  const queryMap = new Map<
    string,
    {
      totalClicks: number;
      totalImpressions: number;
      positions: number[];
      trend: { date: string; position: number; clicks: number }[];
    }
  >();

  for (const row of rows ?? []) {
    const q = row.query || '(not set)';
    if (!queryMap.has(q)) {
      queryMap.set(q, {
        totalClicks: 0,
        totalImpressions: 0,
        positions: [],
        trend: [],
      });
    }
    const entry = queryMap.get(q)!;
    entry.totalClicks += row.clicks;
    entry.totalImpressions += row.impressions;
    entry.positions.push(row.position);
    entry.trend.push({
      date: row.date,
      position: row.position,
      clicks: row.clicks,
    });
  }

  // Build sorted top 10 by total clicks
  const topQueries = [...queryMap.entries()]
    .map(([query, data]) => ({
      query,
      totalClicks: data.totalClicks,
      totalImpressions: data.totalImpressions,
      avgPosition:
        Math.round(
          (data.positions.reduce((a, b) => a + b, 0) / data.positions.length) * 10,
        ) / 10,
      trend: data.trend,
    }))
    .sort((a, b) => b.totalClicks - a.totalClicks)
    .slice(0, 10);

  return NextResponse.json({ topQueries });
}
