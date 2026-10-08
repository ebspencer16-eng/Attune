#!/usr/bin/env node
/**
 * No page scrolls sideways on a phone.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * CLAUDE.md has said for a long time that the page body must never scroll
 * horizontally. Nothing measured it, and I broke it.
 *
 * Putting the canonical nav on the seventeen In Practice pages fixed a real
 * drift and exposed a second one: five of those pages, the section indexes,
 * have no rule collapsing the nav to the hamburger on a narrow screen. The
 * twelve article pages beside them have had one all along. The nav they used to
 * carry was narrow enough to fit without it; the canonical one is not, so those
 * five pushed eleven points past the right edge at 360 and at 320.
 *
 * Measured before and after to be sure it was mine: zero before the nav change,
 * eleven after, on exactly those five.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * Every built page at two phone widths, and it names what sticks out rather
 * than only that something does: the outermost element whose right edge is past
 * the viewport, which is the one worth looking at. An element inside another
 * overflowing element is a symptom.
 *
 * Fixed-position elements are skipped. A drawer parked off-screen at
 * `right: -100%` is how a mobile menu is built, and flagging it would teach
 * people to ignore this.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The React app, which is one page and renders per view; check-screen-slack and
 * check-proportional-layout are the app's side of this. And deliberate sideways
 * scrolling inside a container, like the In Practice shelves, which is a row
 * that scrolls on purpose and does not move the page.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { launch } from './_lib/browser.mjs';
const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
/**
 * The smoke already has a server; use it rather than starting a second one.
 *
 * Run standalone this serves dist/ itself. Run from the smoke it is handed
 * BASE, and starting another server and another browser beside the one already
 * going is how a loaded machine produces "Chrome did not report a debugging
 * port within 20s", which reads exactly like a broken check and is not one.
 */
const EXTERNAL = process.env.BASE || null;
const server = EXTERNAL ? null : createServer((q, res) => {
  let p = q.url.split('?')[0];
  if (p.endsWith('/')) p += 'index.html';
  if (!/\.[a-z]+$/.test(p)) p += '.html';
  const f = join(DIST, p);
  if (!existsSync(f)) { res.writeHead(404); res.end('no'); return; }
  const t = f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css'
    : f.endsWith('.png') ? 'image/png' : f.endsWith('.svg') ? 'image/svg+xml' : 'text/html';
  res.writeHead(200, { 'Content-Type': t }); res.end(readFileSync(f));
});
if (server) await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = EXTERNAL || `http://127.0.0.1:${server.address().port}`;
const fails = [];
const pages = readdirSync(DIST).filter((f) => f.endsWith('.html') && f !== 'index.html')
  .map((f) => '/' + f.replace(/\.html$/, ''));
for (const f of readdirSync(join(DIST, 'practice'))) if (f.endsWith('.html')) pages.push('/practice/' + f.replace(/\.html$/, ''));

for (const [label, w] of [['phone 360', 360], ['small phone 320', 320]]) {
  const page = await launch({ width: w, height: 760 });
  console.log(`\n══ ${label} ══`);
  let clean = 0;
  for (const url of pages) {
    await page.goto(`${ORIGIN}${url}`);
    await page.wait(400);
    const m = await page.evaluate(() => {
      const doc = document.documentElement;
      /* TWO measurements, because the first one alone is blind on most of the
         site. Seventeen pages set `overflow-x: hidden` (and `clip`) on html and
         body, which is a deliberate guard against sideways scroll, and it means
         scrollWidth never exceeds clientWidth no matter what sticks out. The
         content is not scrolled to, it is CUT OFF, which is worse and
         invisible to a scroll check. Planted a 900 point element on /home and
         the scroll check passed while the element sat 540 points past the
         edge. */
      const over = doc.scrollWidth - doc.clientWidth;
      const W = doc.clientWidth;
      const past = [];
      for (const el of document.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        if (r.right <= W + 1) continue;
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed') continue;
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        /* Inside something that scrolls sideways on purpose, like the In
           Practice shelves, which are a row that scrolls and does not move the
           page. */
        let p = el.parentElement; let inScroller = false;
        while (p) {
          const pc = getComputedStyle(p);
          if (/(auto|scroll)/.test(pc.overflowX) && p.scrollWidth > p.clientWidth) { inScroller = true; break; }
          p = p.parentElement;
        }
        if (inScroller) continue;
        /* The outermost offender only: an element inside another overflowing
           element is a symptom. */
        if (el.parentElement && el.parentElement.getBoundingClientRect().right > W + 1) continue;
        past.push({ tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0, 34),
          past: Math.round(r.right - W), text: (el.textContent || '').trim().slice(0, 36) });
      }
      if (over <= 1 && !past.length) return { over: 0, past: [] };
      /* What actually sticks out past the right edge. */
      const w = doc.clientWidth;
      const culprits = [];
      for (const el of document.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right <= w + 1) continue;
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed') continue;
        /* Only the outermost offender in a chain. */
        if (el.parentElement && el.parentElement.getBoundingClientRect().right > w + 1) continue;
        culprits.push({ tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 40),
          right: Math.round(r.right), text: (el.textContent || '').trim().slice(0, 40) });
      }
      return { over, past: past.slice(0, 3), culprits: culprits.slice(0, 3) };
    });
    if (!m.over && !(m.past || []).length) { clean += 1; continue; }
    if (m.over) {
      const who = (m.culprits || []).map((c) => `<${c.tag} class="${c.cls}">`).join(', ') || 'nothing nameable';
      fails.push(`${label}: ${url} scrolls sideways by ${m.over}px. Pushed out by ${who}`);
    }
    for (const c of m.past || []) {
      fails.push(`${label}: ${url} draws <${c.tag} class="${c.cls}"> ${c.past}px past the right edge`
        + `, where it is cut off rather than scrolled to. "${c.text}"`);
    }
  }
  console.log(`  ${clean} of ${pages.length} pages clean`);
  await page.close();
}
if (server) server.close();

if (!pages.length) {
  console.error('[check-no-sideways-scroll] found no pages in dist/ to measure.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}
if (fails.length) {
  console.error('[check-no-sideways-scroll] a page scrolls sideways on a phone:');
  for (const f of fails) console.error(`  ${f}`);
  console.error('');
  console.error('The usual cause is a nav that does not collapse to the hamburger, or a fixed');
  console.error('width on something inside the page. CLAUDE.md: the body must never scroll');
  console.error('horizontally, and wide content scrolls inside its own container.');
  process.exit(1);
}
console.log(`[check-no-sideways-scroll] ${pages.length} pages at 2 phone widths; none scrolls sideways`
  + ' and nothing is drawn past the right edge, which is the half a scroll check cannot see on the'
  + ' 17 pages that clip.');
