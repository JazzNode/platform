import { NextRequest, NextResponse } from 'next/server';
import { verifyVenueClaimToken } from '@/lib/venue-auth';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get('venueId');
  const range = req.nextUrl.searchParams.get('range') || '7d';
  if (!venueId) return NextResponse.json({ error: 'Missing venueId' }, { status: 400 });

  const { isAuthorized } = await verifyVenueClaimToken(
    req.headers.get('authorization'),
    venueId,
  );
  if (!isAuthorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();

  // Parse range
  const days = range === '90d' ? 90 : range === '30d' ? 30 : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Get page views in range
  const { data: views } = await supabase
    .from('venue_page_views')
    .select('viewed_at, referrer, city')
    .eq('venue_id', venueId)
    .gte('viewed_at', since)
    .order('viewed_at', { ascending: true });

  const allViews = views || [];

  // Total views
  const totalViews = allViews.length;

  // Views by day
  const viewsByDay: Record<string, number> = {};
  for (const v of allViews) {
    const day = v.viewed_at?.slice(0, 10) || 'unknown';
    viewsByDay[day] = (viewsByDay[day] || 0) + 1;
  }

  // Referrer breakdown
  const referrerCounts: Record<string, number> = {};
  for (const v of allViews) {
    let ref = 'direct';
    if (v.referrer) {
      try { ref = new URL(v.referrer).hostname; } catch { /* keep direct */ }
    }
    referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;
  }

  // City breakdown
  const cityCounts: Record<string, number> = {};
  for (const v of allViews) {
    const city = v.city || 'unknown';
    cityCounts[city] = (cityCounts[city] || 0) + 1;
  }

  // Get venue tier for gating
  const { data: venue } = await supabase
    .from('venues')
    .select('tier')
    .eq('venue_id', venueId)
    .single();

  const tier = venue?.tier ?? 0;

  return NextResponse.json({
    totalViews,
    viewsByDay: Object.entries(viewsByDay).map(([date, count]) => ({ date, count })),
    // Only send detailed breakdown for tier 2
    ...(tier >= 2 ? {
      referrerBreakdown: Object.entries(referrerCounts)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count),
      cityBreakdown: Object.entries(cityCounts)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count),
    } : {}),
  });
}
