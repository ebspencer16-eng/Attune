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

/**
 * The outline of a group of circles, with no lines inside it.
 *
 * Stroking four overlapping circles draws four closed rings. What is wanted is
 * the boundary of the whole group, which is a mask: every circle at full size
 * in white, every circle shrunk by the stroke width in black, and the ring
 * between them is what paints.
 */
/**
 * Four lobes, and they have to overlap more than looks necessary.
 *
 * The first set was five and came out as a filled blob with holes in it: the
 * SHRUNK circles have to overlap each other as well, or the gaps between them
 * stay white and the middle of the cloud paints solid. Shrinking by the stroke
 * width costs each lobe 2.6 of its radius, so the small ones lost most of
 * their overlap and the mask stopped being a ring.
 *
 * Checked rather than eyeballed: every pair below is closer together than the
 * sum of its two shrunk radii.
 */
const LOBES = [
  [49, 12, 9],
  [56, 14, 6.5],
  [44, 16, 6],
  [52, 19, 6.5],
];
const STROKE = 2.6;
/*
 * `stroke="none"` on the mask, which is the whole bug and took two renders.
 * The root <svg> sets stroke="url(#g)" and a width, and a mask's children
 * inherit it, so every circle in here was being STROKED in a mid-luminance
 * gradient as well as filled. The black circles came back with a grey ring
 * round them, the mask stopped being a clean on-or-off, and the cloud
 * rendered as a pale blob with holes in it.
 */
const CLOUD_MASK = `<mask id="cloud" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64" stroke="none">
    ${LOBES.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="none"/>`).join('\n    ')}
    ${LOBES.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r - STROKE}" fill="#000" stroke="none"/>`).join('\n    ')}
  </mask>`;

const defs = `<defs>
  <linearGradient id="g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
    <stop offset="0%" stop-color="${STOPS[0]}"/>
    <stop offset="55%" stop-color="${STOPS[1]}"/>
    <stop offset="100%" stop-color="${STOPS[2]}"/>
  </linearGradient>
  ${CLOUD_MASK}
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
  <ellipse cx="19" cy="22" rx="9.5" ry="10.5"/>
  <!-- the shoulders: up the side, over each shoulder, and down -->
  <path d="M3.5 54
           C3.5 43.5 10.5 37.5 19 37.5
           C27.5 37.5 34.5 43.5 34.5 54"/>
  <!-- two beads rising to the cloud -->
  <!-- Clear of the cloud on purpose. A bead that lands inside it draws a
       circle in the middle of the drawing, which is the same complaint she
       made about the sofa: a line showing through something in front of it. -->
  <circle cx="30" cy="31" r="1.7"/>
  <circle cx="35" cy="26" r="2.3"/>
  <!--
    ── THE CLOUD, THIRD TIME ──────────────────────────────────────────────
    Ellie: "cloud was better before. Can we try the cloud again?"

    The one before was four big overlapping circles, and the one that
    replaced it was a scalloped outline with small bumps, which read as a
    blob. This goes back to big round lobes, five of them, and keeps the
    underside bumpy rather than flat, which was the other half of what she
    asked for. Bigger too: it was losing to the head.
  -->
  <rect x="0" y="0" width="64" height="64" fill="url(#g)" stroke="none" mask="url(#cloud)"/>
`;

/**
 * A sofa.
 *
 * ── WHY THE PEOPLE ARE GONE ───────────────────────────────────────────────
 * Ellie, of the third attempt at two people on it: "This still looks bad.
 * Maybe we take the people off and just do a sofa? I don't want the
 * overlapping lines on the sofa though, the arms should not show the lines
 * behind them if that makes sense."
 *
 * It makes sense and it is the whole problem with every version before this
 * one: the sofa was a back, a seat and two arms drawn one on top of another,
 * so every arm had the back's line running through it. A stroked shape does
 * not hide what is behind it.
 *
 * So the sofa is ONE path. The outline goes up the outside of the left arm,
 * over it, up the back, across, down the other side and over the right arm,
 * and there is nothing behind anything. The only other line is the seat,
 * which is a line across the inside rather than the edge of a shape.
 */
const COUCH = `
  <path d="M4 50
           V36
           a6 6 0 0 1 12 0
           V25
           a4 4 0 0 1 4 -4
           H44
           a4 4 0 0 1 4 4
           v11
           a6 6 0 0 1 12 0
           V50
           Z"/>
  <!-- The seat, stopping at the arms rather than running through them: a line
       across an arm is the thing she asked to be rid of. -->
  <path d="M16 41 H48"/>
  <!-- two feet -->
  <path d="M10 50 v5"/>
  <path d="M54 50 v5"/>
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
