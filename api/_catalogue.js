/**
 * What can be bought, what it is called, and what it costs.
 *
 * ── WHY THIS FILE ─────────────────────────────────────────────────────────
 * The purchasable list was restated everywhere it was needed. checkout.html
 * carries two price functions that already drifted apart once, and had to be
 * held together by a build gate rather than by one of them reading the other.
 * create-payment-intent.js kept its own ADDON_PRICES. The app kept a third
 * copy with labels, blurbs and prices typed out by hand, so adding an add-on
 * changed the site and left the app quietly selling the old set.
 *
 * This is the list. Prices live here once; create-payment-intent.js imports
 * them rather than declaring its own, and /api/home returns the catalogue so
 * the app renders what the server says exists instead of what it remembers.
 *
 * `key` matches the keys in the `owned` array /api/home returns, which is what
 * lets a surface intersect the two without a translation table in between.
 * Change a key here and change it there in the same commit.
 *
 * Blurbs are customer-facing copy. Editorial voice applies: short declarative
 * sentences, no em dashes, no hedging.
 */

/**
 * Add-on prices in whole dollars.
 *
 * Canonical. create-payment-intent.js imports this; nothing else should
 * declare its own. checkout.html still has its own copies, guarded by
 * scripts/check-checkout-pricing.mjs until that page reads from here too.
 */
export const ADDON_PRICES = {
  workbookDigital: 19,
  workbookPrint:   39,
  reflection:      40,
  budget:          20,
  checklist:       20,
  intimacy:        20,
  conflict:        40,
};

/**
 * Everything purchasable, in the order it should be offered.
 *
 * Price is read from ADDON_PRICES rather than written twice, so a price change
 * is one edit and the catalogue cannot disagree with what a customer is
 * charged.
 */
export const CATALOGUE = [
  {
    key: 'conflict',
    label: 'Conflict Patterns',
    blurb: 'How conflict actually goes for you.',
    price: ADDON_PRICES.conflict,
  },
  {
    key: 'intimacy',
    label: 'Physical Intimacy',
    blurb: 'What you each expect, answered privately.',
    price: ADDON_PRICES.intimacy,
  },
  {
    key: 'reflection',
    label: 'Relationship Reflection',
    blurb: 'Where you have been, and where next.',
    price: ADDON_PRICES.reflection,
  },
  {
    key: 'budget',
    label: 'Build a Budget',
    blurb: 'A shared budget, built together.',
    price: ADDON_PRICES.budget,
  },
  {
    key: 'checklist',
    label: 'Starting Out',
    blurb: 'The practical list for setting up a life.',
    price: ADDON_PRICES.checklist,
  },
  {
    key: 'workbook',
    label: 'Your Workbook',
    blurb: 'Built from your answers.',
    price: ADDON_PRICES.workbookDigital,
  },
];

/** Every key that can appear in the `owned` array. */
export const CATALOGUE_KEYS = CATALOGUE.map(item => item.key);
