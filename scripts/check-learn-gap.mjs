#!/usr/bin/env node
/**
 * The In Practice sheet never covers the end of the insight.
 *
 * ── THE REPORT, FOUR TIMES, AND WHAT IT ACTUALLY WAS ──────────────────────
 * Ellie: "Need space between the share button and the in practice peek on learn
 * web page." Then "there is still no space." Then "there's no buffer between the
 * save and share buttons and the in practice section." Then, of the fix,
 * "Still touching."
 *
 * It was never a gap that was too small. Her screenshot of the live page shows
 * the second line of the quotation running UNDER the white sheet with Save and
 * Share behind it completely. Driven in this harness before the fix, the
 * controls finished 29 points BELOW the top of the sheet.
 *
 * The block above the sheet had a fixed `height`. A ceiling does not shrink
 * content that is too tall for it: the children spill out of the bottom, the
 * sheet begins at the block's border edge and is painted after it, so the sheet
 * is drawn over the end of the insight. It is a minimum now. The quotation is
 * fitted to the room first, so the type shrinks before anything else happens,
 * and the minimum only does work when that is still not enough, at which point
 * the sheet is pushed down. A peek slightly off is visible and recoverable; a
 * sentence hidden under a white panel is a bug nobody can describe.
 *
 * The block also measured its budget as `rect.top + window.scrollY` against
 * `100dvh`. The dashboard is a 100dvh row with an inner column that scrolls, so
 * scrollY is always 0 and rect.top is wherever the block happens to be when
 * something re-renders. It measures its offset inside that scroller now,
 * against the scroller's own clientHeight, which does not move when you scroll.
 *
 * ── WHY THIS DRIVES THE PAGE AND NOT THE SHEET ────────────────────────────
 * Because four harnesses for this screen have been wrong about the layout, and
 * a harness that is wrong about the layout reports a working page as broken, or
 * worse reports a broken one as working. All four are worth knowing:
 *
 *   `flex: 1` on the block beside a tall sibling, so it collapsed to its own
 *   padding and reported a 2 point gap that is really 56.
 *
 *   The outer container kept as a flex column, which the real page's is not.
 *
 *   The children measured as the span from the first to the last, which under
 *   `space-between` IS the content box by definition, so it telescoped and
 *   reported children equal to box for an insight filling a third of it.
 *
 *   An empty div standing in for the tool tiles, which a flex column is free to
 *   shrink, so the stand-in absorbed every overflow the gate existed to see.
 *
 * Every one of those came from building the block beside the page rather than
 * as the page. So this mounts the real AppLearnReading inside the dashboard's
 * real shape: a 100dvh row, an inner scroller, the banner, the block with the
 * arithmetic read out of src/App.jsx, and the sheet under it. Then it scrolls.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * That the top of the sheet is at least LEARN_GAP below the bottom of the share
 * row, at four window sizes, for the longest insight, the shortest, and a
 * quotation long enough to use every line it is given, at rest and at three
 * scroll positions. A negative number there is her bug.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether 56 is the right number and whether the page looks right, which are
 * hers. Whether the quotation is pleasant at the size it lands on, which is
 * check-insight-fits. And the app's Learn tab, whose sheet is positioned by a
 * different rule from the bottom of the screen and is measured on a simulator.
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';

import { launch } from './_lib/browser.mjs';
import { INSIGHTS } from '../api/_insights.js';
import { IN_PRACTICE } from '../api/_in-practice.js';
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
const FURNITURE = fromPage('the furniture sum', /const furniture = ([\w\s+]+);/, (m) => m[1].trim());
const MARGIN = fromPage(
  "the insight block's own margin",
  /data-block="app-learn\/insight" style=\{\{ marginTop: isMobile \? "([\d.]+)rem" : "([\d.]+)rem" \}\}/,
  (m) => ({ mobile: Number(m[1]) * 16, desktop: Number(m[2]) * 16 }),
);
fromPage('the quote clamp', /WebkitLineClamp: fit \? fit\.lines : undefined/, (m) => m[0]);

/**
 * ── THE THREE THINGS THE FIX IS MADE OF ───────────────────────────────────
 * Pinned, because the harness below reproduces them and would otherwise go on
 * passing after any of them was undone. `minHeight` rather than `height` is the
 * whole of the fix; the scroller is what the budget is measured against; and
 * the gap is padding on the container, which `space-between` cannot reach.
 */
