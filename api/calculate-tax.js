/**
 * POST /api/calculate-tax
 *
 * Returns a tax quote for the given cart + billing address. Called from
 * the checkout client whenever the billing address changes so the UI can
 * show "Sales tax: $X.XX" before the customer clicks Complete order.
 *
 * This is separate from /api/create-payment-intent so we don't create a
 * PaymentIntent on every address keystroke (Stripe would retire/abandon
 * each one, polluting the dashboard).
 *
 * Request body: { items: [...], customerAddress: {...}, promoCode?: string }
 * Response:     { subtotalCents, taxCents, totalCents }
 *               or { subtotalCents, taxCents: 0, totalCents, taxUnavailable: true }
 *                 when tax calc fails (e.g. Stripe Tax disabled) or no address
 *
 * Note: the calculationId from this preview is NOT reused in the final
 * payment intent — create-payment-intent does its own fresh calculation so
 * the amount and tax ID stay consistent on the actual charge.
 */

import { jsonBody } from './_lib/http.js';
import { ADDON_PRICES } from './_catalogue.js';
import { itemBasePrice, itemAddonTotal, normalizeItem, workbookAmount } from './_lib/cart-pricing.js';
import { reportToSentry } from './_lib/sentry-edge.js';
import { COMPILED_BETA_CODES, codeMetaFromRow, bundledAddons } from './_lib/beta-codes.js';

/**
 * ── AND WHERE IT RUNS ─────────────────────────────────────────────────────
 * Pinned next to the database. An edge function runs near whoever is asking,
 * which is the wrong default when every answer comes from one database
 * somewhere else: a request that landed in San Francisco spent two crossings
 * of the country on a lookup by id. See api/_lib/db-region.js for the
 * measurement, and check-edge-region.mjs, which holds every one of these to
 * the one constant that says where.
 */
export const config = { runtime: 'edge', regions: ['iad1'] };

/* ADDON_PRICES was written out here under a comment reading "Mirrors
   create-payment-intent.js — keep in sync", which is this codebase's failure
   mode given as an instruction. It comes from the catalogue now, and the
   pricing itself from _lib/cart-pricing.js, which both endpoints import. */
const TAX_CODES = {
  digitalPackage:  'txcd_10000000',
  physicalPackage: 'txcd_99999999',
  workbookDigital: 'txcd_10304100',
  workbookPrint:   'txcd_20030007',
  digitalAddon:    'txcd_10000000',
};
/* One list, in api/_lib/beta-codes.js. It was written out here and in the
   other endpoint, including the same 1..12 loop. */
const BETA_CODES = COMPILED_BETA_CODES;

