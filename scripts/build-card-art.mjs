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

/** A piggy bank, with coins dropping in. */
const BUDGET = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <defs>
    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#EEF2FE"/>
      <stop offset="100%" stop-color="#E2E8FB"/>
    </linearGradient>
  </defs>
  <rect width="160" height="160" fill="url(#g2)"/>

  <!-- three coins on their way down, the nearest one about to land -->
  <g stroke="${INK}" stroke-opacity="0.45" stroke-width="1.6">
    <circle cx="78" cy="22" r="8" fill="#FFD9A8"/>
    <circle cx="96" cy="40" r="6.5" fill="#FFD9A8"/>
    <circle cx="70" cy="46" r="5.5" fill="#FFD9A8"/>
  </g>

  <!-- the body -->
  <path d="M40 92
           a30 26 0 0 1 30 -26 h14
           a30 26 0 0 1 30 26
           a30 26 0 0 1 -30 26 h-14
           a30 26 0 0 1 -30 -26 Z"
        fill="${ORANGE}"/>
  <!-- the snout -->
  <ellipse cx="119" cy="92" rx="9" ry="8" fill="${ORANGE}"/>
  <circle cx="117" cy="90" r="1.8" fill="#FFFFFF" fill-opacity="0.85"/>
  <circle cx="122" cy="93" r="1.8" fill="#FFFFFF" fill-opacity="0.85"/>
  <!-- an ear -->
  <path d="M84 66 L96 60 L92 72 Z" fill="${ORANGE}"/>
  <!-- the eye -->
  <circle cx="102" cy="84" r="2.6" fill="#FFFFFF"/>
  <!-- the slot -->
  <rect x="66" y="70" width="24" height="4.5" rx="2.2" fill="#FFFFFF" fill-opacity="0.9"/>
  <!-- legs -->
  <rect x="54" y="114" width="10" height="12" rx="3" fill="${ORANGE}"/>
  <rect x="94" y="114" width="10" height="12" rx="3" fill="${ORANGE}"/>
  <!-- the ground line -->
  <path d="M36 128 L128 128" stroke="${INK}" stroke-opacity="0.2" stroke-width="2"/>
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
