/**
 * Which discount code an order was placed under, including its partner's.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * Ellie, of the admin's discount distribution: "Still listed as unknown, this
 * should go off of their partner's order code."
 *
 * A couple buys once. One partner pays and their order carries the promo code;
 * the other partner's order is the one that exists so they can reach their own
 * results, and it carries no code at all. So half the orders in a couple look
 * like full-price orders, and the chart either dropped them or bucketed them as
 * Unknown. The discount is a fact about the couple, not about which of the two
 * held the card.
 *
 * ── WHY A MODULE AND NOT TWO COPIES ───────────────────────────────────────
 * Two admin endpoints need this and they reach a couple by different routes:
 * api/admin-data.js has profile ids and partner_profile_id, api/admin-explore.js
 * has already worked out a couple_id per order. Writing the rule in both is the
 * failure this codebase is organised against, so the rule lives here and each
 * caller passes only its own way of naming a couple.
 *
 * ── WHAT IT DELIBERATELY DOES NOT DO ──────────────────────────────────────
 * It does not overwrite `promo_code`. "This order was placed on a code" and
 * "this order belongs to a couple who used a code" are two different facts, and
 * the orders table is still the record of the first. The second is added
 * alongside, with a flag saying when it was inherited, so a chart can say so.
 */

/**
 * Annotate each order with `promo_code_effective` and `promo_code_from_partner`.
 *
 * @param {Array<object>} orders  Order rows. Mutated in place and returned.
 * @param {(order: object) => (string|null)} coupleKeyOf  How the caller names
 *        the couple an order belongs to. Returning null means "this order
 *        stands alone", which is the right answer for a buyer with no partner
 *        linked, and such an order never inherits and never lends.
 * @returns {{ orders: Array<object>, inherited: number, standalone: number }}
 *          The counts are so a caller can report how much of its figure came
 *          from a partner rather than asserting it silently.
 */
export function withEffectivePromoCodes(orders, coupleKeyOf) {
  const list = Array.isArray(orders) ? orders : [];
  const norm = (c) => String(c == null ? '' : c).trim().toUpperCase() || null;

  /* The code a couple used, from whichever of their orders carries one. If the
     two carry different codes, the earlier one wins: a couple's discount is
     the one they bought on, and `created_at` descending is how both endpoints
     read the table, so the last match walking forward is the oldest. */
  const codeByCouple = new Map();
  for (const o of list) {
    const key = coupleKeyOf(o);
    const code = norm(o.promo_code);
    if (key == null || !code) continue;
    codeByCouple.set(key, code);
  }

  let inherited = 0;
  let standalone = 0;
  for (const o of list) {
    const own = norm(o.promo_code);
    if (own) { o.promo_code_effective = own; o.promo_code_from_partner = false; continue; }
    const key = coupleKeyOf(o);
    if (key == null) { o.promo_code_effective = null; o.promo_code_from_partner = false; standalone++; continue; }
    const fromPartner = codeByCouple.get(key) || null;
    o.promo_code_effective = fromPartner;
    o.promo_code_from_partner = !!fromPartner;
    if (fromPartner) inherited++;
  }
  return { orders: list, inherited, standalone };
}

/**
 * A couple key from two profile ids, stable whichever partner is asked.
 * Returns null when there is no partner, which is not a couple of one.
 */
export function coupleKeyFromProfiles(id, partnerId) {
  if (!id || !partnerId) return null;
  return [String(id), String(partnerId)].sort().join(':');
}
