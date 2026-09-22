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
 * Package prices in whole dollars, digital and in a box.
 *
 * Canonical. Two endpoints had their own copies and they did not agree:
 * api/create-payment-intent.js priced premium at 198 digital and 233 physical,
 * which is what the cart shows and what the customer is charged, while
 * api/calculate-tax.js priced the same package at 295 and 330. The checkout
 * page reads only the tax figure back from that endpoint, so a premium buyer
 * was quoted sales tax on 295 and then charged tax on 198. Two numbers for the
 * same order, neither of them visibly wrong on its own.
 *
 * public/cart.js, public/checkout.html and public/admin.html still carry their
 * own tables, because a static page cannot import this. check-package-prices
 * .mjs fails the build if any of them stops agreeing with this one.
 */
export const DIGITAL_PRICES  = { core: 89,  newlywed: 139, anniversary: 139, premium: 198 };
export const PHYSICAL_PRICES = { core: 124, newlywed: 174, anniversary: 174, premium: 233 };

/**
 * Everything purchasable, in the order it should be offered.
 *
 * Price is read from ADDON_PRICES rather than written twice, so a price change
 * is one edit and the catalogue cannot disagree with what a customer is
 * charged.
 */
/**
 * `short` is the app's Learn tile and nothing else reads it, which is why
 * Ellie's names for the three tools live here rather than in a lookup inside
 * the app: one copy, and she can change them without a build.
 */
export const CATALOGUE = [
  {
    key: 'conflict', short: 'Conflict', kind: 'exercise',
    label: 'Conflict Patterns',
    blurb: 'How conflict actually goes for you.',
    price: ADDON_PRICES.conflict,
  },
  {
    key: 'intimacy', short: 'Intimacy', kind: 'exercise',
    label: 'Physical Intimacy',
    blurb: 'What you each expect, answered privately.',
    price: ADDON_PRICES.intimacy,
  },
  {
    key: 'reflection', short: 'Reflection', kind: 'exercise',
    label: 'Relationship Reflection',
    blurb: 'Where you have been, and where next.',
    price: ADDON_PRICES.reflection,
  },
  /**
   * ── THE THREE TOOLS, IN ELLIE'S ORDER ───────────────────────────────────
   * "On learn, reorder the resource tiles. First should be personalized
   * workbook, next build a budget, next 'Merging lives checklist' if that
   * fits."
   *
   * Reordered here rather than sorted in the app, because this list is the
   * order things are offered in and a second order held in a screen is the
   * failure this repo is organised against. The three tools are contiguous, so
   * this moves them relative to each other and nowhere else: the exercises
   * above are untouched, and every surface that lists the tools now lists them
   * in this order, which is the point of there being one list.
   */
  {
    key: 'workbook', short: 'Personalized workbook', kind: 'tool',
    label: 'Your Workbook',
    blurb: 'Built from your answers.',
    price: ADDON_PRICES.workbookDigital,
  },
  {
    key: 'budget', short: 'Build a budget tool', kind: 'tool',
    label: 'Build a Budget',
    blurb: 'A shared budget, built together.',
    price: ADDON_PRICES.budget,
  },
  {
    /* Ellie named this one in the same message. `short` is the app's tile and
       nothing else reads it, so "Starting Out" is still what the tool calls
       itself everywhere it is sold. */
    key: 'checklist', short: 'Merging lives checklist', kind: 'tool',
    label: 'Starting Out',
    blurb: 'The practical list for setting up a life.',
    price: ADDON_PRICES.checklist,
  },
];

/** Every key that can appear in the `owned` array. */
export const CATALOGUE_KEYS = CATALOGUE.map(item => item.key);
