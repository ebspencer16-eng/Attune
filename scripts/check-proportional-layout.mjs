#!/usr/bin/env node
/**
 * The app's home screen is composed as fractions of the screen, not as points.
 *
 * ── THE BUG IT CAME FROM, FOUR TIMES ──────────────────────────────────────
 * Ellie, about the home screen: "my cell view has way more blue at the bottom
 * than the simulator. Please adjust every page, view, etc. on the app so that
 * dimensions are the same on every phone screen." Then "I thought we fixed
 * this?", then "Still not consistent", then "Done, but still seeing the spacing
 * issue on my cell."
 *
 * Three fixes before the fourth, and each moved where the spare height
 * collected: after the last child, then above the panel, then inside it. None
 * made the composition scale, and none could, because the top of the page was a
 * stack of fixed point heights and the screen is not. The greeting and the
 * quick links come to the same number of points on every phone, so they take a
 * different fraction of each, and everything below starts somewhere different.
 *
 * What was missing was never a better fix. It was a measurement.
 *
 * ── THE FOURTH FIX WAS WRONG AND THIS GATE HELD IT IN PLACE ──────────────
 * The fourth fix gave the reading block above the tile a minimum height of 42
 * per cent of the screen, and the first version of this gate asserted exactly
 * that: that the fraction is derived from the window and that it is used. Both
 * were true. Ellie sent a screenshot of the result: half the screen empty above
 * the greeting and the two cards pushed off the bottom behind the tab bar.
 *
 * The 42 per cent was reasoned about a block holding the greeting and the four
 * quick links. The quick links had already moved inside the tile. So the rule
 * sized one line of text at nearly half a phone, and this gate reported the
 * screen correctly composed on every run, because it was checking that a
 * particular fix was present rather than that the screen scales.
 *
 * A gate that names the fix cannot tell you the fix is wrong. So it checks the
 * property instead.
 *
 * ── WHAT THIS CHECKS ──────────────────────────────────────────────────────
 * That the spare height on the home screen ends up inside the tile.
 *
 * The scroll view's content container is `flexGrow: 1`, so on a phone taller
 * than the content there is height nobody has claimed. Whoever claims it
 * decides what Ellie sees: the tile claims it and a taller phone gets a taller
 * cream tile, or nothing claims it and the slack collects after the last child
 * as a band of the page's blue, which is what she reported four times in her
 * own words ("my cell view has way more blue at the bottom than the
 * simulator").
 *
 * So: the tile grows, and nothing above the tile claims a share of the screen.
 * The second half is the part that would have caught the fourth fix. A fraction
 * of the screen is the right shape for a block whose content scales with it and
 * the wrong shape for a fixed stack, and above the tile there is one line of
 * text.
 *
 * ── WHY IT IS NARROW ──────────────────────────────────────────────────────
 * The app cannot be rendered here: its dashboard needs a signed-in account and
 * driving a simulator through a real sign-in is not something this can do.
 * Saying so is the point. "Every page checked on two phone sizes" would be the
 * sentence nobody re-examines and it would not be true.
 *
 * ── THE WEBSITE HALF WAS BUILT, RUN, AND REMOVED ──────────────────────────
 * It rendered the dashboard at 1800 and 900 pixels tall and compared each
 * block's top edge as a fraction of the viewport. It failed immediately, and
 * the numbers were the lesson: every block was exactly twice as far down the
 * short viewport, because 1800/900 is two and the offsets are fixed pixels.
 *
 * That is not a bug on a page that scrolls. A desktop window showing less
 * before you scroll is a window, not a broken composition, and a gate insisting
 * otherwise would have pushed the website toward a design nobody asked for.
 * The proportional rule belongs to a phone, where the screen is the whole frame
 * and nothing below the fold exists.
 *
 * What the website owes the app is the same blocks in the same order, and
 * check-section-blocks already holds that, including `app-home` since the site
 * grew one.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Width. Phone widths vary far less and nothing has been reported.
 *
 * Whether the proportions are nice. They are Ellie's to look at. This only says
 * the screen is built out of them.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const BASE = process.env.BASE || 'http://localhost:4173';
const fails = [];

/**
 * One `style={{ ... }}` object, whole, by brace depth.
 *
 * Reading to a known property instead gets whatever happens to be written above
 * it, which is how the check for the tile's rounded feet failed on a tile that
 * has them: they are declared two lines below the margin this anchors on.
 */
function styleObject(src, start) {
  const from = src.indexOf('{{', start);
  if (from === -1) return '';
  let depth = 0;
  for (let i = from; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(from, i + 1);
    }
  }
  return '';
}

