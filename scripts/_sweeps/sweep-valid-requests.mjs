#!/usr/bin/env node
/**
 * S38: every endpoint, given a token the harness will vouch for.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * api/convos.js answered 401 to everybody from the day it shipped, because it
 * handed `userForRequest` a Request when that function destructures
 * { token, supabaseUrl, anonKey }. Nothing could see it. Every gate here that
 * drives endpoints sends a DELIBERATELY BAD request and asserts a polite
 * refusal, so a refusal is the thing they are looking for.
 *
 * This sweep asks the opposite question once: with Supabase stubbed to vouch
 * for the caller, does the endpoint get past its own auth check?
 *
 * ── WHAT A FINDING LOOKS LIKE ─────────────────────────────────────────────
 * A 401 from an endpoint whose only credential is a bearer token. That is an
 * endpoint nobody can use.
 *
 * ── WHAT IS NOT A FINDING, AND WHY IT HAS TO BE SAID ──────────────────────
 * Plenty of endpoints refuse this request for a reason that is correct:
 *
 *   - the admin ones want ADMIN_SECRET in their own header, not a user token
 *   - the cron ones want CRON_SECRET
 *   - the internal ones want INTERNAL_API_SECRET
 *   - a GET-only or POST-only route answers 405 to the other verb
 *
 * So the sweep prints every answer and sorts them. A silent skip is how a
 * sweep becomes evidence for something it never looked at.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { SITE_URL } from '../../api/_lib/site.js';

Object.assign(process.env, {
  SUPABASE_URL: 'https://example.invalid', SUPABASE_SERVICE_KEY: 'test-key',
  SUPABASE_ANON_KEY: 'test-key', RESEND_API_KEY: 'test-key',
  ADMIN_SECRET: 'admin-test', INTERNAL_API_SECRET: 'internal-test',
  STRIPE_SECRET_KEY: 'sk_test', CRON_SECRET: 'cron-test',
});

/** The id the stub vouches for, and the rows it hands back. */
const USER = '00000000-0000-4000-8000-000000000000';
const PARTNER = '00000000-0000-4000-8000-000000000001';

/**
 * A Supabase that says yes.
 *
 * The profile row carries a partner, because several endpoints answer "no
 * couple" long before they would answer anything else, and that answer is
 * correct but tells this sweep nothing.
 */
globalThis.fetch = async (u) => {
  const url = String(u);
  if (url.includes('/auth/v1/user')) {
    return new Response(JSON.stringify({ id: USER, email: 'sweep@example.invalid' }),
      { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('/rest/v1/profiles')) {
    return new Response(JSON.stringify([{ id: USER, partner_profile_id: PARTNER, pkg: 'premium' }]),
      { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
};

const ROOT = new URL('../..', import.meta.url).pathname;
const files = readdirSync(`${ROOT}api`).filter((f) => f.endsWith('.js') && !f.startsWith('_'));

/** Which secret an endpoint actually wants, read from the file. */
/**
 * ── THE HARNESS WAS WRONG FIRST, AS USUAL ────────────────────────────────
 * The first run reported thirteen endpoints refusing a good token with
 * nothing else to want, and seven of them were admin endpoints the matcher
 * could not see: they reach the rule through `checkAdminAuth` in
 * `_lib/admin-auth.js` and the literal ADMIN_SECRET appears nowhere in them.
 * The same blindness CLAUDE.md records about `conflict_data` hiding inside
 * EXERCISE_COLUMNS. When a scan looks for a name, ask what the indirection
 * for that name is, and match on both.
 */
function wants(src) {
  const out = [];
  if (/ADMIN_SECRET|adminAuthHeaders|requireAdmin|x-admin/i.test(src)
    || /_lib\/admin-auth\.js/.test(src) || /\bcheckAdminAuth\b/.test(src)) out.push('admin secret');
  if (/CRON_SECRET/.test(src)) out.push('cron secret');
  if (/INTERNAL_API_SECRET/.test(src)) out.push('internal secret');
  if (/STRIPE_WEBHOOK_SECRET|constructEvent/.test(src)) out.push('stripe signature');
  return out;
}

const rows = [];
const quiet = [console.log, console.warn, console.error];
console.log = () => {}; console.warn = () => {}; console.error = () => {};

for (const f of files) {
  let mod;
  try { mod = await import(`${ROOT}api/${f}`); } catch (e) {
    rows.push({ f, verb: '-', status: 'import failed', note: String(e.message).slice(0, 60), wants: [] });
    continue;
  }
  if (typeof mod.default !== 'function') continue;
  if (mod.config?.runtime === 'nodejs') { rows.push({ f, verb: '-', status: 'nodejs', note: 'driven by check-body-parsing', wants: [] }); continue; }
  const src = readFileSync(`${ROOT}api/${f}`, 'utf8');
  const need = wants(src);

  for (const verb of ['GET', 'POST']) {
    const req = new Request(`${SITE_URL}/api/${f.replace(/\.js$/, '')}`, {
      method: verb,
      headers: {
        'content-type': 'application/json', origin: SITE_URL,
        authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.sweep.sweep',
      },
      ...(verb === 'POST' ? { body: '{}' } : {}),
    });
    let status = 0; let text = '';
    try {
      const res = await mod.default(req);
      status = res?.status ?? 0;
      text = res ? await res.clone().text().catch(() => '') : '';
    } catch (e) {
      status = 'threw';
      text = String(e.message).slice(0, 80);
    }
    rows.push({ f, verb, status, note: text.replace(/\s+/g, ' ').slice(0, 90), wants: need });
  }
}
[console.log, console.warn, console.error] = quiet;

const unauth = rows.filter((r) => r.status === 401 && !r.wants.length);
const threw = rows.filter((r) => r.status === 'threw');
const fives = rows.filter((r) => typeof r.status === 'number' && r.status >= 500);

console.log(`[sweep-valid-requests] ${rows.length} calls over ${new Set(rows.map((r) => r.f)).size} endpoints, token vouched for.\n`);

console.log(`refused as unauthorized with no other credential to want: ${unauth.length}`);
for (const r of unauth) console.log(`  ${r.verb.padEnd(4)} api/${r.f.padEnd(28)} ${r.note}`);

console.log(`\nthrew: ${threw.length}`);
for (const r of threw) console.log(`  ${r.verb.padEnd(4)} api/${r.f.padEnd(28)} ${r.note}`);

console.log(`\n5xx: ${fives.length}`);
for (const r of fives) console.log(`  ${r.verb.padEnd(4)} api/${r.f.padEnd(28)} ${r.status} ${r.note}`);

console.log('\nevery answer, for the record:');
for (const r of rows.sort((a, b) => a.f.localeCompare(b.f))) {
  console.log(`  ${String(r.status).padStart(6)}  ${r.verb.padEnd(4)} api/${r.f.padEnd(30)}`
    + `${r.wants.length ? '[wants ' + r.wants.join(', ') + '] ' : ''}${r.note}`);
}
