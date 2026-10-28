#!/usr/bin/env node
/**
 * Every slicer's list can be scrolled to its last option, and that option is
 * on screen when it gets there.
 *
 * ── THE BUG THIS ENCODES ──────────────────────────────────────────────────
 * Ellie: "I can't scroll down in the slicer dropdown to see the full list."
 *
 * The panel is absolutely positioned inside its tile, and a tile clips what
 * overflows it so its rounded corners stay clean. On a short tile the bottom
 * of the panel was painted nowhere. The list still scrolled and its last rows
 * were still in the DOM, so every slicer gate here passed: check-slicer-click
 * clicks the FIRST leaf, which is at the top, and a click dispatched from code
 * does not care whether the row is visible.
 *
 * ── WHAT IT DRIVES ────────────────────────────────────────────────────────
 * Every page in the admin's sidebar, in one browser. On each, every visible
 * slicer is opened, its first branch is opened (that is the long list), the
 * panel is scrolled to its end, and document.elementFromPoint is asked what
 * is under the middle of the last row. Anything other than the panel itself
 * is a failure. Planted by removing the rule that lets a tile un-clip while
 * its panel is open: 20 of 54 slicers failed.
 *
 * ── WHAT IT DOES NOT COVER ────────────────────────────────────────────────
 * List length. The stub data's lists are shorter than production's, so a
 * panel here is usually smaller than its 380 point ceiling. A short tile
 * still clips a short list, which is what the plant showed, so the rule is
 * tested; what is not tested is the exact height a real list reaches.
 */
import { execFileSync } from 'node:child_process';

let out = '';
try {
  out = execFileSync('node', ['scripts/probe-admin.mjs', 'overview'], {
    env: { ...process.env, OUT: '/dev/null', SDREACH: 'every' },
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 600000,
  });
} catch (e) {
  console.error('check-slicer-panel-reach FAILED: the admin probe did not run.');
  console.error(String(e.stderr || e.message).slice(0, 800));
  process.exit(1);
}

const m = /SDREACH: (\d+) of (\d+) slicers can show their last option\./.exec(out);
if (!m) {
  console.error('check-slicer-panel-reach FAILED: the probe printed no SDREACH summary, so nothing was measured.');
  process.exit(1);
}
const [ok, total] = [Number(m[1]), Number(m[2])];
/* A gate that lost its subject must never report success. There are over
   fifty visible slicers in the admin; a handful means the walk broke. */
if (total < 30) {
  console.error(`check-slicer-panel-reach FAILED: only ${total} slicers were found. The walk across pages has broken.`);
  process.exit(1);
}
if (ok !== total) {
  console.error(`check-slicer-panel-reach FAILED: ${total - ok} of ${total} slicers cannot show their last option.`);
  for (const line of out.split('\n').filter((l) => l.includes('"lastReachable":false'))) console.error('  ' + line.trim());
  process.exit(1);
}
console.log(`[check-slicer-panel-reach] ${total} slicers across every admin page, each opened, scrolled to the end, `
  + 'and its last option found on screen by elementFromPoint.');
