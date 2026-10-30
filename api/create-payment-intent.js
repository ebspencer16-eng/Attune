/**
 * POST /api/create-payment-intent
 *
 * Creates a Stripe PaymentIntent for the given cart. Supports both the
 * legacy single-item payload and the new multi-item payload (body.items[]).
 *
 * For promo-code free checkouts, skips Stripe and writes orders directly
 * to Supabase, one row per cart item.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY        — sk_live_... or sk_test_...
 *   SUPABASE_URL             — for promo order writes + code validation
 *   SUPABASE_SERVICE_ROLE    — service-role secret for Supabase writes
 */

import { jsonBody } from './_lib/http.js';
import { mintOrderNumber } from './_lib/order-number.js';
import { reportToSentry } from './_lib/sentry-edge.js';
import { PHYSICAL_ENABLED as FLAG_PHYSICAL_ENABLED } from './_lib/flags.js';
// Prices live in one place. This file used to declare its own copy.
import { ADDON_PRICES, DIGITAL_PRICES, PHYSICAL_PRICES } from './_catalogue.js';
import { itemBasePrice, itemAddonTotal, itemSubtotal, normalizeItem, workbookAmount as wbAmount } from './_lib/cart-pricing.js';
import { isStandaloneCart, ownsCoreFor } from './_lib/owns-core.js';
import { COMPILED_BETA_CODES, codeMetaFromRow } from './_lib/beta-codes.js';
/* What each package already includes, so this file does not say it again. */

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

// Canonical pricing — kept in sync with checkout.html PACKAGES.

// Launch flags — server-side enforcement so a crafted or stale request can
// never bill for a disabled offering. The flag itself comes from
// api/_lib/flags.js, which every other surface reads too; the environment
// variable stays as an override that can turn physical on without a deploy.
// It can only turn it on, so a stale env cannot re-enable something the code
// has disabled.
const PHYSICAL_ENABLED = process.env.ATTUNE_PHYSICAL_ENABLED === '1' || FLAG_PHYSICAL_ENABLED;



