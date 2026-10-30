#!/usr/bin/env node
/**
 * check-refunds: a full refund in Stripe takes the access away and stops the
 * sale counting (A204f). Ellie, asked (a) take access away and stop counting,
 * (b) only stop counting, (c) leave it: "A".
 *
 * RUNS the webhook with a signed charge.refunded and the database stubbed,
 * and asks the database what happened:
 *   1. the order is copied to refunded_orders BEFORE it is deleted from
 *      orders, so a failure between the two loses nothing;
 *   2. the buyer and the partner who joined by their invite both lose the
 *      package and the add-on the refunded order granted, and keep an add-on
 *      it did not grant (a hand grant, as migration 101 made);
 *   3. what another order still grants is kept;
 *   4. both get entitlements rewritten with revokedAt, which the website
 *      reads to drop what it kept on a device;
 *   5. a comp account is not touched;
 *   6. a failed copy deletes nothing and answers 500, so Stripe retries;
 *   7. a retry after the move still puts the accounts right;
 *   8. a partial refund changes nothing, a lost chargeback is a full
 *      refund, and a won one is nothing;
 *   9. the website's forgetRevokedGrants runs before the grant-only merge,
 *      and deleting an account removes its refunded orders too.
 *
 * Planted: the copy's failure unchecked, the invitee left out, every add-on
 * cleared regardless of what was refunded, revokedAt dropped, the website's
 * call removed, and a partial refund treated as full. All six fail it.
 */
import { readFileSync } from 'node:fs';

Object.assign(process.env, {
  SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_KEY: 'k',
  STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_test',
});
const ROOT = new URL('..', import.meta.url).pathname;
const { default: webhook } = await import('../api/stripe-webhook.js');

