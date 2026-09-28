/**
 * The one string that names a couple.
 *
 * ── WHY IT IS A MODULE ────────────────────────────────────────────────────
 * Two partners have to compute the same key from opposite sides, or one of them
 * writes a row the other cannot find. Sorting the two ids is what makes that
 * true, and it is the whole of the rule, which is exactly the kind of one-liner
 * that gets retyped.
 *
 * It was already in two places: api/notes.js, where shared notes are filed under
 * it, and api/_lib/results-store.js, which sorts the same pair into partner_a
 * and partner_b for the same reason. Adding a third for the shared tools is what
 * made it worth naming.
 *
 * ── THE SAME RULE AS THE RESULTS ROW ──────────────────────────────────────
 * orderPair in results-store.js answers the same question for a different shape:
 * it returns the two ids in canonical order plus whether they were swapped,
 * because a results row keeps a column per partner. This returns the joined
 * string, because everything else keys a single row by the pair. They agree by
 * construction, both being a sort, and check-couple-key holds them to it.
 */

/**
 * @param {string} a one partner's profile id
 * @param {string} b the other's
 * @returns {string} the same key whichever way round they are given
 */
export function coupleKeyOf(a, b) {
  return [a, b].sort().join(':');
}
