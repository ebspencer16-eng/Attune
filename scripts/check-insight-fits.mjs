#!/usr/bin/env node
/**
 * Every insight fits the room above the In Practice peek.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie: "Today the insight of the day quote is so long that, in the simulator,
 * it pushes the in practice tile down so I can't see the full thing. It looks
 * better on my longer iphone but still cuts off a little. Please figure out the
 * placement of the in practice peek, then work backwards to figure out the max
 * height of the insight of the day, and make sure all quotes we use will fit in
 * that space... One problem is that I LOVE today's quote and want to be able to
 * keep it!!"
 *
 * That is the order of operations and the screen now follows it: the peek is
 * pinned a measured distance off the bottom of the page, the insight gets what
 * is left, and the quotation is set at whatever size reaches that number of
 * lines. Nothing is ever cut; a long quotation is smaller type.
 *
 * ── WHY A CHECK AND NOT A LOOK ────────────────────────────────────────────
 * Because "all quotes we use" is forty-nine of them, on phones of different
 * heights, and the one she loves is the second longest. Looking at one on one
 * simulator is how this shipped broken. This runs the screen's own arithmetic
 * over every insight at the smallest screen the app supports.
 *
 * ── IT RUNS THE CODE THAT SHIPS ───────────────────────────────────────────
 * It imports quoteFit from attune-app/src/lib/insight-fit.ts and runs that, so
 * there is one copy of the arithmetic and this is it. The first version lifted
 * four constants out of resources.tsx and re-ran the formula itself, which is
 * the mistake check-card-type-clipping was written to stop making: a gate
 * comparing itself to a copy of the rule the app does not run. That copy had
 * already started to matter, because the rule changed when the citation learned
 * to shrink with the quote.
 *
 * What stays here is the room, because the room is measured from a screenshot
 * of a real phone and that measurement is this file's own.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the type is pleasant at the smallest size. That is hers to look at,
 * and the floor is there so the answer is never "unreadably small": a quotation
 * that cannot fit nine lines at the minimum is one to query rather than shrink.
 */

import { readFileSync } from 'node:fs';
import { transform } from 'esbuild';

import { INSIGHTS } from '../api/_insights.js';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = 'attune-app/src/app/resources.tsx';
const src = readFileSync(`${ROOT}${SRC}`, 'utf8');

const fails = [];

/**
 * The screen's own answer, imported rather than rewritten.
 *
 * A .ts file in an Expo project is not importable from a plain .mjs, so its
 * types are stripped by esbuild and the module is evaluated here. It imports
 * nothing of its own, which is why this works and is a good reason to keep it
 * that way.
 */
const FIT = await (async () => {
  const src = readFileSync(`${ROOT}attune-app/src/lib/insight-fit.ts`, 'utf8');
  const { code } = await transform(src, { loader: 'ts', format: 'cjs' });
  const mod = { exports: {} };
  new Function('module', 'exports', code)(mod, mod.exports);
  return mod.exports;
})();

const { quoteFit, citeHeight, citeSize, QUOTE_BASE, QUOTE_LEADING, QUOTE_FLOOR, CHAR_RATIO } = FIT;

