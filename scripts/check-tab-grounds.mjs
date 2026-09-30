#!/usr/bin/env node
/**
 * The colour a tab is painted in is one colour, not two hexes.
 *
 * ── WHY THERE ARE TWO COPIES ──────────────────────────────────────────────
 * Ellie: "I want the site to use some of the design elements we've built for
 * the app (section 2 on site should look like the insights menu, section 3 on
 * dashboard should look like learn page but also link to notes)."
 *
 * The grounds were constants in attune-app/src/constants/attune-theme.ts, which
 * was right while they belonged to four screens of an app. Now the website
 * paints two of them, and an Expo project cannot import from api/, so the hexes
 * exist in both places. That is the wall every gate in this directory is about.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * The three grounds the two surfaces share, compared as colours rather than as
 * source: Home's blue, Insights' orange, and Learn, which is Home's blue lifted
 * a fifth toward white.
 *
 * Learn is the one worth having a check for. It is not a literal in either
 * place: both sides compute it from the blue with the same `lighten`, written
 * out twice, and two implementations of a colour function agreeing today is not
 * the same as them agreeing after someone tidies one. Comparing the answers
 * means neither side has to keep the other's arithmetic, only its result.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the colours are right. That is Ellie's eye and it is in TASKS.md for
 * her, which is where this pass should have gone in the first place rather than
 * into section 4 as done.
 *
 * Where each ground is used. The app paints whole tabs and the website paints
 * two blocks of a dashboard, which is the point rather than a divergence: she
 * asked for the sections to look like the tabs, not to become them.
 *
 * The results-section grounds, which are already shared properly through
 * SECTION_GROUNDS in the same module and need no mirror.
 */

import { readFileSync } from 'node:fs';

import { TAB_GROUNDS } from '../api/_lib/section-grounds.js';

const ROOT = new URL('..', import.meta.url).pathname;
const theme = readFileSync(`${ROOT}attune-app/src/constants/attune-theme.ts`, 'utf8');

const fails = [];

/** The app's own lighten, lifted so the comparison is of answers, not of code. */
function appLighten(hex, t) {
  const m = theme.match(/const lighten = \(hex: string, t: number\) => \{([\s\S]*?)\n\};/);
  if (!m) {
    fails.push("attune-theme.ts no longer declares `lighten`. Learn's ground is computed"
      + ' from Home\'s with it, so this check cannot compare the two sides any more.'
      + ' Refusing to guess: a gate that has lost its subject must never report success.');
    return null;
  }
  /* Evaluated rather than reimplemented. Reimplementing it here would be a
     third copy of the arithmetic, which is the thing under test. */
  // eslint-disable-next-line no-new-func
  const fn = new Function('hex', 't', m[1].replace(/: \w+/g, '') + '\n');
  return fn(hex, t);
}

/** A hex literal array from the theme, e.g. BlueGround. */
function pair(name) {
  const m = theme.match(new RegExp(`export const ${name} = \\['(#[0-9a-fA-F]{6})', '(#[0-9a-fA-F]{6})'\\]`));
  if (!m) return null;
  return [m[1], m[2]];
}

const same = (a, b) => a.length === b.length
  && a.every((x, i) => String(x).toLowerCase() === String(b[i]).toLowerCase());

const blue = pair('BlueGround');
const orange = pair('OrangeGround');

if (!blue) fails.push('attune-theme.ts has no BlueGround with two hex stops.');
if (!orange) fails.push('attune-theme.ts has no OrangeGround with two hex stops.');

if (blue && !same(blue, TAB_GROUNDS.home)) {
  fails.push(`Home's ground is ${JSON.stringify(blue)} in the app and`
    + ` ${JSON.stringify(TAB_GROUNDS.home)} on the server.`);
}
if (orange && !same(orange, TAB_GROUNDS.insights)) {
  fails.push(`Insights' ground is ${JSON.stringify(orange)} in the app and`
    + ` ${JSON.stringify(TAB_GROUNDS.insights)} on the server, and the website now paints`
    + " the dashboard's exercise section in it.");
}

/**
 * Learn, which neither side writes out. The app's line is
 * `[lighten(BlueGround[0], 0.2), lighten(BlueGround[1], 0.2)]`, so the factor is
 * read from the source rather than assumed: a change from 0.2 to 0.25 in the app
 * is exactly the drift this exists to catch, and hardcoding 0.2 here would miss
 * it by agreeing with the wrong side.
 */
if (blue) {
  const m = theme.match(/export const LearnGround = \[lighten\(BlueGround\[0\], ([\d.]+)\), lighten\(BlueGround\[1\], ([\d.]+)\)\]/);
  if (!m) {
    fails.push("attune-theme.ts no longer builds LearnGround by lightening BlueGround."
      + ' Either it is a literal now, in which case compare it directly, or the name'
      + ' changed. Refusing to pass on a shape this does not recognise.');
  } else if (m[1] !== m[2]) {
    fails.push(`the app lightens Learn's two stops by different amounts (${m[1]} and`
      + ` ${m[2]}), which the server's single factor cannot express.`);
  } else {
    const want = [appLighten(blue[0], Number(m[1])), appLighten(blue[1], Number(m[2]))];
    if (want[0] && !same(want, TAB_GROUNDS.learn)) {
      fails.push(`Learn's ground comes out ${JSON.stringify(want)} in the app and`
        + ` ${JSON.stringify(TAB_GROUNDS.learn)} on the server. Both compute it from the`
        + " blue with their own copy of `lighten`, so this is the two copies disagreeing"
        + ' rather than a hex being retyped.');
    }
  }
}

if (fails.length) {
  console.error('\n check-tab-grounds: a tab is two colours depending on which surface you'
    + ' are on.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  console.error('  api/_lib/section-grounds.js is the one the website reads and'
    + ' attune-theme.ts is\n  the one the app reads. They cannot import each other, so they'
    + ' have to be held\n  equal here.\n');
  process.exit(1);
}

console.log('[check-tab-grounds] 3 grounds, identical on both surfaces: Home\'s blue,'
  + " Insights' orange, and Learn, which both sides compute from the blue rather than"
  + ' writing it down.');
