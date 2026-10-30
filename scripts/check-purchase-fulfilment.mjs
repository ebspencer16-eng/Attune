#!/usr/bin/env node
/**
 * check-purchase-fulfilment: a purchase makes the right account, sends the
 * right invitation, and its confirmation says only what happened (A206).
 *
 * Ellie (A205b): for yourself, your email and your partner's, or "I will
 * invite my partner later"; a gift, one recipient's email. She chose the
 * account being made at purchase. Before this, a gift's couple was never told
 * anything, and the buyer was told "We've sent 's access link".
 *
 * RUNS api/_lib/fulfil-order.js with the database, Supabase auth and Resend
 * stubbed, and reads what was sent:
 *   1. for yourself with a partner: the buyer's account is made, the order is
 *      theirs, the partner gets an invitation joining on the buyer's invite
 *      code, and the confirmation says the partner was invited and links the
 *      set-up page;
 *   2. "later": no invitation, and the confirmation says the dashboard;
 *   3. a gift: the RECIPIENT's account is made and owns the order, the
 *      recipient gets the gift invitation with their set-up link, and the
 *      buyer's confirmation names the recipient's address;
 *   4. an address that already has an account is found, not made, and its
 *      link signs in rather than setting a password;
 *   5. an account that cannot be made still sends a confirmation, with the
 *      old sign-up link, and claims no invitation;
 *   6. an invitation Resend refuses is not called sent in the confirmation;
 * and RUNS /api/account-setup: the first use of a link makes a password link,
 * the second says sign in, and a failed read is 503;
 * and /api/invite-partner: sends once, refuses again inside ten minutes,
 * refuses a linked couple and an account with no purchase.
 *
 * Planted: the gift's account made for the buyer, the confirmation claiming
 * an invitation regardless, "later" still inviting, and the setup link
 * usable twice. All four fail it.
 */
import { SITE_URL } from '../api/_lib/site.js';

Object.assign(process.env, {
  SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_KEY: 'k', SUPABASE_ANON_KEY: 'a', RESEND_API_KEY: 're',
});
const { fulfilOrder } = await import('../api/_lib/fulfil-order.js');
const { default: setup } = await import('../api/account-setup.js');
const { default: invite } = await import('../api/invite-partner.js');

const TOKEN = '99999999-9999-4999-8999-999999999999';
const j = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } });
const quiet = async (fn) => { const k = ['warn', 'log', 'error'].map((x) => console[x]); console.warn = console.log = console.error = () => {}; try { return await fn(); } finally { [console.warn, console.log, console.error] = k; } };

