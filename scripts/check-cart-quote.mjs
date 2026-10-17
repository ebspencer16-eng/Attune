#!/usr/bin/env node
/**
 * The number on the page is the number on the card, and what was paid for
 * arrives.
 *
 * ── WHAT IT FOUND ─────────────────────────────────────────────────────────
 * Every package with every add-on, read off the real checkout page in a
 * browser and priced through the real server code: seven of twenty-four carts
 * disagreed.
 *
 *   core + Conflict Patterns   page $129, server $89, granted nothing
 *   premium + Physical Intimacy page $218, server $198, granted nothing
 *   premium + Conflict Patterns page $238, server $198
 *
 * One cause on each side. `normalizeItem` in api/create-payment-intent.js had
 * no `addonConflict` field at all, so a $40 exercise fell out of the charge,
 * out of the tax lines, out of the Stripe metadata and therefore out of the
 * order row that grants it: bought, not billed, not delivered. And it named
 * premium three times to zero the add-ons premium includes, getting two right,
 * one wrong, and missing one.
 *
 * The page's side was the mirror image: it charged list price for every
 * add-on, including the ones the package already buys, while loading
 * /_pkg-rules.js and never reading it.
 *
 * Both now read PKG_CAPS, which is the one place that decides what a package
 * includes.
 *
 * ── HOW IT CHECKS ─────────────────────────────────────────────────────────
 * It runs the shipped normaliser, imported rather than reimplemented, because
 * a gate holding two implementations together must not be a third. That
 * function now lives in api/_lib/cart-pricing.js, with the rest of what a cart
 * costs, because api/calculate-tax.js had grown its own copy of it that was
 * missing two add-ons. The page's
 * number comes from the page itself, in a browser, because that is what a
 * customer reads.
 *
 * Needs a preview server, so it lives in `npm run smoke` rather than
 * `npm run check`.
 */
import { launch } from './_lib/browser.mjs';
import { itemSubtotal, normalizeItem } from '../api/_lib/cart-pricing.js';
import { PKG_CAPS, computeEntitlements } from '../api/_lib/entitlements.js';

const BASE = process.env.BASE || 'http://localhost:4173';

const ADDONS = [
  ['workbook', 'addon_workbook=digital', { addonWorkbook: 'digital' }, 'addonWorkbook'],
  ['reflection', 'addon_reflection=1', { addonReflection: true }, 'addonReflection'],
  ['budget', 'addon_budget=1', { addonBudget: true }, 'addonBudget'],
  ['checklist', 'addon_checklist=1', { addonChecklist: true }, 'addonChecklist'],
  ['intimacy', 'addon_intimacy=1', { addonIntimacy: true }, 'addonIntimacy'],
  ['conflict', 'addon_conflict=1', { addonConflict: true }, 'addonConflict'],
];
const PKGS = Object.keys(PKG_CAPS);

const problems = [];
let carts = 0;

const page = await launch({ width: 1280, height: 1400 });
try {
  for (const pkg of PKGS) {
    for (const [name, query, item, grantKey] of ADDONS) {
      await page.goto(`${BASE}/checkout.html?pkg=${pkg}&${query}`);
      await page.wait(1100);
      const quoted = await page.evaluate(() => {
        const m = document.body.innerText.match(/COMPLETE ORDER · \$([\d,.]+)/);
        return m ? Number(m[1].replace(/,/g, '')) : null;
      });
      if (quoted == null) {
        problems.push(`${pkg} + ${name}: the page never showed a total, so nothing was compared.`);
        continue;
      }
      carts += 1;

      const normalised = normalizeItem({ pkgKey: pkg, ...item });
      const billed = itemSubtotal(normalised);
      if (quoted !== billed) {
        problems.push(`${pkg} + ${name}: the page says $${quoted} and the server charges $${billed}.`
          + '\n      Whichever is right, a customer reads one and their card is debited the other.');
      }

      /* And the order row that comes out of that charge grants it. */
      const granted = computeEntitlements([{
        pkg_key: pkg, order_num: 'X', created_at: '2026-01-01',
        addon_reflection: !!normalised.addonReflection,
        addon_budget: !!normalised.addonBudget,
        addon_checklist: !!normalised.addonChecklist,
        addon_intimacy: !!normalised.addonIntimacy,
        addon_conflict: !!normalised.addonConflict,
        addon_workbook: normalised.addonWorkbook || '',
      }], null);
      if (!granted[grantKey]) {
        problems.push(`${pkg} + ${name}: paid for at $${quoted} and the order grants nothing for it.`
          + '\n      The flag has to survive normalizeItem to reach the Stripe metadata, which is'
          + '\n      what stripe-webhook writes the order row from.');
      }
    }
  }
} finally {
  await page.close();
}

if (!carts) {
  console.error('[check-cart-quote] no cart was priced at all. Is the preview server up on'
    + ` ${BASE}? A gate that has lost its subject must never report success.`);
  process.exit(1);
}

if (problems.length) {
  console.error('[check-cart-quote] the cart does not add up:');
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}

console.log(`[check-cart-quote] ${carts} carts: ${PKGS.length} packages with each of`
  + ` ${ADDONS.length} add-ons. Every one quotes on the page what the server charges, and every`
  + ' add-on paid for is granted by the order it writes.');