// ── Stripe Tax product codes ─────────────────────────────────────────────
// Per-line-item tax category. Stripe uses these to determine:
//   (a) whether a line is taxable in a given state,
//   (b) the correct rate for that category.
// See: https://stripe.com/docs/tax/tax-codes
//
// Ellie — review these. If the wrong code is set, tax calculations will be
// wrong (e.g. a service coded incorrectly)
// it could be taxed).
const TAX_CODES = {
  // Digital delivery of the Attune package (assessment + workbook access)
  digitalPackage:   'txcd_10000000', // General Services — fallback for digital
  // Physical gift boxes (newlywed/anniversary/premium boxes)
  physicalPackage:  'txcd_99999999', // General Tangible Goods
  // Professional counseling session — tax-exempt in most US states
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
  if (!item._promoWorkbookFree) {
    const wbAmt = wbAmount(item);
    if (wbAmt > 0) {
      const tax = item.addonWorkbook === 'print' ? TAX_CODES.workbookPrint : TAX_CODES.workbookDigital;
      lines.push({ amount: wbAmt * 100, tax_code: tax, reference: `item-${itemIndex}-wb`, quantity: 1 });
    }
  }
  /**
   * ── AN ADD-ON THE CODE GAVE AWAY IS NOT A LINE ────────────────────────
   * These four were pushed whenever the add-on was on the item, with no
   * reference to whether a promo had bundled it free. Only the workbook above
   * checked, which is what made it look deliberate.
   *
   * It matters more here than anywhere else in this file: these lines go to
   * Stripe, Stripe returns `amount_total`, and that figure is charged ahead of
   * every total computed locally. So on the ordinary path — the tax call
   * succeeding — a code bundling Relationship Reflection charged forty dollars
   * for it regardless of what the page had quoted.
   *
   * The flags are the same ones billableAddons reads. check-promo-totals
   * requires these lines to add up to what that function says is owed.
   */
  if (item.addonReflection && !item._promoReflectionFree) {
    lines.push({ amount: ADDON_PRICES.reflection * 100, tax_code: TAX_CODES.digitalAddon, reference: `item-${itemIndex}-reflection`, quantity: 1 });
  }
  if (item.addonBudget && !item._promoBudgetFree) {
    lines.push({ amount: ADDON_PRICES.budget * 100,     tax_code: TAX_CODES.digitalAddon, reference: `item-${itemIndex}-budget`,     quantity: 1 });
  }
  if (item.addonChecklist && !item._promoChecklistFree) {
    lines.push({ amount: ADDON_PRICES.checklist * 100,  tax_code: TAX_CODES.digitalAddon, reference: `item-${itemIndex}-checklist`,  quantity: 1 });
  }
  if (item.addonIntimacy && !item._promoIntimacyFree) {
    lines.push({ amount: ADDON_PRICES.intimacy * 100,   tax_code: TAX_CODES.digitalAddon, reference: `item-${itemIndex}-intimacy`,   quantity: 1 });
  }
  if (item.addonConflict) {
    lines.push({ amount: ADDON_PRICES.conflict * 100,   tax_code: TAX_CODES.digitalAddon, reference: `item-${itemIndex}-conflict`,   quantity: 1 });
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
      } else if (item._promoWorkbookPercent) {
        // Flash promo: reduce only the workbook line by the percent.
        const pct = item._promoWorkbookPercent;
        const adjusted = itemLines.map(l => (
          (l.reference.endsWith('-wbdigital') || l.reference.endsWith('-wbprint'))
            ? { ...l, amount: Math.round(l.amount * (1 - pct / 100)) }
            : l
        ));
        lineItems.push(...adjusted);
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
      await reportToSentry(new Error('Stripe Tax failed: ' + (data.error?.message || 'unknown')), {
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
    await reportToSentry(e, { route: '/api/create-payment-intent', extra: { step: 'tax_calc' } }).catch(() => {});
    return { calculationId: null, taxAmount: 0, totalAmount: itemsTotalCents(items, promoCovered) };
  }
}

/**
 * ── WHAT ONE ITEM COSTS, ONCE ─────────────────────────────────────────────
 * This file used to work a cart's price out in three places, and each knew
 * about a different subset of the five flags that mark an add-on bundled free
 * by a promo code:
 *
 *   addonsTotal      all five. It decides whether the order is free.
 *   subtotalDollars  the workbook only. It is the quoted subtotal.
 *   itemsTotalCents  none of them. It is the charged total whenever the Stripe
 *                    tax call is skipped or fails.
 *
 * So a code bundling Reflection free took the no-charge path only while the
 * cart held nothing else. One paid add-on beside it and `addonsTotal` was no
 * longer zero, the order went to the charged path, and the bundled add-on was
 * quoted and billed: forty dollars for something the code gave away.
 *
 * The same shape as premium being priced at 198 in one endpoint and 295 in
 * another, one level down: three copies of one rule inside one module, with
 * nothing checking that they agree.
 *
 * All three now call these two. check-promo-totals runs them over every
 * bundled add-on, with and without a paid one beside it.
 */

/** The add-ons an item is actually billed for: its add-ons, less the gifts. */
function billableAddons(item) {
  let a = itemAddonTotal(item);
  if (item._promoWorkbookFree)   a -= wbAmount(item);
  if (item._promoIntimacyFree)   a -= ADDON_PRICES.intimacy;
  if (item._promoReflectionFree) a -= ADDON_PRICES.reflection;
  if (item._promoBudgetFree)     a -= ADDON_PRICES.budget;
  if (item._promoChecklistFree)  a -= ADDON_PRICES.checklist;
  return Math.max(0, a);
}

/** What this item costs, in dollars, after every promo the code applies. */
function itemChargeDollars(it) {
  if (it._promoWorkbookPercent) {
    // Flash promo: the package and the other add-ons stand, the workbook is
    // reduced by a percentage.
    return itemSubtotal(it) - (wbAmount(it) * it._promoWorkbookPercent / 100);
  }
  if (!it._promoCoveredBase) return itemSubtotal(it);
  // The code covered the package: pay for the add-ons it did not include,
  // plus whatever a fixed-mode code sets the package to.
  return billableAddons(it) + (it._promoMode === 'fixed' ? (it._promoFixedAmount || 0) : 0);
}

// Helper — compute cart total in cents, respecting promo coverage
function itemsTotalCents(items, promoCovered) {
  return items.reduce((sum, it) => sum + itemChargeDollars(it) * 100, 0);
}


/* itemBasePrice, wbAmount, itemAddonTotal and itemSubtotal were here. They
   are in _lib/cart-pricing.js now, because calculate-tax.js had its own copy
   of all three and the workbook rule was only in this one: premium includes
   the workbook, so a premium cart was taxed on 19 to 39 dollars more than it
   was charged. check-one-cart-price forbids a second copy.

   itemSubtotal outlived that move by being one line, `base + add-ons`, which
   is the kind of copy nobody counts as a copy. It agreed with the library's,
   which is why nothing noticed: a term added to the library's version would
   have been missing from the one this file actually charged. */

async function writeOrderRow(supabaseUrl, serviceKey, row) {
  const res = await fetch(`${supabaseUrl}/rest/v1/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok && res.status !== 409) {
    // 409 = webhook/promo retry of an order_num we already wrote (idempotent).
    // Anything else means the order was LOST — a paying customer with no
    // order row. This must never be silent (it was: missing promo_code
    // column dropped every order insert with a 42703 for weeks).
    const txt = await res.text().catch(() => '');
    console.error('[orders] insert FAILED', res.status, row.order_num, txt);
    try {
      const { reportToSentry } = await import('./_lib/sentry-edge.js');
      await reportToSentry(new Error(`order insert failed ${res.status}: ${txt.slice(0, 300)}`), { route: '/api/create-payment-intent', order_num: row.order_num });
    } catch { /* sentry optional */ }
  }
  return res;
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

  const _parsed = await jsonBody(req);
  if (_parsed.error) return _parsed.error;
  const body = _parsed.body;

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
        addonReflection: body.addonReflection,
        addonBudget:     body.addonBudget,
        addonIntimacy:   body.addonIntimacy,
        addonConflict:   body.addonConflict,
        addonChecklist:  body.addonChecklist,
        shipping:        body.shipping,
      }];

  const items = rawItems.map(normalizeItem);

  /* ── EVERY ITEM IS A PACKAGE, OR THE WHOLE CART IS STANDALONE ──────────
     Ellie: "I want users to be able to buy a standalone exercise but only if
     they already own the base exercises."

     So there are two legal shapes and nothing in between. Either every item
     names a package, which is the ordinary order, or no item does and the cart
     is one or more add-ons bought on their own. A cart mixing the two would be
     a package order with a loose add-on floating beside it, which is not
     something any surface can produce and not something this should invent a
     price for.

     The pricing needs no special case: an item with no package key bases at
     nought, because DIGITAL_PRICES has no entry, and normalizeItem falls back
     to core capabilities so every add-on on it stays billable. Measured: an
     item carrying only addonConflict subtotals 40, which is what the packages
     page lists. Ellie: "Confirmed that the exercise exercises are the same
     price as listed on the website for those users." */
  const standalone = isStandaloneCart(items);
  for (const it of items) {
    if (standalone) continue;
    if (!DIGITAL_PRICES[it.pkgKey]) {
      return new Response(JSON.stringify({ error: `Invalid package: ${it.pkgKey}` }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  if (standalone && items.every((it) => itemAddonTotal(it) <= 0)) {
    return new Response(JSON.stringify({ error: 'Nothing in the cart to buy.' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  const buyerEmail = body.buyerEmail || body.email || null;
  const buyerName  = body.buyerName  || items[0]?.partner1Name || null;
  const promoCode  = body.promoCode || null;
  // Minted here, before the payment exists, and nowhere else: see
  // api/_lib/order-number.js. Nothing sends one in, and a client-chosen
  // number is not one to trust.
  const orderNum   = mintOrderNumber();

  const supabaseUrl        = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  /* ── AND THE RULE, WHICH LIVES HERE RATHER THAN IN THE PAGE ────────────
     The checkout page asks /api/verify-core before it shows a card field, so
     somebody finds out early. That is a courtesy and it runs in a browser,
     which means it can be skipped by posting straight here.

     This is the same question, asked again, by the same function. An add-on
     has no meaning without the two core exercises, so selling one to an
     account that does not own them takes money for something the buyer cannot
     open.

     A read that fails answers 503 and sells nothing. Treating "we could not
     check" as "they do not own it" would refuse a paying customer, and
     treating it as "they do" would be the guard not being there. */
  if (standalone) {
    const read = await ownsCoreFor({
      supabaseUrl, serviceKey: supabaseServiceKey, email: buyerEmail,
    });
    if (!read.ok) {
      console.error('[create-payment-intent] core check failed:', read.error);
      return new Response(JSON.stringify({ error: 'We could not check your account just now. Please try again.' }), {
        status: 503, headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!read.ownsCore) {
      return new Response(JSON.stringify({
        error: 'A single exercise can only be added to an existing Attune assessment. That email does not have one yet.',
      }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
  }

  // ── Promo code path ────────────────────────────────────────────────────
  // Code value shapes:
  //   string          → covers full package (free), value is the package key
  //   { pkg, mode: 'fixed', amount: N } → package costs exactly $N, add-ons billed normally
  /* One list, in api/_lib/beta-codes.js. It was written out here and in the
     other endpoint, including the same 1..12 loop. */
  const BETA_CODES = COMPILED_BETA_CODES;

  if (promoCode) {
    const normalizedCode = promoCode.toUpperCase().trim();
    const codeEntry = BETA_CODES[normalizedCode];

    // Resolve code metadata. Hardcoded map first (legacy named codes), then
    // the beta_codes table, where dynamically-issued codes live: the 12 beta
    // codes and per-couple flash-promo codes. Table columns carry the full
    // grant (mode, included workbook) plus guard rails (max_uses, expiry, binding).
    /**
     * ── A LOOKUP THAT FAILED IS NOT A CODE WITH NO ROW ───────────────────
     * The row carries every guard below: uses so far, deactivated, expired,
     * bound to an address. This lookup used to swallow a timeout or an error
     * reply and carry on with no row, so a hardcoded code already redeemed
     * passed the single-use check as if it never had been (A202, from the
     * sweep of read-then-write counters). Not knowing is refused now, and the
     * page shows its own "could not reach the server" line: `unavailable`
     * carries no sentence, so the words stay on the page that owns them.
     */
    let dbRow = null;
    if (supabaseUrl && supabaseServiceKey) {
      let rows = null;
      try {
        const _c = new AbortController();
        const _t = setTimeout(() => _c.abort(), 8000);
        const r = await fetch(
          `${supabaseUrl}/rest/v1/beta_codes?code=eq.${encodeURIComponent(normalizedCode)}&select=*`,
          { headers: { apikey: supabaseServiceKey, Authorization: `Bearer ${supabaseServiceKey}` }, signal: _c.signal }
        ).finally(() => clearTimeout(_t));
        if (r.ok) rows = await r.json().catch(() => null);
      } catch (e) { console.warn('[promo] code lookup failed:', e); }
      if (!Array.isArray(rows)) {
        return new Response(JSON.stringify({ unavailable: true }), {
          status: 503, headers: { 'Content-Type': 'application/json' }
        });
      }
      if (rows.length) dbRow = rows[0];
    }

    if (!codeEntry && !dbRow) {
      return new Response(JSON.stringify({ error: 'Invalid promo code' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Normalize to { pkg, mode, amount, ... }
    let codeMeta;
    if (codeEntry) {
      codeMeta = (typeof codeEntry === 'string')
        ? { pkg: codeEntry, mode: 'free', amount: 0 }
        : { ...codeEntry };
    } else {
      codeMeta = {
        pkg:    dbRow.package_key || '*',
        mode:   dbRow.discount_mode || 'free',
        amount: Number(dbRow.discount_value) || 0,
      };
    }
    // Table-driven grant + guard rails (table is authoritative for these).
    if (dbRow) {
      codeMeta.includesWorkbook = !!dbRow.includes_workbook;
      codeMeta.workbookVariant  = dbRow.workbook_variant || 'digital';
      codeMeta.includesIntimacy = !!dbRow.includes_intimacy;
      codeMeta.includesReflection = !!dbRow.includes_reflection;
      codeMeta.includesBudget     = !!dbRow.includes_budget;
      codeMeta.includesChecklist  = !!dbRow.includes_checklist;
      codeMeta.appliesTo        = dbRow.applies_to || 'package';
      if (dbRow.active === false) {
        return new Response(JSON.stringify({ error: 'This promo code has been deactivated.' }), {
          status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      if (dbRow.expires_at && new Date(dbRow.expires_at).getTime() < Date.now()) {
        return new Response(JSON.stringify({ error: 'This promo code has expired.' }), {
          status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      if (Array.isArray(dbRow.bound_emails) && dbRow.bound_emails.length) {
        const bemail = (buyerEmail || '').toLowerCase().trim();
        const ok = dbRow.bound_emails.map(e => (e || '').toLowerCase().trim()).includes(bemail);
        if (!ok) {
          return new Response(JSON.stringify({ error: 'This code is linked to a different account. Sign in with the email it was sent to, then apply the code.' }), {
            status: 400, headers: { 'Content-Type': 'application/json' } });
        }
      }
    }

    // ── Single-use enforcement ────────────────────────────────────────────
    // Every beta/promo code redeems once. A beta_codes row can raise the limit
    // by setting max_uses explicitly; absent that, the default is single-use.
    // This also covers the hardcoded named codes (BETA-CORE, BETA-NEWLYWED,
    // etc.): the first redemption upserts a row with uses_count >= 1, so any
    // later attempt is blocked here. BETA-CORE-1 ($1 Stripe-path test code)
    // stays reusable so the payment flow can be re-run during testing.
    const REUSABLE_CODES = new Set(['BETA-CORE-1']);
    if (!REUSABLE_CODES.has(normalizedCode)) {
      const usesSoFar   = dbRow?.uses_count ?? 0;
      const allowedUses = (dbRow && dbRow.max_uses != null) ? dbRow.max_uses : 1;
      if (usesSoFar >= allowedUses) {
        return new Response(JSON.stringify({ error: 'This code has already been used.' }), {
          status: 400, headers: { 'Content-Type': 'application/json' } });
      }
    }

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
    // When the code bundles the workbook free (beta), force it onto each item
    // and exclude it from the billable add-on total so the order routes through
    // the no-charge path.
    if (codeMeta.includesWorkbook) {
      items.forEach(it => {
        it.addonWorkbook = codeMeta.workbookVariant || 'digital';
        it._promoWorkbookFree = true;
      });
    }
    // Same pattern for a bundled intimacy add-on (e.g. ATTUNE-BETA-1/2): force it
    // onto each matching item and exclude its price from the billable add-on
    // total so the order still routes through the no-charge path.
    if (codeMeta.includesIntimacy) {
      items.forEach(it => {
        it.addonIntimacy = true;
        it._promoIntimacyFree = true;
      });
    }
    // Bundled reflection / budget / checklist (e.g. ATTUNE-BETA-1/2). Same pattern:
    // force onto each item, mark free so it routes through the no-charge path.
    if (codeMeta.includesReflection) {
      items.forEach(it => { it.addonReflection = true; it._promoReflectionFree = true; });
    }
    if (codeMeta.includesBudget) {
      items.forEach(it => { it.addonBudget = true; it._promoBudgetFree = true; });
    }
    if (codeMeta.includesChecklist) {
      items.forEach(it => { it.addonChecklist = true; it._promoChecklistFree = true; });
    }
    // Whether anything is left to pay for. billableAddons is the same function
    // the quoted subtotal and the charged total use, so "this order is free"
    // and "this order costs nothing" cannot disagree.
    const addonsTotal = items.reduce((sum, it) => sum + billableAddons(it), 0);

    if (supabaseUrl && supabaseServiceKey) {
      /**
       * ── CLAIM THE USE, DO NOT COUNT IT ─────────────────────────────────
       * This read uses_count and wrote back what it read plus one, so two
       * redemptions at the same moment both passed the single-use check
       * above and both wrote 1: one code, two free packages. And the read
       * was unchecked, so a failed one counted from zero and put a used
       * code's tally back to 1 (A202).
       *
       * Now a compare and swap: move the count from the value the check
       * above saw, and only if it is still that value. One row back means
       * this redemption is the one that counted. None means somebody else
       * got there first, or the write failed, and the reply is the page's
       * "could not reach the server" line; a retry reads the true count and
       * the check above answers it. A code with no row yet (a named code's
       * first use) is inserted, and the unique code makes a second insert
       * fail the same way. Deactivation is already refused above, from the
       * same row.
       */
      const enc = encodeURIComponent(normalizedCode);
      const H = {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      };
      const stamp = {
        last_used_at: new Date().toISOString(),
        last_used_by: buyerEmail ? String(buyerEmail).trim().toLowerCase() : null,
      };
      let claimed = false;
      try {
        let res;
        if (dbRow) {
          const was = dbRow.uses_count;
          const still = was == null ? 'uses_count=is.null' : `uses_count=eq.${Number(was)}`;
          res = await fetch(`${supabaseUrl}/rest/v1/beta_codes?code=eq.${enc}&${still}`, {
            method: 'PATCH', headers: H,
            body: JSON.stringify({ uses_count: (Number(was) || 0) + items.length, ...stamp }),
          });
        } else {
          res = await fetch(`${supabaseUrl}/rest/v1/beta_codes`, {
            method: 'POST', headers: H,
            body: JSON.stringify({ code: normalizedCode, package_key: codeUnlocks, uses_count: items.length, active: true, ...stamp }),
          });
        }
        if (res.ok) {
          const rows = await res.json().catch(() => null);
          claimed = Array.isArray(rows) && rows.length === 1;
        } else {
          console.warn('[promo] claim refused:', res.status, (await res.text().catch(() => '')).slice(0, 200));
        }
      } catch (e) {
        console.warn('[promo] claim failed:', e);
      }
      if (!claimed && !REUSABLE_CODES.has(normalizedCode)) {
        return new Response(JSON.stringify({ unavailable: true }), {
          status: 503, headers: { 'Content-Type': 'application/json' }
        });
      }

      // Only write orders here when the code is FREE-mode AND covers the
      // entire cart (no add-ons). Other cases (free + add-ons, fixed mode)
      // fall through to Stripe and the webhook writes the orders normally
      // with the promo code flagged.
      if (codeMeta.mode === 'free' && addonsTotal === 0) {
        try {
          // Collect generated order numbers so the client can use them in the
          // success redirect URL — otherwise the client generates a different
          // order_num from a synthetic payment_intent_id and the URL doesn't
          // match what's in the DB.
          const generatedOrderNums = [];
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const suffix = items.length > 1 ? `-${i+1}` : '';
            // Always minted now (api/_lib/order-number.js). The three random
            // characters this fell back to were about 47,000 a day, and a
            // repeat was read further down as a retry: a second customer's
            // order would have been dropped as a duplicate.
            const generatedOrderNum = `${orderNum}${suffix}`;
            generatedOrderNums.push(generatedOrderNum);
            await writeOrderRow(supabaseUrl, supabaseServiceKey, {
              order_num:         generatedOrderNum,
              buyer_name:        buyerName || item.partner1Name || null,
              // Lower case, as sign-in stores it: every lookup by address
              // compares exactly. Migration 102 holds it in the database too.
              buyer_email:       buyerEmail ? String(buyerEmail).trim().toLowerCase() : null,
              partner1_name:     item.partner1Name || null,
              partner2_name:     item.partner2Name || null,
              pkg_key:           item.pkgKey || null,
              is_gift:           item.isGift,
              is_physical:       item.isPhysical,
              total:             0,
              addon_workbook:    item.addonWorkbook || null,
              addon_reflection:  item.addonReflection,
              addon_budget:      item.addonBudget,
              addon_checklist:   item.addonChecklist,
              addon_intimacy:    item.addonIntimacy,
              /* Conflict Patterns was missing from this row as well as from
                 normalizeItem. No promo code can bundle it free today, so the
                 only way here with one in the cart is a code that covers the
                 package while the add-on is paid for, which routes through
                 Stripe instead. Written anyway: a row that records what was
                 bought should record all of it, and the last field left out of
                 an object like this cost a $40 exercise. */
              addon_conflict:    item.addonConflict,
              gift_note:         item.giftNote || null,
              stripe_payment_intent_id: `promo_${normalizedCode}_${Date.now()}_${i}`,
              promo_code:        normalizedCode,
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
    if (codeMeta.appliesTo === 'workbook' && codeMeta.mode === 'percent') {
      // Flash promo: discount the workbook add-on only. Package bills normally.
      const hasWorkbook = items.some(it => it.addonWorkbook === 'digital' || it.addonWorkbook === 'print');
      if (!hasWorkbook) {
        return new Response(JSON.stringify({ error: 'Add the personalized workbook to your cart to use this code.' }), {
          status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      items.forEach(it => { it._promoWorkbookPercent = Number(codeMeta.amount) || 0; });
    } else {
      items.forEach(it => {
        it._promoCoveredBase = true;
        it._promoMode        = codeMeta.mode;
        it._promoFixedAmount = codeMeta.amount; // 0 for free, N for fixed
      });
    }
    // Fall through to the Stripe path below.
  }

  // ── Paid checkout via Stripe ────────────────────────────────────────────
  // If a promo code covered the package base, only charge for add-ons.
  // Otherwise the full subtotal.
  // Per-item charge:
  //   no promo                  → full itemSubtotal (package + add-ons)
  //   free-mode promo covered   → itemAddonTotal only
  //   fixed-mode promo covered  → itemAddonTotal + fixed package amount
  const subtotalDollars = items.reduce((sum, it) => sum + itemChargeDollars(it), 0);
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

  // Stripe rejects payment intents under 50 cents (USD) with a cryptic
  // amount_too_small error at the worst possible moment. A promo can legally
  // land a total in the 1–49c range (fixed-mode, or a percent discount on a
  // cheap add-on). Fully-free carts are already short-circuited above; anything
  // that survives to here and is still under the floor is a misconfigured promo
  // or an unsupported combination, so fail with a clear message instead.
  if (totalCents > 0 && totalCents < 50) {
    console.error('[create-payment-intent] total below Stripe minimum:', totalCents, 'cents');
    return new Response(JSON.stringify({
      error: 'This order total is below the minimum we can process. Please review the promo code, or contact support.',
    }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (totalCents <= 0) {
    console.error('[create-payment-intent] non-positive total reached Stripe path:', totalCents);
    return new Response(JSON.stringify({
      error: 'This order has no amount to charge. If you used a code that makes it free, please refresh and try again.',
    }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

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
    r:   it.addonReflection ? 1 : 0,
    b:   it.addonBudget ? 1 : 0,
    i:   it.addonIntimacy ? 1 : 0,
    cf:  it.addonConflict ? 1 : 0,
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
    'metadata[addonReflection]':items[0].addonReflection ? '1' : '',
    'metadata[addonBudget]':  items[0].addonBudget ? '1' : '',
    'metadata[addonIntimacy]': items[0].addonIntimacy ? '1' : '',
    'metadata[addonConflict]': items[0].addonConflict ? '1' : '',
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
        // Stripe dedupes by this key: a resubmit of the same cart reuses the
        // original PaymentIntent instead of charging twice.
        ...(body.idempotencyKey ? { 'Idempotency-Key': String(body.idempotencyKey).trim().slice(0, 200) } : {}),
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
      // The number the customer is shown, emailed and linked with, and the one
      // the webhook will store. Read back from Stripe: a retry with the same
      // idempotency key returns the payment made the first time, whose
      // metadata carries the number minted then, not the one minted now.
      orderNum: data.metadata?.orderNum || orderNum,
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
    await reportToSentry(err, { route: '/api/create-payment-intent', request: req }).catch(() => {});
    return new Response(JSON.stringify({ error: 'Payment service unavailable' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
