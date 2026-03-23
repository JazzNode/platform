/**
 * middleware-excludes.test.ts — Verify critical paths are excluded from middleware.
 *
 * Run: npx tsx src/middleware-excludes.test.ts
 */

import { buildExclusionPattern, EXCLUDED_FILES, EXCLUDED_EXTENSIONS } from './middleware-excludes';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`✗ ${label}`);
  }
}

// Build the regex from our exclusion pattern
const pattern = buildExclusionPattern();
// Next.js anchors matcher patterns at the start. We replicate that here.
const innerRe = new RegExp(`^${pattern}`);

function middlewareWouldRun(path: string): boolean {
  return innerRe.test(path);
}

// ── These paths must NOT be processed by middleware ──

const mustExclude = [
  '/sw.js',
  '/manifest.json',
  '/sitemap.xml',
  '/robots.txt',
  '/favicon.ico',
  '/search-index.json',
  '/icon-192.png',
  '/badge-96.png',
  '/some-image.webp',
  '/api/push/subscribe',
  '/api/auth/callback',
  '/_next/static/chunks/main.js',
  '/_vercel/insights/script.js',
  '/opengraph-image',
  '/data.webmanifest',
];

for (const path of mustExclude) {
  assert(!middlewareWouldRun(path), `should exclude: ${path}`);
}

// ── These paths SHOULD be processed by middleware ──

const mustInclude = [
  '/',
  '/en',
  '/zh/artists',
  '/venues/blue-note',
  '/profile/inbox',
];

for (const path of mustInclude) {
  assert(middlewareWouldRun(path), `should include: ${path}`);
}

// ── Verify all EXCLUDED_FILES are in the pattern ──

for (const file of EXCLUDED_FILES) {
  assert(pattern.includes(file.replace(/\./g, '\\.')), `pattern includes file: ${file}`);
}

// ── Verify all EXCLUDED_EXTENSIONS are in the pattern ──

for (const ext of EXCLUDED_EXTENSIONS) {
  assert(pattern.includes(ext), `pattern includes extension: ${ext}`);
}

console.log(`\n${'═'.repeat(50)}`);
console.log(`  middleware-excludes tests: ${passed} passed, ${failed} failed`);
console.log(`${'═'.repeat(50)}\n`);

process.exit(failed > 0 ? 1 : 0);
