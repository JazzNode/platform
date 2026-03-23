// Shared font loader for OG image generation
// Uses Space Grotesk (the project's primary sans-serif) from Google Fonts

// Direct URL to Space Grotesk 700 (TTF — satori requires ttf/woff, not woff2)
const FONT_URL =
  'https://fonts.gstatic.com/s/spacegrotesk/v22/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj4PVksj.ttf';

let fontCache: ArrayBuffer | null = null;

export async function getSpaceGrotesk(): Promise<ArrayBuffer> {
  if (fontCache) return fontCache;

  const res = await fetch(FONT_URL);
  fontCache = await res.arrayBuffer();
  return fontCache;
}

export function fontConfig(fontData: ArrayBuffer) {
  return [
    {
      name: 'Space Grotesk',
      data: fontData,
      weight: 700 as const,
      style: 'normal' as const,
    },
  ];
}

/**
 * Fetch an external image and return as a base64 data URL.
 * Satori doesn't support WebP — this converts webp to PNG via sharp.
 * Returns null on failure so OG images degrade gracefully.
 */
export async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'image/png';
    const inputBuffer = Buffer.from(await res.arrayBuffer());

    if (contentType.includes('webp')) {
      // Convert WebP → PNG using sharp
      const sharp = (await import('sharp')).default;
      const pngBuffer = await sharp(inputBuffer).png().toBuffer();
      return `data:image/png;base64,${pngBuffer.toString('base64')}`;
    }

    return `data:${contentType};base64,${inputBuffer.toString('base64')}`;
  } catch {
    return null;
  }
}
