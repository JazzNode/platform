/**
 * JazzNode Color Themes
 *
 * User-selectable color palettes, each inspired by a jazz city mood.
 * Names are chosen for their evocative, humanistic feel.
 */

export interface Theme {
  id: string;
  label: string;       // display name (English)
  label_zh: string;    // display name (中文)
  label_ja: string;    // display name (日本語)
  emoji: string;       // quick visual identifier
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

export const themes: Record<string, Theme> = {
  'midnight-gold': {
    id: 'midnight-gold',
    label: 'Midnight Gold',
    label_zh: '午夜金',
    label_ja: 'ミッドナイトゴールド',
    emoji: '🌙',
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
  'jade-mist': {
    id: 'jade-mist',
    label: 'Jade Mist',
    label_zh: '翠霧',
    label_ja: '翡翠の霧',
    emoji: '🍃',
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
  'neon-noir': {
    id: 'neon-noir',
    label: 'Neon Noir',
    label_zh: '霓虹夜',
    label_ja: 'ネオンノワール',
    emoji: '🔴',
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
  'indigo-rain': {
    id: 'indigo-rain',
    label: 'Indigo Rain',
    label_zh: '靛雨',
    label_ja: 'インディゴレイン',
    emoji: '🌧',
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
};

// Default theme
export const DEFAULT_THEME = 'midnight-gold';

// Ordered list for the picker
export const themeOrder = ['midnight-gold', 'jade-mist', 'neon-noir', 'indigo-rain'];

export function getThemeById(id: string): Theme {
  return themes[id] || themes[DEFAULT_THEME];
}
