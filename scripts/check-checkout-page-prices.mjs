#!/usr/bin/env node
/**
 * Every price the checkout page carries is the catalogue's price.
 *
 * ── WHAT WAS NOT WATCHED ──────────────────────────────────────────────────
 * public/checkout.html holds its own price table and its own add-on prices,
 * because it is a static page and cannot import from `api/`. Two of those
 * places build what the CUSTOMER READS: the order summary on the page, and the
 * line items posted to /api/send-order-email, which become the breakdown in
 * their confirmation email.
 *
 * Nothing held those to `api/_catalogue.js`. Planting 25 against the 40 that
 * Conflict Patterns costs was passed by check-prices-on-page,
 * check-package-prices, check-one-cart-price, check-checkout-pricing,
 * check-addon-params, check-copy-tokens and check-email-preview: all seven.
 * The receipt would have said 25 while the card was charged 40.
 *
 * They agree today, which is the condition CLAUDE.md names: "Values that agree
 * today are the ones nothing watches."
 *
 * ── WHY A GATE AND NOT A DERIVATION ───────────────────────────────────────
 * Deriving is the better answer and this repo has the machinery for it:
 * `PKG_CAPS` generates `public/_pkg-rules.js`, and prices could ride the same
 * road. That is a change to the page that takes the payment, and it is written
 * down as a task rather than made in the hours before a demo. This gate makes
 * the divergence impossible to ship in the meantime, which is the part that
 * cannot wait.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * Every `price: N` and every `digitalPrice/physicalPrice: N` in the page,
 * matched to its label, against DIGITAL_PRICES, PHYSICAL_PRICES and
 * ADDON_PRICES. A label it cannot map is reported rather than skipped, because
 * a silent skip is how a sweep becomes evidence for something it never saw.
 */

import { readFileSync } from 'node:fs';
import { DIGITAL_PRICES, PHYSICAL_PRICES, ADDON_PRICES } from '../api/_catalogue.js';

const PAGE = 'public/checkout.html';
const src = readFileSync(new URL(`../${PAGE}`, import.meta.url).pathname, 'utf8');

/** The add-on each label on the page is for. The labels are Ellie's words. */
const BY_LABEL = [
  [/Relationship Reflection/i, 'reflection'],
  [/Shared Budgeting/i, 'budget'],
  [/Physical Intimacy/i, 'intimacy'],
  [/Conflict Patterns/i, 'conflict'],
  [/Merging Lives Checklist/i, 'checklist'],
  [/Workbook.*digital/i, 'workbookDigital'],
  [/Workbook.*print/i, 'workbookPrint'],
];

const problems = [];
let checked = 0;
let unmapped = 0;

/* 1. Add-on and workbook prices, which are written label-beside-price. */
for (const m of src.matchAll(/label:\s*(['"`])(.+?)\1\s*,\s*price:\s*(\d+)/g)) {
  const [, , label, price] = m;
  const hit = BY_LABEL.find(([re]) => re.test(label));
  if (!hit) { unmapped += 1; problems.push(`a price with no add-on behind it: "${label}" at ${price}`); continue; }
  const want = ADDON_PRICES[hit[1]];
  checked += 1;
  if (Number(price) !== want) {
    problems.push(`"${label}" says ${price}; ADDON_PRICES.${hit[1]} is ${want}`
      + ' (this is what the customer reads on the page and in their receipt)');
  }
}

/* 2. The package table, which is written price-beside-key. */
for (const m of src.matchAll(/(\w+):\s*\{[^}]*?digitalPrice:\s*(\d+),\s*physicalPrice:\s*(\d+)/gs)) {
  const [, key, digital, physical] = m;
  if (!(key in DIGITAL_PRICES)) { unmapped += 1; problems.push(`a package table entry with no catalogue key: ${key}`); continue; }
  checked += 2;
  if (Number(digital) !== DIGITAL_PRICES[key]) problems.push(`${key} digital says ${digital}; the catalogue says ${DIGITAL_PRICES[key]}`);
  if (Number(physical) !== PHYSICAL_PRICES[key]) problems.push(`${key} physical says ${physical}; the catalogue says ${PHYSICAL_PRICES[key]}`);
}

/* 3. And the bare `price:` lines in that same table, which the tiles show. */
for (const m of src.matchAll(/(\w+):\s*\{[^}]*?\n\s*price:\s*(\d+),\s*priceLabel:/gs)) {
  const [, key, price] = m;
  if (!(key in DIGITAL_PRICES)) continue;
  checked += 1;
  const want = Math.min(DIGITAL_PRICES[key], PHYSICAL_PRICES[key]);
  if (Number(price) !== want) {
    problems.push(`${key} tile price says ${price}; the lower of its two catalogue prices is ${want}`);
  }
}

if (!checked) {
  console.error(`[check-checkout-page-prices] found no prices in ${PAGE}, so this checked nothing.`
    + ' A gate that has lost its subject must never report success.');
  process.exit(1);
}

if (problems.length) {
  console.error(`[check-checkout-page-prices] ${PAGE} disagrees with api/_catalogue.js:`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error('');
  console.error('  The page cannot import from api/, so these are a second copy of the prices.');
  console.error('  Change api/_catalogue.js and this page together, or finish the derivation');
  console.error('  the way PKG_CAPS reaches the browser through public/_pkg-rules.js.');
  process.exit(1);
}

console.log(`[check-checkout-page-prices] ${checked} prices in ${PAGE} all match api/_catalogue.js:`
  + ` ${Object.keys(DIGITAL_PRICES).length} packages in two formats and ${Object.keys(ADDON_PRICES).length} add-ons.`
  + ` The two that reach a customer are the order summary and the line items posted to`
  + ` /api/send-order-email, which becomes the breakdown in their confirmation email.`);
