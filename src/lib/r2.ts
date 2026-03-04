import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

export interface UploadResult {
  key: string;
  url: string;
}

/**
 * Upload a buffer to Cloudflare R2.
 * @param key Object key (e.g. "artists/recABC123/md.webp")
 * @param body Buffer of processed image
 * @param contentType MIME type
 */
export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string = 'image/webp',
): Promise<UploadResult> {
  await R2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );

  const url = PUBLIC_URL.endsWith('/') ? `${PUBLIC_URL}${key}` : `${PUBLIC_URL}/${key}`;

  return { key, url };
}
