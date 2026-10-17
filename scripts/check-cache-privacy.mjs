#!/usr/bin/env node
/**
 * What the app keeps on the phone, and what it must not.
 *
 * ── WHY THERE IS A CACHE AT ALL ───────────────────────────────────────────
 * Ellie: "My pages take a long long time to load every time I open the app.
 * Surely we can fix this, no other apps I use do this. Can we download
 * insights and notes and things once and then they live on the person's phone
 * and we don't have to re-download them every time?"
 *
 * So the last good answer for a handful of endpoints is written to a file and
 * drawn while the request that replaces it is still in the air.
 *
 * ── AND WHY THE JOURNAL IS NOT IN IT ──────────────────────────────────────
 * Ellie, of the journal: "the journal isn't even behind a passcode." It is
 * now, with the phone's own. A copy of its text in a file beside the app is a
 * copy that is behind nothing, so /api/notes is not cached, and neither are
 * the tags, which name what somebody filed.
 *
 * That is a promise about the product, not a style preference, and the way it
 * breaks is somebody adding one word to a list.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 *   the set of cacheable keys names nothing about notes, tags or the journal;
 *   no fetcher for those endpoints is wrapped in the remembering helper;
 *   signing out empties the cache, because a phone gets lent;
 *   and the file sits in the cache directory, which the system may clear,
 *     rather than in documents, which it backs up.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the file is written at all. That needs a device, and the screens
 * read through `recall`, which returns null when there is nothing: a cache
 * that silently never writes costs a slow open and nothing else. The failure
 * this is about is the other direction.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const cache = readFileSync(`${ROOT}attune-app/src/lib/payload-cache.ts`, 'utf8');
const client = readFileSync(`${ROOT}attune-app/src/api/client.ts`, 'utf8');
const session = readFileSync(`${ROOT}attune-app/src/api/session.ts`, 'utf8');

const fails = [];

/* ── 1. The keys ─────────────────────────────────────────────────────────── */
const union = cache.match(/export type CacheKey =([^;]+);/);
if (!union) {
  console.error('[check-cache-privacy] payload-cache.ts declares no CacheKey union;'
    + ' refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}
const keys = [...union[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
if (!keys.length) {
  console.error('[check-cache-privacy] CacheKey names nothing. Refusing to pass.');
  process.exit(1);
}
const FORBIDDEN = /note|journal|tag|mark|survey/i;
for (const k of keys) {
  if (FORBIDDEN.test(k)) {
    fails.push(`CacheKey includes "${k}". The journal is behind the phone's passcode at her ask,`
      + ' and a copy of it in a file is a copy that is behind nothing.');
  }
}

/* ── 2. No private endpoint is wrapped ───────────────────────────────────── */
/*
 * Matched on the call, not on the name: `remembering(` with the endpoint's
 * path inside the same expression. A fetcher that wraps itself some other way
 * would need a different name here, which is why the paths are checked too.
 */
const PRIVATE_PATHS = ['/api/notes', '/api/survey'];
for (const path of PRIVATE_PATHS) {
  const re = new RegExp(`remembering\\([^)]*${path.replace('/', '\\/')}`, 's');
  if (re.test(client)) {
    fails.push(`${path} is wrapped in remembering(), so its answer is written to the phone.`);
  }
}
/* And the other spelling: remember() called with one of those payloads. */
for (const m of client.matchAll(/remember\(\s*'([^']+)'/g)) {
  if (!keys.includes(m[1])) {
    fails.push(`remember('${m[1]}') names a key the cache does not declare.`);
  }
}

/* ── 3. Signing out empties it ───────────────────────────────────────────── */
const clear = session.match(/export async function clearToken[\s\S]*?\n}/);
if (!clear) {
  fails.push('session.ts has no clearToken, so nothing here can check that signing out empties'
    + ' the cache.');
} else if (!/forgetEverything\s*\(/.test(clear[0])) {
  fails.push('clearToken does not empty the cache. A phone gets lent: the next person to sign in'
    + " would meet the last one's results on screen while their own load.");
}

/* ── 4. In the cache directory ───────────────────────────────────────────── */
if (!/Paths\.cache/.test(cache)) {
  fails.push('the cache file is not under Paths.cache. Documents are backed up and restored to'
    + ' other devices; this is a copy of somebody\'s results.');
}

if (fails.length) {
  console.error('\n check-cache-privacy: the app is keeping something it should not.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-cache-privacy] ${keys.length} payloads kept on the phone (${keys.join(', ')}),`
  + ' nothing from the journal or the tags, emptied on sign-out, in the cache directory.');
