#!/usr/bin/env node
/**
 * A screen says where its spare height goes.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * Ellie: "my cell view has way more blue at the bottom than the simulator.
 * Please adjust every page, view, etc. on the app so that dimensions are the
 * same on every phone screen."
 *
 * The home screen's ground is a gradient with proportional stops, so the colour
 * was right on any phone and always had been. What was not proportional was the
 * layout on top of it. The scroll content was `flexGrow: 1` and no child claimed
 * the extra height, so all of it collected after the last child, and the band of
 * blue under the tile grew with the screen. A taller phone, a bigger gap, and
 * nothing in the code looked wrong.
 *
 * The file even carried the fix as a comment: a `topHeight` derived from the
 * screen height, described as putting the tile just above the tab bar. It was
 * computed and never used by anything. The design was written down and not in
 * force, which is the quietest way for a layout rule to be absent.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * `flexGrow: 1` on a scroll container means "this content is at least a screen
 * tall". It does not say what to do with the difference when the content is
 * shorter than the screen, and the default is to leave it at the end. That is
 * fine when the end is where you want it and it is a bug the rest of the time,
 * and the difference is exactly what changes between phones.
 *
 * So a container that grows has to say: `justifyContent` on the container, or a
 * child taking the slack with `marginTop: 'auto'` or `flex: 1`. Any of the three
 * is an answer. None of them is the shape that produced this.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Fixed element sizes. A 132 point card is 132 points on every phone and that is
 * consistency, not a failure of it. This is about how a screen divides the space
 * it did not fill, which is the only thing that varies with the device.
 *
 * Whether the answer chosen is the right one. Centring, pinning to the bottom
 * and spreading are all legitimate and the choice is Ellie's to look at. What is
 * checked is that a choice was made.
 *
 * Horizontal layout. Phone widths vary far less and nothing has been reported.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
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

let containers = 0;

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const rel = f.replace(ROOT, '');

  for (const m of src.matchAll(/contentContainerStyle=\{\{([\s\S]{0,400}?)\}\}/g)) {
    const style = m[1];
    if (!/flexGrow:\s*1/.test(style)) continue;
    containers += 1;
    const line = src.slice(0, m.index).split('\n').length;

    /** Said on the container itself. */
    if (/justifyContent:/.test(style)) continue;

    /**
     * Or by a child.
     *
     * Bounded by the next scroll container rather than by a character count. The
     * first version used four thousand characters and did not reach the home
     * screen's own answer, which sits about ninety lines below its container, so
     * the gate failed on the file it had just been used to fix. Widening it to the
     * end of the file was worse: it then found a `flex: 1` belonging to something
     * else entirely and passed the bug. The bound is this scroll view's own
     * closing tag, which is the only honest one.
     */
    const from = m.index + m[0].length;
    const close = src.indexOf('</ScrollView>', from);
    const next = src.indexOf('contentContainerStyle={{', from);
    const ends = [close, next].filter((x) => x !== -1);
    /**
     * Comments stripped first.
     *
     * The home screen's own answer is explained in a comment directly above
     * itself, and that comment contains the words `marginTop: 'auto'`. So the
     * first version of this passed a plant that removed the rule and left the
     * explanation, which is the worst possible false pass: the code says one
     * thing, the prose beside it says another, and the gate reads the prose.
     */
    const raw = src.slice(from, ends.length ? Math.min(...ends) : src.length);
    const body = raw
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
    if (/marginTop:\s*'auto'/.test(body) || /\bflex:\s*1\b/.test(body)) continue;

    fails.push(`${rel}:${line} grows its content to fill the screen and never says`
      + ' where the spare height goes, so all of it collects after the last child'
      + ' and the gap at the bottom grows with the phone. That is what Ellie saw as'
      + ' "way more blue at the bottom than the simulator". Say it: justifyContent'
      + " on the container, or marginTop: 'auto' or flex: 1 on the child that should"
      + ' take the slack.');
  }
}

if (!containers) {
  console.error('[check-screen-slack] found no growing scroll containers in the app.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

if (fails.length) {
  console.error('\n check-screen-slack: a screen looks different on a taller phone.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`[check-screen-slack] ${containers} screens grow to fill the phone, and`
  + ' every one says where the space it did not use should go.');
