import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { verifyArtistClaimToken } from '@/lib/artist-auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { artistId, ...fields } = body;

    if (!artistId) return NextResponse.json({ error: 'Missing artistId' }, { status: 400 });

    const { isAuthorized } = await verifyArtistClaimToken(
      req.headers.get('authorization'),
      artistId,
    );
    if (!isAuthorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const allowed = ['gear_name', 'gear_type', 'brand', 'model', 'photo_url', 'display_order'];
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (allowed.includes(key)) sanitized[key] = value;
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('artist_gear')
      .update(sanitized)
      .eq('id', id)
      .eq('artist_id', artistId);

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Gear update error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const artistId = req.nextUrl.searchParams.get('artistId');
    if (!artistId) return NextResponse.json({ error: 'Missing artistId' }, { status: 400 });

    const { isAuthorized } = await verifyArtistClaimToken(
      req.headers.get('authorization'),
      artistId,
    );
    if (!isAuthorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('artist_gear')
      .delete()
      .eq('id', id)
      .eq('artist_id', artistId);

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Gear delete error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
