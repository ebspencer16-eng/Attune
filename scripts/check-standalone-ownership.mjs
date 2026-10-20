#!/usr/bin/env node
/**
 * A single exercise is only sold to an account that owns the core.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Ellie: "I want users to be able to buy a standalone exercise but only if
 * they already own the base exercises." And on the price: "Confirmed that the
 * exercise exercises are the same price as listed on the website for those
 * users."
 *
 * Two things to hold, and they fail in opposite directions.
 *
 * ── 1. THE PRICE ──────────────────────────────────────────────────────────
 * A cart line with no package is priced by the add-ons alone. Run, not read:
 * every add-on on its own has to cost what api/_catalogue.js says it costs,
 * and the line's base has to be nought.
 *
 * The failure this guards is specific and has happened here before in another
 * form. Every package lookup on the checkout page used to read
 * `PACKAGES[it.pkg] || PACKAGES.core`, and a line with no package would have
 * taken that fallback and been billed the $89 base on top of a $40 exercise.
 * Quoted one number, charged another, which is the 198/295 bug wearing a new
 * hat. So this also asserts the page tells "no package" apart from "a package
 * id I do not recognise": the first is nought, the second is still core.
 *
 * ── 2. THE RULE ───────────────────────────────────────────────────────────
 * The check belongs on the server. api/create-payment-intent must ask whether
 * the buyer owns the core before it sells a package-less cart, and must refuse
 * on both a "no" and a failed read. The checkout page asks the same question
 * first, which is a courtesy to the buyer and skippable by anybody posting
 * straight to the endpoint, so the page's copy is not what is being trusted.
 *
 * Both callers go through ownsCoreFor, so this also fails if either grows
 * its own second answer to "does this account own the core".
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the lookup is RIGHT. That is a database question: an invited
 * partner, a comp account, a buyer with no profile yet. It is exercised
 * against the real data by hand, and the module's header records which three
 * cases count. This gate is about the price and about the rule being asked at
 * all.
 */

import { readFileSync } from 'node:fs';
import { ADDON_PRICES } from '../api/_catalogue.js';
import { itemBasePrice, itemAddonTotal, itemSubtotal, normalizeItem } from '../api/_lib/cart-pricing.js';
import { isStandaloneCart } from '../api/_lib/owns-core.js';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

// ── 1. The price, run ───────────────────────────────────────────────────────
/**
 * Each add-on, alone, with no package, against a number typed here.
 *
 * ── THE FIRST VERSION OF THIS WAS VACUOUS ─────────────────────────────────
 * It read the expected price out of ADDON_PRICES, which is the same constant
 * itemAddonTotal reads, and then asserted the two agreed. They always will.
 * Changing a price moves both sides together and the gate goes on passing,
 * which is this codebase's own recorded lesson about check-feedback-mirror and
 * about check-alignment-rule, written into a gate by the person who wrote the
 * lesson down. The comment here even claimed the opposite.
 *
 * So the numbers are the product's promise, confirmed by Ellie: "physical
 * intimacy should only be $20 but the others should be 40". Moving a price now
 * has to be done in both places, which makes it a decision rather than an
 * edit, and the catalogue is still checked against itself below so a typo here
 * cannot quietly redefine what is charged.
 */
const ALONE = [
  ['addonConflict', 40],
  ['addonIntimacy', 20],
  ['addonReflection', 40],
  ['addonBudget', 20],
  ['addonChecklist', 20],
];

/* And the catalogue has to agree with those, so this file cannot drift into
   being a second price list. If these two disagree, one of them moved and the
   message says which. */
const CATALOGUE_KEY = { addonConflict: 'conflict', addonIntimacy: 'intimacy', addonReflection: 'reflection', addonBudget: 'budget', addonChecklist: 'checklist' };
for (const [flag, promised] of ALONE) {
  const inCatalogue = ADDON_PRICES[CATALOGUE_KEY[flag]];
  if (inCatalogue !== promised) {
    fails.push(`${CATALOGUE_KEY[flag]} costs ${inCatalogue} in api/_catalogue.js and this gate was told ${promised}. If the price moved on purpose, move it here too; if it did not, the catalogue is wrong.`);
  }
}
for (const [flag, price] of ALONE) {
  const it = normalizeItem({ [flag]: true });
  if (itemBasePrice(it) !== 0) {
    fails.push(`${flag} on its own has a base price of ${itemBasePrice(it)}; a cart with no package in it bases at nought.`);
  }
  if (itemSubtotal(it) !== price) {
    fails.push(`${flag} on its own costs ${itemSubtotal(it)} and the catalogue says ${price}.`);
  }
}
/* Two together, so the total is the sum and not the first one found. */
const pair = normalizeItem({ addonConflict: true, addonIntimacy: true });
if (itemSubtotal(pair) !== 60) {
  fails.push(`conflict and intimacy together cost ${itemSubtotal(pair)}, not 60.`);
}
if (itemAddonTotal(normalizeItem({})) !== 0) {
  fails.push('an item with no package and no add-ons costs something, which is nothing to sell.');
}

