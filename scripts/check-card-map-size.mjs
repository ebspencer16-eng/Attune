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
 * ── AND THE SAME MAP ON THE COUPLE TYPE PAGE ──────────────────────────────
 * One property over both instances of the thing, rather than a second gate:
 * is the map the right size for the room it is in.
 *
 * That one is sized differently, because the room is different. It was a share
 * of the screen height, and Ellie: "Can the height adjust based on the device
 * it's being viewed on? So that the max height is used? 227 looks right on the
 * simulator of a 17 but on my pro max it looks small."
 *
 * A share is the wrong shape. Everything below the map is a fixed number of
 * points, so a taller phone has more spare height and a fraction hands the map
 * a smaller share of it. It is a subtraction now, and this runs the arithmetic
 * over real devices.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the map looks right at that size, which is Ellie's call. This says
 * only that the type under it still has somewhere to go, and that no phone
 * gets a map that is absurd.
 */

import { readFileSync } from 'node:fs';
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

/**
 * ── THE COUPLE TYPE PAGE'S MAP, ACROSS REAL DEVICES ───────────────────────
 * The constants are lifted out of the component by name rather than imported,
 * because couple-map.tsx is TSX and imports react-native. Reading them is the
 * same trick check-card-type-clipping uses, and it fails loudly rather than
 * passing if it cannot find one: a gate that has lost its subject must never
 * report success.
 */
const problems = [];

const mapSrc = readFileSync(new URL('../attune-app/src/components/couple-map.tsx', import.meta.url).pathname, 'utf8');
const constOf = (name) => {
  const m = new RegExp(`const ${name} = (\\d+);`).exec(mapSrc);
  if (!m) {
    console.error(`[check-card-map-size] couple-map.tsx no longer declares ${name}, which is what`
      + ' sizes the map on the couple type page. Refusing to pass.');
    process.exit(1);
  }
  return Number(m[1]);
};
const ROOM_BELOW = constOf('ROOM_BELOW');
const MAP_MIN = constOf('MAP_MIN');
const MAP_MAX = constOf('MAP_MAX');
const SIDE = constOf('SIDE');
const GUTTER = 24; // Spacing.xl, the page's own side padding

/**
 * It must be a subtraction, not a share.
 *
 * Comments blanked first. The sentence in couple-map.tsx explaining why the
 * fraction was wrong contains the fraction, so the first version of this line
 * flagged the file for recording what went wrong. That is a lesson CLAUDE.md
 * states and I had just written down again, two hours before repeating it.
 */
const mapCode = mapSrc
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));
if (/height \* 0?\.\d+/.test(mapCode)) {
  problems.push('couple-map.tsx sizes the map from a fraction of the screen height again.'
    + '\n      Everything below the map is a fixed number of points, so a taller phone has'
    + '\n      more spare height and a fraction gives the map a smaller share of it. That is'
    + '\n      exactly what Ellie reported on a Pro Max.');
}

/** Real devices, smallest to largest. */
const DEVICES = [
  ['iPhone SE', 375, 667],
  ['iPhone 17', 402, 874],
  ['iPhone 17 Pro Max', 440, 956],
  ['iPad mini', 744, 1133],
];
/**
 * ── WHAT EACH DEVICE MUST GET, TYPED OUT ──────────────────────────────────
 * These are the product's promise, not the module's current state.
 *
 * The first version compared each size against MAP_MIN and MAP_MAX read out of
 * couple-map.tsx, and two plants walked straight through: setting the floor to
 * 0 let an iPhone SE draw a 20 point map and still clear "at least the floor",
 * and capping at 240 gave a Pro Max a smaller map than the phone needs while
 * every other assertion held. A gate that reads its threshold from the file it
 * is checking is comparing a function with itself, which is a lesson this
 * codebase has learned three times and I repeated twice in one day.
 *
 * So: a floor nobody may go under, and a figure a large phone must reach.
 */
const FLOOR = 180;
const LARGE_PHONE_MIN = 280;

const sizes = [];
for (const [name, w, h] of DEVICES) {
  const size = Math.min(MAP_MAX, w - GUTTER * 2 - SIDE * 2, Math.max(MAP_MIN, h - ROOM_BELOW));
  sizes.push([name, size, h]);
  if (size < FLOOR) {
    problems.push(`${name} would draw the map at ${size} points, under the ${FLOOR} this check`
      + ' holds as the smallest a couple map can be and still be read.');
  }
  if (size > w - GUTTER * 2 - SIDE * 2) problems.push(`${name} would draw the map wider than the page.`);
}

/* The whole of what she asked for: a big phone gets a big map. "227 looks
   right on the simulator of a 17 but on my pro max it looks small." */
const proMax = sizes.find(([n]) => n.includes('Pro Max'));
if (proMax && proMax[1] < LARGE_PHONE_MIN) {
  problems.push(`an ${proMax[0]} would draw the map at ${proMax[1]}, under the ${LARGE_PHONE_MIN}`
    + ' a phone that size should reach. That is the report this check exists for: a bigger'
    + ' phone with a map that still looks small.');
}

/* The thing she actually asked for: a bigger phone gets a bigger map, until
   the tablet cap. A formula that fails this is a fraction wearing a
   subtraction's clothes. */
const phones = sizes.filter(([, s]) => s < MAP_MAX);
for (let i = 1; i < phones.length; i += 1) {
  if (phones[i][1] < phones[i - 1][1]) {
    problems.push(`${phones[i][0]} is taller than ${phones[i - 1][0]} and gets a SMALLER map`
      + ` (${phones[i][1]} against ${phones[i - 1][1]}).`);
  }
}
/* And the one measurement that has her approval. 227 on an iPhone 17 is what
   she signed off; if the reserve drifts, that number moves and this says so. */
const seventeen = sizes.find(([n]) => n === 'iPhone 17');
if (seventeen && seventeen[1] !== 227) {
  problems.push(`an iPhone 17 would now draw the map at ${seventeen[1]} rather than the 227 Ellie`
    + ' approved. If that is intended, change the number here too, deliberately.');
}

if (problems.length) {
  console.error('\n [check-card-map-size] the couple map is the wrong size for the room it is in.\n');
  for (const p of problems) console.error(`  \u2717 ${p}\n`);
  console.error('  The storycard map is CARD_MAP_PCT in api/_lib/storycard-style.js. The couple');
  console.error('  type page\'s is ROOM_BELOW, MAP_MIN and MAP_MAX in couple-map.tsx.\n');
  process.exit(1);
}

console.log(`[check-card-map-size] the storycard map is ${Math.round(CARD_MAP_PCT * 100)}% of the card;`
  + ` on a ${NARROW} point phone that leaves ${Math.round(cardHeight - used)} points under the type.`
  + ` The couple type page's map is a subtraction rather than a share, so it grows with the phone:`
  + ` ${sizes.map(([n, sz]) => `${n} ${sz}`).join(', ')}.`);
