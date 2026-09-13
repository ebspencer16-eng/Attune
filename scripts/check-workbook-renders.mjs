#!/usr/bin/env node
/**
 * The workbook renderer runs, for a couple of two types and for a couple of one.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * scripts/build_workbook.py produces both variants without throwing, and each
 * comes out a plausible size.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * Mine, today. Writing the same-type moment blocks for XX, YY and ZZ, I
 * rewrote the line that calls the same-type page builder and dropped three of
 * its arguments. The cross-type workbook went on rendering, so every check
 * that touches the workbook stayed green, and the same-type one raised
 * TypeError: missing 3 required positional arguments.
 *
 * That is the whole failure in one line: a couple whose partners share a type
 * could not have a workbook made, and nothing said so, because the only tool
 * that runs this file is `npm run check:docs`, which is not part of the build
 * and which was already reporting eight failures nobody was reading.
 *
 * ── WHY IT IS CHEAP ───────────────────────────────────────────────────────
 * The whole render takes about fifty milliseconds and writes to .doc-out, so
 * there is no reason for it to sit outside the build.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the words are right, which is Ellie's, and whether the PDF service
 * renders the HTML, which needs WORKBOOK_SERVICE_URL and a network.
 */

import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;

let out;
try {
  out = execFileSync('python3', [`${ROOT}scripts/build_workbook.py`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (e) {
  console.error('[check-workbook-renders] the workbook renderer threw:\n');
  console.error(String(e.stderr || e.message).split('\n').slice(-12).join('\n'));
  process.exit(1);
}

const written = [...out.matchAll(/Wrote (\S+) \(([\d,]+) chars\)/g)]
  .map((m) => ({ path: m[1], chars: Number(m[2].replace(/,/g, '')) }));

const problems = [];
if (written.length < 2) {
  problems.push(`it wrote ${written.length} file(s). Both variants have to render: one couple of two types, one of one.`);
}
for (const w of written) {
  if (w.chars < 200000) problems.push(`${w.path} came out at ${w.chars} characters, which is too short to be a whole workbook.`);
  try { statSync(w.path); } catch { problems.push(`${w.path} was reported written and is not there.`); }
}
const sameType = written.find((w) => /same_type/.test(w.path));
if (!sameType) problems.push('the same-type workbook was not written. That is the variant that broke, and the one the cross-type render cannot cover for.');

if (problems.length) {
  console.error('[check-workbook-renders] the workbook did not come out right:\n');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}

console.log(`[check-workbook-renders] both workbook variants render: ${written.map((w) => w.chars.toLocaleString() + ' chars').join(' and ')}.`);
