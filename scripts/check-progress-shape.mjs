#!/usr/bin/env node
/**
 * One column, two shapes, every reader unwrapping the same way.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * profiles.ex{N}_progress holds a partly answered exercise. Two clients write
 * it and they did not write the same thing: the website sent ex1 as
 * { answers, idx } and ex2/ex3 as the bare answers, and the app sent the bare
 * answers throughout.
 *
 * Two server modules read it. api/_lib/exercise-progress.js unwrapped both
 * shapes, and documented that it had to. api/questions.js, which hands the app
 * its resume point, handed the blob over raw.
 *
 * So: begin Communication on the website, stop, open the app. The app receives
 * `{ answers: {...}, idx: 12 }` as its answers map. Nothing in it matches a
 * question id, so the exercise reopens at question one with the wrapper sitting
 * in state, and the next answer saves `{ answers: {...}, idx: 12, q1: 3 }`.
 * Finish from there and that is what lands in ex1_answers, and the type engine
 * scores a couple off one answer.
 *
 * Nothing errored at any point. The home screen's "12 of 100" was right the
 * whole time, because it came through the reader that unwrapped.
 *
 * ── WHAT THIS CHECKS ──────────────────────────────────────────────────────
 * Behaviourally, because a rule about shapes is executable: every reader is run
 * over every shape a writer produces, and each must return the real answers.
 * Statically: no reader may touch a _progress column without going through
 * progressAnswers, and no caller may hand syncProgressCrossDevice a wrapper.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Not the app's own writes, which go through /api/save-exercise and are stored
 * verbatim; that endpoint's shape is checked by check-progress-not-destructive.
 *
 * Not the website resuming from the app. It cannot: the website reads progress
 * from localStorage and never from the server, so cross-device resume is
 * one-way. That is a gap, not a drift, and it is recorded as one.
 */

import { readFileSync } from 'node:fs';
import { EXERCISES } from '../api/_exercises.js';
import { progressAnswers, progressFor } from '../api/_lib/exercise-progress.js';
import { savedAnswers } from '../api/questions.js';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

/**
 * The shapes a writer actually produces.
 *
 * `wrapped` is the website's historic ex1 blob, and rows holding it already
 * exist, so tolerating it is not optional: it is the saved work of anybody who
 * started Communication on the website before this was fixed.
 */
const REAL = { q1_self: 3, q1_partner: 5, q2_self: 1 };
const SHAPES = [
  { name: 'bare answers (the app, and the website for ex2 and ex3)', blob: { ...REAL } },
  { name: 'wrapped { answers, idx } (the website for ex1, still in the table)', blob: { answers: { ...REAL }, idx: 12 } },
];

/** progressAnswers, the one unwrapper. */
for (const { name, blob } of SHAPES) {
  const got = progressAnswers(blob);
  const same = got && JSON.stringify(Object.keys(got).sort()) === JSON.stringify(Object.keys(REAL).sort());
  if (!same) {
    fails.push(`progressAnswers does not find the answers in ${name}.`
      + ` It returned ${JSON.stringify(got)} where the answers are`
      + ` ${JSON.stringify(REAL)}.`);
  }
}

/** A blob with neither shape reads as nothing saved, which is the safe direction. */
if (progressAnswers({ idx: 4 }) !== null) {
  fails.push('progressAnswers treats a website blob that has not been answered'
    + ' into yet as answers, so the status row would claim progress on an'
    + ' exercise nobody has answered.');
}
for (const empty of [null, undefined, 'nonsense', 7]) {
  if (progressAnswers(empty) !== null) {
    fails.push(`progressAnswers returns something for ${JSON.stringify(empty)},`
      + ' which is not a blob at all.');
  }
}

/** Every reader, over every shape. This is the half that was broken. */
const flat = EXERCISES.filter((e) => e.shape !== 'record');
for (const ex of flat) {
  for (const { name, blob } of SHAPES) {
    const profile = { [ex.column]: null, [`${ex.key}_progress`]: blob };

    const saved = await savedAnswers(ex, profile);
    const keys = Object.keys(saved?.answers || {}).sort();
    if (JSON.stringify(keys) !== JSON.stringify(Object.keys(REAL).sort())) {
      fails.push(`api/questions.js hands the app ${JSON.stringify(keys)} as the`
        + ` saved answers for ${ex.key} from ${name}. The answers are`
        + ` ${JSON.stringify(Object.keys(REAL).sort())}. The app restores that as`
        + ' its answers map, finds nothing matching a question, restarts at'
        + ' question one, and saves the wrapper back over the real answers.');
    }

    const p = progressFor(profile, ex);
    if (p.answered !== Object.keys(REAL).length) {
      fails.push(`progressFor counts ${p.answered} answered for ${ex.key} from`
        + ` ${name}, not ${Object.keys(REAL).length}.`);
    }
  }

  /** And finished still wins over anything stale left in the progress slot. */
  const finished = await savedAnswers(ex, {
    [ex.column]: { ...REAL, q9_self: 2 },
    [`${ex.key}_progress`]: { answers: { q1_self: 1 }, idx: 1 },
  });
  if (Object.keys(finished?.answers || {}).length !== 4) {
    fails.push(`api/questions.js prefers a stale progress blob over finished`
      + ` answers for ${ex.key}. The website does not clear the progress column`
      + ' on completion, so every website completion leaves one behind.');
  }
}

/** No reader may touch the column without the unwrapper. */
const readers = ['api/questions.js', 'api/home.js', 'api/_lib/exercise-progress.js'];
for (const f of readers) {
  const src = readFileSync(`${ROOT}${f}`, 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    if (/^\s*(\*|\/\/)/.test(line)) return;
    // A read of the column: a property access ending in _progress.
    if (!/\[\s*[`'"][^`'"]*_progress[`'"]\s*\]|\.\w*_progress\b/.test(line)) return;
    // A select list names the column without reading its contents.
    if (/select|\.map\(|\.join\(|=\s*null|=\s*answers/.test(line)) return;
    if (/progressAnswers\(/.test(line)) return;
    fails.push(`${f}:${i + 1} reads a _progress column without progressAnswers.`
      + ` The column holds two shapes and this one sees one of them:\n      ${line.trim()}`);
  });
}

/** And no writer may hand the sync a wrapper. */
const app = readFileSync(`${ROOT}src/App.jsx`, 'utf8');
for (const m of app.matchAll(/syncProgressCrossDevice\(\s*(\d+)\s*,\s*([^)]*)\)/g)) {
  if (/^\s*\{/.test(m[2])) {
    fails.push(`src/App.jsx hands syncProgressCrossDevice an object literal for`
      + ` exercise ${m[1]}: ${m[2].trim()}. The server copy of progress is read`
      + ' by the app, which finds its own place from the first unanswered'
      + ' question. Send the answers. The idx belongs in localStorage, which is'
      + ' the only thing that resumes from it.');
  }
}

if (fails.length) {
  console.error('\n check-progress-shape: a partly answered exercise can be lost'
    + ' between the website and the app.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`[check-progress-shape] ${SHAPES.length} stored shapes, read correctly`
  + ` by both readers for all ${flat.length} flat exercises, and no writer sends a wrapper.`);
