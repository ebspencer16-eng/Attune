#!/usr/bin/env node
/**
 * The two placeholder pictures on the home screen's prompt cards.
 *
 * ── WHAT ELLIE ASKED FOR ──────────────────────────────────────────────────
 * "Can you use stock images for these images? Maybe an open door for results
 * are ready and a couple smiling at a computer screen for build a budget?
 * These are placeholders."
 *
 * ── WHY THESE ARE DRAWN AND NOT PHOTOGRAPHS ───────────────────────────────
 * A stock photograph has a licence attached to it, and putting one in the app
 * means someone has bought the right to use it. That is a purchase and a
 * record, not something to do quietly inside a build. So these are drawn here,
 * in the brand's own colours, and they are ours.
 *
 * They are placeholders exactly as she said: the moment there are photographs,
 * drop two files in attune-app/assets/images with these names and delete this
 * script. Nothing else has to change.
 *
 * Same pipeline as scripts/build-mark-variants.mjs: an SVG rendered by the
 * headless browser this repo already runs its checks in, captured to an exact
 * box so the file's aspect is the artwork's aspect. See the note there about
 * what a full-page capture does instead.
 *
 * Run: node scripts/build-card-art.mjs
 * Writes: attune-app/assets/images/card-results.png
 *         attune-app/assets/images/card-budget.png
 */

import { writeFileSync } from 'node:fs';
import { launch } from './_lib/browser.mjs';

const ROOT = new URL('..', import.meta.url).pathname;

/** Square, because the card holds a rounded square. Three times its drawn size. */
const SIZE = 440;

/** The brand's own, so these sit beside the icons rather than beside nothing. */
const ORANGE = '#E8673A';
const INDIGO = '#1B5FE8';
const INK = '#2A1B10';

/** An open door, standing open onto light. */
const DOOR = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFF3EC"/>
      <stop offset="100%" stop-color="#FBE3D6"/>
    </linearGradient>
    <linearGradient id="light" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${ORANGE}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${ORANGE}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="160" height="160" fill="url(#g)"/>
  <!-- the light coming through -->
  <path d="M96 36 L150 8 L160 160 L96 138 Z" fill="url(#light)"/>
  <!-- the frame -->
  <rect x="44" y="30" width="54" height="102" rx="3" fill="none" stroke="${INK}" stroke-opacity="0.55" stroke-width="2.4"/>
  <!-- the door, standing open -->
  <path d="M98 26 L132 38 L132 126 L98 136 Z" fill="#FFFFFF" stroke="${INK}" stroke-opacity="0.55" stroke-width="2.4" stroke-linejoin="round"/>
  <circle cx="104" cy="82" r="2.6" fill="${ORANGE}"/>
  <!-- the floor line -->
  <path d="M28 132 L140 132" stroke="${INK}" stroke-opacity="0.22" stroke-width="2"/>
</svg>`;

/** Two people, side by side, at a screen. */
const BUDGET = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <defs>
    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#EEF2FE"/>
      <stop offset="100%" stop-color="#E2E8FB"/>
    </linearGradient>
  </defs>
  <rect width="160" height="160" fill="url(#g2)"/>
  <!-- the screen -->
  <rect x="46" y="38" width="68" height="46" rx="4" fill="#FFFFFF" stroke="${INK}" stroke-opacity="0.5" stroke-width="2.4"/>
  <path d="M74 84 L86 84 L88 94 L72 94 Z" fill="#FFFFFF" stroke="${INK}" stroke-opacity="0.5" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M56 94 L104 94" stroke="${INK}" stroke-opacity="0.5" stroke-width="2.4" stroke-linecap="round"/>
  <!-- a rising line on it -->
  <path d="M54 72 L68 60 L80 66 L106 46" fill="none" stroke="${INDIGO}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- two heads and shoulders, turned toward each other -->
  <circle cx="44" cy="108" r="9" fill="${ORANGE}"/>
  <path d="M28 132 a16 16 0 0 1 32 0 Z" fill="${ORANGE}"/>
  <circle cx="116" cy="108" r="9" fill="${INDIGO}"/>
  <path d="M100 132 a16 16 0 0 1 32 0 Z" fill="${INDIGO}"/>
  <!-- smiles -->
  <path d="M40 110 q4 3.5 8 0" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M112 110 q4 3.5 8 0" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;

const page = (body) => `<!doctype html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; padding: 0; width: ${SIZE}px; height: ${SIZE}px; background: transparent; }
  svg { width: ${SIZE}px; height: ${SIZE}px; display: block; }
</style></head><body>${body}</body></html>`;

const browser = await launch({ width: SIZE, height: SIZE });
try {
  for (const [name, svg] of [['card-results', DOOR], ['card-budget', BUDGET]]) {
    await browser.goto(`data:text/html;base64,${Buffer.from(page(svg)).toString('base64')}`);
    const png = Buffer.from(
      await browser.screenshot({ box: { width: SIZE, height: SIZE } }),
      'base64',
    );
    if (png.length < 1000) throw new Error(`${name} came back ${png.length} bytes, which is not an image`);
    writeFileSync(`${ROOT}attune-app/assets/images/${name}.png`, png);
    console.log(`[build-card-art] ${name}.png written, ${png.length} bytes.`);
  }
} finally {
  await browser.close();
}
