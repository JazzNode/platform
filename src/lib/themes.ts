/**
 * City-based color themes for JazzNode.
 *
 * Each theme defines a full 3-color palette:
 *   - bg:      page background
 *   - card:    card/surface background
 *   - accent:  primary accent (links, highlights, stats)
 *   - accent2: secondary accent (subtle decorations, hover states)
 *   - text:    main text color
 *   - muted:   secondary text
 *   - border:  card/section borders
 */

export interface CityTheme {
  id: string;
  // Backgrounds
  bg: string;
  card: string;
  // Accents
  accent: string;
  accentDim: string;
  accentBright: string;
  accent2: string;
  // Text
  text: string;
  muted: string;
  // Border
  border: string;
  // Glow
  glowRgb: string;
  glow2Rgb: string;
}

export const themes: Record<string, CityTheme> = {
  default: {
    id: 'default',
    bg: '#0A0A0A',
    card: '#111111',
    accent: '#C8A84E',
    accentDim: '#9A7B30',
    accentBright: '#E8C868',
    accent2: '#8A8578',
    text: '#F0EDE6',
    muted: '#8A8578',
    border: 'rgba(240, 237, 230, 0.06)',
    glowRgb: '200, 168, 78',
    glow2Rgb: '138, 133, 120',
  },
  tokyo: {
    id: 'tokyo',
    bg: '#06061A',
    card: '#0E0E24',
    accent: '#818CF8',
    accentDim: '#6366F1',
    accentBright: '#A5B4FC',
    accent2: '#F472B6',
    text: '#E8E8F8',
    muted: '#7878A0',
    border: 'rgba(129, 140, 248, 0.08)',
    glowRgb: '129, 140, 248',
    glow2Rgb: '244, 114, 182',
  },
  hongkong: {
    id: 'hongkong',
    bg: '#120606',
    card: '#1A0C0C',
    accent: '#F87171',
    accentDim: '#EF4444',
    accentBright: '#FCA5A5',
    accent2: '#FBBF24',
    text: '#F8EDED',
    muted: '#A07878',
    border: 'rgba(248, 113, 113, 0.08)',
    glowRgb: '248, 113, 113',
    glow2Rgb: '251, 191, 36',
  },
  taipei: {
    id: 'taipei',
    bg: '#061210',
    card: '#0C1A18',
    accent: '#2DD4BF',
    accentDim: '#14B8A6',
    accentBright: '#5EEAD4',
    accent2: '#A78BFA',
    text: '#E8F4F2',
    muted: '#78A09A',
    border: 'rgba(45, 212, 191, 0.08)',
    glowRgb: '45, 212, 191',
    glow2Rgb: '167, 139, 250',
  },
};

/** Map city_id slug prefixes to themes. */
export const cityThemeMap: Record<string, string> = {
  'hk-hkg': 'hongkong',
  'tw-tpe': 'taipei',
  'tw-tnn': 'default',
  'tw-khh': 'default',
};

export function getThemeForCity(cityId?: string): CityTheme {
  if (!cityId) return themes.default;
  return themes[cityThemeMap[cityId] || 'default'] || themes.default;
}

export function getThemeById(id: string): CityTheme {
  return themes[id] || themes.default;
}
