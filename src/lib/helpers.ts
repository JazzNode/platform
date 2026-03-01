/**
 * Shared helpers for JazzNode web.
 */

/** Generate a URL-safe slug from a name, with Airtable record ID suffix for uniqueness. */
export function makeSlug(name: string | undefined, id: string): string {
  const base = (name || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]+/g, '-')
    .replace(/^-|-$/g, '');
  // Use last 6 chars of Airtable record ID for uniqueness
  const suffix = id.slice(-6);
  return `${base}-${suffix}`;
}

/** Pick the best display name from a record. */
export function displayName(fields: { display_name?: string; name_local?: string; name_en?: string }): string {
  return fields.display_name || fields.name_local || fields.name_en || 'Unknown';
}

/** Format a date string for display. */
export function formatDate(iso: string | undefined, locale: string = 'en', timezone: string = 'Asia/Taipei'): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(locale === 'zh' ? 'zh-TW' : locale === 'ja' ? 'ja-JP' : 'en-US', {
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
    en: ['_en', '_zh', '_ja'],
    zh: ['_zh', '_en', '_ja'],
    ja: ['_ja', '_en', '_zh'],
  };
  for (const suffix of (suffixMap[locale] || suffixMap.en)) {
    const val = fields[`${prefix}${suffix}`];
    if (val && typeof val === 'string') return val;
  }
  return undefined;
}

/** Pick a localized city name. Uses localized() with name_local fallback. */
export function cityName(
  fields: { name_en?: string; name_zh?: string; name_ja?: string; name_local?: string },
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

/** Format price badge from currency + min/max price. Falls back to price_info. */
export function formatPriceBadge(currency?: string, minPrice?: number, maxPrice?: number, priceInfo?: string): string | undefined {
  if (minPrice != null) {
    const sym = currency === 'HKD' ? 'HK$' : currency === 'TWD' ? 'NT$' : '$';
    if (maxPrice != null && maxPrice !== minPrice) {
      return `${sym}${minPrice} – ${sym}${maxPrice}`;
    }
    return `${sym}${minPrice}`;
  }
  if (!priceInfo) return undefined;
  // Fix bare "$" to "NT$" when we know it's TWD
  if (currency === 'TWD') {
    return priceInfo.replace(/^\$(?!NT)/, 'NT$');
  }
  return priceInfo;
}

/** Supported locales. */
export const locales = ['en', 'zh', 'ja'] as const;
export type Locale = (typeof locales)[number];
