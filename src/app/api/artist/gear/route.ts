import { NextRequest, NextResponse } from 'next/server';
import { verifyArtistClaimToken } from '@/lib/artist-auth';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(req: NextRequest) {
  const artistId = req.nextUrl.searchParams.get('artistId');
  if (!artistId) return NextResponse.json({ error: 'Missing artistId' }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('artist_gear')
    .select('*')
    .eq('artist_id', artistId)
    .order('display_order');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ gear: data || [] });
}

export async function POST(req: NextRequest) {
  try {
    const { artistId, gear_name, gear_type, brand, model } = await req.json();
    if (!artistId || !gear_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { isAuthorized } = await verifyArtistClaimToken(
      req.headers.get('authorization'),
      artistId,
    );
    if (!isAuthorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();

    // Check tier limit
    const { data: artist } = await supabase
      .from('artists')
      .select('tier')
      .eq('artist_id', artistId)
      .single();

    if ((artist?.tier ?? 0) < 2) {
      const { count } = await supabase
        .from('artist_gear')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', artistId);

      if ((count || 0) >= 3) {
        return NextResponse.json({ error: 'Tier 1 limit: max 3 gear items. Upgrade to Premium for unlimited.' }, { status: 403 });
      }
    }

    // Get next display_order
    const { data: lastGear } = await supabase
      .from('artist_gear')
      .select('display_order')
      .eq('artist_id', artistId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (lastGear?.display_order ?? -1) + 1;

    const { data, error } = await supabase
      .from('artist_gear')
      .insert({
        artist_id: artistId,
        gear_name,
        gear_type: gear_type || 'instrument',
        brand: brand || null,
        model: model || null,
        display_order: nextOrder,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, gear: data });
  } catch (err) {
    console.error('Gear create error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
