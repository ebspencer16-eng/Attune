/**
 * What one partner may see of the other's Conflict Patterns.
 *
 * ── THE PROMISE THIS KEEPS ────────────────────────────────────────────────
 * The Conflict Patterns screen tells the customer, in these words:
 *
 *   "Not visible to your partner. This is the one section that stays private,
 *    always."
 *
 * That is `patternsPrivacy` in api/_conflict-results-prose.js. It renders on
 * the website (src/App.jsx) and in the app (conflict-results.tsx). It ships.
 *
 * So this is not an internal preference about what is tasteful to share. It is
 * a commitment already made to the person whose answers these are, and the
 * only way to change it honestly is to change that copy first and tell every
 * couple who answered under the old promise.
 *
 * If you are here because withholding a field is inconvenient: the field is
 * not the problem. Read the sentence above.
 *
 * ── WHAT IS DELIBERATELY NOT COVERED ──────────────────────────────────────
 * Physical Intimacy. It was designed as "questions, side by side": both people
 * answer independently and then see both positions, which is the feature. No
 * equivalent promise was made about it, and applying this rule there would
 * impose a privacy claim the product never made.
 *
 * ── AN ALLOWLIST, NEVER A DENYLIST ────────────────────────────────────────
 * A denylist protects the fields somebody thought of on the day they wrote it.
 * Every field here was added deliberately; anything not named is withheld,
 * including anything added to the summary later.
 *
 * The patterns are the point of the omission. They are a read on how someone
 * behaves when things go wrong, and handing that to their partner changes what
 * the exercise is. Both people see their own.
 *
 * ── WHY IT IS ITS OWN FILE ────────────────────────────────────────────────
 * It lived inside api/conflict-results.js, so it guarded that endpoint and no
 * other. /api/partner-sync returned the whole conflict record, patterns
 * included, and had done since it was written. One door watched, one open.
 */

/**
 * What the partner is allowed to contribute to your results.
 *
 * Built by naming what goes in, never by deleting from their full summary.
 * A denylist silently starts leaking the day someone adds a field.
 */
export function partnerView(summary, name) {
  if (!summary) return null;
  return {
    name: name || null,
    // Their own read on how conflict goes. A feeling they chose to give, and
    // the same question you answered, so comparing the two is the point.
    overall: summary.overall,
    // What helps them reset. This is the actionable half: it is the thing you
    // can do for them.
    repairRanking: summary.repairRanking,
    // The three shared questions, which are about approach rather than risk.
    openings: summary.openings,
    // What they wrote in their own words, which both of you agreed to share by
    // answering it.
    strength: summary.strength,
    reflection: summary.reflection,
    appreciation: summary.appreciation,
  };
}
