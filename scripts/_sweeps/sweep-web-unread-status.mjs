#!/usr/bin/env node
/**
 * sweep-web-unread-status: a response the website parses without asking
 * whether the request worked.
 *
 * The server half of this was A170 (a failed read handed back as null became
 * "your partner has done nothing"). The website was never swept. Shape: `const
 * r = await fetch(...)` followed by `r.json()` with no `r.ok` or `r.status`
 * between them. A 500 with a JSON body then reads exactly like an answer.
 * Each hit is read by a person; the ones that matter turn a failure into a
 * statement about somebody.
 */
import { readFileSync, readdirSync } from 'node:fs';
const ROOT = new URL('../..', import.meta.url).pathname;
const files = [
  ...readdirSync(`${ROOT}src`).filter((f) => /\.(jsx|js)$/.test(f)).map((f) => `src/${f}`),
  ...readdirSync(`${ROOT}public`).filter((f) => f.endsWith('.html')).map((f) => `public/${f}`),
];
let n = 0, hits = 0;
for (const f of files) {
  const lines = readFileSync(`${ROOT}${f}`, 'utf8').split('\n');
  lines.forEach((l, i) => {
    const m = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*await\s+(?:withTimeout\()?\s*fetch\(/.exec(l);
    if (!m) return;
    n++;
    const v = m[1];
    const after = lines.slice(i, i + 25).join('\n');
    const jsonAt = after.search(new RegExp(`\\b${v}\\.json\\(`));
    if (jsonAt < 0) return;
    // Asked before the parse, or within a few lines after it: both are a look.
    // The first version counted only before, and called 19 careful reads bad.
    const window = after.slice(0, jsonAt + 600);
    if (new RegExp(`\\b${v}\\.(ok|status)\\b|!${v}\\b|${v}\\s*&&`).test(window)) return;
    // `r.ok ? await r.json() : ...` on the same expression counts as checked.
    if (new RegExp(`${v}\\.ok\\s*\\?`).test(after.slice(jsonAt - 40, jsonAt + 10))) return;
    hits++;
    console.log(`${f}:${i + 1}  ${l.trim().slice(0, 110)}`);
  });
}
console.log(`\n${n} awaited responses; ${hits} parsed with no look at whether the request worked.`);
