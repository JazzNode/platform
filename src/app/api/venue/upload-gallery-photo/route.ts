import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { uploadToR2 } from '@/lib/r2';
import { verifyVenueClaimToken } from '@/lib/venue-auth';
import { createAdminClient } from '@/utils/supabase/admin';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_WIDTH = 1600;
const MAX_PHOTOS = 12;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const venueId = formData.get('venueId') as string | null;

    if (!file || !venueId) {
      return NextResponse.json({ error: 'Missing file or venueId' }, { status: 400 });
    }

    // Auth: verify venue claim
    const { isAuthorized, userId } = await verifyVenueClaimToken(
      req.headers.get('authorization'),
      venueId,
    );
    if (!isAuthorized || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // Check photo count limit
    const supabase = createAdminClient();
    const { count } = await supabase
      .from('venue_photos')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', venueId);

    if ((count ?? 0) >= MAX_PHOTOS) {
      return NextResponse.json({ error: `Maximum ${MAX_PHOTOS} photos allowed` }, { status: 400 });
    }

    // Process image
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const processed = await sharp(buffer)
      .resize(MAX_WIDTH, undefined, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    // Upload to R2
    const timestamp = Date.now();
    const key = `venue-gallery/${venueId}/${timestamp}.webp`;
    const { url } = await uploadToR2(key, processed);

    // Determine next sort_order
    const { data: maxRow } = await supabase
      .from('venue_photos')
      .select('sort_order')
      .eq('venue_id', venueId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSort = (maxRow?.sort_order ?? -1) + 1;

    // Insert record
    const { data: photo, error: insertErr } = await supabase
      .from('venue_photos')
      .insert({
        venue_id: venueId,
        photo_url: url,
        sort_order: nextSort,
        uploaded_by: userId,
      })
      .select('id, photo_url, sort_order')
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json(photo);
  } catch (err) {
    console.error('Gallery photo upload error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 },
    );
  }
}
