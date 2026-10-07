#!/usr/bin/env node
/**
 * Every piece of text on the static site, measured against what is behind it.
 *
 * ── WHY THIS IS A REPORT AND NOT A GATE ───────────────────────────────────
 * Because what it finds is a decision Ellie has to make, not a bug I can fix.
 * Most of the failures are the brand orange used as small text and the muted
 * grey used for eyebrows, and changing either is a palette change.
 *
 * It is named report-* rather than check-* on purpose: check-gates-run holds
 * every check-*.mjs to being wired into the build, and a check that fails on
 * code nobody has agreed to change yet would just be turned off.
 *
 * ── WHY IT EXISTS AT ALL ──────────────────────────────────────────────────
 * check-ground-contrast was built from Ellie's own words, "The content is hard
 * to read against these colors", and it covers the results grounds and the
 * app's. The marketing pages, the checkout, the feedback form and the In
 * Practice articles were never measured, and that is where most of the small
 * print lives.
 *
 * ── HOW IT MEASURES ───────────────────────────────────────────────────────
 * It walks the rendered page, takes each element's own text, composites the
 * colour over whatever opaque background is behind it, and compares. Text over
 * a background IMAGE or a gradient is skipped rather than guessed at, which is
 * the honest answer: a ratio against a colour that is not there is worse than
 * no ratio.
 *
 * The threshold is the standard: 4.5 to 1 for body text, 3 to 1 for large or
 * bold text, which is what WCAG AA asks and what the results grounds are
 * already held to.
 *
 *   node scripts/report-contrast.mjs
 *
 * It needs dist/, so run `npx vite build` first.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { launch } from './_lib/browser.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const server = createServer((q, res) => {
  let p = q.url.split('?')[0];
  if (p.endsWith('/')) p += 'index.html';
  if (!/\.[a-z]+$/.test(p)) p += '.html';
  const f = join(DIST, p);
  if (!existsSync(f)) { res.writeHead(404); res.end('no'); return; }
  const t = f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css'
    : f.endsWith('.png') ? 'image/png' : f.endsWith('.svg') ? 'image/svg+xml' : 'text/html';
  res.writeHead(200, { 'Content-Type': t }); res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const P = server.address().port;

const pages = readdirSync(DIST).filter((f) => f.endsWith('.html') && f !== 'index.html')
  .map((f) => '/' + f.replace(/\.html$/, ''));
for (const f of readdirSync(join(DIST, 'practice'))) {
  if (f.endsWith('.html')) pages.push('/practice/' + f.replace(/\.html$/, ''));
}

const page = await launch({ width: 1280, height: 1000 });
const all = [];
for (const url of pages) {
  await page.goto(`http://127.0.0.1:${P}${url}`);
  await page.wait(500);
  const bad = await page.evaluate(() => {
    const parse = (c) => {
      const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
      return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
    };
    const lum = ({ r, g, b }) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const over = (fg, bg) => ({
      r: fg.r * fg.a + bg.r * (1 - fg.a),
      g: fg.g * fg.a + bg.g * (1 - fg.a),
      b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1,
    });
    const bgOf = (el) => {
      let n = el;
      let acc = null;
      while (n && n !== document.documentElement) {
        const cs = getComputedStyle(n);
        /* An image or a gradient behind the text makes this unmeasurable, so
           say so rather than guessing at a colour. */
        if (cs.backgroundImage && cs.backgroundImage !== 'none') return 'image';
        const c = parse(cs.backgroundColor);
        if (c && c.a > 0) { acc = acc ? over(acc, c) : c; if (acc.a >= 1 || c.a >= 1) return acc; }
        n = n.parentElement;
      }
      return acc || { r: 255, g: 255, b: 255, a: 1 };
    };
    const out = [];
    for (const el of document.querySelectorAll('p,h1,h2,h3,h4,li,a,span,button,label,td,th,div')) {
      const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
      if (text.length < 12) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.3) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 6) continue;
      const fg = parse(cs.color); if (!fg) continue;
      const bg = bgOf(el);
      if (bg === 'image') continue;
      const eff = fg.a < 1 ? over(fg, bg) : fg;
      const L1 = Math.max(lum(eff), lum(bg)); const L2 = Math.min(lum(eff), lum(bg));
      const ratio = (L1 + 0.05) / (L2 + 0.05);
      const size = parseFloat(cs.fontSize);
      const bold = Number(cs.fontWeight) >= 700;
      const large = size >= 24 || (bold && size >= 18.66);
      const need = large ? 3 : 4.5;
      if (ratio < need) {
        out.push({ ratio: Math.round(ratio * 100) / 100, need, size: Math.round(size),
          color: cs.color, bg: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`,
          text: text.slice(0, 54) });
      }
    }
    return out;
  });
  for (const b of bad) all.push({ url, ...b });
}
await page.close(); server.close();

const seen = new Set();
const uniq = all.filter((x) => { const k = x.color + x.bg + x.size; if (seen.has(k)) return false; seen.add(k); return true; });
console.log(`${pages.length} pages; ${all.length} text runs below the ratio, ${uniq.length} distinct colour pairs:\n`);
for (const x of uniq.sort((a, b) => a.ratio - b.ratio)) {
  console.log(`${String(x.ratio).padStart(5)}:1 (needs ${x.need})  ${String(x.size).padStart(3)}px  ${x.color} on ${x.bg}`);
  console.log(`         ${x.url}  "${x.text}"`);
}
