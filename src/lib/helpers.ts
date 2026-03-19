/**
 * Shared helpers for JazzNode web.
 */

/** Generate a URL-safe slug from a name, with record ID suffix for uniqueness. */
export function makeSlug(name: string | undefined, id: string): string {
  const base = (name || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\u0E00-\u0E7F]+/g, '-')
    .replace(/^-|-$/g, '');
  // Use last 6 chars of record ID for uniqueness
  const suffix = id.slice(-6);
  return `${base}-${suffix}`;
}

/** Pick the best display name from a record (venues, generic). */
export function displayName(fields: { display_name?: string; name_local?: string; name_en?: string }): string {
  return fields.display_name || fields.name_local || fields.name_en || 'Unknown';
}

/**
 * Locale-aware artist display name.
 * Priority: display_name (manual override) → locale-aware fallback.
 * If the site locale matches the artist's origin language → name_local
 * Otherwise → name_en
 */
/**
 * Detect the likely locale of a text string based on Unicode character ranges.
 * Returns null if the language cannot be determined (e.g. Latin script like Indonesian).
 * Note: Japanese names written purely in kanji (e.g. 田中太郎) will be detected as 'zh'
 * since CJK ideographs are shared between Chinese and Japanese.
 */
export function detectTextLocale(text: string): string | null {
  // Japanese-specific: Hiragana (ぁ-ゟ) or Katakana (゠-ヿ)
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
  // Korean: Hangul syllables (가-힣) or Jamo (ᄀ-ᇿ, ㄱ-ㆎ)
  if (/[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/.test(text)) return 'ko';
  // Thai script (ก-๛)
  if (/[\u0e00-\u0e7f]/.test(text)) return 'th';
  // CJK Ideographs — likely Chinese (checked after Japanese)
  if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(text)) return 'zh';
  // Latin or other scripts — cannot determine
  return null;
}

export function artistDisplayName(
  fields: { display_name?: string; name_local?: string; name_en?: string },
  locale: string,
): string {
  // Manual override takes top priority
  if (fields.display_name) return fields.display_name;

  // Detect language from name_local text content
  if (fields.name_local) {
    const detectedLocale = detectTextLocale(fields.name_local);
    // Chinese and Japanese share CJK ideographs, so treat zh/ja as interchangeable
    const cjkLocales = ['zh', 'ja'];
    const isCjkMatch = detectedLocale && cjkLocales.includes(detectedLocale) && cjkLocales.includes(locale);
    if (detectedLocale === locale || isCjkMatch) {
      return fields.name_local;
    }
  }

  return fields.name_en || fields.name_local || 'Unknown';
}

/** Return which field artistDisplayName() resolves to. */
export function artistDisplayNameField(
  fields: { display_name?: string; name_local?: string; name_en?: string },
  locale: string,
): 'display_name' | 'name_local' | 'name_en' {
  if (fields.display_name) return 'display_name';
  if (fields.name_local) {
    const detectedLocale = detectTextLocale(fields.name_local);
    const cjkLocales = ['zh', 'ja'];
    const isCjkMatch = detectedLocale && cjkLocales.includes(detectedLocale) && cjkLocales.includes(locale);
    if (detectedLocale === locale || isCjkMatch) return 'name_local';
  }
  if (fields.name_en) return 'name_en';
  if (fields.name_local) return 'name_local';
  return 'name_en';
}

/**
 * Locale-aware event title display.
 * If title_local matches site locale (incl. zh/ja CJK interchangeable) → title_local
 * Otherwise → title_en
 * Indonesian (id) locale: detectTextLocale returns null for Latin → falls back to title_en
 */
export function eventTitle(
  fields: { title_local?: string; title_en?: string },
  locale: string,
): string {
  if (fields.title_local) {
    const detectedLocale = detectTextLocale(fields.title_local);
    const cjkLocales = ['zh', 'ja'];
    const isCjkMatch = detectedLocale && cjkLocales.includes(detectedLocale) && cjkLocales.includes(locale);
    if (detectedLocale === locale || isCjkMatch) {
      return fields.title_local;
    }
  }
  return fields.title_en || fields.title_local || 'Untitled';
}

/** Return which field eventTitle() resolves to. Used by EditableName for god mode. */
export function eventTitleField(
  fields: { title_local?: string; title_en?: string },
  locale: string,
): 'title_local' | 'title_en' {
  if (fields.title_local) {
    const detectedLocale = detectTextLocale(fields.title_local);
    const cjkLocales = ['zh', 'ja'];
    const isCjkMatch = detectedLocale && cjkLocales.includes(detectedLocale) && cjkLocales.includes(locale);
    if (detectedLocale === locale || isCjkMatch) return 'title_local';
  }
  if (fields.title_en) return 'title_en';
  if (fields.title_local) return 'title_local';
  return 'title_en';
}

/** Get event subtitle (title_en) for detail page if both exist and differ. */
export function eventSubtitle(
  fields: { title_local?: string; title_en?: string },
): string | null {
  if (fields.title_local && fields.title_en && fields.title_local !== fields.title_en) {
    return fields.title_en;
  }
  return null;
}

