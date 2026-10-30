#!/usr/bin/env node
/**
 * Every endpoint, with the database failing.
 *
 * The last round's findings were all one shape: a read that failed was
 * treated as an answer (no record, no orders, nothing to remove). This asks
 * it of every endpoint at once: run each with a signed-in caller, three
 * ways, and compare what it says.
 *   healthy  the database answers (empty lists, the caller's own profile)
 *   down     every database read and write answers 500, except signing in
 *   down+me  the caller's own profile read fails too
 * A 200 under `down` is the suspect: either the endpoint touches no data
 * (fine) or it answered a question it could not read. Each is read by a
 * person; the column is a lead, not a verdict.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { SITE_URL } from '../../api/_lib/site.js';

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
const ROOT = new URL('../..', import.meta.url).pathname;
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
      const req = new Request(`${SITE_URL}/api/${f.replace(/\.js$/, '')}`, {
        method: verb,
        headers: { 'content-type': 'application/json', origin: SITE_URL, authorization: auth(src), 'x-admin-secret': 'admin-test' },
        ...(verb === 'POST' ? { body: JSON.stringify({ userId: USER }) } : {}),
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
const sus = rows.filter((r) => r.down.s === 200 && r.down.db > 0);
console.log(`${rows.length} calls over ${new Set(rows.map((r) => r.f)).size} edge endpoints.\n`);
console.log(`answered 200 with the database down, after asking it something (${sus.length}):`);
for (const r of sus) console.log(`  ${r.verb.padEnd(4)} ${r.f.padEnd(30)} healthy ${r.healthy.s} | down ${r.down.s} ${r.down.b}`);
const meSus = rows.filter((r) => r['down+me'].s === 200 && r['down+me'].db > 0 && !sus.includes(r));
console.log(`\nand only when the caller's own profile also fails (${meSus.length}):`);
for (const r of meSus) console.log(`  ${r.verb.padEnd(4)} ${r.f.padEnd(30)} ${r['down+me'].b}`);
if (process.env.SHOW_HEALTHY) {
  const by = {};
  for (const r of rows) (by[r.healthy.s] ||= []).push(`${r.verb} ${r.f}`);
  for (const [s, l] of Object.entries(by)) console.log(`\nhealthy ${s} (${l.length}): ${l.join(', ')}`);
}
if (process.env.SHOW_400) for (const r of rows) if (r.healthy.s === 400) console.log(`${r.verb} ${r.f.padEnd(28)} ${r.healthy.b}`);
