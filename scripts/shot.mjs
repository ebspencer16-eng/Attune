// Screenshot a page for design review.
//
//   node scripts/shot.mjs <path> <out.png> [--full] [--width 1280]
//
// Assumes a preview server is already running; `npm run smoke` starts and stops
// one, this does not, because a review usually wants several shots in a row.
//
// ── ANIMATIONS ARE TURNED OFF, AND THAT IS NOT A PREFERENCE ────────────────
// A headless page's animation clock does not advance: document.getAnimations()
// reports every animation as "running" with currentTime pinned at 0ms, for as
// long as you wait, and .finish() does not move it either. Anything that fades
// in with `animation-fill-mode: both` therefore sits at its FROM state, which
// for this codebase's cards is opacity 0.
//
// So a screenshot of the results highlights came back as an empty gradient
// card, and it took four measurements to establish that the page was fine and
// the camera was not. `animation: none` makes each element render its own base
// style, which is the end state, and the capture matches what a person sees.

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
await page.evaluate(() => {
  const st = document.createElement('style');
  st.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}';
  document.head.appendChild(st);
  return true;
});
await page.wait(120);
const data = await page.screenshot({ fullPage: full });
writeFileSync(out, Buffer.from(data, 'base64'));
await page.close();
console.log(`${out}  ${path}  ${width}px${full ? ' full page' : ''}`);
