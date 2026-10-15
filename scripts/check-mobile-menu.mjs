#!/usr/bin/env node
/**
 * A phone can reach the rest of the site.
 *
 * ── WHAT HAPPENED ──────────────────────────────────────────────────────────
 * Ellie: "hamburger nav is missing from site on mobile."
 *
 * Two separate faults, both invisible to every check that reads source.
 *
 * 1. On 25 of the 29 pages that have a menu button, the button was shown only
 *    below 361 points, while the inline nav links were hidden from 640, 768,
 *    860 or 900 down. Between those two numbers there was no menu and no
 *    links: every iPhone is in that gap. A D31 change had moved the button to
 *    the narrow-phone block and nothing noticed that it had left the gap.
 *
 * 2. Seventeen pages had a button that opened nothing. Twelve carried the menu
 *    markup and its styles but no `toggleMenu`, so the tap threw
 *    ReferenceError; five had the button and nothing else.
 *
 * check-chrome compares the nav, the footer and the mobile menu across pages
 * as TEXT, so identical markup that nothing can open passes it. This one
 * drives the page instead: at a phone width, find the button, click it, and
 * count the links that became visible.
 *
 * ── WHAT IS EXEMPT, AND WHY ────────────────────────────────────────────────
 * Pages with no site nav at all, each named rather than pattern-matched: the
 * checkout flow, which deliberately offers no way out; the app shell, which
 * has its own navigation; and three internal pages nobody arrives at.
 */

import { createServer } from 'node:http';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { launch } from './_lib/browser.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = `${ROOT}dist`;

if (!existsSync(DIST)) {
  console.error('[check-mobile-menu] dist/ is not built. Run `npx vite build` first.');
  process.exit(1);
}

/** No site nav, on purpose. */
const EXEMPT = new Map([
  ['/404.html', 'a bare logo, no menu: the same exemption check-chrome names'],
  ['/checkout.html', 'the checkout offers no way out of itself by design'],
  ['/gift-confirmation.html', 'the end of the checkout flow, same reason'],
  ['/index.html', 'the app shell: it draws its own navigation'],
  ['/portal.html', 'an internal redirect page'],
  ['/email-preview.html', 'internal, for reading the emails'],
  ['/feedback.html', 'the survey, which is one task and no chrome'],
  ['/workbook-render.html', 'a print target, not a page anybody visits'],
  ['/admin.html', 'the admin has a drawer of its own, not the site nav'],
]);

const server = createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url.startsWith('/api/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end('{"ok":true}');
  }
  for (const f of [url, `${url}.html`, url === '/' ? '/index.html' : `${url}/index.html`]) {
    try {
      const buf = readFileSync(DIST + f);
      res.writeHead(200, {
        'Content-Type': f.endsWith('.js') ? 'text/javascript'
          : f.endsWith('.css') ? 'text/css' : 'text/html',
      });
      return res.end(buf);
    } catch { /* next candidate */ }
  }
  res.writeHead(404);
  res.end('no');
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const pages = [
  ...readdirSync(DIST).filter((f) => f.endsWith('.html')).map((f) => `/${f}`),
  ...readdirSync(`${DIST}/practice`).filter((f) => f.endsWith('.html')).map((f) => `/practice/${f}`),
];

/* 320 is the smallest phone this site supports, 390 an iPhone 14, 430 the
   largest, and 820 the width where several pages still hide their links. 320
   is in the list because the first repair of this bug turned the button off
   below 361 while turning it on above, and three widths did not see it. */
const WIDTHS = [320, 390, 430, 820];
const problems = [];
let checked = 0;

for (const width of WIDTHS) {
  const page = await launch({ width, height: 844 });
  for (const p of pages) {
    if (EXEMPT.has(p)) continue;
    await page.goto(`http://127.0.0.1:${port}${p}`);
    await page.wait(250);
    const out = await page.evaluate(() => {
      const vis = (el) => {
        if (!el) return false;
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
      };
      const btn = [...document.querySelectorAll('.hamburger, .nav-toggle, [aria-label="Menu"]')].find(vis);
      /* The links in the bar itself: a page wide enough to show them all does
         not need a button. */
      const inline = [...document.querySelectorAll('nav a')].filter(vis).length;
      if (!btn) return JSON.stringify({ button: false, inline, links: 0 });
      /**
       * ── AND BIG ENOUGH TO HIT ────────────────────────────────────────
       * A sweep of every control on every page at 390 points found the
       * hamburger at 32 by 26, the cart at 72 by 31 and the consent banner's
       * two buttons at about 75 by 31. These are the controls a thumb goes
       * for first and they were all under the 44 Apple asks for.
       *
       * Measured, not read: the drawn box is the hit area, and three
       * different `.hamburger` rules were in the tree across 29 pages.
       *
       * NOT the consent banner's two buttons, which were the same size and are
       * fixed in public/_flags.js. That banner is written by a script which
       * does not run under this harness, so an assertion about it here would
       * have measured nothing and reported success. A check that cannot see
       * its subject is worse than no check.
       */
      const box = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height) };
      };
      const cart = [...document.querySelectorAll('.cart-btn, #nav-cart-btn')].find(vis);
      let threw = '';
      try { btn.click(); } catch (e) { threw = String(e && e.message || e); }
      const menu = [...document.querySelectorAll('.mobile-menu, #mobile-menu')].filter(vis);
      const links = menu.reduce((n, m) => n + [...m.querySelectorAll('a')].filter(vis).length, 0);
      return JSON.stringify({
        button: true, inline, links, threw,
        taps: [
          ['the menu button', box(btn)],
          ...(cart ? [['the cart button', box(cart)]] : []),
        ],
      });
    });
    const d = JSON.parse(out);
    checked += 1;

    /* 44 is Apple's figure and the one every phone guideline settles on. */
    for (const [what, b] of (d.taps || [])) {
      if (!b) continue;
      if (b.w < 44 || b.h < 44) {
        problems.push(`${p} at ${width}: ${what} is ${b.w} by ${b.h}. A thumb needs 44 by 44, and this is`
          + ' the control people reach for first on a phone. min-height and min-width widen the box'
          + ' a tap has to find without moving anything that is drawn.');
      }
    }
    if (!d.button) {
      /* No button is fine only if every section is already in the bar. Four
         links is the smallest full nav this site draws. */
      if (d.inline < 4) {
        problems.push(`${p} at ${width} points: no menu button, and only ${d.inline} link(s) in the bar.`);
      }
      continue;
    }
    if (d.threw) problems.push(`${p} at ${width} points: tapping the menu threw ${d.threw}`);
    else if (!d.links) problems.push(`${p} at ${width} points: the menu button opens nothing.`);
  }
  await page.close();
}
server.close();

if (problems.length) {
  console.error('[check-mobile-menu] a phone cannot reach the rest of the site:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('A menu button has to appear at the width the inline links disappear, and it');
  console.error('has to open something. Comparing the markup across pages cannot see either:');
  console.error('identical menus that nothing can open pass that check.');
  process.exit(1);
}

console.log(`[check-mobile-menu] ${checked} page loads across ${WIDTHS.length} phone widths:`
  + ` every page with a nav opens a menu, ${EXEMPT.size} named pages have none on purpose.`);
