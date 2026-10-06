/**
 * What one cart item costs, in one place.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * api/create-payment-intent.js and api/calculate-tax.js each worked a cart's
 * price out for themselves. That is the arrangement that produced the bug this
 * codebase is known for: the payment endpoint priced premium at 198 and the tax
 * endpoint priced the same package at 295, and because checkout.html reads only
 * the tax figure back, the subtotal on screen stayed right while the tax beside
 * it was computed on a base a hundred dollars too high.
 *
 * check-package-prices was written after that and holds every PACKAGE price
 * table to the catalogue. It did not cover the add-on table or the rules, and
 * both had drifted again by the time anyone looked:
 *
 *   calculate-tax.js carried its own ADDON_PRICES, under a comment reading
 *   "Mirrors create-payment-intent.js — keep in sync", which is this codebase's
 *   failure mode written down as an instruction.
 *
 *   And the workbook rule was only in one of them. Premium includes the
 *   workbook, so create-payment-intent charges nothing for it and asks $20 only
 *   when a digital premium upgrades to print. calculate-tax charged the full 19
 *   or 39 for every package. Measured over every cart shape, four of them taxed
 *   a premium customer on 19 to 39 dollars more than they were charged, and
 *   sent Stripe a workbook line the payment intent does not bill.
 *
 * So: the base price, the workbook rule and the add-on total live here, and
 * both endpoints import them. check-one-cart-price forbids a second copy.
 */

import { ADDON_PRICES, DIGITAL_PRICES, PHYSICAL_PRICES } from '../_catalogue.js';

/** The package itself, digital or printed. */
export function itemBasePrice(item) {
  return item.isPhysical
    ? (PHYSICAL_PRICES[item.pkgKey] ?? 0)
    : (DIGITAL_PRICES[item.pkgKey] ?? 0);
}

/**
 * The workbook charge in dollars, which is not simply its price.
 *
 * Premium includes the workbook. A digital premium that wants it printed pays
 * the $20 digital-to-print upgrade; a physical premium already has the printed
 * one and pays nothing. Every other package pays the add-on price.
 */
export function workbookAmount(item) {
  if (!item.addonWorkbook) return 0;
  const print = item.addonWorkbook === 'print';
  if (item.pkgKey === 'premium') return (!item.isPhysical && print) ? 20 : 0;
  return print ? ADDON_PRICES.workbookPrint : ADDON_PRICES.workbookDigital;
}

/** Everything added to the package, workbook rule included. */
export function itemAddonTotal(item) {
  let addons = workbookAmount(item);
  if (item.addonReflection) addons += ADDON_PRICES.reflection;
  if (item.addonBudget) addons += ADDON_PRICES.budget;
  if (item.addonChecklist) addons += ADDON_PRICES.checklist;
  if (item.addonIntimacy) addons += ADDON_PRICES.intimacy;
  if (item.addonConflict) addons += ADDON_PRICES.conflict;
  return addons;
}

/** The whole item. */
export function itemSubtotal(item) {
  return itemBasePrice(item) + itemAddonTotal(item);
}
