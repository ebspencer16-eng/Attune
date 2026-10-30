#!/usr/bin/env node
/**
 * check-one-confirmation: a paid order sends one confirmation, Ellie's, with
 * the shop's names on it.
 *
 * Every card order sent two (A203b): checkout posted to /api/send-order-email
 * for hers, and the Stripe webhook built an older one inline that was never
 * in /email-preview and left Conflict Patterns off. Ellie: "Keep only mine."
 * The webhook sends hers now, and checkout posts only for a free promo order,
 * which has no webhook (A204c). And the receipt names its lines what the shop
 * does (A204d): api/_catalogue.js SHOP_NAMES.
 *
 * RUNS the webhook with a signed payment and Resend stubbed, and counts what
 * is sent:
 *   1. exactly one "Attune Order Confirmation" per item, and it is the
 *      catalogue's (it carries the order number and the setup link);
 *   2. its lines use SHOP_NAMES, and an add-on the package includes is not
 *      charged on it;
 *   3. checkout posts to /api/send-order-email only behind isFreePromo.
 *
 * Planted: the old inline email restored beside the new one (two
 * confirmations), checkout's guard removed, and a line named "Shared
 * Budgeting Activity". All three fail it.
 */
import { readFileSync } from 'node:fs';
import { SITE_URL } from '../api/_lib/site.js';
import { SHOP_NAMES } from '../api/_catalogue.js';

Object.assign(process.env, {
  SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_KEY: 'k',
  STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_test', RESEND_API_KEY: 're_test',
});
const ROOT = new URL('..', import.meta.url).pathname;
const { default: webhook } = await import('../api/stripe-webhook.js');

async function sign(body) {
  const t = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(process.env.STRIPE_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`));
  return `t=${t},v1=${[...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

const sent = [];
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.startsWith('https://api.resend.com/emails')) { sent.push(JSON.parse(String(init.body))); return new Response('{"id":"e"}', { status: 200 }); }
  if (u.includes('/rest/v1/orders') && (init.method || 'GET') === 'POST') return new Response(null, { status: 201 });
  return new Response('[]', { status: 200 });
};

const items = [
  { p: 'premium', p1: 'Maya', p2: 'Alex', ph: 0, g: 0, w: 'digital', r: 1, b: 0, i: 0, cf: 0, c: 0, gn: '', s: '' },
  { p: 'core', p1: 'Sam', p2: 'Jo', ph: 0, g: 0, w: '', r: 0, b: 1, i: 0, cf: 1, c: 0, gn: '', s: '' },
];
const event = JSON.stringify({
  type: 'payment_intent.succeeded',
  data: { object: { id: 'pi_test_ONE1', created: Math.floor(Date.now() / 1000), amount: 33700, currency: 'usd', receipt_email: 'buyer@example.com',
    metadata: { orderNum: 'ATT-20261030-CONFRM', buyerName: 'Maya', itemCount: '2', items: JSON.stringify(items) } } },
});
const w = console.warn, l = console.log, e = console.error;
console.warn = () => {}; console.log = () => {}; console.error = () => {};
await webhook(new Request(`${SITE_URL}/api/stripe-webhook`, { method: 'POST', headers: { 'stripe-signature': await sign(event) }, body: event }));
console.warn = w; console.log = l; console.error = e;

const fails = [];
const confirmations = sent.filter((m) => m.subject === 'Attune Order Confirmation');
if (confirmations.length !== items.length) {
  fails.push(`a payment for ${items.length} items sent ${confirmations.length} "Attune Order Confirmation" emails; it should send one per item`);
}
for (const [i, num] of [[0, 'ATT-20261030-CONFRM-1'], [1, 'ATT-20261030-CONFRM-2']]) {
  const m = confirmations.find((x) => x.html.includes(num));
  if (!m) { fails.push(`no confirmation carries ${num}: the catalogue's confirmation names its order, and the one sent did not`); continue; }
  // Read as text, not markup: the layout of a row is the template's business.
  const text = m.html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  if (i === 0 && /Relationship Reflection \$\d/.test(text)) fails.push('a premium order lists Relationship Reflection as a charge, and premium includes it');
  if (i === 1 && !m.html.includes(SHOP_NAMES.conflict)) fails.push(`the confirmation for an order with Conflict Patterns does not list "${SHOP_NAMES.conflict}"`);
  if (i === 1 && !m.html.includes(SHOP_NAMES.budget)) fails.push(`the confirmation for an order with the budget does not call it "${SHOP_NAMES.budget}", the shop's name`);
}
if (sent.some((m) => /Shared Budgeting Activity|Relationship Reflection exercise/.test(m.html || ''))) {
  fails.push('a confirmation uses a receipt name the shop does not ("Shared Budgeting Activity" or "Relationship Reflection exercise")');
}

const page = readFileSync(`${ROOT}public/checkout.html`, 'utf8');
const call = page.indexOf("fetch('/api/send-order-email'");
const guard = page.lastIndexOf('if (isFreePromo) for (const it of _items) {', call);
if (call < 0) fails.push('checkout no longer posts to /api/send-order-email at all, so a free promo order gets no confirmation');
else if (guard < 0 || call - guard > 2500) fails.push('checkout posts to /api/send-order-email for every order; the webhook already sends a paid order\'s, so card buyers get two');

if (fails.length) {
  console.error('[check-one-confirmation] ' + fails.length + ' problem(s):');
  for (const x of fails) console.error('  ' + x);
  process.exit(1);
}
console.log(`[check-one-confirmation] a two-item payment through the webhook sent ${sent.length} emails, one catalogue confirmation per item with the shop's names, and checkout posts only for a free order.`);
