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
import { PKG_CAPS } from './entitlements.js';
import { PHYSICAL_ENABLED as FLAG_PHYSICAL_ENABLED } from './flags.js';

/**
 * Physical fulfilment, with the environment able to widen it.
 *
 * This moved here with normalizeItem, from api/create-payment-intent.js, and
 * the override came with it: the flag is still the source, and
 * ATTUNE_PHYSICAL_ENABLED=1 turns it on without a deploy. Dropping the env
 * half would have quietly refused every physical order on a site that had the
 * variable set.
 */
const PHYSICAL_ENABLED = process.env.ATTUNE_PHYSICAL_ENABLED === '1' || FLAG_PHYSICAL_ENABLED;

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

/**
 * A cart item, with anything the package already includes taken off it.
 *
 * ── WHAT THIS RESTATED, AND WHAT IT COST ──────────────────────────────────
 * It used to name premium three times: reflection, budget and intimacy were
 * zeroed for a premium item, under a comment saying premium bundles all
 * three. PKG_CAPS grants premium reflection, budget, conflict and the
 * workbook, and NOT intimacy, so two of those three were wrong and one was
 * missing. Measured over every package with every add-on, at the page and at
 * the server:
 *
 *   premium + intimacy      quoted 218, billed 198, granted nothing
 *   premium + conflict      quoted 238, billed 198  (it is included, so the
 *                           quote was the wrong half)
 *   core + conflict         quoted 129, billed  89, granted nothing
 *
 * The last one is the worst and has nothing to do with premium:
 * `addonConflict` was not in this object at all. Every downstream read of a
 * normalised item saw undefined, so a $40 exercise was left out of the
 * charge, out of the tax lines, out of the metadata and therefore out of the
 * order row that grants it. Bought, not billed, not delivered.
 *
 * So the inclusion rule is read from PKG_CAPS rather than written again, and
 * every add-on in the catalogue is carried through. Adding a sixth add-on to
 * a package is now one edit in entitlements.js.
 *
 * ── AND IT LIVES HERE, NOT IN AN ENDPOINT ─────────────────────────────────
 * api/calculate-tax.js had its own version of this, listing four add-ons and
 * missing intimacy and conflict, so its own tax lines for those two could
 * never fire: Stripe was asked to tax a base that left a $40 exercise out.
 * That is the 198/295 bug's shape exactly, and the answer is the same one
 * this file already exists for.
 */
export function normalizeItem(item) {
  const pkgKey = item.pkgKey || item.pkg;
  const caps = PKG_CAPS[pkgKey] || PKG_CAPS.core;
  /* Included in the package = never billed again as an add-on. */
  const addon = (included, asked) => (included ? false : !!asked);
  return {
    pkgKey,
    isPhysical:      PHYSICAL_ENABLED && (!!item.isPhysical || item.format === 'physical'),
    isGift:          !!item.isGift,
    partner1Name:    item.partner1Name || null,
    partner2Name:    item.partner2Name || null,
    giftNote:        item.giftNote || null,
    // Who it is for (A206). Checked as addresses where they are used.
    partnerEmail:    item.isGift || item.invitePartnerLater ? null : (item.partnerEmail || null),
    recipientEmail:  item.isGift ? (item.recipientEmail || null) : null,
    invitePartnerLater: !item.isGift && !!item.invitePartnerLater,
    addonWorkbook:   item.addonWorkbook || null,     // 'digital' | 'print' | null
    // Phase-1: digital-only. Never bill for physical even if
    // the request asks for it.
    addonReflection: addon(caps.hasReflection, item.addonReflection),
    addonBudget:     addon(caps.hasBudget, item.addonBudget),
    addonChecklist:  addon(caps.hasChecklist, item.addonChecklist),
    addonIntimacy:   addon(caps.hasIntimacy, item.addonIntimacy),
    addonConflict:   addon(caps.hasConflict, item.addonConflict),
    shipping:        item.shipping || null,
  };
}

/**
 * One item in the short shape the payment's metadata carries to the webhook,
 * which Stripe caps at 500 characters a value (create-payment-intent chunks
 * the list). Also what api/_lib/fulfil-order.js reads, for a free order too.
 */
export function compactItem(it) {
  return {
    p:   it.pkgKey,
    ph:  it.isPhysical ? 1 : 0,
    g:   it.isGift ? 1 : 0,
    p1:  (it.partner1Name || '').slice(0, 40),
    p2:  (it.partner2Name || '').slice(0, 40),
    gn:  (it.giftNote || '').slice(0, 200),
    w:   it.addonWorkbook || '',
    r:   it.addonReflection ? 1 : 0,
    b:   it.addonBudget ? 1 : 0,
    i:   it.addonIntimacy ? 1 : 0,
    cf:  it.addonConflict ? 1 : 0,
    c:   it.addonChecklist ? 1 : 0,
    s:   it.shipping ? [it.shipping.name, it.shipping.address, it.shipping.city, it.shipping.state].join('|').slice(0, 200) : '',
    pe:  it.partnerEmail || '',
    re:  it.recipientEmail || '',
    il:  it.invitePartnerLater ? 1 : 0,
  };
}
