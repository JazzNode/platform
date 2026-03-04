import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { revalidateTag } from 'next/cache';
import { verifyAdminToken } from '@/lib/admin-auth';
import { uploadToR2 } from '@/lib/r2';

const SIZES = {
  sm: { width: 72, height: 72 },
  md: { width: 192, height: 192 },
  lg: { width: 384, height: 384 },
} as const;

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const ARTIST_TABLE_ID = 'tblNEPMBzkcJhdf6l';
const PHOTO_URL_FIELD_ID = 'fldHf2Dy9E27S5uox';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  // 1. Auth check
  const isAdmin = await verifyAdminToken(req.headers.get('authorization'));
  if (!isAdmin) {
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

    // 5. Update Airtable — set photo_url to the md-size image URL
    const airtableRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${ARTIST_TABLE_ID}/${artistId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: { [PHOTO_URL_FIELD_ID]: mdUrl },
        }),
      },
    );

    if (!airtableRes.ok) {
      const errText = await airtableRes.text();
      throw new Error(`Airtable update failed: ${errText}`);
    }

    // 6. Revalidate the artists cache
    revalidateTag('artists');

    return NextResponse.json({
      success: true,
      urls: Object.fromEntries(results.map((r) => [r.size, r.url])),
      photoUrl: mdUrl,
    });
  } catch (err) {
    console.error('Photo upload error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 },
    );
  }
}
