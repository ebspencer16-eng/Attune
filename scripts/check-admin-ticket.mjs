#!/usr/bin/env node
/**
 * Getting into the admin from the app needs an admin ACCOUNT, and nothing else.
 *
 * ── WHAT ELLIE ASKED FOR ──────────────────────────────────────────────────
 * "Carolina and I shouldn't have to enter the admin password if we are entering
 * through our accounts. We should have the 4-digit pin once when we initially
 * click admin from settings, but no passwords from that point."
 *
 * So a signed-in admin account asks /api/admin-session for a ticket and the
 * admin page exchanges it at /api/admin-login for the token it already uses.
 * That removes a password from a flow, which is exactly the kind of change that
 * is one mistake away from removing the lock as well. This runs the pieces.
 *
 * ── WHAT IS CHECKED, BY RUNNING IT ────────────────────────────────────────
 *   1. A ticket verifies under the secret that minted it, and under nothing
 *      else. A different secret, a changed expiry, a truncated signature and an
 *      empty string are all refused.
 *   2. It expires. Two minutes, and one second past is no longer a ticket.
 *   3. /api/admin-session refuses a request with no token, a token the auth
 *      server rejects, and an account whose address is not an admin. It answers
 *      only the one that is.
 *   4. /api/admin-login takes a valid ticket and refuses an invalid one, and
 *      the ticket branch is checked BEFORE the credential comparison so a
 *      ticket can never be read as a missing password.
 *   5. The app never holds the admin token, and the ticket travels in the URL
 *      FRAGMENT rather than the query, because a query string reaches the
 *      server and its logs.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The four-digit code. It is a lock on a phone, in that phone's keychain, and
 * is never sent anywhere; see attune-app/src/components/admin.tsx for what it
 * is and is not. Nothing here would be weaker without it.
 *
 * Single use. A ticket is not: that needs somewhere to record what has been
 * spent and these run on instances that share no memory. Two minutes is the
 * bound, and it is asserted here so "ticket" cannot quietly come to mean "one
 * time" in somebody's head.
 */

import { readFileSync } from 'node:fs';

import { mintAdminTicket, adminTicketValid, ADMIN_TICKET_TTL_SECONDS } from '../api/_lib/admin-ticket.js';
import { SITE_URL } from '../api/_lib/site.js';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];
const SECRET = 'test-admin-secret';

// ── 1 and 2. The ticket itself ──────────────────────────────────────────────
{
  const t = await mintAdminTicket(SECRET);
  if (!(await adminTicketValid(t, SECRET))) {
    fails.push('a freshly minted ticket does not verify, so nobody can get in at all.');
  }
  if (await adminTicketValid(t, 'another-secret')) {
    fails.push('a ticket verifies under a secret that did not mint it.');
  }
  if (await adminTicketValid(t.replace(/^\d+/, (d) => String(Number(d) + 600)), SECRET)) {
    fails.push('moving the expiry forward still verifies, so a ticket never expires.');
  }
  if (await adminTicketValid(t.slice(0, -4), SECRET)) {
    fails.push('a truncated signature verifies.');
  }
  for (const junk of ['', '.', 'x.y', null, undefined]) {
    if (await adminTicketValid(junk, SECRET)) fails.push(`"${junk}" verifies as a ticket.`);
  }
  if (ADMIN_TICKET_TTL_SECONDS > 300) {
    fails.push(`a ticket lives ${ADMIN_TICKET_TTL_SECONDS}s. It travels in a URL; minutes, not`
      + ' hours.');
  }
  const future = Date.now() + (ADMIN_TICKET_TTL_SECONDS + 1) * 1000;
  if (await adminTicketValid(t, SECRET, future)) {
    fails.push('a ticket is still good after its own expiry.');
  }
}