function buildTaxLines(items, promoCoversBase, promoFixedAmount = null, includesWorkbook = false, workbookPercent = 0, bundled = {}) {
  const lines = [];
  items.forEach((it, idx) => {
    const base = itemBasePrice(it);
    // Decide what amount the package line bills at:
    //   no promo:                 base
    //   free-mode promo:          0 (skip the line entirely)
    //   fixed-mode promo:         promoFixedAmount (e.g. $1 for BETA-CORE-1)
    let pkgAmount = base;
    if (promoCoversBase) {
      pkgAmount = (promoFixedAmount != null) ? promoFixedAmount : 0;
    }
    if (pkgAmount > 0) {
      lines.push({
        amount: pkgAmount * 100,
        tax_code: it.isPhysical ? TAX_CODES.physicalPackage : TAX_CODES.digitalPackage,
        reference: `item-${idx}-pkg`,
        quantity: 1,
      });
    }
    /* What the workbook is actually billed at, not what it lists at. Premium
       includes it, so these two lines used to send Stripe a charge of 19 or 39
       that the payment intent never makes: the lines sent to the processor
       have to add up to what the cart says is owed. */
    const wb = includesWorkbook ? 0 : Math.round(workbookAmount(it) * 100 * (1 - workbookPercent / 100));
    if (wb > 0 && it.addonWorkbook === 'print') lines.push({ amount: wb, tax_code: TAX_CODES.workbookPrint, reference: `item-${idx}-wbprint`, quantity: 1 });
    if (wb > 0 && it.addonWorkbook === 'digital') lines.push({ amount: wb, tax_code: TAX_CODES.workbookDigital, reference: `item-${idx}-wbdigital`, quantity: 1 });
    /* An add-on the code gives away is not taxed, the same way the
       workbook above is not. */
    if (it.addonReflection && !bundled.reflection) lines.push({ amount: ADDON_PRICES.reflection*100, tax_code: TAX_CODES.digitalAddon, reference: `item-${idx}-reflection`, quantity: 1 });
    if (it.addonBudget && !bundled.budget)     lines.push({ amount: ADDON_PRICES.budget*100,     tax_code: TAX_CODES.digitalAddon, reference: `item-${idx}-budget`,     quantity: 1 });
    /* These two had no quantity and a reference without the item index, which
       is what a line written and never executed looks like: the mapping below
       dropped both flags, so neither line had ever run. Two items with the
       same reference would also have collided in Stripe's payload. */
    if (it.addonIntimacy && !bundled.intimacy)   lines.push({ amount: ADDON_PRICES.intimacy*100,   tax_code: TAX_CODES.digitalAddon, reference: `item-${idx}-intimacy`,  quantity: 1 });
    if (it.addonConflict && !bundled.conflict)   lines.push({ amount: ADDON_PRICES.conflict*100,   tax_code: TAX_CODES.digitalAddon, reference: `item-${idx}-conflict`,  quantity: 1 });
    if (it.addonChecklist && !bundled.checklist)  lines.push({ amount: ADDON_PRICES.checklist*100,  tax_code: TAX_CODES.digitalAddon, reference: `item-${idx}-checklist`,  quantity: 1 });
  });
  return lines;
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const _parsed = await jsonBody(req);
    if (_parsed.error) return _parsed.error;
    const body = _parsed.body;
    // An items value that is not a list is a bad request, not a 500. The sweep
    // sent { items: { a: 1 } } and this threw on .map.
    if (body.items != null && !Array.isArray(body.items)) {
      return new Response(JSON.stringify({ error: 'items must be a list.' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }
    /**
     * ── THE SAME ITEM THE CHARGE IS COMPUTED FROM ─────────────────────────
     * This was its own mapping of six fields, and it listed four: intimacy
     * and conflict were missing, so the two tax lines above for them could
     * never fire and the subtotal this endpoint reports left them out.
     * Conflict Patterns is $40, which is the base Stripe was asked to tax
     * being short by exactly that.
     *
     * It is normalizeItem from the pricer now, the same function
     * create-payment-intent charges from, which is the whole reason that file
     * exists: the tax and the charge cannot be computed from two different
     * ideas of what is in the cart.
     */
    const items = (body.items || []).map(normalizeItem);

    if (items.length === 0) {
      return new Response(JSON.stringify({ subtotalCents: 0, taxCents: 0, totalCents: 0 }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Compute subtotal (respecting promo coverage like the real payment path).
    // BETA_CODES values are either strings (free-mode, package key) or
    // { pkg, mode: 'fixed', amount } objects (fixed-mode). Normalize first.
    const promoCode = (body.promoCode || '').toUpperCase().trim();
    const codeEntry = promoCode ? BETA_CODES[promoCode] : null;
    let codeMeta = codeEntry == null
      ? null
      : (typeof codeEntry === 'string'
          ? { pkg: codeEntry, mode: 'free', amount: 0 }
          : { ...codeEntry });
    // Per-couple flash codes live only in the beta_codes table. Look them up
    // so the preview total matches what create-payment-intent will charge.
    if (promoCode && !codeMeta) {
      const sUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const sKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (sUrl && sKey) {
        try {
          const r = await fetch(`${sUrl}/rest/v1/beta_codes?code=eq.${encodeURIComponent(promoCode)}&select=*`,
            { headers: { apikey: sKey, Authorization: `Bearer ${sKey}` } });
          const rows = await r.json();
          if (Array.isArray(rows) && rows.length) {
            const row = rows[0];
            /* One reading of the row, shared with the endpoint that
               charges the card. This took five of the nine columns and left
               the four bundled add-ons behind, so a code giving Reflection
               away was taxed on forty dollars it never charged. */
            codeMeta = codeMetaFromRow(row);
          }
        } catch (e) { /* preview is best-effort */ }
      }
    }
    const codeUnlocks = codeMeta?.pkg || null;
    // A promo covers the base if it matches EVERY item's pkg (or is wildcard)
    const promoCoversBase = !!codeUnlocks && codeMeta?.appliesTo !== 'workbook' && (codeUnlocks === '*' || items.every(it => it.pkgKey === codeUnlocks));
    const workbookPercent = (codeMeta && codeMeta.appliesTo === 'workbook' && codeMeta.mode === 'percent') ? (Number(codeMeta.amount) || 0) : 0;
    const includesWorkbook = promoCoversBase && !!codeMeta?.includesWorkbook;
    // For free-mode the package becomes $0; for fixed-mode it becomes
    // codeMeta.amount (e.g. $1 for BETA-CORE-1).
    const promoFixedAmount = (promoCoversBase && codeMeta?.mode === 'fixed')
      ? (Number(codeMeta.amount) || 0)
      : null;

    const subtotalCents = items.reduce((sum, it) => {
      let base = itemBasePrice(it);
      if (promoCoversBase) {
        base = (promoFixedAmount != null) ? promoFixedAmount : 0;
      }
      let addons = itemAddonTotal(it);
      /* Taken off what the workbook is billed at, which for premium is nothing:
         subtracting its list price made the subtotal go negative on a promo
         that bundles a workbook the package already includes. */
      if (includesWorkbook) {
        addons -= workbookAmount(it);
      } else if (workbookPercent && (it.addonWorkbook === 'print' || it.addonWorkbook === 'digital')) {
        addons -= workbookAmount(it) * workbookPercent / 100;
      }
      return sum + (base + Math.max(0, addons)) * 100;
    }, 0);

    // Need address to calculate tax
    const addr = body.customerAddress;
    if (!addr || !addr.postal_code || !addr.country) {
      return new Response(JSON.stringify({
        subtotalCents, taxCents: 0, totalCents: subtotalCents, taxUnavailable: true,
        reason: 'address_required',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return new Response(JSON.stringify({
        subtotalCents, taxCents: 0, totalCents: subtotalCents, taxUnavailable: true,
        reason: 'stripe_not_configured',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    /* The add-ons this code gives away, so none of them is taxed. Only
       when the code actually covers this cart's package. */
    const bundled = promoCoversBase ? bundledAddons(codeMeta) : {};
    const lineItems = buildTaxLines(items, promoCoversBase, promoFixedAmount, includesWorkbook, workbookPercent, bundled);
    if (lineItems.length === 0) {
      return new Response(JSON.stringify({ subtotalCents, taxCents: 0, totalCents: subtotalCents }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    const payload = new URLSearchParams();
    payload.set('currency', 'usd');
    payload.set('customer_details[address][line1]',       addr.line1 || '');
    if (addr.line2) payload.set('customer_details[address][line2]', addr.line2);
    payload.set('customer_details[address][city]',        addr.city || '');
    payload.set('customer_details[address][state]',       addr.state || '');
    payload.set('customer_details[address][postal_code]', addr.postal_code);
    payload.set('customer_details[address][country]',     addr.country || 'US');
    payload.set('customer_details[address_source]',       'billing');
    lineItems.forEach((line, idx) => {
      payload.set(`line_items[${idx}][amount]`,    String(line.amount));
      payload.set(`line_items[${idx}][tax_code]`,  line.tax_code);
      payload.set(`line_items[${idx}][reference]`, line.reference);
      payload.set(`line_items[${idx}][quantity]`,  String(line.quantity));
    });

    const res = await fetch('https://api.stripe.com/v1/tax/calculations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload.toString(),
    });
    const data = await res.json();

    if (!res.ok) {
      // Tax calc failure — common when Stripe Tax isn't enabled or address
      // isn't in a registered jurisdiction. Fall back to zero tax so the
      // user can still complete checkout.
      console.warn('[tax-preview] calculation failed:', data.error?.message);
      return new Response(JSON.stringify({
        subtotalCents, taxCents: 0, totalCents: subtotalCents, taxUnavailable: true,
        reason: data.error?.code || 'calc_failed',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      subtotalCents,
      taxCents:    data.tax_amount_exclusive || 0,
      totalCents:  data.amount_total || subtotalCents,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('[calculate-tax] error:', err);
    await reportToSentry(err, { route: '/api/calculate-tax', request: req }).catch(() => {});
    return new Response(JSON.stringify({ error: 'Tax calculation failed' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
