/**
 * The screen that closes an exercise, for both surfaces.
 *
 * ── WHY IT IS A MODULE ────────────────────────────────────────────────────
 * Ellie: "Exercise complete page still needs a rebuild. Should say '[Exercise]
 * Complete' in bold, then keep the description as is, have the done button say
 * 'back to insights' and have all that content in the middle of the page like
 * the intro pages. Build a nice completion page for each exercise."
 *
 * There were six of these screens across the two surfaces and they said four
 * different things: "Done.", "Reflection Complete.", "Exercise 2 Complete.",
 * and the exercise's own name. Same shape as the opening pages before they
 * were pulled into api/_lib/exercise-intro.js, and the same fix.
 *
 * ── THE NAME COMES FROM THE REGISTRY ──────────────────────────────────────
 * Not typed out per exercise. The registry already knows what each exercise is
 * called, and an exercise renamed there should not leave a completion page
 * still saying the old name.
 */

import { EXERCISES } from '../_exercises.js';
import { WAITING } from './waiting-copy.js';

/**
 * @param {string} key   an exercise key from api/_exercises.js
 * @returns {{title: string, body: string[], cta: string}|null}
 */
export function exerciseComplete(key) {
  const exercise = EXERCISES.find((e) => e.key === key);
  if (!exercise) return null;
  return {
    title: `${exercise.fullLabel || exercise.label} complete`,
    /**
     * "Keep the description as is."
     *
     * Four of the five ended on the same line, which is hers. Conflict
     * Patterns ended on its own, because it is the exercise with a section
     * nobody else ever sees, and the last thing it says is that promise. That
     * one stays where it belongs rather than being flattened into the common
     * case.
     */
    body: [key === 'conflict'
      ? 'Your answers are saved. Your patterns stay private to you, always.'
      : WAITING.EXERCISE_FOOTER],
    cta: 'Back to insights',
  };
}
