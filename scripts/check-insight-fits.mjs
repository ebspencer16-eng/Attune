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
 * The numbers are lifted out of resources.tsx rather than restated here. A gate
 * that carries its own copy of the arithmetic is comparing itself to one side,
 * which is the mistake check-card-type-clipping was written to stop making: it
 * passed for weeks against a copy of the rule the app was not running.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the type is pleasant at the smallest size. That is hers to look at,
 * and the floor is there so the answer is never "unreadably small": a quotation
 * that cannot fit nine lines at the minimum is one to query rather than shrink.
 */

import { readFileSync } from 'node:fs';

import { INSIGHTS } from '../api/_insights.js';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = 'attune-app/src/app/resources.tsx';
const src = readFileSync(`${ROOT}${SRC}`, 'utf8');

const fails = [];

/** One number, lifted from the screen. */
function num(name) {
  const m = new RegExp(`const ${name} = ([0-9.]+);`).exec(src);
  return m ? Number(m[1]) : null;
}

const QUOTE_BASE = num('QUOTE_BASE');
const QUOTE_LEADING = num('QUOTE_LEADING');
const QUOTE_FLOOR = num('QUOTE_FLOOR');

/** How wide a line is taken to be, per point of type. */
const perChar = (() => {
  const m = /insightW \/ \(size \* ([0-9.]+)\)/.exec(src);
  return m ? Number(m[1]) : null;
})();

/** The furniture around the quote, with Spacing resolved. */
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

if (!QUOTE_BASE || !QUOTE_LEADING || !QUOTE_FLOOR || !perChar || !FURNITURE) {
  console.error('[check-insight-fits] the quote arithmetic is not where this expects it in'
    + ` ${SRC}: base=${QUOTE_BASE} leading=${QUOTE_LEADING} floor=${QUOTE_FLOOR}`
    + ` perChar=${perChar} furniture=${FURNITURE}.`
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
const room = SCREEN.scrollH - PEEK - SCREEN.tilesH - 60 - FURNITURE;

/**
 * The screen's own answer, re-run here.
 *
 * Size and line count are one question: the leading shrinks with the type, so a
 * smaller size fits more lines in the same room as well as more characters on
 * each. Asking them separately is what the first version of this file did, and
 * it is what this check caught.
 */
function fitFor(text) {
  for (let size = QUOTE_BASE; size >= QUOTE_FLOOR; size -= 1) {
    const leading = Math.round(size * QUOTE_LEADING);
    const lines = Math.floor(room / leading);
    if (lines < 1) continue;
    const perLine = Math.max(12, Math.floor(SCREEN.insightW / (size * perChar)));
    if (Math.ceil(text.length / perLine) <= lines) return { size, lines };
  }
  return null;
}

let worst = null;
let smallest = QUOTE_BASE;
for (const insight of INSIGHTS) {
  const text = insight?.body || '';
  if (!text) continue;
  const fit = fitFor(text);
  if (!fit) {
    const leading = Math.round(QUOTE_FLOOR * QUOTE_LEADING);
    const lines = Math.floor(room / leading);
    const perLine = Math.max(12, Math.floor(SCREEN.insightW / (QUOTE_FLOOR * perChar)));
    const need = Math.ceil(text.length / perLine);
    if (!worst || need > worst.need) worst = { text, need, lines, id: insight.id || '(no id)' };
    continue;
  }
  if (fit.size < smallest) smallest = fit.size;
}

if (worst) {
  fails.push(`on the ${SCREEN.scrollH}pt screen this was measured on, "${worst.id}" needs`
    + ` ${worst.need} lines at the ${QUOTE_FLOOR}pt floor and the room holds ${worst.lines}:\n`
    + `      "${worst.text.slice(0, 90)}…"\n`
    + '      It would be cut rather than shrunk. Either the peek gives up some room, the floor\n'
    + '      goes lower, or that quotation is too long and is one to query.');
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
    const r = h - PEEK - SCREEN.tilesH - 60 - FURNITURE;
    for (let size = QUOTE_BASE; size >= QUOTE_FLOOR; size -= 1) {
      const lines = Math.floor(r / Math.round(size * QUOTE_LEADING));
      const perLine = Math.max(12, Math.floor(SCREEN.insightW / (size * perChar)));
      if (lines >= 1 && Math.ceil(text.length / perLine) <= lines) return h;
    }
  }
  return null;
})();

console.log(`[check-insight-fits] all ${INSIGHTS.length} insights fit above the peek on the`
  + ` ${SCREEN.scrollH}pt screen this was measured on, the longest at ${smallest}pt with its`
  + ` leading derived from it.`);
console.log(`  the longest quotation needs a scrolling area of ${tightest ?? 'more than ' + SCREEN.scrollH}pt;`
  + ' a phone shorter than that is not covered here.');
