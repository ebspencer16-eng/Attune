// Fails the build when a results category has no colour and a surface paints
// with it anyway.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// Ellie: "Life and values is the only tile in 'conversations to have' that has
// a colored left border of the tile."
//
// The website writes borderLeft: `4px solid ${fc.color}`. Five of the six
// expectations categories had no colour, so five tiles rendered
// `4px solid undefined`, which a browser drops silently. One bordered tile and
// five plain ones, and nothing said the field was required.
//
// It is the failure mode a template literal makes easy: a missing value does
// not throw, it produces a string that is almost right.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// Every expectations category carries a colour that is a hex value, and the
// payload passes it through so the app can draw the same tile.

import { readFileSync } from 'fs';
import { EXPECTATIONS_CATEGORIES } from '../api/_questions.js';

const ROOT = new URL('..', import.meta.url).pathname;
const problems = [];

if (EXPECTATIONS_CATEGORIES.length < 6) {
  console.error('[check-category-colors] fewer than six categories; refusing to pass.');
  process.exit(1);
}

for (const cat of EXPECTATIONS_CATEGORIES) {
  if (!/^#[0-9A-Fa-f]{6}$/.test(cat.color || '')) {
    problems.push(
      `the "${cat.label}" category has no colour, so the website paints its tile\n`
      + '      with `4px solid undefined` and the browser drops the border.');
  }
}

// The colour has to reach the app, or the two surfaces disagree.
const payload = readFileSync(ROOT + 'api/_lib/expectations.js', 'utf8');
if (!/color:\s*cat\.color/.test(payload)) {
  problems.push('the expectations payload does not carry the category colour, so the app cannot draw it.');
}
const app = readFileSync(ROOT + 'attune-app/src/components/results.tsx', 'utf8');
if (!/color=\{cat\.color/.test(app)) {
  problems.push('the app ignores the category colour and paints every tile the same.');
}

/**
 * ── AND THE WEBSITE'S SIDEBAR ─────────────────────────────────────────────
 * "Both surfaces draw it" was two-thirds true: the tiles drew it on each
 * surface and the website's results sidebar painted all six rows one green, so
 * the one list where the six sit side by side was the one place Household and
 * Financial looked like the same thing.
 *
 * Found by sweeping every colour across the two surfaces rather than by this
 * gate, which is the argument for checking a promise everywhere it is made and
 * not only where it was first broken.
 */
const web = readFileSync(ROOT + 'src/App.jsx', 'utf8');
const row = /FIXED_CATS\.map\(\(fc\) => \(\{ id: fc\.section[^}]*\}\)\)/.exec(web);
if (!row) {
  console.error('[check-category-colors] the website\'s sidebar no longer builds its category rows'
    + ' from FIXED_CATS.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}
if (!/color: fc\.color/.test(row[0])) {
  problems.push('the website\'s results sidebar paints its six category rows a colour of its own:'
    + `\n    ${row[0].slice(0, 110)}\n`
    + '  Each category has its own, which its page is tinted with. One colour for all six makes'
    + '\n  the sidebar the only place they do not look like six different things.');
}

if (problems.length) {
  console.error('[check-category-colors] a category tile has no colour to draw:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`[check-category-colors] all ${EXPECTATIONS_CATEGORIES.length} categories carry a colour,`
  + ' and both surfaces draw it: on the tiles, and in the website\'s sidebar.');
