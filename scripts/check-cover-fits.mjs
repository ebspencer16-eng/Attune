/**
 * An exercise cover page fits the window it is opened in.
 *
 * THE PROMISE. Ellie: "Exercise cover pages should fit on one screen/window
 * without having to scroll. Size should adapt based on device and viewing
 * window size."
 *
 * A cover is the first thing a person sees when they start an exercise. If it
 * runs past the fold, the button that starts the exercise is below it, which
 * is the one control the page exists for.
 *
 * WHAT IS MEASURED: the scroll height of the document against the height of
 * the window, for every exercise the registry lists, at four sizes. A page
 * that needs more than its window is a page that scrolls. A few points of
 * slack is allowed for sub-pixel rounding and nothing more.
 *
 * WHAT THIS DOES NOT COVER, so nobody reads it as "no page in the product
 * scrolls": the website only. The app's covers are Expo components that no
 * browser gate here renders, and `scripts/probe-cover-fits.mjs` drives those
 * through the Expo web build. The two have different layout engines and the
 * same rule.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { launch } from './_lib/browser.mjs';
import { EXERCISES as REGISTRY } from '../api/_exercises.js';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
if (!existsSync(join(DIST, 'index.html'))) {
  console.error('[check-cover-fits] dist/ is not built. Run `npx vite build` first.');
  process.exit(1);
}

/* The package each exercise needs before its view is reachable at all, and the
   storage key that grants a standalone one. Same shape as
   check-exercise-flow's TUNING, and deliberately a separate small table: this
   gate opens a cover and never answers a question. */
const PKG = {
  ex1: { pkg: 'core' },
  ex2: { pkg: 'core' },
  ex3: { pkg: 'premium' },
  /* An add-on is not part of premium, so `pkg=premium` leaves its view
     rendering nothing at all. The first run of this gate reported "no start
     button" for intimacy at every size and that was the truth about a page it
     had never managed to open. Same dev flag check-exercise-flow uses. */
  intimacy: { pkg: 'premium', grant: 'attune_dev_intimacy' },
  conflict: { pkg: 'premium' },   // premium owns this one outright
};

/* Four windows, chosen as the shapes a person actually opens this in. Height
   is what binds, so the short laptop window is the one that matters most. */
const SIZES = [
  { name: 'phone',          width: 390,  height: 844 },
  { name: 'tablet',         width: 834,  height: 1112 },
  { name: 'laptop',         width: 1280, height: 800 },
  { name: 'short window',   width: 1280, height: 620 },
];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let file = join(DIST, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!existsSync(file) || !extname(file)) file = join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'text/plain' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
const BASE = `http://127.0.0.1:${PORT}`;

const covers = REGISTRY.filter((e) => PKG[e.key]);
if (covers.length !== REGISTRY.length) {
  console.error('[check-cover-fits] api/_exercises.js lists an exercise this gate has no entry for,');
  console.error('so a run would report a clean pass over a cover it never opened.');
  process.exit(1);
}

const fails = [];
const rows = [];

for (const size of SIZES) {
  const page = await launch({ width: size.width, height: size.height });
  try {
    for (const e of covers) {
      if (PKG[e.key].grant) {
        await page.goto(`${BASE}/`);
        await page.evaluate((k) => { try { localStorage.setItem(k, '1'); } catch { /* private mode */ } }, PKG[e.key].grant);
      }
      await page.goto(`${BASE}/?fresh=1&pkg=${PKG[e.key].pkg}&view=${e.view}`);
      await new Promise((r) => setTimeout(r, 900));
      /* ── THE SHEET OVER THE COVER ────────────────────────────────────────
         The three premium exercises open an account sheet over their cover
         for a signed-out visitor, and the first version of this gate measured
         the document with that sheet in it: it reported intimacy as having no
         start button at all and conflict as 891 points, neither of which was
         about the cover. check-exercise-flow's own comments record the same
         sheet. Closed before anything is measured. */
      const closed = await page.evaluate(() => {
        const t = (document.body.innerText || '');
        if (!/Create account|Set up your profile/i.test(t)) return false;
        const x = [...document.querySelectorAll('button')]
          .find((b) => /^(✕|×|close)$/i.test((b.textContent || '').trim()));
        if (!x) return 'no close control';
        x.click();
        return true;
      });
      if (closed === 'no close control') {
        fails.push(`${e.key} at ${size.name}: an account sheet covers the page and has no close control, so the cover could not be measured.`);
        continue;
      }
      if (closed) await new Promise((r) => setTimeout(r, 500));
      const m = await page.evaluate(() => {
        const d = document.documentElement;
        /* The cover is the card; the question is whether the DOCUMENT needs
           more room than the window, which is what makes a person scroll. */
        const btn = [...document.querySelectorAll('button')]
          .find((b) => /^(start|begin)/i.test((b.textContent || '').trim()));
        const r = btn ? btn.getBoundingClientRect() : null;
        return {
          doc: Math.max(d.scrollHeight, document.body.scrollHeight),
          win: window.innerHeight,
          buttonBottom: r ? Math.round(r.bottom) : null,
          hasButton: !!btn,
          empty: ((document.getElementById('root') || document.body).innerText || '').trim().length < 40,
        };
      });
      const over = m.doc - m.win;
      rows.push({ size: size.name, key: e.key, ...m, over });
      if (m.empty) {
        fails.push(`${e.key} at ${size.name}: the view rendered nothing at all, so no cover was measured.`);
        continue;
      }
      if (!m.hasButton) {
        fails.push(`${e.key} at ${size.name} (${size.width}x${size.height}): no start button on the cover, so nothing was measured.`);
        continue;
      }
      if (over > 4) {
        fails.push(`${e.key} at ${size.name} (${size.width}x${size.height}): the page needs ${m.doc} points in a ${m.win} point window, so it scrolls by ${over}.`);
      } else if (m.buttonBottom > m.win) {
        fails.push(`${e.key} at ${size.name} (${size.width}x${size.height}): the start button ends at ${m.buttonBottom}, below the ${m.win} point fold.`);
      }
    }
  } finally {
    await page.close?.();
  }
}
server.close();

if (fails.length) {
  console.error('[check-cover-fits] a cover page does not fit its window:\n');
  for (const f of fails) console.error('  ' + f);
  console.error('\nEllie: "Exercise cover pages should fit on one screen/window without having');
  console.error('to scroll. Size should adapt based on device and viewing window size."');
  process.exit(1);
}
const worst = rows.reduce((a, b) => (b.over > a.over ? b : a), rows[0]);
console.log(`[check-cover-fits] ${covers.length} covers at ${SIZES.length} window sizes, all inside the fold with the start button visible; the tightest is ${worst.key} at ${worst.size}, ${worst.doc} points in ${worst.win}.`);
