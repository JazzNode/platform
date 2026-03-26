/**
 * Curated font pairings for Elite venue branding.
 * Each pair: heading + body font, both from Google Fonts.
 */

export interface FontPair {
  id: string;
  label: string;
  label_zh: string;
  heading: string;      // CSS font-family for headings (font-serif)
  body: string;         // CSS font-family for body text (font-sans)
  headingGoogle: string; // Google Fonts family name
  bodyGoogle: string;    // Google Fonts family name
  preview: string;      // Preview text showing the style
}

export const fontPairs: FontPair[] = [
  {
    id: 'default',
    label: 'JazzNode Default',
    label_zh: 'JazzNode 預設',
    heading: 'Georgia, "Times New Roman", serif',
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    headingGoogle: '',
    bodyGoogle: '',
    preview: 'The classic JazzNode look',
  },
  {
    id: 'playfair-inter',
    label: 'Playfair Display + Inter',
    label_zh: 'Playfair Display + Inter',
    heading: '"Playfair Display", Georgia, serif',
    body: '"Inter", -apple-system, sans-serif',
    headingGoogle: 'Playfair+Display:wght@400;700',
    bodyGoogle: 'Inter:wght@400;500;600;700',
    preview: 'Elegant editorial feel',
  },
  {
    id: 'cormorant-lato',
    label: 'Cormorant Garamond + Lato',
    label_zh: 'Cormorant Garamond + Lato',
    heading: '"Cormorant Garamond", Georgia, serif',
    body: '"Lato", -apple-system, sans-serif',
    headingGoogle: 'Cormorant+Garamond:wght@400;600;700',
    bodyGoogle: 'Lato:wght@400;700',
    preview: 'Classic luxury',
  },
  {
    id: 'dm-serif-dm-sans',
    label: 'DM Serif Display + DM Sans',
    label_zh: 'DM Serif Display + DM Sans',
    heading: '"DM Serif Display", Georgia, serif',
    body: '"DM Sans", -apple-system, sans-serif',
    headingGoogle: 'DM+Serif+Display',
    bodyGoogle: 'DM+Sans:wght@400;500;700',
    preview: 'Modern & warm',
  },
  {
    id: 'space-grotesk',
    label: 'Space Grotesk (mono-style)',
    label_zh: 'Space Grotesk（等寬風格）',
    heading: '"Space Grotesk", -apple-system, sans-serif',
    body: '"Space Grotesk", -apple-system, sans-serif',
    headingGoogle: 'Space+Grotesk:wght@400;500;700',
    bodyGoogle: '',
    preview: 'Tech-forward minimalism',
  },
];

export function getFontPair(id: string | null | undefined): FontPair {
  return fontPairs.find((f) => f.id === id) || fontPairs[0];
}

/** Build a Google Fonts <link> URL for a font pair */
export function googleFontsUrl(pair: FontPair): string | null {
  if (pair.id === 'default') return null;
  const families = [pair.headingGoogle, pair.bodyGoogle].filter(Boolean);
  if (families.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=swap`;
}
