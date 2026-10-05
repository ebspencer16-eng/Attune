#!/usr/bin/env node
/**
 * The home page's two action prompt tiles, measured in a browser.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * Ellie has reported this tile wrong three times:
 *
 *   "Home page action prompt tiles on web are missing the hairline below the
 *    hero and the mark in the image box."
 *   "Home page action prompt tiles are rendering incorrectly on my desktop."
 *   "Still messed up."
 *   "Still no buffer between the inner square and the right edge of the tile."
 *
 * Two of my fixes were wrong and I reported both as done. Both times the thing
 * I measured was not this component: first a hand-written page carrying the
 * same CSS, then nothing at all, because the dashboard needs an account and
 * `?demo=1` on it renders blank rather than a dashboard. A copy of the layout
 * is not the layout, which is the lesson this repo keeps paying for in a new
 * place each time.
 *
 * So this mounts AppHome itself, with a stub payload, and measures what the
 * browser actually lays out.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * The things she has actually reported, in her terms:
 *
 *   1. the picture is a square
 *   2. it has the same gap on all four sides of the card, which is the one she
 *      is looking at now
 *   3. the card fits its cell, so nothing overflows and the page does not
 *      scroll
 *   4. the mark is drawn inside the picture, not missing and not clipped
 *   5. the hairline under the title is there
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether it looks right. Square is measurable and handsome is not. It also
 * does not check the rest of the dashboard around it: the tile is mounted on
 * its own, so this says nothing about the room the page gives it. That room is
 * the thing the component measures for itself at runtime, and the heights here
 * are supplied rather than discovered.
 */

import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';

import { launch } from './_lib/browser.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];
const dir = mkdtempSync(join(tmpdir(), 'attune-tiles-'));

/**
 * The payload shape /api/home sends, cut to what this tile reads.
 *
 * Two cards, because two is what the page draws and the pair is the subject:
 * they alternate tints and have to come out the same size.
 */
const FEED = {
  alerts: [],
  primary: {
    id: 'results', title: 'Your results are ready',
    body: 'Insights and guidance based on your responses', deepLink: 'results',
  },
  secondary: [{
    id: 'budget', title: 'Explore build-a-budget',
    body: 'Build your budget with a customizable tool', deepLink: 'budget',
  }],
};

const harness = `
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppHome } from ${JSON.stringify(`${ROOT}src/App.jsx`)};

const FEED = ${JSON.stringify(FEED)};

function Harness() {
  const [h, setH] = useState(520);
  const [w, setW] = useState(680);
  window.__size = (nw, nh) => { setW(nw); setH(nh); };
  /* The page's own frame: a column of a known width, a known height, and the
     tile taking what is left of it. That is what the dashboard does around
     this component and it is what the component measures. */
  return (
    <div style={{ width: w, height: h, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <AppHome feed={FEED} isMobile={w < 680} userName="Sarah" onQuick={() => {}} onCard={() => {}} />
    </div>
  );
}
createRoot(document.getElementById('root')).render(<Harness />);
`;

