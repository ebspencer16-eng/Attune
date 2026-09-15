#!/usr/bin/env node
/**
 * No line of type is set in a box smaller than its font needs.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie, on the In Practice reader: "Titles / heroes cut off on the top."
 *
 * React Native does not grow a line box to fit a glyph. Give a Text a
 * lineHeight below the font's own line box and it clips, from the top, which
 * is where a display face keeps its ascenders. The app's hero was 30 point
 * type in a 34 point box, 1.13 of its size, against a face that declares 1.41.
 * Every hero in the app had been losing its top edge.
 *
 * check-type-clipping.mjs was already watching for a size raised past its line
 * height, and passed this: 34 is larger than 30. The rule it encodes is not
 * wrong, it is just not the whole rule. The whole rule needs the font.
 *
 * ── WHERE THE NUMBERS COME FROM ───────────────────────────────────────────
 * The files in attune-app/assets/fonts, read here: usWinAscent plus
 * usWinDescent over unitsPerEm, from each face's OS/2 table. That pair is what
 * iOS lays out with and is the larger of the two definitions a font carries,
 * so it is the one that has to fit.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 *   1. api/_lib/font-metrics.js still matches the files on disk.
 *   2. Every entry in the app's Type scale clears its own face.
 *   3. Every storycard role clears its face, at three card widths, since
 *      those sizes are computed against the card rather than fixed.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * A lineHeight written inline on a component, of which there are many. The
 * scale is where a clipped line comes from more than once; an inline one is a
 * single screen and shows itself.
 */

import { readFileSync } from 'node:fs';
import { LINE_BOX, minLineHeight } from '../api/_lib/font-metrics.js';
import { CARD_TYPE, CARD_REF_WIDTH, cardTypeNative } from '../api/_lib/storycard-style.js';

const ROOT = new URL('..', import.meta.url).pathname;
const FONTS = `${ROOT}attune-app/assets/fonts/`;

/** usWinAscent + usWinDescent over unitsPerEm, straight out of the file. */
function lineBoxOf(file) {
  const b = readFileSync(FONTS + file);
  const tables = {};
  for (let i = 0; i < b.readUInt16BE(4); i += 1) {
    const o = 12 + i * 16;
    tables[b.toString('ascii', o, o + 4)] = b.readUInt32BE(o + 8);
  }
  const unitsPerEm = b.readUInt16BE(tables.head + 18);
  const os2 = tables['OS/2'];
  return (b.readUInt16BE(os2 + 74) + b.readUInt16BE(os2 + 76)) / unitsPerEm;
}

const fails = [];

// ── 1. the constants are the files' ───────────────────────────────────────
const MEASURED = {
  display: lineBoxOf('PlayfairDisplay-Bold.ttf'),
  body: Math.max(lineBoxOf('DMSans-Regular.ttf'), lineBoxOf('DMSans-Bold.ttf')),
};
for (const [family, measured] of Object.entries(MEASURED)) {
  const declared = LINE_BOX[family];
  if (declared == null) {
    fails.push(`api/_lib/font-metrics.js has no line box for the ${family} face, which is ${measured.toFixed(3)} in the file`);
  } else if (declared + 0.0005 < measured) {
    fails.push(`the ${family} face needs ${measured.toFixed(3)} and api/_lib/font-metrics.js says ${declared}. Type set to that number will clip.`);
  }
}

// ── 2. the app's own scale ────────────────────────────────────────────────
const theme = readFileSync(`${ROOT}attune-app/src/constants/attune-theme.ts`, 'utf8');
const scale = theme.slice(theme.indexOf('export const Type = {'), theme.indexOf('// ── Spacing'));
for (const m of scale.matchAll(/(\w+):\s*\{[^}]*fontFamily:\s*Fonts\.(\w+)[^}]*fontSize:\s*(\d+),\s*lineHeight:\s*(\d+)/g)) {
  const [, name, face, size, line] = m;
  const family = face === 'display' ? 'display' : 'body';
  const need = minLineHeight(family, Number(size));
  if (Number(line) < need) {
    fails.push(`Type.${name} is ${size} point type in a ${line} point box; the ${family} face needs ${need}, so it clips from the top`);
  }
}
// The scale is read by pattern, so an empty read is a silent pass.
if (!/fontSize/.test(scale)) fails.push('could not read the app type scale; refusing to pass');

// ── 3. the storycard roles ────────────────────────────────────────────────
for (const role of Object.keys(CARD_TYPE)) {
  for (const w of [320, CARD_REF_WIDTH, 440]) {
    const st = cardTypeNative(role, w);
    if (st.lineHeight == null || st.fontSize == null) continue;
    const family = CARD_TYPE[role].family === 'display' ? 'display' : 'body';
    const need = minLineHeight(family, st.fontSize);
    if (st.lineHeight < need) {
      fails.push(`storycard ${role} at a ${w} point card: ${st.fontSize} point type in a ${st.lineHeight} point box, and the ${family} face needs ${need}`);
    }
  }
}

if (fails.length) {
  console.error('[check-font-line-boxes] type is set tighter than its font allows, and will clip from the top:');
  for (const f of fails) console.error(`  ${f}`);
  console.error('');
  console.error('minLineHeight() in api/_lib/font-metrics.js is the floor. React Native');
  console.error('clips rather than overflowing, so the box has to fit the face.');
  process.exit(1);
}

console.log(`[check-font-line-boxes] both faces measured from the files; the app's scale and all ${Object.keys(CARD_TYPE).length} storycard roles fit their line box.`);
