#!/usr/bin/env node
/**
 * Nobody uses the app without a purchase behind their account.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie (A191): "Mya just let me know that she went through the app, but she
 * never placed an order. The app let her make an account and access the
 * platform without a purchase. I thought we fixed this."
 *
 * The app has no sign-up form, and that was the fix everyone remembered.
 * Continue with Google and Continue with Apple create an account for any
 * address all the same; the app found no profile, drew its own setup, and
 * /api/create-profile wrote a free core profile. Nothing between that and
 * every tab asked whether anybody had paid.
 *
 * ── WHAT IT RUNS ──────────────────────────────────────────────────────────
 * The rule, api/_lib/purchase-gate.js, against a stubbed database, every way
 * in and the ways it must stay open:
 *   no orders anywhere                              -> no
 *   an order by the account's id / by its email     -> yes
 *   a comp account                                   -> yes
 *   a partner who bought, by the couple link         -> yes
 *   an invite code whose owner bought                -> yes
 *   an invite code whose owner did not               -> no
 *   a read that failed                               -> unknown, never no
 * Then the two doors, run: /api/create-profile on the app's path (a token)
 * refuses with no_purchase and writes nothing, and still serves the website
 * (no token) as before; /api/home refuses an account with nothing bought and
 * serves one with an order it only finds by email.
 */
import { SITE_URL } from '../api/_lib/site.js';

Object.assign(process.env, {
  SUPABASE_URL: 'https://example.invalid',
  SUPABASE_SERVICE_KEY: 'test-not-a-real-key',
  SUPABASE_ANON_KEY: 'test-not-a-real-key',
});
const ME = '11111111-1111-4111-8111-111111111111';
const PT = '22222222-2222-4222-8222-222222222222';
const EMAIL = 'new@example.invalid';
const fails = [];
const ok = (v) => new Response(JSON.stringify(v), { status: 200, headers: { 'content-type': 'application/json' } });
const down = () => new Response('{"message":"timeout"}', { status: 503, headers: { 'content-type': 'application/json' } });

/** A tiny database: profiles and orders, and a switch to break the orders. */
function stub(db) {
  const writes = [];
  const fetch = async (url, opts = {}) => {
    const u = decodeURIComponent(String(url));
    const method = (opts.method || 'GET').toUpperCase();
    if (u.includes('/auth/v1/user')) return ok({ id: ME, email: EMAIL });
    if (u.includes('/auth/v1/admin/users/')) return ok({ id: ME, email: EMAIL, app_metadata: { provider: 'google' } });
    if (u.includes('/rest/v1/orders')) {
      if (db.ordersDown) return down();
      const m = /user_id=eq\.([^&]+)/.exec(u) || /buyer_email=eq\.([^&]+)/.exec(u);
      const key = m && m[1];
      return ok((db.orders || []).filter((o) => o.user_id === key || o.buyer_email === key));
    }
    if (u.includes('/rest/v1/profiles')) {
      if (method !== 'GET') { writes.push({ u, method, body: String(opts.body || '') }); return ok([]); }
      const byCode = /invite_code=eq\.([^&]+)/.exec(u);
      if (byCode) return ok((db.profiles || []).filter((p) => p.invite_code === byCode[1]));
      const or = /or=\(([^)]*)\)/.exec(u);
      if (or) return ok((db.profiles || []).filter((p) => or[1].includes(p.id)));
      const byId = /id=eq\.([^&]+)/.exec(u);
      if (byId) return ok((db.profiles || []).filter((p) => p.id === byId[1]));
      return ok([]);
    }
    return ok([]);
  };
  return { fetch, writes };
}
const quiet = async (fn) => {
  const l = console.log; const e = console.error; const w = console.warn;
  console.log = () => {}; console.error = () => {}; console.warn = () => {};
  try { return await fn(); } finally { console.log = l; console.error = e; console.warn = w; }
};
const withDb = async (db, fn) => {
  const real = globalThis.fetch;
  const s = stub(db);
  globalThis.fetch = s.fetch;
  try { return { out: await quiet(fn), writes: s.writes }; } finally { globalThis.fetch = real; }
};

const { purchaseStatus } = await import('../api/_lib/purchase-gate.js');
const ask = (db, extra = {}) => withDb(db, () => purchaseStatus({
  supabaseUrl: process.env.SUPABASE_URL, serviceKey: process.env.SUPABASE_SERVICE_KEY,
  userId: ME, email: EMAIL, ...extra,
})).then((r) => r.out);

const order = (o) => ({ order_num: 'A-1', pkg_key: 'core', created_at: '2026-10-01T00:00:00Z', ...o });
const profile = (p) => ({ id: ME, email: EMAIL, pkg: 'core', invite_code: 'MINE1234', ...p });