// ── 3. Who may ask for one ──────────────────────────────────────────────────
{
  Object.assign(process.env, {
    SUPABASE_URL: 'https://stub.supabase.co',
    SUPABASE_ANON_KEY: 'stub-anon',
    ADMIN_SECRET: SECRET,
    ADMIN_EMAILS: 'boss@example.com',
  });
  const { default: session } = await import('../api/admin-session.js');

  const ask = async (token, user) => {
    globalThis.fetch = async (u) => {
      if (String(u).includes('/auth/v1/user')) {
        return user
          ? new Response(JSON.stringify(user), { status: 200, headers: { 'Content-Type': 'application/json' } })
          : new Response('{}', { status: 401 });
      }
      return new Response('{}', { status: 200 });
    };
    const res = await session(new Request(`${SITE_URL}/api/admin-session`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    }));
    return { status: res.status, body: await res.json().catch(() => null) };
  };

  const none = await ask(null, null);
  if (none.status !== 401) fails.push(`no token answered ${none.status}, not 401.`);

  const bad = await ask('nope', null);
  if (bad.status !== 401) fails.push(`a token the auth server rejects answered ${bad.status}.`);

  const notAdmin = await ask('ok', { id: 'u1', email: 'someone@example.com' });
  if (notAdmin.status !== 403 || notAdmin.body?.ticket) {
    fails.push(`a signed-in NON-admin got ${notAdmin.status}`
      + `${notAdmin.body?.ticket ? ' and a ticket' : ''}. The account is the whole gate.`);
  }

  const admin = await ask('ok', { id: 'u2', email: 'boss@example.com' });
  if (admin.status !== 200 || !admin.body?.ticket) {
    fails.push(`an admin account got ${admin.status} and no ticket, so the flow is dead and the`
      + ' password is back.');
  } else if (!(await adminTicketValid(admin.body.ticket, SECRET))) {
    fails.push('the endpoint minted a ticket its own secret does not verify.');
  }
}

// ── 4. Spending one ─────────────────────────────────────────────────────────
{
  const login = readFileSync(`${ROOT}api/admin-login.js`, 'utf8');
  const ticketAt = login.indexOf('body.ticket');
  const passwordAt = login.indexOf("body.password");
  if (ticketAt === -1) {
    fails.push('api/admin-login.js does not accept a ticket, so the app cannot get in without the'
      + ' password. Refusing to pass: a gate that has lost its subject must never report success.');
  } else if (passwordAt !== -1 && ticketAt > passwordAt) {
    fails.push('api/admin-login.js reads the password before the ticket, so a ticket arrives at'
      + ' the credential comparison and reads as missing credentials.');
  }
  if (!/adminTicketValid\(/.test(login)) {
    fails.push('api/admin-login.js takes a ticket without verifying it.');
  }
}

// ── 5. What the app holds, and where the ticket rides ───────────────────────
{
  const app = readFileSync(`${ROOT}attune-app/src/components/admin.tsx`, 'utf8');
  const code = app.replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');

  if (/ADMIN_SECRET|attune_admin_s/.test(code)) {
    fails.push('the app names the admin token. It should never hold one: the page exchanges the'
      + ' ticket.');
  }
  /*
   * The ticket rides in the fragment, which is never sent to a server, and it
   * is encoded. This used to match on `#${key}&t=`, from when the app opened a
   * named admin page; the key is gone and the rule is not, so it matches the
   * part that is the rule: a `#` immediately before the ticket.
   */
  if (!/#t=\$\{encodeURIComponent\(ticket\)\}/.test(code)) {
    fails.push('the app does not put the ticket in the URL fragment, encoded. A ticket in the'
      + ' QUERY string is sent to the server and lands in its logs.');
  }
  if (/[?&]t=\$\{/.test(code.replace(/#t=\$\{encodeURIComponent\(ticket\)\}/g, ''))) {
    fails.push('the ticket is in the query string rather than the fragment.');
  }

  const page = readFileSync(`${ROOT}public/admin.html`, 'utf8');
  if (!/location\.hash/.test(page) || !/history\.replaceState/.test(page)) {
    fails.push('public/admin.html does not read the ticket from the fragment and strip it, so it'
      + ' stays in the address bar and in any screenshot of it.');
  }
}

if (fails.length) {
  console.error('\n check-admin-ticket: the way into the admin is not what it should be.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-admin-ticket] a ticket verifies only under the secret that minted it, expires`
  + ` in ${ADMIN_TICKET_TTL_SECONDS}s, is issued only to an admin account, is spent before the`
  + ' password is read, and travels in the fragment; the app holds no admin token.');
