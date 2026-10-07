#!/usr/bin/env node
/**
 * Clear the counters that were written under rules the product no longer uses.
 *
 * Ellie, of the retired couple-type names and of the gap tiers banded by the
 * old cut points: "Clear them."
 *
 * ── WHAT IS STALE, AND WHY ────────────────────────────────────────────────
 * The couple types: /api/track-type validated an incoming type against
 * twenty-five names the product stopped using, so every real couple was
 * answered with 400 and nothing was recorded. The only bucket that ever filled
 * is "complementary", which the website sent as a fallback whenever the engine
 * could not place a couple: a legacy name standing for an absence. None of
 * those twenty-five is a couple type, so none of them can be read as one.
 *
 * `attune:ct:total` goes with them. The validation returns before any write,
 * so the only submissions it ever counted are those same fallbacks.
 *
 * The gap tiers: the four names did not change, only the lines between them.
 * A stored "aligned" was banded at 1.0 and a new one is banded at 0.75, so old
 * and new counts mix with nothing to tell them apart. Clearing is what makes
 * the chart mean one thing again.
 *
 * ── WHAT IT WILL NOT TOUCH ────────────────────────────────────────────────
 * Anything not on the list it prints. The feedback entries, the post reads, the
 * style codes and the axis counters all stay: the codes and axes were being
 * dropped rather than miswritten, so whatever is in them is small and true.
 *
 * ── HOW TO RUN IT ─────────────────────────────────────────────────────────
 * It needs the two KV values, which live in Vercel and should stay there:
 *
 *     npx vercel env pull .env.local
 *     node --env-file=.env.local scripts/clear-legacy-counters.mjs
 *
 * That is a DRY RUN: it reads every key, prints what it holds, and deletes
 * nothing. Add --confirm to the same command to delete.
 *
 *     node --env-file=.env.local scripts/clear-legacy-counters.mjs --confirm
 *
 * Delete .env.local afterwards.
 */

import { COUPLE_TYPES } from '../api/_couple-types.js';
import { PAIRING_TIERS } from '../api/_lib/pairing.js';

/** The twenty-five names track-type validated against before it was fixed. */
const RETIRED_TYPE_IDS = [
  'mirror', 'steady_pair', 'complementary', 'richly_different', 'quiet_depth', 'full_room',
  'spark_ground', 'head_heart', 'both_logic', 'both_feeling', 'fast_repair', 'slow_repair',
  'conflict_mismatch', 'close_knit', 'independent_pair', 'reach_retreat', 'structured_life',
  'open_flow', 'plan_flow', 'open_book', 'quiet_reserve', 'express_reserve', 'translator',
  'expectation_aligned', 'expectation_gap',
];

/* A retired name that is also a live id would mean deleting a real count. */
const live = new Set(COUPLE_TYPES.map((t) => t.id));
const collide = RETIRED_TYPE_IDS.filter((id) => live.has(id));
if (collide.length) {
  console.error(`[clear-legacy-counters] ${collide.join(', ')} is both retired and live.`
    + ' Refusing to run: this would delete counts the product is still writing.');
  process.exit(1);
}

const KEYS = [
  ...RETIRED_TYPE_IDS.map((id) => `attune:ct:${id}`),
  'attune:ct:total',
  ...PAIRING_TIERS.map((t) => `attune:gap:${t}`),
];

const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;
if (!url || !token) {
  console.error('[clear-legacy-counters] KV_REST_API_URL and KV_REST_API_TOKEN are not set.');
  console.error('');
  console.error('  npx vercel env pull .env.local');
  console.error('  node --env-file=.env.local scripts/clear-legacy-counters.mjs');
  console.error('');
  console.error('That reads and prints without deleting. Add --confirm to delete.');
  process.exit(1);
}

const confirm = process.argv.includes('--confirm');
const headers = { Authorization: `Bearer ${token}` };

async function get(key) {
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, { headers });
  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  return body?.result ?? null;
}
async function del(key) {
  const res = await fetch(`${url}/del/${encodeURIComponent(key)}`, { method: 'POST', headers });
  return res.ok;
}

console.log(`${confirm ? 'Clearing' : 'Reading (dry run)'} ${KEYS.length} legacy counters.\n`);
let held = 0;
let removed = 0;
for (const key of KEYS) {
  const value = await get(key);
  const n = Number(value);
  const has = Number.isFinite(n) && n > 0;
  if (has) held += n;
  if (!confirm) {
    console.log(`  ${has ? String(n).padStart(6) : '     .'}  ${key}`);
    continue;
  }
  const ok = await del(key);
  if (ok) removed += 1;
  console.log(`  ${ok ? 'cleared' : 'FAILED '}  ${has ? `(held ${n})` : '(was empty)'}  ${key}`);
}

console.log('');
if (!confirm) {
  console.log(`${held} counts across those keys. Nothing was deleted.`);
  console.log('Run the same command with --confirm to clear them.');
} else {
  console.log(`${removed} of ${KEYS.length} keys cleared; they held ${held} counts between them.`);
  console.log('Delete .env.local now.');
}
