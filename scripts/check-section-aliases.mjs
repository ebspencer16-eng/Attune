#!/usr/bin/env node
/**
 * A page that was renamed still answers to its old name.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * A note is found by the id of the results page it sits on, and nothing else.
 * Rename a page and every mark anyone has made on it stops resolving: the row
 * is still in the table, the words are still in the results, and the note is
 * invisible on every surface. No error, nothing logged.
 *
 * That is the same shape as the copy edit that deleted Ellie's own intimacy
 * answer, which is why this gate exists before the second occurrence rather
 * than after it. Physical Intimacy went from six dimension pages to two at her
 * ask; the six old ids are aliased to the two new ones.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 * Every alias points at a section that exists today. Every alias is NOT itself
 * a live section, because an id that is both is an id the nav will offer and
 * the resolver will redirect, which is a loop waiting to be written. And the
 * validator accepts an aliased id, because a note anchored to one has to keep
 * validating on its next write.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the words a note was anchored to still appear on the page it now
 * points at. They often will not, and a mark whose sentence is gone is not
 * drawn, which is the documented behaviour everywhere else. This is about the
 * page being reachable, not about the sentence surviving.
 */

const ROOT = new URL('..', import.meta.url).pathname;
const {
  RESULTS_SECTIONS, RETIRED_SECTIONS, currentSection, isResultsSection,
} = await import(`${ROOT}api/_lib/results-sections.js`);

const problems = [];
const live = new Set(RESULTS_SECTIONS);
const aliases = Object.entries(RETIRED_SECTIONS || {});

if (!aliases.length) {
  console.log('[check-section-aliases] no sections have been renamed; nothing to check.');
  process.exit(0);
}

for (const [from, to] of aliases) {
  if (!live.has(to)) {
    problems.push(`'${from}' points at '${to}', which is not a section any more.`);
  }
  if (live.has(from)) {
    problems.push(`'${from}' is listed as retired and is still a live section.`);
  }
  if (!isResultsSection(from)) {
    problems.push(`'${from}' is retired but the anchor validator refuses it, so notes on it fail to save.`);
  }
  if (currentSection(from) !== to) {
    problems.push(`currentSection('${from}') is '${currentSection(from)}', not '${to}'.`);
  }
}

/** And a live id must resolve to itself, or every lookup is a redirect. */
for (const id of RESULTS_SECTIONS) {
  if (currentSection(id) !== id) {
    problems.push(`currentSection('${id}') redirects a live section to '${currentSection(id)}'.`);
  }
}

if (problems.length) {
  console.error('[check-section-aliases] a renamed page has lost its old name:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('Notes are anchored by section id. See RETIRED_SECTIONS in');
  console.error('api/_lib/results-sections.js.');
  process.exit(1);
}

console.log(`[check-section-aliases] ${aliases.length} renamed sections, every one still resolving.`);
