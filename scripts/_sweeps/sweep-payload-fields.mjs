/**
 * Sweep: a field the app READS off a payload that the server never SETS.
 *
 * check-app-draws-payload runs the other direction: the server sends something
 * and no surface draws it. This is the direction that produced the annotations
 * bug, where results.tsx read `notes` and the endpoint's anchored list is
 * `annotations`: a real field, the wrong one, and nothing failed.
 *
 * Deliberately loose and reported as leads, not findings. A name can be set
 * through a spread, a variable key or a rename, so anything here has to be
 * checked by hand before it means anything.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url).pathname;

function walk(dir, out = []) {
  for (const n of readdirSync(`${ROOT}${dir}`)) {
    if (n === 'node_modules' || n.startsWith('.')) continue;
    const rel = `${dir}/${n}`;
    if (statSync(`${ROOT}${rel}`).isDirectory()) walk(rel, out);
    else if (/\.(js|jsx|ts|tsx)$/.test(n)) out.push(rel);
  }
  return out;
}

const serverSrc = walk('api').map((f) => readFileSync(ROOT + f, 'utf8')).join('\n');
const appFiles = walk('attune-app/src');

/** `r.data.something` and `payload.something` style reads in the app. */
const reads = new Map();
for (const f of appFiles) {
  const src = readFileSync(ROOT + f, 'utf8');
  for (const m of src.matchAll(/\b(?:data|payload|res|r|results|content|home)\.([a-z][A-Za-z0-9]{3,})\b/g)) {
    const name = m[1];
    if (!reads.has(name)) reads.set(name, new Set());
    reads.get(name).add(f);
  }
}

/** Does the server ever write that key? */
const leads = [];
for (const [name, files] of reads) {
  /**
   * Four ways a server object can carry a key, and the first version of this
   * sweep knew one of them. All seven of its "findings" were shorthand
   * properties: `return { groups, buckets }`. Most of how this codebase builds
   * a payload was invisible to it, so a clean run would have meant nothing.
   */
  const set = new RegExp(`(^|[^\\w.])${name}\\s*:`, 'm');
  const quoted = new RegExp(`['"\`]${name}['"\`]\\s*:`);
  const shorthand = new RegExp(`[{,]\\s*${name}\\s*[,}]`);
  const computed = new RegExp(`\\[\\s*['"\`]?${name}`);
  if (!set.test(serverSrc) && !quoted.test(serverSrc)
      && !shorthand.test(serverSrc) && !computed.test(serverSrc)) {
    leads.push([name, [...files]]);
  }
}
leads.sort((a, b) => a[0].localeCompare(b[0]));
console.log(`${reads.size} distinct payload-shaped reads in the app`);
console.log(`${leads.length} name a key nothing under api/ ever sets\n`);
for (const [name, files] of leads) console.log(`  ${name.padEnd(26)} ${files.slice(0, 2).join(', ')}`);
