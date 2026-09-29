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
import { asksChildhood } from './expectations-page.js';
import { INTIMACY_QUESTIONS } from '../_intimacy-questions.js';
import { conflictQuestionsInOrder } from '../_conflict-questions.js';
import { ANNIVERSARY_QUESTIONS } from '../_anniversary-questions.js';

/** How many questions each exercise asks, from the question sets themselves. */
export function questionCount(key) {
  switch (key) {
    // Every question twice: once about yourself, once about your partner.
    case 'ex1': return PERSONALITY_QUESTIONS.length * 2;
    /**
     * ── EXPECTATIONS ASKS EVERY ITEM TWICE, AND THIS COUNTED IT ONCE ────────
     * This was the life questions plus one per responsibility item, which is 32.
     * The exercise asks 53: every item is asked twice, once about how you split
     * it now and once about how it was growing up, plus the childhood structure
     * question that opens part two.
     *
     * So somebody who had answered the whole thing and not yet pressed finish
     * was shown "37 of 32". Measured by running progressFor over a complete
     * answer set rather than by reading, because the shape is nested and the
     * arithmetic is not visible in either half on its own.
     *
     * ── AND WHICH CATEGORIES ASK THE SECOND TIME ────────────────────────────
     * Not every one does: Extended Family asks only about now. The first version
     * of this fix read `c.asksChildhood` off the category and got 53, four too
     * many, because that flag does not exist on the category. /api/questions adds
     * it, from asksChildhood() in expectations-page.js, which is the function
     * both surfaces already use to decide whether to draw the row.
     *
     * The check caught it: a complete answer set reported 49 of 53. Which is the
     * argument for a behavioural gate over a comment, made against the person
     * who had just written the comment.
     */
    case 'ex2': return LIFE_QUESTIONS.length
      // now, and growing up, per item
      + RESPONSIBILITY_CATEGORIES.reduce((n, c) => n + c.items.length, 0)
      + RESPONSIBILITY_CATEGORIES.reduce((n, c) => n + (asksChildhood(c.id) ? c.items.length : 0), 0)
      // the one question that opens part two
      + 1;
    /**
     * ── NOT REFLECTION_QUESTIONS, WHICH IS A DIFFERENT LIST ─────────────────
     * This read REFLECTION_QUESTIONS, which is five. The exercise asks fourteen:
     * ANNIVERSARY_QUESTIONS is what /api/questions serves and what both screens
     * walk through. REFLECTION_QUESTIONS is derived from ANALYTICS_TEXT, a subset
     * for the admin explorer, and its only other caller is admin-explore.js.
     *
     * So a person nine questions into Relationship Reflection was shown "9 of 5".
     * The status row is the one thing this module exists for.
     *
     * Two plausible names for two different lists, in the same file, one of them
     * a subset of the other: the same shape as /api/notes answering with both
     * `notes` and `annotations` and the results page reading the wrong one.
     * Nothing tells you which you took. check-question-counts.mjs now compares
     * this against what the endpoint actually serves.
     */
    case 'ex3': return (ANNIVERSARY_QUESTIONS || []).length;
    case 'intimacy': return INTIMACY_QUESTIONS.length;
    case 'conflict': return conflictQuestionsInOrder().length;
    default: return 0;
  }
}

/**
 * The answers inside a progress blob, whichever client wrote it.
 *
 * ── WHY IT IS EXPORTED ────────────────────────────────────────────────────
 * Because there was a second reader of this column that did not unwrap, and
 * the two disagreeing lost a whole exercise.
 *
 * api/questions.js hands the app its resume point. It read the column raw, so
 * a website-written ex1 blob arrived at the app as its answers map: an object
 * whose only keys are `answers` and `idx`. Every real answer was dropped, the
 * exercise restarted at question one, and the next save wrote that shape back.
 * Finish in the app from there and ex1_answers holds `{ answers: {...}, idx: 12 }`,
 * which the type engine scores as almost nothing.
 *
 * The status row was right the whole time, because it came through here. One
 * column, two readers, one of them unwrapping: the failure this codebase is
 * organised against, in a place nobody had looked because the column was
 * believed to hold one shape.
 *
 * check-progress-shape.mjs runs every reader over every shape a writer
 * produces.
 */
export function progressAnswers(blob) {
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

  const answers = progressAnswers(profile?.[`${exercise.key}_progress`]);
  const answered = countAnswers(answers);
  return { started: answered > 0, answered, total };
}

/**
 * How many questions have an answer in a saved blob.
 *
 * ── WHY IT LOOKS INSIDE ───────────────────────────────────────────────────
 * Most exercises save a flat map of question id to answer, and counting its
 * values is the whole job. Expectations does not: it saves five maps, one per
 * part, and counting the top level of that says five whatever anyone has
 * answered. Ellie: "Not seeing the in progress status when I exited out."
 *
 * One level deep and no further, because that is the only shape that exists.
 * A value that is itself a map counts as the number of answers inside it.
 */
/**
 * Keys that hold a refinement of an answer rather than an answer.
 *
 * Choosing "Both of us" on a responsibility opens a follow-up asking which kind
 * of both, and that lives under bothDetail. It is not a question anybody is asked
 * unless they answered a particular way, so counting it made the number of
 * answers exceed the number of questions for anyone who chose Both a few times.
 */
const REFINEMENTS = new Set(['bothDetail', 'childhoodBothDetail']);

export function countAnswers(answers) {
  if (!answers || typeof answers !== 'object') return 0;
  let n = 0;
  for (const [key, v] of Object.entries(answers)) {
    if (REFINEMENTS.has(key)) continue;
    if (v == null || v === '') continue;
    if (Array.isArray(v)) { if (v.length) n += 1; continue; }
    if (typeof v === 'object') {
      n += Object.values(v).filter((x) => x != null && x !== '').length;
      continue;
    }
    n += 1;
  }
  return n;
}