fromPage("the block's minimum height", /minHeight: \(learnPeek && learnTop && learnRoom\)/, (m) => m[0]);
fromPage('the scroller the budget is measured against', /\[data-dash-scroll\]/, (m) => m[0]);
fromPage("LEARN_GAP as the block's bottom padding", /paddingBottom: LEARN_GAP,/, (m) => m[0]);

/**
 * ── THE TWO EXPRESSIONS, LIFTED AND RUN ───────────────────────────────────
 * The harness below reproduces the block rather than mounting it, because the
 * block is inline JSX inside a fifteen thousand line component and there is no
 * component to mount. That is the weak joint in this gate, and it showed: a
 * plant that changed how the budget is measured passed, because the harness was
 * computing the budget its own way.
 *
 * So the two expressions that decide the budget are lifted out of src/App.jsx
 * and RUN here, rather than retyped. Change either one and this changes with
 * it. What is still only pinned by name is the SHAPE of the block, above: that
 * it is a minimum, that the gap is padding, that there is a scroller. Those
 * three are the fix, so a plant that removes any of them stops the gate dead
 * rather than passing, which is the right failure.
 *
 * The thing that would make all of this behavioural is exporting the block the
 * way AppHome and AppLearnReading are exported, for the reason written on
 * AppHome: a component that can only be checked by being signed in is a
 * component nothing checks. That is in TASKS.md rather than left implied.
 */
const BUDGET = fromPage(
  'the budget expression',
  /minHeight: \(learnPeek && learnTop && learnRoom\)\s*\n\s*\? `\$\{([^}]+)\}px`/,
  // eslint-disable-next-line no-new-func
  (m) => Function('learnRoom', 'learnTop', 'learnPeek', `return ${m[1]};`),
);
const SCROLL_ROOM = fromPage(
  'how the scroller\'s room is measured',
  /const room = Math\.round\(([^)]+(?:\([^)]*\))?[^)]*)\);/,
  (m) => m[1].trim(),
);
if (!/clientHeight/.test(SCROLL_ROOM)) {
  console.error(`[check-learn-gap] the budget is measured from \`${SCROLL_ROOM}\` rather than the`
    + " scroller's own clientHeight.");
  console.error('  The dashboard scrolls in an inner column, so the window is not the room there is.');
  process.exit(1);
}

/**
 * And the gap has to be big enough to see. A gate that reads its own target out
 * of the file passes whatever that file says, so LEARN_GAP = 0 would satisfy
 * everything below: a guard is checked by what it compares. The floor is her own
 * evidence, since 28 was tried and her answer was "there is still no space".
 */
const GAP_FLOOR = 40;
if (LEARN_GAP < GAP_FLOOR) {
  console.error(`[check-learn-gap] LEARN_GAP is ${LEARN_GAP}, under the ${GAP_FLOOR} this holds it to.`);
  console.error('  28 was tried and her answer was "there is still no space". 56 is the one she');
  console.error('  accepted. A gap this size is a gap she will report again.');
  process.exit(1);
}

function furnitureFor(isMobile) {
  const insightMargin = isMobile ? MARGIN.mobile : MARGIN.desktop;
  // eslint-disable-next-line no-new-func
  return Function('insightMargin', `return ${FURNITURE};`)(insightMargin);
}

const longest = INSIGHTS.reduce((a, b) => ((b?.body || '').length > (a?.body || '').length ? b : a));
const shortest = INSIGHTS.reduce((a, b) => ((b?.body || '').length < (a?.body || '').length ? b : a));
/**
 * A quotation long enough to reach whatever line budget it is given.
 *
 * Not one the product ships: check-insight-fits caps the real ones. It is the
 * shape the LAYOUT has to survive, and it is the case that makes this gate work.
 * Without it an earlier version passed a plant twice, because a quotation only
 * takes the room it needs and the real ones never filled their budget.
 */
const fills = {
  body: 'word '.repeat(600).trim(),
  source: 'A citation that runs to two lines, the way a book cited in full does',
};

const dir = mkdtempSync(join(tmpdir(), 'learn-gap-'));

/**
 * The dashboard's own shape, with the real sheet in it.
 *
 * Everything here is the page: a 100dvh row, an inner column that scrolls with
 * the banner inside it, the block measuring its offset within that scroller
 * against the scroller's clientHeight, and AppLearnReading underneath reporting
 * its own peek. The only stand-in is the tool tiles, which carry flex-shrink: 0
 * because a real block holds content and min-height: auto stops it shrinking
 * below that.
 */
