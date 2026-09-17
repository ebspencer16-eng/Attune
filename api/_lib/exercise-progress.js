/**
 * How far into an exercise someone is.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * Ellie: "I exited after only a few questions of ex1, but I expected the
 * status table to say in progress or something, it didn't, but it did save my
 * progress."
 *
 * It was saved. Nothing read it. profiles.ex{N}_progress has held a partly
 * answered exercise since the column was added, and every surface asked only
 * whether the exercise was finished, so someone thirty questions in was shown
 * Start.
 *
 * ── THE TWO SHAPES ────────────────────────────────────────────────────────
 * The column holds two different things, because two clients write it. The
 * website stores { answers, idx }: the answers and which question they were
 * on. The app stores the answers alone. Rather than pick one and break the
 * other's saved work, this reads both. A third shape would be a bug, and a
 * blob with neither reads as nothing saved, which is the safe direction.
 *
 * ── AND WHY THE TOTAL LIVES HERE ──────────────────────────────────────────
 * "Six of fifty" needs the fifty, and the only places that know it are the
 * question modules. The app should not have to fetch a whole question set to
 * draw a status row, so the count is taken once, here, from the same modules
 * the exercise itself is built from.
 */

import { PERSONALITY_QUESTIONS, LIFE_QUESTIONS, RESPONSIBILITY_CATEGORIES } from '../_questions.js';
import { INTIMACY_QUESTIONS } from '../_intimacy-questions.js';
import { conflictQuestionsInOrder } from '../_conflict-questions.js';
import { REFLECTION_QUESTIONS } from '../_anniversary-questions.js';

/** How many questions each exercise asks, from the question sets themselves. */
export function questionCount(key) {
  switch (key) {
    // Every question twice: once about yourself, once about your partner.
    case 'ex1': return PERSONALITY_QUESTIONS.length * 2;
    case 'ex2': return LIFE_QUESTIONS.length
      + RESPONSIBILITY_CATEGORIES.reduce((n, c) => n + c.items.length, 0);
    case 'ex3': return (REFLECTION_QUESTIONS || []).length;
    case 'intimacy': return INTIMACY_QUESTIONS.length;
    case 'conflict': return conflictQuestionsInOrder().length;
    default: return 0;
  }
}

/** The answers inside a progress blob, whichever client wrote it. */
function answersIn(blob) {
  if (!blob || typeof blob !== 'object') return null;
  if (blob.answers && typeof blob.answers === 'object') return blob.answers;
  // The app writes the answers alone. Anything with an `idx` and no `answers`
  // is a website blob that has not been answered into yet.
  if ('idx' in blob) return null;
  return blob;
}

/**
 * @returns {{started: boolean, answered: number, total: number}}
 */
export function progressFor(profile, exercise) {
  const total = questionCount(exercise.key);
  // A finished exercise is not in progress, whatever is left in the column.
  const done = profile?.[exercise.column];
  const finished = exercise.shape === 'record'
    ? !!done?.completedAt
    : !!(done && Object.keys(done).length);
  if (finished) return { started: false, answered: total, total };

  const answers = answersIn(profile?.[`${exercise.key}_progress`]);
  const answered = answers
    ? Object.values(answers).filter((v) => v != null && v !== '').length
    : 0;
  return { started: answered > 0, answered, total };
}
