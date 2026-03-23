import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/venue/artists/search?q={query}&limit=10
 * IMDb-style artist search for the lineup builder.
 * Any authenticated user can search (not venue-specific).
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 10, 20);

  if (!q || q.length < 2) {
    return NextResponse.json({ artists: [] });
  }

  try {
    const supabase = createAdminClient();
    const pattern = `%${q}%`;

    const { data, error } = await supabase
      .from('artists')
      .select('artist_id, name_local, name_en, display_name, photo_url, primary_instrument, instrument_list, type, verification_status')
      .or(`name_local.ilike.${pattern},name_en.ilike.${pattern},display_name.ilike.${pattern}`)
      .order('name_local', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ artists: data || [] });
  } catch (err) {
    console.error('Artist search error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
