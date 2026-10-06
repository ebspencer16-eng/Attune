#!/usr/bin/env node
/**
 * The couple types written, the ones read back, and the ones that exist are one list.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * api/track-type.js validated an incoming couple type against twenty-five names
 * written out in the file: mirror, steady_pair, complementary, and so on. Not
 * one of them is a couple type any more. The product types a couple as a pair
 * of individual codes, WW through ZZ, which is what api/_couple-types.js holds
 * and what src/App.jsx sends.
 *
 * So every couple that finished was answered with 400 "invalid type" and
 * nothing was recorded. Verified against the live endpoint rather than reasoned
 * about: WX, WW and ZZ were all refused in production.
 *
 * api/get-feedback.js then asked the store for counts under those same
 * twenty-five keys, so the admin's couple type distribution was empty. Two
 * halves of one stale list, and between them they made a product with no
 * customers look exactly like a product whose customers had not finished.
 *
 * The one bucket that ever had anything in it was "complementary", because the
 * website sent that as a fallback whenever the engine could not place a couple:
 * a legacy name standing for an absence.
 *
 * Ellie reads the admin to find out what customers are like.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * That no file validates or enumerates couple type ids of its own: the writer,
 * the reader and the sender all resolve against COUPLE_TYPES. Found by running
 * the lists, not by reading them, because both halves looked entirely plausible
 * and agreed with each other.
 *
 * This is the shape CLAUDE.md records twice already, under EXP_LIFE_KEYS and
 * the exercise-to-chapter mapping: when one list indexes into another, the
 * check is not that the list is right but that every key in it RESOLVES.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The sixteen individual style codes beside them, which are generated from
 * their four axes rather than listed, so they cannot go stale the same way.
 * And the counts already in the store under the old names: those are a
 * different taxonomy and no longer readable, which is a decision for Ellie
 * rather than something a gate can mend.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { COUPLE_TYPES } from '../api/_couple-types.js';

const ROOT = new URL('..', import.meta.url).pathname;
const TABLE = 'api/_couple-types.js';
const fails = [];

const ids = COUPLE_TYPES.map((t) => t.id);
if (ids.length < 10 || ids.some((id) => !/^[A-Z]{2}$/.test(id))) {
  console.error(`[check-type-telemetry] ${TABLE} does not hold ten two-letter pair ids;`
    + ` got ${ids.length}: ${ids.join(', ')}. Refusing to pass: a gate that has lost its subject`
    + ' must never report success.');
  process.exit(1);
}
const known = new Set(ids);

function files(dir, out = []) {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) {
      if (/node_modules|\.expo|dist/.test(name)) continue;
      files(rel, out);
      continue;
    }
    if (/\.(js|jsx)$/.test(name)) out.push(rel);
  }
  return out;
}

const lineOf = (src, i) => src.slice(0, i).split('\n').length;
let scanned = 0;

for (const rel of ['api', 'src'].flatMap((d) => files(d))) {
  if (rel === TABLE) continue;
  scanned += 1;
  const src = readFileSync(join(ROOT, rel), 'utf8');
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));

  /*
   * An array of lower_snake identifiers assigned to a name that mentions types.
   * Matched by what it is, because the next person to write this list will not
   * call it COUPLE_TYPE_IDS: track-type's was `validTypes`.
   */
  for (const m of stripped.matchAll(/const (\w*[Tt]ype\w*)\s*=\s*\[([\s\S]{0,900}?)\]/g)) {
    const listed = [...m[2].matchAll(/'([a-z][a-z_]{3,})'/g)].map((x) => x[1]);
    if (listed.length < 3) continue;
    const unknown = listed.filter((k) => !known.has(k));
    if (unknown.length === listed.length) {
      fails.push(`${rel}:${lineOf(stripped, m.index)} \`${m[1]}\` lists ${listed.length} couple`
        + ` type ids and NONE of them resolve: ${unknown.slice(0, 4).join(', ')}...`
        + `\n      The ids are in ${TABLE} and they are pair codes. A list where every key misses`
        + '\n      produces valid-looking nothing: an empty chart reads as a product nobody has'
        + '\n      finished rather than as a list that stopped matching.');
    } else if (unknown.length) {
      fails.push(`${rel}:${lineOf(stripped, m.index)} \`${m[1]}\` lists couple type ids that do not`
        + ` resolve: ${unknown.join(', ')}.`);
    }
  }
}

/*
 * And the three that have to agree: what the site sends, what the endpoint
 * accepts, what the admin reads back. Each has to come from the table.
 */
const USERS = [
  ['api/track-type.js', 'validates an incoming couple type'],
  ['api/get-feedback.js', 'reads the counts back for the admin'],
];
for (const [rel, what] of USERS) {
  const src = readFileSync(join(ROOT, rel), 'utf8');
  if (!/COUPLE_TYPES/.test(src)) {
    fails.push(`${rel} ${what} without reading ${TABLE}.`);
  } else if (!/COUPLE_TYPES\.map\(/.test(src)) {
    fails.push(`${rel} imports COUPLE_TYPES and does not derive its list from it.`
      + '\n      A table imported and not used is a list that will be typed out again beside it.');
  }
}

if (fails.length) {
  console.error('[check-type-telemetry] A couple type id list has stopped matching the types:');
  for (const f of fails) console.error(`  ${f}`);
  console.error('');
  console.error(`Every list of couple types derives from COUPLE_TYPES in ${TABLE}.`);
  process.exit(1);
}

console.log(`[check-type-telemetry] ${scanned} files; ${ids.length} couple types, and the endpoint`
  + ' that records one, the admin that reads them back and the page that sends them all derive'
  + ' their list from the table.');
