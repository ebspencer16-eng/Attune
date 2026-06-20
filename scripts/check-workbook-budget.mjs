// Build-time guard: workbook dimension pages must never spill to a second page.
//
// Each dimension page renders its longest gap blurb (1 of 3 gap states) stacked
// above its longest couple-type blurb (1 of 10 types) in the hero's right
// column. That stacked text is the only variable-height content on the page.
// If it grows too long, the page overflows and a blank verso appears.
//
// Budgets below were validated by rendering: with every dimension's blurbs
// padded to 560 combined characters (long partner names, max score gaps), all
// ten pages still fit one page. We set the ceiling at 540 to keep a margin.
// Current worst combined is ~471 (needs), so there is room for edits.
//
// Run automatically before `vite build` (see package.json "build").

import { GAP_BLURBS, WHEN_THIS_SHOWS_UP } from '../api/_workbook-content.js';

// Worst-case name length. Blurbs use {U}/{P} and [W partner name] placeholders
// that expand to real names at render time. Normalise to a long-ish first name
// so the measured length reflects the rendered length, not the raw template.
const NAME = 'X'.repeat(14);
const norm = (s) => String(s)
  .replace(/\{U\}|\{P\}/g, NAME)
  .replace(/\[[WXYZ] partner name\]/g, NAME);

const MAX_GAP      = 260;  // a single gap blurb (current max ~218)
const MAX_TYPE     = 320;  // a single couple-type blurb (current max ~277)
const MAX_COMBINED = 540;  // longest gap + longest type, per dimension (validated to 560)

const maxEntry = (obj) => Object.entries(obj)
  .reduce((best, [k, v]) => (norm(v).length > best.len ? { key: k, len: norm(v).length } : best),
          { key: null, len: 0 });

const errors = [];
for (const dim of Object.keys(GAP_BLURBS)) {
  const g = maxEntry(GAP_BLURBS[dim] || {});
  const t = maxEntry(WHEN_THIS_SHOWS_UP[dim] || {});

  if (g.len > MAX_GAP)
    errors.push(`${dim}: gap blurb "${g.key}" is ${g.len} chars (max ${MAX_GAP}).`);
  if (t.len > MAX_TYPE)
    errors.push(`${dim}: couple-type blurb "${t.key}" is ${t.len} chars (max ${MAX_TYPE}).`);
  if (g.len + t.len > MAX_COMBINED)
    errors.push(`${dim}: longest gap (${g.len}) + longest type (${t.len}) = ${g.len + t.len} chars (max ${MAX_COMBINED}). This combination can push the page to a second sheet.`);
}

if (errors.length) {
  console.error('\n✗ Workbook page-budget check FAILED:\n');
  errors.forEach((e) => console.error('  - ' + e));
  console.error(`\nShorten the blurb(s) in api/_workbook-content.js, or re-validate the\nbudget by rendering the worst case before raising the limit.\n`);
  process.exit(1);
}

console.log('✓ Workbook page-budget check passed (all dimension pages fit one page).');
