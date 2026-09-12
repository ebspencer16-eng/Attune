// Fails the build when a results page measures how far through you are.
//
// ── THE RULE ───────────────────────────────────────────────────────────────
// Ellie removed a progress bar from the app's Expectations detail pages, then
// found the same bar still on the website and asked for it there too. The
// reason is the same in both places and worth keeping: the count beside the
// heading already says where you are, and a bar measuring how far through a
// set of conversations you have read turns reading your own results into a
// task with a completion percentage.
//
// Results are something to sit with. Exercises have progress, because an
// exercise genuinely is a thing you finish.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// No element inside a results renderer gets its width from a position in the
// section list. That is what a progress bar is, mechanically: a width computed
// from "which one of these am I on".
//
// It does not forbid a width from a score. Every bar on every results page is
// one of those, and they are the product.

import { readFileSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;
const problems = [];

/** Names that mean "which page of the set am I on". */
const POSITION = /(catIdx|sectionIndex|pageIndex|stepIndex|position\.index|idx)\s*\+\s*1/;

const FILES = [
  'src/App.jsx',
  'attune-app/src/components/results.tsx',
];

for (const rel of FILES) {
  const text = readFileSync(ROOT + rel, 'utf8');
  text.split('\n').forEach((line, i) => {
    if (!/width:/.test(line)) return;
    if (!POSITION.test(line)) return;
    // A width computed from a position in the set.
    problems.push(
      `${rel}:${i + 1} sets a width from a position in the section list.\n`
      + `      ${line.trim().slice(0, 90)}\n`
      + '      That is a progress bar. Reading your results is not a task.');
  });
}

if (problems.length) {
  console.error('[check-no-progress-bars] a results page measures how far through you are:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`[check-no-progress-bars] ${FILES.length} results renderers; no width comes from a page position.`);
