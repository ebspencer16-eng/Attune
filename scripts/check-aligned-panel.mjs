#!/usr/bin/env node
/**
 * The Already aligned panel is the same colour on both surfaces, and visible
 * on every category's page.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie: "Career and work is the only one that clashes and makes the already
 * aligned section hard to see."
 *
 * The panel was the section green at 7 per cent over whatever the page's
 * ground is. A translucent panel has no colour of its own; it borrows the one
 * underneath. Over the violet page it read green and over Career & Work's
 * orange page it read orange, so on one page in six the thing that says "you
 * already agree about these" was invisible.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 *   1. The three colours the app names match api/_lib/section-grounds.js,
 *      which the website reads directly. The app cannot import it.
 *   2. The fill is opaque. A translucent one is the bug returning in its
 *      original form, and it would pass a colour comparison.
 *   3. White type on the fill clears the readable ratio, and the fill is
 *      distinguishable from all six category grounds, which is what "hard to
 *      see" meant.
 */

import { readFileSync } from 'node:fs';
import {
  ALIGNED_PANEL, groundForCategory, contrastOnWhiteText, READABLE,
} from '../api/_lib/section-grounds.js';
import { EXPECTATIONS_CATEGORIES } from '../api/_questions.js';

const ROOT = new URL('..', import.meta.url).pathname;
const app = readFileSync(`${ROOT}attune-app/src/components/results.tsx`, 'utf8');
const fails = [];

/** What the app names, against what the module says. */
const NAMED = [
  ['ALIGNED_FILL', ALIGNED_PANEL.fill],
  ['ALIGNED_HEAD', ALIGNED_PANEL.head],
  ['ALIGNED_BORDER', ALIGNED_PANEL.border],
];
for (const [name, want] of NAMED) {
  const m = app.match(new RegExp(`^const ${name} = '([^']+)';`, 'm'));
  if (!m) {
    fails.push(`the app does not declare ${name}; api/_lib/section-grounds.js says it is ${want}`);
  } else if (m[1].toLowerCase() !== String(want).toLowerCase()) {
    fails.push(`${name} is ${m[1]} in the app and ${want} in api/_lib/section-grounds.js`);
  }
}

// Opaque, or it is borrowing the page's colour again.
if (/rgba|hsla/i.test(String(ALIGNED_PANEL.fill)) || /rgba|hsla/i.test(String(ALIGNED_PANEL.head))) {
  fails.push('the panel fill is translucent, so it takes the colour of whatever page it is on. That is the bug this exists for.');
}

/**
 * The panel's own type on the panel, not white on it: this tile is pale and
 * its type is ink. Checked the same way the grounds are, with the same ratio.
 */
const ratio = (fg, bg) => {
  const L = (hex) => {
    const p = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
  };
  const [a, b] = [L(fg), L(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
};
for (const [what, fg] of [['its body type', ALIGNED_PANEL.text], ['its heading', ALIGNED_PANEL.accent]]) {
  const r = ratio(fg, ALIGNED_PANEL.fill);
  if (r < READABLE) {
    fails.push(`${what} on the panel is ${r.toFixed(1)} to 1, and it needs ${READABLE}`);
  }
}

/**
 * Visible against every page it can sit on.
 *
 * Distance in plain rgb, which is crude and is enough for the question being
 * asked: is this panel a different colour from the page behind it. Anything
 * under 60 is two shades of one colour.
 */
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const distance = (a, b) => {
  const [x, y] = [rgb(a), rgb(b)];
  return Math.sqrt(x.reduce((t, v, i) => t + (v - y[i]) ** 2, 0));
};
for (const cat of EXPECTATIONS_CATEGORIES) {
  for (const stop of groundForCategory(cat.color)) {
    const d = distance(ALIGNED_PANEL.fill, stop);
    if (d < 60) {
      fails.push(`on ${cat.label}'s page the panel (${ALIGNED_PANEL.fill}) is ${Math.round(d)} away from the ground (${stop}), which reads as the same colour`);
    }
  }
}

if (fails.length) {
  console.error('[check-aligned-panel] the Already aligned panel is not doing its job:');
  for (const f of fails) console.error(`  ${f}`);
  process.exit(1);
}

console.log(`[check-aligned-panel] one panel colour on both surfaces, opaque, readable, and distinct from all ${EXPECTATIONS_CATEGORIES.length} category grounds.`);
