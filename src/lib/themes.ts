/**
 * City-based color themes for JazzNode.
 *
 * Each theme overrides the accent color (gold by default).
 * CSS variables are set on <html> via ThemeProvider.
 */

export interface CityTheme {
  id: string;
  accent: string;       // main accent (replaces gold)
  accentDim: string;    // darker variant
  accentBright: string; // lighter/hover variant
  glowRgb: string;      // for rgba() box-shadows
}

export const themes: Record<string, CityTheme> = {
  default: {
    id: 'default',
    accent: '#C8A84E',
    accentDim: '#9A7B30',
    accentBright: '#E8C868',
    glowRgb: '200, 168, 78',
  },
  tokyo: {
    id: 'tokyo',
    accent: '#818CF8',
    accentDim: '#6366F1',
    accentBright: '#A5B4FC',
    glowRgb: '129, 140, 248',
  },
  hongkong: {
    id: 'hongkong',
    accent: '#F87171',
    accentDim: '#EF4444',
    accentBright: '#FCA5A5',
    glowRgb: '248, 113, 113',
  },
  taipei: {
    id: 'taipei',
    accent: '#2DD4BF',
    accentDim: '#14B8A6',
    accentBright: '#5EEAD4',
    glowRgb: '45, 212, 191',
  },
};

/** Map city_id slug prefixes to themes. */
export const cityThemeMap: Record<string, string> = {
  'hk-hkg': 'hongkong',
  'tw-tpe': 'taipei',
  'tw-tnn': 'default',   // Tainan — keep gold for now (can add later)
  'tw-khh': 'default',   // Kaohsiung — keep gold for now
  // Tokyo — when added
};

export function getThemeForCity(cityId?: string): CityTheme {
  if (!cityId) return themes.default;
  return themes[cityThemeMap[cityId] || 'default'] || themes.default;
}

export function getThemeById(id: string): CityTheme {
  return themes[id] || themes.default;
}
