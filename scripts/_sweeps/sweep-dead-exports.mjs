/**
 * Sweep: an exported name nothing imports.
 *
 * CLAUDE.md ran this once and the lesson was that most dead exports are
 * clutter, and "the bug-shaped version is a definition that READS like a
 * feature". So this reports them split: a function (which reads like a
 * feature) and a constant (which usually does not).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url).pathname;
const TREES = ['api', 'src', 'attune-app/src', 'scripts'];

function walk(dir, out = []) {
  for (const n of readdirSync(`${ROOT}${dir}`)) {
    if (n === 'node_modules' || n.startsWith('.')) continue;
    const rel = `${dir}/${n}`;
    if (statSync(`${ROOT}${rel}`).isDirectory()) walk(rel, out);
    else if (/\.(js|jsx|ts|tsx|mjs)$/.test(n)) out.push(rel);
  }
  return out;
}
const files = TREES.flatMap((t) => walk(t));
const sources = new Map(files.map((f) => [f, readFileSync(ROOT + f, 'utf8')]));

/** Every exported name, with what kind of thing it is. */
const exports = [];
for (const [file, src] of sources) {
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    exports.push({ file, kind: m[1], name: m[2] });
  }
  for (const m of src.matchAll(/^export\s*\{\s*([^}]+)\}/gm)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop().trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) exports.push({ file, kind: 're-export', name });
    }
  }
}

const dead = [];
for (const e of exports) {
  let used = 0;
  const re = new RegExp(`\\b${e.name.replace(/\$/g, '\\$')}\\b`);
  for (const [file, src] of sources) {
    if (file === e.file) continue;
    if (re.test(src)) { used += 1; break; }
  }
  if (!used) dead.push(e);
}

const byKind = {};
for (const d of dead) (byKind[d.kind] ||= []).push(d);
console.log(`${exports.length} exported names across ${files.length} files`);
console.log(`${dead.length} are imported by no other file\n`);
for (const kind of ['function', 'class', 'const', 'let', 're-export']) {
  const list = byKind[kind] || [];
  if (!list.length) continue;
  console.log(`--- ${kind}: ${list.length} ---`);
  for (const d of list) console.log(`  ${d.file}  ${d.name}`);
}
