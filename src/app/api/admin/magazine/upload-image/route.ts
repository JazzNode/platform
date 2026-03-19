import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { verifyAdminToken } from '@/lib/admin-auth';
import { uploadToR2 } from '@/lib/r2';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const COVER_WIDTH = 1600;
const GALLERY_WIDTH = 1200;

/**
 * POST /api/admin/magazine/upload-image
 * Upload a magazine image (cover or gallery).
 * FormData: file, articleId, type ("cover" | "gallery")
 */
export async function POST(req: NextRequest) {
  const { isAdmin, userId } = await verifyAdminToken(req.headers.get('authorization'));
  if (!isAdmin || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const articleId = formData.get('articleId') as string | null;
    const type = (formData.get('type') as string) || 'gallery';

    if (!file || !articleId) {
      return NextResponse.json({ error: 'Missing file or articleId' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const maxWidth = type === 'cover' ? COVER_WIDTH : GALLERY_WIDTH;

    const processed = await sharp(buffer)
      .resize(maxWidth, undefined, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();

    const timestamp = Date.now();
    const key = `magazine/${articleId}/${type}-${timestamp}.webp`;
    const { url } = await uploadToR2(key, processed);

    return NextResponse.json({ success: true, url, type });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 },
    );
  }
}
