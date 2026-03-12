import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { updateTag } from 'next/cache';
import { verifyArtistClaimToken } from '@/lib/artist-auth';
import { writeAuditLog } from '@/lib/audit-log';
import { uploadToR2 } from '@/lib/r2';
import { createAdminClient } from '@/utils/supabase/admin';

const SIZES = {
  sm: { width: 72, height: 72 },
  md: { width: 192, height: 192 },
  lg: { width: 384, height: 384 },
} as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const artistId = formData.get('artistId') as string | null;

    if (!file || !artistId) {
      return NextResponse.json({ error: 'Missing file or artistId' }, { status: 400 });
    }

    // Verify the user has claimed this artist
    const { isAuthorized, userId } = await verifyArtistClaimToken(
      req.headers.get('authorization'),
      artistId,
    );
    if (!isAuthorized || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const timestamp = Date.now();
    const uploads: Promise<{ size: string; url: string }>[] = [];

    for (const [sizeName, dims] of Object.entries(SIZES)) {
      const processed = await sharp(buffer)
        .resize(dims.width, dims.height, {
          fit: 'cover',
          position: sharp.strategy.attention,
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

    const supabase = createAdminClient();
    const { error: updateErr } = await supabase
      .from('artists')
      .update({ photo_url: mdUrl })
      .eq('artist_id', artistId);

    if (updateErr) {
      throw new Error(`Supabase update failed: ${updateErr.message}`);
    }

    updateTag('artists');

    writeAuditLog({
      adminUserId: userId,
      action: 'artist_upload_photo',
      entityType: 'artist',
      entityId: artistId,
      details: { photoUrl: mdUrl, claimedUser: true },
      ipAddress: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({
      success: true,
      urls: Object.fromEntries(results.map((r) => [r.size, r.url])),
      photoUrl: mdUrl,
    });
  } catch (err) {
    console.error('Artist photo upload error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 },
    );
  }
}
