#!/usr/bin/env node
/**
 * No endpoint answers 500 to a body it should refuse with a 400.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Every edge handler under api/ is called with seven malformed bodies. None
 * throws and none answers 5xx. A 400 is the right answer, a 401 is fine, a 405
 * is fine; a 500 means the handler fell over rather than declined.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * `JSON.parse('null')` is null and `JSON.parse('"hello"')` is a string, and
 * both are valid JSON. Nearly every handler here did
 *
 *     let body; try { body = await req.json(); } catch { 400 }
 *     const { thing } = body;
 *
 * which throws on either. Sweeping all fifty-six with seven bodies found
 * twenty answering 500 to a body of `null` alone, several of them before their
 * own auth check ran. Three more fell over on a value of the wrong type: an
 * email that was a number, an items list that was an object.
 *
 * A 500 where a 400 belongs is not a hole. It is noise in the logs, and this
 * codebase has twice lost a real failure inside noise exactly like it.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * By calling every handler, with fetch stubbed and credentials that reach the
 * stub, so a handler gets as far as its own logic. Reading the files would not
 * have found this: the shape that breaks is the destructure two lines after
 * the parse, not the parse.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The nodejs handlers, which take (req, res) and need a different harness.
 * check-runtime-shape.mjs is what keeps those honest about which they are.
 *
 * Endpoints whose configuration is absent here rather than broken: a webhook
 * with no signing secret answers 500 because it is not configured, which is
 * the correct answer to being asked to verify a signature it cannot.
 */

import { readdirSync } from 'node:fs';
import { SITE_URL } from '../api/_lib/site.js';

Object.assign(process.env, {
  SUPABASE_URL: 'https://example.invalid', SUPABASE_SERVICE_KEY: 'test-key',
  SUPABASE_ANON_KEY: 'test-key', RESEND_API_KEY: 'test-key',
  ADMIN_SECRET: 'admin-test', INTERNAL_API_SECRET: 'internal-test',
  STRIPE_SECRET_KEY: 'sk_test', CRON_SECRET: 'cron-test',
  KV_REST_API_URL: 'https://example.invalid', KV_REST_API_TOKEN: 'test-key',
});
globalThis.fetch = async (u) => new Response(
  String(u).includes('/auth/v1/user') ? '{"id":"00000000-0000-4000-8000-000000000000"}' : '[]',
  { status: 200, headers: { 'content-type': 'application/json' } });

/** Not broken, unconfigured: these need a secret this harness cannot invent. */
const UNCONFIGURED = new Set(['admin-login.js', 'stripe-webhook.js', 'recompute-entitlements.js']);

const BODIES = [
  ['a string where an object goes', '"hello"'],
  ['an array', '[1,2,3]'],
  ['null', 'null'],
  ['a number', '42'],
  ['nested nulls', '{"items":null,"body":null,"answers":null,"type":null}'],
  ['empty arrays', '{"items":[],"answers":[],"lineItems":[]}'],
  ['values of the wrong type', '{"items":{"a":1},"qty":"many","total":"free","email":5}'],
];

const ROOT = new URL('..', import.meta.url).pathname;
const files = readdirSync(`${ROOT}api`).filter((f) => f.endsWith('.js') && !f.startsWith('_'));
if (files.length < 40) {
  console.error(`[check-body-parsing] found ${files.length} endpoints; there were 56 when this was written.`);
  process.exit(1);
}

const quiet = [console.log, console.warn, console.error];
const problems = [];
let called = 0;

console.log = () => {}; console.warn = () => {}; console.error = () => {};
for (const f of files) {
  if (UNCONFIGURED.has(f)) continue;
  let mod;
  try { mod = await import(`${ROOT}api/${f}`); } catch (e) {
    problems.push(`api/${f} will not import: ${String(e.message).slice(0, 80)}`);
    continue;
  }
  if (typeof mod.default !== 'function') continue;
  if (mod.config?.runtime === 'nodejs') continue;
  for (const [name, body] of BODIES) {
    const req = new Request(`${SITE_URL}/api/${f.replace(/\.js$/, '')}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json', origin: SITE_URL,
        authorization: 'Bearer admin-test', 'x-attune-internal': 'internal-test',
      },
      body,
    });
    called++;
    try {
      const res = await mod.default(req);
      if (res && res.status >= 500) {
        problems.push(`api/${f} answered ${res.status} to ${name}. A body it cannot use is a 400.`);
      }
    } catch (e) {
      problems.push(`api/${f} threw on ${name}: ${String(e.message).slice(0, 70)}`);
    }
  }
}
[console.log, console.warn, console.error] = quiet;

if (problems.length) {
  console.error('[check-body-parsing] an endpoint falls over on a body it should refuse:\n');
  for (const p of problems) console.error('  ' + p);
  console.error('\napi/_lib/http.js exports jsonBody(req), which returns an object or the 400.');
  process.exit(1);
}

console.log(`[check-body-parsing] ${called} calls across ${files.length - UNCONFIGURED.size} endpoints; none threw and none answered 5xx.`);
