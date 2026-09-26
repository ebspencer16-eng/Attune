#!/usr/bin/env node
/**
 * A screen that saves as you go also saves on the way out.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * Every exercise in the app persists on advance. Close, the tab bar, a swipe
 * and a phone call are not advance. So whatever was on the question when
 * someone left was never written: no error, no warning, and the question blank
 * again next time.
 *
 * For the three tap-to-select exercises that is one selection. For Relationship
 * Reflection and Conflict Patterns, where an answer is a paragraph someone
 * types, it is the paragraph. The Shared Budget lost the last number typed into
 * it the same way, and that one was found first, which is how the shape became
 * visible.
 *
 * ── WHAT THIS CHECKS ──────────────────────────────────────────────────────
 * Every screen that writes a part-finished version of what someone is doing
 * calls useFlushOnUnmount, and passes `ready` so it cannot fire before the
 * screen has loaded what was already saved.
 *
 * And the hook reads its value through a ref. A cleanup that closes over the
 * value captures the empty form, and writes the empty form over real answers
 * while reporting success. That is worse than not having the hook, so it is
 * checked rather than trusted.
 *
 * ── HOW THE LIST IS DERIVED ───────────────────────────────────────────────
 * Not written here. The exercises come from api/_exercises.js, through the
 * dispatch in insights.tsx that picks a component for each, so a sixth exercise
 * is covered the day it gets a screen.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Screens that write only when someone presses Save: the journal entry sheet,
 * the annotation sheet, the profile editor, feedback, sign-in. Typing into one
 * of those and leaving without pressing Save is a decision, and writing it
 * anyway would be the opposite bug. The rule here is about screens that already
 * save without being asked.
 *
 * The Merging Lives checklist is also out, for a different reason: it writes
 * inside the same statement that changes the state, so there is never anything
 * held to lose.
 *
 * It does not prove the flush works at runtime. That needs a rendered tree, and
 * there is no renderer in this toolchain. What it proves is that the two ways
 * the hook fails silently are not present.
 */

import { readFileSync } from 'node:fs';
import { EXERCISES } from '../api/_exercises.js';

const ROOT = new URL('..', import.meta.url).pathname;
const HOOK = 'attune-app/src/hooks/use-flush-on-unmount.ts';
const fails = [];

/** The hook itself: a ref for the value, and a cleanup that never re-subscribes. */
const hook = readFileSync(`${ROOT}${HOOK}`, 'utf8');
if (!/const latest = useRef\(value\);\s*\n\s*latest\.current = value;/.test(hook)) {
  fails.push(`${HOOK} does not hold the value in a ref that is refreshed every`
    + ' render. A cleanup that closes over the value captures the empty form and'
    + ' writes it over real answers.');
}
/**
 * The cleanup itself, not the file.
 *
 * The first version of this asked whether the word `baseline` appeared anywhere
 * in the hook. It does: the ref is still declared. So deleting the guard FROM
 * THE CLEANUP left the gate green, which is the plant that mattered most. A
 * check on a rule has to look where the rule is enforced.
 */
const cleanup = hook.match(/useEffect\(\(\) => \(\) => \{([\s\S]*?)\}, \[\]\);/);
if (!cleanup) {
  fails.push(`${HOOK} has no unmount cleanup with an empty dependency array. With`
    + ' anything in the array the effect tears down and re-subscribes as the value'
    + ' changes, so the flush fires on every keystroke rather than on the way out.');
} else {
  const body = cleanup[1];
  if (!/baseline\.current === null/.test(body)) {
    fails.push(`${HOOK}'s cleanup does not refuse to write when there is no`
      + ' baseline. These screens mount empty and then fetch what was saved; a'
      + ' flush in that window posts {} and /api/save-exercise stores it over a'
      + ' partly answered exercise. Losing answers is what this hook is for.');
  }
  if (!/baseline\.current\)?\s*return|=== baseline\.current/.test(body)) {
    fails.push(`${HOOK}'s cleanup no longer compares the value against the`
      + ' baseline, so it writes on every unmount whether anything changed or not.');
  }
  /**
   * The value handed to the save, not merely the presence of the ref.
   *
   * `void fn.current(value)` passed an earlier version of this check, because
   * latest.current still appeared a line above it in the comparison. That is the
   * stale closure itself: the one bug this hook exists to prevent, in the one
   * place it matters, and tsc accepts it because `value` is in scope. So the
   * argument is matched, not the file and not the block.
   */
  if (!/fn\.current\(\s*latest\.current\s*\)/.test(body)) {
    fails.push(`${HOOK}'s cleanup does not hand latest.current to the save. It is`
      + ' writing something other than what is on the screen: a closure over the'
      + ' value captures whatever it was when the effect was created, which is the'
      + ' empty form, and writes that over real answers while reporting success.');
  }
  if (!/enabled\.current/.test(body)) {
    fails.push(`${HOOK}'s cleanup ignores \`when\`, so a finished exercise flushes`
      + ' a progress save after its completion save.');
  }
}
if (!/\bready\b/.test(hook)) {
  fails.push(`${HOOK} no longer takes a \`ready\` option, so no caller can tell it`
    + ' the saved answers have not arrived yet.');
}

