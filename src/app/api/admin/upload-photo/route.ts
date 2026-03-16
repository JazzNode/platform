import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { revalidateTag } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminToken } from '@/lib/admin-auth';
import { writeAuditLog } from '@/lib/audit-log';
import { uploadToR2 } from '@/lib/r2';

const SIZES = {
  sm: { width: 72, height: 72 },
  md: { width: 192, height: 192 },
  lg: { width: 384, height: 384 },
} as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  // 1. Auth check
  const { isAdmin, userId } = await verifyAdminToken(req.headers.get('authorization'));
  if (!isAdmin || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Parse multipart form
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const artistId = formData.get('artistId') as string | null;

    if (!file || !artistId) {
      return NextResponse.json({ error: 'Missing file or artistId' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // 3. Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Process with Sharp — attention-based crop + resize to each size
    const timestamp = Date.now();
    const uploads: Promise<{ size: string; url: string }>[] = [];

    for (const [sizeName, dims] of Object.entries(SIZES)) {
      const processed = await sharp(buffer)
        .resize(dims.width, dims.height, {
          fit: 'cover',
          position: sharp.strategy.attention, // smart crop focusing on subject
        })
        .webp({ quality: 85 })
        .toBuffer();

      const key = `artists/${artistId}/${sizeName}-${timestamp}.webp`;
      uploads.push(
        uploadToR2(key, processed).then((result) => ({
          size: sizeName,
          url: result.url,
        })),
      );
    }

    const results = await Promise.all(uploads);
    const mdUrl = results.find((r) => r.size === 'md')!.url;

    // 5. Update Supabase — set photo_url to the md-size image URL
    const sb = getSupabaseAdmin();
    const { error: updateErr } = await sb
      .from('artists')
      .update({ photo_url: mdUrl, data_source: 'admin', updated_by: userId })
      .eq('artist_id', artistId);

    if (updateErr) {
      throw new Error(`Supabase update failed: ${updateErr.message}`);
    }

    // 6. Revalidate the artists cache
    revalidateTag('artists');

    writeAuditLog({
      adminUserId: userId,
      action: 'upload_photo',
      entityType: 'artist',
      entityId: artistId,
      details: { photoUrl: mdUrl },
      ipAddress: req.headers.get('x-forwarded-for'),
    });

    console.log(JSON.stringify({ action: 'admin_upload_photo', actor: userId, target: artistId, status: 'success', photoUrl: mdUrl }));
    return NextResponse.json({
      success: true,
      urls: Object.fromEntries(results.map((r) => [r.size, r.url])),
      photoUrl: mdUrl,
    });
  } catch (err) {
    console.log(JSON.stringify({ action: 'admin_upload_photo', actor: userId, status: 'fail', error: err instanceof Error ? err.message : 'Upload failed' }));
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 },
    );
  }
}
