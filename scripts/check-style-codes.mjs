#!/usr/bin/env node
/**
 * The style code is read, validated and counted from one set of axes.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * A person's style code grew from four axes to six, and three places still
 * believed four, each differently, and not one of them failed:
 *
 *   src/App.jsx returned six letters under a header comment describing the
 *   fourth axis as C/A, while the code returned R/L.
 *
 *   api/track-type.js validated an arriving code against /^[EIXGFSC]{4}$/ and
 *   SKIPPED anything that failed rather than refusing it, so every code the
 *   product has ever produced was dropped in silence.
 *
 *   api/get-feedback.js asked the store for the sixteen four-letter
 *   combinations of E/I, X/G, F/S and C/A, so the admin's style distribution
 *   read zero for all sixteen.
 *
 * A thing computed for every person was written nowhere and read as nothing,
 * and the chart looked exactly like having no customers. Ellie reads the admin
 * to find out what customers are like.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * It RUNS the code rather than reading it. Twenty thousand score sets through
 * styleCodeFor, and every answer has to satisfy the pattern the endpoint
 * validates with and appear in the list the admin enumerates. If any of the
 * three drifts from the axes, a code is produced that cannot be stored, or
 * stored under a key nobody reads.
 *
 * The neutral boundary is tested by itself, because that is where the first
 * version of the shared module differed from the website on 7,104 of 20,000
 * sets: four axes ask whether a score is above neutral and two ask whether it
 * is below, so an exact 3 goes one way on four of them and the other way on
 * two. A sweep of whole numbers alone would have found it; a sweep that avoided
 * 3 would not. Both are here.
 *
 * And no file carries its own alphabet: a four-letter pattern or a hand-built
 * list of codes is the bug coming back.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the axes are the right ones, and whether the thresholds are right,
 * which are product decisions. This is about the three readings agreeing.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  STYLE_AXES, STYLE_CODE_PATTERN, ALL_STYLE_CODES, styleCodeFor,
} from '../api/_lib/style-codes.js';

const ROOT = new URL('..', import.meta.url).pathname;
const AXES = 'api/_lib/style-codes.js';
const fails = [];

/* A gate that has lost its subject must never report success. */
if (STYLE_AXES.length < 5 || ALL_STYLE_CODES.length !== 2 ** STYLE_AXES.length) {
  console.error(`[check-style-codes] ${AXES} has ${STYLE_AXES.length} axes and`
    + ` ${ALL_STYLE_CODES.length} codes, which cannot both be right. Refusing to pass.`);
  process.exit(1);
}

const DIMS = [...new Set(STYLE_AXES.flatMap((a) => a.dims))];
const codes = new Set(ALL_STYLE_CODES);

/** Every code the reader can produce is one the writer accepts and the admin counts. */
function check(scores, where) {
  const code = styleCodeFor(scores);
  if (!STYLE_CODE_PATTERN.test(code)) {
    fails.push(`${where}: produced "${code}", which the endpoint's own pattern rejects.`
      + '\n      track-type.js skips a code that fails rather than refusing it, so this is a'
      + '\n      person counted nowhere and nothing anywhere says so.');
    return;
  }
  if (!codes.has(code)) {
    fails.push(`${where}: produced "${code}", which is not in the list the admin reads back.`
      + '\n      The count is written under a key no chart asks for.');
  }
}

let seed = 11;
const rnd = (n) => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) % n;
for (let t = 0; t < 20000 && fails.length < 4; t += 1) {
  const s = {};
  for (const d of DIMS) s[d] = 1 + rnd(5) + (rnd(2) ? 0.5 : 0);
  check(s, `score set ${t}`);
}

/* The boundary itself, either side by a thousandth, which is where two of the
   six axes read the opposite way round. */
for (const v of [2.999, 3, 3.001]) {
  check(Object.fromEntries(DIMS.map((d) => [d, v])), `every dimension at ${v}`);
}
/* And one axis at neutral at a time, so a flipped one cannot hide behind five
   that agree. */
for (const d of DIMS) {
  check({ ...Object.fromEntries(DIMS.map((k) => [k, 5])), [d]: 3 }, `${d} alone at neutral`);
  check({ ...Object.fromEntries(DIMS.map((k) => [k, 1])), [d]: 3 }, `${d} alone at neutral, low`);
}

/* And nobody keeps their own alphabet. */
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
for (const rel of ['api', 'src'].flatMap((d) => files(d))) {
  if (rel === AXES) continue;
  /* Comments blanked first: these files explain the bug they came from and
     quote the old pattern while doing it, which the first version of this
     scan then reported as the bug. A gate that reads a comment as code
     punishes the file for saying what went wrong. */
  const src = readFileSync(join(ROOT, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));
  const own = /\/\^\[[EIXGFSCARLDHQT]{4,}\]\{\d\}\$\//.exec(src);
  if (own) {
    fails.push(`${rel} carries its own pattern for a style code: ${own[0]}`
      + `\n      STYLE_CODE_PATTERN in ${AXES} is built from the axes, so it cannot be left`
      + '\n      behind when a seventh is added. The last one said four letters for years.');
  }
  const built = /for \(const \w+ of \['[EIXGFSC]','[EIXGFSC]'\]\)[\s\S]{0,200}?push\(/.exec(src);
  if (built) {
    fails.push(`${rel}:${src.slice(0, built.index).split('\n').length} builds its own list of style`
      + ` codes.\n      ALL_STYLE_CODES in ${AXES} is generated from the axes.`);
  }
}

if (fails.length) {
  console.error('[check-style-codes] A style code is produced that cannot be stored or read back:');
  for (const f of fails) console.error(`  ${f}`);
  console.error('');
  console.error(`The axes are ${AXES}; the reader, the validator and the admin all derive from them.`);
  process.exit(1);
}

console.log(`[check-style-codes] ${STYLE_AXES.length} axes, ${ALL_STYLE_CODES.length} codes;`
  + ' 20,000 score sets plus the neutral boundary and each axis at neutral alone, every code'
  + ' produced accepted by the endpoint and counted by the admin.');
