/**
 * The pronouns Attune asks for, and what to call anything else.
 *
 * ── WHY THIS IS ITS OWN MODULE ─────────────────────────────────────────────
 * Three surfaces offer a choice of pronouns and two admin endpoints normalise
 * what comes back. Every one of them had the three strings typed into it, and
 * the two endpoints had the same six-line function under two copies of the
 * same comment. They agreed, which is why nobody had looked: a fourth option
 * added to the website would have left both endpoints calling it "other" and
 * the Gender tile counting a group it does not draw.
 *
 * ── AND WHY THE WORD GENDER IS NOT IN HERE ─────────────────────────────────
 * Nothing in Attune asks anybody their gender. The admin reported one for
 * months by reading pronouns, which put a category on a person they never
 * chose, and Ellie caught it from the number: "I think some of the data is
 * wrong, none of our beta testers are non binary."
 *
 * She then asked for the conversion back, deliberately: "Keep demo titles as
 * gender not pronoun, I know we ask pronoun but I want to convert to gender."
 * That conversion is hers to make and it is made in ONE table, in
 * public/admin.html, where the tile can say on hover where the word came from.
 * What is stored, and what this module is about, is the pronoun.
 */

/** The choice offered at setup, in the order it is offered. */
export const PRONOUNS = ['she/her', 'he/him', 'they/them'];

/**
 * A stored pronoun as one of the three, or 'other', or null if there is none.
 *
 * Null rather than 'other' for an empty value: somebody who has not answered
 * is not a fourth group, and counting them as one is the same mistake as
 * calling a pronoun a gender.
 */
export function pronounLabel(pr) {
  const v = String(pr || '').trim().toLowerCase();
  if (!v) return null;
  return PRONOUNS.includes(v) ? v : 'other';
}
