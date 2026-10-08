#!/usr/bin/env node
/**
 * Every control on the site says what it is.
 *
 * ── WHAT IT FOUND ─────────────────────────────────────────────────────────
 * Nineteen form fields with no label, and all of them had a placeholder, which
 * is not a label: it disappears the moment someone types and a screen reader
 * announces an empty field. Two of them were the partner name fields ON
 * CHECKOUT, eight were the feedback form, and the labels already existed in
 * the markup a line above, simply not associated with the field. Nothing had to
 * be written; the fields had to be pointed at the words already there.
 *
 * And three duplicate ids on /home, which are SVG gradient ids. `url(#hc_g1)`
 * resolves to the FIRST element with that id, so the second copy of those three
 * cards was painting with the first copy's gradient. The definitions are
 * identical today, so nothing looks wrong, which is the whole problem: change
 * one and the other silently keeps the old one.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * On every built page: an img with no alt attribute at all, a visible form
 * field with no label and no aria-label, a link or button with no accessible
 * name, and any id used twice.
 *
 * A field wrapped in a label counts, as does `aria-labelledby` pointing at the
 * visible question text, which is how the feedback form is fixed: the question
 * is already on the screen, so the field names it rather than repeating it.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether a label says something useful. The admin's controls are labelled from
 * the ids Ellie gave them, which makes "Slz demorellen" a real label and a poor
 * sentence; it still tells a screen reader which of forty selects it is on,
 * which nothing did before. Those are internal and no customer hears them.
 *
 * An empty alt is correct and passes: `alt=""` is how you say a decorative
 * image should be skipped. A MISSING alt attribute is the bug, because then the
 * filename gets read out.
 *
 * Being honest about that half: the static site currently has ZERO `<img>`
 * tags. Every image is an SVG or a CSS background, so the alt check finds
 * nothing today and guards against the first `<img>` somebody adds. It was
 * proved by planting one of each form, because a plant whose needle is not in
 * the file proves nothing about the gate.
 *
 * Heading order, focus order, and keyboard traps. All real, none measured here.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { launch } from './_lib/browser.mjs';
const DIST = join(new URL('..', import.meta.url).pathname, 'dist');
/* The smoke already has a server; use it rather than starting a second one
   beside it, which on a loaded machine is how a spurious "Chrome did not
   report a debugging port" happens. */
const EXTERNAL = process.env.BASE || null;
const server = EXTERNAL ? null : createServer((q, r) => {
  let p = q.url.split('?')[0]; if (p.endsWith('/')) p += 'index.html';
  if (!/\.[a-z]+$/.test(p)) p += '.html';
  const f = join(DIST, p); if (!existsSync(f)) { r.writeHead(404); r.end(''); return; }
  const t = f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css'
    : f.endsWith('.png') ? 'image/png' : f.endsWith('.svg') ? 'image/svg+xml' : 'text/html';
  r.writeHead(200, { 'Content-Type': t }); r.end(readFileSync(f));
});
if (server) await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = EXTERNAL || `http://127.0.0.1:${server.address().port}`;
const pages = readdirSync(DIST).filter((f) => f.endsWith('.html') && f !== 'index.html').map((f) => '/' + f.replace(/\.html$/, ''));
for (const f of readdirSync(join(DIST, 'practice'))) if (f.endsWith('.html')) pages.push('/practice/' + f.replace(/\.html$/, ''));
const page = await launch({ width: 1280, height: 900 });
const tally = {};
for (const url of pages) {
  await page.goto(`${ORIGIN}${url}`); await page.wait(350);
  const out = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
    const name = (el) => (el.getAttribute('aria-label') || el.getAttribute('title')
      || (el.getAttribute('aria-labelledby') && (document.getElementById(el.getAttribute('aria-labelledby'))||{}).textContent)
      || el.textContent || '').trim();
    const res = [];
    for (const img of document.querySelectorAll('img')) {
      if (!vis(img)) continue;
      if (img.getAttribute('alt') === null) res.push(['img with no alt attribute', img.getAttribute('src') || '']);
    }
    for (const el of document.querySelectorAll('input,select,textarea')) {
      if (!vis(el)) continue;
      const t = (el.getAttribute('type') || '').toLowerCase();
      if (['hidden', 'submit', 'button', 'image'].includes(t)) continue;
      const id = el.id;
      const lab = id && document.querySelector(`label[for="${CSS.escape(id)}"]`);
      const wrapped = el.closest('label');
      if (!lab && !wrapped && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) {
        res.push(['form field with no label', (el.getAttribute('name') || el.getAttribute('placeholder') || el.tagName)]);
      }
    }
    for (const el of document.querySelectorAll('a,button')) {
      if (!vis(el)) continue;
      if (!name(el)) res.push([`${el.tagName.toLowerCase()} with no accessible name`, el.getAttribute('href') || el.className || '']);
    }
    const ids = {};
    for (const el of document.querySelectorAll('[id]')) { ids[el.id] = (ids[el.id] || 0) + 1; }
    for (const [k, v] of Object.entries(ids)) if (v > 1) res.push(['duplicate id', `${k} x${v}`]);
    return res;
  });
  for (const [kind, detail] of out) {
    tally[kind] = tally[kind] || [];
    tally[kind].push(`${url}  ${detail}`.slice(0, 96));
  }
}
for (const [kind, list] of Object.entries(tally)) {
  console.log(`\n══ ${kind}: ${list.length}`);
  for (const l of list) if (!l.includes('/admin')) console.log('   ' + l);
}
await page.close();
if (server) server.close();

if (!pages.length) {
  console.error('[check-control-names] found no pages in dist/ to measure.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}
if (Object.keys(tally).length) {
  console.error('[check-control-names] a control on the site does not say what it is:');
  for (const [kind, list] of Object.entries(tally)) {
    console.error(`  ${kind}: ${list.length}`);
    for (const l of list.slice(0, 6)) console.error('      ' + l);
  }
  console.error('');
  console.error('A placeholder is not a label: it disappears the moment someone types. Where the');
  console.error('words are already on the screen, point the field at them with aria-labelledby');
  console.error('rather than writing them a second time.');
  process.exit(1);
}
console.log(`[check-control-names] ${pages.length} pages: every image declares an alt, every`
  + ' visible field has a label, every link and button has a name, and no id is used twice.');
