#!/usr/bin/env node
/**
 * A response body used as data without anything asking whether the request
 * worked.
 *
 * `const j = await res.json()` reads the body of a 500 or a 401 as readily as
 * a 200's. Every endpoint here answers a failure as `{ ok: false, error }` or
 * `{ error }`, so the body is still an object and code that reads `j.rows` or
 * `j.items` gets undefined and draws an empty state: a failed request becomes
 * "nothing here". That is the A170 shape (a failed read stated as a fact
 * about somebody) arriving through the network rather than the database.
 *
 * Counted as checked: any reference, before or after the read within the same
 * window, to the response's `.ok` or `.status`, or to the body's `.ok`,
 * `.error`, `.ready` or `.reason`. Generous on purpose: what is left is the
 * set nobody looked at, and each one is read by a person before it is called
 * a bug.
 *
 * Scope: src/, public/ (inline scripts too), attune-app/src.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = new URL('../../', import.meta.url).pathname;
const files = [];
const walk = (d) => { for (const e of readdirSync(d)) { if (e === 'node_modules' || e.startsWith('.')) continue; const p = join(d, e); if (statSync(p).isDirectory()) walk(p); else if (/\.(m?js|jsx|ts|tsx|html)$/.test(e)) files.push(p); } };
for (const d of ['src', 'public', 'attune-app/src']) walk(join(ROOT, d));
let total = 0; const out = [];
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/(?:const|let|var)?\s*([A-Za-z_$][\w$]*)\s*=\s*(?:noteDemoFilter\()?\s*await\s+([A-Za-z_$][\w$]*)\.json\(\)/g)) {
    total++;
    const [, body, res] = m;
    const win = src.slice(Math.max(0, m.index - 400), m.index + 600);
    const checked = new RegExp(`\\b${res}\\s*\\.\\s*(ok|status)\\b|\\b${body}\\s*(\\?\\.|\\.)\\s*(ok|error|ready|reason)\\b|!\\s*${body}\\b|\\b${body}\\s*&&`).test(win);
    if (!checked) out.push(`${f.replace(ROOT, '')}:${src.slice(0, m.index).split('\n').length}  ${m[0].trim().slice(0, 70)}`);
  }
}
/* ── THE SECOND SPELLING ─────────────────────────────────────────────────
   The first run counted 44 reads and the codebase has well over that: most
   of the clients write `.then(r => r.json()).then(d => ...)`, which the
   `= await x.json()` matcher cannot see. Checked the same way, over the next
   callback in the chain. */
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\.then\(\s*\(?\s*([A-Za-z_$][\w$]*)\s*\)?\s*=>\s*\1\.json\(\)\s*\)/g)) {
    total++;
    const res = m[1];
    const before = src.slice(Math.max(0, m.index - 200), m.index);
    const after = src.slice(m.index, m.index + 500);
    const next = after.match(/\.then\(\s*\(?\s*([A-Za-z_$][\w$]*|\{[^}]*\})\s*\)?\s*=>/g);
    const body = next && next[1] ? next[1].replace(/^\.then\(\s*\(?\s*/, '').replace(/\s*\)?\s*=>$/, '') : null;
    const checked = new RegExp(`\\b${res}\\s*\\.\\s*(ok|status)\\b`).test(before + after)
      || (body && /^[A-Za-z_$]/.test(body) && new RegExp(`\\b${body}\\s*(\\?\\.|\\.)\\s*(ok|error|ready|reason)\\b|!\\s*${body}\\b|\\b${body}\\s*&&|\\(\\s*${body}\\s*&&`).test(after))
      || (body && /^\{/.test(body) && /\b(ok|error)\b/.test(body));
    if (!checked) out.push(`${f.replace(ROOT, '')}:${src.slice(0, m.index).split('\n').length}  ${after.slice(0, 110).replace(/\s+/g, ' ')}`);
  }
}
console.log(`${total} bodies read with .json(); ${out.length} with nothing asking whether the request worked:`);
for (const x of out) console.log('  ' + x);
