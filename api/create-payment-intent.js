/**
 * POST /api/create-payment-intent
 *
 * Creates a Stripe PaymentIntent for the given cart. Supports both the
 * legacy single-item payload and the new multi-item payload (body.items[]).
 *
 * For promo-code free checkouts, skips Stripe and writes orders directly
 * to Supabase (one row per cart item, each with its own qr_token).
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY        — sk_live_... or sk_test_...
 *   SUPABASE_URL             — for promo order writes + code validation
 *   SUPABASE_SERVICE_ROLE    — service-role secret for Supabase writes
 */

import { reportToSentry } from './_lib/sentry-edge.js';

export const config = { runtime: 'edge' };

// Canonical pricing — kept in sync with checkout.html PACKAGES.
const DIGITAL_PRICES  = { core: 89,  newlywed: 139, anniversary: 139, premium: 295 };
const PHYSICAL_PRICES = { core: 124, newlywed: 174, anniversary: 174, premium: 330 };

const ADDON_PRICES = {
  workbookDigital: 19,
  workbookPrint:   39,
  lmft:           150,
  reflection:      40,
  budget:          20,
  checklist:       20,
};

// ── Stripe Tax product codes ─────────────────────────────────────────────
// Per-line-item tax category. Stripe uses these to determine:
//   (a) whether a line is taxable in a given state,
//   (b) the correct rate for that category.
// See: https://stripe.com/docs/tax/tax-codes
//
// Ellie — review these. If the wrong code is set, tax calculations will be
// wrong (e.g. LMFT therapy is generally tax-exempt but if coded as "service"
// it could be taxed).
const TAX_CODES = {
  // Digital delivery of the Attune package (assessment + workbook access)
  digitalPackage:   'txcd_10000000', // General Services — fallback for digital
  // Physical gift boxes (newlywed/anniversary/premium boxes)
  physicalPackage:  'txcd_99999999', // General Tangible Goods
  // Professional counseling session — tax-exempt in most US states
  lmft:             'txcd_20030000', // Professional Services
  // Digital workbook PDF
  workbookDigital:  'txcd_10304100', // Books and Magazines (electronic)
  // Print workbook
  workbookPrint:    'txcd_20030007', // Printed Books
  // Other digital add-on exercises (budget, checklist, reflection)
  digitalAddon:     'txcd_10000000', // General Services
};

// Build a Stripe Tax calculation line item for each part of the cart.
// Returns an array of { amount, tax_code, reference, quantity } objects.
function buildTaxLineItems(item, itemIndex) {
  const lines = [];
  const basePrice = itemBasePrice(item);
  // Base package as one line item
  if (basePrice > 0) {
    lines.push({
      amount:    basePrice * 100, // Stripe wants cents
      tax_code:  item.isPhysical ? TAX_CODES.physicalPackage : TAX_CODES.digitalPackage,
      reference: `item-${itemIndex}-pkg`,
      quantity:  1,
    });
  }
  // Each add-on as its own line item so tax categorization is clean
  if (item.addonWorkbook === 'print') {
    lines.push({ amount: ADDON_PRICES.workbookPrint * 100,   tax_code: TAX_CODES.workbookPrint,   reference: `item-${itemIndex}-wbprint`,   quantity: 1 });
  }
  if (item.addonWorkbook === 'digital') {
    lines.push({ amount: ADDON_PRICES.workbookDigital * 100, tax_code: TAX_CODES.workbookDigital, reference: `item-${itemIndex}-wbdigital`, quantity: 1 });
  }
  if (item.addonLmft) {
    lines.push({ amount: ADDON_PRICES.lmft * 100,       tax_code: TAX_CODES.lmft,         reference: `item-${itemIndex}-lmft`,       quantity: 1 });
  }
  if (item.addonReflection) {
    lines.push({ amount: ADDON_PRICES.reflection * 100, tax_code: TAX_CODES.digitalAddon, reference: `item-${itemIndex}-reflection`, quantity: 1 });
  }
  if (item.addonBudget) {
    lines.push({ amount: ADDON_PRICES.budget * 100,     tax_code: TAX_CODES.digitalAddon, reference: `item-${itemIndex}-budget`,     quantity: 1 });
  }
  if (item.addonChecklist) {
    lines.push({ amount: ADDON_PRICES.checklist * 100,  tax_code: TAX_CODES.digitalAddon, reference: `item-${itemIndex}-checklist`,  quantity: 1 });
  }
  return lines;
}

