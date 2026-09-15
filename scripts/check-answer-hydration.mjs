#!/usr/bin/env node
/**
 * A restored answer has to reach the screen, not just the browser's storage.
 *
 * ── WHAT WENT WRONG ───────────────────────────────────────────────────────
 * Ellie: "when I hard refreshed, my dashboard refreshed and showed me a list
 * with rows for each exercise with a check mark to the left, but showed my ex1
 * as incomplete. I refreshed again and it went away and I could access
 * results."
 *
 * The session-restore path fetched her profile, wrote every exercise's answers
 * to localStorage, and stopped there. The dashboard reads React state, which
 * is initialised from localStorage at mount and never again, so the load that
 * fetched the answers rendered as though she had not done the exercise, and
 * the next load was right. A forced reload existed to cover that, capped at
 * one per tab so it cannot loop, which leaves a hard refresh landing in
 * exactly the gap the cap creates.
 *
 * Telling a couple an exercise is unfinished, and locking results they have
 * both completed, is the worst thing that screen can get wrong.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * Inside App(), where the state setters live: a line that writes a profile's
 * exercise answers into localStorage must also put them into state. The
 * exercises come from api/_exercises.js, so a new one is covered the day it is
 * added rather than the day someone remembers this file.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The sign-in path in the other component, which writes storage and then hands
 * the account up; the hydration effect reads storage after that, so the order
 * is already right and the setters are not in scope there anyway. And it says
 * nothing about the partner's answers, which are a different shape and a
 * quieter failure: a column that reads Pending for a moment.
 */

import { readFileSync } from 'node:fs';
import { EXERCISES } from '../api/_exercises.js';

const ROOT = new URL('..', import.meta.url).pathname;
const src = readFileSync(`${ROOT}src/App.jsx`, 'utf8');

const appAt = src.indexOf('export default function App()');
if (appAt < 0) {
  console.error('[check-answer-hydration] src/App.jsx has no App component under that name.');
  process.exit(1);
}
const app = src.slice(appAt);
const fails = [];
let checked = 0;

for (const e of EXERCISES) {
  if (!e.localKey) continue;
  // Every restore of this exercise's answers from a profile, inside App.
  const re = new RegExp(`localStorage\\.setItem\\('${e.localKey}',[^\\n]*profile[^\\n]*\\)`, 'g');
  for (const m of app.matchAll(re)) {
    checked += 1;
    // The whole statement: everything between the braces of the if it sits in,
    // or the line, whichever is longer. A setter may be on either.
    const lineStart = app.lastIndexOf('\n', m.index) + 1;
    const lineEnd = app.indexOf('\n', m.index);
    const line = app.slice(lineStart, lineEnd);
    // A React setter, not localStorage.setItem: the first version of this
    // matched setItem and so passed on the bug it was written for.
    if (!/\bset(?!Item\b)[A-Z]\w*\(/.test(line)) {
      const n = src.slice(0, appAt + m.index).split('\n').length;
      fails.push(`src/App.jsx:${n} restores ${e.localKey} into storage and never into state`);
    }
  }
}

if (!checked) {
  fails.push('no profile restore of exercise answers was found in App at all, which means this gate is looking in the wrong place');
}

if (fails.length) {
  console.error('[check-answer-hydration] a completed exercise will read as unfinished until the next reload:');
  for (const f of fails) console.error(`  ${f}`);
  console.error('');
  console.error('Set the state beside the localStorage write. The dashboard reads state.');
  process.exit(1);
}

console.log(`[check-answer-hydration] ${checked} profile restores in App, every one of them reaching state as well as storage.`);
