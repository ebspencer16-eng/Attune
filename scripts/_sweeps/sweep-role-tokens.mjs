/**
 * Sweep: two resolveRoleTokens, one per surface. Do they produce the same
 * sentence for the same couple?
 *
 * check-role-tokens runs only the server's. The website has its own, with a
 * different signature, called on the couple type page.
 */
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import { COUPLE_TYPES } from '../../api/_couple-types.js';
import { resolveRoleTokens as server } from '../../api/_lib/role-tokens.js';
import { pronounForm } from '../../api/_lib/role-tokens.js';

const ROOT = new URL('../../', import.meta.url).pathname;

function lift(file, name, extra) {
  const src = readFileSync(ROOT + file, 'utf8');
  const i = src.search(new RegExp(`(^|\\n)\\s*(export )?function ${name}\\b`));
  if (i === -1) throw new Error(`${name} not found in ${file}: refusing to report a result`);
  let depth = 0, started = false, j = i;
  for (; j < src.length; j += 1) {
    if (src[j] === '{') { depth += 1; started = true; }
    else if (src[j] === '}') { depth -= 1; if (started && depth === 0) { j += 1; break; } }
  }
  const js = transformSync(`${extra}\n${src.slice(i, j).replace(/^\s*export\s+/, '')}\nexport default ${name};`,
    { loader: 'jsx', format: 'esm' }).code;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
}

/* The website's two helpers, stubbed to the same answers the server is given,
   so the only thing that differs between the two runs is the resolver. */
const PRONOUN_TABLE = {
  'she/her': { sub: 'she', obj: 'her', pos: 'her', ref: 'herself', isC: "she's" },
  'he/him': { sub: 'he', obj: 'him', pos: 'his', ref: 'himself', isC: "he's" },
  'they/them': { sub: 'they', obj: 'them', pos: 'their', ref: 'themselves', isC: "they're" },
};
/* The website's pronoun() is the server's pronounForm, which both files
   already share. Reusing it here is right: the thing under test is the
   RESOLVER, so anything else differing would be noise. */
const stub = `
const computeIndividualType = (s) => ({ openScore: s.open, withdrawScore: s.withdraw });
const PRONOUNS = ${JSON.stringify(PRONOUN_TABLE)};
const pronoun = ${pronounForm.toString()};
`;
const site = (await lift('src/App.jsx', 'resolveRoleTokens', stub + `\nimport { resolveRoleTokens as resolveRoleTokensShared } from '${new URL('../../api/_lib/role-tokens.js', import.meta.url).href}';`)).default;

/** Four couples: opposite on both axes, alike on both, and one of each. */
const COUPLES = [
  ['opposite on both', { open: 4.2, withdraw: 2.1 }, { open: 2.3, withdraw: 3.9 }],
  ['alike on both', { open: 4.1, withdraw: 2.2 }, { open: 4.4, withdraw: 2.0 }],
  ['opposite on open only', { open: 4.2, withdraw: 2.1 }, { open: 2.3, withdraw: 2.2 }],
  ['opposite on engage only', { open: 4.2, withdraw: 2.1 }, { open: 4.1, withdraw: 3.9 }],
];

const strings = [];
const walk = (v, path) => {
  if (typeof v === 'string') { strings.push([path, v]); return; }
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
};
walk(COUPLE_TYPES, 'COUPLE_TYPES');
if (strings.length < 100) {
  console.error(`only ${strings.length} strings found, which cannot be right`);
  process.exit(1);
}

let compared = 0;
const diffs = [];
for (const [label, sa, sb] of COUPLES) {
  const a = { name: 'Ellie', pronouns: 'she/her', axes: sa };
  const b = { name: 'Preston', pronouns: 'he/him', axes: sb };
  for (const [path, str] of strings) {
    compared += 1;
    const s1 = server(str, a, b);
    const s2 = site(str, sa, sb, 'Ellie', 'Preston', 'she/her', 'he/him');
    if (s1 !== s2) diffs.push([label, path, s1, s2]);
  }
}

console.log(`compared ${compared} resolutions: ${strings.length} strings x ${COUPLES.length} couples`);
console.log(`disagreements: ${diffs.length}`);
const seen = new Set();
for (const [label, path, s1, s2] of diffs) {
  const key = path;
  if (seen.has(key)) continue;
  seen.add(key);
  if (seen.size > 8) break;
  console.log(`\n  ${path}  (${label})`);
  console.log(`    server: ${s1.slice(0, 120)}`);
  console.log(`    site:   ${s2.slice(0, 120)}`);
}
if (diffs.length) console.log(`\n  ${seen.size} distinct strings shown of ${new Set(diffs.map(d => d[1])).size}`);
