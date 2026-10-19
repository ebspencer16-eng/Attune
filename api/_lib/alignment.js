/**
 * What counts as aligned, and how close is close. One place, every exercise.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Ellie, of the Expectations bars: "I don't think it should be all-or-nothing
 * aligned, I want to include degrees (preston and I were basically aligned on
 * this one so it's a good example)." And then: "One source of truth for every
 * alignment score, wherever it appears."
 *
 * The example is Emotional Labour. She answered "Both of us" and refined it to
 * "Usually Ellie, sometimes Preston"; Preston answered "Ellie". Those are
 * neighbours on a five-point scale and the product scored it as a flat miss,
 * identical to one of them saying Ellie and the other saying Preston.
 *
 * ── WHAT THIS OWNS AND WHAT IT DOES NOT ───────────────────────────────────
 * It owns the JUDGEMENT: given a distance, how close are these two people and
 * which of the three things do we say about it.
 *
 * It does not own the MEASUREMENT. How far apart two answers are is genuinely
 * different per exercise, because the instruments are different: Communication
 * is a five-point Likert each way, a responsibility is a position between two
 * people, a life question is an index into an ordered list, and one intimacy
 * question is two sets compared by overlap. Pretending those are one function
 * would be a second copy of a rule wearing a shared name.
 *
 * So each exercise measures its own distance, normalises it to 0..1, and asks
 * here what that means. Before this, four surfaces each decided for itself:
 * `gapState` in _intimacy-questions.js, `agrees` in expectations.js, a
 * `(1 - avgGap) * 100` in intimacy-results.js, and `cat.aligned /
 * cat.answered` on the phone.
 *
 * ── THE ONE DELIBERATE EXCEPTION ──────────────────────────────────────────
 * Communication does not use these bands, and that is on purpose rather than
 * unfinished. Its line is CARD_ALIGNED_GAP in comm-alignment.js, one point on
 * a one-to-five scale, which normalises to 0.25 and not to the 0.2 here. The
 * note on that constant says why it has not moved:
 *
 *   "Kept at 1 deliberately rather than quietly moved: changing it changes a
 *    number every existing customer has already seen, and that is Ellie's
 *    call, not a side effect of fixing which scores it reads."
 *
 * That is still true, so the figure on every storycard stays where it is until
 * she says otherwise. check-alignment-source holds the exception rather than
 * leaving it to be rediscovered as a bug.
 */

/**
 * The two lines, on a distance normalised to 0..1.
 *
 * Taken from `gapState` in api/_intimacy-questions.js, which is the one of the
 * four that was already expressed in these terms, so Physical Intimacy keeps
 * every band and every word it has ever shown. Nothing about this change moves
 * an intimacy figure; it moves where the figure is decided.
 */
export const ALIGNMENT_BANDS = { aligned: 0.2, discuss: 0.5 };

/**
 * Which band a normalised distance falls in.
 *
 * `null` for a distance that does not exist, which is not the same as a
 * distance of zero: one is an unanswered question and the other is perfect
 * agreement, and reading the first as the second is how an empty exercise
 * reports as aligned. Every caller here has made that mistake at least once.
 */
export function bandFor(distance) {
  if (distance == null || Number.isNaN(distance)) return null;
  if (distance <= ALIGNMENT_BANDS.aligned) return 'aligned';
  if (distance <= ALIGNMENT_BANDS.discuss) return 'discuss';
  return 'different';
}

/**
 * How close two answers are, as a whole percentage.
 *
 * The inverse of the distance, so identical answers read 100 and opposite ends
 * read 0. This is the number on a bar, and a bar is why the degrees were asked
 * for: a bar at 75 says "nearly" and a bar at 0 says "opposite", and those
 * were the same bar.
 */
export function closenessPct(distance) {
  if (distance == null || Number.isNaN(distance)) return null;
  return Math.round((1 - clamp(distance)) * 100);
}

/**
 * The same number read the other way: how far apart, as a whole percentage.
 *
 * Physical Intimacy shows both. The percentage on the bar is how close they
 * are, and the prose underneath is chosen by how far apart they are, so the
 * one distance is rendered twice and the two readings have to be exact
 * complements of each other. They were two lines in two files, each rounding
 * independently, which is how a page says 87 per cent aligned beside a
 * sentence written for a 14 per cent gap.
 */
export function distancePct(distance) {
  if (distance == null || Number.isNaN(distance)) return null;
  return Math.round(clamp(distance) * 100);
}

/** A distance outside 0..1 is a measurement bug, and it must not paint a bar
 *  wider than its track or a negative percentage. Clamped, not thrown: a
 *  results page is the wrong place to discover an arithmetic slip. */
function clamp(d) {
  if (d < 0) return 0;
  if (d > 1) return 1;
  return d;
}

/**
 * The mean of closeness percentages that have already been worked out.
 *
 * A category's bar is the average of its rows' bars. That is the same thing as
 * averaging the distances and inverting once, because the inversion is linear,
 * and it avoids the round trip: percentage back to distance, averaged, rounded
 * again. Nulls are skipped for the same reason as above, and an empty set
 * answers null rather than nought.
 *
 * It lives here beside the other two so that every piece of arithmetic about
 * how aligned two people are is in one file, which is what Ellie asked for.
 */
export function meanPct(pcts) {
  const scored = (pcts || []).filter((n) => n != null && !Number.isNaN(n));
  if (!scored.length) return null;
  return Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);
}

/** True when a distance is inside the aligned band. The boolean the rows have
 *  always carried, derived from the bands rather than decided again. */
export function isAligned(distance) {
  return bandFor(distance) === 'aligned';
}
