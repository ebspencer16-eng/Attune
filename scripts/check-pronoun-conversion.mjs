#!/usr/bin/env node
/**
 * One pronoun rule, and one place a pronoun becomes a gender word.
 *
 * ── THE BUG THIS CAME OUT OF ──────────────────────────────────────────────
 * The admin reported a Gender breakdown for months and nothing in Attune asks
 * anybody their gender: `profiles.gender` is null for every row, so the page
 * filled the gap by reading pronouns. Ellie, from the number rather than the
 * code: "I think some of the data is wrong, none of our beta testers are non
 * binary."
 *
 * She then asked for the conversion back, deliberately: "Keep demo titles as
 * gender not pronoun, I know we ask pronoun but I want to convert to gender."
 * What was wrong was never the conversion. It was a conversion done in three
 * places with nothing on the page saying it had happened.
 *
 * ── WHAT A SWEEP FOUND AFTERWARDS ─────────────────────────────────────────
 * Two of those three had been dealt with. The third had not: a comment above
 * QX_VAL_LABELS said that table was "the only place it happens", and three
 * thousand lines above it the demographics loader typed the three pairs out
 * again. They agreed, which is why nobody had looked, and the copy was missing
 * the fourth row. Driven in a browser against four people, one of whom had a
 * pronoun off the list: three bars, 25 per cent each, and a quarter of the
 * population in the total and in no bar. The page said nothing.
 *
 * And api/admin-typing.js and api/admin-explore.js each carried the same
 * six-line normaliser under its own copy of the same comment.
 *
 * ── WHAT THIS CHECKS ──────────────────────────────────────────────────────
 * 1. The rule, run rather than read, over the cases that have been wrong
 *    before: case and whitespace, an empty value, and a pronoun off the list.
 * 2. No second normaliser under api/, including the forms a tidy-up produces:
 *    a list with .includes, a lookup table, a chain of comparisons.
 * 3. Every admin endpoint that sends a pronoun sends it normalised, because
 *    the page's buckets are the values it is sent.
 * 4. public/admin.html converts to a gender word in exactly one table, and
 *    that table has a row for every label the rule can produce. A missing row
 *    is a group counted in the denominator and drawn in no bar.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether gender should be shown at all. That is Ellie's call and she has made
 * it twice. This is about the conversion happening once, in a place that can
 * say on hover where the word came from.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { PRONOUNS, pronounLabel } from '../api/_lib/pronouns.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(join(ROOT, f), 'utf8');
const fails = [];

/* A gate that has lost its subject must never report success. */
if (PRONOUNS.length !== 3 || typeof pronounLabel !== 'function') {
  console.error('[check-pronoun-conversion] api/_lib/pronouns.js no longer offers three pronouns'
    + ' and a label function. Refusing to pass.');
  process.exit(1);
}

// ── 1. The rule, run ──────────────────────────────────────────────────────
const CASES = [
  ['she/her', 'she/her'], ['he/him', 'he/him'], ['they/them', 'they/them'],
  ['She/Her', 'she/her'], ['  they/them  ', 'they/them'],
  ['', null], [null, null], [undefined, null], ['   ', null],
  ['ze/zir', 'other'], ['he/they', 'other'], ['woman', 'other'],
];
for (const [input, want] of CASES) {
  const got = pronounLabel(input);
  if (got !== want) {
    fails.push(`pronounLabel(${JSON.stringify(input)}) is ${JSON.stringify(got)},`
      + ` and every surface here assumes ${JSON.stringify(want)}.`);
  }
}

// ── 2. One normaliser under api/ ──────────────────────────────────────────
const PRONOUN_RE = /['"](she\/her|he\/him|they\/them)['"]/g;
function files(dir, out = []) {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) {
      if (/node_modules|\.expo|dist/.test(name)) continue;
      files(rel, out);
      continue;
    }
    if (/\.(js|mjs)$/.test(name)) out.push(rel);
  }
  return out;
}
const blank = (src) => src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));
const lineOf = (src, i) => src.slice(0, i).split('\n').length;

