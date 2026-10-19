#!/usr/bin/env node
/**
 * The drawn icons are present, and they are drawings of the current paths.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Two of the What Comes Next icons are SVG rendered to PNG by
 * scripts/build-glyphs.mjs, because they are curves and this project cannot
 * draw curves at run time without a native dependency. The app draws a
 * picture, and a picture has two ways of being wrong that nothing else here
 * would notice:
 *
 *   it is missing      `require` of an absent asset fails the BUNDLE, loudly,
 *                      which is the good case and is not what this is for
 *   it is stale        the paths were edited and nobody re-ran the builder,
 *                      so the app ships a drawing of the previous version
 *                      and everything passes
 *
 * The second is the one that matters. attune-mark.png spent a month being a
 * different logo for exactly this reason, which is why build-mark-variants.mjs
 * leaves a hash beside its output and why this does the same.
 *
 * ── WHAT IT COMPARES ──────────────────────────────────────────────────────
 * A hash of the builder, which contains the paths, against the hash it wrote
 * when it last ran. Not a modification time: a clone stamps every file with
 * the checkout time, so comparing times passes here and is a coin toss on
 * Vercel. That mistake has already been made once in this repo.
 *
 * ── WHAT IT DOES NOT COVER ────────────────────────────────────────────────
 * Whether the drawing is any good. Three versions of the couple passed every
 * structural check and all three were wrong; what settled it was looking at
 * them. A gate can say the picture is current and cannot say it is right.
 */

import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const BUILDER = 'scripts/build-glyphs.mjs';
const IMAGES = 'attune-app/assets/images';
const STAMP = `${IMAGES}/.glyph-source`;

const fails = [];

/** Which pictures the app actually asks for, read from the app. */
const src = readFileSync(`${ROOT}attune-app/src/components/brand-glyph.tsx`, 'utf8');
const wanted = [...src.matchAll(/assets\/images\/(attune-glyph-[a-z-]+)\.png/g)].map((m) => m[1]);

if (!wanted.length) {
  console.error('[check-glyph-assets] brand-glyph.tsx asks for no drawn icon at all.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

for (const name of new Set(wanted)) {
  let size = 0;
  try { size = statSync(`${ROOT}${IMAGES}/${name}.png`).size; }
  catch { fails.push(`${name}.png is missing, and the app asks for it. Run node ${BUILDER}.`); continue; }
  /* A blank transparent PNG is about 500 bytes and looks like nothing in a
     viewer, which is how an icon ships invisible. */
  if (size < 1500) fails.push(`${name}.png is ${size} bytes, which is not a drawing.`);
}

/** And every picture the builder makes is one the app asks for. */
const builder = readFileSync(`${ROOT}${BUILDER}`, 'utf8');
const made = [...builder.matchAll(/\['(attune-glyph-[a-z-]+)',/g)].map((m) => m[1]);
for (const name of made) {
  if (!wanted.includes(name)) {
    fails.push(`${BUILDER} draws ${name}.png and nothing uses it. Either the app stopped`
      + ' asking for it or it was never wired up; a picture nobody draws is clutter at best'
      + ' and a half-finished change at worst.');
  }
}

/* The stamp: are these drawings of the paths as they stand? */
const now = createHash('sha256').update(builder).digest('hex');
let stamped = '';
try { stamped = readFileSync(`${ROOT}${STAMP}`, 'utf8').trim().split(/\s+/)[0]; }
catch { fails.push(`${STAMP} is missing, so nothing says which version of the paths these were drawn from.`); }
if (stamped && stamped !== now) {
  fails.push(`the paths in ${BUILDER} have changed since the pictures were made.\n`
    + '      The app is shipping a drawing of the previous version, and every other check\n'
    + `      passes. Run: node ${BUILDER}`);
}

if (fails.length) {
  console.error('\n check-glyph-assets: a drawn icon is missing or out of date.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`[check-glyph-assets] ${new Set(wanted).size} drawn icon(s), all present and all`
  + ' drawn from the paths as they stand. Whether they look right is a thing to look at.');
