#!/usr/bin/env node
/**
 * The website's Learn page leaves a gap between the insight and the sheet.
 *
 * ── THE REPORT, FOUR TIMES ────────────────────────────────────────────────
 * Ellie: "Need space between the share button and the in practice peek on learn
 * web page." Then "there is still no space." Then "there's no buffer between
 * the save and share buttons and the in practice section." Then, of the fix,
 * "Still touching."
 *
 * Twice I made the number bigger and nothing moved, because the block above the
 * sheet is a flex column with justify-content: space-between and a height equal
 * to its whole budget, so its last child is pushed flush to that block's bottom
 * edge and every point carved out of the quotation's budget was more space for
 * space-between to spread. The gap is the block's own bottom padding now, which
 * spreading cannot reach.
 *
 * ── AND TWICE THE HARNESS WAS WRONG ABOUT THE PAGE ────────────────────────
 * The first gave the block `flex: 1` beside a tall sibling, so it collapsed to
 * its own padding and reported a two point gap that is really 56. The second
 * kept the outer container as a flex column, which the real page's is not, and
 * did the same thing. A harness that is wrong about the layout reports a working
 * page as broken, which is the most expensive kind of false finding, and this
 * screen has produced two of them.
 *
 * So this one is built from the page rather than beside it: LEARN_GAP, the
 * furniture sum, the insight block's own margin and the four child styles are
 * read out of src/App.jsx, and the gate fails rather than passing if it cannot
 * find any of them. A gate that has lost its subject must never report success,
 * and on this screen a gate that has lost its subject would report 56.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * Two things, and the second is the one that was wrong.
 *
 *   1. The rendered gap between the share row and the top of the sheet is
 *      LEARN_GAP, at four window sizes, for the longest and shortest insight
 *      the product ships.
 *
 *   2. The children fit the budget they were sized against. `furniture` is what
 *      the quote's room is computed by subtracting, so a fixed part left out of
 *      it is room the quotation is given and does not have, and it comes out of
 *      the gap below. One was: the insight block's own top margin, 32 on a
 *      phone and 40 on a laptop. The app's own INSIGHT_FURNITURE opens with
 *      `Spacing.xl * 2` under the comment "the block's own padding", which is
 *      exactly that term, so the two arithmetics for this one screen differed
 *      by a line. This measures the laid-out block instead of trusting either.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether 56 is the right number, which is hers to look at, and whether the
 * quotation is pleasant at the size it lands on, which is check-insight-fits.
 *
 * Nor the app's Learn tab. Its sheet is positioned by a different rule, from
 * the bottom of the screen with a floor and a ceiling, and it is measured on a
 * simulator. Naming that here rather than leaving it silent, so nobody reads
 * this as "the gap is covered on both surfaces".
 */

import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

import { launch } from './_lib/browser.mjs';
import { INSIGHTS } from '../api/_insights.js';
import {
  quoteFit, QUOTE_BASE as FIT_BASE, QUOTE_LEADING as FIT_LEADING,
  CITE_LEADING as FIT_CITE_LEADING,
} from '../attune-app/src/lib/insight-fit.js';

const ROOT = new URL('..', import.meta.url).pathname;
const src = readFileSync(`${ROOT}src/App.jsx`, 'utf8');

/** Everything about the layout, read out of the page that draws it. */
function fromPage(name, re, parse) {
  const m = re.exec(src);
  if (!m) {
    console.error(`[check-learn-gap] could not read ${name} out of src/App.jsx.`
      + ' Refusing to pass: a gate that has lost its subject must never report success,'
      + ' and on this screen it would report a gap of exactly the right size.');
    process.exit(1);
  }
  return parse(m);
}

