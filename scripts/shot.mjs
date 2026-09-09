// Screenshot a page for design review.
//
//   node scripts/shot.mjs <path> <out.png> [--full] [--width 1280]
//
// Assumes a preview server is already running; `npm run smoke` starts and stops
// one, this does not, because a review usually wants several shots in a row.

import { writeFileSync } from 'fs';
import { launch } from './_lib/browser.mjs';

const [, , path = '/', out = 'shot.png', ...rest] = process.argv;
const full = rest.includes('--full');
const wIdx = rest.indexOf('--width');
const width = wIdx >= 0 ? Number(rest[wIdx + 1]) : 1280;
const BASE = process.env.BASE || 'http://localhost:4173';

const page = await launch({ width, height: 1400 });
await page.goto(BASE + path);
await page.wait(1200);
const data = await page.screenshot({ fullPage: full });
writeFileSync(out, Buffer.from(data, 'base64'));
await page.close();
console.log(`${out}  ${path}  ${width}px${full ? ' full page' : ''}`);
