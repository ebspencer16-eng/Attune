#!/usr/bin/env node
/**
 * "You line up across the board" is only said to a couple who line up across the
 * board.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * Every question in Physical Intimacy is skippable, on purpose: the forward
 * button reads "Skip" when nothing is chosen, and /api/questions sends no
 * required ids. So both partners can finish the exercise having answered none of
 * it, and `isExerciseDone` counts it finished because the record has a
 * completedAt.
 *
 * The page-level line asked whether anything was MISALIGNED. Nothing was, because
 * nothing had been answered, so a couple who skipped the whole exercise were told
 * they agree about everything. The product asserting agreement from no data, in
 * the most sensitive section it has.
 *
 * Each dimension was already honest on its own: state 'unspoken', reason
 * 'both_skipped', and a body saying neither of them put a number to it. Only the
 * summary line was wrong, and it was wrong because "nothing disagrees" and
 * "everything agrees" are not the same claim. A weaker form of the same overclaim
 * also fired for a couple who answered two dimensions and skipped four.
 *
 * ── WHAT THIS CHECKS, AND WHY OVER THE ANSWER SPACE ───────────────────────
 * A single fixture would have passed the broken version. Two blank records look
 * like agreement to any check that only asks whether the line appeared.
 *
 * So the real function is run over answer sets built from the question modules,
 * and the line is required to appear exactly when every dimension came out
 * aligned, and never otherwise. That includes proving it still appears: a couple
 * picking the middle option throughout agree on all six and must still get it,
 * or this gate would be satisfied by a line that never renders, which is the
 * failure it would be easiest to introduce while fixing the first one.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Not the wording. INTIMACY_ALL_ALIGNED is Ellie's, and this only holds the
 * product to the conditions under which it is true.
 *
 * Not whether skipping should be allowed. It should: these are the questions
 * people are least willing to answer, and a required one would stop the exercise
 * dead. What has to be right is what the results say about a skip.
 *
 * Not the equivalent claim anywhere else. Conflict Patterns has required
 * questions and cannot be finished blank, and Communication and Expectations
 * have no all-aligned line. If one grows a summary that asserts agreement, it
 * needs its own case here, which is why the search below reports how many
 * dimensions it examined rather than asserting a number.
 */

import { readFileSync } from 'node:fs';
import { intimacyResults, intimacyAllAlignedNote } from '../api/_lib/intimacy-results.js';
import { INTIMACY_QUESTIONS, INTIMACY_DIMENSIONS, summarizeIntimacy } from '../api/_intimacy-questions.js';
import { INTIMACY_ALL_ALIGNED } from '../api/_intimacy-results-prose.js';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

/** An answer set that picks the nth option of every question. */
const pick = (n) => {
  const a = {};
  for (const q of INTIMACY_QUESTIONS) {
    const opts = q.options || [];
    if (!opts.length) continue;
    const o = opts[Math.min(n, opts.length - 1)];
    a[q.id] = q.kind === 'multi' ? [o.value ?? o.label ?? o] : (o.label ?? o.value ?? o);
  }
  return a;
};

const record = (answers) => ({ answers, completedAt: Date.now(), variant: 'premarital' });

/**
 * Every case, including the two that matter most: nobody answered anything, and
 * everybody agrees about everything.
 */
const cases = [
  { what: 'both partners skipped every question', mine: record({}), theirs: record({}) },
];
const widest = Math.max(...INTIMACY_QUESTIONS.map((q) => (q.options || []).length), 0);
for (let n = 0; n < widest; n += 1) {
  cases.push({
    what: `both partners picked option ${n + 1} throughout`,
    mine: record(pick(n)), theirs: record(pick(n)),
  });
}
/** And a couple who differ, so the line is proved absent for a real disagreement. */
if (widest > 1) {
  cases.push({
    what: 'the two of them answered differently throughout',
    mine: record(pick(0)), theirs: record(pick(widest - 1)),
  });
}

let sawAligned = 0;
let sawNotAligned = 0;

for (const c of cases) {
  const r = intimacyResults({ mine: c.mine, theirs: c.theirs, variant: 'premarital' });
  if (!r) {
    fails.push(`intimacyResults returned nothing for a couple where ${c.what}.`
      + ' Both records exist and are complete, so there is a section to draw.');
    continue;
  }
  const states = r.dimensions.map((d) => d.state);
  const everyAligned = states.length > 0 && states.every((s) => s === 'aligned');
  const said = r.allAlignedNote === INTIMACY_ALL_ALIGNED;

  if (everyAligned) sawAligned += 1; else sawNotAligned += 1;

  if (everyAligned && !said) {
    fails.push(`every dimension came out aligned when ${c.what}, and the product`
      + ' did not say so. The line exists for exactly this couple, and a fix that'
      + ' silences it everywhere is the easy mistake to make here.');
  }
  if (!everyAligned && said) {
    const why = states.includes('unspoken')
      ? `${states.filter((s) => s === 'unspoken').length} of ${states.length} dimensions went unanswered`
      : 'some dimensions are not aligned';
    fails.push(`the product told a couple they line up across the board when`
      + ` ${c.what}, and ${why} (${states.join(', ')}). "Nothing disagrees" is not`
      + ' "everything agrees", and an unanswered question is not agreement.');
  }
  if (r.allAlignedNote != null && !said) {
    fails.push(`allAlignedNote is set to something other than INTIMACY_ALL_ALIGNED`
      + ` when ${c.what}. Results copy comes from api/, and a second string here`
      + ' would be a second copy of it.');
  }
}