if (!QUOTE_BASE || !QUOTE_LEADING || !QUOTE_FLOOR || !CHAR_RATIO || typeof quoteFit !== 'function') {
  console.error('[check-insight-fits] attune-app/src/lib/insight-fit.ts did not give up the'
    + ` arithmetic: base=${QUOTE_BASE} leading=${QUOTE_LEADING} floor=${QUOTE_FLOOR}`
    + ` charRatio=${CHAR_RATIO} quoteFit=${typeof quoteFit}.`
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

/**
 * The fixed half of the furniture, lifted from the screen.
 *
 * This genuinely does live in resources.tsx: it is a sum of that screen's own
 * spacing scale, and moving it into the lib would mean the lib importing the
 * theme, which is what stops the lib being importable here at all.
 */
const FURNITURE = (() => {
  const m = /const INSIGHT_FURNITURE = ([\s\S]*?);\n/.exec(src);
  if (!m) return null;
  const sp = { xl: 24, lg: 16, md: 12, sm: 8, xs: 4 };
  return m[1].replace(/\/\/[^\n]*/g, '').split('+').reduce((acc, term) => {
    const t = term.trim();
    const mul = /^Spacing\.(\w+) \* (\d+)$/.exec(t);
    if (mul) return acc + sp[mul[1]] * Number(mul[2]);
    const one = /^Spacing\.(\w+)$/.exec(t);
    if (one) return acc + sp[one[1]];
    const n = Number(t);
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
})();

if (!FURNITURE) {
  console.error(`[check-insight-fits] INSIGHT_FURNITURE is not where this expects it in ${SRC}.`
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

/**
 * The screen this was measured on, in points.
 *
 * ── WHY MEASURED AND NOT CHOSEN ───────────────────────────────────────────
 * My first version invented a pessimistic 520pt screen and the arithmetic came
 * out at MINUS six lines of room, which says nothing about the layout and
 * everything about the numbers. CLAUDE.md: state the method next to the number.
 *
 * These come off a screenshot of the running app on an iPhone 17 Pro: 1206x2622
 * pixels at 3x is 402 by 874 points, the tools row measures 117 points tall, and
 * the scrolling area between the top of that row and the tab bar is 630.
 *
 * ── WHAT THAT MEANS THIS CHECKS ───────────────────────────────────────────
 * This device, and anything taller. A shorter phone has less room and this does
 * not speak for it, which is why the report prints the shortest screen each
 * insight would fit on: the number is visible rather than assumed. Ellie reads
 * on a long iPhone and the simulator here is a 17 Pro, so those are the two I
 * can say anything about.
 */
const SCREEN = { scrollH: 690, insightW: 354, tilesH: 117, headH: 109 };
const PEEK = SCREEN.headH + 4 + 12 + 108;      // grab line, gap, BottomTabInset + xl
/* TabTopInset, which the screen subtracts because the tools row starts that far
   down inside the scroll view. 60, from the theme. */
const roomFor = (scrollH) => scrollH - PEEK - SCREEN.tilesH - 60 - FURNITURE;
const room = roomFor(SCREEN.scrollH);

/**
 * Did it fit, or was it taken to the floor?
 *
 * quoteFit never fails: the floor is the floor and adjustsFontSizeToFit takes
 * the rest. So "it did not fit" is the floor's own answer not holding the text,
 * which is the thing that would be visibly cut.
 */
function fitFor(text, r = room) {
  const f = quoteFit({ text, room: r, width: SCREEN.insightW });
  const perLine = Math.max(12, Math.floor(SCREEN.insightW / (f.size * CHAR_RATIO)));
  const need = Math.ceil(text.length / perLine);
  return need <= f.lines ? f : null;
}

let worst = null;
const cited = [];
const over = [];
let smallest = QUOTE_BASE;
for (const insight of INSIGHTS) {
  const text = insight?.body || '';
  if (!text) continue;
  const fit = fitFor(text);
  if (!fit) {
    const leading = Math.round(QUOTE_FLOOR * QUOTE_LEADING);
    const lines = Math.floor((room - citeHeight(QUOTE_FLOOR)) / leading);
    const perLine = Math.max(12, Math.floor(SCREEN.insightW / (QUOTE_FLOOR * CHAR_RATIO)));
    const need = Math.ceil(text.length / perLine);
    if (!worst || need > worst.need) worst = { text, need, lines, id: insight.id || '(no id)' };
    continue;
  }
  if (fit.size < smallest) smallest = fit.size;
  /**
   * ── AND THE CITATION IS ALWAYS THE SMALLER OF THE TWO ───────────────────
   * Ellie: "yesterday's quote looked odd since it was not larger than the
   * citation text."
   *
   * It was not: the quotation shrank to 13 and the citation stayed at the
   * screen's fixed 13, so the attribution was set as large as the words it
   * attributes. Fitting alone cannot see that, because both sizes fit.
   */
  /**
   * ── AND THE BLOCK IT ASKS FOR IS THE BLOCK IT HAS ───────────────────────
   * Fitting is only half of it. A fit that hands out more lines than the room
   * holds still "fits" by its own arithmetic and pushes the peek down anyway,
   * which is the bug Ellie reported in the first place. Planting that is what
   * found this missing: taking the citation out of the budget made every
   * quotation fit more easily and the check said nothing.
   *
   * So: the lines it gave out, plus the citation it chose, against the room.
   */
  const asked = fit.lines * Math.round(fit.size * QUOTE_LEADING) + citeHeight(fit.size);
  if (asked > room) {
    over.push(`"${insight.id || '(no id)'}" is given ${fit.lines} lines at ${fit.size}pt and a`
      + ` ${fit.cite}pt citation, which is ${asked}pt of a ${room}pt budget.`);
  }
  if (fit.cite >= fit.size) {
    cited.push(`"${insight.id || '(no id)'}" sets its quotation at ${fit.size}pt and its citation`
      + ` at ${fit.cite}pt, so the attribution is not smaller than the words.`);
  }
}

if (worst) {
  fails.push(`on the ${SCREEN.scrollH}pt screen this was measured on, "${worst.id}" needs`
    + ` ${worst.need} lines at the ${QUOTE_FLOOR}pt floor and the room holds ${worst.lines}:\n`
    + `      "${worst.text.slice(0, 90)}…"\n`
    + '      It would be cut rather than shrunk. Either the peek gives up some room, the floor\n'
    + '      goes lower, or that quotation is too long and is one to query.');
}

if (over.length) {
  fails.push(`${over.length} insight${over.length === 1 ? '' : 's'} are given more room than the`
    + ` insight block has, which is what pushes the peek off the bottom of the page:\n      `
    + over.slice(0, 3).join('\n      '));
}

if (cited.length) {
  fails.push(`${cited.length} insight${cited.length === 1 ? '' : 's'} set the citation as large as`
    + ` the quotation:\n      ${cited.slice(0, 3).join('\n      ')}`);
}

if (fails.length) {
  console.error('\n check-insight-fits: an insight will not fit above the In Practice peek.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

/**
 * And how much room the longest one leaves, so a shorter phone is a number
 * rather than a shrug.
 */
const longest = INSIGHTS.reduce((a, b) => ((b?.body || '').length > (a?.body || '').length ? b : a));
const tightest = (() => {
  const text = longest?.body || '';
  for (let h = 300; h <= SCREEN.scrollH; h += 5) {
    if (fitFor(text, roomFor(h))) return h;
  }
  return null;
})();

/**
 * ── THE LONGEST QUOTATION THAT CAN EVER BE SET ────────────────────────────
 * Ellie: "We need to set a minimum bound for this so that the citation is
 * always readable. Working backwards from this, and using what we know about
 * the heights, we can set a max quote length."
 *
 * Working backwards is this: the citation's floor costs a fixed height, the
 * quote's floor sets the leading, the room is what it is, and the product of
 * the lines that leaves and the characters a line holds is the cap. It is
 * printed rather than written down anywhere, because the moment it is written
 * down it is a second copy of four numbers that can each move.
 *
 * It is a limit on the RAW length. A quotation is one paragraph here, so
 * characters is the honest unit; words would need an assumption about their
 * length and the per-line figure already carries one.
 */
const CAP = (() => {
  const leading = Math.round(QUOTE_FLOOR * QUOTE_LEADING);
  const lines = Math.floor((room - citeHeight(QUOTE_FLOOR)) / leading);
  const perLine = Math.max(12, Math.floor(SCREEN.insightW / (QUOTE_FLOOR * CHAR_RATIO)));
  return { chars: lines * perLine, lines, perLine };
})();

const longestNow = INSIGHTS.reduce((a, b) => ((b?.body || '').length > (a?.body || '').length ? b : a));

console.log(`[check-insight-fits] all ${INSIGHTS.length} insights fit above the peek on the`
  + ` ${SCREEN.scrollH}pt screen this was measured on, the longest at ${smallest}pt with its`
  + ` leading and its citation derived from it.`);
console.log(`  the longest quotation needs a scrolling area of ${tightest ?? 'more than ' + SCREEN.scrollH}pt;`
  + ' a phone shorter than that is not covered here.');
console.log(`  the most an insight can run to is ${CAP.chars} characters: ${CAP.lines} lines of about`
  + ` ${CAP.perLine} at the ${QUOTE_FLOOR}pt floor, above an ${citeSize(QUOTE_FLOOR)}pt citation.`
  + ` The longest in the file is ${(longestNow?.body || '').length}.`);
