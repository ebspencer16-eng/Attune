#!/usr/bin/env node
/**
 * The app's icon: the mark on the brand navy.
 *
 * ── WHY IT IS GENERATED ───────────────────────────────────────────────────
 * Ellie, seeing the app on her phone for the first time: "Will the app image
 * (mark only logo on the navy bg) show once the app is live or can you make it
 * visible now?" It was never going to: attune-app/assets/images/icon.png was
 * still Expo's template icon, the blue chevron every new project starts with.
 *
 * The icon is composed here rather than exported by hand so it cannot drift
 * from the mark the rest of the product uses, and so a change to the navy or
 * the padding is a line in this file rather than a trip through a design tool.
 * Same argument as every other generated thing in this repo.
 *
 * Run: node scripts/build-app-icon.mjs
 * Writes: attune-app/assets/images/icon.png (1024, no alpha, as Apple wants)
 *         attune-app/assets/images/splash-icon.png (the mark alone)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { launch } from './_lib/browser.mjs';

const ROOT = new URL('..', import.meta.url).pathname;

/** The ground. The darker end of the home screen's own blue. */
const NAVY = '#1B2A5E';
/** How much of the icon the mark takes. Apple's own icons sit around 0.6. */
const MARK = 0.58;

/**
 * The mark as vector, so the icon is sharp at any size.
 *
 * The first version scaled the app's 264 pixel PNG up to nearly six hundred
 * and the result was visibly soft. public/favicon.svg is the same mark with no
 * ground behind it, which is what an icon needs.
 */
const markSvg = readFileSync(`${ROOT}public/favicon.svg`, 'utf8');

const page = (size, ground) => `<!doctype html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; padding: 0; width: ${size}px; height: ${size}px; }
  body { background: ${ground}; display: flex; align-items: center; justify-content: center; }
  .mark { width: ${Math.round(size * MARK)}px; }
  .mark svg { width: 100%; height: auto; display: block; }
</style></head><body>
  <div class="mark">${markSvg}</div>
</body></html>`;

const browser = await launch({ width: 1024, height: 1024 });
try {
  await browser.goto(`data:text/html;base64,${Buffer.from(page(1024, NAVY)).toString('base64')}`);
  /**
   * The screenshot comes back as base64, which is what the DevTools protocol
   * returns. Writing that string straight to the file made an icon.png full of
   * ASCII, and every tool that opened it reported no width and no height.
   */
  /**
   * fullPage, because the window is not the page: Chrome's viewport came back
   * 1024 by 937 with the window furniture taken out of it, and an icon has to
   * be square. fullPage clips to the document, which is exactly 1024 square.
   */
  const icon = Buffer.from(await browser.screenshot({ fullPage: true }), 'base64');
  writeFileSync(`${ROOT}attune-app/assets/images/icon.png`, icon);
  console.log(`[build-app-icon] icon.png written, ${icon.length} bytes, mark on ${NAVY}.`);

  /**
   * The splash screen's mark, on nothing.
   *
   * expo-splash-screen paints the ground itself, from app.json, and puts this
   * image in the middle of it. Transparent, so the ground is the ground.
   */
  await browser.goto(`data:text/html;base64,${Buffer.from(page(512, 'transparent')).toString('base64')}`);
  const splash = Buffer.from(await browser.screenshot({ fullPage: true }), 'base64');
  writeFileSync(`${ROOT}attune-app/assets/images/splash-icon.png`, splash);
  console.log(`[build-app-icon] splash-icon.png written, ${splash.length} bytes.`);
} finally {
  await browser.close();
}
