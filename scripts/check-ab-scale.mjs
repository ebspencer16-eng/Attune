#!/usr/bin/env node
/**
 * A question set out as an A-to-B scale is set out that way on both surfaces.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Ellie, of the turn-down question: "Can we make this question and answer
 * option setup the same as the comms exercises where the poles are A and B and
 * there's 5 options to show how closely you align with either pole?"
 *
 * Three things have to be true of such a question, and they are easy to get
 * half right:
 *
 *   1. It has BOTH poles. One pole is a scale from something to nothing.
 *   2. It has five steps between them, plus the decline. Four or six is not
 *      the shape she asked for and has no middle, which is the whole reason
 *      the old five hand-written behaviours could not be finished.
 *   3. The poles are drawn. The server can send them and a screen can ignore
 *      them, and then the options read "Strongly A" with no A anywhere on the
 *      page, which is worse than what was there before.
 *
 * ── THE COPY GAP THIS CLOSED ──────────────────────────────────────────────
 * C2. Under the stem "When you turn your partner down, you", two of the five
 * answers still read as though the stem said "you want them to": one said you
 * read your own turn-down the way your partner reads it, the other said you
 * reassure yourself. There is no third behaviour between worrying and not
 * worrying, so there was nothing to write. A scale has a middle by
 * construction.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Not the comms exercise, whose questions all carry poles and whose renderer
 * is the one this copied. That set is uniform and has its own checks; this is
 * about a question that opted into the shape inside a set that had not.
 *
 * Not the wording of a pole. That is Ellie's.
 */

import { readFileSync } from 'node:fs';
import { INTIMACY_QUESTIONS, optionText } from '../api/_intimacy-questions.js';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

/** Every intimacy question that has opted into the shape. */
const scaled = INTIMACY_QUESTIONS.filter((q) => q.a || q.b);

if (!scaled.length) {
  console.error('[check-ab-scale] no intimacy question carries poles any more.'
    + ' The turn-down question was converted to one on 25 September; if that was'
    + ' undone deliberately, take this check out with it. Refusing to pass'
    + ' quietly.');
  process.exit(1);
}

for (const q of scaled) {
  if (!q.a || !q.b) {
    fails.push(`${q.id} has only one pole. A scale from something to nothing`
      + ' cannot be answered: "Strongly A" means nothing without a B.');
  }

  /** The five steps, not counting the decline, which has no value. */
  const steps = (q.options || []).filter((o) => o.value !== null && o.value !== undefined);
  if (steps.length !== 5) {
    fails.push(`${q.id} has ${steps.length} steps between its poles and needs`
      + ' five. Ellie asked for five, and an even number has no middle, which is'
      + ' the thing that made the old wording unwritable.');
  }

  /* Ordered from one pole to the other, so the row reads left to right and
     "Strongly A" is the end nearest A. */
  const values = steps.map((o) => o.value);
  const rising = values.every((v, i) => i === 0 || v > values[i - 1]);
  const falling = values.every((v, i) => i === 0 || v < values[i - 1]);
  if (!rising && !falling) {
    fails.push(`${q.id}'s steps are not in order: ${values.join(', ')}. A scale`
      + ' whose middle option is not in the middle is a list wearing a scale\'s'
      + ' labels.');
  }

  /* Every step says where it sits. Checked through optionText, which is what
     both surfaces draw, rather than through `label`, which is storage. */
  for (const variant of ['premarital', 'married']) {
    const shown = steps.map((o) => optionText(o, variant));
    if (new Set(shown).size !== shown.length) {
      fails.push(`${q.id} shows the same words twice under ${variant}:`
        + ` ${shown.join(' / ')}.`);
    }
  }
}

/**
 * And both surfaces draw the poles.
 *
 * Two patterns per surface, because one was not enough. The first version
 * asked only whether the two fields appeared near each other, and a plant that
 * replaced the branch's condition with `false` left them sitting inside a block
 * that never renders, so the gate passed on a screen with no poles on it.
 *
 * So the guard is matched as well as the draw. What this still cannot see is a
 * branch disabled some third way, or a pole rendered into an element that is
 * positioned off the screen. It is a source check, and the honest limit of a
 * source check is that it reads intent rather than pixels.
 */
const SURFACES = [
  ['the app', 'attune-app/src/components/intimacy-exercise.tsx',
    /\{\s*item\.a\s*&&\s*item\.b\s*\?/, /item\.a\b[\s\S]{0,80}item\.b\b/],
  ['the website', 'src/App.jsx',
    /\{\s*q\.a\s*&&\s*q\.b\s*\?/, /q\.a\b[\s\S]{0,80}q\.b\b/],
];
for (const [who, file, guard, draw] of SURFACES) {
  const src = readFileSync(`${ROOT}${file}`, 'utf8');
  if (!draw.test(src)) {
    fails.push(`${who} never draws the poles, so its options read "Strongly A"`
      + ' with no A anywhere on the page. The server sends them; drawing them is'
      + ' the other half.');
  } else if (!guard.test(src)) {
    fails.push(`${who} draws the poles inside a branch that is not guarded on`
      + ' the poles being there. Either it renders them for every question,'
      + ' including the seventeen that have none, or the branch is switched off'
      + ' and they never render at all.');
  }
}

/** The server has to send them, or neither surface can draw them. */
const questions = readFileSync(`${ROOT}api/questions.js`, 'utf8');
if (!/\ba:\s*q\.a\b/.test(questions) || !/\bb:\s*q\.b\b/.test(questions)) {
  fails.push('api/questions.js does not put the poles on the payload, so the'
    + ' app cannot draw them however well it is written.');
}

if (fails.length) {
  console.error('\n check-ab-scale: a question is half a scale.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`[check-ab-scale] ${scaled.length} question(s) set out as A to B;`
  + ' five ordered steps, both poles, drawn on both surfaces.');
