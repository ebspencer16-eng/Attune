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
 * ── THE EXCLUSION THAT WAS WRONG ──────────────────────────────────────────
 * This file used to say, here, that the sign-in path did not need covering:
 * "it writes storage and then hands the account up; the hydration effect reads
 * storage after that, so the order is already right and the setters are not in
 * scope there anyway."
 *
 * The first clause was an assumption and it was false. Nothing reads storage
 * again after mount. So signing in on a browser with nothing cached wrote the
 * answers to storage, handed the account up, and left the dashboard rendering
 * against the state it started with: exercise incomplete, results locked, right
 * again after a refresh.
 *
 * Ellie hit it and reported the same symptom a second time: "my ex1 shows as
 * incomplete. This cannot keep happening, fix it." She was right that it was the
 * same bug. It was in the one place this check had been told to ignore.
 *
 * The second clause was true and is the reason the fix is where it is: AuthModal
 * has no setters, so the parent pulls storage into state the moment the modal
 * hands back, and that call is what is checked below.
 *
 * A gate's stated exclusions are load-bearing. This one was a guess written in
 * the voice of a decision.
 *
 * ── WHAT IT STILL DOES NOT COVER ──────────────────────────────────────────
 * The partner's answers, which are a different shape and a quieter failure: a
 * column that reads Pending for a moment.
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

/**
 * And the sign-in handoff.
 *
 * AuthModal writes storage and calls onSuccess. Every handler for it has to pull
 * that into state, because nothing else will: the setters are initialised at
 * mount and never read storage again.
 */
const handlers = [...src.matchAll(/onSuccess=\{\(acct\) => \{([\s\S]*?)\n        \}\}/g)];
if (!handlers.length) {
  console.error('[check-answer-hydration] cannot find AuthModal\'s onSuccess handlers'
    + ' in src/App.jsx. Refusing to pass: this is the path Ellie hit twice.');
  process.exit(1);
}
for (const h of handlers) {
  if (!/restoreAnswersIntoState\(\)/.test(h[1])) {
    const n = src.slice(0, h.index).split('\n').length;
    fails.push(`src/App.jsx:${n} signs someone in without pulling their answers into`
      + ' state. AuthModal has just written them to storage, and nothing reads storage'
      + ' after mount, so the dashboard draws against the state it started with and'
      + ' says an exercise is unfinished.');
  }
}

/**
 * And the restorer has to restore.
 *
 * Checking only that it is called was planted against and passed: gutting the
 * body left every call site intact. A function is checked by what it does.
 */
const body = src.match(/const restoreAnswersIntoState = \(\) => \{([\s\S]*?)\n  \};/);
if (!body) {
  fails.push('restoreAnswersIntoState is not defined, so the sign-in handlers call'
    + ' nothing and the answers stay in storage.');
} else {
  if (!/EXERCISES/.test(body[1])) {
    fails.push('restoreAnswersIntoState does not walk EXERCISES, so it is a'
      + ' hand-written list and the next exercise will be left out of it, which is'
      + ' how the first version of this fix covered three of five.');
  }
  if (!/localStorage\.getItem/.test(body[1])) {
    fails.push('restoreAnswersIntoState never reads storage, so there is nothing for'
      + ' it to put into state.');
  }
  /* The setter has to be reached by what was read. Matching `set(` alone passed a
     plant that wrapped it in `if (false)`, which is the fifth time this session a
     gate has been defeated by a constant guard rather than by deleting anything. */
  if (!/(if\s*\(\s*raw\s*\)\s*set\(|raw\s*&&\s*set\()/.test(body[1])) {
    fails.push('restoreAnswersIntoState does not call a setter with what it read.'
      + ' Either it never sets, or the set sits behind something other than the'
      + ' value it just loaded, and the dashboard still draws against its mount'
      + ' state.');
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

console.log(`[check-answer-hydration] ${checked} profile restores in App and`
  + ` ${handlers.length} sign-in handoffs, every one of them reaching state as well as storage.`);
