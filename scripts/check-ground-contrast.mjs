#!/usr/bin/env node
/**
 * White type on a results ground has to be readable.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie: "The content is hard to read against these colors. How can we adjust
 * the bgs to make the content readable?"
 *
 * Every at-a-glance page and every expectations conversation page sets white
 * type on a gradient. Four of the five grounds ended somewhere between 3.0 and
 * 4.5 to 1 against white, and 4.5 is the ratio body text needs. It is not a
 * matter of taste and it is not something to judge by eye on one screen in one
 * room: it is a number, so it is measured.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 * Every stop of every fixed ground, and every stop of the ground each of the
 * six expectations categories generates.
 *
 * The category half is worth being honest about: those stops are built by
 * groundForCategory, which passes them through readable(), so a category
 * arriving with a pale colour is already handled and planting one here proves
 * nothing. What that half actually checks is that the generator is still the
 * thing generating them. Build a category ground any other way and this is
 * what says so.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Type set at less than full white, of which there is plenty: a caption at 60
 * per cent on a ground that clears 4.6 does not clear it itself. That is a
 * real and separate question, and pretending this covers it would be worse
 * than not checking it at all.
 */

import {
  SECTION_GROUNDS, groundForCategory, contrastOnWhiteText, READABLE,
} from '../api/_lib/section-grounds.js';
import { EXPECTATIONS_CATEGORIES } from '../api/_questions.js';

const fails = [];
let stops = 0;

for (const [id, g] of Object.entries(SECTION_GROUNDS)) {
  for (const stop of g.stops) {
    stops += 1;
    const r = contrastOnWhiteText(stop);
    if (r < READABLE) {
      fails.push(`${id}: white type on ${stop} is ${r.toFixed(1)} to 1, and body text needs ${READABLE}`);
    }
  }
}

for (const cat of EXPECTATIONS_CATEGORIES) {
  for (const stop of groundForCategory(cat.color)) {
    stops += 1;
    const r = contrastOnWhiteText(stop);
    if (r < READABLE) {
      fails.push(`${cat.label}'s page: white type on ${stop} is ${r.toFixed(1)} to 1, and body text needs ${READABLE}`);
    }
  }
}

if (fails.length) {
  console.error('[check-ground-contrast] white type would be hard to read on a results ground:');
  for (const f of fails) console.error(`  ${f}`);
  console.error('');
  console.error('readable() in api/_lib/section-grounds.js takes a colour down until it');
  console.error('clears the ratio. Pass the stop through it rather than picking by eye.');
  process.exit(1);
}

console.log(`[check-ground-contrast] ${stops} stops across ${Object.keys(SECTION_GROUNDS).length} grounds and ${EXPECTATIONS_CATEGORIES.length} categories; white type clears ${READABLE} to 1 on every one.`);
