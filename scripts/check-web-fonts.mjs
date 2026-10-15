#!/usr/bin/env node
/**
 * Every face the website draws is a face it loaded.
 *
 * ── WHAT A SWEEP FOUND ────────────────────────────────────────────────────
 * Ellie: "can we run more sweeps like this throughout our products?"
 *
 * This one loaded every page and compared, for every piece of visible text,
 * the family and weight and style the browser computed against the faces that
 * actually arrived. Thirty-five mismatches:
 *
 *   DM Sans 700            203 nodes on 10 pages, which asked for 600 and
 *                          below. Every bold line on them was the browser
 *                          smearing 600.
 *   DM Sans italic          70 nodes on 13 pages. No page loaded any italic
 *                          DM Sans at all, so the mobile menu's sub-items
 *                          were a synthetic slant everywhere.
 *   DM Mono 700             55 nodes in the admin. DM Mono has no 700: Google
 *                          silently drops the request and serves 300, 400 and
 *                          500. Its bold is 500.
 *   Playfair 400 italic      1 node, a pull quote on the home page.
 *
 * And the other direction: Syne was loaded by index.html and by src/App.jsx,
 * in three weights, and drawn by nothing. Playfair 900 likewise.
 *
 * This is the website's version of the bug CLAUDE.md records for iOS: a
 * registered family asked for a face it does not have. iOS draws the upright
 * and says nothing; a browser smears the nearest and says nothing. Both
 * render, both are wrong, and neither fails.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 * 1. Nothing is drawn in a face the page did not load.
 * 2. Nothing is loaded that nothing draws.
 * 3. One font URL across the whole website, so a visitor downloads the faces
 *    once rather than a different subset per page. There were eight different
 *    URLs before this.
 *
 * ── HOW, AND WHY NOT BY READING ───────────────────────────────────────────
 * By loading the pages. The question is what the BROWSER resolved, which no
 * amount of reading CSS answers: the weight comes from a cascade, the family
 * from a variable, and the face list from a stylesheet on someone else's
 * server.
 *
 * Three things about the measurement cost an hour each and are worth knowing.
 * `document.fonts.check()` answers whether text can be drawn, which is true
 * for a face about to be synthesised, so it cannot see this bug at all.
 * `document.fonts.status` is 'loaded' at t=0, before the stylesheet has
 * arrived, because nothing is pending yet; the face count going up and then
 * settling is the signal. And a column headed "weight" hid the word italic
 * for three runs: half the findings were a style, not a weight.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The app, whose fonts are bundled files rather than a stylesheet and which
 * check-fonts.mjs already holds.
 *
 * Not whether a weight is the right weight. That is Ellie's.
 */

import { createServer } from 'node:http';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { launch } from './_lib/browser.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = `${ROOT}dist`;
if (!existsSync(DIST)) {
  console.error('[check-web-fonts] dist/ is not built. Run `npx vite build` first.');
  process.exit(1);
}

/** The families the site ships. A system stack needs no file. */
const OURS = /^(DM Sans|Playfair Display|DM Mono|Syne)$/;

const fails = [];
const notes = [];