const LEARN_GAP = fromPage('LEARN_GAP', /const LEARN_GAP = (\d+);/, (m) => Number(m[1]));
const FURNITURE = fromPage(
  'the furniture sum',
  /const furniture = ([\w\s+]+);/,
  (m) => m[1].trim(),
);
const MARGIN = fromPage(
  "the insight block's own margin",
  /data-block="app-learn\/insight" style=\{\{ marginTop: isMobile \? "([\d.]+)rem" : "([\d.]+)rem" \}\}/,
  (m) => ({ mobile: Number(m[1]) * 16, desktop: Number(m[2]) * 16 }),
);
const EYEBROW_FS = fromPage(
  "the eyebrow's size",
  /<div style=\{\{ fontSize: "([\d.]+)rem", letterSpacing: "0\.22em"/,
  (m) => `${m[1]}rem`,
);
/** The quote's own line clamp, which is what stops a long one overflowing. */
fromPage('the quote clamp', /WebkitLineClamp: fit \? fit\.lines : undefined/, (m) => m[0]);

/**
 * ── THE GAP IS PADDING ON THE CONTAINER, AND THAT IS THE WHOLE FIX ────────
 * Pinned here because the harness below builds its container from LEARN_GAP,
 * so without this the gate would go on passing if the gap moved back to a
 * margin or to a subtraction from the quote's budget. Both of those were tried
 * and both were handed straight back by space-between.
 */
fromPage(
  'LEARN_GAP applied as the block\'s bottom padding',
  /paddingBottom: LEARN_GAP,/,
  (m) => m[0],
);
fromPage(
  'the block\'s space-between',
  /justifyContent: "space-between",\s*\n[\s\S]{0,2600}?paddingBottom: LEARN_GAP,/,
  (m) => m[0],
);

/**
 * ── AND IT HAS TO BE BIG ENOUGH TO SEE ────────────────────────────────────
 * A gate that reads its own target out of the file passes whatever that file
 * says, so LEARN_GAP = 0 would satisfy everything below. That is the way gates
 * here get defeated without deleting anything: a guard is checked by what it
 * compares, not by whether it appears.
 *
 * The floor is Ellie's own answer rather than a taste of mine. 28 was tried and
 * her response was "there is still no space"; 56 is what she accepted. So
 * anything under 40 is a number she has already rejected once.
 */
const GAP_FLOOR = 40;
if (LEARN_GAP < GAP_FLOOR) {
  console.error(`[check-learn-gap] LEARN_GAP is ${LEARN_GAP}, under the ${GAP_FLOOR} this holds it to.`);
  console.error('  28 was tried and Ellie\'s answer was "there is still no space". 56 is the one she');
  console.error('  accepted. A gap this size is a gap she will report again.');
  process.exit(1);
}

/** The sum, with isMobile resolved, exactly as the page computes it. */
function furnitureFor(isMobile) {
  const insightMargin = isMobile ? MARGIN.mobile : MARGIN.desktop;
  // eslint-disable-next-line no-new-func
  return Function('insightMargin', `return ${FURNITURE};`)(insightMargin);
}

const longest = INSIGHTS.reduce((a, b) => ((b?.body || '').length > (a?.body || '').length ? b : a));
const shortest = INSIGHTS.reduce((a, b) => ((b?.body || '').length < (a?.body || '').length ? b : a));

/**
 * ── AND ONE THAT USES EVERY LINE IT IS GIVEN ──────────────────────────────
 * This case is the reason the gate works, and leaving it out is why the first
 * version of it passed a plant.
 *
 * `furniture` is what the quote's room is computed by subtracting, so a fixed
 * part left out of it is room the quotation is handed and does not have. But a
 * quotation only takes the room it needs: over the four window sizes below the
 * longest real insight came to 312 points inside a budget of 510, so forty
 * points of overstated room changed nothing, and the plant that removed the
 * block's own margin from the sum passed on its first run. The needle landed,
 * the file was different, and the gate was blind, which is the most expensive
 * way to read a green result.
 *
 * So one case is a quotation long enough to reach whatever line budget it is
 * given, at any size and any width. It is not a quotation the product ships:
 * check-insight-fits caps the real ones. It is the shape the LAYOUT has to
 * survive rather than a claim about the library, and the clamp makes it exact,
 * because a quote that reaches its budget renders at precisely lines x leading.
 */
const fills = {
  body: 'word '.repeat(600).trim(),
  source: 'A citation that runs to two lines, the way a book cited in full does',
};

/**
 * The block, with the page's own numbers in it.
 *
 * The container is what the real one is and nothing more: a flex column with
 * space-between, a height that is its whole budget, border-box, and the gap as
 * bottom padding. The sheet below it is in normal flow with no top margin, so
 * the sheet's top edge IS this block's bottom edge, and that is what the gap is
 * measured to.
 */
function pageFor({ H, W, isMobile, insight, toolsH }) {
  const base = isMobile ? 21.6 : 25.6;
  const scale = base / FIT_BASE;
  const room = H - LEARN_GAP - toolsH - furnitureFor(isMobile);
  const fit = room > 0 ? quoteFit({ text: insight.body, room: room / scale, width: W / scale }) : null;
  const q = fit ? Math.round(fit.size * scale) : base;
  const c = fit ? Math.round(fit.cite * scale) : (isMobile ? 13.1 : 14.1);
  const esc = (t) => String(t).replace(/</g, '&lt;');
  return {
    room,
    fit,
    q,
    html: `<style>*{box-sizing:border-box}body{margin:0;background:#2b2140;font-family:system-ui}</style>
<div id="above" style="display:flex;flex-direction:column;justify-content:space-between;width:${W}px;
  height:${H}px;padding-bottom:${LEARN_GAP}px;box-sizing:border-box;min-height:0;color:#fff">
  <!-- flex-shrink:0 because the real tool tiles hold content, and a flex item's
       default min-height:auto stops it shrinking below what is in it. An empty
       stand-in has nothing in it, so it shrank instead of the insight and
       absorbed every overflow this gate exists to see. -->
  <div id="tools" style="height:${toolsH}px;flex-shrink:0;background:rgba(255,255,255,0.08)"></div>
  <div id="insight" style="margin-top:${isMobile ? MARGIN.mobile : MARGIN.desktop}px">
    <div id="eyebrow" style="font-size:${EYEBROW_FS};letter-spacing:0.22em;text-transform:uppercase;font-weight:700;margin-bottom:0.9rem">INSIGHT OF THE DAY</div>
    <p id="quote" style="font-size:${q}px;line-height:${Math.round(q * FIT_LEADING)}px;font-weight:400;
      margin:0;letter-spacing:-0.01em;display:-webkit-box;-webkit-box-orient:vertical;
      -webkit-line-clamp:${fit ? fit.lines : 'none'};overflow:hidden">${esc(insight.body)}</p>
    <p id="cite" style="font-size:${c}px;line-height:${Math.round(c * FIT_CITE_LEADING)}px;
      font-style:italic;margin:1.1rem 0 0">${esc(insight.source || 'A citation, two lines of it, as a book gives')}</p>
    <div id="controls" style="display:flex;justify-content:flex-end;gap:0.6rem;margin-top:1.1rem">
      <button style="border-radius:999px;border:1px solid rgba(255,255,255,0.35);background:transparent;
        padding:0.45rem 1rem;font-size:0.78rem;font-weight:700;color:#fff">Save</button>
      <button style="border-radius:999px;border:1px solid rgba(255,255,255,0.35);background:transparent;
        padding:0.45rem 1rem;font-size:0.78rem;font-weight:700;color:#fff">Share</button>
    </div>
  </div>
</div>`,
  };
}

/* Laptop column, phone, a short laptop and a very short one, because the
   overflow this is about only bites once the quotation fills its lines. */
const WINDOWS = [
  ['laptop column', 620, 760, false],
  ['narrow laptop', 480, 700, false],
  ['phone', 360, 640, true],
  ['short phone', 340, 560, true],
];

let body = '';
const server = createServer((_q, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(body);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

const page = await launch({ width: 1280, height: 1000 });
const fails = [];
let measured = 0;
let tightest = Infinity;

for (const [label, W, H, isMobile] of WINDOWS) {
  for (const [which, insight] of [['a quote that fills its lines', fills],
    ['the longest insight', longest], ['the shortest', shortest]]) {
    const { room, fit, html } = pageFor({ H, W, isMobile, insight, toolsH: 96 });
    body = html;
    await page.goto(`http://127.0.0.1:${PORT}/`);
    await page.wait(120);
    const m = await page.evaluate(() => {
      const a = document.getElementById('above').getBoundingClientRect();
      const c = document.getElementById('controls').getBoundingClientRect();
      const t = document.getElementById('tools').getBoundingClientRect();
      const i = document.getElementById('insight').getBoundingClientRect();
      return {
        gap: Math.round(a.bottom - c.bottom),
        contentBox: Math.round(a.height - parseFloat(getComputedStyle(document.getElementById('above')).paddingBottom)),
        /* The children's own total height, NOT the span from the first to
           the last: with space-between those edges are the content box's edges
           by definition, so a span telescopes to the box every time and
           measures nothing. The first version did exactly that and reported
           children === box for the shortest insight on a tall window. */
        childrenH: Math.round(
          t.height
          + parseFloat(getComputedStyle(document.getElementById('insight')).marginTop)
          + i.height,
        ),
        /* What the quote was given, against what it got. A fixed part left
           out of `furniture` is room the quotation is sized for and does not
           have, and the flex column absorbs the difference by squeezing this
           block, so the lines come off the bottom of the quote. */
        quoteH: Math.round(document.getElementById('quote').getBoundingClientRect().height),
        quoteScroll: document.getElementById('quote').scrollHeight,
        insightH: Math.round(i.height),
        insightScroll: document.getElementById('insight').scrollHeight,
      };
    });
    measured += 1;
    tightest = Math.min(tightest, m.gap);
    const where = `${label} ${W}x${H}, ${which}`;
    if (process.env.GAPDEBUG) console.log(`  ${where}: gap=${m.gap} box=${m.contentBox} wantQuote=${fit ? fit.lines * Math.round(Math.round(fit.size * ((isMobile ? 21.6 : 25.6) / 18)) * 1.5) : '?'} quoteH=${m.quoteH} insightH=${m.insightH} insightScroll=${m.insightScroll}`);

    /* 1. The gap itself, which is the thing she reported. */
    if (m.gap < LEARN_GAP - 1) {
      fails.push(`${where}: the share row ends ${m.gap} above the sheet, not ${LEARN_GAP}.`
        + '\n      The gap is the block\'s bottom padding, and something is spilling into it.');
    }

    /* 2. The children fit the budget the quote was sized against. An overflow
          here is room the quotation was given and does not have, and the only
          place it can come from is the gap. */
    if (m.childrenH > m.contentBox + 1) {
      fails.push(`${where}: the block's children come to ${m.childrenH} inside a content box of`
        + ` ${m.contentBox}, an overflow of ${m.childrenH - m.contentBox}.`
        + `\n      The quote was sized against a room of ${Math.round(room)} at ${fit?.lines} lines, so`
        + '\n      `furniture` is missing a fixed part of the block that size came out of.');
    }
  }
}

await page.close();
server.close();

if (fails.length) {
  console.error('[check-learn-gap] The Learn page insight is against the In Practice sheet:');
  for (const f of fails) console.error(`  ${f}`);
  console.error('');
  console.error('LEARN_GAP is the block\'s paddingBottom in src/App.jsx, and `furniture` has to');
  console.error('account for every fixed part of the insight block, its own margin included.');
  process.exit(1);
}

console.log(`[check-learn-gap] ${measured} measurements over ${WINDOWS.length} window sizes:`
  + ` the share row stops ${tightest === LEARN_GAP ? LEARN_GAP : `at least ${tightest}`} above the sheet`
  + ` (LEARN_GAP is ${LEARN_GAP}), and the block's children fit the budget the quotation was sized`
  + ` against. Furniture is ${furnitureFor(false)} on a laptop and ${furnitureFor(true)} on a phone.`);
