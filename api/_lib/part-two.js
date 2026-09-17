/**
 * The screen between the two halves of an exercise.
 *
 * ── WHY IT IS A MODULE ────────────────────────────────────────────────────
 * Two exercises have two parts. Communication asks the same questions again
 * about your partner; Expectations asks about life and values and then about
 * who does what. Communication's divider said the same sentence on both
 * surfaces because it was typed into both, which is the arrangement that has
 * gone wrong here more than any other. Expectations had no divider at all.
 *
 * Ellie asked for one: "Expectations part 2 should have an intro page like
 * comms part 2." The words below the key are hers, with "Responsibilities"
 * spelled out.
 */

export const PART_TWO = {
  ex1: 'Part Two: All the same questions, but about your partner',
  ex2: 'Part two: Responsibilities helps you identify your expectations for your shared or separate efforts and why you each expect what you do.',
};

/** The divider for one exercise, or null if it has one part. */
export function partTwoText(key) {
  return PART_TWO[key] || null;
}
