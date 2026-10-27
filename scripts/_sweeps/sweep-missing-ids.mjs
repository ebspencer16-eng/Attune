/**
 * Every id the admin's code reaches for, against every id that exists.
 *
 * ── WHY THIS SHAPE ────────────────────────────────────────────────────────
 * Twice in one day: Type Analytics read three filter dropdowns, tf-pronouns,
 * tf-rellen and tf-relstat, that were in no markup, so every figure on that
 * page had always been the whole population while the page said it had a
 * filter bar. And the whole Fulfilment cluster wrote to a tbody and three
 * dashboard ids that went with the page in 92b3e2fb.
 *
 * Neither failed. `document.getElementById` answers null, the code guards on
 * it or quietly does nothing, and from outside the feature looks like a
 * feature. It is the admin's most common way of being wrong.
 *
 * ── WHAT IT CANNOT SEE, AND SAYS SO ───────────────────────────────────────
 * Ids built by concatenation, `containerId + '-distn'`, cannot be resolved
 * from the source. They are counted and reported as unresolved rather than
 * skipped, because a silent skip is how a sweep becomes evidence for something
 * it never looked at.
 *
 * Ids created at run time by the same file, `'<canvas id="' + x + '">'`, are
 * collected too, or every chart canvas would be a false positive.
 */
import { readFileSync } from 'node:fs';

const FILE = process.argv[2] || 'public/admin.html';
const src = readFileSync(FILE, 'utf8');

/* ── IDS THAT EXIST ────────────────────────────────────────────────────── */
const exists = new Set();
for (const m of src.matchAll(/\sid=["']([A-Za-z][\w-]*)["']/g)) exists.add(m[1]);
/* Built in JS: id="x" inside a string, id=\"x\", and `id="${...}"` skipped. */
for (const m of src.matchAll(/id=\\?["']([A-Za-z][\w-]*)\\?["']/g)) exists.add(m[1]);
for (const m of src.matchAll(/\.id\s*=\s*["']([A-Za-z][\w-]*)["']/g)) exists.add(m[1]);
for (const m of src.matchAll(/setAttribute\(\s*["']id["']\s*,\s*["']([A-Za-z][\w-]*)["']\s*\)/g)) exists.add(m[1]);

/* ── IDS THE CODE REACHES FOR ──────────────────────────────────────────── */
const wanted = new Map();          // id -> [line numbers]
const unresolved = [];
const lineOf = (i) => src.slice(0, i).split('\n').length;

const LITERAL = [
  /getElementById\(\s*["']([^"']+)["']\s*\)/g,
  /\$\(\s*["']([^"'#.][^"']*)["']\s*\)/g,            // the page's own $(id) helper
  /querySelector(?:All)?\(\s*["']#([\w-]+)["']\s*\)/g,
];
for (const re of LITERAL) {
  for (const m of src.matchAll(re)) {
    const id = m[1];
    if (!/^[A-Za-z][\w-]*$/.test(id)) continue;
    if (!wanted.has(id)) wanted.set(id, []);
    wanted.get(id).push(lineOf(m.index));
  }
}
/* The ones this cannot answer, counted rather than ignored. */
for (const m of src.matchAll(/getElementById\(\s*([^"')][^)]*)\)/g)) unresolved.push(lineOf(m.index));

const missing = [...wanted.entries()].filter(([id]) => !exists.has(id));

console.log(`[sweep-missing-ids] ${FILE}`);
console.log(`  ${exists.size} ids exist, ${wanted.size} distinct ids are looked up by a literal, `
  + `${unresolved.length} lookups are built by concatenation and cannot be resolved here.`);
if (!missing.length) { console.log('  Every literal lookup resolves.'); process.exit(0); }
console.log(`  ${missing.length} looked up and never created:`);
for (const [id, lines] of missing.sort((a, b) => b[1].length - a[1].length)) {
  console.log(`    ${id.padEnd(28)} ${lines.length} lookup(s), first at line ${lines[0]}`);
}
