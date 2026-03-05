import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import smartcrop from 'smartcrop';
import { createClient } from '@/utils/supabase/server';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/** Bridge Sharp pixel data into smartcrop's imageOperations interface */
function sharpImageOperations() {
  return {
    async open(buffer: Buffer) {
      const image = sharp(buffer);
      const { width, height } = await image.metadata();
      return { buffer, width: width!, height: height! };
    },
    async resample(
      img: { buffer: Buffer; width: number; height: number },
      width: number,
      height: number,
    ) {
      const buf = await sharp(img.buffer)
        .resize(Math.round(width), Math.round(height), { fit: 'fill' })
        .toBuffer();
      return { buffer: buf, width: Math.round(width), height: Math.round(height) };
    },
    async getData(img: { buffer: Buffer; width: number; height: number }) {
      const { data, info } = await sharp(img.buffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      return new smartcrop.ImgData(info.width, info.height, data);
    },
  };
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const timestamp = Date.now();

    // Use smartcrop with face detection to find optimal square crop
    const { topCrop } = await smartcrop.crop(buffer, {
      width: 256,
      height: 256,
      imageOperations: sharpImageOperations(),
    });

    // Apply the detected crop, then resize to 256x256 WebP
    const processed = await sharp(buffer)
      .extract({
        left: topCrop.x,
        top: topCrop.y,
        width: topCrop.width,
        height: topCrop.height,
      })
      .resize(256, 256)
      .webp({ quality: 85 })
      .toBuffer();

    const filePath = `${user.id}/${timestamp}.webp`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, processed, {
        contentType: 'image/webp',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      throw new Error(`Profile update failed: ${updateError.message}`);
    }

    return NextResponse.json({ success: true, avatarUrl: publicUrl });
  } catch (err) {
    console.error('Avatar upload error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 },
    );
  }
}