/** Format a date string for display. */
export function formatDate(iso: string | undefined, locale: string = 'en', timezone: string = 'Asia/Taipei'): string {
  if (!iso) return '';
  const d = new Date(iso);
  const localeMap: Record<string, string> = { zh: 'zh-TW', ja: 'ja-JP', ko: 'ko-KR', th: 'th-TH', id: 'id-ID' };
  return d.toLocaleDateString(localeMap[locale] || 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short',
    timeZone: timezone,
  });
}

export function formatTime(iso: string | undefined, timezone: string = 'Asia/Taipei'): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone });
}

/** Get photo/poster URL — prefers stable _url field, falls back to attachment. */
export function photoUrl(urlField: string | undefined, attachments?: { url: string }[]): string | null {
  return urlField || attachments?.[0]?.url || null;
}

/** Pick a localized field value. Falls back: locale → en → zh → ja → undefined. */
export function localized(
  fields: Record<string, unknown>,
  prefix: string,
  locale: string,
): string | undefined {
  const suffixMap: Record<string, string[]> = {
    en: ['_en', '_zh', '_ja', '_ko', '_th', '_id'],
    zh: ['_zh', '_en', '_ja', '_ko', '_th', '_id'],
    ja: ['_ja', '_en', '_zh', '_ko', '_th', '_id'],
    ko: ['_ko', '_en', '_zh', '_ja', '_th', '_id'],
    th: ['_th', '_en', '_zh', '_ja', '_ko', '_id'],
    id: ['_id', '_en', '_zh', '_ja', '_ko', '_th'],
  };
  for (const suffix of (suffixMap[locale] || suffixMap.en)) {
    const val = fields[`${prefix}${suffix}`];
    if (val && typeof val === 'string') return val;
  }
  return undefined;
}

/** Pick a localized city name. Uses localized() with name_local fallback. */
export function cityName(
  fields: { name_en?: string; name_zh?: string; name_ja?: string; name_ko?: string; name_th?: string; name_id?: string; name_local?: string },
  locale: string,
): string {
  return localized(fields as Record<string, unknown>, 'name', locale)
    || fields.name_local || fields.name_en || '?';
}

/** Derive city name from address (e.g. "台北市大安區..." → "台北", "香港灣仔..." → "香港"). */
export function deriveCity(address: string | undefined): string | undefined {
  if (!address) return undefined;
  // Match "X市" or "X縣" patterns (Chinese addresses)
  const twMatch = address.match(/^(.{2,3})[市縣]/);
  if (twMatch) return twMatch[1];
  // Hong Kong
  if (address.startsWith('香港')) return '香港';
  // Fallback: try first 2-3 chars for known cities
  return undefined;
}

/** Format price badge from venue currency + price_info string. */
export function formatPriceBadge(currency?: string, priceInfo?: string): string | undefined {
  if (!priceInfo) return undefined;
  // Fix bare "$" to "NT$" when we know it's TWD
  if (currency === 'TWD') {
    return priceInfo.replace(/^\$(?!NT)/, 'NT$');
  }
  return priceInfo;
}

/**
 * Normalize an instrument key so that legacy/malformed values
 * (e.g. "INSTRUMENTS.DOUBLE BASS", "INSTRUMENTS.DRUMS")
 * are converted to the canonical translation key (e.g. "double_bass", "drums").
 */
export function normalizeInstrumentKey(raw: string): string {
  let k = raw;
  // Strip "INSTRUMENTS." prefix (case-insensitive)
  k = k.replace(/^INSTRUMENTS\./i, '');
  // Lowercase + trim
  k = k.toLowerCase().trim();
  // Replace spaces / hyphens with underscores for lookup consistency
  k = k.replace(/[\s-]+/g, '_');
  return k;
}

/** Convert a Spotify URL to its embed URL. Supports artist, album, track, playlist paths. */
export function parseSpotifyEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith('spotify.com')) return null;
    // pathname like /artist/xxx, /album/xxx, /track/xxx, /playlist/xxx
    const match = u.pathname.match(/^\/(artist|album|track|playlist|episode|show)\/([a-zA-Z0-9]+)/);
    if (!match) return null;
    return `https://open.spotify.com/embed/${match[1]}/${match[2]}?theme=0`;
  } catch {
    return null;
  }
}

/** Extract a YouTube video ID from various URL formats. Returns null for channel/non-video URLs. */
export function parseYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    // youtu.be/VIDEO_ID
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0];
      return id && id.length === 11 ? id : null;
    }
    // youtube.com/watch?v=VIDEO_ID
    if (u.hostname.endsWith('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v && v.length === 11) return v;
      // youtube.com/embed/VIDEO_ID
      const embedMatch = u.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch) return embedMatch[1];
      // youtube.com/shorts/VIDEO_ID
      const shortsMatch = u.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
      if (shortsMatch) return shortsMatch[1];
    }
    return null;
  } catch {
    return null;
  }
}

/** Supported locales. */
export const locales = ['en', 'zh', 'ja', 'ko', 'th', 'id'] as const;
export type Locale = (typeof locales)[number];
