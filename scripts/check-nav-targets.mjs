// Fails the build when a results nav offers a link to a section that does not
// exist.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// Ellie: "Expectations life and values page link is broken. Left nav tap and
// bottom right nav button on previous page just send you to the highlights
// clickthrough."
//
// Expectations has six categories a reader navigates: five responsibility
// groups and Life & Values. src/App.jsx built its sidebar from its own
// six-entry list and produced exp-convo-5; api/_lib/results-sections.js built
// the section registry from RESPONSIBILITY_CATEGORIES, which is the five.
//
// So the website offered a link to exp-convo-5, isResultsSection said no, and
// the click fell through to the storycards. The app was worse off and nobody
// had noticed: its nav is this registry, so it was never offered the page at
// all, and the life answers sat on the payload with nowhere to read them.
//
// Both lists were correct for their own purpose. RESPONSIBILITY_CATEGORIES is
// the right input for scoring, because a life question is answered and
// compared differently. It is the wrong input for navigation, and it was being
// used for both.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// Every id the nav offers is a section the registry knows, every section is
// reachable from the nav, and every bucket the expectations payload sends
// navigates somewhere real. Three directions, because a link to nothing and a
// page nothing links to are the same bug from opposite ends.

import {
  RESULTS_SECTIONS, resultsNav, isResultsSection, availableSections,
} from '../api/_lib/results-sections.js';
import { expectationsSummary } from '../api/_lib/expectations.js';
import { RESPONSIBILITY_CATEGORIES, LIFE_QUESTIONS } from '../api/_questions.js';

const problems = [];

// Everything owned, so every section that can exist is in play.
const opts = { hasReflection: true, intimacyReady: true, conflictListed: true };
const nav = resultsNav(opts);
const navIds = nav.flatMap((g) => (g.children ? g.children.map((c) => c.id) : [g.id]));

// ── 1. Every link goes somewhere ───────────────────────────────────────────
for (const id of navIds) {
  if (isResultsSection(id)) continue;
  problems.push(
    `the nav offers "${id}", which is not a results section. Tapping it falls\n`
    + '      through to the storycards, which looks like a dead link and is one.');
}

// ── 2. Every page is reachable ─────────────────────────────────────────────
const reachable = new Set(navIds);
for (const id of availableSections(opts)) {
  if (reachable.has(id)) continue;
  problems.push(
    `"${id}" is a results section that the nav never offers, so nothing in the\n`
    + '      product leads to it.');
}

// ── 3. Every expectations bucket navigates somewhere ───────────────────────
// The payload's categories carry a `section` the app navigates to. A bucket
// pointing at a section the registry does not have is the same dead link,
// reached through data rather than through markup.
const answers = { responsibilities: {}, life: {} };
for (const cat of RESPONSIBILITY_CATEGORIES) {
  for (const item of cat.items) answers.responsibilities[`${cat.id}__${item}`] = 'me';
}
for (const q of LIFE_QUESTIONS) answers.life[q.id] = 'Yes';

const summary = expectationsSummary({
  mine: answers, theirs: answers, youName: 'A', themName: 'B',
});
for (const cat of summary.categories) {
  if (!isResultsSection(cat.section)) {
    problems.push(
      `the expectations payload sends a "${cat.label}" bucket pointing at\n`
      + `      "${cat.section}", which is not a results section.`);
  }
  if (!reachable.has(cat.section)) {
    problems.push(
      `the expectations payload sends a "${cat.label}" bucket for "${cat.section}",\n`
      + '      which the nav never offers, so the app has the answers and no page.');
  }
}

/**
 * The life answers land in exactly one bucket.
 *
 * ── ONE, NOT ZERO ─────────────────────────────────────────────────────────
 * Zero is the state this gate was written for: the category list was built
 * from the five responsibility categories, so the life answers rode along on
 * the response as `life` with no page to read them on.
 *
 * ── ONE, NOT TWO ──────────────────────────────────────────────────────────
 * Two is what happened next. The payload started carrying all six categories
 * and kept sending `life` as well, and the app rendered both, so Ellie saw two
 * Life & Values dropdowns on Expectations at a glance. The duplicate was also
 * the broken one: it carried section 'life', which is not a results section.
 *
 * The field is gone now, and this counts buckets so neither state can return.
 */
const lifeBuckets = summary.categories.filter(
  (c) => c.rows.length && c.rows.every((r) => r.kind === 'life'));
if (lifeBuckets.length === 0) {
  problems.push(
    'no category bucket holds the life answers, so they are on the response\n'
    + '      with nowhere to read them.');
} else if (lifeBuckets.length > 1) {
  problems.push(
    `${lifeBuckets.length} category buckets hold the life answers `
    + `(${lifeBuckets.map((c) => c.section).join(', ')}),\n`
    + '      so the page lists Life & Values more than once.');
}
if ('life' in summary) {
  problems.push(
    'the expectations payload still carries a separate `life` array. Those rows\n'
    + '      are categories[5].rows now, and sending them twice is what put two\n'
    + '      Life & Values dropdowns on the app.');
}

if (problems.length) {
  console.error('[check-nav-targets] a results link goes nowhere:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(
  `[check-nav-targets] ${navIds.length} nav links, ${RESULTS_SECTIONS.length} sections, `
  + `${summary.categories.length} expectations buckets; every link resolves and every page is reachable.`);
