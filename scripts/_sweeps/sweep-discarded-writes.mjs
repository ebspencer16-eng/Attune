#!/usr/bin/env node
/**
 * A write whose answer nobody reads.
 *
 * Found first as the contact form: `await fetch('/api/send-email', ...)` as a
 * bare statement, then "Message sent" whatever came back. Every message from
 * that page had been refused for seven months.
 *
 * Shape: a fetch with a method other than GET that is a bare statement
 * (`await fetch(...)` or `fetch(...)` with no `.then` reading the response
 * and no assignment). Some are deliberate fire-and-forget beacons (page
 * timing, a read receipt); each hit is read by a person, and the ones that
 * tell somebody something happened are the bugs.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = new URL('../../', import.meta.url).pathname;
const files = [];
const walk = (d) => { for (const e of readdirSync(d)) { if (e === 'node_modules' || e.startsWith('.')) continue; const p = join(d, e); if (statSync(p).isDirectory()) walk(p); else if (/\.(m?js|jsx|ts|tsx|html)$/.test(e)) files.push(p); } };
for (const d of ['src', 'public', 'attune-app/src']) walk(join(ROOT, d));
let writes = 0; const out = [];
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/(^|[;{}\n]\s*)(await\s+)?fetch\(/g)) {
    const at = m.index + m[0].length - 'fetch('.length;
    // the call's own text, to its closing paren
    let depth = 0, i = at + 5, end = -1;
    for (; i < src.length && i < at + 3000; i++) { const c = src[i]; if (c === '(') depth++; else if (c === ')') { depth--; if (depth === 0) { end = i; break; } } }
    if (end < 0) continue;
    const call = src.slice(at, end + 1);
    if (!/method\s*:\s*['"`](POST|PUT|PATCH|DELETE)/i.test(call)) continue;
    writes++;
    const tail = src.slice(end + 1, end + 40);
    if (/^\s*\.(then|catch)/.test(tail) && !/^\s*\.catch\(\s*\(?\s*\w*\s*\)?\s*=>\s*\{?\s*\}?\s*\)/.test(tail) && /^\s*\.then/.test(tail)) continue;
    out.push(`${f.replace(ROOT, '')}:${src.slice(0, at).split('\n').length}  ${call.slice(0, 60).replace(/\s+/g, ' ')}`);
  }
}
console.log(`${writes} write requests as statements; ${out.length} whose answer is never read:`);
for (const x of out) console.log('  ' + x);
