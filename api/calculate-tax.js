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

import { reportToSentry } from './_lib/sentry-edge.js';

export const config = { runtime: 'edge' };

// Mirrors create-payment-intent.js — keep in sync.
const DIGITAL_PRICES  = { core: 89,  newlywed: 139, anniversary: 139, premium: 295 };
const PHYSICAL_PRICES = { core: 124, newlywed: 174, anniversary: 174, premium: 330 };
const ADDON_PRICES = {
  workbookDigital: 19, workbookPrint: 39, lmft: 150,
  reflection: 40, budget: 20, checklist: 20,
};
const TAX_CODES = {
  digitalPackage:  'txcd_10000000',
  physicalPackage: 'txcd_99999999',
  lmft:            'txcd_20030000',
  workbookDigital: 'txcd_10304100',
  workbookPrint:   'txcd_20030007',
  digitalAddon:    'txcd_10000000',
};
const BETA_CODES = {
  'BETA-CORE': 'core', 'BETA-NEWLYWED': 'newlywed',
  'BETA-ANNIVERSARY': 'anniversary', 'BETA-PREMIUM': 'premium',
  'ATTUNE-BETA-FEEDBACK': '*',
  'BETA-CORE-1': { pkg: 'core', mode: 'fixed', amount: 1 },
};

function itemBasePrice(it) {
  return it.isPhysical ? (PHYSICAL_PRICES[it.pkgKey] ?? 0) : (DIGITAL_PRICES[it.pkgKey] ?? 0);
}
function itemAddonTotal(it) {
  let a = 0;
  if (it.addonWorkbook === 'print')   a += ADDON_PRICES.workbookPrint;
  if (it.addonWorkbook === 'digital') a += ADDON_PRICES.workbookDigital;
  if (it.addonLmft)       a += ADDON_PRICES.lmft;
  if (it.addonReflection) a += ADDON_PRICES.reflection;
  if (it.addonBudget)     a += ADDON_PRICES.budget;
  if (it.addonChecklist)  a += ADDON_PRICES.checklist;
  return a;
}

function buildTaxLines(items, promoCoversBase, promoFixedAmount = null) {
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
    if (it.addonWorkbook === 'print')   lines.push({ amount: ADDON_PRICES.workbookPrint*100,   tax_code: TAX_CODES.workbookPrint,   reference: `item-${idx}-wbprint`,   quantity: 1 });
    if (it.addonWorkbook === 'digital') lines.push({ amount: ADDON_PRICES.workbookDigital*100, tax_code: TAX_CODES.workbookDigital, reference: `item-${idx}-wbdigital`, quantity: 1 });
    if (it.addonLmft)       lines.push({ amount: ADDON_PRICES.lmft*100,       tax_code: TAX_CODES.lmft,         reference: `item-${idx}-lmft`,       quantity: 1 });
    if (it.addonReflection) lines.push({ amount: ADDON_PRICES.reflection*100, tax_code: TAX_CODES.digitalAddon, reference: `item-${idx}-reflection`, quantity: 1 });
    if (it.addonBudget)     lines.push({ amount: ADDON_PRICES.budget*100,     tax_code: TAX_CODES.digitalAddon, reference: `item-${idx}-budget`,     quantity: 1 });
    if (it.addonChecklist)  lines.push({ amount: ADDON_PRICES.checklist*100,  tax_code: TAX_CODES.digitalAddon, reference: `item-${idx}-checklist`,  quantity: 1 });
  });
  return lines;
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const items = (body.items || []).map(it => ({
      pkgKey:          it.pkgKey || it.pkg,
      isPhysical:      !!it.isPhysical || it.format === 'physical',
      addonWorkbook:   it.addonWorkbook || null,
      addonLmft:       !!it.addonLmft,
      addonReflection: !!it.addonReflection,
      addonBudget:     !!it.addonBudget,
      addonChecklist:  !!it.addonChecklist,
    }));

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
    const codeMeta = codeEntry == null
      ? null
      : (typeof codeEntry === 'string'
          ? { pkg: codeEntry, mode: 'free', amount: 0 }
          : codeEntry);
    const codeUnlocks = codeMeta?.pkg || null;
    // A promo covers the base if it matches EVERY item's pkg (or is wildcard)
    const promoCoversBase = !!codeUnlocks && (codeUnlocks === '*' || items.every(it => it.pkgKey === codeUnlocks));
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
      return sum + (base + itemAddonTotal(it)) * 100;
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

    const lineItems = buildTaxLines(items, promoCoversBase, promoFixedAmount);
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
    reportToSentry(err, { route: '/api/calculate-tax', request: req }).catch(() => {});
    return new Response(JSON.stringify({ error: 'Tax calculation failed' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