const harness = `
import { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { AppLearnReading } from ${JSON.stringify(`${ROOT}src/App.jsx`)};
import { quoteFit } from ${JSON.stringify(`${ROOT}attune-app/src/lib/insight-fit.js`)};

const LEARN_GAP = ${LEARN_GAP};
const budget = ${BUDGET.toString()};
const MARGIN = ${JSON.stringify(MARGIN)};
const FIT_BASE = ${FIT_BASE}, FIT_LEADING = ${FIT_LEADING}, FIT_CITE_LEADING = ${FIT_CITE_LEADING};
const ARTICLES = ${JSON.stringify(IN_PRACTICE)};

function Page({ insight, isMobile, banner, furniture }) {
  const [peek, setPeek] = useState(0);
  const [top, setTop] = useState(0);
  const [room, setRoom] = useState(0);
  const [above, setAbove] = useState({ h: 0, w: 0 });
  const [toolsH, setToolsH] = useState(0);
  const aboveRef = useRef(null);
  const toolsRef = useRef(null);

  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const h = Math.round(e.contentRect.height), w = Math.round(e.contentRect.width);
        if (e.target === toolsRef.current) setToolsH((c) => (Math.abs(c - h) > 1 ? h : c));
        else setAbove((c) => (Math.abs(c.h - h) > 1 || Math.abs(c.w - w) > 1 ? { h, w } : c));
      }
    });
    if (toolsRef.current) ro.observe(toolsRef.current);
    if (aboveRef.current) ro.observe(aboveRef.current);
    return () => ro.disconnect();
  });

  useEffect(() => {
    const el = aboveRef.current; if (!el) return undefined;
    const report = () => {
      const sc = el.closest('[data-dash-scroll]'); if (!sc) return;
      const off = Math.round(el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop);
      setTop((c) => (Math.abs(c - off) > 1 ? off : c));
      const r = Math.round(${JSON.stringify(SCROLL_ROOM)}.includes('clientHeight') ? sc.clientHeight : window.innerHeight);
      setRoom((c) => (Math.abs(c - r) > 1 ? r : c));
    };
    report();
    const ro = new ResizeObserver(report); ro.observe(document.body);
    return () => ro.disconnect();
  });

  const base = isMobile ? 21.6 : 25.6;
  const scale = base / FIT_BASE;
  /* The budget, not the rendered block: see the note in src/App.jsx. Reading
     the rendered height is a feedback loop once the block takes a minimum. */
  const budgetBox = (room && top && peek) ? budget(room, top, peek) - LEARN_GAP : 0;
  const r = (budgetBox && toolsH) ? budgetBox - toolsH - furniture : 0;
  const fit = above.w > 0 ? quoteFit({ text: insight.body, room: Math.max(1, r) / scale, width: above.w / scale }) : null;
  const q = fit ? Math.round(fit.size * scale) : base;
  const cite = fit ? Math.round(fit.cite * scale) : (isMobile ? 13.1 : 14.1);

  return (
    <div style={{ display: 'flex', height: '100dvh', background: '#FBF8F3' }}>
      <div data-dash-scroll="" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ background: 'linear-gradient(120deg,#C8522E,#6B3FA0,#1B5FE8)', flexShrink: 0, height: banner }} />
        <div style={{ padding: isMobile ? '0 1.25rem' : '0 2rem', background: '#5a6ea8' }}>
          <div ref={aboveRef} style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            minHeight: (peek && top && room) ? budget(room, top, peek) + 'px' : undefined,
            minWidth: 0, paddingBottom: LEARN_GAP, boxSizing: 'border-box',
          }}>
            <div ref={toolsRef} style={{ height: 96, flexShrink: 0, background: 'rgba(255,255,255,0.2)' }} />
            <div id="insight" style={{ marginTop: isMobile ? MARGIN.mobile : MARGIN.desktop, color: 'white' }}>
              <div style={{ fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.9rem' }}>INSIGHT OF THE DAY</div>
              <p id="quote" style={{
                fontFamily: 'Georgia, serif', fontSize: q, lineHeight: Math.round(q * FIT_LEADING) + 'px',
                margin: 0, letterSpacing: '-0.01em', display: '-webkit-box', WebkitBoxOrient: 'vertical',
                WebkitLineClamp: fit ? fit.lines : undefined, overflow: 'hidden',
              }}>{insight.body}</p>
              <p id="cite" style={{ fontSize: cite, lineHeight: Math.round(cite * FIT_CITE_LEADING) + 'px', fontStyle: 'italic', margin: '1.1rem 0 0' }}>{insight.source}</p>
              <div id="controls" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.1rem' }}>
                <button style={{ borderRadius: 999, border: '1px solid rgba(255,255,255,0.35)', background: 'transparent', padding: '0.45rem 1rem', fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>Save</button>
                <button style={{ borderRadius: 999, border: '1px solid rgba(255,255,255,0.35)', background: 'transparent', padding: '0.45rem 1rem', fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>Share</button>
              </div>
            </div>
          </div>
          <AppLearnReading articles={ARTICLES} isMobile={isMobile} savedCount={0} readCount={5} onPeek={setPeek} />
        </div>
      </div>
    </div>
  );
}

window.__render = (opts) => {
  const el = document.getElementById('root');
  if (!window.__root) window.__root = createRoot(el);
  window.__root.render(<Page {...opts} />);
};
`;

