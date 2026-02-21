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
export function formatDate(iso: string | undefined, locale: string = 'en'): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(locale === 'zh' ? 'zh-TW' : locale === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
}

export function formatTime(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Get photo/poster URL — prefers stable _url field, falls back to attachment. */
export function photoUrl(urlField: string | undefined, attachments?: { url: string }[]): string | null {
  return urlField || attachments?.[0]?.url || null;
}

/** Supported locales. */
export const locales = ['en', 'zh', 'ja'] as const;
export type Locale = (typeof locales)[number];
