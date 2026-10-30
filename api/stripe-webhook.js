/**
 * POST /api/stripe-webhook
 *
 * Receives Stripe event notifications. Verifies the signature,
 * then handles payment_intent.succeeded and payment_intent.payment_failed.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET  — whsec_... from Stripe dashboard
 *
 * Optional:
 *   RESEND_API_KEY + FROM_EMAIL  — to trigger confirmation emails on success
 */

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

import { reportToSentry } from './_lib/sentry-edge.js';
import { writeEntitlements } from './_lib/entitlements.js';
import { SITE_URL } from './_lib/site.js';
import { recordConsent } from './_lib/consent.js';
import { legacyOrderNumber } from './_lib/order-number.js';
import { orderEmailContext } from './_lib/order-email-context.js';
import { sendOrderEmails } from './send-order-email.js';
import { claimPromoUse, readPromoRow } from './_lib/promo-claim.js';

async function verifyStripeSignature(body, signature, secret) {
  // Stripe webhook signature format: t=timestamp,v1=hash
  const parts = signature.split(',');
  const t     = parts.find(p => p.startsWith('t='))?.slice(2);
  const v1    = parts.find(p => p.startsWith('v1='))?.slice(3);
  if (!t || !v1) return false;

  // Reject replays. Without a tolerance check a captured request stays valid
  // forever. Stripe signs every delivery (including retries) at send time, so
  // a 5-minute window is safe.
  const ageSec = Math.abs(Math.floor(Date.now() / 1000) - Number(t));
  if (!Number.isFinite(ageSec) || ageSec > 300) {
    console.error('[webhook] signature timestamp outside tolerance:', ageSec);
    return false;
  }

  const signedPayload = `${t}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const computed = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  // Constant-time compare. A plain === leaks timing.
  if (computed.length !== v1.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) mismatch |= computed.charCodeAt(i) ^ v1.charCodeAt(i);
  return mismatch === 0;
}

export default async function handler(req) {
  try {
    return await handleWebhook(req);
  } catch (err) {
    console.error('[stripe-webhook] unhandled error:', err);
    await reportToSentry(err, { route: '/api/stripe-webhook', request: req }).catch(() => {});
    // Return 200 even on error — Stripe retries webhook failures up to
    // 72 hours, so we'd rather log + continue than get a storm of retries
    // for a bug that Sentry will let us fix.
    return new Response(JSON.stringify({ received: true, error: 'logged' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handleWebhook(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const secretKey     = process.env.STRIPE_SECRET_KEY;

  const rawBody  = await req.text();
  const sig      = req.headers.get('stripe-signature');

  // Fail CLOSED. Previously this was `if (webhookSecret && sig)`, so a missing
  // env var or a request that simply omitted the signature header skipped
  // verification entirely — anyone could POST a forged payment_intent.succeeded
  // and mint a paid order with full entitlements. Never trust an unsigned
  // webhook.
  if (!webhookSecret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET is not set — refusing to process');
    return new Response('Webhook not configured', { status: 500 });
  }
  if (!sig) {
    console.error('[webhook] missing stripe-signature header');
    return new Response('Missing signature', { status: 400 });
  }
  const valid = await verifyStripeSignature(rawBody, sig, webhookSecret);
  if (!valid) {
    console.error('[webhook] invalid Stripe signature');
    return new Response('Invalid signature', { status: 400 });
  }

  let event;
  try { event = JSON.parse(rawBody); }
  catch { return new Response('Invalid JSON', { status: 400 }); }

  const intent = event.data?.object;
  const meta   = intent?.metadata || {};

  // "NY 10025" (state + ZIP typed into one field) -> { state: "NY", zip: "10025" }.
  // A bare 2-letter state or a full state name is returned unchanged.
  const splitStateZip = (raw) => {
    const t = (raw || '').toString().trim();
    if (!t) return { state: null, zip: null };
    const m = t.match(/^(.*?)[\s,]+(\d{5}(?:-\d{4})?)$/);
    if (m) return { state: m[1].trim() || null, zip: m[2] };
    return { state: t, zip: null };
  };

  /* Set when a row could not be written, which is NOT the same as
     orderCreated being false: that is also what an idempotent retry of an
     order we already have looks like. A comment below used to say false meant
     duplicate, full stop, and that sentence is the reason nobody noticed a
     lost order had no alarm on it.

     Declared at handler scope on purpose, because the reply that tells Stripe
     to retry is written at the end of the handler, outside the succeeded
     branch. The first version of this edit declared it inside that branch and
     read it at the end; `node --check` passed, because an unresolved name is
     not a syntax error, and check-server-undefined is what caught it. */
  let orderInsertFailed = null;

  // ── payment_intent.succeeded ───────────────────────────────────────────────
  if (event.type === 'payment_intent.succeeded') {
    console.log(`Payment succeeded: ${intent.id} — ${intent.amount / 100} ${intent.currency.toUpperCase()} — ${meta.pkgKey || '?'} — itemCount: ${meta.itemCount || 1}`);

    // Create order record(s) in Supabase. Multi-item orders ship an `items`
    // array (or chunked items0..itemsN keys) in metadata; we parse that and
    // write one row per item. Legacy single-item orders write one row from
    // the top-level metadata fields.
    // Track whether a fresh order was created (vs duplicate webhook delivery).
    // If Supabase isn't configured (dev/test), default to true so emails still
    // fire — the de-dup is purely an idempotency guard for retried webhooks.
    let orderCreated = !(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY));


    // Country of the billing address, hoisted to the handler so the consent
    // record below can read it. billingCountry itself is declared inside the
    // Supabase block, and a reference to it from outside would throw, which in
    // a payment webhook means a 500 on a payment that already succeeded.
    let consentCountry = null;

    // Try to parse items metadata. Read here, above the database block, because
    // the order emails read them too (A204c).
    let items = null;
    try {
      if (meta.items) {
        items = JSON.parse(meta.items);
      } else if (meta.itemsChunks) {
        const n = parseInt(meta.itemsChunks, 10);
        let joined = '';
        for (let i = 0; i < n; i++) joined += meta[`items${i}`] || '';
        items = JSON.parse(joined);
      }
    } catch (e) {
      console.warn('[webhook] could not parse items metadata, falling back to single-item:', e);
    }

    // The number checkout showed the customer, from the metadata. A payment
    // made before the number was minted server-side has none, and gets the
    // number checkout derived for it then, from the payment itself, so a
    // retried delivery gets the same one. This was random per delivery, so
    // the customer's number matched no row and a retry wrote a second
    // order (A202, api/_lib/order-number.js).
    const baseOrderNum = meta.orderNum || legacyOrderNumber(intent);

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE
                     || process.env.SUPABASE_SERVICE_ROLE_KEY
                     || process.env.SUPABASE_SERVICE_KEY;
    if (supabaseUrl && serviceKey) {
      // Helper: unique QR token


      // ── Stripe Tax: record the transaction ──────────────────────────────
      // If the checkout computed a tax_calculation_id, we need to convert
      // that calculation into a transaction now that payment succeeded.
      // This is what tells Stripe Tax to include the sale in your tax
      // reports/filings. Without this step, tax is charged but not tracked.
      const taxCalcId = meta.taxCalculationId;
      const stripeSecret = process.env.STRIPE_SECRET_KEY;
      if (taxCalcId && stripeSecret) {
        try {
          const transPayload = new URLSearchParams();
          transPayload.set('calculation', taxCalcId);
          transPayload.set('reference',    baseOrderNum);
          const transRes = await fetch('https://api.stripe.com/v1/tax/transactions/create_from_calculation', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${stripeSecret}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: transPayload.toString(),
          });
          if (!transRes.ok) {
            const errJson = await transRes.json();
            console.warn('[webhook] Stripe Tax transaction create failed:', errJson.error?.message);
            // Don't block order creation — the tax was charged; worst case we
            // log it manually in the Stripe dashboard.
          } else {
            console.log(`[webhook] Stripe Tax transaction recorded for ${baseOrderNum}`);
          }
        } catch (e) {
          console.warn('[webhook] Stripe Tax transaction exception:', e);
        }
      }

      // Parse tax + subtotal metadata (in cents) for persistence on the order
      const taxAmount   = parseInt(meta.taxAmount   || '0', 10) / 100;
      const subtotalAmt = parseInt(meta.subtotal    || '0', 10) / 100;

      // ── Billing location ────────────────────────────────────────────────
      // Digital orders collect no shipping address, so geography had nothing to
      // read. Stripe attaches the billing address to the charge. It is not on
      // the PaymentIntent payload by default, so fetch the latest charge (the
      // secret key is already loaded above for tax). Best-effort: a failure
      // just leaves billing null, exactly as before.
      let billingState = null, billingCountry = null;
      try {
        const chargeAddr = intent.charges?.data?.[0]?.billing_details?.address
          || (intent.latest_charge && stripeSecret ? await (async () => {
            const cr = await fetch('https://api.stripe.com/v1/charges/' + intent.latest_charge, {
              headers: { Authorization: `Bearer ${stripeSecret}` },
            });
            if (!cr.ok) return null;
            const charge = await cr.json();
            return charge?.billing_details?.address || null;
          })() : null);
        if (chargeAddr) {
          billingState   = chargeAddr.state   || null;
          billingCountry = chargeAddr.country || null;
          consentCountry = billingCountry;
        }
      } catch (e) {
        console.warn('[webhook] billing address lookup failed:', e);
      }

      try {
        if (Array.isArray(items) && items.length > 0) {
          // Multi-item: one row per item
          for (let i = 0; i < items.length; i++) {
            const it = items[i];
            // Shipping is packed as "name|address|city|state" in metadata
            const shipParts = (it.s || '').split('|');
            const [shipName, shipAddr, shipCity, shipStateRaw] = shipParts;
            // The checkout State/ZIP field is one input, so shipStateRaw can be
            // "NY 10025". Keep just the leading state token for the state column.
            const shipState = splitStateZip(shipStateRaw).state;
            const suffix = items.length > 1 ? `-${i+1}` : '';
            const orderNum = `${baseOrderNum}${suffix}`;
            const insertRes = await fetch(`${supabaseUrl}/rest/v1/orders`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`,
                'Prefer': 'return=minimal',
              },
              body: JSON.stringify({
                order_num:               orderNum,
                buyer_name:              meta.buyerName || it.p1 || null,
                buyer_email:             intent.receipt_email ? intent.receipt_email.trim().toLowerCase() : null, // migration 102
                partner1_name:           it.p1 || null,
                partner2_name:           it.p2 || null,
                pkg_key:                 it.p,
                is_gift:                 !!it.g,
                is_physical:             !!it.ph,
                total:                   null, // itemized total — aggregate is on the PaymentIntent
                addon_workbook:          it.w || null,
                addon_reflection:        !!it.r,
                addon_budget:            !!it.b,
                addon_checklist:         !!it.c,
                addon_intimacy:          !!it.i,
                addon_conflict:          !!it.cf,
                gift_note:               it.gn || null,
                stripe_payment_intent_id: items.length > 1 ? `${intent.id}_${i}` : intent.id,
                workbook_status:         'pending',
                shipping_name:           shipName || null,
                shipping_address:        shipAddr || null,
                shipping_city:           shipCity || null,
                shipping_state:          shipState || null,
                billing_state:           billingState || null,
                billing_country:         billingCountry || null,
                // Tax (proportional share for multi-item; null for the single-item
                // case since the PaymentIntent's total already includes tax).
                tax_amount:              items.length > 1 ? null : (taxAmount || null),
                subtotal:                items.length > 1 ? null : (subtotalAmt || null),
                tax_calculation_id:      taxCalcId || null,
                promo_code:              meta.promoCode || null,
              }),
            });
            if (insertRes.ok) {
              orderCreated = true;
              console.log(`[webhook] order ${i+1}/${items.length} created: ${orderNum}`);
            } else if (insertRes.status === 409) {
              // UNIQUE constraint hit — webhook retry of an order we already
              // wrote. Idempotent skip; don't re-send confirmation email.
              console.log(`[webhook] order ${i+1}/${items.length} duplicate (webhook retry): ${orderNum}`);
            } else {
              const txt = await insertRes.text().catch(() => '');
              console.error(`[webhook] order ${i+1}/${items.length} insert failed:`, insertRes.status, txt);
              /* A paying customer with no order row. This used to be a line in
                 the Vercel log and nothing else, while the promo path beside it
                 reported the same failure to Sentry: the careful branch shows
                 what the author thought mattered and the careless one is the
                 money path. Reported, and the handler answers non-2xx below so
                 Stripe retries and shows the endpoint as failing somewhere
                 Ellie can see. The insert is idempotent on order_num, so a
                 retry cannot double-charge or double-send. */
              orderInsertFailed = `${insertRes.status} ${txt.slice(0, 200)}`;
              await reportToSentry(
                new Error(`order insert failed ${insertRes.status}: ${txt.slice(0, 300)}`),
                { route: '/api/stripe-webhook', order_num: orderNum },
              ).catch(() => {});
            }
          }
        } else {
          // Legacy single-item path
          const insertRes = await fetch(`${supabaseUrl}/rest/v1/orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`,
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              order_num:               baseOrderNum,
              buyer_name:              meta.buyerName || meta.partner1Name || null,
              buyer_email:             intent.receipt_email ? intent.receipt_email.trim().toLowerCase() : null, // migration 102
              partner1_name:           meta.partner1Name || null,
              partner2_name:           meta.partner2Name || null,
              pkg_key:                 meta.pkgKey || null,
              is_gift:                 meta.isGift === '1',
              is_physical:             meta.isPhysical === '1',
              total:                   (intent.amount / 100),
              addon_workbook:          meta.addonWorkbook || null,
              addon_reflection:        meta.addonReflection === '1',
              addon_budget:            meta.addonBudget === '1',
              addon_checklist:         meta.addonChecklist === '1',
              addon_intimacy:          meta.addonIntimacy === '1',
              addon_conflict:          meta.addonConflict === '1',
              gift_note:               meta.giftNote || null,
              stripe_payment_intent_id: intent.id,
              workbook_status:         'pending',
              billing_state:           billingState || null,
              billing_country:         billingCountry || null,
              tax_amount:              taxAmount || null,
              subtotal:                subtotalAmt || null,
              tax_calculation_id:      taxCalcId || null,
              promo_code:              meta.promoCode || null,
            }),
          });
          if (insertRes.ok) {
            orderCreated = true;
            console.log(`[webhook] order created: ${baseOrderNum}`);
          } else if (insertRes.status === 409) {
            console.log(`[webhook] order duplicate (webhook retry): ${baseOrderNum}`);
          } else {
            const txt = await insertRes.text().catch(() => '');
            console.error('[webhook] order insert failed:', insertRes.status, txt);
            /* See the note on the multi-item branch above. */
            orderInsertFailed = `${insertRes.status} ${txt.slice(0, 200)}`;
            await reportToSentry(
              new Error(`order insert failed ${insertRes.status}: ${txt.slice(0, 300)}`),
              { route: '/api/stripe-webhook', order_num: baseOrderNum },
            ).catch(() => {});
          }
        }
      } catch(e) {
        console.error('[webhook] order creation failed:', e);
        orderInsertFailed = String(e && e.message || e);
        await reportToSentry(e, { route: '/api/stripe-webhook', stage: 'order insert' }).catch(() => {});
      }
    }

    // ── The consent event ───────────────────────────────────────────────
    //
    // The EULA on /legal takes the position that buying is the act of
    // agreeing: "By purchasing or accessing Assessment Content, you agree to
    // the terms of this EULA." The retention policy then promises a
    // timestamped record of that, kept for seven years and surviving account
    // deletion, and nothing recorded one.
    //
    // Written once per payment rather than once per line item: one purchase is
    // one agreement, however many things were in the basket.
    //
    // Best-effort by design. A consent record that could not be written must
    // not fail a payment that already went through.
    if (orderCreated && intent.receipt_email) {
      await recordConsent({
        email: intent.receipt_email,
        source: 'checkout',
        country: consentCountry,
      });
    }

    // Recompute stored entitlements for the buyer if they already have an
    // account. Orders are guest-created here (no user_id yet), so this only
    // fires for existing accounts (e.g. an add-on purchase by someone already
    // signed up). New buyers get entitlements computed when their order links
    // at account setup.
    if (orderCreated && intent.receipt_email && supabaseUrl && serviceKey) {
      try {
        const em = intent.receipt_email.toLowerCase();
        const profRes = await fetch(`${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(em)}&select=id&limit=1`, {
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        });
        const profs = profRes.ok ? await profRes.json().catch(() => []) : [];
        if (Array.isArray(profs) && profs[0]?.id) {
          const _ent = await writeEntitlements({ supabaseUrl, serviceKey, userId: profs[0].id, email: em });
          if (!_ent.ok) console.warn('[webhook] entitlements recompute failed:', _ent.error);
          else console.log('[webhook] entitlements recomputed for', profs[0].id);
        }
      } catch (e) { console.warn('[webhook] entitlements recompute error:', e); }
    }

    /**
     * ── AND COUNT THE PROMO CODE, NOW THAT IT HAS BEEN PAID FOR ──────────
     * A paid order's code is counted here rather than when the payment was
     * created, so a declined card or a closed tab no longer spends it
     * (api/_lib/promo-claim.js, A204e). Not on a retried delivery, and never
     * a reason to fail a payment that has gone through: a code that could
     * not be counted is reported, and at worst can be used once more.
     */
    const promoClaim = String(meta.promoClaim || '').trim();
    if (promoClaim && orderCreated && supabaseUrl && serviceKey) {
      const count = Array.isArray(items) && items.length ? items.length : 1;
      const row = await readPromoRow({ supabaseUrl, serviceKey, code: promoClaim });
      const counted = row !== undefined && await claimPromoUse({
        supabaseUrl, serviceKey, code: promoClaim, row, count,
        packageKey: meta.pkgKey || null, buyerEmail: intent.receipt_email,
      });
      if (!counted) {
        await reportToSentry(new Error(`promo ${promoClaim} paid for but not counted`), { route: '/api/stripe-webhook', extra: { intent: intent.id } }).catch(() => {});
      }
    }

    /**
     * ── ONE CONFIRMATION, ELLIE'S ────────────────────────────────────────
     * This built a second confirmation inline, in its own design, that never
     * appeared in /email-preview and left Conflict Patterns off, while checkout
     * posted the order to /api/send-order-email for hers. Every card buyer got
     * both, under the same subject, and Apple Pay buyers only this one. Ellie:
     * "Keep only mine." (A203b, A204c.)
     *
     * Hers now, from here, one set per item as checkout sent them: the
     * webhook is the moment a payment is known whether or not the buyer kept
     * the tab open. Skipped on a retried delivery (orderCreated is false), so
     * nobody is emailed twice for one payment.
     */
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey && intent.receipt_email && orderCreated) {
      const list = Array.isArray(items) && items.length ? items : [{
        p: meta.pkgKey, p1: meta.partner1Name, p2: meta.partner2Name,
        g: meta.isGift === '1', ph: meta.isPhysical === '1', w: meta.addonWorkbook || '',
        r: meta.addonReflection === '1', b: meta.addonBudget === '1', i: meta.addonIntimacy === '1',
        cf: meta.addonConflict === '1', c: meta.addonChecklist === '1', gn: meta.giftNote || '',
      }];
      for (let i = 0; i < list.length; i++) {
        const ctx = orderEmailContext({
          compact: list[i],
          buyerName: meta.buyerName || list[i].p1 || null,
          buyerEmail: intent.receipt_email,
          orderNum: list.length > 1 ? `${baseOrderNum}-${i + 1}` : baseOrderNum,
          // One item: exactly what was charged before tax. Several: each
          // item's own lines, less its package where a promo covered it.
          charged: list.length === 1 && meta.subtotal ? Number(meta.subtotal) / 100 : null,
          promoCoversBase: meta.promoCoversBase === '1',
        });
        const r = await sendOrderEmails(ctx, apiKey).catch((err) => ({ failed: 1, err }));
        if (r.failed) console.warn('[webhook] order email failed for item', i + 1, r.err?.message || '');
      }


      // The QR card that shipped in a physical box is retired. Ellie: "No gift
      // cards were printed, and all should be retired from the code, we
      // abandoned that workstream." The block here built a card URL and stored
      // it on the order for the admin to print.

    }
  }

  // ── payment_intent.payment_failed ──────────────────────────────────────────
  if (event.type === 'payment_intent.payment_failed') {
    const reason = intent.last_payment_error?.message || 'unknown';
    console.error(`Payment failed: ${intent.id} — ${reason}`);
    // Nothing further to do server-side — the frontend already handles
    // showing error messages to the user via the Stripe Elements error state.
  }

  /* Stripe retries a non-2xx with backoff and shows the endpoint as failing
     in its dashboard. That is the only place a lost order becomes visible
     without reading Vercel logs, and the inserts above are idempotent on
     order_num, so a retry writes the missing row and nothing twice. */
  if (orderInsertFailed) {
    return new Response(JSON.stringify({ received: false, error: 'order row not written' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
