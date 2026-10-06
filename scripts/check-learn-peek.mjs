#!/usr/bin/env node
/**
 * The In Practice sheet reports a peek that is the height of its own head.
 *
 * ── WHY THIS NUMBER MATTERS ───────────────────────────────────────────────
 * The Learn tab is laid out backwards from this one measurement. Ellie:
 * "Please figure out the placement of the in practice peek, then work
 * backwards to figure out the max height of the insight of the day."
 *
 * So the sheet measures its own head and reports it, the block above is given
 * what is left of the window, and the insight's quotation is set at whatever
 * size reaches the lines that room holds. Every other number on the page is
 * derived from this one, which means a wrong answer here is invisible at the
 * source and shows up as the thing she has reported three times: the insight
 * cut off, or the peek pushed off the bottom.
 *
 * ── WHY IT HAD NEVER BEEN CHECKED ─────────────────────────────────────────
 * The Learn tab lives inside the signed-in dashboard. `?demo=1&view=home`
 * renders the account form and nothing behind it, so no browser check in this
 * repo has ever drawn this component, and I measured the insight's arithmetic
 * instead and shipped the layout unmeasured twice.
 *
 * Ellie offered her account for this. A password must not be asked for or put
 * in a transcript, and it turns out not to be needed: the sheet takes its
 * articles as a prop and measures itself, so it can be mounted on its own with
 * the real list.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * That the number the sheet reports is the height of everything a reader sees
 * before scrolling: the grab line, the pills, the heading, the line under it
 * and the search box. If it under-reports, the block above takes room the sheet
 * needs and the peek goes off the bottom. If it over-reports, the insight is
 * squeezed for room nothing is using.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the insight above it then fits, which is check-insight-fits over the
 * app's arithmetic, and whether the page looks right, which is hers.
 */

import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';

import { launch } from './_lib/browser.mjs';
import { IN_PRACTICE } from '../api/_in-practice.js';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];
const dir = mkdtempSync(join(tmpdir(), 'attune-learn-'));