async function sign(body) {
  const t = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(process.env.STRIPE_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`));
  return `t=${t},v1=${[...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

const BUYER = '11111111-1111-4111-8111-111111111111';
const INVITEE = '22222222-2222-4222-8222-222222222222';
const COMP = '33333333-3333-4333-8333-333333333333';
const PI = 'pi_test_REFUND1';
const REFUNDED = { order_num: 'ATT-20261030-REFUND', user_id: BUYER, buyer_email: 'buyer@example.com', stripe_payment_intent_id: PI, pkg_key: 'premium', addon_conflict: true, addon_budget: true, created_at: '2026-10-01' };
const KEPT = { order_num: 'ATT-20260901-KEEPER', user_id: BUYER, buyer_email: 'buyer@example.com', stripe_payment_intent_id: 'pi_other', pkg_key: 'core', addon_budget: true, created_at: '2026-09-01' };

async function run({ refunded = true, ordersLeft = true, alreadyMoved = false, failCopy = false, people = null }) {
  const calls = [];
  const profiles = structuredClone(people || [
    { id: BUYER, email: 'buyer@example.com', pkg: 'premium', addon_conflict: true, addon_budget: true, addon_intimacy: true, entitlements: {} },
    { id: INVITEE, email: 'partner@example.com', pkg: 'premium', addon_conflict: true, joined_via_invite: true, partner_profile_id: BUYER, entitlements: {} },
  ]);
  globalThis.fetch = async (url, init = {}) => {
    const u = decodeURIComponent(String(url)); const m = (init.method || 'GET').toUpperCase();
    const path = u.replace('https://db.test/rest/v1/', '');
    calls.push({ m, path, body: init.body ? JSON.parse(String(init.body)) : null });
    const j = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } });
    if (path.startsWith('orders?or=(stripe')) return j(ordersLeft && !alreadyMoved ? [REFUNDED] : []);
    if (path.startsWith('refunded_orders') && m === 'POST') return failCopy ? j({ message: 'x' }, 500) : new Response(null, { status: 201 });
    if (path.startsWith('refunded_orders') && m === 'GET') return j(alreadyMoved ? [{ order_row: REFUNDED }] : []);
    if (path.startsWith('orders') && m === 'DELETE') return new Response(null, { status: 204 });
    if (path.startsWith('profiles?or=')) return j(profiles.filter((p) => !p.joined_via_invite));
    if (path.startsWith('profiles?partner_profile_id')) return j(profiles.filter((p) => p.joined_via_invite));
    if (path.startsWith('profiles?id=eq.') && m === 'GET') return j(profiles.filter((p) => path.includes(p.id)));
    if (path.startsWith('profiles') && m === 'PATCH') {
      // Remembered, so the recompute after it reads what was written.
      for (const p of profiles) if (path.includes(p.id)) Object.assign(p, JSON.parse(String(init.body)));
      return new Response(null, { status: 204 });
    }
    // What the remaining orders grant: the buyer's other order, which the
    // invitee reaches through the partner link.
    if (path.startsWith('orders?user_id=eq.' + BUYER) || path.startsWith('orders?buyer_email=eq.buyer')) return j([KEPT]);
    if (path.startsWith('orders?')) return j([]);
    return j([]);
  };
  const body = JSON.stringify({ type: 'charge.refunded', created: 1793000000, data: { object: { id: 'ch_1', payment_intent: PI, refunded, amount_refunded: refunded ? 33700 : 1000 } } });
  const quiet = [console.warn, console.log, console.error]; console.warn = console.log = console.error = () => {};
  const r = await webhook(new Request('https://www.attune-relationships.com/api/stripe-webhook', { method: 'POST', headers: { 'stripe-signature': await sign(body) }, body }));
  [console.warn, console.log, console.error] = quiet;
  return { status: r.status, calls };
}

const fails = [];
const patchesFor = (calls, id) => calls.filter((c) => c.m === 'PATCH' && c.path.startsWith(`profiles?id=eq.${id}`)).map((c) => c.body);
const columnPatch = (calls, id) => patchesFor(calls, id).find((b) => !('entitlements' in b)) || {};
const blobPatch = (calls, id) => patchesFor(calls, id).find((b) => 'entitlements' in b);

const full = await run({});
const iCopy = full.calls.findIndex((c) => c.m === 'POST' && c.path.startsWith('refunded_orders'));
const iDel = full.calls.findIndex((c) => c.m === 'DELETE' && c.path.startsWith('orders'));
if (full.status !== 200) fails.push(`a full refund answered ${full.status}`);
if (iCopy < 0 || iDel < 0 || iCopy > iDel) fails.push(`the order must be copied to refunded_orders before it is deleted from orders (copy at ${iCopy}, delete at ${iDel})`);
for (const [who, id] of [['the buyer', BUYER], ['the invited partner', INVITEE]]) {
  const p = columnPatch(full.calls, id);
  if (p.addon_conflict !== false) fails.push(`${who} keeps Conflict Patterns, which only the refunded order granted`);
  if (p.pkg !== 'core') fails.push(`${who}'s package is ${p.pkg === undefined ? 'left at premium' : p.pkg}, where what is left grants core`);
  const blob = blobPatch(full.calls, id);
  if (!blob?.entitlements?.revokedAt) fails.push(`${who}'s stored entitlements carry no revokedAt, so a browser that saw the add-on keeps it`);
  if (blob && (blob.entitlements.pkg !== 'core' || blob.entitlements.addonConflict)) fails.push(`${who}'s stored entitlements still grant ${blob.entitlements.pkg}${blob.entitlements.addonConflict ? ' and Conflict Patterns' : ''}`);
}
const bp = columnPatch(full.calls, BUYER);
if ('addon_intimacy' in bp) fails.push('an add-on the refunded order never granted (a hand grant) was cleared');
if ('addon_budget' in bp) fails.push('Build a Budget was cleared although another order still grants it');

const comp = await run({ people: [{ id: COMP, email: 'buyer@example.com', is_comp: true, pkg: 'premium', addon_conflict: true, entitlements: {} }] });
if (patchesFor(comp.calls, COMP).length) fails.push('a comp account was changed by a refund');

const noCopy = await run({ failCopy: true });
if (noCopy.status !== 500) fails.push(`a copy that failed answered ${noCopy.status}, so Stripe would not retry`);
if (noCopy.calls.some((c) => c.m === 'DELETE')) fails.push('a copy that failed still deleted the order, which loses it');

const retry = await run({ alreadyMoved: true });
if (columnPatch(retry.calls, BUYER).addon_conflict !== false) fails.push('a retry after the move left the accounts as they were');

// A lost chargeback takes the same path as a full refund; a won one does not.
async function dispute(status) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => { calls.push(String(url)); return new Response('[]', { status: 200 }); };
  const body = JSON.stringify({ type: 'charge.dispute.closed', created: 1793000000, data: { object: { id: 'dp_1', charge: 'ch_1', payment_intent: PI, status } } });
  const q = [console.warn, console.log, console.error]; console.warn = console.log = console.error = () => {};
  await webhook(new Request('https://www.attune-relationships.com/api/stripe-webhook', { method: 'POST', headers: { 'stripe-signature': await sign(body) }, body }));
  [console.warn, console.log, console.error] = q;
  return calls.some((u) => decodeURIComponent(u).includes(`stripe_payment_intent_id.eq.${PI}`));
}
if (!(await dispute('lost'))) fails.push('a chargeback the customer won (dispute closed, status lost) did not take the order back');
if (await dispute('won')) fails.push('a chargeback we won took the order back');

const partial = await run({ refunded: false });
if (partial.calls.length) fails.push(`a partial refund made ${partial.calls.length} database calls; it should change nothing`);

const app = readFileSync(`${ROOT}src/App.jsx`, 'utf8');
const resolve = (app.match(/async function resolveEntitlements[\s\S]*?\n\}/) || [''])[0];
if (!/forgetRevokedGrants\(blob\)/.test(resolve) || resolve.indexOf('forgetRevokedGrants(blob)') > resolve.indexOf('mergeEntitlementsGrantOnly(')) {
  fails.push('the website does not act on revokedAt before its grant-only merge, so a refunded add-on stays on any browser that had it');
}
const del = readFileSync(`${ROOT}api/delete-account.js`, 'utf8');
if (!/from\('refunded_orders'\)\s*\.delete\(\)/.test(del)) fails.push("deleting an account leaves its refunded orders, which carry the person's name and address");

if (fails.length) {
  console.error('[check-refunds] ' + fails.length + ' problem(s):');
  for (const f of fails) console.error('  ' + f);
  process.exit(1);
}
console.log('[check-refunds] a full refund moves the order (copy, then delete), takes back what only it granted from the buyer and the invited partner, keeps a hand grant and what other orders grant, marks revokedAt, leaves comp alone, retries on failure; a partial refund changes nothing.');
