#!/usr/bin/env node
/**
 * A tap a row took must not also turn the page.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie: "I tapped the right side of the top-level category row and it brought
 * me to the detailed page rather than showing the dropdown list."
 *
 * A results page turns forward on a tap in its right sixth, which is her own
 * rule from the storycards. On a 402 point phone that strip starts at 335, and
 * every full-width row inside the card runs to 378. So the right-hand end of
 * four different rows was both a control and a page turn, and the page turn
 * won.
 *
 * ── WHAT IS CHECKED, AND WHY IT IS RUN RATHER THAN READ ───────────────────
 * The rule is two functions and two call sites. A row claims the touch when
 * the finger lands, in onPressIn; the page's tap asks whether a row claimed
 * this one before it pages.
 *
 * The functions are lifted out of results.tsx and EXECUTED, because the four
 * things that matter about them are all behaviour:
 *
 *   1. No claim means no suppression, or the page stops turning at all.
 *   2. A claim is honoured by the read that follows it.
 *   3. A claim is CONSUMED, or one press suppresses every later tap.
 *   4. A claim expires, or a press whose tap never arrived suppresses the
 *      next one that does.
 *
 * Three and four are the half a structural check cannot see. The first
 * attempt at this rule stored each row's rectangle instead, and passed every
 * reading, and was wrong the moment the page was scrolled: onLayout does not
 * fire on scroll, so the rectangles described where the rows used to be.
 * Nothing about the SHAPE of that code was wrong. It is in here as a sweep
 * over time rather than a sweep over position for that reason.
 *
 * Then the two wirings, which are structural and have to be:
 *
 *   5. RowTap's Pressable passes the claim to onPressIn. Not onPress, which
 *      is the release: by then the page has already decided.
 *   6. The page's handler asks before it computes an edge, not after.
 *   7. And the answer is the whole of the guard, so that disabling it takes
 *      a deletion rather than an `&& false`.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * A new row built from a bare Pressable rather than from RowTap. There are
 * fifteen Pressables in that file and most of them are nav and menu controls
 * outside the card, where no edge tap reaches, so a rule forbidding them would
 * be a rule that gets loosened until it matches nothing. If you add a row
 * INSIDE a results page, use RowTap.
 *
 * It does not check that the page turns. check-results-coverage drives the
 * sections; the edge tap itself was verified on a simulator, in both
 * directions, at the four rows and at a point with no row under it.
 */

import { readFileSync } from 'node:fs';
import { transform } from 'esbuild';

const ROOT = new URL('..', import.meta.url).pathname;
const FILE = `${ROOT}attune-app/src/components/results.tsx`;
const src = readFileSync(FILE, 'utf8');

/** Everything from a declaration to the close of its first brace block. */
function lift(needle) {
  const at = src.indexOf(needle);
  if (at < 0) throw new Error(`cannot find \`${needle}\` in results.tsx`);
  let depth = 0, seen = false;
  for (let i = at; i < src.length; i++) {
    if (src[i] === '{') { depth++; seen = true; }
    else if (src[i] === '}') { depth--; if (seen && depth === 0) return src.slice(at, i + 1); }
  }
  throw new Error(`cannot find the end of \`${needle}\` in results.tsx`);
}

/**
 * The two functions, made callable, with a clock this can move.
 *
 * `Date` is shadowed inside the function body rather than stubbed globally, so
 * the rest of this process keeps the real one.
 */
async function claimPair() {
  const body = `${lift('function claimTouchForARow()')}\n${lift('export function aRowTookThePress()')}`;
  const { code } = await transform(body.replace(/^export /gm, ''), { loader: 'ts' });
  const make = new Function('Date', `let rowPressAt = 0;\n${code};\nreturn { claimTouchForARow, aRowTookThePress };`);
  let now = 1_000_000;
  const pair = make({ now: () => now });
  return { ...pair, tick: (ms) => { now += ms; } };
}

const { claimTouchForARow, aRowTookThePress, tick } = await claimPair();
const fails = [];

// 1. Nothing pending. The page has to turn.
if (aRowTookThePress()) fails.push('A tap with no row press before it reads as claimed, so the page would never turn.');

// 2. A claim is honoured.
claimTouchForARow();
tick(80); // a tap, which this page caps at 300ms
if (!aRowTookThePress()) fails.push('A row claimed the touch and the page did not see it, which is the bug itself.');

// 3. And consumed. The next tap is the page's.
if (aRowTookThePress()) fails.push('A claim survives the read that consumes it, so one row press would suppress every later tap.');

// 4. And expires.
claimTouchForARow();
tick(1500);
if (aRowTookThePress()) fails.push('A claim 1500ms old is still honoured, so a press whose tap never arrived eats the next one.');

// A second expiry case, either side of the line rather than a round sweep.
claimTouchForARow();
tick(399);
if (!aRowTookThePress()) fails.push('A claim 399ms old is ignored, which is inside the window the code states.');
claimTouchForARow();
tick(401);
if (aRowTookThePress()) fails.push('A claim 401ms old is honoured, which is outside the window the code states.');

/**
 * A declaration up to the next one at the top level.
 *
 * `lift` walks brace depth, which stops at the first block it meets: for a
 * component whose parameters are destructured that block is the parameter
 * object, not the body. CLAUDE.md says the same thing about removing a
 * function by brace depth, and it is true of reading one.
 */
function sliceToNextTopLevel(needle) {
  const at = src.indexOf(needle);
  if (at < 0) throw new Error(`cannot find \`${needle}\` in results.tsx`);
  const rest = src.slice(at + needle.length);
  const next = rest.search(/\n(?:export )?(?:function |const |\/\*\*)/);
  return rest.slice(0, next < 0 ? undefined : next);
}

// 5. RowTap claims on press-in, not on press.
const rowTap = sliceToNextTopLevel('function RowTap({');
if (!/onPressIn=\{claimTouchForARow\}/.test(rowTap)) {
  fails.push('RowTap does not pass claimTouchForARow to onPressIn, so a row no longer claims its touch.');
}

// 6. The page asks before it works out an edge.
const maybe = lift('const maybePage = useCallback(');
const asked = maybe.indexOf('aRowTookThePress()');
const edge = maybe.indexOf('screenW / 6');
if (asked < 0) fails.push('The page handler does not call aRowTookThePress(), so every row end turns the page again.');
else if (edge >= 0 && asked > edge) fails.push('The page works out its edge before asking whether a row took the touch.');
/* And it is the whole of the guard. `if (false && aRowTookThePress())` leaves
   the name, the order and every identifier exactly where they were, which is
   the way a gate gets defeated without anything being deleted. */
else if (!/if\s*\(aRowTookThePress\(\)\)\s*return;/.test(maybe)) {
  fails.push('The claim is not the whole of an early return, so something else decides whether it counts.');
}

if (fails.length) {
  console.error('check-row-tap-claim: FAIL');
  for (const f of fails) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('check-row-tap-claim: ok. 7 properties, four of them run rather than read.');