if (IN_PRACTICE.length < 6) {
  console.error(`[check-learn-peek] the article list has ${IN_PRACTICE.length} entries, which`
    + ' cannot be right: the sheet shows four above the fold and the rest below.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

const harness = `
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppLearnReading } from ${JSON.stringify(`${ROOT}src/App.jsx`)};

function Harness() {
  const [w, setW] = useState(680);
  window.__size = (nw) => setW(nw);
  window.__peek = null;
  return (
    <div style={{ width: w, margin: '0 auto' }}>
      <AppLearnReading
        articles={${JSON.stringify(IN_PRACTICE)}}
        isMobile={w < 680}
        savedCount={2}
        readCount={5}
        onPeek={(n) => { window.__peek = n; }}
      />
    </div>
  );
}
createRoot(document.getElementById('root')).render(<Harness />);
`;

try {
  await build({
    stdin: { contents: harness, resolveDir: ROOT, loader: 'jsx', sourcefile: 'learn.jsx' },
    bundle: true,
    format: 'iife',
    jsx: 'automatic',
    outfile: join(dir, 'learn.js'),
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
  console.error('[check-learn-peek] the In Practice sheet would not bundle, so nothing was'
    + ` measured:\n  ${String(e.message || e).split('\n').slice(0, 5).join('\n  ')}`
    + '\n  Refusing to pass: a gate that has lost its subject must never report success.');
  rmSync(dir, { recursive: true, force: true });
  process.exit(1);
}

writeFileSync(join(dir, 'learn.html'), `<!doctype html><meta charset="utf-8">
<body style="margin:0;background:#FBF8F3"><div id="root"></div>
<script>window.onerror = (m) => { window.__err = String(m); };</script>
<script src="./learn.js"></script>
`);

const server = createServer((req, res) => {
  const name = (req.url || '/').split('?')[0];
  try {
    const body = readFileSync(join(dir, name === '/' ? 'learn.html' : name.replace(/^\//, '')));
    res.writeHead(200, { 'Content-Type': name.endsWith('.js') ? 'text/javascript' : 'text/html' });
    res.end(body);
  } catch { res.writeHead(404); res.end('no'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

const page = await launch({ width: 1100, height: 900 });
try {
  await page.goto(`http://127.0.0.1:${PORT}/learn.html`);
  await page.wait(1200);

  const up = await page.evaluate(() => ({
    sheet: !!document.querySelector('[data-block="app-learn/reading"]'),
    err: window.__err || null,
  }));
  if (!up.sheet) {
    console.error(`[check-learn-peek] the sheet did not render: ${up.err || 'no error'}.`
      + ' Refusing to pass: a gate that has lost its subject must never report success.');
    server.close();
    process.exit(1);
  }

  /* A laptop column and a phone. The heading wraps on the narrow one, which is
     the case the measured peek exists for: a number would be wrong there. */
  for (const [w, name] of [[680, 'laptop column'], [390, 'phone']]) {
    await page.evaluate((nw) => window.__size(nw), w);
    await page.wait(500);

    const got = await page.evaluate(() => {
      const sheet = document.querySelector('[data-block="app-learn/reading"]');
      const sheetTop = sheet.getBoundingClientRect().top;
      /* Everything a reader meets before scrolling: the grab line and the head
         row. The first article tile below them is the first thing that is not
         part of the peek. */
      /* The head is a ROW: the pills, heading and search in a left column with
         the four featured tiles beside them. So those four are inside the peek,
         and the first thing below the fold is the fifth tile, where the shelves
         begin. The first version of this took tile zero and reported the peek
         as six times too big, which is the harness being wrong about the
         layout rather than the layout being wrong. */
      const tiles = [...sheet.querySelectorAll('a[href^="/practice"]')];
      const firstTile = tiles[4] || null;
      const search = sheet.querySelector('input');
      return {
        reported: window.__peek,
        searchBottom: search ? Math.round(search.getBoundingClientRect().bottom - sheetTop) : null,
        firstTileTop: firstTile ? Math.round(firstTile.getBoundingClientRect().top - sheetTop) : null,
        featuredBottom: tiles.length >= 4
          ? Math.round(Math.max(...tiles.slice(0, 4).map((t) => t.getBoundingClientRect().bottom)) - sheetTop)
          : null,
        tiles: tiles.length,
      };
    });

    if (typeof got.reported !== 'number' || got.reported <= 0) {
      fails.push(`${name}: the sheet reported a peek of ${JSON.stringify(got.reported)}.`
        + ' Everything above it is sized from this number.');
      continue;
    }
    if (got.tiles !== IN_PRACTICE.length) {
      fails.push(`${name}: the sheet drew ${got.tiles} article tiles and there are`
        + ` ${IN_PRACTICE.length} articles. Every one of them should be reachable here.`);
    }
    /*
     * The reported peek has to clear the search box, which is the last thing in
     * the head, and must not reach past the first tile, which is the first thing
     * that is meant to be below the fold. Under-report and the sheet is pushed
     * down and its own head goes off the bottom; over-report and the insight
     * above is squeezed for room nothing uses.
     */
    const headBottom = Math.max(got.searchBottom ?? 0, got.featuredBottom ?? 0);
    if (headBottom && got.reported < headBottom) {
      fails.push(`${name}: the sheet reports a peek of ${got.reported} and its head ends at`
        + ` ${headBottom} (search box ${got.searchBottom}, featured tiles ${got.featuredBottom}).\n`
        + '      The peek is what shows before scrolling, so the whole head has to fit inside it.');
    }
    if (got.firstTileTop != null && got.reported > got.firstTileTop + 8) {
      fails.push(`${name}: the sheet reports a peek of ${got.reported} and the first article tile`
        + ` starts at ${got.firstTileTop}, so it claims room the reader is meant to scroll to\n`
        + '      and the insight above is squeezed for nothing.');
    }
  }
} finally {
  await page.close();
  server.close();
  rmSync(dir, { recursive: true, force: true });
}

if (fails.length) {
  console.error('\n check-learn-peek: the In Practice sheet is not reporting its own head.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-learn-peek] the sheet draws all ${IN_PRACTICE.length} articles and reports a`
  + ' peek that holds its whole head and stops short of the shelves below it, on a laptop column'
  + ' and a phone.');