function world({ existing = [], failCreate = false, failResendTo = null, tokenColumns = true } = {}) {
  const w = { users: new Map(existing.map((e, i) => [e, `00000000-0000-4000-8000-00000000000${i}`])), profiles: [], claims: [], mail: [] };
  let n = 10;
  globalThis.fetch = async (input, init = {}) => {
    const url = decodeURIComponent(typeof input === 'string' ? input : input.url);
    const m = (init.method || (typeof input !== 'string' && input.method) || 'GET').toUpperCase();
    const body = init.body ? JSON.parse(String(init.body)) : (typeof input !== 'string' && input.body ? await input.clone().json().catch(() => null) : null);
    if (url.startsWith('https://api.resend.com')) {
      w.mail.push(body);
      return failResendTo && body.to.includes(failResendTo) ? j({ message: 'no' }, 422) : j({ id: 'e' });
    }
    if (url.includes('/auth/v1/admin/users') && m === 'POST') {
      if (failCreate) return j({ msg: 'down', code: 'unexpected_failure' }, 500);
      if (w.users.has(body.email)) return j({ code: 'email_exists', msg: 'A user with this email address has already been registered' }, 422);
      const id = `00000000-0000-4000-8000-0000000000${n++}`; w.users.set(body.email, id);
      return j({ id, email: body.email, app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' });
    }
    if (url.includes('/auth/v1/admin/generate_link')) {
      const id = w.users.get(body.email);
      return j({ action_link: `https://db.test/auth/v1/verify?type=${body.type}`, email_otp: '', hashed_token: 'h', redirect_to: '', verification_type: body.type, id, email: body.email, app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' });
    }
    if (url.includes('/rest/v1/profiles') && m === 'GET') return j(w.profiles.filter((p) => url.includes(p.id)));
    if (url.includes('/rest/v1/profiles') && m === 'POST') { w.profiles.push(...[].concat(body)); return j([], 201); }
    if (url.includes('/rest/v1/profiles') && m === 'PATCH') return j([]);
    if (url.includes('/rest/v1/orders') && m === 'PATCH') {
      w.claims.push({ url, body });
      if (!tokenColumns && 'partner_email' in body) return j({ code: 'PGRST204', message: 'column not found' }, 400);
      return j([{ user_id: body.user_id, ...(url.includes('setup_token') ? { setup_token: TOKEN, setup_used_at: null } : {}) }]);
    }
    return j([]);
  };
  return w;
}

const buy = (items, opts = {}) => quiet(() => fulfilOrder({
  supabaseUrl: 'https://db.test', serviceKey: 'k', resendKey: 're',
  buyerEmail: 'maya@example.com', buyerName: 'Maya', baseOrderNum: 'ATT-20261030-ABCDEF', items, ...opts,
}));
const to = (w, addr) => w.mail.filter((m) => m.to.includes(addr));
const text = (m) => (m?.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const fails = [];

// 1. for yourself, with a partner
let w = world();
await buy([{ p: 'core', p1: 'Maya', p2: 'Alex', pe: 'alex@example.com' }]);
const buyerId = w.users.get('maya@example.com');
if (!buyerId) fails.push("buying for yourself made no account for the buyer");
if (!w.claims.some((c) => c.body.user_id === buyerId)) fails.push("the order was not given to the buyer's account");
const inviteMail = to(w, 'alex@example.com')[0];
const code = w.profiles.find((p) => p.id === buyerId)?.invite_code;
if (!inviteMail) fails.push('the partner named at checkout was sent no invitation');
else if (!code || !inviteMail.html.includes(`invite=${code}`)) fails.push("the partner's invitation does not join on the buyer's invite code, so accepting it links to nobody");
const conf1 = to(w, 'maya@example.com')[0];
if (!/alex@example\.com/.test(text(conf1))) fails.push('the confirmation does not say the partner was invited at their address');
if (!conf1?.html.includes(`${SITE_URL}/app?setup=${TOKEN}`)) fails.push('the confirmation does not link the set-up page for the new account');
if (w.mail.indexOf(inviteMail) > w.mail.indexOf(conf1)) fails.push('the confirmation went before the invitation, so it could not know whether the invitation was sent');

// 2. later
w = world();
await buy([{ p: 'core', p1: 'Maya', p2: 'Alex', pe: 'alex@example.com', il: 1 }]);
if (to(w, 'alex@example.com').length) fails.push('"I will invite my partner later" still emailed the partner');
// The dashboard asks only while no partner address is stored (api/home.js
// needsPartnerInvite), so a stored one would hide the prompt for good.
if (w.profiles.some((p) => p.partner_email) || w.claims.some((c) => c.body.partner_email)) fails.push('"later" stored the partner\'s address anyway, which hides the dashboard\'s invite prompt for good');
if (!/dashboard/i.test(text(to(w, 'maya@example.com')[0]))) fails.push('a "later" confirmation does not say the partner can be invited from the dashboard');

// 3. a gift
w = world();
await buy([{ p: 'core', p1: 'Sam', p2: 'Jo', g: 1, re: 'sam@example.org' }]);
const recId = w.users.get('sam@example.org');
if (!recId) fails.push("a gift made no account for its recipient");
if (w.users.has('maya@example.com')) fails.push("a gift made an account for the buyer, who is not the one taking it");
if (!w.claims.some((c) => c.body.user_id === recId)) fails.push("a gift's order was not given to the recipient's account");
const giftMail = to(w, 'sam@example.org')[0];
if (!giftMail?.html.includes(`/app?setup=${TOKEN}`)) fails.push("the recipient's invitation has no set-up link of their own");
if (!/Hi Sam and Jo,/.test(text(giftMail))) fails.push(`the gift invitation greets nobody: "${(text(giftMail).match(/Hi [^,]*,/) || [''])[0]}"`);
if (!/sam@example\.org/.test(text(to(w, 'maya@example.com')[0]))) fails.push("the gift buyer's confirmation does not say the invitation went to the recipient");

// 4. an address that already has an account
w = world({ existing: ['maya@example.com'] });
w.profiles.push({ id: w.users.get('maya@example.com'), name: 'Maya', invite_code: 'MAYA1234' });
await buy([{ p: 'core', p1: 'M', p2: 'Alex', pe: 'alex@example.com' }]);
const conf4 = to(w, 'maya@example.com')[0];
if (!conf4?.html.includes(`${SITE_URL}/app?signin=1`) || conf4.html.includes('?setup=')) fails.push('an existing account was sent a set-password link rather than sign in');
if (w.profiles.length !== 1) fails.push('an existing account had a second profile made');

// 5. no account could be made
w = world({ failCreate: true });
await buy([{ p: 'core', p1: 'Maya', p2: 'Alex', pe: 'alex@example.com' }]);
const conf5 = to(w, 'maya@example.com')[0];
if (!conf5) fails.push('an account that could not be made also lost the confirmation');
else {
  if (!conf5.html.includes('/app?signup=1')) fails.push('with no account made, the confirmation has no sign-up link to claim the order with');
  if (/alex@example\.com/.test(text(conf5))) fails.push('with no account made, the confirmation still says the partner was invited');
}

// 6. an invitation Resend refuses
w = world({ failResendTo: 'sam@example.org' });
await buy([{ p: 'core', g: 1, re: 'sam@example.org' }]);
if (/We sent an invitation/.test(text(to(w, 'maya@example.com')[0]))) fails.push('an invitation Resend refused is called sent in the confirmation');

// account-setup
async function useLink({ used = false, readFails = false } = {}) {
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = decodeURIComponent(typeof input === 'string' ? input : input.url); calls.push(url);
    if (url.includes('/rest/v1/orders')) return readFails ? j({ message: 'x' }, 500) : j(used ? [] : [{ user_id: '11111111-1111-4111-8111-111111111111' }]);
    if (url.includes('/auth/v1/admin/users/')) return j({ id: '11111111-1111-4111-8111-111111111111', email: 'maya@example.com', app_metadata: {}, user_metadata: {}, aud: '', created_at: '' });
    if (url.includes('generate_link')) return j({ action_link: 'https://db.test/verify?type=recovery', id: 'u1', email: 'maya@example.com', app_metadata: {}, user_metadata: {}, aud: '', created_at: '' });
    return j([]);
  };
  const r = await quiet(() => setup(new Request(`${SITE_URL}/api/account-setup`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: TOKEN }) })));
  return { status: r.status, body: await r.json(), calls };
}
const first = await useLink();
if (!first.body.url || !first.calls.some((u) => u.includes('setup_used_at=is.null'))) fails.push(`the first use of a set-up link answered ${JSON.stringify(first.body)}, or used it without claiming it`);
const second = await useLink({ used: true });
if (second.body.url || !second.body.signin) fails.push('a set-up link already used made another password link; a forwarded email could take the account');
const down = await useLink({ readFails: true });
if (down.status !== 503) fails.push(`a set-up link that could not be checked answered ${down.status}`);

// invite-partner
async function inviteAs(profile) {
  const mail = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = decodeURIComponent(typeof input === 'string' ? input : input.url);
    const m = (init.method || 'GET').toUpperCase();
    if (url.includes('/auth/v1/user')) return j({ id: 'u1', email: 'maya@example.com' });
    if (url.startsWith('https://api.resend.com')) { mail.push(JSON.parse(init.body)); return j({ id: 'e' }); }
    if (url.includes('/rest/v1/profiles') && m === 'GET') return j([profile]);
    if (url.includes('/rest/v1/profiles') && m === 'PATCH') return j([{ id: 'u1' }]);
    return j([]);
  };
  const r = await quiet(() => invite(new Request(`${SITE_URL}/api/invite-partner`, { method: 'POST', headers: { authorization: 'Bearer t', 'content-type': 'application/json' }, body: JSON.stringify({ partnerEmail: 'Alex@Example.com' }) })));
  return { status: r.status, mail };
}
const base = { id: 'u1', email: 'maya@example.com', name: 'Maya', invite_code: 'MAYA1234', pkg: 'premium' };
const ok = await inviteAs(base);
if (ok.status !== 200 || !ok.mail[0]?.to.includes('alex@example.com') || !ok.mail[0].html.includes('invite=MAYA1234')) fails.push(`inviting a partner answered ${ok.status} and sent ${JSON.stringify(ok.mail.map((m) => m.to))}`);
const soon = await inviteAs({ ...base, partner_invited_at: new Date().toISOString() });
if (soon.status !== 429 || soon.mail.length) fails.push(`a second invitation inside ten minutes answered ${soon.status} and sent ${soon.mail.length}`);
const linked = await inviteAs({ ...base, partner_profile_id: 'u2' });
if (linked.status !== 409 || linked.mail.length) fails.push(`inviting when the partner has joined answered ${linked.status}`);
const unpaid = await inviteAs({ ...base, pkg: null });
if (unpaid.status !== 403 || unpaid.mail.length) fails.push(`an account with no purchase was let invite someone (${unpaid.status})`);

if (fails.length) {
  console.error('[check-purchase-fulfilment] ' + fails.length + ' problem(s):');
  for (const f of fails) console.error('  ' + f);
  process.exit(1);
}
console.log('[check-purchase-fulfilment] for yourself: the buyer\'s account, the order, the partner invited on the buyer\'s code, a confirmation that says so; "later" invites nobody and points at the dashboard; a gift makes and links the recipient\'s account and invites them; an existing account signs in; a failure falls back to the sign-up link and claims nothing; a set-up link works once; the dashboard invite is limited to one per ten minutes, a purchase, and an unlinked couple.');
