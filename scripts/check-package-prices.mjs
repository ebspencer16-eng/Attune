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
 * ── AND ADD-ON PRICES, WHICH IT USED TO LEAVE OUT ─────────────────────────
 * This file used to say add-on prices were "already one table in
 * api/_catalogue.js for the server". They are not: api/calculate-tax.js keeps
 * its own, and public/cart.js keeps a third.
 *
 * Planted against: moving the Relationship Reflection add-on from 40 to 45 in
 * api/calculate-tax.js alone — the endpoint that works out the tax a customer
 * reads at checkout — passed this gate, check-checkout-pricing and
 * check-prices-on-page. The page would have shown tax on a base five dollars
 * too high, which is the bug this file exists for, in the add-on column.
 *
 * So the same scan runs over add-on tables. The package list and the add-on
 * list are two shapes of one promise, which is why they are here together
 * rather than in a second file that would drift from this one.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 *
 * The synthetic orders in admin.html's generateOrders(), which invents names,
 * addresses and prices for a demo with no database behind it. Its prices are
 * from an older price list and they are as fictional as the customers.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const { DIGITAL_PRICES, PHYSICAL_PRICES, ADDON_PRICES } = await import(`${ROOT}api/_catalogue.js`);

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

/**
 * ── THE ADD-ON TABLES ─────────────────────────────────────────────────────
 * Any object that names at least three add-ons and gives each a number is an
 * add-on price table, whoever wrote it. Three is enough to be unmistakable and
 * low enough to catch a partial copy, which is the kind that drifts.
 */
const ADDON_KEYS = Object.keys(ADDON_PRICES);
let addonTables = 0;
for (const rel of ['api', 'public', 'src', 'attune-app/src'].flatMap((d) => files(d))) {
  if (rel === 'api/_catalogue.js') continue;
  const src = readFileSync(join(ROOT, rel), 'utf8');
  for (const m of src.matchAll(/\{[^{}]*\}/g)) {
    const got = {};
    for (const k of ADDON_KEYS) {
      const f = new RegExp(`['"]?${k}['"]?\\s*:\\s*(\\d+)`).exec(m[0]);
      if (f) got[k] = Number(f[1]);
    }
    const named = Object.keys(got);
    if (named.length < 3) continue;
    /* Every value the same is a counter, not a price list: no three add-ons
       here cost the same. The package scan skips those for the same reason. */
    if (new Set(Object.values(got)).size === 1) continue;
    addonTables += 1;
    const wrong = named.filter((k) => got[k] !== ADDON_PRICES[k]);
    if (wrong.length) {
      const line = src.slice(0, m.index).split('\n').length;
      problems.push(`${rel}:${line} prices add-ons differently from api/_catalogue.js: `
        + wrong.map((k) => `${k} ${got[k]}, not ${ADDON_PRICES[k]}`).join('; ') + '.');
    }
  }
}
/**
 * ── ONE IS NOW THE RIGHT NUMBER, AND THAT IS A CHANGE WORTH RECORDING ─────
 * This read `< 2` and named api/calculate-tax.js and public/cart.js as the two
 * copies it expected to find. calculate-tax.js no longer has one: it imports
 * ADDON_PRICES from the catalogue and its pricing from _lib/cart-pricing.js,
 * because its copy had the add-on table right and the WORKBOOK RULE wrong, and
 * this gate only ever compared tables. Premium includes the workbook, so a
 * premium cart was taxed on 19 to 39 dollars more than it was charged.
 *
 * public/cart.js is a static file with no build step and genuinely cannot
 * import the catalogue, so its copy stays and this is what holds it. Zero means
 * the scan has stopped finding it rather than that the copy is gone.
 */
if (addonTables < 1) {
  problems.push(`found no add-on price tables outside the catalogue; public/cart.js is a static`
    + ' file that cannot import it and therefore keeps one, so the scan has gone blind.');
}

if (problems.length) {
  console.error('[check-package-prices] a package costs different amounts in different files:\n');
  for (const p of problems) console.error('  ' + p);
  console.error('\napi/_catalogue.js is the one that is right. A static page that cannot import it');
  console.error('has to be edited to match, in the same commit.');
  process.exit(1);
}

console.log(`[check-package-prices] ${tables} package price tables and ${addonTables} add-on`
  + ' price tables, all agreeing with api/_catalogue.js.');
