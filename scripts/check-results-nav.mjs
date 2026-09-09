// Fails the build when the results nav and the results section list disagree.
//
// Two things that must be the same set: RESULTS_SECTIONS is what a section id
// can be, and resultsNav() is how a person reaches one. A page in the list
// with no nav entry is unreachable; a nav entry with no page is a dead link.
// Notes anchor to these ids, so either one silently breaks annotations.
//
// It also checks the labels, because that was the actual bug: the website
// called a screen "Results at a glance" and the app called the same screen
// "Communication", and "Conversations Worth Having" became "Conversations".

import { RESULTS_SECTIONS, RESULTS_SECTION_LABELS, resultsNav, navPageIds } from '../api/_lib/results-sections.js';

const ALL = { hasReflection: true, intimacyReady: true, conflictListed: true };
const problems = [];

const pages = navPageIds(ALL);

const missingFromNav = RESULTS_SECTIONS.filter((id) => !pages.includes(id));
if (missingFromNav.length) problems.push(`sections with no nav entry: ${missingFromNav.join(', ')}`);

const missingFromList = pages.filter((id) => !RESULTS_SECTIONS.includes(id));
if (missingFromList.length) problems.push(`nav entries that are not sections: ${missingFromList.join(', ')}`);

if (JSON.stringify(pages) !== JSON.stringify(RESULTS_SECTIONS)) {
  problems.push('the nav visits sections in a different order from RESULTS_SECTIONS');
}

// Every page has a name in both places, and the same one.
for (const group of resultsNav(ALL)) {
  const entries = group.children || [group];
  for (const entry of entries) {
    if (!entry.label) problems.push(`${entry.id} has no label in the nav`);
    const listed = RESULTS_SECTION_LABELS[entry.id];
    if (!listed) problems.push(`${entry.id} has no label in RESULTS_SECTION_LABELS`);
  }
}

// A group either is a page or has pages. Both, or neither, is a nav that
// cannot be rendered as two levels.
for (const group of resultsNav(ALL)) {
  const isPage = RESULTS_SECTIONS.includes(group.id);
  const hasChildren = Array.isArray(group.children) && group.children.length > 0;
  if (isPage && hasChildren) problems.push(`${group.id} is both a page and a section`);
  if (!isPage && !hasChildren) problems.push(`${group.id} is neither a page nor a section`);
}

if (problems.length) {
  console.error('[check-results-nav] the nav and the section list disagree:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`[check-results-nav] ${resultsNav(ALL).length} groups reaching all ${pages.length} sections, in order.`);
