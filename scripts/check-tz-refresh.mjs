#!/usr/bin/env node
/**
 * check-tz-refresh: a daylight-saving change does not move anybody's daily
 * notification.
 *
 * The daily insight and word go out at a local time matched against the
 * offset stored when the time was picked, and nothing updated it, so every
 * clock change moved them by an hour (A203: Europe on 25 October, the US on
 * 1 November). /api/home receives the device's current offset on every app
 * load and now writes it when it differs, for somebody with a time set.
 *
 * Runs /api/home three ways. Planted: the write removed, the has() guard
 * removed (a request with no offset then writes 0), and the "differs" test
 * removed. All three fail it.
 */
import { SITE_URL } from '../api/_lib/site.js';
Object.assign(process.env, { SUPABASE_URL: 'https://example.invalid', SUPABASE_SERVICE_KEY: 'k', SUPABASE_ANON_KEY: 'k' });
const USER = '00000000-0000-4000-8000-000000000000';
const { default: home } = await import('../api/home.js');
async function run(q, stored) {
  const patches = [];
  globalThis.fetch = async (u, init = {}) => {
    const url = String(typeof u === 'string' ? u : u.url);
    const j = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } });
    if (url.includes('/auth/v1/user')) return j({ id: USER, email: 's@example.invalid' });
    if ((init.method || 'GET') === 'PATCH' && url.includes('/rest/v1/profiles')) { patches.push(String(init.body)); return new Response(null, { status: 204 }); }
    if (url.includes('/rest/v1/profiles')) return j([{ id: USER, pkg: 'premium', daily_insight_at: '07:30', daily_word_at: null, tz_offset_minutes: stored }]);
    if (url.includes('/rest/v1/orders')) return j([{ order_num: 'ATT-1', pkg_key: 'premium' }]);
    return j([]);
  };
  const w = console.warn; console.warn = () => {};
  const r = await home(new Request(`${SITE_URL}/api/home${q}`, { headers: { authorization: 'Bearer not-a-jwt' } }));
  console.warn = w;
  return { status: r.status, patches };
}
const fails = [];
const stale = await run('?tzOffset=300', 240);
if (stale.status !== 200) fails.push(`home did not answer in the stub (${stale.status}); nothing below means anything`);
if (!stale.patches.some((p) => /"tz_offset_minutes":300/.test(p))) fails.push('a device now at offset 300 with 240 stored, and a daily time set, did not have its stored offset updated: after a clock change its notification arrives an hour off until the person re-picks the time');
const none = await run('', 240);
if (none.patches.length) fails.push(`a request with no offset wrote one (${none.patches.join(', ')}): Number(null) is 0, which would put the person in UTC`);
const same = await run('?tzOffset=240', 240);
if (same.patches.length) fails.push('an offset that already matches was written again, on every load');
if (fails.length) {
  console.error('[check-tz-refresh] ' + fails.length + ' problem(s):');
  for (const x of fails) console.error('  ' + x);
  process.exit(1);
}
console.log('[check-tz-refresh] a daily notification follows the clock: /api/home stores the device\'s new offset after a change, only when it differs and only when one was sent.');
