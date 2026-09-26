#!/usr/bin/env node
/**
 * No screen writes an exercise's number by hand unless that number cannot move.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * Exercise numbering is positional over what a couple OWNS: the nth exercise
 * they bought is 0n. CLAUDE.md says why, and so does a comment beside the
 * dashboard tile that has always got it right. A customer should never see a
 * number for something they did not buy.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * Two screens on the website said "Exercise 05" for Conflict Patterns: the
 * intro every customer reads before answering it, and the screen that says
 * they are done. Five is the registry's own order. Premium bundles four
 * exercises, so every premium customer opening Conflict Patterns read a number
 * for two exercises they had never bought, and a core customer who bought it as
 * the add-on it is read 05 for their third.
 *
 * The rule was already written down in two places. The tile beside these two
 * screens counted correctly. Nothing connected them.
 *
 * ── WHICH NUMBERS ARE SAFE TO TYPE, DERIVED ───────────────────────────────
 * Not every literal is wrong, and a gate that says so would be ignored.
 * Communication is always 01 and Expectations always 02, because every package
 * includes them. Relationship Reflection is always 03, because the only two
 * exercises that can precede it are those two.
 *
 * So the safe set is computed rather than asserted: ownedExercises is run over
 * every combination of the capabilities that gate an exercise, and an exercise
 * whose number is the same in all of them can be typed. Physical Intimacy is 03
 * or 04 depending on Reflection, and Conflict Patterns is 03, 04 or 05, so
 * neither can.
 *
 * That means a sixth exercise, or moving one in the registry, changes what this
 * gate allows without anybody editing it. Which is the point: the last version
 * of this rule was a comment, and a comment cannot fail a build.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Not the totals. "Exercise 01 of 02" appears in the Partner B onboarding flow,
 * which walks someone through Communication and Expectations and hands the rest
 * to the dashboard, so "of 02" may be an accurate description of that sequence
 * rather than a claim about the package. Changing it is a copy decision and
 * TASKS.md carries it as one.
 *
 * Not the prose that names exercises in a sentence. "Exercise 01 covers how you
 * communicate, Exercise 02 maps your expectations" is Ellie's copy, and a
 * customer who owns four exercises reading a sentence about two is a wording
 * question, not an arithmetic one.
 *
 * Not the app, which has no exercise numbers in it at all. The eyebrow there
 * names the exercise, which is what api/_lib/exercise-intro.js decided and
 * says: a couple who bought Conflict Patterns is not doing exercise five of two.
 */

import { readFileSync } from 'node:fs';
import { EXERCISES, ownedExercises } from '../api/_exercises.js';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

/** Every capability that gates an exercise, from the registry. */
const caps = [...new Set(EXERCISES.map((e) => e.capability).filter(Boolean))];

/**
 * Which numbers each exercise can wear, over every package shape.
 *
 * 2^n combinations of the gating capabilities. Small by construction: there are
 * three, and a fourth would still be eight.
 */
const possible = new Map(EXERCISES.map((e) => [e.key, new Set()]));
for (let mask = 0; mask < (1 << caps.length); mask += 1) {
  const pkg = Object.fromEntries(caps.map((c, i) => [c, !!(mask & (1 << i))]));
  for (const e of ownedExercises(pkg)) possible.get(e.key).add(e.num);
}

const stable = new Map();   // key -> the one number it always has
const movable = new Map();  // key -> every number it can have
for (const e of EXERCISES) {
  const nums = [...possible.get(e.key)].sort();
  if (nums.length === 1) stable.set(e.key, nums[0]);
  else movable.set(e.key, nums);
}

if (!stable.size || !movable.size) {
  console.error('[check-exercise-numbers] derived no stable numbers, or no movable'
    + ' ones, from api/_exercises.js. One of each is expected: Communication is'
    + ' always 01 and Conflict Patterns moves. Refusing to pass, because a gate'
    + ' that has lost its subject must never report success.');
  console.error(`  stable: ${[...stable].map(([k, n]) => `${k}=${n}`).join(', ') || '(none)'}`);
  console.error(`  movable: ${[...movable].map(([k, n]) => `${k}=${n.join('/')}`).join(', ') || '(none)'}`);
  process.exit(1);
}

const SAFE = new Set(stable.values());

const src = readFileSync(`${ROOT}src/App.jsx`, 'utf8');
src.split('\n').forEach((line, i) => {
  // Comments explain the rule; they do not render.
  if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;

  for (const m of line.matchAll(/Exercise (\d{2})\b(?!\s*of\b)/gi)) {
    const num = m[1];
    const rest = line.slice(m.index, m.index + 120).toLowerCase();

    /**
     * A number no stable exercise can have is necessarily one that moves, so a
     * literal is wrong for somebody whatever it is attached to.
     */
    if (!SAFE.has(num)) {
      const who = [...movable].filter(([, nums]) => nums.includes(num))
        .map(([k]) => `${k} (${movable.get(k).join(' or ')})`);
      fails.push(`src/App.jsx:${i + 1} writes "Exercise ${num}" as a literal, and no`
        + ` exercise always has that number. ${who.length ? who.join(', ') : 'Nothing'}`
        + ' can wear it, and only in some packages. Positional numbering means a'
        + ' customer must never see a number for an exercise they did not buy:'
        + ' take it from ownedExercises(pkg).'
        + `\n      ${line.trim().slice(0, 130)}`);
      continue;
    }

    /**
     * And a SAFE number attached to the name of a movable exercise. 03 is right
     * for Relationship Reflection in every package and is also one of the three
     * numbers Conflict Patterns can wear, so the digits alone cannot tell them
     * apart. The label beside them can.
     */
    for (const [key, nums] of movable) {
      const label = EXERCISES.find((e) => e.key === key).label.toLowerCase();
      if (rest.includes(label) || rest.includes(key)) {
        fails.push(`src/App.jsx:${i + 1} writes "Exercise ${num}" beside ${label},`
          + ` which is ${nums.join(' or ')} depending on what the couple owns.`
          + ' The number happens to be one a different exercise always has, which'
          + ' is why it looks safe.'
          + `\n      ${line.trim().slice(0, 130)}`);
      }
    }
  }
});

/**
 * The website must actually read the function that knows.
 *
 * This is matched on the CALL, not the import, and deliberately: removing
 * ownedExercises from the import while leaving the call was planted and passed
 * here. It is caught by check-server-undefined, which resolves scopes with Babel
 * and named the line and the identifier, while `vite build` exited 0 because
 * esbuild treats an unresolved identifier as a global. Verified by planting it
 * and running both. Widening this gate to cover it would be a second copy of
 * that rule, and the weaker copy is the one that would drift.
 */
if (!/ownedExercises\s*\(/.test(src)) {
  fails.push('src/App.jsx never calls ownedExercises, so nothing in the website'
    + ' derives an exercise number from what the couple owns. Every number on'
    + ' screen is either typed in or counted a second time.');
}

if (fails.length) {
  console.error('\n check-exercise-numbers: a customer can be shown a number for an'
    + ' exercise they did not buy.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log('[check-exercise-numbers] '
  + `${[...stable].map(([k, n]) => `${k}=${n}`).join(' ')} are fixed by every package`
  + ` and may be typed; ${[...movable].map(([k, n]) => `${k}=${n.join('/')}`).join(' ')}`
  + ' move and are derived.');
