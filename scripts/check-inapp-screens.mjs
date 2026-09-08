// Fails the build when an exercise is marked inApp with no screen to ask it.
//
// inApp is a single flag in api/_exercises.js, and flipping it changes three
// things at once: /api/home tells the app the exercise is answerable,
// /api/questions starts serving it, and the app offers it. If the screen is
// not there, the app opens a card and renders the wrong exercise or nothing at
// all, and the flag is the only thing that said otherwise.
//
// The registry's own comment says to flip it "when the screen exists". This is
// what makes that true rather than remembered.

import { readFileSync } from 'fs';
import { EXERCISES } from '../api/_exercises.js';

const insights = readFileSync(new URL('../attune-app/src/app/insights.tsx', import.meta.url), 'utf8');
const questions = readFileSync(new URL('../api/questions.js', import.meta.url), 'utf8');

// The block that picks a component for an open exercise. Bounded by the main
// render below it rather than by the first closing brace, because the dispatch
// contains braces of its own.
const start = insights.indexOf('if (openExercise) {');
const end = insights.indexOf('\n  return (', start);
const dispatch = insights.slice(start, end === -1 ? undefined : end);

const problems = [];

for (const e of EXERCISES) {
  if (!e.inApp) continue;

  // Named either as an object key or as a quoted comparison. Both are a
  // screen; neither is falling through to whatever the default happens to be.
  const named = new RegExp(`(?:^|[^A-Za-z0-9_])${e.key}\\s*:|'${e.key}'`, 'm').test(dispatch);
  if (!named) {
    problems.push(`${e.key} (${e.label}): inApp, but insights.tsx has no screen for it`);
  }
  if (!new RegExp(`key === '${e.key}'`).test(questions)) {
    problems.push(`${e.key} (${e.label}): inApp, but /api/questions does not serve it`);
  }
}

if (problems.length) {
  console.error('[check-inapp-screens] exercises marked answerable that are not:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('Either build the screen and serve the questions, or set inApp: false');
  console.error('in api/_exercises.js until both exist.');
  process.exit(1);
}

const inApp = EXERCISES.filter((e) => e.inApp);
console.log(`[check-inapp-screens] ${inApp.length} exercises answerable in the app, all with a screen and questions.`);