try {
  await build({
    stdin: { contents: harness, resolveDir: ROOT, loader: 'jsx', sourcefile: 'tiles.jsx' },
    bundle: true,
    format: 'iife',
    jsx: 'automatic',
    outfile: join(dir, 'tiles.js'),
    define: {
      'process.env.NODE_ENV': '"production"',
      /* Something under src/ reads process at module scope. Bundled for a
         browser that has no process, it throws before anything renders. */
      'process.env': '{}',
      'process.platform': '"browser"',
    },
    /* src/App.jsx reaches for the Supabase client and for import.meta.env at
       module scope. Neither is this check's subject and neither can be stood up
       here, so they are stubbed at the boundary the same way check-web-marking
       stubs the session. Everything inside AppHome is the real thing. */
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
  console.error('[check-prompt-tiles] the home tile would not bundle, so nothing was measured:'
    + `\n  ${String(e.message || e).split('\n').slice(0, 5).join('\n  ')}`
    + '\n  Refusing to pass: a gate that has lost its subject must never report success.');
  rmSync(dir, { recursive: true, force: true });
  process.exit(1);
}

writeFileSync(join(dir, 'tiles.html'), `<!doctype html><meta charset="utf-8">
<body style="margin:0;background:#FBF8F3">
<div id="root"></div>
<script>window.onerror = (m) => { window.__err = String(m); };</script>
<script src="./tiles.js"></script>
`);

const server = createServer((req, res) => {
  const name = (req.url || '/').split('?')[0];
  try {
    const body = readFileSync(join(dir, name === '/' ? 'tiles.html' : name.replace(/^\//, '')));
    res.writeHead(200, { 'Content-Type': name.endsWith('.js') ? 'text/javascript' : 'text/html' });
    res.end(body);
  } catch { res.writeHead(404); res.end('no'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

const page = await launch({ width: 1000, height: 900 });
try {
  await page.goto(`http://127.0.0.1:${PORT}/tiles.html`);
  await page.wait(900);

  const up = await page.evaluate(() => ({
    cards: document.querySelectorAll('.ah-card').length,
    err: window.__err || null,
  }));
  if (up.cards < 2) {
    console.error(`[check-prompt-tiles] the tile rendered ${up.cards} cards: ${up.err || 'no error'}.`
      + ' Refusing to pass: a gate that has lost its subject must never report success.');
    server.close();
    process.exit(1);
  }

  /**
   * The window sizes, and why these.
   *
   * 680 is the column the dashboard gives this on a laptop, and the heights are
   * a tall window, the one Ellie's screenshot came from, and a short one. 390
   * is a phone. A layout that is only right at one height is the bug that has
   * come back twice.
   */
  const CASES = [
    [680, 620, 'laptop, tall'],
    [680, 460, 'laptop, her screenshot'],
    [680, 330, 'laptop, short window'],
    [390, 560, 'phone'],
  ];

  for (const [w, h, name] of CASES) {
    await page.evaluate(([nw, nh]) => window.__size(nw, nh), [w, h]);
    await page.wait(450);

    const got = await page.evaluate(() => [...document.querySelectorAll('.ah-card')].map((card) => {
      const pic = card.querySelector('.ah-pic');
      const cell = card.parentElement;
      const c = card.getBoundingClientRect();
      const p = pic.getBoundingClientRect();
      const e = cell.getBoundingClientRect();
      const svg = pic.querySelector('svg');
      const hair = [...card.querySelectorAll('div')].find((d) => {
        const r = d.getBoundingClientRect();
        return r.height > 0 && r.height <= 1.5 && r.width > 40;
      });
      return {
        title: (card.textContent || '').trim().slice(0, 22),
        card: [Math.round(c.width), Math.round(c.height)],
        cell: [Math.round(e.width), Math.round(e.height)],
        pic: [Math.round(p.width), Math.round(p.height)],
        /* The gap on each side of the picture, inside the card. */
        gaps: {
          left: Math.round(p.left - c.left),
          right: Math.round(c.right - p.right),
          top: Math.round(p.top - c.top),
        },
        mark: svg ? Math.round(svg.getBoundingClientRect().width) : 0,
        markInside: svg
          ? svg.getBoundingClientRect().right <= p.right + 0.5
            && svg.getBoundingClientRect().bottom <= p.bottom + 0.5
          : false,
        hairline: !!hair,
      };
    }));

    if (process.env.TILE_DEBUG) {
      console.log(name, JSON.stringify(await page.evaluate(() => {
        const card = document.querySelector('.ah-card');
        const pic = card.querySelector('.ah-pic');
        const cs = getComputedStyle(card);
        const ps = getComputedStyle(pic);
        return {
          cardBox: cs.boxSizing, cardW: cs.width, cardPad: cs.padding,
          cardRect: Math.round(card.getBoundingClientRect().width),
          picBox: ps.boxSizing, picW: ps.width, picRect: Math.round(pic.getBoundingClientRect().width),
          cellW: Math.round(card.parentElement.getBoundingClientRect().width),
          cardClient: card.clientWidth, cardScroll: card.scrollWidth,
        };
      }), null, 1));
    }

    for (const g of got) {
      const where = `${name}, "${g.title}"`;

      // 1. A square.
      if (Math.abs(g.pic[0] - g.pic[1]) > 1 && g.card[1] < g.cell[1] - 1) {
        fails.push(`${where}: the picture is ${g.pic[0]}x${g.pic[1]}, not a square, and the card`
          + ` (${g.card[1]}) is not pressed against its cell (${g.cell[1]}) so it had the room.`
          + '\n      Ellie: "I want white boxes holding rounded square images with the text under'
          + ' it."');
      }

      // 2. The same gap on every side. This is the one she is looking at now.
      const { left, right, top } = g.gaps;
      if (Math.abs(left - right) > 1 || Math.abs(left - top) > 1) {
        fails.push(`${where}: the picture is inset ${left} left, ${right} right, ${top} top.`
          + '\n      Ellie: "Still no buffer between the inner square and the right edge of the'
          + ' tile." The card has one padding; the picture has to sit inside all of it.');
      }
      if (left < 6) {
        fails.push(`${where}: the picture is only ${left} from the card's edge, which reads as`
          + ' touching it.');
      }

      // 3. It fits its cell.
      if (g.card[1] > g.cell[1] + 1 || g.card[0] > g.cell[0] + 1) {
        fails.push(`${where}: the card is ${g.card[0]}x${g.card[1]} in a ${g.cell[0]}x${g.cell[1]}`
          + ' cell, so it overflows. This page must not scroll.');
      }

      // 4. The mark is drawn, inside the picture.
      if (!g.mark) {
        fails.push(`${where}: no mark is drawn in the picture. Ellie asked for "just a shaded`
          + ' square with an attune logo in the bottom right".');
      } else if (!g.markInside) {
        fails.push(`${where}: the mark is drawn outside the picture it sits in.`);
      }

      // 5. The hairline under the title.
      if (!g.hairline) {
        fails.push(`${where}: no hairline under the title. Ellie: "The two larger tiles within`
          + ' that one also have a border."');
      }
    }

    /* And the pair match. Two cards of different sizes side by side is what she
       called "rendering incorrectly" the first time. */
    if (got.length === 2) {
      if (Math.abs(got[0].card[0] - got[1].card[0]) > 1
        || Math.abs(got[0].card[1] - got[1].card[1]) > 1) {
        fails.push(`${name}: the two cards are ${got[0].card.join('x')} and`
          + ` ${got[1].card.join('x')}. They sit side by side and have to match.`);
      }
    }
  }
} finally {
  await page.close();
  server.close();
  rmSync(dir, { recursive: true, force: true });
}

if (fails.length) {
  console.error('\n check-prompt-tiles: the home page\'s prompt tiles do not lay out correctly.\n');
  for (const f of [...new Set(fails)]) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log('[check-prompt-tiles] at four window sizes, both cards match, fit their cell, and hold'
  + ' a square picture inset evenly on every side with the mark inside it and the hairline below.');
