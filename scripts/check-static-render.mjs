// Renders every static page in a real browser and reports the ones that throw
// or come up empty.
//
// ── WHY ────────────────────────────────────────────────────────────────────
// check-render.mjs draws the thirty results sections and thirteen views of the
// single-page app. Nothing drew the other half of the site: home, offerings,
// checkout, faq, purpose, practice and the twelve In Practice articles, forty
// pages in all, including the one where people pay.
//
// Those pages are hand-written HTML with inline script. A stray brace in a
// checkout handler is not a build error, because nothing builds them; it is a
// console error on a page that then does nothing when a button is pressed.
// That is the failure Ellie keeps reporting in the words "blank page" and "it
// took me to the website and nothing happened".
//
// ── HONESTY ABOUT WHAT THIS HAS CAUGHT ─────────────────────────────────────
// Nothing, yet. Every other gate in this repo exists because a specific bug
// shipped, and this one does not. It is here because the asymmetry was the
// finding: the app half of the site has eight checks and the paid half had
// none. Three real bugs were found by hand on those pages the same day this
// was written, all of them in links rather than script, so this catches a
// different kind and the link gate catches theirs.
//
// ── WHAT IT CHECKS ─────────────────────────────────────────────────────────
// Each page loads, throws no uncaught error, logs no console error, and has
// more than a header's worth of text on it. 404s for images are ignored: the
// preview server does not carry everything production does.
//
// Runs from `npm run smoke`, which builds and serves first.

import { readdirSync } from 'fs';
import { join } from 'path';

import { launch } from './_lib/browser.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const BASE = process.env.BASE || 'http://localhost:4173';
const DIST = join(ROOT, 'dist');

const pages = [];
try {
  for (const f of readdirSync(DIST)) {
    if (f.endsWith('.html') && f !== 'index.html') pages.push('/' + f);
  }
  for (const f of readdirSync(join(DIST, 'practice'))) {
    if (f.endsWith('.html')) pages.push('/practice/' + f);
  }
} catch {
  console.error('[check-static-render] no dist/ to read. Run `npm run smoke`, which builds first.');
  process.exit(1);
}

if (pages.length < 20) {
  console.error(`[check-static-render] only found ${pages.length} pages; refusing to pass.`);
  process.exit(1);
}

const page = await launch({ width: 1200, height: 900 });
const errors = [];
page.on('pageerror', (t) => errors.push('pageerror: ' + String(t).slice(0, 200)));
page.on('console', (m) => {
  if (m.type !== 'error') return;
  // A missing asset on the preview server is not a broken page.
  if (/404|Failed to load resource|net::ERR/.test(m.text)) return;
  errors.push('console: ' + m.text.slice(0, 200));
});

let failed = 0;
for (const p of pages) {
  errors.length = 0;
  await page.goto(BASE + p);
  await page.wait(1100);
  const chars = await page.evaluate(() => (document.body.innerText || '').trim().length);

  if (!errors.length && chars >= 200) continue;
  failed += 1;
  console.error(`  FAIL  ${p}${chars < 200 ? `  (only ${chars} characters on the page)` : ''}`);
  for (const e of errors.slice(0, 3)) console.error(`        ${e}`);
}

if (failed) {
  console.error(`\n[check-static-render] ${failed} of ${pages.length} static pages failed.`);
  process.exit(1);
}

console.log(`[check-static-render] ${pages.length} static pages render clean.`);
process.exit(0);
