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
 * ── AND A PLAIN GET, WHICH IS THE HALF IT USED TO MISS ────────────────────
 * Every call here was a POST, so an endpoint's GET branches were never run.
 * /api/posts answers its feed on a GET with no parameters, and on 2026-10-11
 * that branch threw before it reached its first query: a filter named
 * `published` in the handler scope and a list of posts named `published`
 * inside the feed block, so the closure that built the query reached the one
 * declared later. In Practice was empty in the app and Ellie found it, because
 * every gate that ran this endpoint stopped at a 400 or a 401 first.
 *
 * So each endpoint is also called with a bare GET. A 400, a 401, a 404 or a
 * 405 is a fine answer to that; a 500 is a handler falling over.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Nothing. The two nodejs handlers used to be skipped here, with that said
 * out loud; they are driven now, through a shim that gives them the `res`
 * they expect. check-runtime-shape.mjs is what keeps every handler honest
 * about which runtime it declares.
 *
 * Endpoints whose configuration is absent here rather than broken: a webhook
 * with no signing secret answers 500 because it is not configured, which is
 * the correct answer to being asked to verify a signature it cannot.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { SITE_URL } from '../api/_lib/site.js';

Object.assign(process.env, {
  SUPABASE_URL: 'https://example.invalid', SUPABASE_SERVICE_KEY: 'test-key',
  SUPABASE_ANON_KEY: 'test-key', RESEND_API_KEY: 'test-key',
  ADMIN_SECRET: 'admin-test', INTERNAL_API_SECRET: 'internal-test',
  STRIPE_SECRET_KEY: 'sk_test', CRON_SECRET: 'cron-test',
});
globalThis.fetch = async (u) => new Response(
  String(u).includes('/auth/v1/user') ? '{"id":"00000000-0000-4000-8000-000000000000"}' : '[]',
  { status: 200, headers: { 'content-type': 'application/json' } });

/** Not broken, unconfigured: these need a secret this harness cannot invent. */
/**
 * Endpoints that refuse on a missing environment variable before they ever
 * look at the body. Their 5xx is the right answer to "you have not set this
 * up", not a handler falling over, and on the live site the variable is set
 * so the path never runs.
 *
 * generate-pdf.js joined them when the two nodejs handlers stopped being
 * skipped: it answers 503 "PDF renderer not configured" with no Browserless
 * key, which is exactly this.
 */
const UNCONFIGURED = new Set([
  'admin-login.js', 'stripe-webhook.js', 'recompute-entitlements.js', 'generate-pdf.js',
]);

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

/**
 * ── THE TWO NODEJS HANDLERS, WHICH USED TO BE SKIPPED ───────────────────
 * This file said, for months, that they "need a different harness". A sweep
 * of every endpoint's error path wrote one, so they are no longer a blind
 * spot: both answer 503 to a body they cannot use and neither throws.
 *
 * Vercel's two runtimes take different handlers. Edge receives (req) and
 * returns a Response; nodejs receives (req, res) and writes to res. Calling a
 * nodejs handler with one argument throws on `res.status`, which is what the
 * sweep reported as eight failures in two files before it knew the
 * difference.
 */
function nodeShim() {
  const out = { status: 200, body: '' };
  const res = {
    status(c) { out.status = c; return res; },
    setHeader() { return res; },
    json(o) { out.body += JSON.stringify(o); return res; },
    send(o) { out.body += typeof o === 'string' ? o : JSON.stringify(o); return res; },
    end(o) { if (o) out.body += String(o); return res; },
    write(o) { out.body += String(o); return res; },
  };
  return { out, res };
}

/**
 * What must never be in an answer, however badly the request went.
 *
 * A stack frame tells an attacker the shape of the server; a key tells them
 * everything. api/_lib/http.js has safeError for exactly this and the point
 * of checking is that one endpoint will forget to use it.
 *
 * Values, never names. The first version matched the string SUPABASE_SERVICE
 * and flagged api/admin-env.js, whose entire job is to list which variables
 * are set: the name of a secret is not a secret, and a check that cannot tell
 * them apart gets switched off. So this looks for the shapes a real key has.
 */
const LEAK = /\bat\s+\w+\s*\(|\.js:\d+:\d+|node_modules|eyJ[A-Za-z0-9_-]{16}|sk_live_[A-Za-z0-9]{8}|sk_test_[A-Za-z0-9]{8}|whsec_[A-Za-z0-9]{8}|service_role/;

console.log = () => {}; console.warn = () => {}; console.error = () => {};
for (const f of files) {
  if (UNCONFIGURED.has(f)) continue;
  let mod;
  try { mod = await import(`${ROOT}api/${f}`); } catch (e) {
    problems.push(`api/${f} will not import: ${String(e.message).slice(0, 80)}`);
    continue;
  }
  if (typeof mod.default !== 'function') continue;
  const isNode = mod.config?.runtime === 'nodejs';
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
      let status; let text = '';
      if (isNode) {
        const { out, res } = nodeShim();
        await mod.default({
          method: 'POST', url: req.url,
          headers: Object.fromEntries(req.headers), body: undefined,
        }, res);
        status = out.status; text = out.body;
      } else {
        const res = await mod.default(req);
        status = res && res.status;
        text = res ? await res.clone().text().catch(() => '') : '';
      }
      if (status >= 500) {
        problems.push(`api/${f} answered ${status} to ${name}. A body it cannot use is a 400.`);
      }
      if (LEAK.test(text)) {
        problems.push(`api/${f} put something in its answer to ${name} that belongs in a log: ${text.replace(/\s+/g, ' ').slice(0, 80)}`);
      }
    } catch (e) {
      problems.push(`api/${f} threw on ${name}: ${String(e.message).slice(0, 70)}`);
    }
  }

  /* And the default GET, which is how a reader asks for a list. */
  const get = new Request(`${SITE_URL}/api/${f.replace(/\.js$/, '')}`, {
    headers: {
      origin: SITE_URL,
      authorization: 'Bearer admin-test', 'x-attune-internal': 'internal-test',
    },
  });
  called++;
  try {
    let status; let text = '';
    if (isNode) {
      const { out, res } = nodeShim();
      await mod.default({
        method: 'GET', url: get.url,
        headers: Object.fromEntries(get.headers), body: undefined,
      }, res);
      status = out.status; text = out.body;
    } else {
      const res = await mod.default(get);
      status = res && res.status;
      text = res ? await res.clone().text().catch(() => '') : '';
    }
    if (status >= 500) {
      problems.push(`api/${f} answered ${status} to a plain GET. Refusing is a 400, a 401`
        + ' or a 405; a 500 is the handler falling over before it declined.');
    }
    if (LEAK.test(text)) {
      problems.push(`api/${f} put something in its answer to a plain GET that belongs in a log: ${text.replace(/\s+/g, ' ').slice(0, 80)}`);
    }
  } catch (e) {
    problems.push(`api/${f} threw on a plain GET: ${String(e.message).slice(0, 70)}`);
  }
}
[console.log, console.warn, console.error] = quiet;

