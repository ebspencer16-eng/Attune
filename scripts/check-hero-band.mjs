#!/usr/bin/env node
/**
 * Every navy hero carries a line top and bottom, and none of them carries a
 * button.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Two of Ellie's, in one message. "Add a gradient line to the bottom of each
 * marketing page's hero banner - should separate navy section from the rest of
 * the page content." And: "FAQs is the only marketing page with a CTA in the
 * hero banner. Please remove that so that the banner is the same height as the
 * other pages'."
 *
 * So the hero is one shape across the six pages that have one: the navy band,
 * the three-colour line where it starts, the same line where it ends, a title,
 * a description, and nothing else.
 *
 * ── WHY IT IS NOT PART OF check-chrome ────────────────────────────────────
 * That gate compares the nav, the footer and the mobile menu across pages, and
 * its header says the hero's style block is deliberately out of scope: it has
 * drifted seven ways and "a gate that guesses at a design decision will encode
 * the guess". Still true of the whole block. What is no longer a guess is the
 * part Ellie has now decided, which is the two lines and the absence of a
 * button, so that part and only that part is held here.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * By loading each page and measuring. A pseudo-element is not in the markup,
 * so reading the file can only find the rule, and a rule can be overridden by
 * the next one down: three of these pages set `.page-header` twice and one of
 * them sets it three times, all with `!important`. getComputedStyle on the
 * pseudo-element is what the page actually draws.
 *
 * It also measures the hero's height on every page, because "the same height
 * as the other pages'" is the reason she gave, and a CTA removed from the
 * markup while a min-height stayed behind would satisfy the first check and
 * not the request.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Not the rest of the hero block: the title's size, the description's width,
 * the glow. Those are the seven-way drift check-chrome names and nobody has
 * ruled on them.
 *
 * Not the pages with no navy hero. home.html and contact.html build their own
 * first screen, legal.html and start.html are not marketing pages, and a gate
 * that insisted on a `.page-header` everywhere would be inventing a rule she
 * has not asked for.
 */

import { createServer } from 'node:http';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { launch } from './_lib/browser.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = `${ROOT}dist`;

if (!existsSync(DIST)) {
  console.error('[check-hero-band] dist/ is not built. Run `npx vite build` first.');
  process.exit(1);
}

const fails = [];
const notes = [];

/* Derived, not listed: the pages that have a navy hero are the pages that
   have one. A seventh page gets the rule the day it gets a hero. */
const PAGES = readdirSync(DIST)
  .filter((f) => f.endsWith('.html'))
  .filter((f) => /class="page-header"/.test(readFileSync(`${DIST}/${f}`, 'utf8')))
  .sort();

if (PAGES.length < 6) {
  fails.push(`Found ${PAGES.length} pages with a navy hero and there were 6 when this was written: faq, offerings, practice, purpose, resources, wedding-registry. If one was retired, lower this figure in the same commit; otherwise the scan has lost its subject.`);
}

/* The same tiny server the other static-page gates use: dist/ over http,
   because a `file://` page cannot load its own stylesheet links the way the
   deployed one does. */