// Call Stripe Tax to calculate tax for the cart. Returns an object with:
//   { calculationId, taxAmount (cents), totalAmount (cents) }
// or { calculationId: null, taxAmount: 0, totalAmount: subtotalCents } if
// tax calculation fails or isn't enabled (graceful fallback — order still
// processes at subtotal, we just log the problem).
//
// `customerAddress` must include at minimum line1, city, state, postal_code,
// country. If it doesn't (e.g. legacy checkout payload missing address),
// we skip tax calculation and return subtotal only.
async function calculateTaxWithStripe(secretKey, items, customerAddress, promoCovered) {
  try {
    if (!customerAddress || !customerAddress.postal_code || !customerAddress.country) {
      console.warn('[tax] No customer address provided; skipping tax calc');
      return { calculationId: null, taxAmount: 0, totalAmount: itemsTotalCents(items, promoCovered) };
    }

    // Flatten cart into individual Stripe Tax line items
    const lineItems = [];
    items.forEach((item, idx) => {
      const itemLines = buildTaxLineItems(item, idx);
      if (item._promoCoveredBase) {
        // Free-mode promo: drop the package line entirely from tax calc.
        // Fixed-mode promo: replace the package line's amount with the
        // fixed final amount (in cents) so tax is calculated on what the
        // customer actually pays for the package.
        if (item._promoMode === 'fixed' && item._promoFixedAmount > 0) {
          const adjusted = itemLines.map(l => {
            if (l.reference.endsWith('-pkg')) {
              return { ...l, amount: Math.round(item._promoFixedAmount * 100) };
            }
            return l;
          });
          lineItems.push(...adjusted);
        } else {
          // Free mode: drop the package line entirely
          const filtered = itemLines.filter(l => !l.reference.endsWith('-pkg'));
          lineItems.push(...filtered);
        }
      } else {
        lineItems.push(...itemLines);
      }
    });

    if (lineItems.length === 0) {
      return { calculationId: null, taxAmount: 0, totalAmount: 0 };
    }

    // Build the Stripe Tax calculation request payload (application/x-www-form-urlencoded)
    const payload = new URLSearchParams();
    payload.set('currency', 'usd');
    payload.set('customer_details[address][line1]',       customerAddress.line1 || '');
    if (customerAddress.line2) payload.set('customer_details[address][line2]', customerAddress.line2);
    payload.set('customer_details[address][city]',        customerAddress.city || '');
    payload.set('customer_details[address][state]',       customerAddress.state || '');
    payload.set('customer_details[address][postal_code]', customerAddress.postal_code);
    payload.set('customer_details[address][country]',     customerAddress.country || 'US');
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
      // Common failure modes:
      //   - Stripe Tax not enabled on account → error.code = 'tax_not_configured'
      //   - Unsupported country → error.code = 'tax_location_unknown'
      // Either way: log and fall back to zero tax so checkout doesn't break.
      console.error('[tax] Stripe Tax calculation failed:', data.error?.message || data);
      reportToSentry(new Error('Stripe Tax failed: ' + (data.error?.message || 'unknown')), {
        route: '/api/create-payment-intent',
        extra: { stripeError: data.error, customerAddress },
      }).catch(() => {});
      return { calculationId: null, taxAmount: 0, totalAmount: itemsTotalCents(items, promoCovered) };
    }

    return {
      calculationId: data.id,
      taxAmount:     data.tax_amount_exclusive || 0,
      totalAmount:   data.amount_total || itemsTotalCents(items, promoCovered),
    };
  } catch (e) {
    console.error('[tax] Exception during tax calc:', e);
    reportToSentry(e, { route: '/api/create-payment-intent', extra: { step: 'tax_calc' } }).catch(() => {});
    return { calculationId: null, taxAmount: 0, totalAmount: itemsTotalCents(items, promoCovered) };
  }
}

