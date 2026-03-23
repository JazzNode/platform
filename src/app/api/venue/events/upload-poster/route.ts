import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { revalidateTag } from 'next/cache';
import { verifyVenueClaimToken } from '@/lib/venue-auth';
import { writeAuditLog } from '@/lib/audit-log';
import { uploadToR2 } from '@/lib/r2';
import { createAdminClient } from '@/utils/supabase/admin';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const POSTER_MAX_WIDTH = 800;
const POSTER_QUALITY = 85;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const eventId = formData.get('eventId') as string | null;
    const venueId = formData.get('venueId') as string | null;

    if (!file || !eventId || !venueId) {
      return NextResponse.json({ error: 'Missing file, eventId, or venueId' }, { status: 400 });
    }

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

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: `Invalid file type: ${file.type}` }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const processed = await sharp(buffer)
      .resize(POSTER_MAX_WIDTH, undefined, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: POSTER_QUALITY })
      .toBuffer();

    const timestamp = Date.now();
    const key = `events/${eventId}/poster-${timestamp}.webp`;
    const { url: posterUrl } = await uploadToR2(key, processed);

    const supabase = createAdminClient();
    const { error: updateErr } = await supabase
      .from('events')
      .update({ poster_url: posterUrl })
      .eq('event_id', eventId);

    if (updateErr) throw new Error(`Supabase update failed: ${updateErr.message}`);

    revalidateTag('events', { expire: 0 });

    writeAuditLog({
      adminUserId: userId,
      action: 'venue_upload_poster',
      entityType: 'event',
      entityId: eventId,
      details: { posterUrl, venueId },
      ipAddress: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ success: true, posterUrl });
  } catch (err) {
    console.error('Venue poster upload error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 },
    );
  }
}