let scanned = 0;
for (const rel of files('api')) {
  if (rel === join('api', '_lib', 'pronouns.js')) continue;
  scanned += 1;
  const src = blank(read(rel));
  /**
   * Two or more of the three strings close together, AND a fallback bucket
   * beside them. Both halves are needed.
   *
   * The first version asked only about the list and flagged
   * api/_lib/role-tokens.js, which keys a table of she/her/hers off the three
   * so a sentence can say "she's always the one". That is grammar, not this
   * rule, and it has no fourth bucket because every pronoun has a subject
   * form. A gate that matches too much is not the safe direction: it gets
   * loosened until it matches nothing.
   *
   * The bucket is what makes it this rule. Both copies this came from ended
   * `: 'other'`, and so does the form a tidy-up produces, `LIST.includes(v) ?
   * v : 'other'`, which is why the window is lines rather than one expression.
   */
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const window = lines.slice(i, i + 6).join('\n');
    const distinct = new Set([...window.matchAll(PRONOUN_RE)].map((m) => m[1]));
    if (distinct.size < 2) continue;
    const around = lines.slice(Math.max(0, i - 6), i + 12).join('\n');
    if (!/['"]other['"]/.test(around)) continue;
    fails.push(`${rel}:${i + 1} writes the pronoun rule out again: the three strings, and a`
      + ' fallback bucket beside them.'
      + '\n      pronounLabel in api/_lib/pronouns.js is that rule, and the last two files that'
      + '\n      carried it were identical, which is why nobody had looked.');
    break;
  }
}

// ── 3. A pronoun leaves an endpoint normalised ────────────────────────────
for (const rel of files('api')) {
  if (!/admin/.test(rel)) continue;
  const src = blank(read(rel));
  for (const m of src.matchAll(/pronouns:\s*([^,\n}]+)/g)) {
    const value = m[1].trim();
    if (/pronounLabel\s*\(/.test(value)) continue;
    /* A field assembled from values that were already normalised above is
       fine; only a raw column read is not. */
    if (!/\bp\w*\.(partner_)?pronouns\b/.test(value)) continue;
    fails.push(`${rel}:${lineOf(src, m.index)} sends a pronoun straight off the row:`
      + `\n      pronouns: ${value}`
      + '\n      The admin buckets what it is sent, so anything off the list lands in the total'
      + '\n      and in no bar. Send pronounLabel(...) instead.');
  }
}

// ── 4. One conversion to a gender word, with every row in it ──────────────
{
  /**
   * Comments blanked first. SLICE_ORDER's pronoun list carries the trailing
   * note "// ordered Woman, Man, Non-binary, Other", which is the file saying
   * what the table means, and the first run of this called it a second
   * conversion. A gate that reads a comment as code punishes a file for
   * explaining itself.
   */
  const admin = blank(read('public/admin.html')).replace(/<!--[\s\S]*?-->/g, '');
  const GENDER_WORDS = /(Woman|Man|Non-binary)/;
  const places = [];
  const lines = admin.split('\n');
  lines.forEach((line, i) => {
    if (!GENDER_WORDS.test(line)) return;
    if (!PRONOUN_RE.test(line)) { PRONOUN_RE.lastIndex = 0; return; }
    PRONOUN_RE.lastIndex = 0;
    places.push(i + 1);
  });
  if (places.length === 0) {
    console.error('[check-pronoun-conversion] public/admin.html no longer turns a pronoun into a'
      + ' gender word anywhere. Ellie asked for that conversion by name. Refusing to pass.');
    process.exit(1);
  }
  if (places.length > 1) {
    fails.push(`public/admin.html turns a pronoun into a gender word in ${places.length} places:`
      + ` lines ${places.join(', ')}.`
      + '\n      One table, which is what the tooltip on each tile points at. Two tables agreed'
      + '\n      for months and the second was missing a row.');
  }
  /* Every label the rule can produce has a word in the table. */
  const table = lines[places[0] - 1];
  for (const key of [...PRONOUNS, 'other']) {
    if (!new RegExp(`['"]?${key}['"]?\\s*:`).test(table)) {
      fails.push(`the gender table in public/admin.html has no row for "${key}".`
        + '\n      Everybody with that pronoun is counted in the total and drawn in no bar, which'
        + '\n      is how four people became three bars adding up to 75 per cent.');
    }
  }
}

if (fails.length) {
  console.error('[check-pronoun-conversion] a pronoun is handled in more than one way:');
  for (const f of fails) console.error(`  ${f}`);
  process.exit(1);
}

console.log(`[check-pronoun-conversion] one rule, run over ${CASES.length} values, with no second`
  + ` copy of it across ${scanned} files under api/; every admin endpoint sends a pronoun`
  + ' normalised, and public/admin.html turns one into a gender word in a single table with a row'
  + ' for all 4 labels the rule can produce.');
