#!/usr/bin/env node
/**
 * An error drawn on a painted ground is readable on it.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * Ellie: "Hero 'Something went wrong' text on the learn page's blue bg should be
 * white not black."
 *
 * ScreenError set its title in the ink colour and its body in the muted one.
 * Both are right on cream and neither is readable on a painted ground. Learn is
 * painted edge to edge in the insight's blue, so the screen she was most likely
 * to see an error on was the one where the error could not be read.
 *
 * It had not been noticed because an error state is the one screen nobody looks
 * at on purpose. She met it because the tab took thirty seconds and failed.
 *
 * ── WHY IT IS A PROP AND NOT SOMETHING INFERRED ───────────────────────────
 * TabScreen already takes `groundTone` as a decision made per ground, and it is
 * the thing that knows. A second mechanism working it out independently is how
 * two answers to one question start disagreeing, which is what this whole
 * codebase is organised against. So the screen passes what it already declared.
 *
 * ── WHAT THIS CHECKS ──────────────────────────────────────────────────────
 * A file that declares a light tone on a painted ground and also draws a
 * ScreenError has to pass tone="light" to it. And the reverse: a file with no
 * painted ground must not, because white on cream is the same bug pointing the
 * other way and is just as invisible in a code review.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Contrast as a number. The grounds are gradients defined in the app's theme and
 * the text is white or a fixed alpha over them; check-ground-contrast measures
 * the results grounds, which is a different set. What is checked here is that
 * the component is told which world it is in, which is the thing that was wrong.
 *
 * ScreenLoading, which takes its own `onDark` and already had it. That is the
 * spinner, and it is why the spinner was visible for thirty seconds on a screen
 * whose error then was not.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx$/.test(p)) files.push(p);
  }
})(join(ROOT, 'attune-app/src'));

let drawn = 0;
let painted = 0;

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const rel = f.replace(ROOT, '');
  const uses = [...src.matchAll(/<ScreenError\b([\s\S]{0,260}?)\/>/g)];
  if (!uses.length) continue;
  drawn += 1;

  /** A ground painted edge to edge, declared light: white type belongs on it. */
  const lightGround = /groundColors=/.test(src) && /groundTone="light"/.test(src);
  if (lightGround) painted += 1;

  for (const u of uses) {
    const at = `${rel}:${src.slice(0, u.index).split('\n').length}`;
    const saysLight = /tone="light"/.test(u[1]);

    if (lightGround && !saysLight) {
      fails.push(`${at} draws an error on a ground this file paints and declares`
        + ' light, without telling it so. The title renders in the ink colour and'
        + ' the body in the muted one, and neither is readable on a painted ground.'
        + ' Pass tone="light".');
    }
    if (!lightGround && saysLight) {
      fails.push(`${at} draws an error in white on a screen with no painted ground,`
        + ' so it is white on cream. Same bug the other way round, and just as hard'
        + ' to see in a diff.');
    }
  }
}

if (!drawn) {
  console.error('[check-error-tone] no screen draws a ScreenError. Refusing to pass:'
    + ' a gate that has lost its subject must never report success.');
  process.exit(1);
}

/**
 * And the component has to honour it.
 *
 * Passing a prop nothing reads is the failure this would be easiest to introduce
 * while fixing the first one, and it looks correct at every call site.
 */
const comp = readFileSync(`${ROOT}attune-app/src/components/screen-states.tsx`, 'utf8');
if (!/tone = 'ink'/.test(comp) || !/tone === 'light'/.test(comp)) {
  fails.push('screen-states.tsx does not take a tone and decide from it, so every'
    + ' call site is passing something nothing reads.');
}
if (!/onLight \? Palette\.white/.test(comp)) {
  fails.push('ScreenError does not set its title in white when it is told it is on'
    + ' a light-toned ground, which is the whole of what the prop is for.');
}

if (fails.length) {
  console.error('\n check-error-tone: an error nobody can read.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`[check-error-tone] ${drawn} screens draw an error, ${painted} of them on`
  + ' a painted ground, and every one says which world it is in.');
