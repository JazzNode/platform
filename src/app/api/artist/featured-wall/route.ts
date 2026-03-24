import { NextRequest, NextResponse } from 'next/server';
import { verifyArtistClaimToken } from '@/lib/artist-auth';
import { createAdminClient } from '@/utils/supabase/admin';

const MAX_FEATURED = 6;

/**
 * GET /api/artist/featured-wall?artistId=xxx
 * Public — returns featured performances for an artist
 */
export async function GET(req: NextRequest) {
  const artistId = req.nextUrl.searchParams.get('artistId');
  if (!artistId) return NextResponse.json({ error: 'Missing artistId' }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('artist_featured_performances')
    .select('id, event_id, sort_order, note')
    .eq('artist_id', artistId)
    .order('sort_order', { ascending: true })
    .limit(MAX_FEATURED);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data || [] }, {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
  });
}

/**
 * PUT /api/artist/featured-wall
 * Auth required — replace all featured performances for an artist
 * Body: { artistId: string, items: { event_id: string, note?: string }[] }
 */
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { artistId, items } = body as { artistId: string; items: { event_id: string; note?: string }[] };

  if (!artistId || !Array.isArray(items)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (items.length > MAX_FEATURED) {
    return NextResponse.json({ error: `Maximum ${MAX_FEATURED} featured performances` }, { status: 400 });
  }

  const { isAuthorized, userId } = await verifyArtistClaimToken(
    req.headers.get('authorization'),
    artistId,
  );
  if (!isAuthorized || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Delete existing
  await supabase
    .from('artist_featured_performances')
    .delete()
    .eq('artist_id', artistId);

  // Insert new (if any)
  if (items.length > 0) {
    const rows = items.map((item, i) => ({
      artist_id: artistId,
      event_id: item.event_id,
      sort_order: i,
      note: item.note?.trim() || null,
    }));

    const { error } = await supabase
      .from('artist_featured_performances')
      .insert(rows);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, count: items.length });
}