/**
 * Which file draws each exercise, from the registry through the dispatch.
 *
 * Bounded the same way check-inapp-screens bounds it, because the dispatch
 * contains braces of its own.
 */
const insights = readFileSync(`${ROOT}attune-app/src/app/insights.tsx`, 'utf8');
const start = insights.indexOf('if (openExercise) {');
const end = insights.indexOf('\n  return (', start);
if (start < 0 || end < 0) {
  console.error('[check-unmount-flush] cannot find the exercise dispatch in'
    + ' insights.tsx. Refusing to pass: a gate that has lost its subject must'
    + ' never report success.');
  process.exit(1);
}
const dispatch = insights.slice(start, end);

/** Screens in scope: every in-app exercise, plus the budget, named with why. */
const inScope = [];
for (const e of EXERCISES) {
  if (!e.inApp) continue;
  const m = dispatch.match(new RegExp(`${e.key}\\s*:\\s*<(\\w+)`));
  if (!m) {
    fails.push(`api/_exercises.js says ${e.key} (${e.label}) is answerable in the`
      + ' app, and the dispatch in insights.tsx names no component for it, so'
      + ' this gate cannot tell whether its answers survive being closed.'
      + ' check-inapp-screens covers the same gap from the other side.');
    continue;
  }
  const imp = insights.match(new RegExp(`import ${m[1]} from '@/([^']+)'`));
  if (!imp) {
    fails.push(`insights.tsx draws ${e.key} with <${m[1]}> and imports no such`
      + ' component from @/.');
    continue;
  }
  inScope.push({ what: `${e.key} (${e.label})`, file: `attune-app/src/${imp[1]}.tsx` });
}
inScope.push({
  // Not derivable: there is no registry of tools. Named with its reason so
  // nobody reads this gate as covering every screen that writes.
  what: 'the Shared Budget, which saves on every blur',
  file: 'attune-app/src/components/budget.tsx',
});

if (inScope.length < EXERCISES.filter((e) => e.inApp).length + 1) {
  console.error('[check-unmount-flush] resolved fewer screens than there are'
    + ' in-app exercises; refusing to pass.');
  for (const f of fails) console.error(`  ✗ ${f}`);
  process.exit(1);
}

for (const { what, file } of inScope) {
  const src = readFileSync(`${ROOT}${file}`, 'utf8');
  const call = src.match(/useFlushOnUnmount\(([\s\S]{0,200}?)\);/);
  if (!call) {
    fails.push(`${file} draws ${what} and never calls useFlushOnUnmount, so`
      + ' whatever is on the screen when someone closes it is thrown away.'
      + ' There is no error and nothing to see: the value is simply back to what'
      + ' it was next time.');
    continue;
  }
  if (!/\bready\s*:/.test(call[1])) {
    fails.push(`${file} calls useFlushOnUnmount without \`ready\`, so a close`
      + ' before the saved answers arrive flushes the empty form over them.'
      + ` Pass ready: !loading.\n      ${call[0].replace(/\s+/g, ' ')}`);
  }
}

if (fails.length) {
  console.error('\n check-unmount-flush: a screen can throw away what is on it.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`[check-unmount-flush] ${inScope.length} screens that save as they go`
  + ' all flush on unmount, guarded on ready, and the hook reads its value from a ref.');
