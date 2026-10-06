#!/usr/bin/env node
/**
 * A scrolling row leaves room for its children's shadows to finish.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie, of the In Practice shelves: "Still a hard line on the bottom of the
 * shadow, I want it to fade like a regular shadow backing."
 *
 * It was fading. It was being cut. `overflow-x: auto` does not leave overflow-y
 * alone: per the spec a non-visible value on one axis computes the other to
 * auto, so a row that scrolls sideways clips what its children draw above and
 * below it. The card's shadow is `0 6px 14px`, which reaches twenty points past
 * the card, and the row allowed five and a half. The straight edge she was
 * looking at was the container, cutting the blur while it was still at most of
 * its strength.
 *
 * Nothing was wrong in the shadow, the card or the colour, which is why two
 * rounds of looking at the card found nothing. The bug was in the box around it.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * It renders the sheet and asks the browser. For every element that scrolls on
 * either axis, every child carrying a box-shadow is measured: the shadow's
 * reach is its offset plus its blur, and the container's padding on that side
 * has to be at least that. Computed styles, so a shadow set in any of the ways
 * CSS allows is covered and the arithmetic is the browser's rather than a
 * second copy of it here.
 *
 * ── WHY IT IS NOT A GREP ──────────────────────────────────────────────────
 * Because the container and the shadow are in different components, written
 * hundreds of lines apart, and neither looks wrong on its own. That is this
 * bug's whole shape: `overflowX: "auto"` is correct, `boxShadow` is correct,
 * and the pair is not.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Scrolling rows elsewhere on the site. This mounts the In Practice sheet,
 * which is the one that was reported and the one that can be mounted without an
 * account. The rule is general; the reach of this check is one page, and
 * widening it means finding a way to render the others.
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';

import { launch } from './_lib/browser.mjs';
import { IN_PRACTICE } from '../api/_in-practice.js';

const ROOT = new URL('..', import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), 'shadow-'));

if (IN_PRACTICE.length < 6) {
  console.error('[check-shadow-room] the article list is too short to fill a shelf.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

const harness = `
import { createRoot } from 'react-dom/client';
import { AppLearnReading } from ${JSON.stringify(`${ROOT}src/App.jsx`)};
window.__render = (w, isMobile) => {
  if (!window.__r) window.__r = createRoot(document.getElementById('root'));
  window.__r.render(
    <div style={{ width: w, margin: '0 auto' }}>
      <AppLearnReading articles={${JSON.stringify(IN_PRACTICE)}} isMobile={isMobile}
        savedCount={2} readCount={5} onPeek={() => {}} />
    </div>);
};
`;

try {
  await build({
    stdin: { contents: harness, resolveDir: ROOT, loader: 'jsx', sourcefile: 'shadow.jsx' },
    bundle: true,
    format: 'iife',
    jsx: 'automatic',
    outfile: join(dir, 'shadow.js'),
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
  console.error('[check-shadow-room] the sheet would not bundle, so nothing was measured:'
    + `\n  ${String(e.message || e).split('\n').slice(0, 4).join('\n  ')}`
    + '\n  Refusing to pass: a gate that has lost its subject must never report success.');
  rmSync(dir, { recursive: true, force: true });
  process.exit(1);
}

const bundle = readFileSync(join(dir, 'shadow.js'), 'utf8');
const server = createServer((_q, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}'
    + 'body{margin:0;background:#5a6ea8}</style>'
    + `<div id="root"></div><script>${bundle}</script>`);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));

const page = await launch({ width: 1200, height: 1000 });
await page.goto(`http://127.0.0.1:${server.address().port}/`);

const fails = [];
/* One line per row and side: a shelf of eight cards is one bug, not eight. */
const seen = new Set();
let scrollers = 0;
let shadows = 0;

