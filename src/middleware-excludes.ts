/**
 * middleware-excludes.ts — Centralized exclusion patterns for i18n/Supabase middleware.
 *
 * These paths must NEVER be redirected by the i18n middleware, otherwise
 * service workers, manifests, and static assets will break.
 *
 * The matcher regex is derived from these lists so they stay in sync.
 */

/** Static files that must bypass middleware (exact basenames) */
export const EXCLUDED_FILES = [
  'sw.js',
  'sitemap.xml',
  'robots.txt',
  'favicon.ico',
  'manifest.json',
  'opengraph-image',
  'search-index.json',
] as const;

/** File extensions that must bypass middleware */
export const EXCLUDED_EXTENSIONS = [
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico',
  'json', 'xml', 'txt', 'webmanifest', 'js',
] as const;

/** Path prefixes that must bypass middleware */
export const EXCLUDED_PREFIXES = [
  'api',
  'auth',
  '_next',
  '_vercel',
] as const;

/**
 * Build the Next.js middleware matcher pattern from the exclusion lists.
 * This is the single source of truth — the matcher in proxy.ts should use this.
 */
export function buildExclusionPattern(): string {
  const files = EXCLUDED_FILES.map(f => f.replace(/\./g, '\\.')).join('|');
  const exts = EXCLUDED_EXTENSIONS.join('|');
  const prefixes = EXCLUDED_PREFIXES.join('|');
  return `/((?!${prefixes}|${files}|.*\\.(?:${exts})$).*)`;
}