try {
  await build({
    stdin: { contents: harness, resolveDir: ROOT, loader: 'jsx', sourcefile: 'gap.jsx' },
    bundle: true,
    format: 'iife',
    jsx: 'automatic',
    outfile: join(dir, 'gap.js'),
    define: { 'process.env.NODE_ENV': '"production"', 'process.env': '{}' },
    plugins: [{
      name: 'stub-env',
      setup(b) {
        b.onResolve({ filter: /(^|\/)supabase\.js$/ }, () => ({ path: 'sb', namespace: 'stub' }));
        b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
          contents: 'export const hasSupabase = false;'
            + ' export const supabase = { auth: { getSession: async () => ({ data: { session: null } }),'
            + ' onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } };',
          loader: 'js',
        }));
      },
    }],
    logLevel: 'silent',
  });
} catch (e) {
  console.error('[check-learn-gap] the Learn tab would not bundle, so nothing was measured:'
    + `\n  ${String(e.message || e).split('\n').slice(0, 5).join('\n  ')}`
    + '\n  Refusing to pass: a gate that has lost its subject must never report success.');
  rmSync(dir, { recursive: true, force: true });
  process.exit(1);
}

const bundle = readFileSync(join(dir, 'gap.js'), 'utf8');
const html = `<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0}</style>`
  + `<div id="root"></div><script>${bundle}</script>`;
const server = createServer((_q, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));

const WINDOWS = [
  ['laptop', 1100, 800, false, 250],
  ['short laptop', 1100, 650, false, 250],
  ['phone', 390, 760, true, 180],
  ['short phone', 360, 600, true, 180],
];
const CASES = [
  ['a quote that fills its lines', fills],
  ['the longest insight', longest],
  ['the shortest', shortest],
];

const fails = [];
let measured = 0;
let tightest = Infinity;
let tooShort = 0;

