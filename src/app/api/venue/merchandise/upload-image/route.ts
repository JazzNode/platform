import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { uploadToR2 } from '@/lib/r2';
import { verifyVenueClaimToken } from '@/lib/venue-auth';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_WIDTH = 1200;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const venueId = formData.get('venueId') as string | null;

    if (!file || !venueId) {
      return NextResponse.json({ error: 'Missing file or venueId' }, { status: 400 });
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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const processed = await sharp(buffer)
      .resize(MAX_WIDTH, undefined, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const timestamp = Date.now();
    const key = `venue-merchandise/${venueId}/${timestamp}.webp`;
    const { url } = await uploadToR2(key, processed);

    return NextResponse.json({ image_url: url });
  } catch (err) {
    console.error('Merchandise image upload error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 },
    );
  }
}
