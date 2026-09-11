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

// And that the life answers landed in a bucket rather than only in `life`,
// which is the state this gate exists for: data present, page absent.
const lifeBucket = summary.categories.find((c) => c.rows.every((r) => r.kind === 'life') && c.rows.length);
if (summary.life.length && !lifeBucket) {
  problems.push(
    'the payload carries life rows but no category bucket holds them, so they\n'
    + '      are on the response with nowhere to read them.');
}

if (problems.length) {
  console.error('[check-nav-targets] a results link goes nowhere:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(
  `[check-nav-targets] ${navIds.length} nav links, ${RESULTS_SECTIONS.length} sections, `
  + `${summary.categories.length} expectations buckets; every link resolves and every page is reachable.`);
