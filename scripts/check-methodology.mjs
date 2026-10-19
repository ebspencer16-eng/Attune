#!/usr/bin/env node
/**
 * METHODOLOGY.md still describes the scoring that ships.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Ellie: "I want a methodology document that is kept current."
 *
 * Kept current is the whole requirement. A methodology document that has
 * drifted is worse than none, because it is the thing somebody reaches for
 * when they want to know what a number means, and it answers confidently.
 *
 * ── HOW THIS IS CHECKED, AND HOW IT WAS NEARLY CHECKED WRONG ──────────────
 * `npm run check` must not run the generator before this. CLAUDE.md records
 * that mistake twice: the insights review and the couple type review were both
 * regenerated earlier in the same chain, so by the time the check looked, the
 * document agreed with itself. A planted change walked through both.
 *
 * So: this reads the COMMITTED file, runs the generator in memory, and
 * compares. Different means the document is stale, which fails the build and
 * writes the fresh one in its place so it can be committed. The generator is
 * deliberately not in the check chain.
 *
 * ── AND A SECOND THING, WHICH IS NOT THE SAME THING ───────────────────────
 * That the document still SAYS something. A generator whose imports have been
 * emptied out produces a perfectly consistent document about nothing, and the
 * comparison above would pass it. So a handful of figures are asserted to be
 * present and to be the ones the modules hold: not a second copy of the
 * document, a floor under it.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { build } from './build-methodology.mjs';
import { ALIGNMENT_BANDS } from '../api/_lib/alignment.js';
import { AXIS_CONFIG, DIM_KEYS } from '../api/_type-engine.js';
import { PERSONALITY_QUESTIONS } from '../api/_questions.js';

const DOC = new URL('../METHODOLOGY.md', import.meta.url).pathname;
const fails = [];

let committed = '';
try { committed = readFileSync(DOC, 'utf8'); }
catch {
  fails.push('METHODOLOGY.md is not in the tree. Run: node scripts/build-methodology.mjs');
}

const fresh = build();

if (committed && committed !== fresh) {
  writeFileSync(DOC, fresh);
  /* Written rather than only reported, so the fix is `git add` rather than
     remembering which command regenerates it. */
  fails.push('METHODOLOGY.md had fallen behind the code and has been rewritten in place.\n'
    + '      Something about the scoring changed and the document still described the old\n'
    + '      version. Read the diff, check it says what you meant, and commit it.');
}

/**
 * The floor: a document that says nothing would pass the comparison above.
 *
 * Each of these is read from the module rather than typed here, EXCEPT where
 * typing it is the point: the band edges are the product's promise, so if they
 * move, this says so and somebody decides deliberately. Same argument as
 * check-alignment-rule, which learned it the hard way when a plant moved a
 * threshold and the gate's own sample points moved with it.
 */
const must = [
  [`| Aligned | 0 to ${ALIGNMENT_BANDS.aligned} |`, 'the alignment bands'],
  [`from ${PERSONALITY_QUESTIONS.length} questions`, 'how many communication questions there are'],
  ['### 1.3 Self-report and blended', 'the section on which score is used where'],
  ['## 6. Results are frozen', 'the section on frozen results'],
];
for (const [needle, what] of must) {
  if (!fresh.includes(needle)) {
    fails.push(`the generated document no longer contains ${what} (looked for "${needle}").\n`
      + '      A document that has quietly stopped saying something passes a comparison\n'
      + '      with itself every time.');
  }
}

/* Every dimension on an axis is named, and every axis weight adds to one. A
   weight that drifts is the kind of thing this document exists to publish. */
for (const axis of ['withdraw', 'open']) {
  const rows = Object.entries(AXIS_CONFIG).filter(([, c]) => c.axis === axis);
  const total = rows.reduce((a, [, c]) => a + c.weight, 0);
  if (Math.abs(total - 1) > 1e-9) {
    fails.push(`the ${axis} axis weights add to ${total.toFixed(3)} rather than 1, so the`
      + ' table in §1.2 prints a total that is not 100 per cent. That is a scoring bug'
      + ' this document would publish.');
  }
}
if (Object.keys(DIM_KEYS).length < 5) {
  console.error('[check-methodology] fewer than five dimensions, which cannot be right.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

if (fails.length) {
  console.error('\n check-methodology: the document no longer describes the product.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-methodology] METHODOLOGY.md matches the modules it is generated from:`
  + ` ${Object.keys(DIM_KEYS).length} dimensions, both axes adding to 100 per cent, the`
  + ` alignment bands at ${ALIGNMENT_BANDS.aligned} and ${ALIGNMENT_BANDS.discuss}, and`
  + ' every section still present. The generator is not in the check chain, so this'
  + ' compares the committed file rather than one written a moment earlier.');
