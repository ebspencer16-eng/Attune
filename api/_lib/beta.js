/**
 * Who counts as a beta tester.
 *
 * ── WHY IT IS ITS OWN FILE ────────────────────────────────────────────────
 * It was one function inside api/couple-beta-status.js, which is fine while one
 * endpoint asks the question. /api/home now asks it too, because Ellie wants
 * the beta feedback prompt to be one of the two action cards rather than a
 * banner of its own, and the cards come from the priority engine.
 *
 * Two endpoints deciding "is this person a beta tester" by writing the same
 * condition twice is the failure this repo is organised against. One of them
 * would eventually say BETA and the other would check a flag, and a person
 * would see the prompt on one surface and not the other.
 */

/**
 * A promo code that marks a beta order.
 *
 * Substring rather than equality, and upper-cased first, because the codes in
 * the wild are BETA, BETA2026, ATTUNEBETA and the same in lower case. Written
 * once so both callers agree about what counts.
 */
export function isBetaCode(code) {
  return typeof code === 'string' && code.toUpperCase().includes('BETA');
}

/** True when any order belonging to either partner carries a beta code. */
export function isBetaOrderSet(orders) {
  return Array.isArray(orders) && orders.some((o) => isBetaCode(o?.promo_code));
}
