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
import * as TRACK from '../api/_lib/track-marks.js';

const ROOT = new URL('..', import.meta.url).pathname;
const src = readFileSync(`${ROOT}attune-app/src/components/results.tsx`, 'utf8');
const problems = [];

/**
 * Two ways a pair of marks reaches a track, and both have to offset.
 *
 * <Marker> is one mark and takes its own dy. <Slider> draws the pair itself
 * and works the offset out inside. Counting only Markers made this gate
 * fragile in a way that showed: moving the intimacy rows onto the shared
 * SliderRow dropped the Marker count from six to two and the gate reported
 * that as a failure, when what had actually happened is that four pairs moved
 * to a component that offsets them.
 *
 * So: every Marker still has to carry a dy, Slider still has to compute one,
 * and the floor counts both kinds of site together.
 */
const markers = [...src.matchAll(/<Marker\b[\s\S]{0,260}?\/>/g)].map((m) => m[0]);
const sliders = [...src.matchAll(/<Slider(?:Row)?\b/g)].map((m) => m[0]);
if (markers.length + sliders.length < 6) {
  problems.push(`found ${markers.length} Marker and ${sliders.length} Slider sites; there were 6 pairs when this was written.`);
}

// Slider draws its own pair, so the rule has to be inside it.
const slider = src.slice(src.indexOf('function Slider('), src.indexOf('function Dot('));
if (!/CLOSE_PCT/.test(slider) || !/STAGGER/.test(slider)) {
  problems.push('Slider does not use the shared closeness rule, so its two marks can print on top of each other.');
}
markers.forEach((m) => {
  if (!/\bdy=/.test(m)) {
    const line = src.slice(0, src.indexOf(m)).split('\n').length;
    problems.push(`attune-app/src/components/results.tsx:${line} draws a mark with no dy, so it can be hidden under the other one.`);
  }
});

/**
 * The rule itself, taken out of the app rather than written again here.
 *
 * This gate used to carry its own copy of markerNudge, which is the failure it
 * exists to catch, one level up: the app's rule changed from five points to
 * the shared seven and from a hair's width to the shared threshold, and the
 * copy here went on passing against numbers nothing used any more.
 *
 * The function is small and has no dependencies beyond two constants, so it is
 * lifted out by name, stripped of its types and run.
 */
const nudge = (() => {
  const m = src.match(/function markerNudge\(a: number, b: number\): \[number, number\] \{([\s\S]*?)\n\}/);
  if (!m) {
    console.error('[check-overlapping-marks] markerNudge is not in results.tsx under that name.');
    process.exit(1);
  }
  const constants = ['CLOSE_PCT', 'STAGGER'].map((name) => {
    const c = src.match(new RegExp(`^const ${name} = (-?[0-9.]+);`, 'm'));
    if (!c) {
      console.error(`[check-overlapping-marks] the app does not declare ${name}, which markerNudge reads.`);
      process.exit(1);
    }
    return `const ${name} = ${c[1]};`;
  }).join('\n');
  // eslint-disable-next-line no-new-func
  return new Function(`${constants}\nreturn (a, b) => {${m[1]}\n};`)();
})();
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
  /**
   * Ellie: "I want the placement dots, if grouped, to be evenly vertically
   * distributed with the bar in the middle." So the two steps have to be equal
   * and opposite. One of them being zero, or both going the same way, puts the
   * pair off the line it is measured against.
   */
  if (split && x + y !== 0) {
    problems.push(`${name}: the marks step ${x} and ${y}, which is not even about the bar.`);
  }
}

// And the step is the shared one, not this file's own.
const [stepA] = nudge(40, 40);
if (Math.abs(stepA) !== TRACK.STAGGER) {
  problems.push(`a stepped mark moves ${Math.abs(stepA)} points and api/_lib/track-marks.js says ${TRACK.STAGGER}.`);
}

if (problems.length) {
  console.error('[check-overlapping-marks] one person can be hidden under the other:\n');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}

console.log(`[check-overlapping-marks] ${markers.length} marks and ${sliders.length} sliders, every one offset when a pair shares a point.`);
