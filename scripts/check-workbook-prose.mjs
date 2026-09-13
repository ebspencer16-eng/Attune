// Fails the build when the two workbook generators stop agreeing.
//
// ── WHY THERE ARE TWO ──────────────────────────────────────────────────────
// api/generate-workbook.js builds the .docx, from api/_workbook-content.js.
// That is what the app and the website hand over.
//
// scripts/build_workbook.py builds the PDF. Dockerfile.workbook puts it in a
// container with scripts/service.mjs, and api/store-workbook-pdf.js posts to
// that service at WORKBOOK_SERVICE_URL.
//
// So the same words exist twice, which is the failure this repo keeps having:
// one rule in two places with nothing checking that they agree.
//
// ── HOW THIS WAS FOUND ─────────────────────────────────────────────────────
// By nearly deleting the Python's prose. A scan reported that 141 of its 197
// prose strings appear nowhere in api/, src/, the app or public/, and that was
// written up as "appears nowhere in the product". The scan did not include the
// Python's own output, and the Python is a product surface. Ellie read that
// report and said to remove them, which would have gutted the PDF workbook.
//
// The check exists so the two copies cannot drift, and the header of the
// Python says which one to edit: the JS.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// Every expectations-domain string in build_workbook.py EXP_DOMAINS appears
// verbatim in api/_workbook-content.js. That is the block both files carry,
// and it is the block PHASE_5b_HANDOFF.md used to call canonical in the wrong
// one of the two.
//
// ── WHAT IT DOES NOT COVER ─────────────────────────────────────────────────
// The rest of the Python's prose, which has no counterpart in the JS: the
// moments pages, the dimension content, the situation prompts. Those are the
// PDF's alone. Whether they should also be in the .docx is a product question
// and is written up in TASKS.md, not enforced here.

import { readFileSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;
const py = readFileSync(`${ROOT}scripts/build_workbook.py`, 'utf8');
const js = readFileSync(`${ROOT}api/_workbook-content.js`, 'utf8');

const at = py.indexOf('EXP_DOMAINS = [');
if (at < 0) {
  console.error('[check-workbook-prose] EXP_DOMAINS is not in scripts/build_workbook.py.');
  console.error('  Refusing to pass: the block this compares has moved or gone.');
  process.exit(1);
}
let depth = 0;
let end = py.length;
for (let i = py.indexOf('[', at); i < py.length; i++) {
  if (py[i] === '[') depth++;
  else if (py[i] === ']' && --depth === 0) { end = i + 1; break; }
}
const block = py.slice(at, end);

const FIELDS = /'(compatibleText|discussText|differentText|thisWeek)':\s*"([^"]+)"/g;
const strings = [...block.matchAll(FIELDS)].map((m) => ({ field: m[1], text: m[2] }));

if (strings.length < 20) {
  console.error(`[check-workbook-prose] only found ${strings.length} strings in EXP_DOMAINS;`);
  console.error('  the shape they are written in has changed. Refusing to pass.');
  process.exit(1);
}

const missing = strings.filter((s) => !js.includes(s.text));
if (missing.length) {
  console.error('[check-workbook-prose] the two workbook generators disagree:');
  for (const m of missing.slice(0, 6)) {
    console.error(`  [${m.field}] in build_workbook.py and not in api/_workbook-content.js:`);
    console.error(`      ${m.text.slice(0, 110)}`);
  }
  if (missing.length > 6) console.error(`  ...and ${missing.length - 6} more.`);
  console.error('');
  console.error('  The .docx and the PDF would say different things to the same couple.');
  console.error('  The JS is the one to edit; change the Python to match it.');
  process.exit(1);
}

console.log(
  `[check-workbook-prose] ${strings.length} expectations strings, identical in the .docx builder `
  + 'and the PDF builder.');
