#!/usr/bin/env node
/**
 * There is one answer to what a cart costs, and it is _lib/cart-pricing.js.
 *
 * ── THE BUG, TWICE ────────────────────────────────────────────────────────
 * api/create-payment-intent.js and api/calculate-tax.js each priced the cart.
 * The first time that cost a hundred dollars: the payment endpoint priced
 * premium at 198 and the tax endpoint at 295, and because checkout.html reads
 * only the tax figure back, the subtotal stayed right while the tax beside it
 * was computed on a base a hundred dollars too high. check-package-prices came
 * out of that and holds every PACKAGE price table to the catalogue.
 *
 * It happened again anyway, because a price table is not the only thing that
 * can differ. calculate-tax.js kept its own ADDON_PRICES under a comment
 * reading "Mirrors create-payment-intent.js — keep in sync", which is this
 * codebase's failure mode written down as an instruction; the values agreed, so
 * the table check passed. What differed was the RULE. Premium includes the
 * workbook, so create-payment-intent charges nothing for it and asks $20 only
 * when a digital premium upgrades to print. calculate-tax charged the full 19
 * or 39 for every package.
 *
 * Measured over every cart shape, four of them taxed a premium customer on 19
 * to 39 dollars more than they were charged, and sent Stripe a workbook line
 * the payment intent does not bill. The invariant that catches a whole family
 * of these is in CLAUDE.md: the lines sent to the processor add up to what the
 * cart says is owed.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * That no file under api/ other than the pricer works out a base price, a
 * workbook charge or an add-on total of its own. By what the code DOES, not by
 * the names it uses, because the second person to write this will not call it
 * `wbAmount`: a function that reaches into DIGITAL_PRICES or PHYSICAL_PRICES by
 * package key, or that adds up ADDON_PRICES fields, is a second pricer whatever
 * it is called.
 *
 * And that both endpoints import the shared one and call it, because a module
 * that exists and is not called is a constant that happens to be declared.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * public/cart.js and public/checkout.html, which are static files with no build
 * step and genuinely cannot import anything. Their copies are held to the
 * catalogue by check-package-prices and to each other by check-checkout-pricing.
 * Naming that here so nobody reads this as "there is one pricer anywhere".
 *
 * And whether the prices are right, which is the catalogue's business, and
 * whether a promo gives the right thing away, which is check-promo-totals.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const PRICER = 'api/_lib/cart-pricing.js';
const CALLERS = ['api/create-payment-intent.js', 'api/calculate-tax.js'];
const fails = [];

/* A gate that has lost its subject must never report success. */
{
  const src = readFileSync(join(ROOT, PRICER), 'utf8');
  const wanted = ['itemBasePrice', 'workbookAmount', 'itemAddonTotal', 'itemSubtotal'];
  const absent = wanted.filter((n) => !new RegExp(`export function ${n}\\b`).test(src));
  if (absent.length) {
    console.error(`[check-one-cart-price] ${PRICER} no longer exports ${absent.join(', ')}.`
      + ' Refusing to pass.');
    process.exit(1);
  }
  if (!/pkgKey === 'premium'/.test(src)) {
    console.error(`[check-one-cart-price] ${PRICER} no longer carries the premium workbook rule,`
      + ' which is the thing the two endpoints disagreed about. Refusing to pass.');
    process.exit(1);
  }
}

function files(dir, out = []) {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) {
      if (/node_modules|\.expo|dist/.test(name)) continue;
      files(rel, out);
      continue;
    }
    if (/\.(js|mjs)$/.test(name)) out.push(rel);
  }
  return out;
}

/** A function body, by brace depth, so the test runs on the body alone. */
function bodies(src) {
  const out = [];
  for (const m of src.matchAll(/function\s+(\w+)\s*\([^)]*\)\s*\{/g)) {
    let i = src.indexOf('{', m.index);
    let depth = 0;
    for (; i < src.length && i < m.index + 3000; i += 1) {
      if (src[i] === '{') depth += 1;
      else if (src[i] === '}') {
        depth -= 1;
        if (depth === 0) { out.push({ name: m[1], at: m.index, body: src.slice(m.index, i + 1) }); break; }
      }
    }
  }
  return out;
}

const lineOf = (src, i) => src.slice(0, i).split('\n').length;
let scanned = 0;

/**
 * What a file calls the pricer's exports.
 *
 * `import { itemBasePrice as b }` is the same call under another name, and the
 * second person to re-add a subtotal will not keep the names. Returns a map
 * from the pricer's export to whatever this file calls it, so the scan below
 * matches on what the code does rather than on a spelling.
 */
function aliases(src) {
  const m = src.match(/import\s*\{([^}]*)\}\s*from\s*['"][^'"]*cart-pricing\.js['"]/);
  const out = {};
  if (!m) return out;
  for (const part of m[1].split(',')) {
    const [orig, local] = part.trim().split(/\s+as\s+/).map((x) => x && x.trim());
    if (orig) out[orig] = local || orig;
  }
  return out;
}

