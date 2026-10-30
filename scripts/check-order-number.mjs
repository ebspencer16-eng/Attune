#!/usr/bin/env node
/**
 * check-order-number: the number a customer holds is the number their order
 * is stored under.
 *
 * A card order was numbered twice: checkout derived one from the payment id
 * and showed, emailed and linked it; the webhook, given none, stored a random
 * one. So /api/claim-order could not find any card order by the number in
 * the customer's own setup link, and a retried webhook delivery, drawing a
 * new random number, wrote a second order (A202). See api/_lib/order-number.js.
 *
 * RUNS both endpoints with Stripe and the database stubbed, and asks:
 *   1. the number /api/create-payment-intent puts in the payment's metadata is
 *      the number it returns to checkout;
 *   2. on an idempotent retry, where Stripe hands back the payment made the
 *      first time, the number returned is that payment's, not a fresh one;
 *   3. the webhook stores the metadata's number, and a second delivery of the
 *      same event tries to store the SAME number (so the unique order number
 *      refuses it);
 *   4. a payment with no number in its metadata, made before this existed,
 *      gets the same number on every delivery, and it is the one checkout
 *      showed for it;
 *   5. checkout prefers the server's number on both of its payment paths;
 *   6. a card order placed before this, whose customer holds the old derived
 *      number, is claimed through its payment when exactly one matches,
 *      refused when two do, and a failed read is 503 rather than not found;
 *   7. the sign-in help page (/api/order-email-hint) finds orders by the same
 *      rule, shows the address masked, and answers 503 on a failed read.
 *
 * Planted: the endpoint ignoring Stripe's metadata on return, the webhook
 * going back to a random number, and checkout's card path going back to its
 * own derivation. All three fail it.
 */
import { readFileSync } from 'node:fs';

import { SITE_URL } from '../api/_lib/site.js';
process.env.SUPABASE_URL = 'https://db.test';
process.env.SUPABASE_SERVICE_KEY = 'k';
process.env.STRIPE_SECRET_KEY = 'sk_test_x';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
const ROOT = new URL('..', import.meta.url).pathname;
const { default: createIntent } = await import('../api/create-payment-intent.js');
const { default: webhook } = await import('../api/stripe-webhook.js');

const fails = [];
const quiet = async (fn) => {
  const w = console.warn, e = console.error, l = console.log;
  console.warn = () => {}; console.error = () => {}; console.log = () => {};
  try { return await fn(); } finally { console.warn = w; console.error = e; console.log = l; }
};

