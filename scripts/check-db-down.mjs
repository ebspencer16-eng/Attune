#!/usr/bin/env node
/**
 * check-db-down: no endpoint answers 200 to a question it could not read.
 *
 * Promoted from scripts/_sweeps/sweep-db-down.mjs (A203). Every edge endpoint
 * is run with a signed-in caller while every database request fails, except
 * signing in and reading the caller's own profile. A 200 then means either
 * the endpoint needs nothing from the database, or it answered something it
 * could not know: "nobody is due", "not set up yet", "deleted". The second is
 * the shape behind most of A202 and three of A203's four findings, so a 200
 * fails unless the endpoint is in OK_WHEN_DOWN with a reason somebody can
 * check, and an excuse that no longer applies fails too.
 *
 * WHAT IT DOES NOT RUN: api/store-workbook-pdf.js, the one Node endpoint,
 * which takes (req, res) rather than a Request. And it sends one shape of
 * body, so an endpoint that refuses that body with a 400 before reading
 * anything is not tested past its validation.
 *
 * Planted: cron-checkin back to `return []` on a failed read, cron-push back
 * to "not set up" for any error, and cron-prune-events back to a 200. All
 * three fail it.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { SITE_URL } from '../api/_lib/site.js';

Object.assign(process.env, {
  SUPABASE_URL: 'https://example.invalid', SUPABASE_SERVICE_KEY: 'test-key',
  SUPABASE_ANON_KEY: 'test-key', RESEND_API_KEY: 'test-key',
  ADMIN_SECRET: 'admin-test', INTERNAL_API_SECRET: 'internal-test',
  STRIPE_SECRET_KEY: 'sk_test', CRON_SECRET: 'cron-test',
});
const USER = '00000000-0000-4000-8000-000000000000';
const PARTNER = '00000000-0000-4000-8000-000000000001';
let mode = 'healthy';
const j = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json', 'content-range': '0-0/0' } });
let dbCalls = 0;
globalThis.fetch = async (u, init = {}) => {
  const url = String(typeof u === 'string' ? u : u.url);
  if (url.includes('/auth/v1/user')) return j({ id: USER, email: 'sweep@example.invalid', identities: [{ provider: 'google' }] });
  if (url.includes('example.invalid')) {
    dbCalls++;
    const own = url.includes('/rest/v1/profiles') && url.includes(USER) && (init.method || 'GET') === 'GET';
    if (mode === 'down+me' || (mode === 'down' && !own)) return j({ message: 'planted outage', code: 'XX000' }, 500);
    if (url.includes('/rest/v1/profiles')) return j([{ id: USER, partner_profile_id: PARTNER, pkg: 'premium', email: 'sweep@example.invalid', name: 'S' }]);
    return j([]);
  }
  return j({});
};
const ROOT = new URL('..', import.meta.url).pathname;

/**
 * A body each endpoint accepts, so the run reaches its reads rather than its
 * validation. Without these, 28 write endpoints answered 400 to the generic
 * body and were never asked anything about a failing database: the half of
 * the API that changes things was the half this did not test.
 */
