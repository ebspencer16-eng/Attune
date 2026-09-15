#!/usr/bin/env node
/**
 * A results page is the same colour on both surfaces.
 *
 * ── THE BUG THIS COMES FROM ───────────────────────────────────────────────
 * Six pages carry a fixed gradient. It was typed twice for each: a CSS string
 * in src/App.jsx and an array of hex stops in the app. Five pairs agreed. The
 * sixth did not, and had not since the app got a Communication page: the
 * website paints it #3B2A6B into #6C4BB0 into #C8522E, purple into the brand
 * orange, and the app painted it in Conflict's two-stop blue. The section
 * Ellie has spent the most time on was the one wearing another section's
 * colour, and nothing anywhere would have said so.
 *
 * api/_lib/section-grounds.js is the one copy now. The website builds its CSS
 * from it; the app receives the stops on the results nav, beside the accent it
 * already takes from there.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 *   1. Every at-a-glance page in the nav carries the module's stops, and the
 *      positions that go with them. A hand-typed ground in results-sections.js
 *      would pass every other gate here.
 *   2. src/App.jsx paints no gradient whose stops are one of these. That is
 *      the shape the bug took: a literal, correct on the day it was written.
 *   3. The app passes no literal array to GlanceTile. Same shape, other side.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Grounds that are derived rather than fixed: a Communication detail page is
 * tinted from its domain's colour and an intimacy dimension page from its own,
 * and each already has one function behind it. Nor does it say a page should
 * have a ground at all: most detail pages are cream on both surfaces, and
 * Physical Intimacy's Conversations page is cream on the website and dark in
 * the app, which is a real difference, and a question for Ellie rather than
 * something to settle in a build gate.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(`${ROOT}${p}`, 'utf8');

const { SECTION_GROUNDS, gradientCss } = await import(`${ROOT}api/_lib/section-grounds.js`);
const { resultsNav } = await import(`${ROOT}api/_lib/results-sections.js`);

const fails = [];

// ── 1. the nav carries the module's colours ────────────────────────────────
const nav = resultsNav({ hasReflection: true, intimacyReady: true, conflictListed: true });
const entries = nav.flatMap((g) => [g, ...(g.children || [])]);
const glance = entries.filter((e) => e.glance);

if (!glance.length) fails.push('no at-a-glance page is marked in the nav, so the app cannot tell which pages are tiles');

for (const e of glance) {
  const want = SECTION_GROUNDS[e.id];
  if (!want) { fails.push(`${e.id} is marked at-a-glance and has no ground in section-grounds.js`); continue; }
  const got = (e.ground || []).join(',');
  if (got !== want.stops.join(',')) {
    fails.push(`${e.id} is sent as ${got || '(nothing)'} and the module says ${want.stops.join(',')}`);
  }
  const stops = (e.groundStops || []).join(',');
  if (stops !== [0, want.mid / 100, 1].join(',')) {
    fails.push(`${e.id} sends stop positions ${stops || '(nothing)'} and the module puts the middle one at ${want.mid}%`);
  }
}

// ── 2. the website builds its gradients rather than typing them ────────────
const app = read('src/App.jsx');
for (const [id, g] of Object.entries(SECTION_GROUNDS)) {
  // Both the exact string and the stops in order, so reformatting does not
  // slip a copy past this.
  if (app.includes(gradientCss(id))) {
    fails.push(`src/App.jsx types the ${id} gradient out; it should be gradientCss('${id}')`);
    continue;
  }
  const loose = new RegExp(`linear-gradient\\([^)]*${g.stops[0]}[^)]*${g.stops[1]}[^)]*${g.stops[2]}`, 'i');
  if (loose.test(app)) {
    fails.push(`src/App.jsx has a gradient with the ${id} stops written into it`);
  }
}

// ── 3. the app passes no literal to the tile ───────────────────────────────
for (const f of ['attune-app/src/components/results.tsx', 'attune-app/src/components/conflict-results.tsx']) {
  const src = read(f);
  for (const m of src.matchAll(/<GlanceTile[^>]*ground=\{\[/g)) {
    const line = src.slice(0, m.index).split('\n').length;
    fails.push(`${f}:${line} passes a literal ground to GlanceTile; it comes from the nav`);
  }
  // The same colours, reached any other way inside a results component.
  for (const [id, g] of Object.entries(SECTION_GROUNDS)) {
    if (src.includes(`'${g.stops[0]}'`) && src.includes(`'${g.stops[1]}'`)) {
      fails.push(`${f} writes the ${id} stops out; they come from the nav`);
    }
  }
}

if (fails.length) {
  console.error('[check-section-grounds] a results page is not the same colour on both surfaces:');
  for (const f of fails) console.error(`  ${f}`);
  console.error('');
  console.error('The stops live in api/_lib/section-grounds.js. The website paints');
  console.error("gradientCss(id); the app reads ground and groundStops off the results nav.");
  process.exit(1);
}

console.log(`[check-section-grounds] ${Object.keys(SECTION_GROUNDS).length} page grounds, one copy each; ${glance.length} at-a-glance pages carry theirs.`);
