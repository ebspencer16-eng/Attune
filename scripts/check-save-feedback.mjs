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
// Every screen that writes something a person typed records the outcome and
// renders something when it failed. Not the wording, which is Ellie's, and not
// the placement.
//
// The list of writers is derived from the client, not written here. It was
// `saveExercise` alone, and then the app grew a checklist, a budget and
// profile setup, none of which call that. Three more screens that could drop
// what someone typed, and this would have gone on reporting five of five.
//
// It does not check that the message is true, or that a retry happens. Those
// are the save path's job. This only checks that a failure is not silent.

import { writingScreens } from './_lib/app-writers.mjs';

/* Which screens write, and which client functions count as writing, come from
   _lib/app-writers.mjs. check-unmount-flush asks a different question about the
   same set of screens, and two copies of the derivation would drift. */
const { writers: WRITERS, screens: SCREENS } = writingScreens('check-save-feedback');

const problems = [];
let checked = 0;

/**
 * Did the screen look at whether the write worked?
 *
 * `res.ok`, `!r.ok`, `if (!res.ok)`. A screen that never reads the result
 * cannot know, whatever else it does.
 */
const INSPECTS = /\b\w+\.ok\b/;

/**
 * Does a failure reach the person?
 *
 * Three shapes, all of them in use here and all of them fine:
 *   Alert.alert(...)                     notes.tsx
 *   setError(...) rendered               annotation-sheet.tsx
 *   setSaveFailed(...) / setFailed(...)  the exercises, checklist, budget
 *
 * The first version of this demanded the literal name setSaveFailed and
 * flagged all three of the others. A gate that flags working code teaches
 * people to ignore it, which costs more than the thing it was watching for.
 */
function reportsFailure(src) {
  if (/Alert\.alert\s*\(/.test(src)) return true;
  // A state whose name says failure, set somewhere and rendered somewhere.
  for (const m of src.matchAll(/const \[(\w*(?:fail|error)\w*), (set\w+)\]/gi)) {
    const [, state] = m;
    const rendered = new RegExp(`\\{\\s*${state}\\s*(\\?|&&)`);
    if (rendered.test(src)) return true;
  }
  return false;
}

for (const { rel, src } of SCREENS) {
  checked += 1;

  if (!INSPECTS.test(src)) {
    problems.push(
      `${rel} writes what someone typed and never looks at whether it worked.\n`
      + '      Returning res.ok to a caller that ignores it is the same as not\n'
      + '      knowing: the person carries on typing into memory.');
    continue;
  }
  if (!reportsFailure(src)) {
    problems.push(
      `${rel} notices a failed write and tells nobody.\n`
      + '      An Alert, or a state named for the failure and rendered somewhere.');
  }
}

if (problems.length) {
  console.error('[check-save-feedback] an exercise can drop an answer silently:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(
  `[check-save-feedback] ${checked} screens write what someone typed `
  + `(${WRITERS.length} writers in the client); every one reports a failed save.`);
