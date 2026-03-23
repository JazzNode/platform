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