/* ── 1 and 2: the endpoint ─────────────────────────────────────────────── */
async function create(stripeEcho) {
  let sentMeta = null;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.startsWith('https://api.stripe.com/v1/payment_intents')) {
      const form = new URLSearchParams(String(init.body || ''));
      sentMeta = form.get('metadata[orderNum]');
      const meta = { orderNum: stripeEcho ?? sentMeta };
      return new Response(JSON.stringify({ id: 'pi_test_ABCD', client_secret: 'cs', metadata: meta, amount: 8900 }), { status: 200 });
    }
    if (u.startsWith('https://api.stripe.com/')) return new Response(JSON.stringify({ id: 'taxcalc_1', amount_total: 8900, tax_amount_exclusive: 0 }), { status: 200 });
    return new Response('[]', { status: 200 });
  };
  const r = await quiet(() => createIntent(new Request(`${SITE_URL}/api/create-payment-intent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: `${SITE_URL}` },
    body: JSON.stringify({
      idempotencyKey: 'k1',
      items: [{ pkgKey: 'core', partner1Name: 'A', partner2Name: 'B' }],
      buyerEmail: 'buyer@example.com',
      customerAddress: { country: 'US', postal_code: '10001', state: 'NY', city: 'NY', line1: '1 St' },
    }),
  })));
  return { status: r.status, body: await r.json().catch(() => ({})), sentMeta };
}
const first = await create(null);
if (first.status !== 200) fails.push(`the payment endpoint did not create a payment in the stub (${first.status} ${JSON.stringify(first.body).slice(0, 120)}); nothing below means anything`);
else {
  if (!/^ATT-\d{8}-[A-Z0-9]{6}$/.test(first.sentMeta || '')) fails.push(`the number put in the payment's metadata is not a minted one: ${first.sentMeta}`);
  if (first.body.orderNum !== first.sentMeta) fails.push(`the endpoint returned ${first.body.orderNum} to checkout and put ${first.sentMeta} in the payment: the customer would hold a number no order is stored under`);
  const retry = await create('ATT-20260101-FIRST1');
  if (retry.body.orderNum !== 'ATT-20260101-FIRST1') fails.push(`on an idempotent retry Stripe returned the first payment (number ATT-20260101-FIRST1) and the endpoint returned ${retry.body.orderNum}: the customer would hold the retry's number, which nothing stores`);
}

/* ── 3 and 4: the webhook ──────────────────────────────────────────────── */
async function sign(body) {
  const t = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(process.env.STRIPE_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`));
  return `t=${t},v1=${[...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}
async function deliver(meta) {
  const stored = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.includes('/rest/v1/orders') && (init.method || 'GET') === 'POST') {
      const row = JSON.parse(String(init.body));
      for (const r of [].concat(row)) stored.push(r.order_num);
      return new Response(null, { status: 201 });
    }
    return new Response('[]', { status: 200 });
  };
  const event = JSON.stringify({
    type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_3Q9zLegacyWXYZ', created: Date.UTC(2026, 9, 30, 12) / 1000, amount: 8900, currency: 'usd', receipt_email: 'buyer@example.com', metadata: { pkgKey: 'core', partner1Name: 'A', partner2Name: 'B', itemCount: '1', ...meta } } },
  });
  await quiet(async () => webhook(new Request(`${SITE_URL}/api/stripe-webhook`, {
    method: 'POST', headers: { 'stripe-signature': await sign(event) }, body: event,
  })));
  return stored;
}
const a = await deliver({ orderNum: 'ATT-20261030-QWERTY' });
const b = await deliver({ orderNum: 'ATT-20261030-QWERTY' });
if (!a.length) fails.push('the webhook stored no order in the stub; nothing about it below means anything');
else {
  if (a[0] !== 'ATT-20261030-QWERTY') fails.push(`the webhook stored ${a[0]} for a payment whose metadata says ATT-20261030-QWERTY`);
  if (b[0] !== a[0]) fails.push(`a second delivery of the same payment tried to store ${b[0]} after ${a[0]}: a different number is a second order, not a refused duplicate`);
}
const l1 = await deliver({});
const l2 = await deliver({});
if (!l1.length || l1[0] !== l2[0]) fails.push(`a payment with no number in its metadata was stored as ${l1[0]} and then ${l2[0]}: a retry must get the same number`);
if (l1[0] !== 'ATT-20261030-WXYZ') fails.push(`a payment with no number in its metadata was stored as ${l1[0]}; checkout showed that customer ATT-20261030-WXYZ (its date and the last four of the payment id)`);

/* ── 6: an order placed before the number was minted can still be claimed ─ */
const { default: claim } = await import('../api/claim-order.js');
async function claimWith(orderNum, db) {
  let patched = null;
  globalThis.fetch = async (url, init = {}) => {
    const u = decodeURIComponent(String(url));
    if (u.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'u1', email: 'buyer@example.com', app_metadata: { provider: 'apple' } }), { status: 200 });
    if (u.includes('/rest/v1/orders') && (init.method || 'GET') === 'PATCH') { patched = u; return new Response(null, { status: 204 }); }
    if (u.includes('/rest/v1/orders')) return db(u);
    if (u.includes('/rest/v1/profiles')) return new Response('[{"id":"u1"}]', { status: 200 });
    return new Response('[]', { status: 200 });
  };
  const r = await quiet(() => claim(new Request(`${SITE_URL}/api/claim-order`, {
    method: 'POST', headers: { authorization: 'Bearer not-a-jwt', 'content-type': 'application/json' },
    body: JSON.stringify({ orderNum }),
  })));
  return { status: r.status, patched };
}
const OLD = 'ATT-20261030-WXYZ';
const byPayment = (rows) => (u) => (u.includes('stripe_payment_intent_id') ? new Response(JSON.stringify(rows), { status: 200 }) : new Response('[]', { status: 200 }));
const one = await claimWith(OLD, byPayment([{ order_num: 'ATT-20261030-S27W', user_id: null, buyer_email: 'b@example.com', stripe_payment_intent_id: 'pi_3Q9zLegacyWXYZ' }]));
if (one.status !== 200 || !/order_num=in\.\("ATT-20261030-S27W"\)/.test(one.patched || '')) fails.push(`an old card order (customer holds ${OLD}, stored as ATT-20261030-S27W) was not claimed through its payment: ${one.status}, patched ${one.patched}`);
const two = await claimWith(OLD, byPayment([
  { order_num: 'ATT-20261030-AAAA', user_id: null, stripe_payment_intent_id: 'pi_1xxWXYZ' },
  { order_num: 'ATT-20261030-BBBB', user_id: null, stripe_payment_intent_id: 'pi_2yyWXYZ' }]));
if (two.status !== 404 || two.patched) fails.push(`two payments ending in WXYZ on that day, and the claim picked one (${two.status}): a guess must be refused`);
const down = await claimWith(OLD, () => new Response('{"message":"x"}', { status: 500 }));
if (down.status !== 503) fails.push(`a failed order read answered ${down.status}; "not found" would send a customer who paid to the no-purchase screen`);

/* ── 7: the help page finds what claiming finds, and shows it masked ─────── */
const { default: hint } = await import('../api/order-email-hint.js');
async function hintFor(orderNum, db) {
  globalThis.fetch = async (url) => db(decodeURIComponent(String(url)));
  const r = await quiet(() => hint(new Request(`${SITE_URL}/api/order-email-hint`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderNum }),
  })));
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
const h1 = await hintFor(OLD, byPayment([{ order_num: 'ATT-20261030-S27W', buyer_email: 'maya@example.com', stripe_payment_intent_id: 'pi_3Q9zLegacyWXYZ' }]));
if (h1.body.hint !== 'm•••@e•••.com') fails.push(`the help page, given an old card number, answered ${JSON.stringify(h1.body)}; it should find the order through its payment, as claiming does, and show m•••@e•••.com`);
if (JSON.stringify(h1.body).includes('maya@example.com')) fails.push('the help page sent the full address; anybody can type an order number');
const h2 = await hintFor('ATT-20261030-NOSUCH', () => new Response('[]', { status: 200 }));
if (h2.status !== 200 || h2.body.found !== false) fails.push(`an unknown order number answered ${h2.status} ${JSON.stringify(h2.body)}, not found: false`);
const h3 = await hintFor('ATT-20261030-NOSUCH', () => new Response('{"message":"x"}', { status: 500 }));
if (h3.status !== 503) fails.push(`a failed read on the help page answered ${h3.status}; "not found" would tell somebody their order does not exist`);

/* ── 5: checkout ───────────────────────────────────────────────────────── */
const page = readFileSync(`${ROOT}public/checkout.html`, 'utf8');
const prefers = page.match(/const realOrderNum = [^;]*?serverOrderNum \|\|/g) || [];
if (prefers.length !== 2) fails.push(`checkout prefers the server's order number on ${prefers.length} of its 2 payment paths (card form and Apple Pay); the other shows a number of its own`);

if (fails.length) {
  console.error('[check-order-number] ' + fails.length + ' problem(s):');
  for (const x of fails) console.error('  ' + x);
  process.exit(1);
}
console.log('[check-order-number] one number per order: minted by the payment endpoint, returned to checkout (the first payment\'s on a retry), stored by the webhook on every delivery, and preferred by both checkout paths.');
