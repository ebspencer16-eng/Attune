#!/usr/bin/env node
/**
 * The square share card: the mark, with Attune Relationships under it.
 *
 * ── WHY IT EXISTS ─────────────────────────────────────────────────────────
 * Ellie, on sharing the insight of the day from the app: "I want the little
 * image to be the attune logo with attune relationships underneath."
 *
 * That little image is not ours to draw. Apple builds it from the Open Graph
 * tags of whatever address is in the message, and og-image.png is a 2400 by
 * 1260 banner. A square thumbnail cut out of the middle of a banner is a
 * fragment of a headline, which is what she was looking at.
 *
 * So there is a square one, and it carries the one thing a thumbnail can
 * actually hold at that size: the mark and the name.
 *
 * ── WHY IT IS GENERATED ───────────────────────────────────────────────────
 * Same argument as the app icon. It is composed from public/favicon.svg and
 * the bundled Playfair, so it cannot drift from the mark and the face the rest
 * of the product uses, and the navy is the same one line the icon reads.
 *
 * Run: node scripts/build-share-card.mjs
 * Writes: public/og-square.png (1200 square)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { launch } from './_lib/browser.mjs';

const ROOT = new URL('..', import.meta.url).pathname;

/** The ground, the same navy the app icon and the splash are on. */
const NAVY = '#1B2A5E';
const SIZE = 1200;

const markSvg = readFileSync(`${ROOT}public/favicon.svg`, 'utf8');

/**
 * Playfair inlined rather than fetched. A build step that needs the network to
 * produce the right typeface is a build step that silently produces the wrong
 * one on a bad day.
 */
const playfair = readFileSync(`${ROOT}attune-app/assets/fonts/PlayfairDisplay-Bold.ttf`).toString('base64');

const page = `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face {
    font-family: 'Playfair Display';
    src: url(data:font/ttf;base64,${playfair}) format('truetype');
    font-weight: 700;
  }
  html, body { margin: 0; padding: 0; width: ${SIZE}px; height: ${SIZE}px; }
  body {
    background: ${NAVY};
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: ${Math.round(SIZE * 0.055)}px;
  }
  .mark { width: ${Math.round(SIZE * 0.42)}px; }
  .mark svg { width: 100%; height: auto; display: block; }
  .name {
    font-family: 'Playfair Display', serif;
    font-weight: 700;
    font-size: ${Math.round(SIZE * 0.092)}px;
    line-height: 1.41;
    color: #FFFFFF;
    text-align: center;
    white-space: nowrap;
  }
</style></head><body>
  <div class="mark">${markSvg}</div>
  <div class="name">Attune Relationships</div>
</body></html>`;

const browser = await launch({ width: SIZE, height: SIZE });
try {
  await browser.goto(`data:text/html;base64,${Buffer.from(page).toString('base64')}`);
  // fullPage, because Chrome's viewport is not the document: the icon builder
  // learned that the same way, with a square that came back 1024 by 937.
  const png = Buffer.from(await browser.screenshot({ fullPage: true }), 'base64');
  if (png.length < 5000) throw new Error(`share card came back ${png.length} bytes, which is not an image`);
  writeFileSync(`${ROOT}public/og-square.png`, png);
  console.log(`[build-share-card] og-square.png written, ${png.length} bytes, ${SIZE} square on ${NAVY}.`);
} finally {
  await browser.close();
}
