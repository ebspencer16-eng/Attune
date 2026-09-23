#!/usr/bin/env node
/**
 * The Expectations pages can be reordered. Their ids cannot.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * A category's results page is `exp-convo-N`. That N is the category's own
 * number and stays with it wherever the page moves in the flow.
 *
 * ── THE BUG IT WOULD HAVE BEEN ────────────────────────────────────────────
 * Ellie: "Please move life and values to be the first expectations page in the
 * results flow."
 *
 * One line, in the one list that is already the single source of that order.
 * And N was that list's index, so the line would have renamed all six pages.
 * A note anchored to a results section is anchored by exactly that string, so
 * every mark anyone had made on an Expectations page would have been left
 * pointing at whichever category moved into its place: shown on the Notes tab
 * under the wrong heading, and unplaceable on the page it opened.
 *
 * The same line would also have broken the pages themselves, more loudly and
 * more usefully. `expectations.js` picked a category's rows by comparing the
 * display index to `categoryIndex`, which is an index into a different list.
 * They agreed only because the five responsibilities happened to come first in
 * both. That is fixed too: rows carry their category's id.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * The map of category to number is pinned here, and it is the only copy of it
 * that is not derived. That is deliberate and it is what a pin is: the point
 * of this file is to be the thing that does not move when the other list does.
 *
 * Both directions. A category that loses its number fails; a number that
 * changes hands fails; a new category reusing a retired number fails.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Not the order. The order is Ellie's and it is expected to change; that is
 * the whole reason the id was taken off it. This says nothing about which page
 * comes first.
 *
 * Not the other sections. Every other results section is a written-out string
 * already, so none of them has a position to drift with. It is only these six
 * that were generated from an index.
 */

import { EXPECTATIONS_CATEGORIES } from '../api/_questions.js';
import { RESULTS_SECTIONS, RESULTS_SECTION_LABELS } from '../api/_lib/results-sections.js';

/**
 * The number each category has, and keeps.
 *
 * These are the positions the pages were in when the ids were first minted. A
 * new category takes 6, then 7, wherever in the flow it is placed. Nothing in
 * here may be edited: an anchor already in someone's notes names one of these.
 */
const PINNED = {
  household: 'exp-convo-0',
  financial: 'exp-convo-1',
  career: 'exp-convo-2',
  emotional: 'exp-convo-3',
  extended_family: 'exp-convo-4',
  life: 'exp-convo-5',
};

const fails = [];
const seen = new Map();

for (const cat of EXPECTATIONS_CATEGORIES) {
  const want = PINNED[cat.id];
  if (!want) {
    fails.push(`'${cat.id}' is a category with no pinned section id. A new one`
      + ' takes the next unused number, written into PINNED here, and it may be'
      + ' placed anywhere in the flow.');
    continue;
  }
  if (cat.section !== want) {
    fails.push(`'${cat.id}' is now ${cat.section} and has always been ${want}.`
      + ' A mark on an Expectations page is anchored by that string, so moving'
      + ' it leaves every existing mark on this category pointing somewhere'
      + ' else. Reorder the array, not the numbers.');
  }
  if (seen.has(cat.section)) {
    fails.push(`${cat.section} belongs to both '${seen.get(cat.section)}' and`
      + ` '${cat.id}'. Two categories on one page id is one page.`);
  }
  seen.set(cat.section, cat.id);
}

for (const [id, section] of Object.entries(PINNED)) {
  if (EXPECTATIONS_CATEGORIES.some((c) => c.id === id)) continue;
  fails.push(`'${id}' is pinned to ${section} and is no longer a category.`
    + ' Leave the line here: the number is retired, not free, because notes'
    + ' anchored to it still exist.');
}

/** And the registry has to carry every one of them, with its label. */
for (const cat of EXPECTATIONS_CATEGORIES) {
  if (!RESULTS_SECTIONS.includes(cat.section)) {
    fails.push(`${cat.section} (${cat.label}) is not in RESULTS_SECTIONS, so`
      + ' nothing can navigate to it and isResultsSection refuses its anchors.');
  }
  if (RESULTS_SECTION_LABELS[cat.section] !== cat.label) {
    fails.push(`${cat.section} is labelled `
      + `'${RESULTS_SECTION_LABELS[cat.section]}' in the registry and`
      + ` '${cat.label}' in the category list.`);
  }
}

if (fails.length) {
  console.error('\n check-expectations-order: an Expectations page changed its id.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`✓ check-expectations-order: ${EXPECTATIONS_CATEGORIES.length} categories,`
  + ` each on the id it has always had; the flow opens on ${EXPECTATIONS_CATEGORIES[0].label}.`);
