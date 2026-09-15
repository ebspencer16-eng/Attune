#!/usr/bin/env node
/**
 * No storycard glyph is taller than its line box.
 *
 * ── WHAT HAPPENED, TWICE ──────────────────────────────────────────────────
 * Ellie: "The % sign on storycard 4 is cut off on top", and "the 80% text on
 * storycard 5 is cut off on top."
 *
 * The two cards built around a number set that number tight: 0.9 and 0.85 of
 * its own size. On the web that is leading, and a browser lets the glyph
 * overflow its box. React Native clips instead, from the top, so both figures
 * lost their upper edge and the % lost its top ring.
 *
 * check-type-clipping.mjs covers the app's own type scale. It could not see
 * this: the storycards are sized from api/_lib/storycard-style.js, which is
 * shared with the website and carries web leading, and nothing checked what
 * that scale turns into on a phone.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 * cardTypeNative is run for every role at several card widths, and its line
 * height has to be at least its font size. Running it is the point: the floor
 * is applied inside that function, so a description of the rule here would be
 * a second copy of it, and the sizes are clamped against the card width, which
 * means a role can be safe at one width and not another.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The website, where the tight leading is correct and wanted. This is about
 * what the same scale does on the other surface.
 */

import { CARD_TYPE, CARD_REF_WIDTH, cardTypeNative } from '../api/_lib/storycard-style.js';

/** A small phone, the reference, and a large phone. */
const WIDTHS = [320, CARD_REF_WIDTH, 440];

const fails = [];
for (const role of Object.keys(CARD_TYPE)) {
  for (const w of WIDTHS) {
    const style = cardTypeNative(role, w);
    if (style.lineHeight == null || style.fontSize == null) continue;
    if (style.lineHeight < style.fontSize) {
      fails.push(`${role} at a ${w} point card: ${style.fontSize} point glyph in a ${style.lineHeight} point line box`);
    }
  }
}

if (fails.length) {
  console.error('[check-card-type-clipping] a storycard glyph will be clipped from the top:');
  for (const f of fails) console.error(`  ${f}`);
  console.error('');
  console.error('React Native clips rather than overflowing. cardTypeNative floors the');
  console.error('line height for exactly this; see api/_lib/storycard-style.js.');
  process.exit(1);
}

console.log(`[check-card-type-clipping] ${Object.keys(CARD_TYPE).length} roles at ${WIDTHS.length} card widths; every glyph fits its line box.`);
