#!/usr/bin/env node
/**
 * Every recommended Explore view names fields the catalogue really has.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie asked for a new set of presets (A173). A preset is three field keys
 * typed into public/admin.html, and applying one assigns them to the row,
 * column and measure selects. A select told to hold a value it has no option
 * for drops it silently and falls back to its first option, which is the same
 * failure as the seven slicers in A161: the button looks like it worked and
 * shows a different view. So a typo, or a field renamed in
 * api/admin-explore.js, would turn a preset into a wrong answer with no error.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * It builds the real catalogue through the real builder, the way
 * check-explore-groups-mapped does, lifts RECOMMENDED_PRESETS out of the page
 * and evaluates it, and fails on any row, column or measure key the catalogue
 * does not have, on an average whose measure is not a scale, and on a cell
 * mode the Cells control does not offer.
 */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import vm from 'node:vm';

const TMP = 'api/_tmp-explore-presets-check.js';
writeFileSync(TMP, readFileSync('api/admin-explore.js', 'utf8') + '\nexport { buildCatalog };\n');
let fields;
try {
  const mod = await import(new URL('file://' + process.cwd() + '/' + TMP).href);
  fields = mod.buildCatalog({});
} finally { unlinkSync(TMP); }

const fail = [];
if (!Array.isArray(fields) || fields.length < 100) fail.push(`the catalogue built ${fields && fields.length} fields; this gate has lost its subject`);
const byKey = new Map((fields || []).map((f) => [f.key, f]));

const html = readFileSync('public/admin.html', 'utf8');
const m = /const RECOMMENDED_PRESETS = (\[[\s\S]*?\n\s*\]);/.exec(html);
let presets = [];
if (!m) fail.push('RECOMMENDED_PRESETS is not in public/admin.html any more, so this gate has lost its subject');
else presets = vm.runInNewContext(m[1]);
if (m && presets.length < 6) fail.push(`only ${presets.length} recommended presets found`);

const cells = new Set([...(/<select id="xp-cell"[\s\S]*?<\/select>/.exec(html) || [''])[0].matchAll(/value="(\w+)"/g)].map((x) => x[1]));
for (const p of presets) {
  const c = p.config || {};
  for (const side of ['row', 'col', 'measure']) {
    if (c[side] && !byKey.has(c[side])) fail.push(`"${p.name}" asks for ${side} "${c[side]}", which the Explore catalogue does not have.`);
  }
  if (!c.row) fail.push(`"${p.name}" has no row.`);
  if (!cells.has(c.cell)) fail.push(`"${p.name}" asks for cells "${c.cell}", which the Cells control does not offer.`);
  if (c.cell === 'mean') {
    const f = byKey.get(c.measure);
    if (!f) fail.push(`"${p.name}" averages nothing.`);
    else if (f.kind !== 'scale') fail.push(`"${p.name}" averages "${c.measure}", which is not a scale.`);
  }
  if (!p.why || !p.group) fail.push(`"${p.name}" is missing its group or its reason.`);
}

if (fail.length) {
  console.error('check-explore-presets FAILED');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log(`[check-explore-presets] ${presets.length} recommended Explore views, each naming fields the real catalogue (${fields.length} fields) has and a cell mode the page offers.`);