for (const [label, w, isMobile] of [['laptop', 760, false], ['phone', 390, true]]) {
  await page.evaluate((o) => window.__render(o.w, o.isMobile), { w, isMobile });
  await page.wait(700);
  const found = await page.evaluate(() => {
    /** The distance a shadow reaches past its box, per side. */
    const reachOf = (shadow) => {
      const out = { top: 0, bottom: 0, left: 0, right: 0 };
      if (!shadow || shadow === 'none') return null;
      /* "rgba(42, 27, 16, 0.1) 0px 6px 14px 0px" and the inset form. Colours
         carry commas, so the numbers are taken from the end rather than split. */
      for (const part of shadow.split(/,(?![^(]*\))/)) {
        if (/\binset\b/.test(part)) continue;
        const nums = (part.match(/-?[\d.]+px/g) || []).map(parseFloat);
        if (nums.length < 2) continue;
        const [dx, dy, blur = 0, spread = 0] = nums;
        out.bottom = Math.max(out.bottom, dy + blur + spread);
        out.top = Math.max(out.top, -dy + blur + spread);
        out.right = Math.max(out.right, dx + blur + spread);
        out.left = Math.max(out.left, -dx + blur + spread);
      }
      return out;
    };

    const rows = [];
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      const scrolls = /(auto|scroll)/.test(cs.overflowX) || /(auto|scroll)/.test(cs.overflowY);
      if (!scrolls) continue;
      const pad = {
        top: parseFloat(cs.paddingTop) || 0,
        bottom: parseFloat(cs.paddingBottom) || 0,
        left: parseFloat(cs.paddingLeft) || 0,
        right: parseFloat(cs.paddingRight) || 0,
      };
      const kids = [];
      /* Every descendant, not just children: the card is usually wrapped in a
         sizing div, so the shadow is a grandchild of the row that clips it. */
      for (const kid of el.querySelectorAll('*')) {
        const r = reachOf(getComputedStyle(kid).boxShadow);
        if (!r) continue;
        /* Only the nearest scroller clips it. */
        let p = kid.parentElement;
        let nearest = null;
        while (p) {
          const pcs = getComputedStyle(p);
          if (/(auto|scroll)/.test(pcs.overflowX) || /(auto|scroll)/.test(pcs.overflowY)) { nearest = p; break; }
          p = p.parentElement;
        }
        if (nearest !== el) continue;
        kids.push({ reach: r, shadow: getComputedStyle(kid).boxShadow, tag: kid.tagName });
      }
      if (kids.length) rows.push({ pad, kids, desc: el.className || el.tagName });
    }
    return rows;
  });

  for (const row of found) {
    scrollers += 1;
    for (const kid of row.kids) {
      shadows += 1;
      for (const side of ['top', 'bottom', 'left', 'right']) {
        const need = Math.round(kid.reach[side]);
        const have = Math.round(row.pad[side]);
        const key = `${label}|${row.desc}|${side}`;
        if (need > 0 && have < need && !seen.has(key)) {
          seen.add(key);
          fails.push(`${label}: a scrolling row clips its ${kid.tag}'s shadow on the ${side}.`
            + `\n      The shadow reaches ${need} points and the row allows ${have}.`
            + `\n      overflow-x: auto computes overflow-y to auto as well, so this row clips`
            + '\n      what its children draw outside it, and the cut is a straight line exactly'
            + '\n      where the blur is still strong. Pad the row by the shadow\'s own reach.');
        }
      }
    }
  }
}

await page.close();
server.close();
rmSync(dir, { recursive: true, force: true });

if (!scrollers || !shadows) {
  console.error(`[check-shadow-room] found ${scrollers} scrolling rows and ${shadows} shadowed`
    + ' children inside them, which cannot be right: the In Practice shelves are scrolling rows of'
    + ' shadowed cards. Refusing to pass.');
  process.exit(1);
}

if (fails.length) {
  console.error('[check-shadow-room] A shadow is being cut off by the box around it:');
  for (const f of fails) console.error(`  ${f}`);
  process.exit(1);
}

console.log(`[check-shadow-room] ${scrollers} scrolling rows over 2 widths, ${shadows} shadowed`
  + ' cards inside them, every shadow with room to finish on all four sides.');
