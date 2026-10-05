#!/usr/bin/env node
/**
 * A promo code that bundles an add-on free does not then charge for it.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * api/create-payment-intent.js works out what a cart costs in three places,
 * and each one knows about a different subset of the five "this add-on is
 * bundled free" flags:
 *
 *   addonsTotal       all five: workbook, intimacy, reflection, budget,
 *                     checklist. It decides whether the order is free.
 *   subtotalDollars   the workbook only. It is the quoted subtotal and the
 *                     fallback charge.
 *   itemsTotalCents   none of them. It is the total whenever the Stripe tax
 *                     call is skipped or fails, and line 689 charges
 *                     `taxResult.totalAmount` in preference to the subtotal.
 *
 * So a beta code that bundles, say, Relationship Reflection free routes through
 * the no-charge path only while the cart holds nothing else. Add one paid
 * add-on and `addonsTotal` is no longer zero, the order goes to the charged
 * path, and the bundled add-on is billed: quoted for it by one copy and charged
 * for it by another.
 *
 * It is the same shape as the bug CLAUDE.md records about this very file —
 * premium priced at 198 in one endpoint and 295 in another — one level down,
 * between three functions in one module.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * The real functions, lifted out of the file and run: for every combination of
 * bundled-free add-ons and paid add-ons, the three answers agree, and nothing
 * marked free is paid for.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Stripe. When the tax call succeeds, `data.amount_total` is Stripe's own
 * figure computed from the line items, and that path is not reachable from
 * here. The line items are built from the same per-item helpers, so this covers
 * the arithmetic they share; it does not prove Stripe was told the same thing.
 */

import { readFileSync } from 'node:fs';

import { ADDON_PRICES, DIGITAL_PRICES, PHYSICAL_PRICES } from '../api/_catalogue.js';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = 'api/create-payment-intent.js';
const src = readFileSync(`${ROOT}${SRC}`, 'utf8');
const fails = [];

/** A top-level `function name(...) { ... }`, by brace depth. */
function lift(name) {
  const at = src.indexOf(`function ${name}(`);
  if (at === -1) return null;
  let depth = 0;
  for (let i = src.indexOf('{', at); i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(at, i + 1);
    }
  }
  return null;
}

/** `const name = items.reduce((...) => { ... }, 0);`, wrapped as a function. */
function liftReduce(name) {
  const at = src.indexOf(`const ${name} = items.reduce(`);
  if (at === -1) return null;
  let depth = 0;
  for (let i = src.indexOf('(', at); i < src.length; i += 1) {
    if (src[i] === '(') depth += 1;
    else if (src[i] === ')') {
      depth -= 1;
      if (depth === 0) {
        const body = src.slice(src.indexOf('items.reduce', at), i + 1);
        return `function ${name}(items) { return ${body}; }`;
      }
    }
  }
  return null;
}