// ── What counts as a standalone cart ────────────────────────────────────────
if (!isStandaloneCart([{ addonConflict: true }])) fails.push('a lone add-on is not recognised as a standalone cart.');
if (isStandaloneCart([{ pkgKey: 'core' }])) fails.push('a package order is being treated as standalone, so it would demand an ownership check.');
if (isStandaloneCart([{ pkgKey: 'core' }, {}])) fails.push('a cart with a package in it reads as standalone.');
if (isStandaloneCart([])) fails.push('an empty cart reads as standalone.');

// ── 2. The rule, structurally, on both surfaces ─────────────────────────────
/**
 * Comments blanked before any of this is matched.
 *
 * The first run of this gate failed on its own subject's explanation: the
 * resolver in checkout.html quotes `PACKAGES[it.pkg] || PACKAGES.core` in the
 * comment saying why that fallback was wrong, and the scan read the sentence
 * as the code. CLAUDE.md records the same thing happening to check-style-codes
 * and calls it punishing a file for saying what went wrong.
 */
const decomment = (src) => src
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const api = decomment(readFileSync(`${ROOT}api/create-payment-intent.js`, 'utf8'));
const page = decomment(readFileSync(`${ROOT}public/checkout.html`, 'utf8'));

if (!/ownsCoreFor\s*\(/.test(api)) {
  fails.push('api/create-payment-intent.js does not ask ownsCoreFor, so the rule only exists in the browser and anybody posting straight to it buys an exercise they cannot open.');
}
if (!/isStandaloneCart\s*\(/.test(api)) {
  fails.push('api/create-payment-intent.js no longer works out whether the cart is standalone, so it cannot know when to ask.');
}
/* The guard's CONDITION, not its contents. `if (false && standalone)` leaves
   the call, both refusals and every identifier exactly where they were, so
   each test above still passed while nothing was being checked. A guard is
   judged by what it compares. */
if (!/\n\s*if\s*\(standalone\)\s*\{/.test(api)) {
  fails.push('the ownership check is not guarded by `if (standalone)` alone, so something else decides whether it runs.');
}
/* The refusals, by what they compare rather than by their presence. A guard
   disabled with a constant leaves every string and every identifier exactly
   where it was, which is how five gates here have been defeated before. */
if (!/if\s*\(\s*!read\.ok\s*\)/.test(api)) {
  fails.push('a failed ownership read is not refused in create-payment-intent. "We could not check" is not "they own it".');
}
if (!/if\s*\(\s*!read\.ownsCore\s*\)/.test(api)) {
  fails.push('create-payment-intent does not refuse an account that does not own the core.');
}
/* With the closing quote. `/api/verify-core` on its own is satisfied by
   `/api/verify-core-DISABLED`, which is this codebase's own recorded lesson
   about matching a name instead of what follows it, and it walked through the
   first time this gate was planted against. */
if (!/['"]\/api\/verify-core['"]/.test(page)) {
  fails.push('public/checkout.html never asks /api/verify-core, so a buyer only finds out after the card.');
}
/* The page must tell the two failures apart. Saying "you do not own this" when
   the truth is "we could not check" accuses a paying customer of not paying. */
if (!/owns\s*===\s*false/.test(page)) {
  fails.push('checkout.html does not separate a "no" from a failed check, so one message is used for both.');
}
/* And the resolver, RUN rather than matched.
   Reading it cannot see the version that matters: `if (!key) return
   PACKAGES.core;` is a one-word edit that prices every lone exercise at the
   $89 base, and it leaves the old forbidden pattern absent and the function's
   name intact. So the real function is lifted out of the page and given a
   stub table with prices this file chose, which is the only way to tell what
   it ANSWERS from what it says. */
{
  const at = page.indexOf('const STANDALONE_PKG = {');
  const fnAt = page.indexOf('function pkgFor(key) {', at);
  if (at < 0 || fnAt < 0) {
    fails.push('cannot find STANDALONE_PKG and pkgFor in checkout.html. Refusing to pass: a gate that has lost its subject must never report success.');
  } else {
    const end = page.indexOf('\n}', fnAt) + 2;
    const src = page.slice(at, end);
    const make = new Function('PACKAGES', `${src}; return pkgFor;`);
    const STUB = { core: { digitalPrice: 89, physicalPrice: 124 }, premium: { digitalPrice: 198, physicalPrice: 233 } };
    const pkgFor = make(STUB);
    for (const empty of [null, undefined, '', 0]) {
      const got = pkgFor(empty);
      if (got.digitalPrice !== 0 || got.physicalPrice !== 0) {
        fails.push(`a cart line with no package resolves to a base price of ${got.digitalPrice}/${got.physicalPrice}, so a lone exercise is billed a package on top of itself.`);
        break;
      }
    }
    if (pkgFor('premium') !== STUB.premium) fails.push('a real package key no longer resolves to its own package.');
    if (pkgFor('nonsense') !== STUB.core) fails.push('an unrecognised package key no longer falls back to core, which is a different promise from the one above and still wanted.');
  }
}

if (fails.length) {
  console.error('check-standalone-ownership: FAIL');
  for (const f of fails) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`check-standalone-ownership: ok. ${ALONE.length} add-ons priced alone against the catalogue, 4 cart shapes classified, the resolver run on 6 keys, and the rule asked on the server as well as the page.`);
