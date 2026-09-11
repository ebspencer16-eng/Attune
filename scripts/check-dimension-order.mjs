// Fails the build when the two products list the Communication dimensions in
// different orders.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// Ellie: "the dimensions on the comms results at a glance page are in the
// wrong order. Make them match the site. Again, shouldn't we have caught this
// easily?"
//
// Easily, no. Nothing could have caught it, and that is the interesting part.
//
// There are two orders in this product. DIM_KEYS in api/_type-engine.js is the
// scoring order. The three Communication domains put the same ten dimensions in
// a different sequence, and that is the one a reader sees: it is what makes the
// glance page agree with the three detail pages that follow it.
//
// The website used the domain order. It was a literal, written out twice, in
// src/App.jsx. The app could not read it, so the app used the order the
// dimensions arrived in, which is DIM_KEYS. `needs` and `bids` were swapped and
// `listening` sat four places away.
//
// So one order was a string in a file the app cannot see, and the other was an
// implicit consequence of an object's key order. Neither was a decision
// anything could compare. Ellie found it by reading two screens, which is what
// this file exists to stop being the process.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// That the order is derived rather than written, that the payload arrives in
// it, and that the set is complete: a dimension that is scored and absent from
// every domain would silently vanish from the page rather than appear in the
// wrong place, which is worse.

import { readFileSync } from 'fs';
import { DIMENSION_DISPLAY_ORDER, COMM_DOMAINS } from '../api/_lib/comm-domains.js';
import { DIM_KEYS } from '../api/_type-engine.js';

const ROOT = new URL('..', import.meta.url).pathname;
const problems = [];

// ── 1. Derived from the domains, not typed ─────────────────────────────────
const flat = COMM_DOMAINS.flatMap((d) => d.dims);
if (JSON.stringify(flat) !== JSON.stringify(DIMENSION_DISPLAY_ORDER)) {
  problems.push(
    'DIMENSION_DISPLAY_ORDER is not the domains flattened.\n'
    + `      domains: ${flat.join(', ')}\n`
    + `      order:   ${DIMENSION_DISPLAY_ORDER.join(', ')}\n`
    + '      If they differ, the glance page disagrees with the pages it leads into.');
}

// ── 2. Nothing scored goes missing ─────────────────────────────────────────
const scored = Object.keys(DIM_KEYS);
const missing = scored.filter((d) => !DIMENSION_DISPLAY_ORDER.includes(d));
if (missing.length) {
  problems.push(
    `${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} scored but in no domain.\n`
    + '      api/results.js appends anything unnamed rather than dropping it, so this is\n'
    + '      not fatal, but a dimension with no domain has no detail page either.');
}
const unknown = DIMENSION_DISPLAY_ORDER.filter((d) => !scored.includes(d));
if (unknown.length) {
  problems.push(`${unknown.join(', ')} appears in a domain but is not a scored dimension.`);
}

// ── 3. Neither surface writes its own order ────────────────────────────────
// The literal that caused this, in the shape it had: a list of quoted
// dimension names long enough to be the whole set.
const SURFACES = ['src/App.jsx', 'attune-app/src/components/results.tsx'];
for (const file of SURFACES) {
  const src = readFileSync(ROOT + file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
  for (const m of src.matchAll(/\[((?:\s*["'][a-z]+["']\s*,){5,}\s*["'][a-z]+["']\s*)\]/g)) {
    const names = [...m[1].matchAll(/["']([a-z]+)["']/g)].map((x) => x[1]);
    const overlap = names.filter((n) => scored.includes(n));
    if (overlap.length < 5) continue;
    problems.push(
      `${file} writes out its own dimension order:\n`
      + `      ${names.join(', ')}\n`
      + '      It must read DIMENSION_DISPLAY_ORDER, or the app, which cannot import\n'
      + '      from this file, will use a different one and nothing will notice.');
  }
}

// ── 4. The payload arrives in it ───────────────────────────────────────────
const results = readFileSync(ROOT + 'api/results.js', 'utf8');
if (!/const dimensions = displayOrder\.map/.test(results)) {
  problems.push(
    'api/results.js no longer builds `dimensions` in display order. The app draws\n'
    + '      them in the order they arrive, so this is the only thing putting them in\n'
    + '      the same sequence as the website.');
}

// ── 5. And name them the same ──────────────────────────────────────────────
// There are two DIM_META objects: api/_workbook-content.js, which is the copy
// the results payload sends and therefore the one the app reads, and one in
// src/App.jsx carrying this surface's own tints and pole words.
//
// Only the labels overlap, and only the labels are read aloud. A rename that
// lands on one is a dimension called two different things on two products,
// which is what would have happened when Ellie shortened "Giving and Receiving
// Feedback" to "Feedback" because it wrapped.
const site = readFileSync(ROOT + 'src/App.jsx', 'utf8');
if (!/DIM_META\[_k\]\.label = _shared\.label/.test(site)) {
  problems.push(
    'src/App.jsx no longer takes its dimension labels from the shared DIM_META.\n'
    + '      It keeps its own copy for tints and pole words, which is fine, but the\n'
    + '      name has to come from the object the payload sends or the two products\n'
    + '      will call a dimension different things.');
}

// ── 6. And the longest one still fits its column ───────────────────────────
// The app's glance page gives each dimension one line in a fixed-width column,
// so ten rows are the same height. A name longer than that column truncates
// rather than wraps, which keeps the layout and loses the end of a word.
//
// That is the wrong trade to leave silent. A rename is a copy decision and
// nobody making one should have to know a pixel budget exists; this tells them.
//
// The estimate is deliberately crude: at 11pt a character in this font averages
// a little over half the point size. It is a smoke alarm, not a text measurer.
const glance = readFileSync(ROOT + 'attune-app/src/components/results.tsx', 'utf8');
const widthM = glance.match(/const GLANCE_LABEL_W = (\d+);/);
if (!widthM) {
  problems.push("the app's glance label column has no GLANCE_LABEL_W to check against.");
} else {
  const width = Number(widthM[1]);
  const { DIM_META } = await import('../api/_workbook-content.js');
  for (const [key, meta] of Object.entries(DIM_META)) {
    const estimate = Math.ceil((meta.label || '').length * 11 * 0.54);
    if (estimate <= width) continue;
    problems.push(
      `"${meta.label}" (${key}) needs about ${estimate}pt and the glance column is ${width}pt.\n`
      + '      It will truncate on the app. Either shorten the name or widen\n'
      + '      GLANCE_LABEL_W, which takes the difference out of the bar.');
  }
}

if (problems.length) {
  console.error('[check-dimension-order] the two products would list dimensions differently:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(
  `[check-dimension-order] ${DIMENSION_DISPLAY_ORDER.length} dimensions, one order, `
  + 'derived from the domains and sent in it; labels come from one object.');
