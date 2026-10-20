/**
 * Sweep: a named constant declared on more than one surface, and whether the
 * two values agree.
 *
 * The shape this codebase keeps shipping. "Values that agree today are the
 * ones nothing watches." Agreement is not the all-clear here; it is the
 * reason nobody looks.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url).pathname;
const SURFACES = { server: 'api', site: 'src', app: 'attune-app/src' };

function walk(dir, out = []) {
  for (const n of readdirSync(`${ROOT}${dir}`)) {
    if (n === 'node_modules' || n.startsWith('.')) continue;
    const rel = `${dir}/${n}`;
    if (statSync(`${ROOT}${rel}`).isDirectory()) walk(rel, out);
    else if (/\.(js|jsx|ts|tsx)$/.test(n)) out.push(rel);
  }
  return out;
}

/** UPPER_SNAKE constants with a one-line literal value. */
const found = new Map();
for (const [surface, dir] of Object.entries(SURFACES)) {
  for (const f of walk(dir)) {
    const src = readFileSync(ROOT + f, 'utf8');
    for (const m of src.matchAll(/^(?:export\s+)?const ([A-Z][A-Z0-9_]{3,}) = (.+?);?\s*$/gm)) {
      const [, name, raw] = m;
      const value = raw.replace(/\s+/g, ' ').replace(/ as const$/, '').trim();
      if (!found.has(name)) found.set(name, []);
      found.get(name).push({ surface, file: f, value });
    }
  }
}

const twins = [...found.entries()].filter(([, defs]) =>
  new Set(defs.map((d) => d.surface)).size > 1);

let agree = 0;
const differ = [];
for (const [name, defs] of twins) {
  const values = new Set(defs.map((d) => d.value));
  if (values.size === 1) agree += 1;
  else differ.push([name, defs]);
}

console.log(`${found.size} named constants; ${twins.length} declared on more than one surface`);
console.log(`${agree} agree exactly, ${differ.length} do not\n`);
for (const [name, defs] of differ) {
  console.log(`  ${name}`);
  for (const d of defs) console.log(`    ${d.surface.padEnd(7)} ${d.file}\n            ${d.value.slice(0, 95)}`);
  console.log('');
}
