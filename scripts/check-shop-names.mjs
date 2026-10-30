#!/usr/bin/env node
/**
 * check-shop-names: everything is called the same thing wherever it is sold.
 *
 * Ellie, A204d: "change the reciept to match the site and the email so that
 * everything is consistent." The receipt said "Shared Budgeting Activity"
 * where the shop said "Build a Budget". api/_catalogue.js holds SHOP_NAMES
 * and PACKAGE_NAMES; checkout reads SHOP_NAMES through /_pkg-rules.js and the
 * confirmation email reads both. Two pages still type them out, because they
 * are static and their tiles carry descriptions beside each name, so this
 * holds those copies to the source:
 *   - public/offerings.html, the shop, `key:'x', name:'Y'` for every add-on;
 *   - public/checkout.html, `id: 'x', name: 'Y'` for every package.
 * Any key it cannot find fails, rather than counting as agreement.
 *
 * Planted: a shop tile renamed, and a package renamed on checkout. Both fail.
 */
import { readFileSync } from 'node:fs';
import { SHOP_NAMES, PACKAGE_NAMES } from '../api/_catalogue.js';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];
const shop = readFileSync(`${ROOT}public/offerings.html`, 'utf8');
for (const [key, want] of Object.entries(SHOP_NAMES)) {
  const m = new RegExp(`key:\\s*'${key}'\\s*,\\s*name:\\s*'([^']+)'`).exec(shop);
  if (!m) fails.push(`the shop has no tile with key '${key}', so its name cannot be compared`);
  else if (m[1].trim() !== want) fails.push(`the shop calls ${key} "${m[1].trim()}"; SHOP_NAMES says "${want}"`);
}
const checkout = readFileSync(`${ROOT}public/checkout.html`, 'utf8');
for (const [key, want] of Object.entries(PACKAGE_NAMES)) {
  const m = new RegExp(`id:\\s*'${key}'\\s*,\\s*name:\\s*'([^']+)'`).exec(checkout);
  if (!m) fails.push(`checkout has no package '${key}', so its name cannot be compared`);
  else if (m[1] !== want) fails.push(`checkout calls ${key} "${m[1]}"; PACKAGE_NAMES says "${want}"`);
}
if (fails.length) {
  console.error('[check-shop-names] ' + fails.length + ' problem(s):');
  for (const x of fails) console.error('  ' + x);
  process.exit(1);
}
console.log(`[check-shop-names] ${Object.keys(SHOP_NAMES).length} add-ons on the shop and ${Object.keys(PACKAGE_NAMES).length} packages on checkout carry the names the receipt and the email use.`);
