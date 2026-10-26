/**
 * Which add-ons an order actually includes.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie: "Add-on attachment by package isn't correct, I and a few other beta
 * users have access to add-ons and should see that."
 *
 * The chart was reading the `addon_*` columns on the order row, which record
 * what somebody PAID FOR as a line item. That is one of three ways to have an
 * add-on and it is the rarest one here: every order on the system today is a
 * promo order at zero dollars.
 *
 * The three ways:
 *
 *   1. It was bought as a line item. The `addon_*` column on the order.
 *   2. The package already includes it. Premium comes with Reflection, Budget,
 *      Conflict and the workbook; Starting Out comes with the Checklist and
 *      the Budget. Nothing is written in an addon column for those, because
 *      nobody bought them separately.
 *   3. A promo code bundled it. That is how the beta testers have theirs, and
 *      it is recorded on the code, not on the order.
 *
 * A chart that counts only the first reports that nobody has any add-ons,
 * which is what she was looking at.
 *
 * ── DERIVED, NOT RESTATED ─────────────────────────────────────────────────
 * The package half reads PKG_CAPS, which is this codebase's single source for
 * what a package includes, by walking its `has*` keys rather than naming four
 * packages. A capability added there turns up here without anybody
 * remembering. The promo half reads `bundledAddons`, which is the same
 * function the checkout and the tax endpoint use to decide what not to charge
 * for.
 *
 * ── WHAT IT IS NOT ────────────────────────────────────────────────────────
 * Not an entitlement check. `capabilitiesFor` in api/_lib/ownership.js decides
 * what a person may OPEN, and it reads every order a couple has plus their
 * partner's. This answers a narrower question about one order, for counting:
 * of the orders in this package, how many carry each add-on. Using the
 * entitlement engine here would count a person's premium order as attaching an
 * add-on their partner bought separately, which is a different figure.
 */
import { PKG_CAPS } from './entitlements.js';
import { bundledAddons } from './beta-codes.js';

/**
 * Every add-on that can be attached to an order, in the order the charts draw
 * them. The list is the product's, not a chart's: `addon_lmft` is deliberately
 * absent because it is a service booking rather than something that unlocks a
 * surface, and it has never been for sale on the page.
 */
export const ORDER_ADDONS = ['workbook', 'reflection', 'budget', 'checklist', 'intimacy', 'conflict'];

/** `hasChecklist` → `checklist`. The join between PKG_CAPS and the names above. */
function capName(key) {
  if (!key.startsWith('has')) return null;
  const name = key.slice(3);
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/**
 * The add-ons a package carries on its own, from PKG_CAPS.
 *
 * Walks the caps rather than listing packages, so a capability added to
 * PKG_CAPS is counted here the same day. A falsy cap is not included; note
 * that `hasWorkbook` is the string 'digital' on premium rather than true,
 * which is why this tests truthiness rather than `=== true`.
 */
export function packageAddons(pkgKey) {
  const caps = PKG_CAPS[pkgKey] || {};
  const out = [];
  for (const [key, value] of Object.entries(caps)) {
    if (!value) continue;
    const name = capName(key);
    if (name && ORDER_ADDONS.includes(name)) out.push(name);
  }
  return out;
}

/**
 * Everything this order includes, as a sorted list of add-on names.
 *
 * @param order      the order row, with its `addon_*` columns and `pkg_key`
 * @param codeMeta   what the promo code on it bundles, or null for no code
 *
 * A name appears once however many of the three routes it arrived by: the
 * question the charts ask is "does this order include it", not "how".
 */
export function addonsOnOrder(order, codeMeta = null) {
  const o = order || {};
  const found = new Set();

  // 1. Bought as a line item.
  for (const name of ORDER_ADDONS) {
    if (o[`addon_${name}`]) found.add(name);
  }
  // 2. Already in the package.
  for (const name of packageAddons(o.pkg_key || o.order_pkg)) found.add(name);
  // 3. Bundled by a promo code.
  if (codeMeta) {
    const bundled = bundledAddons(codeMeta);
    for (const [name, on] of Object.entries(bundled)) {
      if (on && ORDER_ADDONS.includes(name)) found.add(name);
    }
  }
  return ORDER_ADDONS.filter((n) => found.has(n));
}
