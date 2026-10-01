#!/usr/bin/env node
/**
 * The app's home screen is composed as fractions of the screen, not as points.
 *
 * ── THE BUG IT CAME FROM, FOUR TIMES ──────────────────────────────────────
 * Ellie, about the home screen: "my cell view has way more blue at the bottom
 * than the simulator. Please adjust every page, view, etc. on the app so that
 * dimensions are the same on every phone screen." Then "I thought we fixed
 * this?", then "Still not consistent", then "Done, but still seeing the spacing
 * issue on my cell."
 *
 * Three fixes before the fourth, and each moved where the spare height
 * collected: after the last child, then above the panel, then inside it. None
 * made the composition scale, and none could, because the top of the page was a
 * stack of fixed point heights and the screen is not. The greeting and the
 * quick links come to the same number of points on every phone, so they take a
 * different fraction of each, and everything below starts somewhere different.
 *
 * What was missing was never a better fix. It was a measurement.
 *
 * ── WHAT THIS CHECKS, AND WHY IT IS NARROW ────────────────────────────────
 * That the home screen's reading block takes its height from the window. That
 * is the property the fourth fix added, and a constant creeping back is the
 * shape of all three failures.
 *
 * It is narrow because the app cannot be rendered here: its dashboard needs a
 * signed-in account and driving a simulator through a real sign-in is not
 * something this can do. Saying so is the point. "Every page checked on two
 * phone sizes" would be the sentence nobody re-examines and it would not be
 * true.
 *
 * ── THE WEBSITE HALF WAS BUILT, RUN, AND REMOVED ──────────────────────────
 * It rendered the dashboard at 1800 and 900 pixels tall and compared each
 * block's top edge as a fraction of the viewport. It failed immediately, and
 * the numbers were the lesson: every block was exactly twice as far down the
 * short viewport, because 1800/900 is two and the offsets are fixed pixels.
 *
 * That is not a bug on a page that scrolls. A desktop window showing less
 * before you scroll is a window, not a broken composition, and a gate insisting
 * otherwise would have pushed the website toward a design nobody asked for.
 * The proportional rule belongs to a phone, where the screen is the whole frame
 * and nothing below the fold exists.
 *
 * What the website owes the app is the same blocks in the same order, and
 * check-section-blocks already holds that, including `app-home` since the site
 * grew one.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Width. Phone widths vary far less and nothing has been reported.
 *
 * Whether the proportions are nice. They are Ellie's to look at. This only says
 * the screen is built out of them.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const BASE = process.env.BASE || 'http://localhost:4173';
const fails = [];

// ── 1. The app's home takes its reading height from the window ──────────────
{
  const home = readFileSync(`${ROOT}attune-app/src/app/index.tsx`, 'utf8');
  const code = home.replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

  if (!/useWindowDimensions\(\)/.test(code)) {
    fails.push('attune-app/src/app/index.tsx no longer measures the window.'
      + ' The reading above the panel has to be a fraction of the screen, or the'
      + ' panel starts at a different place on every phone, which is the bug Ellie'
      + ' reported four times.');
  }
  const derived = /const readingHeight = [^\n]*screenHeight[^\n]*/.exec(code);
  if (!derived) {
    fails.push('the home screen has no `readingHeight` derived from `screenHeight`.'
      + ' Refusing to pass: a gate that has lost its subject must never report'
      + ' success.');
  } else if (/readingHeight\s*=\s*\d+\s*;/.test(code)) {
    fails.push(`the home screen's reading height is a constant: ${derived[0].trim()}.`
      + ' A number of points is the same on every phone and therefore a different'
      + ' fraction of each, which is exactly what made this look different on hers.');
  }
  if (!/minHeight: readingHeight/.test(code)) {
    fails.push('`readingHeight` is computed and nothing uses it. That is how the'
      + ' original `topHeight` sat in this file for months describing a design that'
      + ' was never in force.');
  }
}

if (fails.length) {
  console.error('\n check-proportional-layout: a screen is composed differently at two'
    + ' sizes.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log("[check-proportional-layout] the app's home takes its reading height from the"
  + ' window, so the panel starts at the same fraction of the way down every phone.');
