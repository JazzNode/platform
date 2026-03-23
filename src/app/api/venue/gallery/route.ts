import { NextRequest, NextResponse } from 'next/server';
import { verifyVenueClaimToken } from '@/lib/venue-auth';
import { createAdminClient } from '@/utils/supabase/admin';
import { deleteFromR2, r2KeyFromUrl } from '@/lib/r2';

/**
 * GET /api/venue/gallery?venueId=xxx
 * Public — returns photos sorted by sort_order.
 */
export async function GET(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get('venueId');
  if (!venueId) {
    return NextResponse.json({ error: 'Missing venueId' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: photos, error } = await supabase
    .from('venue_photos')
    .select('id, photo_url, caption, sort_order')
    .eq('venue_id', venueId)
    .order('sort_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ photos: photos ?? [] });
}

/**
 * DELETE /api/venue/gallery
 * Owner only — deletes a photo from R2 and database.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { photoId, venueId } = await req.json();
    if (!photoId || !venueId) {
      return NextResponse.json({ error: 'Missing photoId or venueId' }, { status: 400 });
    }

    const { isAuthorized } = await verifyVenueClaimToken(
      req.headers.get('authorization'),
      venueId,
    );
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Fetch the photo to get URL for R2 cleanup
    const { data: photo } = await supabase
      .from('venue_photos')
      .select('photo_url')
      .eq('id', photoId)
      .eq('venue_id', venueId)
      .single();

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Delete from R2
    try {
      await deleteFromR2(r2KeyFromUrl(photo.photo_url));
    } catch (e) {
      console.error('R2 delete warning:', e);
      // Continue even if R2 delete fails — DB record should still be removed
    }

    // Delete from database
    const { error: delErr } = await supabase
      .from('venue_photos')
      .delete()
      .eq('id', photoId)
      .eq('venue_id', venueId);

    if (delErr) throw delErr;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Gallery photo delete error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Delete failed' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/venue/gallery
 * Owner only — batch update sort_order for photos.
 */
export async function PATCH(req: NextRequest) {
  try {
    const { venueId, photos } = await req.json() as {
      venueId: string;
      photos: { id: string; sort_order: number }[];
    };

    if (!venueId || !photos?.length) {
      return NextResponse.json({ error: 'Missing venueId or photos' }, { status: 400 });
    }

    const { isAuthorized } = await verifyVenueClaimToken(
      req.headers.get('authorization'),
      venueId,
    );
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Batch update sort_order
    const updates = photos.map((p) =>
      supabase
        .from('venue_photos')
        .update({ sort_order: p.sort_order })
        .eq('id', p.id)
        .eq('venue_id', venueId),
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Gallery reorder error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Reorder failed' },
      { status: 500 },
    );
  }
}