// Helper — compute cart total in cents, respecting promo coverage
function itemsTotalCents(items, promoCovered) {
  return items.reduce((sum, it) => {
    let dollars;
    if (!it._promoCoveredBase) {
      dollars = itemSubtotal(it);
    } else if (it._promoMode === 'fixed') {
      dollars = itemAddonTotal(it) + (it._promoFixedAmount || 0);
    } else {
      dollars = itemAddonTotal(it); // free-mode
    }
    return sum + dollars * 100;
  }, 0);
}

function newQrToken() {
  // ATQR-<12 hex chars>, unguessable per-order token for physical QR card.
  return 'ATQR-' + Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function itemBasePrice(item) {
  return item.isPhysical
    ? (PHYSICAL_PRICES[item.pkgKey] ?? 0)
    : (DIGITAL_PRICES[item.pkgKey]  ?? 0);
}

function itemAddonTotal(item) {
  let addons = 0;
  if (item.addonWorkbook === 'print')   addons += ADDON_PRICES.workbookPrint;
  if (item.addonWorkbook === 'digital') addons += ADDON_PRICES.workbookDigital;
  if (item.addonLmft)       addons += ADDON_PRICES.lmft;
  if (item.addonReflection) addons += ADDON_PRICES.reflection;
  if (item.addonBudget)     addons += ADDON_PRICES.budget;
  if (item.addonChecklist)  addons += ADDON_PRICES.checklist;
  return addons;
}

function itemSubtotal(item) {
  return itemBasePrice(item) + itemAddonTotal(item);
}

function normalizeItem(item) {
  return {
    pkgKey:          item.pkgKey || item.pkg,
    isPhysical:      !!item.isPhysical || item.format === 'physical',
    isGift:          !!item.isGift,
    partner1Name:    item.partner1Name || null,
    partner2Name:    item.partner2Name || null,
    giftNote:        item.giftNote || null,
    addonWorkbook:   item.addonWorkbook || null,     // 'digital' | 'print' | null
    addonLmft:       !!item.addonLmft,
    addonReflection: !!item.addonReflection,
    addonBudget:     !!item.addonBudget,
    addonChecklist:  !!item.addonChecklist,
    shipping:        item.shipping || null,
  };
}

async function writeOrderRow(supabaseUrl, serviceKey, row) {
  return fetch(`${supabaseUrl}/rest/v1/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  let body;
  try { body = await req.json(); }
  catch { return new Response('Invalid JSON', { status: 400 }); }

  // New payload shape: body.items = [{pkgKey, isPhysical, ...}, ...]
  // Legacy shape: top-level fields; wrap as [item].
  const rawItems = Array.isArray(body.items) && body.items.length
    ? body.items
    : [{
        pkgKey:          body.pkgKey || body.pkg,
        isPhysical:      !!body.isPhysical,
        isGift:          !!body.isGift,
        partner1Name:    body.partner1Name,
        partner2Name:    body.partner2Name,
        giftNote:        body.giftNote,
        addonWorkbook:   body.addonWorkbook,
        addonLmft:       body.addonLmft,
        addonReflection: body.addonReflection,
        addonBudget:     body.addonBudget,
        addonChecklist:  body.addonChecklist,
        shipping:        body.shipping,
      }];

  const items = rawItems.map(normalizeItem);

  // Validate every item has a valid package
  for (const it of items) {
    if (!DIGITAL_PRICES[it.pkgKey]) {
      return new Response(JSON.stringify({ error: `Invalid package: ${it.pkgKey}` }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  const buyerEmail = body.buyerEmail || body.email || null;
  const buyerName  = body.buyerName  || items[0]?.partner1Name || null;
  const promoCode  = body.promoCode || null;
  const orderNum   = body.orderNum  || null;

  const supabaseUrl        = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

  // ── Promo code path ────────────────────────────────────────────────────
  // Code value shapes:
  //   string          → covers full package (free), value is the package key
  //   { pkg, mode: 'fixed', amount: N } → package costs exactly $N, add-ons billed normally
  const BETA_CODES = {
    'BETA-CORE':            'core',
    'BETA-NEWLYWED':        'newlywed',
    'BETA-ANNIVERSARY':     'anniversary',
    'BETA-PREMIUM':         'premium',
    'ATTUNE-BETA-FEEDBACK': '*',
    'BETA-CORE-1':          { pkg: 'core', mode: 'fixed', amount: 1 },
  };

  if (promoCode) {
    const normalizedCode = promoCode.toUpperCase().trim();
    const codeEntry = BETA_CODES[normalizedCode];

    if (!codeEntry) {
      return new Response(JSON.stringify({ error: 'Invalid promo code' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Normalize to { pkg, mode, amount }
    const codeMeta = (typeof codeEntry === 'string')
      ? { pkg: codeEntry, mode: 'free', amount: 0 }
      : codeEntry;
    const codeUnlocks = codeMeta.pkg;

    // Every item in a multi-item cart must match the code (else reject — the
    // mixed free + paid flow is out of scope).
    if (codeUnlocks !== '*') {
      const mismatched = items.find(it => it.pkgKey !== codeUnlocks);
      if (mismatched) {
        const unlocksName = {
          core: 'The Attune Assessment',
          newlywed: 'Starting Out Collection',
          anniversary: 'Relationship Reflection',
          premium: 'Attune Premium',
        }[codeUnlocks] || codeUnlocks;
        return new Response(JSON.stringify({
          error: `This code only unlocks ${unlocksName}. Remove other packages from your cart or use a matching code.`
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // Compute the add-on-only total across all items. The promo code
    // covers the PACKAGE cost for matching items; add-ons still have to
    // be paid for. Shipping is included in base prices so isn't added here.
    const addonsTotal = items.reduce((sum, it) => sum + itemAddonTotal(it), 0);

    if (supabaseUrl && supabaseServiceKey) {
      // Check code is active + increment uses
      try {
        const checkRes = await fetch(
          `${supabaseUrl}/rest/v1/beta_codes?code=eq.${encodeURIComponent(normalizedCode)}&select=active,uses_count`,
          { headers: { apikey: supabaseServiceKey, Authorization: `Bearer ${supabaseServiceKey}` } }
        );
        const rows = await checkRes.json();
        if (Array.isArray(rows) && rows.length > 0 && rows[0].active === false) {
          return new Response(JSON.stringify({ error: 'This promo code has been deactivated.' }), {
            status: 400, headers: { 'Content-Type': 'application/json' }
          });
        }
        const currentUses = rows[0]?.uses_count ?? 0;
        await fetch(
          `${supabaseUrl}/rest/v1/beta_codes?on_conflict=code`,
          {
            method: 'POST',
            headers: {
              apikey: supabaseServiceKey,
              Authorization: `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates',
            },
            body: JSON.stringify({
              code: normalizedCode,
              package_key: codeUnlocks,
              uses_count: currentUses + items.length,
              active: true,
              last_used_at: new Date().toISOString(),
              last_used_by: buyerEmail || null,
            }),
          }
        );
      } catch (e) {
        console.warn('[promo] supabase tracking failed (non-blocking):', e);
      }

      // Only write orders here when the code is FREE-mode AND covers the
      // entire cart (no add-ons). Other cases (free + add-ons, fixed mode)
      // fall through to Stripe and the webhook writes the orders normally
      // with the promo code flagged.
      if (codeMeta.mode === 'free' && addonsTotal === 0) {
        try {
          const d = new Date();
          const dateStr = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
          // Collect generated order numbers so the client can use them in the
          // success redirect URL — otherwise the client generates a different
          // order_num from a synthetic payment_intent_id and the URL doesn't
          // match what's in the DB.
          const generatedOrderNums = [];
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const suffix = items.length > 1 ? `-${i+1}` : '';
            const generatedOrderNum = orderNum
              ? `${orderNum}${suffix}`
              : `ATT-${dateStr}-PR${Math.random().toString(36).substring(2,5).toUpperCase()}${suffix}`;
            generatedOrderNums.push(generatedOrderNum);
            await writeOrderRow(supabaseUrl, supabaseServiceKey, {
              order_num:         generatedOrderNum,
              buyer_name:        buyerName || item.partner1Name || null,
              buyer_email:       buyerEmail || null,
              partner1_name:     item.partner1Name || null,
              partner2_name:     item.partner2Name || null,
              pkg_key:           item.pkgKey || null,
              is_gift:           item.isGift,
              is_physical:       item.isPhysical,
              total:             0,
              addon_workbook:    item.addonWorkbook || null,
              addon_lmft:        item.addonLmft,
              addon_reflection:  item.addonReflection,
              addon_budget:      item.addonBudget,
              gift_note:         item.giftNote || null,
              stripe_payment_intent_id: `promo_${normalizedCode}_${Date.now()}_${i}`,
              promo_code:        normalizedCode,
              qr_token:          newQrToken(),
              shipping_name:     item.shipping?.name || null,
              shipping_address:  item.shipping?.address || null,
              shipping_city:     item.shipping?.city || null,
              shipping_state:    item.shipping?.state || null,
            });
          }
          // Stash on a request-local var the response handler can read.
          // We can't return out of the for-loop scope cleanly so we attach
          // it to the items[0] object as a side channel.
          if (items[0]) items[0]._generatedOrderNums = generatedOrderNums;
        } catch (e) {
          console.warn('[promo] order writes failed (non-blocking):', e);
        }
      }
    }

    // Fully-free path: entire cart covered AND code is free-mode AND no
    // add-ons to bill. Skip Stripe entirely.
    if (codeMeta.mode === 'free' && addonsTotal === 0) {
      return new Response(JSON.stringify({
        free: true,
        promoCode: promoCode.toUpperCase().trim(),
        itemCount: items.length,
        orderNums: items[0]?._generatedOrderNums || [],
      }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Otherwise fall through to the Stripe path BELOW.
    // Two sub-cases:
    //   free-mode + add-ons: package $0, Stripe charges add-ons only.
    //   fixed-mode: package $appliedPromoAmount/each, Stripe charges
    //     (amount * itemCount) + add-ons.
    items.forEach(it => {
      it._promoCoveredBase = true;
      it._promoMode        = codeMeta.mode;
      it._promoFixedAmount = codeMeta.amount; // 0 for free, N for fixed
    });
    // Fall through to the Stripe path below.
  }

  // ── Paid checkout via Stripe ────────────────────────────────────────────
  // If a promo code covered the package base, only charge for add-ons.
  // Otherwise the full subtotal.
  // Per-item charge:
  //   no promo                  → full itemSubtotal (package + add-ons)
  //   free-mode promo covered   → itemAddonTotal only
  //   fixed-mode promo covered  → itemAddonTotal + fixed package amount
  const subtotalDollars = items.reduce((sum, it) => {
    if (!it._promoCoveredBase) return sum + itemSubtotal(it);
    const addons = itemAddonTotal(it);
    if (it._promoMode === 'fixed') return sum + addons + (it._promoFixedAmount || 0);
    return sum + addons; // free-mode
  }, 0);
  const promoCovered = items.some(it => it._promoCoveredBase);
  if (subtotalDollars <= 0) {
    return new Response(JSON.stringify({ error: 'Empty cart' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  // ── Stripe Tax calculation ────────────────────────────────────────────
  // Pull customer's billing address from request. If no address is provided
  // (e.g. legacy client that doesn't collect it), skip tax calc and charge
  // subtotal only — graceful degradation so a schema change doesn't break
  // checkout on older deploys.
  const customerAddress = body.customerAddress || body.billingAddress || null;
  const taxResult = await calculateTaxWithStripe(secretKey, items, customerAddress, promoCovered);
  const totalCents = taxResult.totalAmount || (subtotalDollars * 100);
  const taxCents   = taxResult.taxAmount   || 0;
  const subtotalCents = subtotalDollars * 100;

  // Compact items metadata for the webhook. Each item is serialized as a
  // short object. Stripe caps metadata values at 500 chars per key, so we
  // chunk long payloads across numbered keys (items0, items1, ...).
  const compactItems = items.map(it => ({
    p:   it.pkgKey,
    ph:  it.isPhysical ? 1 : 0,
    g:   it.isGift ? 1 : 0,
    p1:  (it.partner1Name || '').slice(0, 40),
    p2:  (it.partner2Name || '').slice(0, 40),
    gn:  (it.giftNote || '').slice(0, 200),
    w:   it.addonWorkbook || '',
    l:   it.addonLmft ? 1 : 0,
    r:   it.addonReflection ? 1 : 0,
    b:   it.addonBudget ? 1 : 0,
    c:   it.addonChecklist ? 1 : 0,
    s:   it.shipping ? [it.shipping.name, it.shipping.address, it.shipping.city, it.shipping.state].join('|').slice(0, 200) : '',
  }));

  const itemsJson = JSON.stringify(compactItems);

  const payload = new URLSearchParams({
    amount:   String(totalCents),  // subtotal + tax, from Stripe Tax calc
    currency: 'usd',
    'automatic_payment_methods[enabled]': 'true',
    'metadata[itemCount]':    String(items.length),
    'metadata[orderNum]':     orderNum || '',
    'metadata[buyerName]':    buyerName || '',
    // First-item mirror for legacy webhook parsing
    'metadata[pkgKey]':       items[0].pkgKey,
    'metadata[partner1Name]': items[0].partner1Name || '',
    'metadata[partner2Name]': items[0].partner2Name || '',
    'metadata[isGift]':       items[0].isGift ? '1' : '',
    'metadata[isPhysical]':   items[0].isPhysical ? '1' : '',
    'metadata[addonWorkbook]':items[0].addonWorkbook || '',
    'metadata[addonLmft]':    items[0].addonLmft ? '1' : '',
    'metadata[addonReflection]':items[0].addonReflection ? '1' : '',
    'metadata[addonBudget]':  items[0].addonBudget ? '1' : '',
    'metadata[giftNote]':     (items[0].giftNote || '').slice(0, 500),
    // When a promo covers the package base, pass it through so the webhook
    // tags the resulting order rows with promo_code + adjusts accounting.
    'metadata[promoCode]':    promoCovered ? (promoCode || '').toUpperCase().trim() : '',
    'metadata[promoCoversBase]': promoCovered ? '1' : '',
    // Tax calculation pass-through. The webhook uses taxCalculationId to
    // create a matching tax transaction after payment succeeds, which is
    // how Stripe Tax records revenue for reporting/filing.
    'metadata[taxCalculationId]': taxResult.calculationId || '',
    'metadata[taxAmount]':        String(taxCents),
    'metadata[subtotal]':         String(subtotalCents),
  });

  // Split items JSON across keys if needed
  const chunkSize = 480;
  if (itemsJson.length <= chunkSize) {
    payload.append('metadata[items]', itemsJson);
  } else {
    let idx = 0;
    for (let i = 0; i < itemsJson.length; i += chunkSize) {
      payload.append(`metadata[items${idx}]`, itemsJson.slice(i, i + chunkSize));
      idx++;
    }
    payload.append('metadata[itemsChunks]', String(idx));
  }

  if (buyerEmail) {
    payload.append('receipt_email', buyerEmail);
  }

  try {
    const res = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload.toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Stripe error:', data);
      return new Response(JSON.stringify({ error: data.error?.message || 'Stripe error' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      clientSecret: data.client_secret,
      // Tax breakdown for the UI to display:
      //   subtotalCents: what the user is buying (pre-tax)
      //   taxCents:      sales tax for their jurisdiction
      //   totalCents:    what Stripe will charge
      //   taxCalculationId: reference used by webhook to record the transaction
      taxBreakdown: {
        subtotalCents,
        taxCents,
        totalCents,
        calculationId: taxResult.calculationId,
      },
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Payment intent creation failed:', err);
    // Fire-and-forget to Sentry — don't block response if Sentry is slow
    reportToSentry(err, { route: '/api/create-payment-intent', request: req }).catch(() => {});
    return new Response(JSON.stringify({ error: 'Payment service unavailable' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
