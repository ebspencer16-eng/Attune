/**
 * The ten dimensions are named in one place.
 *
 * ── THE BUG THIS ENCODES ──────────────────────────────────────────────────
 * Ellie: "Reassurance is the only dimension not capitalized, fix that."
 *
 * There were four maps of these names and they disagreed about the words AND
 * the set. api/admin-explore.js had DIM_LABELS with a `stress` entry, which
 * has not been a dimension for a long time, and no `reassurance`, which is
 * one. public/admin.html had a seed array with exactly the same two faults,
 * made independently; a PRETTY map; and an LBL map with its own wording
 * ("Energy & recharge" against the product's "Energy & Recharge", "Conflict"
 * against "Conflict Style"). The pole phrases were a fifth map with the same
 * two faults again, so the Reassurance slider read "1 · low" and "5 · high"
 * while the other nine named their ends.
 *
 * Every caller reads `MAP[dim] || dim`. A fallback that fires for one of ten
 * is the hardest kind to see, because nine rows prove the mechanism works.
 *
 * It is api/_lib/dimensions.js now, which has no imports so the admin can read
 * it without dragging the workbook prose in behind it, and the labels reach
 * public/admin.html in the payload because a static page cannot import from
 * api/ and a list it cannot see is a list it will get wrong.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * No file outside the owner may hold an object or array that names several
 * dimensions and gives them display text. The two maps in the owner are held
 * to the same ten keys at load time, and importing it here is what runs that.
 *
 * ── WHAT IT DELIBERATELY ALLOWS ───────────────────────────────────────────
 * Maps keyed by dimension whose values are not display text: DIM_KEYS,
 * QUESTION_WEIGHTS and AXIS_CONFIG in the engine are the dimensions' actual
 * definition and are none of this gate's business. Only strings count.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const OWNER = 'api/_lib/dimensions.js';
/* Importing it runs its own load-time guard, which is the half of this rule
   that cannot be checked by reading: that the labels and the poles cover the
   same ten dimensions. If that throws, this gate fails with its message. */
const { DIM_META, DIM_SCALE_POLES } = await import('../api/_lib/dimensions.js');
const { DIM_KEYS } = await import('../api/_type-engine.js');

const fail = [];
const dims = Object.keys(DIM_META);

/* The owner has to describe the dimensions the engine actually scores, or the
   admin is naming a different ten from the one the product computes. */
const engine = Object.keys(DIM_KEYS).sort().join(',');
if (dims.slice().sort().join(',') !== engine) {
  fail.push(`${OWNER} names [${dims.sort().join(', ')}] but api/_type-engine.js scores [${engine.split(',').join(', ')}]`);
}
if (Object.keys(DIM_SCALE_POLES).length !== dims.length) {
  fail.push(`${OWNER} has ${dims.length} labels and ${Object.keys(DIM_SCALE_POLES).length} pole pairs`);
}

/* ── ANYWHERE ELSE THAT NAMES THEM ─────────────────────────────────────── */
const files = [];
const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) {
  if (e.name === 'node_modules' || e.name === 'dist') continue;
  if (e.isDirectory()) walk(join(d, e.name));
  else if (/\.(js|jsx|mjs|html)$/.test(e.name)) files.push(join(d, e.name)); } };
walk('api'); walk('public'); walk('src');

/* ── WHAT COUNTS AS A LABEL, AND WHAT DOES NOT ─────────────────────────────
   The first version flagged any file giving three dimensions a string, and
   reported four. None was a label map: api/_content/v1.js keys an insight
   SENTENCE by dimension, api/_lib/highlight-cards.js keyed a conversation
   question, src/App.jsx keyed the same question, and api/_lib/tags.js keys a
   grouping word, 'inner', which three dimensions share. A gate that matches
   too much is not the safe direction: it gets loosened until it matches
   nothing, or it manufactures the evidence it was meant to look for.

   A label is short, carries no sentence punctuation, and is DIFFERENT for
   every dimension. The third test is what separates a name from a grouping:
   tags.js gives three dimensions the same word, and a map of names cannot.

   (The question map turned out to be a real duplicate, typed out in both
   api/_lib/highlight-cards.js and src/App.jsx under a comment claiming they
   matched. It is api/_lib/convo-prompts.js now. It was never this gate's
   subject, though, and widening this one to cover it would have made it a
   gate about two unrelated rules.) */
const isLabelish = (v) => v.length <= 30 && !/[.?!]/.test(v);
let scanned = 0;
for (const file of files) {
  if (file === OWNER) continue;
  if (file.startsWith('scripts/')) continue;
  const src = readFileSync(file, 'utf8');
  const named = new Map();
  for (const d of dims) {
    const re = new RegExp("\\b" + d + "\\s*:\\s*['\"]([^'\"]+)['\"]", 'g');
    const hit = re.exec(src);
    if (hit && isLabelish(hit[1])) named.set(d, hit[1]);
  }
  if (named.size) scanned++;
  const distinct = new Set(named.values()).size;
  if (named.size >= 3 && distinct === named.size) {
    fail.push(`${file} gives a distinct short label to ${named.size} dimensions (${[...named.keys()].slice(0, 4).join(', ')}...).`
      + ` The names live in ${OWNER}; import them, or have the server send them if the file cannot import from api/.`);
  }
}

if (!dims.length) fail.push(`${OWNER} describes no dimensions, so this gate proved nothing`);

if (fail.length) {
  console.error('check-one-dimension-map FAILED');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log(`[check-one-dimension-map] ${dims.length} dimensions, named and poled only in ${OWNER}, `
  + `matching the ${Object.keys(DIM_KEYS).length} the engine scores; ${scanned} other file(s) mention one or two and none holds a map.`);
