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
// 1. Every expectations-domain string in build_workbook.py EXP_DOMAINS appears
//    verbatim in api/_workbook-content.js. That is a block both files carry,
//    and it is the one PHASE_5b_HANDOFF.md used to call canonical in the wrong
//    one of the two.
// 2. scripts/workbook_prose.json is current with api/_workbook-prose.js. The
//    Python reads the JSON, because it cannot import JavaScript, and a stale
//    JSON means the PDF quietly prints last week's words.
// 3. The Python holds no prose of its own for those blocks: it reads them.
// 4. Neither builder prints a placeholder. The .docx printed seven of them,
//    twenty-five of which were the questions in the Conversation Library and
//    five of which were the whole body of every same-type moment card. One
//    reader in ten received a Working Knowledge section made entirely of notes
//    to ourselves.
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

// ── 2. The generated JSON is current ──────────────────────────────────────
{
  const generated = readFileSync(`${ROOT}scripts/workbook_prose.json`, 'utf8');
  const prose = await import('../api/_workbook-prose.js');
  const expected = JSON.stringify(
    Object.fromEntries(Object.keys(prose).sort().map((k) => [k, prose[k]])),
    null, 1,
  ) + '\n';
  if (generated !== expected) {
    console.error('[check-workbook-prose] scripts/workbook_prose.json has drifted from api/_workbook-prose.js.');
    console.error('  The PDF builder reads the JSON, so it is printing different words from the .docx.');
    console.error('  Run node scripts/build-workbook-prose.mjs.');
    process.exit(1);
  }
}

// ── 3. The Python reads, rather than holding its own ──────────────────────
{
  const blocks = ['DIM_CONTENT', 'MOMENTS_W', 'MOMENTS_X', 'MOMENTS_Y', 'MOMENTS_Z',
    'MOMENTS_SHARED_W', 'SITUATION_PROMPTS'];
  const wrong = blocks.filter((b) => !new RegExp(`^${b} = _PROSE\\['${b}'\\]$`, 'm').test(py));
  if (wrong.length) {
    console.error('[check-workbook-prose] the PDF builder holds its own copy of:', wrong.join(', '));
    console.error('  Both builders have to read api/_workbook-prose.js, or they drift the moment one is edited.');
    process.exit(1);
  }
}

// ── 3b. Every type has its own same-type block ────────────────────────────
//
// Only W had one. Both builders fell back to W's words for XX, YY and ZZ, so
// three couples in ten read advice written about somebody else and nothing
// said so. A missing block now fails rather than falling back quietly.
{
  const prose = await import('../api/_workbook-prose.js');
  const missing = ['W', 'X', 'Y', 'Z'].filter((t) => {
    const block = prose[`MOMENTS_SHARED_${t}`];
    if (!block) return true;
    const moments = Object.values(block);
    if (moments.length !== 6) return true;
    return !moments.every((m) => ['moment', 'happening', 'not', 'works', 'phrase']
      .every((f) => typeof m[f] === 'string' && m[f].trim().length > 20));
  });
  if (missing.length) {
    console.error(`[check-workbook-prose] no same-type block for: ${missing.join(', ')}.`);
    console.error('  Both builders would fall back to W, and those couples would read');
    console.error('  advice written about a different pairing.');
    process.exit(1);
  }
}

// ── 4. No placeholder reaches a customer ──────────────────────────────────
{
  const docx = readFileSync(`${ROOT}api/generate-workbook.js`, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|\s)\/\/[^\n]*/g, ' ');
  const left = [...docx.matchAll(/PH\(/g)].length;
  if (left) {
    console.error(`[check-workbook-prose] api/generate-workbook.js still prints ${left} placeholder${left === 1 ? '' : 's'}.`);
    console.error('  "[PLACEHOLDER: ...]" is a note to ourselves, and it was going out in the .docx.');
    process.exit(1);
  }
  const pdfLeft = [...py.matchAll(/PLACEHOLDER/g)].length;
  if (pdfLeft) {
    console.error(`[check-workbook-prose] scripts/build_workbook.py mentions PLACEHOLDER ${pdfLeft} times.`);
    process.exit(1);
  }
}

console.log(
  `[check-workbook-prose] ${strings.length} expectations strings, identical in the .docx builder `
  + `and the PDF builder; ${Object.keys(JSON.parse(readFileSync(`${ROOT}scripts/workbook_prose.json`, 'utf8'))).length} shared blocks, no placeholders in either.`);