const server = createServer((req, res) => {
  const url = req.url.split('?')[0];
  for (const f of [url, `${url}.html`]) {
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
const base = `http://127.0.0.1:${server.address().port}`;

const page = await launch({ width: 1280, height: 1000 });
const heights = {};

try {
  for (const file of PAGES) {
    const name = file.replace(/\.html$/, '');
    await page.goto(`${base}/${file}`);

    const m = await page.evaluate(() => {
      const hero = document.querySelector('.page-header');
      if (!hero) return { missing: true };
      const read = (which) => {
        const s = getComputedStyle(hero, which);
        return {
          content: s.content,
          height: s.height,
          background: s.backgroundImage,
          bottom: s.bottom,
          top: s.top,
        };
      };
      /* A button is a button whatever it is called: the class, a role, or an
         anchor styled as one. Matching only `.hero-actions` would miss the
         next one, which will be written some other way. */
      const cta = [...hero.querySelectorAll('a, button')].filter((el) => {
        if (el.closest('.page-sub')) return false;       // a link in the sentence is not a button
        const cls = String(el.className || '');
        if (/btn|cta|button/i.test(cls)) return true;
        const s = getComputedStyle(el);
        return s.display !== 'inline' && parseFloat(s.paddingLeft) > 8;
      }).map((el) => `${el.tagName.toLowerCase()}.${String(el.className || '').trim().split(/\s+/)[0] || '(no class)'}: ${el.textContent.trim().slice(0, 30)}`);

      return {
        before: read('::before'),
        after: read('::after'),
        cta,
        heroHeight: Math.round(hero.getBoundingClientRect().height),
      };
    });

    if (m.missing) { fails.push(`${name}: no .page-header on the page, though the file names one.`); continue; }
    heights[name] = m.heroHeight;

    for (const [which, got] of [['::before', m.before], ['::after', m.after]]) {
      /* `content` is 'none' when the pseudo-element is not drawn at all. */
      if (!got.content || got.content === 'none') {
        fails.push(`${name}: the hero's ${which} line is not drawn (content is ${got.content}). ${which === '::after' ? 'That is the line Ellie asked for, where the navy stops.' : 'That is the line at the top of the band.'}`);
        continue;
      }
      if (!/linear-gradient/.test(got.background)) {
        fails.push(`${name}: the hero's ${which} is drawn and is not a gradient (${got.background}).`);
        continue;
      }
      /* The same three colours as the other line, in the same order. */
      const colours = (got.background.match(/rgb\([^)]+\)/g) || []).join(' ');
      const want = 'rgb(232, 103, 58) rgb(155, 93, 229) rgb(27, 95, 232)';
      if (colours !== want) {
        fails.push(`${name}: the hero's ${which} gradient is ${colours || got.background}, and the other line is ${want}. Two gradients is a second idea of what Attune's gradient is.`);
      }
      const h = parseFloat(got.height);
      if (!(h >= 2 && h <= 5)) {
        fails.push(`${name}: the hero's ${which} line is ${got.height} tall. It is a line, not a band.`);
      }
    }
    if (m.after.bottom !== '0px') {
      fails.push(`${name}: the hero's ::after sits at bottom ${m.after.bottom} rather than 0, so it is not where the navy stops.`);
    }

    if (m.cta.length) {
      fails.push(`${name}: the hero carries ${m.cta.length} button${m.cta.length === 1 ? '' : 's'} (${m.cta.join('; ')}). Ellie asked for none, so the banner is the same height on every page.`);
    }
    notes.push(`${name}: both lines drawn, no button, hero ${m.heroHeight}px`);
  }

  /**
   * "The same height as the other pages'" was the reason, so it is measured.
   *
   * The tolerance is 60 rather than 40 because a hero's height is its copy's
   * height once the controls are gone: purpose.html has a title that wraps to
   * three lines and is 50 points taller than the five that wrap to two. That
   * is the copy's business and not a stray control, and a gate that failed on
   * it would be asking Ellie to shorten a sentence to satisfy a number. What
   * it still catches is the thing that caused the question: a button, a second
   * paragraph or a min-height that makes one banner a different object. The
   * FAQ hero was 86 points taller than four of the others.
   */
  const vals = Object.values(heights);
  if (vals.length > 1) {
    const lo = Math.min(...vals), hi = Math.max(...vals);
    if (hi - lo > 60) {
      const worst = Object.entries(heights).sort((a, b) => b[1] - a[1]);
      fails.push(`The heroes range from ${lo}px to ${hi}px, a spread of ${hi - lo}. Tallest: ${worst.slice(0, 3).map(([k, v]) => `${k} ${v}`).join(', ')}. Shortest: ${worst.slice(-2).map(([k, v]) => `${k} ${v}`).join(', ')}.`);
    } else {
      notes.push(`heights within ${hi - lo}px of each other across ${vals.length} pages`);
    }
  }
} finally {
  await page.close();
  server.close();
}

for (const n of notes) console.log(`  ok  ${n}`);
if (fails.length) {
  console.error(`\ncheck-hero-band: ${fails.length} problem${fails.length === 1 ? '' : 's'}\n`);
  for (const f of fails) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\n[check-hero-band] ${PAGES.length} navy heroes: a gradient line where the band starts and where it stops, no button in any of them, every height within ${Math.max(...Object.values(heights)) - Math.min(...Object.values(heights))}px.`);
