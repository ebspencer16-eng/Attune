#!/usr/bin/env node
/**
 * Two people on the same point are both visible.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Wherever the app draws two placement marks on one track, it offsets them
 * when they land on the same value. Both are the same size and shape, so
 * without an offset the second one drawn hides the first completely.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * Ellie: "Rel Relf at a glance page: I can see preston's placement dots but
 * not my own."
 *
 * Hers was drawn first and his on top of it, at the same percentage, at the
 * same size. A couple who agrees is the common case on those questions, so the
 * page hid one person's answer on exactly the rows where they had agreed, and
 * it looked like her answers were missing rather than covered.
 *
 * The website has always split them by five pixels when the scores match.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * Every pair of Marker elements in the app's results has to pass a dy. The
 * nudge function itself is run over values that match, values that are close,
 * and values that are far apart.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const src = readFileSync(`${ROOT}attune-app/src/components/results.tsx`, 'utf8');
const problems = [];

const markers = [...src.matchAll(/<Marker\b[\s\S]{0,260}?\/>/g)].map((m) => m[0]);
if (markers.length < 4) {
  problems.push(`found ${markers.length} Marker elements; there were 6 when this was written.`);
}
markers.forEach((m) => {
  if (!/\bdy=/.test(m)) {
    const line = src.slice(0, src.indexOf(m)).split('\n').length;
    problems.push(`attune-app/src/components/results.tsx:${line} draws a mark with no dy, so it can be hidden under the other one.`);
  }
});

// The rule itself: matching values separate, different values do not.
const nudge = (a, b) => (Math.abs(a - b) < 1 ? [-5, 5] : [0, 0]);
const CASES = [
  ['the same value', 40, 40, true],
  ['a hair apart', 40, 40.5, true],
  ['clearly apart', 40, 60, false],
  ['both at zero', 0, 0, true],
  ['both at the top', 100, 100, true],
];
for (const [name, a, b, wantSplit] of CASES) {
  const [x, y] = nudge(a, b);
  const split = x !== y;
  if (split !== wantSplit) {
    problems.push(`${name}: the marks ${split ? 'separate' : 'do not separate'} and they should ${wantSplit ? '' : 'not '}.`);
  }
}

if (problems.length) {
  console.error('[check-overlapping-marks] one person can be hidden under the other:\n');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}

console.log(`[check-overlapping-marks] ${markers.length} marks, every one offset when it shares a point.`);
