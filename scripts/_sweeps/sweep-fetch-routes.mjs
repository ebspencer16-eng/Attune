/**
 * Every /api path a surface fetches, against every endpoint that exists.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * A fetch to a route that is not there answers 404 with an HTML body, and the
 * caller's `await r.json()` throws into whatever catch is nearest. This
 * codebase's catches are mostly careful, which makes it worse: the failure
 * becomes an empty list or a safe default, and the feature reads as "nothing
 * here yet". Exactly the shape of the app sharing `/in-practice/<id>` when
 * the pages live at `/practice/<slug>`, which 404'd on every share for as
 * long as the feature existed.
 *
 * ── WHAT COUNTS AS EXISTING ───────────────────────────────────────────────
 * A file under api/ whose name matches, or a rewrite in vercel.json that
 * sends the path somewhere. Both, because a gate that knew only the first
 * would call every rewritten route broken.
 *
 * ── WHAT IT CANNOT SEE ────────────────────────────────────────────────────
 * A path built from a variable, `/api/${name}`. Counted and reported, not
 * skipped.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const endpoints = new Set();
for (const f of readdirSync('api')) if (f.endsWith('.js') && !f.startsWith('_')) endpoints.add(f.replace(/\.js$/, ''));

let rewrites = [];
if (existsSync('vercel.json')) {
  try { rewrites = JSON.parse(readFileSync('vercel.json', 'utf8')).rewrites || []; } catch {}
}
const rewritten = (p) => rewrites.some((r) => {
  const src = String(r.source || '');
  if (src === p) return true;
  /* :param and * segments, turned into a matcher rather than compared. */
  const re = new RegExp('^' + src.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/:[^/]+/g, '[^/]+').replace(/\*/g, '.*') + '$');
  return re.test(p);
});

const files = [];
const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) {
  if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') continue;
  if (e.isDirectory()) walk(join(d, e.name));
  else if (/\.(js|jsx|ts|tsx|html|mjs)$/.test(e.name)) files.push(join(d, e.name)); } };
for (const d of ['src', 'public', 'attune-app/src']) if (existsSync(d)) walk(d);

let literal = 0, dynamic = 0;
const missing = new Map();
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/['"`]\/api\/([A-Za-z0-9_-]+)(?=['"`?\/])/g)) {
    literal++;
    const name = m[1];
    if (endpoints.has(name) || rewritten('/api/' + name)) continue;
    const key = name + '  <- ' + file + ':' + src.slice(0, m.index).split('\n').length;
    missing.set(key, (missing.get(key) || 0) + 1);
  }
  dynamic += [...src.matchAll(/['"`]\/api\/\$\{/g)].length;
}

console.log('[sweep-fetch-routes]');
console.log(`  ${endpoints.size} endpoints under api/, ${rewrites.length} rewrites in vercel.json.`);
console.log(`  ${literal} literal /api paths across ${files.length} files; ${dynamic} built from a variable and not resolved here.`);
if (!missing.size) { console.log('  Every literal path resolves to an endpoint or a rewrite.'); process.exit(0); }
console.log(`  ${missing.size} that do not:`);
for (const k of [...missing.keys()].sort()) console.log('    ' + k);
