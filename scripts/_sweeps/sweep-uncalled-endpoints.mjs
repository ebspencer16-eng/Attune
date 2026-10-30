#!/usr/bin/env node
/**
 * Every deployed endpoint, against everything that could call it.
 *
 * The other direction from sweep-fetch-routes, which asks whether every path a
 * surface calls exists. This asks whether every endpoint that exists is called.
 * A deployed route nothing calls is surface area with no reader: it can still
 * be reached from outside, and the next change to it is checked by nobody.
 *
 * Callers counted: the website (src/), every static page and script under
 * public/, the app (attune-app/src), vercel.json (crons and rewrites), and any
 * api/ module that builds a link to it (an email's unsubscribe link, a webhook
 * URL handed to Stripe). scripts/ is NOT a caller: a gate exercising a route is
 * not a person reaching it.
 *
 * An endpoint can be called by name built at run time (`/api/admin-${x}`), so
 * every hit here is a lead to read, not a verdict.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = new URL('../../', import.meta.url).pathname;
const endpoints = readdirSync(join(ROOT, 'api')).filter((f) => f.endsWith('.js') && !f.startsWith('_')).map((f) => f.replace(/\.js$/, ''));
const files = [];
const walk = (d) => { for (const e of readdirSync(d)) { if (e === 'node_modules' || e.startsWith('.')) continue; const p = join(d, e); if (statSync(p).isDirectory()) walk(p); else if (/\.(m?js|jsx|ts|tsx|html|json)$/.test(e)) files.push(p); } };
for (const d of (process.env.NO_API ? ['src', 'public', 'attune-app/src'] : ['src', 'public', 'attune-app/src', 'api'])) walk(join(ROOT, d));
files.push(join(ROOT, 'vercel.json'));
/* ── THE FIRST RUN SAID NOTHING, AND THAT WAS THE HARNESS ──────────────
   vercel.json rewrites every endpoint to its own file ("/api/x" to
   "/api/x.js"), so every endpoint had a caller and the sweep reported none.
   Only a cron path, or a rewrite from some OTHER address, is a caller. */
const vercelCallers = (() => {
  const v = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
  const out = [];
  for (const c of v.crons || []) out.push(c.path);
  for (const r of [...(v.rewrites || []), ...(v.redirects || [])]) {
    if (!String(r.source).startsWith('/api/')) out.push(r.destination);
  }
  return out.join('\n');
})();
const texts = files.filter((f) => !f.endsWith('vercel.json')).map((f) => [f.replace(ROOT, ''), readFileSync(f, 'utf8')]);
texts.push(['vercel.json (crons, outside rewrites)', vercelCallers]);
const out = [];
for (const ep of endpoints) {
  const re = new RegExp(`/api/${ep}(?![\\w-])`);
  const callers = texts.filter(([rel, t]) => rel !== `api/${ep}.js` && re.test(t)).map(([rel]) => rel);
  if (!callers.length) out.push(ep);
}
console.log(`${endpoints.length} endpoints; ${out.length} with no caller outside scripts/:`);
for (const ep of out) console.log('  /api/' + ep);
