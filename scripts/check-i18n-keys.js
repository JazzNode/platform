#!/usr/bin/env node
/**
 * check-i18n-keys.js — Verify all translation files have identical key sets.
 *
 * Compares every locale JSON against the baseline (en.json) and reports
 * missing or extra keys. Exits with code 1 if any locale is out of sync.
 *
 * Usage:
 *   node scripts/check-i18n-keys.js
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MESSAGES_DIR = resolve(__dirname, '../src/messages');
const BASELINE = 'en.json';

function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

const files = readdirSync(MESSAGES_DIR).filter((f) => f.endsWith('.json'));
if (!files.includes(BASELINE)) {
  console.error(`Baseline file ${BASELINE} not found in ${MESSAGES_DIR}`);
  process.exit(1);
}

const baselineData = JSON.parse(readFileSync(resolve(MESSAGES_DIR, BASELINE), 'utf-8'));
const baselineKeys = new Set(flattenKeys(baselineData));

let hasErrors = false;

for (const file of files) {
  if (file === BASELINE) continue;

  const data = JSON.parse(readFileSync(resolve(MESSAGES_DIR, file), 'utf-8'));
  const localeKeys = new Set(flattenKeys(data));

  const missing = [...baselineKeys].filter((k) => !localeKeys.has(k));
  const extra = [...localeKeys].filter((k) => !baselineKeys.has(k));

  if (missing.length > 0) {
    hasErrors = true;
    console.error(`\n❌ ${file}: ${missing.length} missing key(s):`);
    for (const k of missing) console.error(`   - ${k}`);
  }

  if (extra.length > 0) {
    // Extra keys are warnings, not errors — locale may have overrides
    console.warn(`\n⚠️  ${file}: ${extra.length} extra key(s) not in ${BASELINE}:`);
    for (const k of extra) console.warn(`   + ${k}`);
  }

  if (missing.length === 0 && extra.length === 0) {
    console.log(`✅ ${file}: all ${baselineKeys.size} keys match`);
  }
}

if (hasErrors) {
  console.error('\ni18n key check failed — see missing keys above.');
  process.exit(1);
} else {
  console.log(`\n✅ All ${files.length} locale files in sync (${baselineKeys.size} keys each).`);
}
