/**
 * Every Communication question with both answers and both cross-views on it.
 *
 * ── WHAT THIS IS FOR ──────────────────────────────────────────────────────
 * The website ends each Communication detail page with a dropdown: one row per
 * question, the two options either side of a bar, and up to four dots on it.
 * Two large ones are what each partner said about themselves. Two small ones
 * are the cross-view reads: what each guessed about the other.
 *
 * The app had none of it, because it never received an answer. Everything it
 * had was scores.
 *
 * ── WHOSE COLOUR A DOT WEARS ──────────────────────────────────────────────
 * The person the dot is ABOUT, not the person who answered. So "how your
 * partner sees you" is your colour and sits beside your own dot, which is what
 * makes the pair readable as agreement or a misread. Get this backwards and
 * the chart says the opposite of what happened.
 *
 * ── THE FLIP ──────────────────────────────────────────────────────────────
 * One question, st1, is written with its scale reversed relative to the rest
 * of its dimension. The website flips both the value and the two option texts
 * when it draws it. That happens here instead, so neither renderer has to know
 * which question is odd.
 */

import { PERSONALITY_QUESTIONS } from '../_questions.js';

/** The one question whose scale runs the other way. */
const FLIPPED = new Set(['st1']);

const num = (v) => {
  const n = Number(v);
  return v == null || Number.isNaN(n) ? null : n;
};

/**
 * @param {object} mine    the viewer's ex1 answers
 * @param {object} theirs  their partner's ex1 answers
 * @returns rows in question order, already viewer-relative and already flipped
 */
export function sideBySide(mine, theirs) {
  if (!mine || !theirs) return [];
  return PERSONALITY_QUESTIONS.map((q) => {
    const flip = FLIPPED.has(q.id);
    const adj = (v) => (v == null ? null : (flip ? 6 - v : v));
    return {
      id: q.id,
      dimension: q.dimension,
      text: q.text,
      // Poles swap with the value, so left is always the low end of the scale.
      left: flip ? q.b : q.a,
      right: flip ? q.a : q.b,
      you: adj(num(mine[q.id])),
      them: adj(num(theirs[q.id])),
      // What each guessed about the other. Named for who the dot is about, so
      // a renderer cannot get the colours the wrong way round.
      readOfYou: adj(num(theirs[`pv_${q.id}`])),
      readOfThem: adj(num(mine[`pv_${q.id}`])),
    };
  }).filter((r) => r.you != null || r.them != null);
}
