#!/usr/bin/env node
/**
 * The mark, in the two forms the app's lockup needs.
 *
 * ── WHAT ELLIE ASKED FOR ──────────────────────────────────────────────────
 * "Mark in lockup on home page should be inverse, so the bubble on the right
 * should have a white bg not ghost."
 *
 * "Mark in lockup on other pages should be ghost bg not white bg, so the heart
 * in the left bubble should be transparent not white."
 *
 * Both are about the same thing from two sides. The mark has a filled left
 * bubble with a white heart in it and an outlined right bubble with a white
 * fill behind a gradient heart. That is drawn for a white page. On the home
 * screen's navy the right bubble's white fill is a solid white box where a
 * ghost should be, and on a cream page the left bubble's white heart is the
 * one thing on the screen that is pure white.
 *
 * So there are two files:
 *
 *   attune-mark-light.png       for the cream pages: the left heart cut out
 *                               rather than painted, so the page shows through
 *   attune-mark-dark.png        for the navy: the right bubble filled white,
 *                               and the left bubble outlined in white
 *   attune-mark-dark-plain.png  the same, without that outline
 *
 * The third exists because the outline was asked for on one dark ground and
 * asked off on another. Ellie, of the Insights landing: "please outline the
 * left bubble in the lockup's mark in white", because on the orange the
 * bubble's own orange end dissolves into the page. And then, of Learn: "Remove
 * the white outline around the left bubble on the mark on the learn page's
 * lockup", because on the blue the fill already has an edge and the ring is
 * just a ring.
 *
 * It is the source SVG untouched: darkVariant's only edit is the stroke, so
 * "dark without the outline" is the mark as drawn. Which ground gets which is
 * a decision per screen rather than a rule, so it is a prop on BrandHeader and
 * not something computed here.
 *
 * ── WHY GENERATED ─────────────────────────────────────────────────────────
 * Same argument as the app icon and the share card. Both are composed from
 * public/favicon.svg, which is the mark, so a change to the mark reaches all
 * of them and none of these can drift into a slightly different logo.
 *
 * Run: node scripts/build-mark-variants.mjs
 * Writes: attune-app/assets/images/attune-mark-light.png
 *         attune-app/assets/images/attune-mark-dark.png
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { launch } from './_lib/browser.mjs';

const ROOT = new URL('..', import.meta.url).pathname;

/** Three times the mark's own 103 by 76, which is what the app draws it at. */
const W = 103 * 3;
const H = 76 * 3;

const svg = readFileSync(`${ROOT}public/favicon.svg`, 'utf8');

/**
 * The left bubble's heart, cut out instead of painted.
 *
 * A mask rather than a colour: "transparent" has to mean the page shows
 * through, and a heart painted in the page's own colour would be a heart
 * painted in one page's colour on every page.
 */
function lightVariant(src) {
  const masked = src
    .replace(
      '<defs>',
      `<defs>
    <mask id="cutHeart" maskUnits="userSpaceOnUse" x="0" y="0" width="103" height="76">
      <rect x="0" y="0" width="103" height="76" fill="white"/>
      <path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="black" transform="translate(13.16,11.3) scale(0.72)"/>
    </mask>`,
    )
    // the filled bubble now carries the cut-out
    .replace('fill="url(#fg)"/>', 'fill="url(#fg)" mask="url(#cutHeart)"/>');

  // and the painted white heart goes
  return masked.replace(
    /\n  <!-- White heart inside left bubble -->\n[^\n]*\n/,
    '\n',
  );
}

/** The right bubble filled white, and the left bubble outlined in white. */
function darkVariant(src) {
  /**
   * The right bubble is already `fill="white"`, which is what she asked the
   * home screen to have. What makes the dark variant is the LEFT heart: it is
   * white at 0.93 and on a dark ground that reads correctly.
   *
   * ── AND THE LEFT BUBBLE IS OUTLINED ───────────────────────────────────
   * Ellie: "On insights landing, with the orange background, please outline
   * the left bubble in the lockup's mark in white."
   *
   * The left bubble is a filled gradient and nothing else, so on the orange
   * its own orange end has almost no edge: the bubble dissolves into the page
   * and the mark reads as one bubble and a heart. A white stroke gives it the
   * same edge the right bubble gets from its gradient outline, and it is the
   * dark variant only, because on cream the fill already has an edge.
   *
   * 2.2 is the right bubble's stroke width, so the two edges match.
   */
  return src.replace(
    '<path d="M14,4 L44,4 A9,9 0 0,1 53,13 L53,42 A9,9 0 0,1 44,51 L20,51 L6,61 L11,51 A6,6 0 0,1 5,45 L5,13 A9,9 0 0,1 14,4 Z" fill="url(#fg)"/>',
    '<path d="M14,4 L44,4 A9,9 0 0,1 53,13 L53,42 A9,9 0 0,1 44,51 L20,51 L6,61 L11,51 A6,6 0 0,1 5,45 L5,13 A9,9 0 0,1 14,4 Z" fill="url(#fg)" stroke="white" stroke-width="2.2" stroke-linejoin="round"/>',
  );
}

const page = (body) => `<!doctype html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; padding: 0; width: ${W}px; height: ${H}px; background: transparent; }
  svg { width: ${W}px; height: ${H}px; display: block; }
</style></head><body>${body}</body></html>`;

const browser = await launch({ width: W, height: H });
try {
  for (const [name, src] of [
    ['attune-mark-light', lightVariant(svg)],
    ['attune-mark-dark', darkVariant(svg)],
    ['attune-mark-dark-plain', svg],
  ]) {
    await browser.goto(`data:text/html;base64,${Buffer.from(page(src)).toString('base64')}`);
    /**
     * An explicit box, not fullPage.
     *
     * fullPage measures the document, and the document is never narrower than
     * the window, so these came back 485 by 228 with 176 points of transparent
     * padding on the right. Nothing showed it: a PNG viewer draws transparent
     * as nothing. The app showed it, because `contain` fits the canvas rather
     * than the artwork, so the mark in the lockup was drawn at two thirds of
     * the size it had been and Ellie asked for the larger one back.
     *
     * W and H are the mark's own viewBox times three, so this asks for exactly
     * the picture and the file's aspect is the artwork's aspect.
     */
    const png = Buffer.from(
      await browser.screenshot({ box: { width: W, height: H }, transparent: true }),
      'base64',
    );
    if (png.length < 1000) throw new Error(`${name} came back ${png.length} bytes, which is not an image`);
    writeFileSync(`${ROOT}attune-app/assets/images/${name}.png`, png);
    console.log(`[build-mark-variants] ${name}.png written, ${png.length} bytes.`);
  }
} finally {
  await browser.close();
}