/**
 * ── AND THE OTHER HALF: A GOOD BODY HAS TO BE ACCEPTED ────────────────────
 * Everything above asks whether a malformed body is refused politely. It
 * cannot see the opposite mistake, because a refusal is what it is looking
 * for: api/convos.js read
 *
 *     const body = await jsonBody(req);
 *     const key = convoKey(body?.key);
 *
 * and jsonBody answers `{ body }` or `{ error }`, never the body itself. So
 * `body.key` was undefined on every request and the endpoint answered 400
 * "bad conversation" to a perfectly good one. Every checkbox on both surfaces
 * filled and emptied again, which reads as a design decision rather than a
 * failure, and a 400 is also the right answer to a genuinely bad key.
 *
 * This is the same family as the auth one found the same afternoon, and as
 * `resultsGate` being handed the whole capabilities object rather than its
 * `caps` half: a function's return given the right name and the wrong keys.
 *
 * The rule: a caller of jsonBody must read `.body` off what it got back, or
 * destructure it. Treating the return as the body is the bug. Static, because
 * driving it only proves a refusal, which is what the bug looks like.
 */
{
  const shape = [];
  for (const f of readdirSync(new URL('../api', import.meta.url))) {
    if (!f.endsWith('.js')) continue;
    const src = readFileSync(new URL(`../api/${f}`, import.meta.url), 'utf8')
      .replace(/\/\*[^]*?\*\//g, ' ').replace(/^\s*\/\/[^\n]*/gm, ' ');
    for (const m of src.matchAll(/(?:const|let|var)\s+(\{[^}]*\}|[A-Za-z_$][\w$]*)\s*=\s*await\s+jsonBody\(/g)) {
      const target = m[1];
      // Destructuring the pair is correct by construction.
      if (target.startsWith('{')) {
        if (!/\bbody\b/.test(target)) {
          shape.push(`api/${f} destructures jsonBody's answer without taking \`body\`: ${target}`);
        }
        continue;
      }
      /* A plain name. The two keys on that answer are `body` and `error`, so
         any OTHER field read off it is a field that does not exist.

         Not "it must read .body": api/partner-nudge.js parses the body and
         deliberately ignores it, with a comment saying why, because the nudge
         is decided by who the caller is partnered with rather than by what
         they asked for. That is correct and must keep passing. What is never
         correct is reaching through the wrapper for a field of the body. */
      const after = src.slice(m.index + m[0].length);
      const reads = [...after.matchAll(new RegExp(`\\b${target}\\s*\\??\\.\\s*([A-Za-z_$][\\w$]*)`, 'g'))]
        .map((r) => r[1]);
      const wrong = [...new Set(reads.filter((k) => k !== 'body' && k !== 'error'))];
      if (wrong.length) {
        shape.push(`api/${f} reads \`${target}.${wrong[0]}\` off jsonBody's answer.`
          + ' That answer is { body } or { error }, so that field is undefined on every'
          + ` request and the endpoint refuses a body that was fine. Read \`${target}.body\` first.`);
      }
    }
  }
  if (shape.length) {
    console.error('[check-body-parsing] an endpoint reads the wrapper instead of the body:\n');
    for (const p of shape) console.error('  ' + p);
    console.error('\napi/_lib/http.js: jsonBody(req) answers { body } on success and { error }');
    console.error('on a bad body. The three-line form every other endpoint uses is:');
    console.error('\n  const _parsed = await jsonBody(req);');
    console.error('  if (_parsed.error) return _parsed.error;');
    console.error('  const body = _parsed.body;\n');
    process.exit(1);
  }
}

if (problems.length) {
  console.error('[check-body-parsing] an endpoint falls over on a body it should refuse:\n');
  for (const p of problems) console.error('  ' + p);
  console.error('\napi/_lib/http.js exports jsonBody(req), which returns an object or the 400.');
  process.exit(1);
}

console.log(`[check-body-parsing] ${called} calls across ${files.length - UNCONFIGURED.size} endpoints,`
  + ' seven malformed bodies and a bare GET each; none threw and none answered 5xx,'
  + " and every caller of jsonBody reads the body off its answer rather than the answer itself.");
