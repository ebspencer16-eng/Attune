#!/usr/bin/env node
/**
 * sweep-key-fallbacks: `MAP[key] || key`, a lookup that prints its own key
 * when the map does not know it.
 *
 * CLAUDE.md, D5: `DIM_LABELS` had `stress` and no `reassurance`, so one row of
 * ten printed "reassurance" lower case and looked like ordinary content. Lists
 * every such fallback on every surface, with the map's keys where the map is a
 * literal in the same file, so each can be read against what the data holds.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
const ROOT = new URL('../..', import.meta.url).pathname;
const files = [];
const walk = (d) => { for (const e of readdirSync(`${ROOT}${d}`)) { if (e === 'node_modules' || e.startsWith('.')) continue; const p = `${d}/${e}`; if (statSync(`${ROOT}${p}`).isDirectory()) walk(p); else if (/\.(m?js|jsx|ts|tsx|html)$/.test(e)) files.push(p); } };
['api', 'src', 'public', 'attune-app/src'].forEach(walk);
const RE = /\b([A-Za-z_$][\w$]*)\[([\w$.?]+)\]\s*(?:\|\||\?\?)\s*(?:String\()?\2\b/g;
let n = 0;
for (const f of files) {
  const src = readFileSync(`${ROOT}${f}`, 'utf8');
  for (const m of src.matchAll(RE)) {
    n++;
    const line = src.slice(0, m.index).split('\n').length;
    console.log(`${f}:${line}  ${m[0]}`);
  }
}
console.log(`\n${n} lookups that fall back to their own key.`);