/**
 * ── AND THE OTHER SURFACE, WHICH IS THE HALF THAT WAS STILL WRONG ─────────
 * The first version of this gate ran intimacyResults and nothing else, so it
 * proved the app right and said nothing about the website. The website does not
 * read allAlignedNote: it computes its own intimacy summary in src/App.jsx and
 * printed the line whenever the action plan came back empty. A couple who skipped
 * every question have an empty plan, so the fix reached one surface of two and
 * this gate reported success about it.
 *
 * That is the exact failure the card-clipping check had, passing while pointing at
 * the half that was already correct. So the decision is one exported function now,
 * and this holds the website to calling it rather than deciding for itself.
 */
const appSrc = readFileSync(`${ROOT}src/App.jsx`, 'utf8');
const at = appSrc.indexOf('intimacyActionPlan(intimacySummary?.dimSummary');
if (at < 0) {
  console.error('[check-aligned-claim] cannot find the website\'s intimacy action'
    + ' plan block in src/App.jsx. Refusing to pass: this gate covers two surfaces'
    + ' and has lost one of them.');
  process.exit(1);
}
const block = appSrc.slice(at, at + 1600);
if (!/intimacyAllAlignedNote\(/.test(block)) {
  fails.push('src/App.jsx decides for itself when to print the across-the-board'
    + ' line, instead of asking intimacyAllAlignedNote. An empty action plan is not'
    + ' agreement: a couple who skipped every question have an empty plan too, and'
    + ' this is where they were told they line up across the board.');
}
/**
 * The note has to gate the box, not just fill it.
 *
 * Deleting the guard was planted and passed: the block still asked
 * intimacyAllAlignedNote and still rendered its value, so with a null answer React
 * drew the tinted callout with nothing inside it. Not the false claim any more, but
 * an empty bordered box on the page of a couple who skipped the exercise.
 */
if (/\{allAligned\}/.test(block)
    && !/(!allAligned\)\s*return|allAligned\s*\?|allAligned\s*&&)/.test(block)) {
  fails.push('src/App.jsx renders the across-the-board note without checking that'
    + ' there is one, so when there is not, the callout is drawn empty: a tinted box'
    + ' with a rose border and no sentence in it. Return null when the note is null.');
}
if (/\{INTIMACY_ALL_ALIGNED\}/.test(block)) {
  fails.push('src/App.jsx renders INTIMACY_ALL_ALIGNED directly, so the sentence'
    + ' appears whenever this block is reached rather than when it is true. Render'
    + " intimacyAllAlignedNote's return value, which is null when it is not.");
}

/**
 * Both surfaces, over the same couple, must agree about whether the line appears.
 * Run rather than compared by eye, because that is the only version of this check
 * that a refactor cannot quietly walk around.
 */
for (const c of cases) {
  const server = intimacyResults({ mine: c.mine, theirs: c.theirs, variant: 'premarital' });
  const summary = summarizeIntimacy(c.mine.answers, c.theirs.answers);
  const website = intimacyAllAlignedNote(summary.dimSummary);
  if ((server?.allAlignedNote ?? null) !== (website ?? null)) {
    fails.push(`the two surfaces disagree when ${c.what}: the payload says`
      + ` ${JSON.stringify(server?.allAlignedNote ?? null)} and the website's own`
      + ` reckoning says ${JSON.stringify(website ?? null)}. One couple, two answers.`);
  }
}

/** A gate that examined none of the cases it exists for must not pass. */
if (!sawAligned || !sawNotAligned) {
  console.error('[check-aligned-claim] the search produced only'
    + ` ${sawAligned ? 'aligned' : 'not-aligned'} couples over ${cases.length} cases,`
    + ' so one half of the rule was never exercised. Refusing to pass.');
  process.exit(1);
}

if (fails.length) {
  console.error('\n check-aligned-claim: the product claims agreement it has no'
    + ' evidence for.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`[check-aligned-claim] ${cases.length} answer sets over`
  + ` ${INTIMACY_DIMENSIONS.length} dimensions: the across-the-board line appears in`
  + ` the ${sawAligned} that are aligned throughout and in none of the ${sawNotAligned}`
  + ' that are not, skipped questions included.');