// ── the rule ───────────────────────────────────────────────────────────────
const cases = [
  ['an account with no profile and no orders', {}, {}, false],
  ['a profile of pkg core with no orders (what the app used to make)', { profiles: [profile()] }, {}, false],
  ['an order by the account id', { profiles: [profile()], orders: [order({ user_id: ME })] }, {}, true],
  ['an order only by email, profile not made yet', { orders: [order({ buyer_email: EMAIL })] }, {}, true],
  ['an order only by email, with a profile', { profiles: [profile()], orders: [order({ buyer_email: EMAIL })] }, {}, true],
  ['a comp account', { profiles: [profile({ is_comp: true })] }, {}, true],
  ['a linked partner who bought', { profiles: [profile({ partner_profile_id: PT }), { id: PT, email: 'p@example.invalid', pkg: 'core' }], orders: [order({ user_id: PT })] }, {}, true],
  ['joining on the code of a buyer', { profiles: [{ id: PT, email: 'p@example.invalid', invite_code: 'BUYER123' }], orders: [order({ buyer_email: 'p@example.invalid' })] }, { inviteCode: 'BUYER123' }, true],
  ['joining on the code of somebody who bought nothing', { profiles: [{ id: PT, email: 'p@example.invalid', invite_code: 'FREE1234' }] }, { inviteCode: 'FREE1234' }, false],
  ['a partner who joined and is linked, buyer found by email', { profiles: [profile({ invite_code: null, joined_via_invite: true, partner_profile_id: PT }), { id: PT, email: 'p@example.invalid', invite_code: 'BUYER123' }], orders: [order({ buyer_email: 'p@example.invalid' })] }, {}, true],
];
for (const [what, db, extra, want] of cases) {
  const r = await ask(db, extra);
  if (!r.ok) fails.push(`${what}: the rule could not answer (${r.error}).`);
  else if (r.owns !== want) fails.push(`${what}: the rule said ${r.owns ? 'bought' : 'nothing bought'}, expected ${want ? 'bought' : 'nothing bought'}.`);
}
{
  const r = await ask({ profiles: [profile()], ordersDown: true });
  if (r.ok && r.owns === false) fails.push('a failed orders read answered "nothing bought", which would lock a paying customer out on a timeout.');
}
{
  /* And before the profile exists, which is a different read: the orders
     asked directly by id and by email. */
  const r = await ask({ ordersDown: true });
  if (r.ok && r.owns === false) fails.push('a failed orders read for an account with no profile yet answered "nothing bought": a guest buyer setting up would be refused on a timeout.');
}

// ── /api/create-profile ─────────────────────────────────────────────────────
const createProfile = (await import('../api/create-profile.js')).default;
const post = (db, { token = true, body = {} } = {}) => withDb(db, async () => {
  const res = await createProfile(new Request(`${SITE_URL}/api/create-profile`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: SITE_URL, ...(token ? { authorization: 'Bearer t' } : {}) },
    body: JSON.stringify({ name: 'A', partnerName: 'B', ...(token ? {} : { userId: ME }), ...body }),
  }));
  return { status: res.status, body: await res.json().catch(() => ({})) };
});
{
  const { out, writes } = await post({});
  const inserted = writes.some((w) => w.method === 'POST');
  if (out.status !== 403 || out.body.reason !== 'no_purchase') fails.push(`create-profile from the app with nothing bought answered ${out.status} (${out.body.reason || out.body.error || ''}), not 403 no_purchase.`);
  if (inserted) fails.push('create-profile from the app with nothing bought wrote a profile.');
}
{
  const { out } = await post({ orders: [order({ buyer_email: EMAIL })] });
  if (out.status !== 200) fails.push(`create-profile from the app for a buyer found by email answered ${out.status}, so somebody who bought as a guest cannot set up in the app.`);
}
{
  const { out, writes } = await post({ profiles: [{ id: PT, email: 'p@example.invalid', invite_code: 'BUYER123' }], orders: [order({ user_id: PT })] },
    { body: { inviteCode: 'BUYER123', joinedViaInvite: true } });
  if (out.status !== 200) fails.push(`create-profile from the app for a partner joining a buyer's invite answered ${out.status}. An invited partner never pays.`);
  /* invite_code is unique, so a partner who stores the buyer's code fails the
     insert in the real database, and partner-sync could no longer find the
     buyer by it. Every app invitee hit this (A193). */
  const insert = writes.find((w) => w.method === 'POST');
  if (insert && /"invite_code":"BUYER123"/.test(insert.body)) {
    fails.push("create-profile stored the buyer's invite code on the partner joining it. The code is unique, so the real insert fails and the partner cannot set up.");
  }
}
{
  const { out } = await post({}, { token: false });
  if (out.status !== 200) fails.push(`create-profile from the website (no token) answered ${out.status}. The website calls it the moment after sign-up, before a session exists, and was not part of this change.`);
}

// ── /api/home ──────────────────────────────────────────────────────────────
const home = (await import('../api/home.js')).default;
const getHome = (db) => withDb(db, async () => {
  const res = await home(new Request(`${SITE_URL}/api/home`, { headers: { authorization: 'Bearer t' } }));
  return { status: res.status, body: await res.json().catch(() => ({})) };
}).then((r) => r.out);
{
  const r = await getHome({ profiles: [profile()] });
  if (r.status !== 403 || r.body.reason !== 'no_purchase') fails.push(`home for an account with nothing bought answered ${r.status}, so every tab of the app opens for it.`);
  else if (!r.body.copy?.title) fails.push('home refused an account with nothing bought and sent no words for the screen that says so.');
}
{
  const r = await getHome({ profiles: [profile()], orders: [order({ buyer_email: EMAIL })] });
  if (r.status === 403) fails.push('home refused an account whose order it could only find by email. That is every buyer whose profile has not caught up with their order.');
}
{
  const r = await getHome({ profiles: [profile()], ordersDown: true });
  if (r.status === 403) fails.push('home refused an account because the orders could not be read. A timeout is not a fact about a purchase.');
}

if (fails.length) {
  console.error('check-purchase-gate FAILED');
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log(`[check-purchase-gate] ${cases.length} accounts through the rule, every way in and every way it must stay open;`
  + ' create-profile refuses the app with nothing bought and writes nothing, and still serves the website; home refuses'
  + ' an account with nothing bought, serves one found only by email, and never refuses on a failed read.');