// ── The spare height belongs to the tile ────────────────────────────────────
{
  const home = readFileSync(`${ROOT}attune-app/src/app/index.tsx`, 'utf8');
  /* Comments quote Ellie on exactly these properties, so a check reading them
     would find its own subject in the prose describing it. */
  const code = home.replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

  /**
   * The tile is the block that ends above the tab bar.
   *
   * Found by `marginBottom: BottomTabInset`, which is unique in the file and is
   * the thing that makes it the tile. The first version anchored on
   * `borderBottomLeftRadius: TILE_RADIUS` and there are four of those: the
   * tile, its cream fill, its blue layer and its shadow panel. A plant that
   * renamed the tile's feet sent `indexOf` to the cream fill instead, which has
   * no flexGrow, and the gate failed with the wrong reason. It happened to fail
   * rather than pass, which is luck: the same redirection with a block that
   * does carry flexGrow would have been a clean pass on a broken screen.
   *
   * So the anchor is required to be unique. An ambiguous subject is reported as
   * one rather than resolved by picking the first.
   */
  const ANCHOR = 'marginBottom: BottomTabInset';
  const hits = code.split(ANCHOR).length - 1;
  const at = code.indexOf(ANCHOR);
  if (hits !== 1) {
    fails.push(`attune-app/src/app/index.tsx has ${hits} blocks with \`${ANCHOR}\`, and`
      + ' the tile is the one that ends above the tab bar. Exactly one is the tile and'
      + ' which one cannot be guessed. Refusing to pass: a gate that has lost its'
      + ' subject must never report success.');
  } else {
    /* The style object the margin sits in, taken back to the start of the
       object literal. `flexGrow` has to be in THAT object, not merely somewhere
       in the file: the scroll view's content container has one too, and
       matching the file would pass on the content container's while the tile
       had none. */
    const open = code.lastIndexOf('style={{', at);
    /* To the END of the object, by brace depth, not to the anchor. Slicing
       `open` to `at` read only the properties above the margin, and the rounded
       feet are written below it, so the check for them failed on a tile that
       has them. */
    const block = open === -1 ? '' : styleObject(code, open);
    /* The feet are checked here rather than used as the anchor: they are what
       makes the tile end rather than run under the tab bar, and Ellie asked for
       them by name ("I want that rounded bottom"). */
    if (!/borderBottomLeftRadius: TILE_RADIUS/.test(block)) {
      fails.push('the home screen\'s tile has lost its rounded bottom corners.'
        + ' Ellie asked for them by name, and without them the tile runs squarely'
        + ' into the tab bar.');
    }
    if (!/flexGrow:\s*1/.test(block)) {
      fails.push('the home screen\'s tile does not claim the spare height'
        + ' (`flexGrow: 1` is not in its style). Nothing else claims it, so on a phone'
        + ' taller than the content it collects under the tile as a band of the page\'s'
        + ' blue. That is the bug Ellie reported four times.');
    }
    if (/flex:\s*1/.test(block)) {
      fails.push('the home screen\'s tile uses `flex: 1`, which also sets flexShrink,'
        + ' so a short phone squeezes the tile rather than the reading above it.'
        + ' `flexGrow: 1` is the one that only grows.');
    }
  }

  /**
   * Nothing above the tile claims a fraction of the screen.
   *
   * This is the half that would have caught the fourth fix. A block sized as a
   * share of the phone has to hold content that scales with the phone, and
   * above the tile there is a greeting. 42 per cent of the screen went to one
   * line of text and pushed the cards off the bottom.
   */
  const fraction = /(?:minHeight|maxHeight|height):\s*(?:Math\.(?:round|floor|ceil)\()?\s*(?:screenHeight|windowHeight|SCREEN_HEIGHT|winHeight)\s*\*/
    .exec(code);
  if (fraction) {
    fails.push('the home screen sizes a block as a fraction of the screen:'
      + ` \`${fraction[0].trim()}...\`. The tile's flexGrow is what makes this screen`
      + ' scale. A share of the phone above it reserves that share whatever is in it,'
      + ' which put half a screen above the greeting and the two cards behind the tab'
      + ' bar.');
  }

  /* And the scroll view still hands out spare height for the tile to claim. */
  if (!/contentContainerStyle=\{\{[\s\S]{0,160}?flexGrow:\s*1/.test(code)) {
    fails.push('the home scroll view\'s content container is no longer `flexGrow: 1`,'
      + ' so the tile has no spare height to grow into and the page stops filling'
      + ' short screens.');
  }
}

if (fails.length) {
  console.error('\n check-proportional-layout: a screen is composed differently at two'
    + ' sizes.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log("[check-proportional-layout] the home screen's spare height is claimed by the"
  + ' tile, and nothing above the tile claims a share of the phone, so a taller screen'
  + ' gets a taller cream tile rather than a band of blue under it.');
