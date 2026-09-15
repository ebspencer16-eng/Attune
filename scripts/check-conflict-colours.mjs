#!/usr/bin/env node
/**
 * The conflict glance is the same colour on both surfaces.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie: "Conflict styles at a glance page needs some color in the content,
 * can the bars be colored and can the section labels be colored?" Both
 * surfaces drew the two bars white and the labels white at a third opacity.
 *
 * The bar now carries the answer's own colour, and that colour has a trap in
 * it: c0 runs from "Really rocky" at 0 to "We handle it well" at 4, which is
 * the opposite way round from the pattern bands, which run from a pattern that
 * never happens to one that happens often. Read the band straight off the
 * answer and the couple who handle conflict best are painted in the colour of
 * the worst pattern. The website imports the function; the app names the same
 * two values, because it cannot import from api/.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 *   1. The app's copy of the label colour matches the module.
 *   2. The app's own colour function returns, for all five answers, exactly
 *      what the module returns. Run, not compared by eye: the flip is the part
 *      that is easy to get wrong and impossible to see in a diff.
 *   3. The best answer is the calmest band and the worst is the loudest, so a
 *      flip that cancels itself out still fails.
 */

import { readFileSync } from 'node:fs';
import { overallColor, GLANCE_LABEL, BAND_COLORS } from '../api/_conflict-results-prose.js';

const ROOT = new URL('..', import.meta.url).pathname;
const file = 'attune-app/src/components/conflict-results.tsx';
const app = readFileSync(ROOT + file, 'utf8');
const fails = [];

const label = app.match(/^const GLANCE_LABEL = '([^']+)';/m);
if (!label) fails.push(`${file} does not declare GLANCE_LABEL`);
else if (label[1].toLowerCase() !== GLANCE_LABEL.toLowerCase()) {
  fails.push(`GLANCE_LABEL is ${label[1]} in the app and ${GLANCE_LABEL} in api/_conflict-results-prose.js`);
}

/** The app's own function, lifted out and run rather than read. */
const m = app.match(/function overallTone\(bands: string\[\], value: number\): string \{([\s\S]*?)\n\}/);
if (!m) {
  fails.push(`${file} does not declare overallTone, which paints the two bars`);
} else {
  // eslint-disable-next-line no-new-func
  const appTone = new Function(`return (bands, value) => {${m[1]}\n};`)();
  for (let v = 0; v <= 4; v += 1) {
    const mine = appTone(BAND_COLORS, v);
    const theirs = overallColor(v);
    if (String(mine).toLowerCase() !== String(theirs).toLowerCase()) {
      fails.push(`answer ${v} is ${mine} in the app and ${theirs} on the website`);
    }
  }
}

// The scale's direction, said plainly, so a flip that cancels itself still fails.
if (overallColor(4) !== BAND_COLORS[0]) {
  fails.push(`"We handle it well" is ${overallColor(4)} and the calmest band is ${BAND_COLORS[0]}`);
}
if (overallColor(0) !== BAND_COLORS[BAND_COLORS.length - 1]) {
  fails.push(`"Really rocky" is ${overallColor(0)} and the loudest band is ${BAND_COLORS[BAND_COLORS.length - 1]}`);
}

if (fails.length) {
  console.error('[check-conflict-colours] the two surfaces paint the conflict glance differently:');
  for (const f of fails) console.error(`  ${f}`);
  process.exit(1);
}

console.log('[check-conflict-colours] 5 answers, same colour on both surfaces, and the scale runs the right way.');
