/**
 * Dump the computed spacing, colour and type of every element on a page.
 *
 * ── WHAT IT IS FOR ────────────────────────────────────────────────────────
 * Proving a refactor moved nothing on pages that cannot be compared by
 * screenshot. Three pages render a random one-time code or shuffle content,
 * so two screenshots of the same unchanged page differ: gift-cards, qr-card
 * and feedback. Computed styles are deterministic where the pixels are not.
 *
 * Screenshots stay the primary check. This is the fallback, and it is only
 * sound if it captures the properties the refactor could have changed. It
 * started out capturing spacing alone, which would have passed a palette
 * change blind, so it now captures colour and font as well. If you use it to
 * verify something these properties cannot express, extend it first.
 *
 *   node scripts/style-dump.mjs /gift-cards.html out.json
 */

import { writeFileSync } from 'fs';
import { launch } from './_lib/browser.mjs';

const [path, out] = process.argv.slice(2);
if (!path || !out) {
  console.error('usage: node scripts/style-dump.mjs <path> <out.json>');
  process.exit(1);
}

const base = process.env.BASE || 'http://localhost:4173';
const browser = await launch();
await browser.goto(base + path);
await browser.wait(700);

const data = await browser.evaluate(() => {
  const props = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'rowGap', 'columnGap',
    'color', 'backgroundColor', 'backgroundImage',
    'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
    'fontFamily', 'fontSize', 'fontWeight'];
  return [...document.querySelectorAll('*')].map((el) => {
    const cs = getComputedStyle(el);
    return el.tagName + '|' + props.map((p) => cs[p]).join(',');
  });
});

await browser.close();
writeFileSync(out, JSON.stringify(data, null, 0));
console.log(`${data.length} elements`);