for (const [label, W, H, isMobile, banner] of WINDOWS) {
  const page = await launch({ width: W, height: H });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.wait(300);
  for (const [which, insight] of CASES) {
    await page.evaluate(
      (o) => window.__render(o),
      { insight: { body: insight.body, source: insight.source || 'A citation' }, isMobile, banner, furniture: furnitureFor(isMobile) },
    );
    await page.wait(700);
    /* At rest and scrolled, because the budget used to be measured against the
       window and the dashboard scrolls in an inner column. */
    for (const y of [0, 120, 400]) {
      await page.evaluate((n) => {
        const sc = document.querySelector('[data-dash-scroll]');
        if (sc) sc.scrollTop = n;
      }, y);
      await page.wait(260);
      const m = await page.evaluate(() => {
        const sheet = document.querySelector('[data-block="app-learn/reading"]');
        const controls = document.getElementById('controls');
        const quote = document.getElementById('quote');
        if (!sheet || !controls) return null;
        const s = sheet.getBoundingClientRect();
        const c = controls.getBoundingClientRect();
        const q = quote.getBoundingClientRect();
        const sc = document.querySelector('[data-dash-scroll]');
        const head = sheet.querySelector('[data-learn-head]');
        const above = sheet.previousElementSibling;
        return {
          gap: Math.round(s.top - c.bottom),
          quoteOver: Math.round(q.bottom - s.top),
          scrolled: Math.round(sc.scrollTop),
          sheetTop: Math.round(s.top - sc.getBoundingClientRect().top),
          viewport: Math.round(sc.clientHeight),
          peek: head ? Math.round(head.getBoundingClientRect().bottom - s.top) : 0,
          /* How much taller the block is than the budget it was given. Above
             zero, the window is too short for this content at any type size
             the floor allows, and where the sheet lands is not a choice. */
          overBudget: above
            ? Math.round(above.getBoundingClientRect().height
              - parseFloat(getComputedStyle(above).minHeight || '0'))
            : 0,
        };
      });
      measured += 1;
      if (!m) {
        fails.push(`${label} ${W}x${H}, ${which}: the sheet or the controls did not render at all.`);
        continue;
      }
      tightest = Math.min(tightest, m.gap);
      if (y === 0 && insight !== fills && m.overBudget > 1) tooShort += 1;
      const where = `${label} ${W}x${H}, ${which}, scrolled ${m.scrolled}`;
      if (process.env.GAPDEBUG && y === 0) console.log(`  ${where}: sheetTop=${m.sheetTop} viewport=${m.viewport} peek=${m.peek} overBudget=${m.overBudget} gap=${m.gap}`);
      if (m.gap < LEARN_GAP - 1) {
        fails.push(`${where}: the sheet starts ${m.gap} below the share row, not ${LEARN_GAP}.`
          + (m.gap < 0
            ? '\n      That is NEGATIVE: the sheet is painted over the end of the insight, which is'
            + '\n      what her screenshot of the live page shows.'
            : ''));
      }
      if (m.quoteOver > 0) {
        fails.push(`${where}: the quotation runs ${m.quoteOver} points past the top of the sheet.`);
      }
      /**
       * ── AND THE PEEK IS STILL ON THE SCREEN ─────────────────────────────
       * The other half of this screen, and the half a minimum height can
       * break quietly. A budget that is too LARGE no longer paints over
       * anything, because the block simply grows, so the gap stays right and
       * the sheet goes off the bottom instead. Two plants did exactly that,
       * forgetting the peek in the budget and measuring the offset from the
       * viewport again, and both passed every assertion above.
       *
       * Ellie: "Content on this page needs to be resized so that the in
       * practice section has the same peek as the app does." A sheet below the
       * fold is a peek of nothing.
       *
       * Only at rest, only for the quotations the product ships, and only when
       * the block actually fits its budget. On a short window there is no type
       * size the floor allows that leaves room for the tools, the insight and
       * the peek together, so where the sheet lands is not a choice anybody
       * made: a 1100x650 window with a 250 point banner has 97 points for a
       * block whose furniture alone is 138. Those are counted and printed
       * rather than passed over, because a check that quietly skips a case is
       * how "all five exercises completed" came to mean three.
       */
      if (y === 0 && insight !== fills && m.overBudget <= 1) {
        if (m.sheetTop > m.viewport - LEARN_GAP) {
          fails.push(`${where}: the sheet starts at ${m.sheetTop} in a ${m.viewport} point window,`
            + ' so none of the peek is on the screen.'
            + '\n      The budget above it is too big: check what it subtracts.');
        } else if (m.sheetTop + m.peek < m.viewport - 2) {
          fails.push(`${where}: the sheet's whole head and ${m.viewport - m.sheetTop - m.peek} points`
            + ' more are on the screen, so the shelves below it are showing.'
            + '\n      The peek is meant to stop at the bottom of the window.');
        }
      }
    }
  }
  await page.close();
}

server.close();
rmSync(dir, { recursive: true, force: true });

if (fails.length) {
  console.error('[check-learn-gap] The In Practice sheet covers the end of the insight:');
  for (const f of fails) console.error(`  ${f}`);
  console.error('');
  console.error('The block above the sheet takes a MINIMUM height, not a fixed one, measured');
  console.error('inside [data-dash-scroll]. A ceiling does not shrink content that is too tall:');
  console.error('it spills, and the sheet is painted over it.');
  process.exit(1);
}

console.log(`[check-learn-gap] ${measured} measurements: 4 window sizes x 3 quotations x 4 scroll`
  + ` positions, driving the real sheet inside the dashboard's own scroller. The sheet starts at`
  + ` least ${tightest} below the share row (LEARN_GAP is ${LEARN_GAP}) and never over the quotation.`);
console.log(`  the peek is held to the foot of the window in every case but ${tooShort}, where the`
  + ' window is too short for the tools, the insight and the peek at any size the floor allows,'
  + ' and where the sheet lands is not a choice.');
