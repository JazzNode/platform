import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/magazine/by-artist?artistId=<id>&limit=3
 * Public: returns published magazine articles that feature a given artist.
 */
export async function GET(req: NextRequest) {
  const artistId = req.nextUrl.searchParams.get('artistId');
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '3', 10), 10);

  if (!artistId) {
    return NextResponse.json({ error: 'Missing artistId' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Use Postgres array contains operator: linked_artist_ids @> ARRAY[artistId]
  const { data: articles, error } = await supabase
    .from('magazine_articles')
    .select('id, slug, title_en, title_zh, title_ja, title_ko, title_th, title_id, excerpt_en, excerpt_zh, excerpt_ja, excerpt_ko, excerpt_th, excerpt_id, cover_image_url, category, author_name, published_at')
    .eq('status', 'published')
    .contains('linked_artist_ids', [artistId])
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ articles: articles || [] });
}
