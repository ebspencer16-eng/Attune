#!/usr/bin/env node
/**
 * The couple map is the same size on both surfaces, and it fits its card.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * It was 184 points on the website and 168 in the app, each written into its
 * own renderer, so the card built around the map drew it at two sizes. One
 * share of the card width now, CARD_MAP_PCT, and Ellie has asked for it bigger
 * twice: 0.56, then 0.68.
 *
 * There is a ceiling, and it is not a matter of taste. The card is 9:16, and
 * above the map sits a title and below it a lead line, a paragraph and the
 * wordmark row. Past a certain share the last line meets the wordmark. So this
 * checks the height the card has left after the map, at the narrowest phone
 * the app supports.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the map looks right at that size, which is Ellie's call. This says
 * only that the type under it still has somewhere to go.
 */

import { CARD_MAP_PCT, CARD_RATIO, cardTypeNative } from '../api/_lib/storycard-style.js';

/** The narrowest phone the app is built for, and the card's own padding. */
const NARROW = 320;
const PADDING = 40 * 2;

const cardWidth = NARROW;
const cardHeight = cardWidth / CARD_RATIO;
const map = Math.round(cardWidth * CARD_MAP_PCT);

/** What else the couple type card stacks, top to bottom. */
const lines = [
  ['titleSm', 2],   // the title, which wraps to two at this width
  ['lead', 1],      // "Your couple type: The Orbit"
  ['bodySm', 3],    // the closing paragraph
];
const type = lines.reduce((total, [role, count]) => {
  const st = cardTypeNative(role, cardWidth);
  return total + (st.lineHeight || st.fontSize || 0) * count;
}, 0);

/** The wordmark row sits at the bottom of every card. */
const WORDMARK_ROW = 34;
const used = map + type + WORDMARK_ROW + PADDING;

/**
 * Width first, and it is the one that actually binds.
 *
 * A map wider than the card's content box is the obvious failure and the
 * height budget alone did not see it: at 95 per cent of a 320 point card the
 * map is 304 points across a 240 point column, and the stack still came in
 * under the card's height. Checked before the height, because it is the
 * cheaper mistake to make.
 */
const column = cardWidth - PADDING;
if (map > column) {
  console.error('[check-card-map-size] the couple map is wider than the card it sits in:');
  console.error(`  a ${NARROW} point card has a ${column} point column and the map is ${map}.`);
  console.error('');
  console.error('Lower CARD_MAP_PCT in api/_lib/storycard-style.js.');
  process.exit(1);
}

if (used > cardHeight) {
  console.error('[check-card-map-size] the couple map has grown past what the card can hold:');
  console.error(`  a ${NARROW} point card is ${Math.round(cardHeight)} points tall.`);
  console.error(`  the map takes ${map}, the type under it ${Math.round(type)}, the wordmark row ${WORDMARK_ROW},`);
  console.error(`  and the card's own padding ${PADDING}: ${Math.round(used)} in all.`);
  console.error('');
  console.error('Lower CARD_MAP_PCT in api/_lib/storycard-style.js, or take a line out from under it.');
  process.exit(1);
}

console.log(`[check-card-map-size] the map is ${Math.round(CARD_MAP_PCT * 100)}% of the card; on a ${NARROW} point phone that leaves ${Math.round(cardHeight - used)} points under the type.`);
