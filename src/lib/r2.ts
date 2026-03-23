import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

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

/**
 * Extract the R2 object key from a full public URL.
 */
export function r2KeyFromUrl(url: string): string {
  const prefix = PUBLIC_URL.endsWith('/') ? PUBLIC_URL : `${PUBLIC_URL}/`;
  return url.startsWith(prefix) ? url.slice(prefix.length) : url;
}

/**
 * Delete an object from Cloudflare R2 by its key.
 */
export async function deleteFromR2(key: string): Promise<void> {
  await R2.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }),
  );
}