for (const rel of files('api')) {
  if (rel === PRICER) continue;
  scanned += 1;
  const src = readFileSync(join(ROOT, rel), 'utf8');
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));

  const alias = aliases(stripped);
  for (const { name, at, body } of bodies(stripped)) {
    /**
     * A subtotal assembled out of the pricer's own parts.
     *
     * `base + add-ons` is one line, which is how this one outlived the move
     * that took the other three out of create-payment-intent.js: nobody counts
     * a line as a copy. It agreed with the library's, so nothing could see it,
     * and a term added to the library's subtotal would simply not have reached
     * the endpoint that takes the money.
     *
     * Matched on the two calls rather than on the shape of the sum, so
     * hoisting either half into a variable first does not get past it, and
     * under whatever names this file imported them as.
     */
    {
      const base = alias.itemBasePrice;
      const add = alias.itemAddonTotal;
      /**
       * Without the header. The first version tested the whole slice, which
       * starts at `function itemSubtotal(`, so a function that rebuilt the
       * subtotal excused itself by being called itemSubtotal and all three
       * plants walked past. Matching a name rather than what follows it, in
       * the gate written to stop exactly that.
       */
      const inner = body.slice(body.indexOf('{'));
      const calls = (n) => n && new RegExp(`\\b${n}\\s*\\(`).test(inner);
      if (calls(base) && calls(add) && !/\bitemSubtotal\s*\(/.test(inner)) {
        fails.push(`${rel}:${lineOf(stripped, at)} \`${name}\` adds a base price to an add-on`
          + ` total, which is itemSubtotal in ${PRICER}.`
          + '\n      Call it rather than rebuilding it: a term added there would never have'
          + '\n      reached this file, and this file is the one that charges the card.');
      }
    }
    /* A base price: either price table indexed by a package key. */
    if (/(DIGITAL_PRICES|PHYSICAL_PRICES)\s*\[/.test(body)) {
      fails.push(`${rel}:${lineOf(stripped, at)} \`${name}\` prices a package itself.`
        + `\n      itemBasePrice in ${PRICER} does that, and the last time two files did it`
        + '\n      the two answers were a hundred dollars apart.');
    }
    /* An add-on total: ADDON_PRICES added UP inside a function that did not
       start from the shared one.
       `+=` and not `-=`, because the first version of this flagged
       `billableAddons`, which starts from itemAddonTotal and subtracts what a
       promo gives away. That is the promo layer and it is exactly right. A gate
       that matches too much is not the safe direction: it gets loosened until
       it matches nothing, or it manufactures the finding it was meant to look
       for. Two reads rather than one, because one read is a line item and two
       is a total being assembled. */
    const reads = (body.match(/ADDON_PRICES\.\w+/g) || []).length;
    const buildsUp = /\+=\s*ADDON_PRICES/.test(body);
    const startsFromShared = /itemAddonTotal\s*\(/.test(body);
    if (reads >= 2 && buildsUp && !startsFromShared) {
      fails.push(`${rel}:${lineOf(stripped, at)} \`${name}\` adds up add-on prices itself.`
        + `\n      itemAddonTotal in ${PRICER} does that, and it is where the workbook rule lives:`
        + '\n      premium includes the workbook, which the copy in calculate-tax.js did not know.');
    }
  }
}

/* And both endpoints read it, rather than merely importing it. */
for (const rel of CALLERS) {
  const src = readFileSync(join(ROOT, rel), 'utf8');
  if (!/from '\.\.?\/(_lib\/)?cart-pricing\.js'/.test(src) && !/cart-pricing\.js/.test(src)) {
    fails.push(`${rel} does not import ${PRICER}.`);
    continue;
  }
  for (const fn of ['itemBasePrice', 'itemAddonTotal']) {
    if (!new RegExp(`\\b${fn}\\(`).test(src)) {
      fails.push(`${rel} imports the shared pricer and never calls ${fn}.`
        + '\n      A module imported and not called is a constant that happens to be declared;'
        + '\n      the price is coming from somewhere else and nothing here can see where.');
    }
  }
  /* The workbook rule reaches the tax lines too, which is the half that sent
     Stripe a charge the payment intent never makes. */
  if (!/workbookAmount\s*(as\s+\w+\s*)?[,}]/.test(src) && !/\bwbAmount\(|workbookAmount\(/.test(src)) {
    fails.push(`${rel} never asks what the workbook is billed at.`
      + '\n      Premium includes it, so using its list price taxes a customer on money they are'
      + '\n      not charged and sends the processor a line the charge does not contain.');
  }
}

if (fails.length) {
  console.error('[check-one-cart-price] A cart is priced in more than one place:');
  for (const f of fails) console.error(`  ${f}`);
  console.error('');
  console.error(`One pricer: ${PRICER}, which both endpoints import.`);
  process.exit(1);
}

console.log(`[check-one-cart-price] ${scanned} files under api/; one cart pricer, and both the`
  + ' payment and the tax endpoint price a cart through it, workbook rule included, with nothing'
  + ' rebuilding a subtotal out of its parts.');
