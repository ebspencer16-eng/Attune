#!/usr/bin/env node
/**
 * Every exercise warns before the tab closes on top of it, and the pending
 * cross-device write is flushed when the tab is hidden.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * The website's beforeunload guard named three views: exercise1, exercise2 and
 * exercise3. There are five exercises. Someone halfway through Conflict
 * Patterns or Physical Intimacy could close the tab with no warning at all,
 * and those are the two where an answer is a paragraph rather than a number.
 *
 * One rule maintained by hand in one place while the list it describes lives
 * somewhere else, which is the shape this whole codebase is organised against.
 * It reads EXERCISES now.
 *
 * ── AND THE PENDING SYNC ──────────────────────────────────────────────────
 * The cross-device progress write is debounced by a second and a half, so the
 * last second and a half of answers existed only in the browser that typed
 * them. localStorage still holds them, so it is not lost work in the ordinary
 * case; it is lost work in exactly the case that sync exists for, which is
 * resuming on the other device. It is flushed when the tab is hidden.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Not whether the browser honours the warning. Chrome and Safari both decide
 * for themselves whether to show one, and neither lets a page insist. What is
 * checkable is that the product asks, for every exercise rather than three.
 *
 * Not the app, which has no tab to close. Its equivalent is a save on unmount,
 * and that is checked where it happens.
 *
 * ── A NOTE ON THE MATCHING ────────────────────────────────────────────────
 * The first version of this file tested /beforeunload/ and /visibilitychange/
 * as bare substrings. Both plants passed, because renaming the event to
 * xbeforeunload leaves the substring intact. An event name is matched with its
 * quotes now. A substring match on a name is not a match on the name.
 */

import { readFileSync } from 'node:fs';
import { EXERCISES } from '../api/_exercises.js';

const ROOT = new URL('..', import.meta.url).pathname;
const src = readFileSync(`${ROOT}src/App.jsx`, 'utf8');
const fails = [];

/** The guard itself, found by the comment that names it. */
const at = src.indexOf('Warn before closing mid-exercise');
if (at < 0) {
  console.error('[check-unsaved-warning] cannot find the mid-exercise guard in'
    + ' src/App.jsx. Refusing to pass: a gate that has lost its subject must not'
    + ' report success.');
  process.exit(1);
}
const block = src.slice(at, at + 1400);

if (!/addEventListener\(\s*['"]beforeunload['"]/.test(block)) {
  fails.push('the mid-exercise block no longer listens for beforeunload, so'
    + ' closing the tab halfway through an exercise takes the answers with it'
    + ' without asking.');
}

/**
 * Derived, not listed.
 *
 * A hand-written list of views is what left two exercises unguarded. If the
 * block names any view as a string literal it is restating the registry, and
 * the next exercise will be forgotten the same way.
 */
const literals = [...block.matchAll(/view\s*===\s*["']([a-z0-9]+)["']/g)].map((m) => m[1]);
const known = new Set(EXERCISES.map((e) => e.view));
for (const v of literals) {
  if (known.has(v)) {
    fails.push(`the guard names the view "${v}" as a literal. There are`
      + ` ${EXERCISES.length} exercises and this is how three of them came to be`
      + ' covered and two not. Read EXERCISES.');
  }
}
if (!literals.length && !/EXERCISES/.test(block)) {
  fails.push('the guard decides which views count without reading EXERCISES,'
    + ' so nothing connects it to the list of exercises it is about.');
}

/**
 * And the flush, which is the other half of not losing what was typed.
 *
 * The listener has to be the thing that calls it. Checking that both strings
 * appear somewhere in a fifteen-thousand-line file is not a check.
 */
const hide = src.match(/addEventListener\(\s*['"]visibilitychange['"][\s\S]{0,400}?\n\s*\}\);/);
if (!hide) {
  fails.push('nothing listens for visibilitychange, so the debounced progress'
    + ' sync is never flushed when the tab is hidden and the last second and a'
    + ' half of answers reaches no other device. That is the one thing sync is for.');
} else if (!/\bflushProgressSync\(\s*\)/.test(hide[0])) {
  fails.push('the visibilitychange listener exists but never calls'
    + ' flushProgressSync(), so the pending write is still dropped.');
}
if (!/function flushProgressSync\b/.test(src)) {
  fails.push('flushProgressSync is not defined, so the pending progress write'
    + ' cannot be flushed at all.');
}

if (fails.length) {
  console.error('\n check-unsaved-warning: an exercise can lose what was typed.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`[check-unsaved-warning] the close guard covers all ${EXERCISES.length}`
  + ' exercises from the registry, and the pending sync is flushed when the tab hides.');