// ── 3. One URL, everywhere ──────────────────────────────────────────────────
{
  const urls = new Map();
  const walk = (dir) => {
    for (const f of readdirSync(`${ROOT}${dir}`)) {
      const rel = `${dir}/${f}`;
      if (!/\.(html|jsx?)$/.test(f)) {
        try { if (readdirSync(`${ROOT}${rel}`)) walk(rel); } catch { /* a file */ }
        continue;
      }
      const src = readFileSync(`${ROOT}${rel}`, 'utf8');
      for (const m of src.matchAll(/https:\/\/fonts\.googleapis\.com\/css2\?[^"'\s)]+/g)) {
        const list = urls.get(m[0]) || [];
        if (!list.includes(rel)) list.push(rel);
        urls.set(m[0], list);
      }
    }
  };
  walk('public');
  for (const rel of ['index.html', 'src/App.jsx']) {
    const src = readFileSync(`${ROOT}${rel}`, 'utf8');
    for (const m of src.matchAll(/https:\/\/fonts\.googleapis\.com\/css2\?[^"'\s)]+/g)) {
      const list = urls.get(m[0]) || [];
      if (!list.includes(rel)) list.push(rel);
      urls.set(m[0], list);
    }
  }

  if (!urls.size) {
    fails.push('No page names a Google Fonts stylesheet. Refusing to pass: a gate that has lost its subject must never report success.');
  }
  /**
   * The WHOLE request, not the family names.
   *
   * The first version compared which families each URL asked for, and a plant
   * that put one page back on `Playfair+Display:wght@700;900` walked through
   * it: same two families, different weights, a second stylesheet and a
   * second set of font files for anyone who visits both pages. Match the name
   * with what follows it.
   *
   * The admin asks for one family more, which is the only legitimate second
   * URL: nothing else on the site is set in a monospace. So a second URL is
   * allowed when it is the first plus a family, and nothing else.
   */
  const seen = [...urls.entries()].sort((a, b) => b[1].length - a[1].length);
  const [canonical, canonWhere] = seen[0];
  const extras = seen.slice(1);
  for (const [u, where] of extras) {
    /* Everything the canonical asks for, still asked for, in the same words. */
    const added = u.replace('&display=swap', '').replace(canonical.replace('&display=swap', ''), '');
    const isCanonPlusFamily = u.startsWith(canonical.replace('&display=swap', ''))
      && /^(&family=[^&]+)+$/.test(added);
    if (!isCanonPlusFamily) {
      fails.push(`${where.join(', ')} ${where.length === 1 ? 'asks' : 'ask'} for fonts differently from the other ${canonWhere.length} files:\n`
        + `        this: ${u.replace('https://fonts.googleapis.com/css2?', '').slice(0, 150)}\n`
        + `        rest: ${canonical.replace('https://fonts.googleapis.com/css2?', '').slice(0, 150)}\n`
        + '      A visitor moving between pages downloads a second stylesheet and a second set'
        + ' of files. One URL for the site, plus the admin\'s, which adds a monospace and'
        + ' changes nothing else.');
    }
  }
  if (!extras.length || extras.every(([u]) => u.startsWith(canonical.replace('&display=swap', '')))) {
    notes.push(`${urls.size} font URL${urls.size === 1 ? '' : 's'} across ${[...urls.values()].flat().length} files, every one of them the same request`);
  }
}

// ── 1 and 2. What is drawn against what arrived ─────────────────────────────
const server = createServer((req, res) => {
  const u = req.url.split('?')[0];
  for (const f of [u, `${u}.html`]) {
    try {
      const b = readFileSync(DIST + f);
      res.writeHead(200, {
        'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html',
      });
      return res.end(b);
    } catch { /* next */ }
  }
  res.writeHead(404);
  res.end('no');
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

/* A phone, because the mobile menu is where the italics live and it is not
   drawn at a desktop width. */
const page = await launch({ width: 390, height: 844 });
const pages = readdirSync(DIST).filter((f) => f.endsWith('.html')).sort();
const drawn = new Set();
const declared = new Set();
const faked = [];
let measured = 0;

try {
  for (const f of pages) {
    await page.goto(`${base}/${f}`);
    /* Poll until the face set stops growing. Not `status`, which is 'loaded'
       before the stylesheet has arrived. */
    let last = -1;
    for (let i = 0; i < 60; i++) {
      const n = await page.evaluate(() => (document.fonts.status === 'loaded' ? document.fonts.size : -1));
      if (n > 0 && n === last) break;
      last = n;
      await page.wait(250);
    }

    const m = await page.evaluate(() => {
      const faces = [...new Set([...document.fonts].map((ff) => `${ff.family}|${ff.weight}|${ff.style}`))];
      const want = new Map();
      for (const el of document.querySelectorAll('body *')) {
        if (el.children.length) continue;
        const t = (el.textContent || '').trim();
        if (!t) continue;
        const s = getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden') continue;
        const fam = s.fontFamily.split(',')[0].replace(/["']/g, '').trim();
        const k = `${fam}|${s.fontWeight}|${s.fontStyle}`;
        if (!want.has(k)) want.set(k, t.slice(0, 40));
      }
      return { faces, want: [...want.entries()] };
    });

    if (!m.faces.length && !/404|email-preview|portal|workbook-render/.test(f)) continue;
    measured += 1;

    for (const [k, sample] of m.want) {
      const [fam, weight, style] = k.split('|');
      if (!OURS.test(fam)) continue;
      drawn.add(fam);
      const have = m.faces.some((face) => {
        const [ffam, fweight, fstyle] = face.split('|');
        if (ffam !== fam || fstyle !== style) return false;
        /* A variable face reports a range, "300 800". */
        const r = String(fweight).split(/\s+/).map(Number);
        const n = Number(weight);
        return r.length > 1 ? n >= r[0] && n <= r[1] : r[0] === n;
      });
      if (!have) faked.push({ f, fam, weight, style, sample });
    }

    /* And the other direction, gathered here and judged below. Per page it
       would be wrong: one stylesheet serves the whole site, and a browser
       fetches a face only when some text needs it, so a page that draws no
       Playfair downloads no Playfair. What costs is a family NOTHING draws,
       which is only answerable once every page has been looked at. */
    for (const fam of new Set(m.faces.map((x) => x.split('|')[0]).filter((x) => OURS.test(x)))) {
      declared.add(fam);
    }
  }
} finally {
  await page.close();
  server.close();
}

if (measured < 15) {
  fails.push(`Only ${measured} pages could be measured and there were 19 when this was written. If pages were retired, lower this figure; otherwise the wait is racing the stylesheet again.`);
}

/**
 * A family asked for and drawn by nothing, anywhere.
 *
 * Syne was in index.html's stylesheet and in src/App.jsx's, at three weights,
 * and no text in the product has ever been set in it. That is the shape this
 * catches: not "unused on this page", which is normal and free, but "unused
 * on every page", which is a request nobody needed.
 */
for (const fam of declared) {
  if (!drawn.has(fam)) {
    fails.push(`${fam} is requested by the site's stylesheet and no text anywhere is drawn in it. Take it out of the URL: a family nothing uses is a line in a request every visitor makes.`);
  }
}
if (!fails.length && declared.size) {
  notes.push(`${declared.size} families requested, every one of them drawn somewhere`);
}

if (faked.length) {
  const by = new Map();
  for (const r of faked) {
    const k = `${r.fam} ${r.weight} ${r.style}`;
    if (!by.has(k)) by.set(k, { pages: [], sample: r.sample });
    by.get(k).pages.push(r.f.replace('.html', ''));
  }
  fails.push(`${faked.length} place${faked.length === 1 ? '' : 's'} where text is drawn in a face the page never loaded:\n`
    + [...by.entries()].map(([k, v]) =>
      `      ${k}  on ${v.pages.length} page${v.pages.length === 1 ? '' : 's'} (${v.pages.slice(0, 5).join(', ')}${v.pages.length > 5 ? ', …' : ''})\n        e.g. "${v.sample}"`).join('\n')
    + '\n      The browser smears the nearest face and reports nothing. Add the weight or the'
    + ' style to the font URL, or stop asking for it in the CSS.');
} else {
  notes.push(`${measured} pages: every family, weight and style drawn is one that arrived`);
}

for (const n of notes) console.log(`  ok  ${n}`);
if (fails.length) {
  console.error(`\ncheck-web-fonts: ${fails.length} problem${fails.length === 1 ? '' : 's'}\n`);
  for (const f of fails) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\n[check-web-fonts] ${measured} pages, one font request, and nothing drawn in a face that was never loaded.`);
