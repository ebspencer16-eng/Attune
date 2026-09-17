/**
 * Which set of Physical Intimacy questions a couple is asked, and how it is
 * decided.
 *
 * ── THE RULE IS THE COUPLE'S ANSWER, NOT A COLUMN ─────────────────────────
 * Ellie: "We used to start this exercise with one framing question (just like
 * ex2 does), but the first partner to do the exercise answered and the second
 * partner didn't need to answer it again, it just carried over for both
 * partners."
 *
 * That is exactly what the website still does: it asks the question, stores
 * the answer inside the exercise's own record, and hands the second partner
 * the same set. The app decided from relationship_status instead, which is a
 * second rule for one decision: a couple who are married but say no, or not
 * married and say yes, were asked one way on one surface and the other way on
 * the other, and the results compared answers to two different questions.
 *
 * So the variant lives where the website puts it: in intimacy_data. This
 * module is the one place that reads it and the one place the question's words
 * live.
 */

/** The question, for whichever partner gets there first. */
export const FRAMING = {
  eyebrow: 'One question first',
  note: 'This sets the framing for both of you. Whoever starts first decides it for the couple.',
  options: [
    { variant: 'married', label: 'Yes', sub: 'Questions about how things are now' },
    { variant: 'premarital', label: 'No', sub: 'Questions about what you expect' },
  ],
};

/** The question itself, which names the partner. */
export function framingTitle(partnerName) {
  return `Are you and ${partnerName || 'your partner'} regularly physically intimate?`;
}

/** Everything a surface needs to ask it. */
export function framingQuestion(partnerName) {
  return { ...FRAMING, title: framingTitle(partnerName) };
}

/**
 * The variant this couple is locked to, or null if neither has started.
 *
 * Mine first, then theirs. Both are the same answer once either exists; the
 * order only matters while one of them is mid-exercise.
 */
export function lockedVariant(mineRecord, theirsRecord) {
  return mineRecord?.variant || theirsRecord?.variant || null;
}

/** The variant to render with when the couple has not answered yet. */
export const DEFAULT_VARIANT = 'premarital';
