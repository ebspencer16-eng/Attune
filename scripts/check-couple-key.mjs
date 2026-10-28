#!/usr/bin/env node
/**
 * One string names a couple, and every producer of it agrees.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Two partners compute the key from opposite sides. Sorting the two ids is
 * what makes them land on the same one, and it is the whole of the rule,
 * which is exactly the kind of one-liner that gets retyped. Shared notes are
 * filed under it, the shared tools are, and a results row keeps a column per
 * partner in the same order. If two producers disagree, one partner writes a
 * row the other cannot find, and nothing throws.
 *
 * ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
 * api/_lib/couple-key.js has said in its own header, since it was written,
 * that "check-couple-key holds them to it". There was no such file. The
 * sentence read as coverage and provided none, which is worse than silence:
 * it is the thing somebody checks before deciding whether to look.
 *
 * What the missing gate would have caught, found by grepping for a function
 * defined twice: api/_lib/order-promo.js carried
 * `[String(id), String(partnerId)].sort().join(':')` under the name
 * coupleKeyFromProfiles. A fourth copy of the rule, beside the module whose
 * header says the third is what made it worth naming, and it agreed, so
 * nothing could see it.
 *
 * And this gate found a FIFTH on its first run, which is the argument for it:
 * api/survey.js built the couple id for every survey answer by sorting the
 * pair itself. It agreed too. The thing worth keeping from that one is the
 * difference it did NOT share: for a respondent with nobody linked it answers
 * their own bare id, not null, so survey_responses.couple_id holds two shapes
 * and anything comparing it to a couple key matches the pairs and silently
 * never matches the solos. A copy can agree about the common case and differ
 * about the edge, which is the worst of both.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * Behavioural, not textual: the three producers are RUN over the same pairs,
 * both ways round, and have to answer the same thing. Then one textual rule,
 * because a new copy is the failure mode: nobody but couple-key.js may spell
 * the sort out.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The ANONYMOUS couple id in api/_lib/couple-id.js, which is a hash of the
 * same pair and is held by check-couple-id.mjs. That one is sent to the admin
 * page, which must not be able to read it back; this one is a database key.
 * Two different promises over one pair of ids, and conflating them is how the
 * stored key would end up on a screen.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fail = [];

const { coupleKeyOf } = await import('../api/_lib/couple-key.js');
const { orderPair } = await import('../api/_lib/results-store.js');
const { coupleKeyFromProfiles } = await import('../api/_lib/order-promo.js');

/* ── THE THREE PRODUCERS, RUN ───────────────────────────────────────────── */
/* Pairs chosen to exercise the comparison rather than to look tidy: ids that
   sort the other way round from the order given, ids differing in the last
   character, and a uuid pair of the shape the product actually stores. */
const PAIRS = [
  ['a', 'b'],
  ['b', 'a'],
  ['zzz', 'aaa'],
  ['aaaa-1', 'aaaa-2'],
  ['11111111-2222-3333-4444-555555555555', '99999999-8888-7777-6666-555555555555'],
  ['99999999-8888-7777-6666-555555555555', '11111111-2222-3333-4444-555555555555'],
];
for (const [a, b] of PAIRS) {
  const key = coupleKeyOf(a, b);
  if (coupleKeyOf(b, a) !== key) {
    fail.push(`coupleKeyOf depends on which partner is asked: ${a},${b} gives ${key} and ${b},${a} gives ${coupleKeyOf(b, a)}`);
  }
  if (coupleKeyFromProfiles(a, b) !== key) {
    fail.push(`coupleKeyFromProfiles disagrees with coupleKeyOf on ${a},${b}: ${coupleKeyFromProfiles(a, b)} against ${key}`);
  }
  /* orderPair answers the same question in a different shape, because a
     results row keeps a column per partner. Joined, it has to be the key. */
  const p = orderPair(a, b);
  if (`${p.a}:${p.b}` !== key) {
    fail.push(`orderPair disagrees with coupleKeyOf on ${a},${b}: ${p.a}:${p.b} against ${key}`);
  }
  if (p.swapped !== (orderPair(a, b).a !== a)) {
    fail.push(`orderPair's swapped flag does not describe what it did on ${a},${b}`);
  }
}

/* A couple of one is not a couple, and only one of the three is asked that. */
if (coupleKeyFromProfiles('a', null) !== null || coupleKeyFromProfiles(null, 'b') !== null) {
  fail.push('coupleKeyFromProfiles must answer null when there is no partner: an order whose buyer has nobody linked is not a couple of one');
}

/* ── AND NOBODY ELSE MAY SPELL THE SORT OUT ─────────────────────────────── */
/* Matching the arithmetic rather than a name, because a fifth copy will have a
   fifth name. Comments are blanked first: this file and couple-key.js both
   quote the expression while explaining it, and a gate that reads prose as
   code punishes a file for saying what went wrong. */
const ALLOWED = new Set(['api/_lib/couple-key.js']);
const SORT_JOIN = /\.sort\s*\(\s*\)\s*\.join\s*\(\s*['"`]:['"`]\s*\)/;
const walk = (dir, out = []) => {
  for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(rel, out);
    else if (/\.(js|jsx|ts|tsx|mjs|html)$/.test(e.name)) out.push(rel);
  }
  return out;
};
const files = [...walk('api'), ...walk('src'), ...walk('public'), ...walk('attune-app/src')];
let scanned = 0;
for (const rel of files) {
  if (ALLOWED.has(rel)) continue;
  scanned += 1;
  const code = readFileSync(join(root, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  if (SORT_JOIN.test(code)) {
    fail.push(`${rel} sorts a pair and joins it on a colon. That is coupleKeyOf in api/_lib/couple-key.js; import it rather than writing the rule again.`);
  }
}

if (fail.length) {
  console.error('check-couple-key FAILED');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log(`[check-couple-key] three producers of the couple key agree over ${PAIRS.length} pairs read both ways round, `
  + `and none of the ${scanned} other files under api/, src/, public/ and the app spells the sort out.`);
