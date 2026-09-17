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
  /**
   * Ellie wrote a sentence for this screen and then, seeing it set as a hero,
   * cut it to the name: "Change exp pt 2 intro page hero to just say Part two:
   * Responsibilities."
   *
   * The rest of what she wrote is not here and is not anywhere. It is named in
   * TASKS.md rather than trimmed into a line by me, because a line under this
   * one is copy and copy is hers.
   */
  ex2: 'Part two: Responsibilities',
};

/** The divider for one exercise, or null if it has one part. */
export function partTwoText(key) {
  return PART_TWO[key] || null;
}