const ADDR = { country: 'US', postal_code: '10001', state: 'NY', city: 'NY', line1: '1 St' };
const BODIES = {
  'POST account-signup.js': { body: { email: 'sweep@example.invalid' } },
  'GET admin-csv.js': { query: '?type=orders' },
  'POST admin-csv.js': { query: '?type=orders' },
  'POST admin-actions.js': { body: { action: 'waiting_partners' } },
  'POST admin-posts.js': { body: { action: 'list' } },
  'POST admin-presets.js': { body: { name: 'n', config: { a: 1 } } },
  'POST claim-order.js': { body: { orderNum: 'ATT-20261030-ABCDEF' } },
  'POST convos.js': { body: { key: 'convo_1' } },
  'GET couple-beta-status.js': { query: `?userId=${USER}` },
  'POST couple-beta-status.js': { query: `?userId=${USER}` },
  'POST create-payment-intent.js': { body: { items: [{ pkgKey: 'core', partner1Name: 'A', partner2Name: 'B' }], buyerEmail: 'sweep@example.invalid', customerAddress: ADDR } },
  'POST daily-push.js': { body: { kind: 'insight', at: '09:00', tzOffsetMinutes: 0 } },
  'POST exercise-completed.js': { body: { exercise: 'ex1' } },
  'POST generate-workbook-promo.js': { body: { accountEmail: 'sweep@example.invalid' } },
  'POST join-waitlist.js': { body: { email: 'sweep@example.invalid' } },
  'POST notes.js': { body: { action: 'create', body: 'a note' } },
  'POST notifications.js': { body: { action: 'read', id: '1' } },
  'GET partner-sync.js': { query: '?inviteCode=ABCD1234' },
  'POST partner-sync.js': { body: { action: 'link', inviteCode: 'ABCD1234', partnerBId: USER } },
  'POST posts.js': { body: { action: 'read', id: '1' } },
  'POST privacy-choices.js': { body: { optOutResearch: true } },
  'POST save-exercise.js': { body: { exercise: 'ex1', answers: { q1: 3 }, completedAt: '2026-10-30T00:00:00Z' } },
  'POST send-email.js': { body: { type: 'contact', name: 'S', replyEmail: 'sweep@example.invalid', topic: 'general', message: 'hi' } },
  'POST survey.js': { body: { answers: { overall: 'good' } } },
  'POST tool-data.js': { body: { tool: 'budget', data: {} } },
  'POST update-profile.js': { body: { name: 'S' } },
  'POST verify-core.js': { body: { email: 'sweep@example.invalid' } },
};
const files = readdirSync(`${ROOT}api`).filter((f) => f.endsWith('.js') && !f.startsWith('_'));
const auth = (src) => {
  if (/CRON_SECRET/.test(src)) return 'Bearer cron-test';
  if (/checkAdminAuth|ADMIN_SECRET|admin-auth/.test(src)) return 'Bearer admin-test';
  return 'Bearer not-a-jwt';
};
const quiet = [console.log, console.warn, console.error];
const rows = [];
console.log = () => {}; console.warn = () => {}; console.error = () => {};
for (const f of files) {
  let mod; try { mod = await import(`${ROOT}api/${f}`); } catch { continue; }
  if (typeof mod.default !== 'function' || mod.config?.runtime === 'nodejs') continue;
  const src = readFileSync(`${ROOT}api/${f}`, 'utf8');
  for (const verb of ['GET', 'POST']) {
    const out = {};
    for (mode of ['healthy', 'down', 'down+me']) {
      dbCalls = 0;
      const shape = BODIES[`${verb} ${f}`] || {};
      const req = new Request(`${SITE_URL}/api/${f.replace(/\.js$/, '')}${shape.query || ''}`, {
        method: verb,
        headers: { 'content-type': 'application/json', origin: SITE_URL, authorization: auth(src), 'x-admin-secret': 'admin-test' },
        ...(verb === 'POST' ? { body: JSON.stringify({ userId: USER, ...(shape.body || {}) }) } : {}),
      });
      try {
        const r = await mod.default(req);
        out[mode] = { s: r?.status ?? 0, b: (await r.clone().text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 110), db: dbCalls };
      } catch (e) { out[mode] = { s: 'threw', b: String(e.message).slice(0, 80), db: dbCalls }; }
    }
    rows.push({ f, verb, ...out });
  }
}
[console.log, console.warn, console.error] = quiet;

/** endpoint -> why a 200 with the database down is the right answer. */
const OK_WHEN_DOWN = {
  'create-profile.js': "reads only the caller's own profile, which this mode leaves working, and answers that it exists",
  'update-profile.js': "reads only the caller's own profile, which this mode leaves working",
  'questions.js': 'serves the questions from code; the read it makes is optional',
  'featured-testimonials.js': 'quotes on the home page: an empty list hides the block, and the page has no other way to say so',
  'admin-engagement.js': 'answers 200 with queryErrors listing every read that failed, which the page prints instead of drawing zero',
};
const fails = [];
const seen = new Set();
for (const r of rows) {
  if (r.down.s !== 200 || r.down.db === 0) continue;
  if (OK_WHEN_DOWN[r.f]) { seen.add(r.f); continue; }
  fails.push(`${r.verb} api/${r.f} answered 200 with the database down: ${r.down.b}`);
}
for (const f of Object.keys(OK_WHEN_DOWN)) if (!seen.has(f)) fails.push(`OK_WHEN_DOWN excuses ${f}, which no longer answers 200 with the database down. Delete the entry.`);
if (rows.length < 100) fails.push(`Only ${rows.length} calls were made; the endpoints have not all been reached.`);
if (fails.length) {
  console.error('[check-db-down] ' + fails.length + ' problem(s):');
  for (const x of fails) console.error('  ' + x);
  process.exit(1);
}
const stopped = rows.filter((r) => r.healthy.s === 400 && r.down.db === 0).map((r) => `${r.verb} ${r.f}`);
console.log(`[check-db-down] ${rows.length} calls over ${new Set(rows.map((r) => r.f)).size} edge endpoints with every database request failing: none answers 200 except ${seen.size} that say why. ${stopped.length} stopped at validation before reading anything${stopped.length ? ': ' + stopped.join(', ') : ''}.`);
