#!/usr/bin/env node
/**
 * Every price a customer reads is a price the catalogue sets.
 *
 * ── THE BUG THIS IS FOR ───────────────────────────────────────────────────
 * api/create-payment-intent.js priced premium at 198 and api/calculate-tax.js
 * priced the same package at 295, so the subtotal on screen was right and the
 * tax beside it was computed on a base a hundred dollars too high: quoted one
 * amount, charged another. check-package-prices was written for that and holds
 * every price TABLE in the tree to api/_catalogue.js.
 *
 * ── AND THE HOLE IT LEFT ──────────────────────────────────────────────────
 * A table is a shape, not the thing. public/offerings.html, which is the page
 * where someone decides to buy, does not hold a table: it writes the figures
 * into strings, one at a time.
 *
 *   document.getElementById('premium-price').textContent = physical ? '$233' : '$198';
 *
 * Planting $295 there changed nothing. Nine tables agreed with the catalogue
 * and the sales page could say whatever it liked. That is the same shape as
 * every other near-miss in this repo: the gate matched how the bug was written
 * down the first time rather than what it was about.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 * Every `$<number>` a customer-facing static page renders has to be a figure
 * api/_catalogue.js knows: a package price, an add-on price, or the physical
 * uplift. The uplift is COMPUTED from the two price tables and only accepted
 * while it is the same for all four packages, because the pages say "+$35" in
 * one breath for every package and that sentence stops being true the moment
 * the uplift stops being uniform.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the right price is on the right package. A page could swap two of
 * them and this would pass; check-package-prices covers the tables and
 * check-checkout-pricing covers what is charged. This one is about a figure
 * that is in no price list at all, which is how 295 reached a customer.
 *
 * public/admin.html's generateOrders(), which invents customers, addresses and
 * prices for a demo with no database behind it. Its figures are from an older
 * price list and are as fictional as its couples; the same exemption
 * check-package-prices makes, for the same reason.
 *
 * Comments. $0 and $1 appear only in checkout.html's reasoning about promo
 * codes, and a number in a sentence about code is not a number on a page.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const { DIGITAL_PRICES, PHYSICAL_PRICES, ADDON_PRICES } = await import(`${ROOT}api/_catalogue.js`);

const fails = [];

// ── What the catalogue allows a page to say ─────────────────────────────────
const allowed = new Set([
  ...Object.values(DIGITAL_PRICES),
  ...Object.values(PHYSICAL_PRICES),
  ...Object.values(ADDON_PRICES),
].map(Number));

if (allowed.size < 6) {
  console.error('[check-prices-on-page] the catalogue returned almost no prices. Refusing to'
    + ' pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

/**
 * The physical uplift, derived.
 *
 * The pages write "+$35" beside every package. That is one number standing for
 * four differences, and it is only honest while the four differences are equal.
 */
const uplifts = Object.keys(DIGITAL_PRICES)
  .filter((k) => PHYSICAL_PRICES[k] != null)
  .map((k) => PHYSICAL_PRICES[k] - DIGITAL_PRICES[k]);
const uniform = uplifts.length && uplifts.every((u) => u === uplifts[0]);
if (uniform) allowed.add(uplifts[0]);

// ── Every page a customer reads ─────────────────────────────────────────────
const SKIP = new Set(['admin.html']);
const pages = [];
(function walk(dir) {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) { walk(rel); continue; }
    if (name.endsWith('.html') && !SKIP.has(name)) pages.push(rel);
  }
})('public');

if (!pages.length) {
  console.error('[check-prices-on-page] no customer-facing pages found. Refusing to pass.');
  process.exit(1);
}

let seen = 0;
for (const rel of pages) {
  const raw = readFileSync(join(ROOT, rel), 'utf8');
  /* Comments out. A figure in a sentence about code is not a figure on a page,
     and checkout.html reasons about $0 and $1 promo codes at length. */
  const src = raw
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');

  for (const m of src.matchAll(/\$(\d+)(?!\d*\s*%)/g)) {
    const n = Number(m[1]);
    seen += 1;
    if (allowed.has(n)) continue;
    const line = src.slice(0, m.index).split('\n').length;
    const near = src.split('\n')[line - 1].trim().slice(0, 100);
    fails.push(`${rel}:${line} shows a customer $${n}, which is not a price api/_catalogue.js`
      + ` sets.\n      ${near}\n      Known: ${[...allowed].sort((a, b) => a - b).join(', ')}`
      + `${uniform ? ` (the last is the physical uplift, computed)` : ''}.`);
  }
}

if (!seen) {
  console.error('[check-prices-on-page] no page names a price at all, which cannot be right for'
    + ' a product that sells four packages. Refusing to pass: a gate that has lost its subject'
    + ' must never report success.');
  process.exit(1);
}

if (!uniform) {
  fails.push(`the physical uplift is no longer the same for every package (${uplifts.join(', ')}),`
    + ' and the pages say "+$<one number>" beside all four. That sentence has to change with it.');
}

if (fails.length) {
  console.error('\n check-prices-on-page: a page shows a figure that is in no price list.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-prices-on-page] ${seen} dollar figures across ${pages.length} customer-facing`
  + ` pages, every one a price api/_catalogue.js sets${uniform ? ` or the ${uplifts[0]} physical uplift it implies` : ''}.`);
