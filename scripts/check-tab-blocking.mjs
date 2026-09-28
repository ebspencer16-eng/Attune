#!/usr/bin/env node
/**
 * A tab does not wait on everything it will eventually need.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * Ellie: "the learn tab spun for about 30 secs, then showed a 'something went
 * wrong' error that said 'this is on our end...' then went away after about a
 * minute."
 *
 * Learn loaded with one `await Promise.all` over five requests, so the tab was a
 * spinner until the slowest of them answered. Every one of the five is a
 * serverless function, and a function nobody has called for an hour is cold: the
 * home tab's own notes measure a cold /api/home at one to three and a half
 * seconds against a third of a second warm. All four tabs mount at launch, so a
 * cold start asks for five cold functions at once and the reader watches the
 * worst of them.
 *
 * Then the error. Only the first of the five set it, so one slow answer failing
 * put the whole tab into an error state while the other four had already
 * arrived, and it "went away" a minute later because focusing the tab loads
 * again and by then everything was warm.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * A screen may wait for the one thing it cannot draw without. It may not wait
 * for the rest. Promise.all expresses the opposite: its whole purpose is to
 * finish when the slowest does, which is the right tool for a refresh spinner
 * and the wrong one for a first paint.
 *
 * So: no `await Promise.all` before the screen stops being a spinner. Each
 * request sets its own section as it lands.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Promise.all after the screen is drawable. Learn still uses one to decide when
 * a pull-to-refresh has finished, which is correct: that gesture should keep
 * spinning until the thing it was pulling for has actually landed.
 *
 * How long any request takes. That is the server's problem and it is measured
 * elsewhere. This is about how many of them a person waits behind.
 *
 * Whether a screen caches its last payload. The home tab does and Learn now
 * does, which is what removes the wait entirely on a second launch, but a screen
 * with nothing worth keeping is not wrong to have none.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

/** The four tabs. A tab is what someone waits on; a modal is opened deliberately. */
const TABS = ['index', 'insights', 'notes', 'resources'].map((n) => `attune-app/src/app/${n}.tsx`);

for (const rel of TABS) {
  let src;
  try { src = readFileSync(`${ROOT}${rel}`, 'utf8'); }
  catch {
    console.error(`[check-tab-blocking] ${rel} is missing. Refusing to pass: a gate`
      + ' that has lost its subject must never report success.');
    process.exit(1);
  }

  const code = src.split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, ' ');

  /**
   * Every `await Promise.all`, and whether the spinner is already down when it
   * is reached. `setLoading(false)` before it in the same function is the screen
   * saying it is drawable; after it is the screen saying it waited.
   */
  for (const m of code.matchAll(/await Promise\.all\(/g)) {
    const before = code.slice(Math.max(0, m.index - 2500), m.index);
    const drawable = /setLoading\(false\)/.test(before);
    if (!drawable) {
      const line = code.slice(0, m.index).split('\n').length;
      fails.push(`${rel}:${line} waits for every request before the tab can draw.`
        + ' Promise.all finishes when the slowest one does, and these are cold'
        + ' serverless functions on a first launch, which is how Learn came to spin'
        + ' for thirty seconds. Let each request set its own section as it lands,'
        + ' and stop the spinner on the one the screen cannot draw without.');
    }
  }

  /**
   * And an error that belongs to one request must not be the tab's error.
   *
   * Not checkable in general, so this checks the specific shape: a screen that
   * sets a whole-screen error from inside a destructured Promise.all result,
   * which is what put Learn into an error state over one of five answers.
   */
  const destructured = code.match(/const \[[^\]]+\] = await Promise\.all\(/);
  if (destructured) {
    const line = code.slice(0, destructured.index).split('\n').length;
    fails.push(`${rel}:${line} destructures a Promise.all, so every one of those`
      + ' requests has to answer before any of them is looked at, and whichever one'
      + " sets the screen's error decides the fate of the whole tab.");
  }
}

if (fails.length) {
  console.error('\n check-tab-blocking: a tab waits on its slowest request.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`[check-tab-blocking] ${TABS.length} tabs; none of them holds its first`
  + ' paint behind every request it makes.');
