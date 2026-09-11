// Fails the build when an exercise can drop an answer without saying so.
//
// ── WHAT THIS IS ABOUT ─────────────────────────────────────────────────────
// Every exercise in the app saves as it goes, so a dropped request is not
// usually data loss: the answers are still in memory and the next save carries
// them. It becomes loss only if the app is closed in between, which is exactly
// what someone does when the screen appears to be working and is not.
//
// So the honest behaviour is to say so, and three of the five exercises did:
//
//   "That answer has not saved yet. It will try again on the next one."
//
// Conflict Patterns and Expectations did not. Same product, same dropped
// request, and whether you were told depended on which exercise you happened
// to be in. Nothing distinguished them but who wrote them.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// Every screen that calls saveExercise records the outcome and renders
// something when it failed. Not the wording, which is Ellie's, and not the
// placement.
//
// It does not check that the message is true, or that a retry happens. Those
// are the save path's job. This only checks that a failure is not silent.

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const DIR = join(ROOT, 'attune-app/src');

const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx$/.test(p)) files.push(p);
  }
})(DIR);

const problems = [];
let checked = 0;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  if (!/\bsaveExercise\s*\(/.test(src)) continue;
  // The client module declares it; it does not call it on anyone's behalf.
  if (file.endsWith('client.ts')) continue;
  checked += 1;
  const rel = file.replace(ROOT, '');

  // The outcome has to be recorded somewhere, not just returned.
  if (!/setSaveFailed\s*\(/.test(src)) {
    problems.push(
      `${rel} calls saveExercise and never records whether it worked.\n`
      + '      Returning res.ok to a caller that ignores it is the same as not knowing:\n'
      + '      the person carries on answering into memory.');
    continue;
  }
  // And rendered. A flag nothing reads is a flag.
  if (!/saveFailed\s*\?/.test(src)) {
    problems.push(
      `${rel} records a failed save and never renders it.\n`
      + '      The state exists and nothing on screen changes, which is the same\n'
      + '      silence with more code.');
  }
}

if (!checked) {
  console.error('[check-save-feedback] found no screens calling saveExercise; refusing to pass.');
  process.exit(1);
}

if (problems.length) {
  console.error('[check-save-feedback] an exercise can drop an answer silently:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`[check-save-feedback] ${checked} exercise screens; every one reports a failed save.`);
