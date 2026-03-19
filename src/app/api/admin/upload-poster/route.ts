import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { revalidateTag } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminToken } from '@/lib/admin-auth';
import { writeAuditLog } from '@/lib/audit-log';
import { uploadToR2 } from '@/lib/r2';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const POSTER_MAX_WIDTH = 800;
const POSTER_QUALITY = 85;

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  const { isAdmin, userId } = await verifyAdminToken(req.headers.get('authorization'));
  if (!isAdmin || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const eventId = formData.get('eventId') as string | null;

    if (!file || !eventId) {
      return NextResponse.json({ error: 'Missing file or eventId' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF, AVIF` }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Resize poster: constrain width, preserve aspect ratio
    const processed = await sharp(buffer)
      .resize(POSTER_MAX_WIDTH, undefined, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: POSTER_QUALITY })
      .toBuffer();

    const timestamp = Date.now();
    const key = `events/${eventId}/poster-${timestamp}.webp`;
    const { url: posterUrl } = await uploadToR2(key, processed);

    // Update Supabase
    const sb = getSupabaseAdmin();
    const { error: updateErr } = await sb
      .from('events')
      .update({ poster_url: posterUrl })
      .eq('event_id', eventId);

    if (updateErr) {
      throw new Error(`Supabase update failed: ${updateErr.message}`);
    }

    revalidateTag('events', { expire: 0 });

    writeAuditLog({
      adminUserId: userId,
      action: 'upload_poster',
      entityType: 'event',
      entityId: eventId,
      details: { posterUrl },
      ipAddress: req.headers.get('x-forwarded-for'),
    });

    console.log(JSON.stringify({ action: 'admin_upload_poster', actor: userId, target: eventId, status: 'success', posterUrl }));
    return NextResponse.json({ success: true, posterUrl });
  } catch (err) {
    console.log(JSON.stringify({ action: 'admin_upload_poster', actor: userId, status: 'fail', error: err instanceof Error ? err.message : 'Upload failed' }));
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 },
    );
  }
}
