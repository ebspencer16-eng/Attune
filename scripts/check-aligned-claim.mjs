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

import { intimacyResults } from '../api/_lib/intimacy-results.js';
import { INTIMACY_QUESTIONS, INTIMACY_DIMENSIONS } from '../api/_intimacy-questions.js';
import { INTIMACY_ALL_ALIGNED } from '../api/_intimacy-results-prose.js';

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
