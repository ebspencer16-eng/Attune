#!/usr/bin/env node
/**
 * The What Comes Next icons that cannot be drawn out of rectangles.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * The four icons were built from rounded rectangles and circles, because an
 * Expo project has no SVG without a native dependency and a native dependency
 * means a TestFlight build rather than an update Ellie can publish. That is
 * fine for a book and for the logo's own bubble. It is not fine for a person
 * or for two people on a couch: those are curves, and three attempts at the
 * couple produced four circles in a tub, then two torsos, then something
 * passable and still wrong.
 *
 * Ellie, with a picture of each: "I want this shape head and shoulders and I
 * want the cloud to not be flat on the bottom", and of the couch: "Can we do
 * something like this?"
 *
 * So they are drawn properly, as SVG with a gradient stroke, and rendered to
 * PNG here. The app draws a picture. That is the same arrangement the logo
 * already uses: attune-mark-*.png and attune-bubble-heart.png are written by
 * scripts/build-mark-variants.mjs from public/favicon.svg, for the same
 * reason.
 *
 * ── WHAT THE APP GETS ─────────────────────────────────────────────────────
 * A transparent PNG at three times the size it is drawn at, so the tile's own
 * tint shows through the way it does through a stroked shape. The gradient is
 * the brand's, baked in, which is what the storycards use and what the other
 * two icons already carry.
 *
 * Run: node scripts/build-glyphs.mjs
 * Checked by: check-glyph-assets.mjs, which fails the build if a picture is
 * missing or was drawn from a different version of this file.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { launch } from './_lib/browser.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = `${ROOT}attune-app/assets/images`;

/** The storycard stripe, which is where every brand gradient in the app comes from. */
const STOPS = ['#E8673A', '#9B5DE5', '#1B5FE8'];

const defs = `<defs>
  <linearGradient id="g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
    <stop offset="0%" stop-color="${STOPS[0]}"/>
    <stop offset="55%" stop-color="${STOPS[1]}"/>
    <stop offset="100%" stop-color="${STOPS[2]}"/>
  </linearGradient>
</defs>`;

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"
  stroke="url(#g)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
  ${defs}
  ${body}
</svg>`;

/**
 * A person, and a thought that is a cloud.
 *
 * ── THE SHAPE SHE SENT ────────────────────────────────────────────────────
 * The head and shoulders are the avatar silhouette: an oval head, and under
 * it a bust whose shoulders curve up to meet the neck, with a gap between the
 * two. Drawn as two shapes rather than one, which is what the picture is: the
 * head is separate and the shoulders rise either side of it.
 *
 * The cloud is six arcs round a closed path and has no flat edge anywhere,
 * which is the other half of what she asked for. The old one was four circles
 * sitting on a rounded rectangle, so the bottom was a straight line.
 */
const THINKING = `
  <!-- the head -->
  <ellipse cx="20" cy="22" rx="9.5" ry="10.5"/>
  <!-- the shoulders: up the side, across the top of each shoulder, and down -->
  <path d="M4.5 54
           C4.5 43.5 11.5 37.5 20 37.5
           C28.5 37.5 35.5 43.5 35.5 54"/>
  <!-- two beads rising to the cloud -->
  <circle cx="36" cy="30.5" r="2.1"/>
  <circle cx="41.5" cy="24" r="3.1"/>
  <!-- the cloud: five bumps and a scalloped underside, no straight edge -->
  <path d="M43.5 18.5
           a5.2 5.2 0 0 1 4.6 -5.4
           a6.4 6.4 0 0 1 11.1 -1.2
           a5.0 5.0 0 0 1 0.6 9.6
           a4.6 4.6 0 0 1 -4.3 4.0
           a4.4 4.4 0 0 1 -6.0 1.6
           a4.6 4.6 0 0 1 -6.0 -2.2
           a5.2 5.2 0 0 1 0 -6.4 z"/>
`;

/**
 * Two people sitting together.
 *
 * ── THE PICTURE SHE SENT ──────────────────────────────────────────────────
 * Two figures on a sofa in profile, turned a little towards each other, one
 * with an elbow up. What survives at sixty points is: a sofa with a back, a
 * seat, two arms and two feet; two heads; two bodies that lean in rather than
 * sitting square; and legs that reach the floor in front of the seat.
 *
 * Drawn at a size where the sofa is the width of the box and the people sit
 * inside its arms, because the first version had them standing in front of a
 * counter and the second had them filling the whole frame.
 */
const COUCH = `
  <!-- the back of the sofa, low enough that their heads rise above it -->
  <rect x="6" y="26" width="52" height="16" rx="6"/>
  <!-- an arm at each end -->
  <rect x="1.5" y="32" width="8.5" height="18" rx="4.25"/>
  <rect x="54" y="32" width="8.5" height="18" rx="4.25"/>
  <!-- ── THE TWO OF THEM, SOLID ──────────────────────────────────────────
       Her reference is two silhouettes on a sofa. Drawn as outlines they
       crossed the sofa's own lines and read as three arches on a bench, and
       drawn with a gap at the neck the back of the sofa ran through it. So
       they are filled, and the head meets the shoulders the way it does in
       the picture. -->
  <g fill="url(#g)" stroke="none">
    <circle cx="21" cy="16.5" r="6"/>
    <path d="M11.5 42 c0 -11.5 4.2 -19.5 9.5 -19.5 c5.3 0 9.5 8 9.5 19.5 z"/>
    <circle cx="43" cy="16.5" r="6"/>
    <path d="M33.5 42 c0 -11.5 4.2 -19.5 9.5 -19.5 c5.3 0 9.5 8 9.5 19.5 z"/>
  </g>
  <!-- the seat, over both laps -->
  <rect x="3" y="40" width="58" height="10" rx="3.5"/>
  <!-- two feet -->
  <path d="M9 50 v4.5"/>
  <path d="M55 50 v4.5"/>
`;

const GLYPHS = [
  ['attune-glyph-thinking', THINKING],
  ['attune-glyph-couch', COUCH],
];

/** Three times the 60 points the app draws them at. */
const PX = 180;

const page = (body) => `<!doctype html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; padding: 0; width: ${PX}px; height: ${PX}px; background: transparent; }
  svg { width: ${PX}px; height: ${PX}px; display: block; }
</style></head><body>${body}</body></html>`;

const browser = await launch({ width: PX, height: PX });
try {
  for (const [name, body] of GLYPHS) {
    const markup = svg(body);
    await browser.goto(`data:text/html;base64,${Buffer.from(page(markup)).toString('base64')}`);
    const png = Buffer.from(
      await browser.screenshot({ box: { width: PX, height: PX }, transparent: true }),
      'base64',
    );
    /* An empty transparent PNG is about 500 bytes and looks like nothing in a
       viewer, which is how an icon ships blank. */
    if (png.length < 1500) throw new Error(`${name} came back ${png.length} bytes, which is not a drawing`);
    writeFileSync(`${OUT}/${name}.png`, png);
    console.log(`[build-glyphs] ${name}.png written, ${png.length} bytes.`);
  }
  /**
   * A hash of this file beside the pictures it made.
   *
   * Same argument as .mark-source: a modification time is not a fact git
   * keeps, so a clone would compare two arbitrary timestamps. If this does
   * not match, the PNGs are a drawing of an older version of these paths.
   */
  writeFileSync(
    `${OUT}/.glyph-source`,
    `${createHash('sha256').update(readFileSync(new URL(import.meta.url).pathname)).digest('hex')}  scripts/build-glyphs.mjs\n`,
  );
  console.log('[build-glyphs] .glyph-source written.');
} finally {
  await browser.close();
}