const parts = {
  itemBasePrice: lift('itemBasePrice'),
  wbAmount: lift('wbAmount'),
  itemAddonTotal: lift('itemAddonTotal'),
  itemSubtotal: lift('itemSubtotal'),
  /* The two the three totals are now built from. If either stops existing the
     file has gone back to computing the same thing in several places, and this
     says so rather than quietly lifting whatever is left. */
  billableAddons: lift('billableAddons'),
  itemChargeDollars: lift('itemChargeDollars'),
  itemsTotalCents: lift('itemsTotalCents'),
  buildTaxLineItems: lift('buildTaxLineItems'),
  addonsTotal: liftReduce('addonsTotal'),
  subtotalDollars: liftReduce('subtotalDollars'),
};
const missing = Object.keys(parts).filter((k) => !parts[k]);
if (missing.length) {
  console.error(`[check-promo-totals] could not lift ${missing.join(', ')} out of ${SRC}.`
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

const make = new Function(
  'ADDON_PRICES', 'DIGITAL_PRICES', 'PHYSICAL_PRICES', 'PHYSICAL_ENABLED', 'TAX_CODES',
  `${Object.values(parts).join('\n')}
   return { itemsTotalCents, addonsTotal, subtotalDollars, itemAddonTotal, itemSubtotal,
            buildTaxLineItems, billableAddons, itemChargeDollars };`,
);
/* The tax codes are Stripe's product categories and have no bearing on an
   amount, so any string will do; what is checked is what the lines add up to. */
const M = make(ADDON_PRICES, DIGITAL_PRICES, PHYSICAL_PRICES, true,
  new Proxy({}, { get: () => 'txcd_test' }));

/**
 * The five add-ons a code can bundle, and the flag that marks each one free.
 *
 * Read out of the file rather than typed, so a sixth bundled add-on is covered
 * the day it is added. That is how this bug happened: a flag was added to the
 * routing total and not to the two that charge.
 */
const FREE_FLAGS = [...new Set(
  [...src.matchAll(/it\._promo(\w+?)Free\s*=\s*true/g)].map((m) => m[1]),
)];
if (FREE_FLAGS.length < 3) {
  console.error(`[check-promo-totals] found ${FREE_FLAGS.length} bundled-free add-ons in ${SRC},`
    + ' which cannot be right.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

/** What each flag's add-on is called on the item, and what it costs. */
const ADDON_OF = {
  Workbook: { set: (it) => { it.addonWorkbook = 'digital'; }, price: ADDON_PRICES.workbookDigital },
  Intimacy: { set: (it) => { it.addonIntimacy = true; }, price: ADDON_PRICES.intimacy },
  Reflection: { set: (it) => { it.addonReflection = true; }, price: ADDON_PRICES.reflection },
  Budget: { set: (it) => { it.addonBudget = true; }, price: ADDON_PRICES.budget },
  Checklist: { set: (it) => { it.addonChecklist = true; }, price: ADDON_PRICES.checklist },
};
const unknown = FREE_FLAGS.filter((f) => !ADDON_OF[f]);
if (unknown.length) {
  console.error(`[check-promo-totals] ${SRC} marks ${unknown.join(', ')} free and this does not`
    + ' know what that add-on is called on an item. Add it to ADDON_OF with its price.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

/**
 * A cart: a package, one add-on bundled free by the code, and one the customer
 * paid for, so `addonsTotal` is not zero and the order takes the charged path.
 */
for (const free of FREE_FLAGS) {
  for (const paid of ['Conflict', null]) {
    const it = { pkgKey: 'core', isPhysical: false };
    ADDON_OF[free].set(it);
    it[`_promo${free}Free`] = true;
    it._promoCoveredBase = true;
    it._promoMode = 'free';
    if (paid) it.addonConflict = true;

    const items = [it];
    const routing = M.addonsTotal(items);
    const quoted = M.subtotalDollars(items);
    const charged = M.itemsTotalCents(items, true) / 100;
    const owed = paid ? ADDON_PRICES.conflict : 0;
    const label = `${free} bundled free${paid ? ' + a paid Conflict add-on' : ' alone'}`;

    if (routing !== owed) {
      fails.push(`${label}: the free-order test makes it $${routing}, and $${owed} is owed.`);
    }
    if (quoted !== owed) {
      fails.push(`${label}: the quoted subtotal is $${quoted}, and $${owed} is owed.\n`
        + `      subtotalDollars does not subtract a bundled ${free}, so the customer is quoted`
        + ` $${quoted - owed} for something the code gave them.`);
    }
    if (charged !== owed) {
      fails.push(`${label}: the charged total is $${charged}, and $${owed} is owed.\n`
        + '      itemsTotalCents is what line 689 charges whenever the tax call is skipped or\n'
        + `      fails, and it subtracts no bundled add-on at all: $${charged - owed} too much.`);
    }
    if (quoted !== charged) {
      fails.push(`${label}: quoted $${quoted} and charged $${charged}. One cart, two answers.`);
    }

    /**
     * ── AND THE LINES STRIPE PRICES ADD UP TO THE SAME THING ──────────────
     * buildTaxLineItems is what goes to Stripe, and Stripe's `amount_total`
     * comes back and is charged ahead of every total worked out here. So the
     * lines are the real invoice; a total that disagrees with them is a
     * quote the customer does not pay.
     *
     * This is the assertion that would have caught the original bug in this
     * file, where the tax was computed on a base a hundred dollars too high.
     * It caught two more: four add-ons stayed on the invoice after a code gave
     * them away, and Conflict Patterns had no line at all while the subtotal
     * charged forty dollars for it, so Stripe's total came back forty short.
     *
     * The package line is dropped for a covered base, which is what
     * calculateTaxWithStripe does to these lines before sending them.
     */
    const lines = M.buildTaxLineItems(it, 0);
    const addonLines = lines
      .filter((l) => !String(l.reference).endsWith('-pkg'))
      .reduce((sum, l) => sum + l.amount, 0) / 100;
    if (addonLines !== M.billableAddons(it)) {
      fails.push(`${label}: the add-on lines sent to Stripe come to $${addonLines} and the cart`
        + ` says $${M.billableAddons(it)} is owed for add-ons.\n`
        + '      Stripe prices the lines and its amount_total is what gets charged, so the lines\n'
        + '      are the invoice. Anything the cart counts and the lines do not is money never\n'
        + '      taken; anything the lines carry and the cart does not is money taken twice.');
    }
  }
}

/**
 * An ordinary cart, every add-on paid for, no promo code.
 *
 * The lines Stripe prices have to come to the same figure the cart charges.
 * Without this the per-add-on cases above never price a paid Budget line,
 * because the only Budget in them is the one a code gave away and is therefore
 * absent: a line with the wrong amount on it passed unseen.
 */
{
  const it = {
    pkgKey: 'premium', isPhysical: false, addonWorkbook: 'digital',
    addonReflection: true, addonBudget: true, addonChecklist: true,
    addonIntimacy: true, addonConflict: true,
  };
  const lines = M.buildTaxLineItems(it, 0);
  const total = lines.reduce((sum, l) => sum + l.amount, 0) / 100;
  if (total !== M.itemSubtotal(it)) {
    fails.push(`a full cart with no promo: the lines sent to Stripe come to $${total} and the cart`
      + ` charges $${M.itemSubtotal(it)}.\n`
      + '      Every line is priced from ADDON_PRICES and so is the cart, so a difference here is'
      + '\n      a line with the wrong amount, a missing line, or one counted twice.');
  }
  const addonLines = lines.filter((l) => !String(l.reference).endsWith('-pkg'))
    .reduce((sum, l) => sum + l.amount, 0) / 100;
  if (addonLines !== M.itemAddonTotal(it)) {
    fails.push(`a full cart with no promo: the add-on lines come to $${addonLines} and`
      + ` itemAddonTotal says $${M.itemAddonTotal(it)}.`);
  }
}

/**
 * Every add-on the cart charges for has a line, promos aside.
 *
 * Conflict Patterns was in itemAddonTotal and in no tax line, which is how the
 * quote and the invoice came to differ by forty dollars on an ordinary order
 * with no promo code at all.
 */
{
  const named = [...src.matchAll(/if \(item\.addon(\w+)\)\s+addons \+= ADDON_PRICES/g)]
    .map((m) => m[1]);
  const plain = { pkgKey: 'core', isPhysical: false };
  for (const a of named) {
    const it = { ...plain };
    if (a === 'Workbook') it.addonWorkbook = 'digital'; else it[`addon${a}`] = true;
    const lines = M.buildTaxLineItems(it, 0)
      .filter((l) => !String(l.reference).endsWith('-pkg'));
    if (!lines.length) {
      fails.push(`an order with the ${a} add-on and nothing else is charged for it by`
        + ' itemAddonTotal and sent to Stripe as no line at all, so the invoice is short by its'
        + ' price.');
    }
  }
}

if (fails.length) {
  console.error('\n check-promo-totals: a bundled-free add-on is still being paid for.\n');
  for (const f of [...new Set(fails)]) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-promo-totals] ${FREE_FLAGS.length} add-ons a code can bundle free, each with`
  + ' and without a paid add-on beside it: the routing total, the quoted subtotal and the charged'
  + ' total all agree, and nothing given away is billed.');
