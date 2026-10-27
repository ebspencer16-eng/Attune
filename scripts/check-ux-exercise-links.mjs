#!/usr/bin/env node
/**
 * UX Views offers a preview of every exercise, and only the registry knows
 * how many there are.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie: "UX views: the Conflict Patterns demo has no exercises section."
 * That section was four cards typed into public/admin.html while
 * api/_exercises.js has listed five since Conflict Patterns shipped, so the
 * newest exercise was the one nobody could preview. Communication's dot had
 * drifted too: the markup painted it #9B5DE5, a violet, where the registry
 * says #E8673A, which is what every other surface draws it in.
 *
 * Both are the same failure this repo is named for: a list of a thing kept by
 * hand beside the list of that thing.
 *
 * ── WHAT THIS CHECKS ──────────────────────────────────────────────────────
 * admin.html is a static page and cannot import from api/, so UX_EXERCISES is
 * a copy. This holds it to the registry on the four things the registry owns:
 * which exercises exist, what each is called, its colour, and its app route.
 *
 * What it deliberately does NOT check is `demo` and `extra`. Which demo
 * package owns an exercise, and what a demo needs in its query string to
 * stand its results up, are facts about the preview rather than about the
 * exercise, and the registry has never known them. Inventing a field there to
 * satisfy a gate would put preview plumbing into the product's own list.
 *
 * The name is compared against `label` with one allowance, spelled out rather
 * than loosened: the registry's Physical Intimacy Expectations is the
 * exercise's full name and the card shows the short one, which is the same
 * pair of names `fullLabel` exists for in the other direction.
 */
import { readFileSync } from 'node:fs';
import { EXERCISES } from '../api/_exercises.js';

const html = readFileSync(new URL('../public/admin.html', import.meta.url), 'utf8');

/* The array as written, read out of the page rather than re-implemented. A
   regex over the whole file would match the word in a comment, so this is
   bounded by the declaration and its closing bracket. */
const m = /const UX_EXERCISES = \[([\s\S]*?)\n\];/.exec(html);
if (!m) {
  console.error('[check-ux-exercise-links] UX_EXERCISES is not in public/admin.html.');
  console.error('  A gate that has lost its subject must not report success.');
  process.exit(1);
}

const entries = [];
for (const line of m[1].split('\n')) {
  const t = line.trim();
  if (!t.startsWith('{')) continue;
  const field = (name) => {
    const f = new RegExp(name + ":\\s*'([^']*)'").exec(t);
    return f ? f[1] : null;
  };
  entries.push({ key: field('key'), name: field('name'), color: field('color'), view: field('view'), sec: field('sec') });
}

const problems = [];
const byKey = new Map(entries.map((e) => [e.key, e]));

for (const ex of EXERCISES) {
  const got = byKey.get(ex.key);
  if (!got) {
    problems.push(`${ex.key} (${ex.label}) has no card on UX Views, so nobody can preview it.`);
    continue;
  }
  /* The short name is allowed to be a prefix of the registry's full one, and
     nothing else. "Physical Intimacy" for "Physical Intimacy Expectations"
     passes; "Communications" does not. */
  if (got.name !== ex.label && !ex.label.startsWith(got.name)) {
    problems.push(`${ex.key}: the card says "${got.name}", the registry says "${ex.label}".`);
  }
  if ((got.color || '').toLowerCase() !== (ex.color || '').toLowerCase()) {
    problems.push(`${ex.key}: the card's dot is ${got.color}, the registry says ${ex.color}.`);
  }
  if (got.view !== ex.view) {
    problems.push(`${ex.key}: the card opens view=${got.view}, the registry says ${ex.view}.`);
  }
  if (got.sec !== ex.resultsGroup) {
    problems.push(`${ex.key}: the card opens sec=${got.sec}, the registry's results chapter is ${ex.resultsGroup}.`);
  }
}

for (const e of entries) {
  if (!EXERCISES.some((ex) => ex.key === e.key)) {
    problems.push(`${e.key} has a card and is not an exercise. A preview of something retired is worse than none.`);
  }
}

/* The cards are drawn by a loop, so a list that is right and never rendered
   is the other half of this. */
if (!/renderUxExercises\s*\(\s*\)/.test(html.replace(/function renderUxExercises/g, ''))) {
  problems.push('renderUxExercises is defined and never called, so the section draws nothing.');
}
if (!/id="ux-exercises"/.test(html)) {
  problems.push('There is no #ux-exercises for the cards to be drawn into.');
}

if (problems.length) {
  console.error('[check-ux-exercise-links] UX Views disagrees with api/_exercises.js:');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}

console.log(`[check-ux-exercise-links] all ${EXERCISES.length} exercises have a preview card, named, coloured and routed as the registry says.`);
