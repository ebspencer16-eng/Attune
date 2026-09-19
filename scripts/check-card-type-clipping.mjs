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
 * ── AND THEN IT HAPPENED A THIRD TIME ─────────────────────────────────────
 * Ellie, months later: "Percentages are cut off on some storycards." The 90%
 * on the alignment card had lost the top ring of its % sign.
 *
 * This gate was passing, and it was right to: cardTypeNative floors the line
 * height and always has. The app was never calling it. An Expo project cannot
 * import from api/, so highlight-cards.tsx carries its own copy of the same
 * arithmetic, and that copy had no floor. The gate tested the function nothing
 * on the phone runs.
 *
 * That is the failure this codebase is organised against, wearing a gate as a
 * disguise: one rule in two places, and the check pointed at the half that was
 * already correct.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 * Both functions, for every role at several card widths:
 *
 *   1. cardTypeNative, the server's copy.
 *   2. `t()` inside attune-app/src/components/highlight-cards.tsx, the app's,
 *      lifted out of the file and executed rather than read. It is the one
 *      that draws the card, so it is the one that has to be run.
 *
 * Each has to give a line height at least as tall as its font size, and the
 * two have to agree with each other. Agreement is the half that matters: a
 * floor in only one of them is how this came back.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The website, where the tight leading is correct and wanted. This is about
 * what the same scale does on the other surface.
 *
 * Horizontal fit. A figure too wide for its card is a different bug with a
 * different cause, and pretending this covers it would be worse than not
 * covering it.
 */

import { readFileSync } from 'node:fs';
import { transform } from 'esbuild';
import { CARD_TYPE, CARD_REF_WIDTH, STORYCARD_STYLE, cardTypeNative } from '../api/_lib/storycard-style.js';

/** A small phone, the reference, and a large phone. */
const WIDTHS = [320, CARD_REF_WIDTH, 440];

const ROOT = new URL('..', import.meta.url).pathname;
const CARDS = `${ROOT}attune-app/src/components/highlight-cards.tsx`;

/**
 * The app's `t()`, lifted out of the card file and made callable.
 *
 * Reading it would be a description of the rule, and a description is what
 * drifts. It is extracted by brace depth from `function t(`, stripped of its
 * types by esbuild, and handed the two things it closes over: `SC`, which
 * carries the scale and the line-box ratios the payload sends, and `Fonts`,
 * whose values only have to be distinguishable from one another here.
 *
 * If the function is renamed or moved this throws rather than passing, which
 * is the behaviour that matters: a gate that cannot find its subject must not
 * report success.
 */
async function appType() {
  const src = readFileSync(CARDS, 'utf8');
  const at = src.indexOf('function t(');
  if (at < 0) throw new Error('cannot find `function t(` in highlight-cards.tsx');
  let depth = 0, end = -1, seen = false;
  for (let i = at; i < src.length; i++) {
    if (src[i] === '{') { depth++; seen = true; }
    else if (src[i] === '}') { depth--; if (seen && depth === 0) { end = i + 1; break; } }
  }
  if (end < 0) throw new Error('cannot find the end of `t()` in highlight-cards.tsx');

  const { code } = await transform(src.slice(at, end), { loader: 'ts' });
  const make = new Function('SC', 'Fonts', `${code}; return t;`);
  const Fonts = {
    display: 'PlayfairDisplay', body: 'DMSans', bodyLight: 'DMSansLight',
    bodyMedium: 'DMSansMedium', bodySemiBold: 'DMSansSemiBold', bodyBold: 'DMSansBold',
  };
  // The scale exactly as the app receives it, so this measures the real path.
  return make({ type: CARD_TYPE, lineBox: STORYCARD_STYLE.lineBox }, Fonts);
}

const t = await appType();

const fails = [];
for (const role of Object.keys(CARD_TYPE)) {
  for (const w of WIDTHS) {
    const server = cardTypeNative(role, w);
    const app = t(role, w);

    for (const [who, style] of [['api/_lib/storycard-style.js', server], ['the app', app]]) {
      if (style.lineHeight == null || style.fontSize == null) continue;
      if (style.lineHeight < style.fontSize) {
        fails.push(`${role} at a ${w} point card, in ${who}: ${style.fontSize} point glyph in a ${style.lineHeight} point line box`);
      }
    }

    // The two copies have to give the same answer. A floor in one of them is
    // exactly how the % came back.
    for (const k of ['fontSize', 'lineHeight', 'fontWeight', 'letterSpacing', 'fontFamily']) {
      if (String(server[k]) !== String(app[k])) {
        fails.push(`${role} at a ${w} point card: ${k} is ${server[k]} on the server and ${app[k]} in the app.`);
      }
    }
  }
}

if (fails.length) {
  console.error('[check-card-type-clipping] a storycard glyph will be clipped from the top:');
  for (const f of fails) console.error(`  ${f}`);
  console.error('');
  console.error('React Native clips rather than overflowing. Both cardTypeNative and the');
  console.error('app\'s own t() floor the line height at the face\'s line box, from the same');
  console.error('ratios; see api/_lib/font-metrics.js. A floor in only one of them is how');
  console.error('this came back a third time.');
  process.exit(1);
}

console.log(
  `[check-card-type-clipping] ${Object.keys(CARD_TYPE).length} roles at ${WIDTHS.length} card widths, `
  + 'through both the server\'s sizing and the app\'s own; every glyph fits its line box and the two agree.');
