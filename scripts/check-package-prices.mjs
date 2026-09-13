#!/usr/bin/env node
/**
 * One set of package prices, wherever it is written down.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Every table in the tree that maps the four package keys to numbers agrees
 * with DIGITAL_PRICES or PHYSICAL_PRICES in api/_catalogue.js.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * api/create-payment-intent.js and api/calculate-tax.js each declared their
 * own copy, and they disagreed. The payment endpoint priced premium at 198
 * digital and 233 physical, which is what the cart shows and what the card is
 * charged. The tax endpoint priced the same package at 295 and 330.
 *
 * checkout.html reads only the tax figure back from that endpoint, so the
 * subtotal on screen stayed right and the tax beside it was calculated on a
 * base a hundred dollars too high. The customer was quoted one amount of sales
 * tax and charged another. Live, and provable with one curl: a premium item
 * came back with subtotalCents 29500.
 *
 * public/admin.html had a third set, with anniversary at 159 and premium at
 * 299, in the row it builds from a local session.
 *
 * ── WHY A GATE AND NOT A REFACTOR ─────────────────────────────────────────
 * The two endpoints import the canonical table now. The three client copies
 * cannot: cart.js, checkout.html and admin.html are static files with no
 * module system, and rewriting checkout's pricing is the largest and most
 * money-sensitive edit in this repo. So they keep their tables and this makes
 * them impossible to leave out of step. The same reasoning as
 * check-checkout-pricing.mjs, which says so too.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Add-on prices. Those are already one table in api/_catalogue.js for the
 * server, and check-checkout-pricing.mjs covers the checkout page's own.
 *
 * The synthetic orders in admin.html's generateOrders(), which invents names,
 * addresses and prices for a demo with no database behind it. Its prices are
 * from an older price list and they are as fictional as the customers.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const { DIGITAL_PRICES, PHYSICAL_PRICES } = await import(`${ROOT}api/_catalogue.js`);

const KEYS = Object.keys(DIGITAL_PRICES);
if (KEYS.length !== 4) {
  console.error(`[check-package-prices] expected four packages, found ${KEYS.length}. Refusing to pass.`);
  process.exit(1);
}

/** Lines that are allowed to disagree, each for a reason stated above. */
const EXEMPT = [
  { file: 'public/admin.html', contains: "const prices = {core:59" },
];

function files(dir, out = []) {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) {
      if (/node_modules|\.expo|dist/.test(name)) continue;
      files(rel, out);
      continue;
    }
    if (/\.(js|jsx|ts|tsx|html)$/.test(name)) out.push(rel);
  }
  return out;
}

const problems = [];
let tables = 0;

for (const rel of ['api', 'public', 'src', 'attune-app/src'].flatMap((d) => files(d))) {
  if (rel === 'api/_catalogue.js') continue;
  const src = readFileSync(join(ROOT, rel), 'utf8');

  // Shape 1: a map from every package key to a number, on one line or several.
  const mapRe = new RegExp(
    `\\{[^{}]*${KEYS.map((k) => `['"]?${k}['"]?\\s*:\\s*(\\d+)`).join('[^{}]*')}[^{}]*\\}`, 'g');
  for (const m of src.matchAll(mapRe)) {
    if (EXEMPT.some((e) => e.file === rel && m[0].includes(e.contains.split('{')[1].slice(0, 12)))) continue;
    const found = Object.fromEntries(KEYS.map((k, i) => [k, Number(m[i + 1])]));
    // A counter, not a price list: admin.html initialises package tallies as
    // { core: 0, newlywed: 0, ... }. Four identical numbers is never a price
    // list, because no two packages here cost the same.
    if (new Set(Object.values(found)).size === 1) continue;
    tables++;
    const digital = KEYS.every((k) => found[k] === DIGITAL_PRICES[k]);
    const physical = KEYS.every((k) => found[k] === PHYSICAL_PRICES[k]);
    if (!digital && !physical) {
      const line = src.slice(0, m.index).split('\n').length;
      const wrong = KEYS.filter((k) => found[k] !== DIGITAL_PRICES[k] && found[k] !== PHYSICAL_PRICES[k])
        .map((k) => `${k} ${found[k]}, not ${DIGITAL_PRICES[k]} or ${PHYSICAL_PRICES[k]}`);
      problems.push(`${rel}:${line} prices packages differently from api/_catalogue.js: ${wrong.join('; ')}.`);
    }
  }

  // Shape 2: the object-per-package form cart.js and checkout.html use.
  for (const m of src.matchAll(/(\w+)\s*:\s*\{[^{}]*?digitalPrice:\s*(\d+),\s*physicalPrice:\s*(\d+)/g)) {
    const [, key, d, p] = m;
    if (!KEYS.includes(key)) continue;
    tables++;
    if (Number(d) !== DIGITAL_PRICES[key] || Number(p) !== PHYSICAL_PRICES[key]) {
      const line = src.slice(0, m.index).split('\n').length;
      problems.push(
        `${rel}:${line} prices ${key} at ${d} digital and ${p} physical; `
        + `api/_catalogue.js says ${DIGITAL_PRICES[key]} and ${PHYSICAL_PRICES[key]}.`);
    }
  }
}

if (tables < 6) {
  problems.push(`only found ${tables} package price tables; there were 10 when this was written, so the scan has gone blind.`);
}

if (problems.length) {
  console.error('[check-package-prices] a package costs different amounts in different files:\n');
  for (const p of problems) console.error('  ' + p);
  console.error('\napi/_catalogue.js is the one that is right. A static page that cannot import it');
  console.error('has to be edited to match, in the same commit.');
  process.exit(1);
}

console.log(`[check-package-prices] ${tables} package price tables, all agreeing with api/_catalogue.js.`);
