#!/usr/bin/env node
/**
 * A cache that is filled when the answer ARRIVES, read by callers who may ask
 * before it has.
 *
 * Found in the admin as ensureCube: `if (cache) return cache; ... cache = j`
 * after an await. Every caller that asked while the first request was in
 * flight found the cache empty and sent its own request: nine for one page
 * visit. The fix is to keep the promise.
 *
 * Shape matched: a function whose body begins by returning a variable when it
 * is set, and later assigns that same variable AFTER an await. A variable that
 * holds a promise (assigned from a call not awaited) is the safe form and is
 * reported separately so the count says what was looked at.
 *
 * Scope: every .js/.jsx/.ts/.tsx under api/, src/, attune-app/src, and the
 * inline scripts of every .html under public/.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = new URL('../../', import.meta.url).pathname;
const files = [];
const walk = (d) => { for (const e of readdirSync(d)) { if (e === 'node_modules' || e.startsWith('.')) continue; const p = join(d, e); if (statSync(p).isDirectory()) walk(p); else if (/\.(m?js|jsx|ts|tsx|html)$/.test(e)) files.push(p); } };
for (const d of ['api', 'src', 'attune-app/src', 'public']) walk(join(ROOT, d));

const found = [], safe = [];
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/if\s*\(\s*([A-Za-z_$][\w$.]*)\s*(?:&&[^)]{0,80})?\)\s*return\s+(?:Promise\.resolve\()?\s*\1\b/g)) {
    const name = m[1];
    const after = src.slice(m.index, m.index + 1500);
    const esc = name.replace(/[.$]/g, '\\$&');
    const assign = after.match(new RegExp(`(?<![\\w.])${esc}\\s*=(?!=)\\s*([^;\\n]{0,80})`));
    if (!assign) continue;
    const before = after.slice(0, assign.index);
    const line = src.slice(0, m.index).split('\n').length;
    const rel = f.replace(ROOT, '');
    if (/^\s*(await\b|new Promise|fetch\(|[\w.]+\(\)?.*\.then\(|\(async)/.test(assign[1]) && !/^\s*await\b/.test(assign[1])) { safe.push(`${rel}:${line} ${name} = ${assign[1].slice(0, 50)}`); continue; }
    /* The fixed form: the same function hands back a promise it keeps while
       the request is out, so later callers wait on it rather than refetch. */
    if (/return\s+[\w$]*(InFlight|Promise|inflight|pending)\b/.test(before)) { safe.push(`${rel}:${line} ${name} (shares the request in flight)`); continue; }
    if (/\bawait\b/.test(before) || /^\s*await\b/.test(assign[1])) found.push(`${rel}:${line}  ${name} = ${assign[1].slice(0, 60)}`);
    else safe.push(`${rel}:${line} ${name} (no await before the fill)`);
  }
}
console.log(`${files.length} files. ${found.length} caches filled after an await, ${safe.length} other memo shapes.`);
for (const x of found) console.log('  FILLED ON ARRIVAL  ' + x);
if (process.env.ALL) for (const x of safe) console.log('  other  ' + x);
