/**
 * Dump the computed padding, margin and gap of every element on a page.
 *
 * Used to prove a refactor moved nothing on pages that cannot be compared by
 * screenshot because they render random one-time codes. Computed styles are
 * deterministic where the pixels are not.
 *
 *   node scripts/spacing-dump.mjs /gift-cards.html out.json
 */

import { writeFileSync } from 'fs';
import { launch } from './_lib/browser.mjs';

const [path, out] = process.argv.slice(2);
if (!path || !out) {
  console.error('usage: node scripts/spacing-dump.mjs <path> <out.json>');
  process.exit(1);
}

const base = process.env.BASE || 'http://localhost:4173';
const browser = await launch();
await browser.goto(base + path);
await browser.wait(700);

const data = await browser.evaluate(() => {
  const props = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'rowGap', 'columnGap'];
  return [...document.querySelectorAll('*')].map((el) => {
    const cs = getComputedStyle(el);
    return el.tagName + '|' + props.map((p) => cs[p]).join(',');
  });
});

await browser.close();
writeFileSync(out, JSON.stringify(data, null, 0));
console.log(`${data.length} elements`);
