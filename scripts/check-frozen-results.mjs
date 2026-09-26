#!/usr/bin/env node
/**
 * An old frozen row still serves.
 *
 * ── THE RULE THIS PROTECTS ────────────────────────────────────────────────
 * Results are frozen. Once a couple's row exists, /api/results serves it back
 * exactly as written and never recomputes: "a couple's results never change
 * underneath them", in results-store.js's own words. That is deliberate and it
 * is right.
 *
 * It has a consequence that is easy to forget and has already bitten once.
 * A field added to the COMPUTE path reaches new couples only. The couple map
 * needed two coordinates per person; they were added in _lib/results.js beside
 * the axes they come from, which is where they look like they belong, and the
 * map then worked for nobody: everyone who had already finished was being
 * served a stored row without them. The fix was to derive them on the way out,
 * in withContent, and that note is now in CLAUDE.md.
 *
 * ── WHAT THIS CHECKS ──────────────────────────────────────────────────────
 * The serve path against rows that are missing things. A stored row written
 * last year is exactly a row missing whatever has been added since, and there
 * is no way to know from here which fields those are. So instead of guessing
 * at history, every field is removed in turn and the row is served:
 *
 *   1. It must not throw. A field whose absence crashes the serve path is a
 *      blank results screen for every couple who predates it.
 *   2. No brace token may survive. withContent says of itself that "whatever
 *      happens, no brace token survives this function", because forwarding
 *      prose without resolving it put "{EXP} can feel like {EXP_isC} always
 *      the one initiating depth" on screen. That promise has to hold on a
 *      thin row too: the resolver reads partner data, and a row without it
 *      is exactly when a token would slip through.
 *   3. Nothing may come out as the string "undefined" or "null", which is
 *      what a missing value looks like once it has been interpolated into a
 *      sentence.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Not whether a thin row looks RIGHT. A couple served without their axes will
 * be missing a chart, and this cannot tell a missing chart from a chart that
 * was never bought. What it holds is that the page draws and says nothing
 * nonsensical, which is the difference between a section that is absent and a
 * product that looks broken.
 *
 * Not nested fields. One level is where the additions happen, and going deeper
 * would multiply the cases without adding a kind of failure.
 */

import { coupleResults } from '../api/_lib/results.js';
import { withContent, withLabels } from '../api/results.js';
import { CONTENT_VERSION } from '../api/_lib/content-version.js';
import { PERSONALITY_QUESTIONS } from '../api/_questions.js';

/**
 * Two people who answer differently enough to produce a type and a gap.
 *
 * Deterministic: the same answers every run, so a failure is about the code
 * rather than about which fixture came up.
 */
const answersFor = (offset) => Object.fromEntries(
  PERSONALITY_QUESTIONS.map((q, i) => [q.id, ((i + offset) % 5) + 1]),
);

const fresh = coupleResults({
  aAnswers: answersFor(0),
  bAnswers: answersFor(3),
  aName: 'Ellie',
  bName: 'Preston',
});

if (!fresh || !fresh.coupleType) {
  console.error('[check-frozen-results] the engine produced no results from the'
    + ' fixture, so this check has nothing to serve. Refusing to pass.');
  process.exit(1);
}

const PRONOUNS = { a: 'she/her', b: 'he/him' };

/**
 * ── WHICH TOKENS MAY SURVIVE, AND WHY ─────────────────────────────────────
 * {U} and {P} are supposed to come out of this alive. Each partner is {U} in
 * their own view, so two people read the same stored results and the
 * substitution belongs to whoever is rendering, not to the server. Their
 * pronoun forms travel with them.
 *
 * Everything else must be gone. The role names, {EXP}/{GRD} on the open axis
 * and {RCH}/{WDR} on the engage axis, are resolved here by comparing the two
 * partners' scores, which is precisely the work a thin row cannot do.
 *
 * The first version of this matched every brace token and reported the
 * complete row as failing, because it flagged the two that are meant to be
 * there. A check that fails on correct code is the one that gets deleted.
 */
const RENDERER_TOKENS = new Set(
  ['U', 'P'].flatMap((r) => ['', '_sub', '_obj', '_pos', '_isC'].map((f) => `{${r}${f}}`)),
);
const leakedToken = (s) => (s.match(/\{[A-Za-z_][A-Za-z0-9_]*\}/g) || [])
  .find((t) => !RENDERER_TOKENS.has(t));

/** Every string in a served payload, so the whole tree can be inspected. */
function strings(node, out = []) {
  if (typeof node === 'string') { out.push(node); return out; }
  if (Array.isArray(node)) { for (const v of node) strings(v, out); return out; }
  if (node && typeof node === 'object') { for (const v of Object.values(node)) strings(v, out); return out; }
  return out;
}

function serve(row, label) {
  const problems = [];
  let served;
  try {
    served = withContent(withLabels(row), 'a', CONTENT_VERSION, PRONOUNS);
  } catch (e) {
    problems.push(`${label} throws on the way out: ${e?.message || e}.`
      + ' A stored row missing this field is every couple who finished before it'
      + ' existed, and results are never recomputed, so for them this is a blank'
      + ' results screen for ever.');
    return problems;
  }

  for (const s of strings(served)) {
    const leak = leakedToken(s);
    if (leak) {
      problems.push(`${label} leaves ${leak} unresolved on screen: ${JSON.stringify(s.slice(0, 90))}.`
        + ' withContent promises no brace token survives it, and a thin row is'
        + ' exactly when the resolver has nothing to resolve against.');
      break;
    }
    if (/\b(undefined|NaN)\b/.test(s)) {
      problems.push(`${label} puts a missing value into a sentence: ${JSON.stringify(s.slice(0, 90))}.`);
      break;
    }
  }
  return problems;
}

const fails = [];

/* The baseline: a complete row must serve cleanly, or nothing below means
   anything. */
fails.push(...serve(fresh, 'a complete row'));

/* And then a row missing each field in turn, which is what an older row is. */
const keys = Object.keys(fresh);
if (keys.length < 5) {
  console.error(`[check-frozen-results] the results object has only ${keys.length}`
    + ' top-level fields, which is fewer than this check was written against.'
    + ' Refusing to pass on a subject that has moved.');
  process.exit(1);
}

for (const key of keys) {
  const thin = { ...fresh };
  delete thin[key];
  fails.push(...serve(thin, `a row with no \`${key}\``));
}

/* And the thinnest row of all: a couple type and nothing else, which is what a
   row written by a much earlier version of the engine would look like. */
fails.push(...serve({ coupleType: fresh.coupleType }, 'a row with only a couple type'));

if (fails.length) {
  console.error('\n check-frozen-results: an older stored row does not serve.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`[check-frozen-results] ${keys.length + 2} shapes of stored row served:`
  + ' none throws, none leaks a brace token, none prints a missing value.');
