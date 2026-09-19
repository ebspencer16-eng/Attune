#!/usr/bin/env node
/**
 * One colour per exercise, and the app agrees with it.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie: "Please make the colors in the nav landing match the exercise
 * colors." They did not. The results nav carried five colours typed into
 * api/_lib/results-sections.js and the app tints each exercise screen from
 * SectionColor in attune-theme.ts, so Communication was the brand orange
 * while you answered it and a violet the moment you read it back. Nothing
 * connected the two, and nothing said which was right.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * api/_exercises.js is where an exercise is defined, so it is where its colour
 * lives. The nav reads it. The app cannot: it is a separate Expo project that
 * does not build against api/, which is the documented arrangement for exactly
 * this case. So the app's copy is held to the registry here, by value, and a
 * change to either side without the other fails the build.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Section GROUNDS, which are gradients per page and live in
 * api/_lib/section-grounds.js with their own contrast gate. A colour names a
 * section; a ground is what one of its pages is painted on, and the two are
 * allowed to differ: the Communication pages are a purple gradient on both
 * surfaces while the exercise is orange.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const { EXERCISES } = await import(`${ROOT}api/_exercises.js`);
const theme = readFileSync(`${ROOT}attune-app/src/constants/attune-theme.ts`, 'utf8');

/** Which theme key each exercise's colour is expected under. */
const THEME_KEY = {
  ex1: 'communication',
  ex2: 'expectations',
  ex3: 'reflection',
  intimacy: 'intimacy',
  conflict: 'conflict',
};

const problems = [];

/** SectionColor, read out of the theme as it is written. */
const block = /export const SectionColor = \{([\s\S]*?)\} as const;/.exec(theme);
if (!block) {
  problems.push('cannot find SectionColor in attune-theme.ts, so this is checking nothing.');
}
const appColors = {};
for (const m of (block?.[1] || '').matchAll(/(\w+):\s*'(#[0-9A-Fa-f]{6})'/g)) {
  appColors[m[1]] = m[2].toUpperCase();
}

for (const e of EXERCISES) {
  if (!e.color) {
    problems.push(`${e.key} has no colour in api/_exercises.js. Every exercise needs one; the nav reads it.`);
    continue;
  }
  const key = THEME_KEY[e.key];
  if (!key) {
    problems.push(`${e.key} is in the registry and this gate has no theme key for it. Add one, or the app's colour goes unchecked.`);
    continue;
  }
  const app = appColors[key];
  if (!app) {
    problems.push(`SectionColor.${key} is missing from the app, so ${e.key} has no colour there.`);
  } else if (app !== e.color.toUpperCase()) {
    problems.push(`${e.key}: ${e.color} in api/_exercises.js, ${app} as SectionColor.${key} in the app.`);
  }
}

/**
 * And the nav actually gives each exercise's section that colour and that name.
 *
 * ── WHY THIS RUNS THE NAV RATHER THAN READING IT ──────────────────────────
 * The first version of this scanned api/_lib/results-sections.js for any hex
 * belonging to an exercise and called it a second copy. It matched too much:
 * Highlights, Couple Type and What Comes Next are not exercises and wear the
 * brand orange, which happens to be the same hex as Communication's. A gate
 * that flags correct code is not the safe direction; it gets loosened until it
 * matches nothing.
 *
 * So it runs resultsNav() and compares the answers. That cannot tell you
 * whether the value was typed or derived, and it does not need to: a typed
 * copy holding the right value today fails here the moment either side moves,
 * which is the only failure that reaches a reader.
 */
const navMod = await import(`${ROOT}api/_lib/results-sections.js`);
const groups = navMod.resultsNav({ hasReflection: true, intimacyReady: true, conflictListed: true });

/** Which nav group is each exercise's section. */
const GROUP_ID = {
  ex1: 'comm',
  ex2: 'exp',
  ex3: 'reflection',
  intimacy: 'intimacy',
  conflict: 'conflict',
};

for (const e of EXERCISES) {
  const id = GROUP_ID[e.key];
  if (!id) {
    problems.push(`${e.key} is in the registry and this gate does not know which nav group it is. Add it, or its section goes unchecked.`);
    continue;
  }
  const g = groups.find(x => x.id === id);
  if (!g) {
    problems.push(`the nav has no group '${id}', so ${e.key} has no section.`);
    continue;
  }
  if ((g.color || '').toUpperCase() !== (e.color || '').toUpperCase()) {
    problems.push(`nav group '${id}' is ${g.color}; ${e.key} is ${e.color} in the registry.`);
  }
  const want = e.fullLabel || e.label;
  if (g.label !== want) {
    problems.push(`nav group '${id}' is called "${g.label}"; ${e.key} is "${want}" in the registry. Ellie asked for the full names.`);
  }
}

if (problems.length) {
  console.error('[check-exercise-colours] an exercise is two colours:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('api/_exercises.js carries the colour. The nav reads it; the app mirrors it');
  console.error('because an Expo project cannot import from api/.');
  process.exit(1);
}

console.log(`[check-exercise-colours] ${EXERCISES.length} exercises, one colour each, the nav derives them and the app matches.`);
