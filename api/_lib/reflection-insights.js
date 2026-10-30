/**
 * Two helpers for reading what someone wrote in the Relationship Reflection.
 *
 * This file used to derive a Reflection action plan as well, titled from
 * REFLECTION_ACTION_TITLES. The page that drew it was removed from both
 * surfaces on 14 September at Ellie's ask, and the plan went on being computed
 * and sent with nothing reading it. Ellie, 29 October: "Remove them." So the
 * derivation and its titles are gone, and what is left is what the website's
 * Reflection pages still call.
 */

import { NON_ANSWER } from '../_anniversary-questions.js';

/**
 * Is this free text an answer, or a placeholder?
 *
 * Under eight characters, or anything matching NON_ANSWER, is treated as not
 * provided. An insight built on "n/a" asserts a problem the person never
 * described. This lived in src/App.jsx and did not come across with the code
 * that uses it, so every insight threw the moment it was reached.
 */
export function isSubstantive(v) {
  if (typeof v !== 'string') return false;
  const t = v.trim().replace(/[.!?]+$/, '');
  if (t.length < 8) return false;
  if (NON_ANSWER.test(t)) return false;
  return true;
}

/** A person's own words, marked as a quote rather than as our prose. */
export function quoted(v) {
  return `\u201C${String(v || '').trim().replace(/\s+/g, ' ')}\u201D`;
}
