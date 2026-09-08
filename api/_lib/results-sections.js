/**
 * Every section of the results experience, by the id things anchor to.
 *
 * ── WHY THIS FILE ─────────────────────────────────────────────────────────
 * The list existed twice and disagreed. src/App.jsx builds the results nav from
 * availableSections(), which includes the four Conflict Patterns screens. The
 * anchor validator in _lib/tags.js carried its own regex, written before
 * Conflict Patterns shipped and never updated, so it accepted every section
 * except that one.
 *
 * Nothing errored. Annotating a Conflict Patterns screen simply returned
 * "invalid anchor" and the note was refused, which is the quietest possible way
 * for a feature to not exist.
 *
 * The dynamic parts derive. Expectations conversations are numbered by position
 * over the real category list, and intimacy sections are named after the real
 * dimension ids, so adding a category or a dimension extends this list without
 * anyone remembering to.
 *
 * Still restated in src/App.jsx and attune-app/src/constants/anchors.ts. Both
 * should read from here; App.jsx is the web results UI and attune-app cannot
 * import across packages, so neither is converted yet. See HANDOFF.md.
 */

import { RESPONSIBILITY_CATEGORIES } from '../_questions.js';
import { INTIMACY_DIMENSIONS } from '../_intimacy-questions.js';

export const RESULTS_SECTIONS = [
  'highlights',
  'couple-type',

  'comm-overview', 'comm-inner', 'comm-connection', 'comm-hard',

  // Conversations are numbered by position, matching how App.jsx builds them.
  'exp-overview',
  ...RESPONSIBILITY_CATEGORIES.map((_, i) => `exp-convo-${i}`),

  'reflection-overview', 'reflection-ratings', 'reflection-story', 'reflection-plan',

  'intimacy-overview',
  ...INTIMACY_DIMENSIONS.map(d => `intimacy-${d.id}`),
  'intimacy-plan',

  // The four that the old regex silently refused.
  'conflict-overview', 'conflict-snapshot', 'conflict-patterns', 'conflict-wrote',

  'what-comes-next',
];

/**
 * What each section is called.
 *
 * Built beside the ids, so a section can never exist without a name. The
 * expectations conversations and the intimacy dimensions are generated from the
 * live lists, which is exactly why they cannot be written out by hand anywhere:
 * the iOS app kept its own map and had labels for the fixed sections and none
 * for these eleven, so an annotation on one of them read as a raw key.
 *
 * Labels match the web's results nav.
 */
export const RESULTS_SECTION_LABELS = {
  'highlights': 'Highlights',
  'couple-type': 'Couple Type',
  'comm-overview': 'Communication',
  'comm-inner': 'Internal Processing',
  'comm-connection': 'How You Connect',
  'comm-hard': 'When Things Get Hard',
  'exp-overview': 'Expectations',
  ...Object.fromEntries(RESPONSIBILITY_CATEGORIES.map((cat, i) => [`exp-convo-${i}`, cat.label])),
  'reflection-overview': 'Relationship Reflection',
  'reflection-ratings': 'How You Each Rated',
  'reflection-story': 'Side by Side',
  'reflection-plan': 'Action Plan',
  'intimacy-overview': 'Physical Intimacy',
  ...Object.fromEntries(INTIMACY_DIMENSIONS.map(d => [`intimacy-${d.id}`, d.label])),
  'intimacy-plan': 'Conversations',
  'conflict-overview': 'Conflict Patterns',
  'conflict-snapshot': 'Your Conflict Snapshot',
  'conflict-patterns': 'Your Patterns',
  'conflict-wrote': 'What You Each Wrote',
  'what-comes-next': 'What Comes Next',
};

/**
 * The sections a particular couple can actually reach, in order.
 *
 * The same rule as the web's availableSections(), moved here so there is one
 * of it. The website built this list, the app built a different one with six
 * entries and its own labels, and the two products stopped being the same
 * product: a couple who owned Expectations saw eleven conversation screens on
 * a laptop and none on their phone.
 *
 * Everything not owned is genuinely absent rather than listed and locked.
 * Listing it would be advertising inside results, which is the wrong place to
 * sell anything. Owned-but-not-ready is a different state and stays visible,
 * because a section that vanishes reads as a bug.
 */
export function availableSections({ hasReflection = false, intimacyReady = false, conflictListed = false } = {}) {
  return RESULTS_SECTIONS.filter((id) => {
    if (id.startsWith('reflection-')) return hasReflection;
    if (id.startsWith('intimacy-')) return intimacyReady;
    if (id.startsWith('conflict-')) return conflictListed;
    return true;
  });
}

/**
 * The section list with the labels attached, which is what a nav needs.
 *
 * Returned by /api/results so the app never decides for itself what results
 * contain.
 */
export function sectionsWithLabels(opts) {
  return availableSections(opts).map((id) => ({ id, label: RESULTS_SECTION_LABELS[id] }));
}

/** Sections are a fixed set, so membership is the whole validation. */
export function isResultsSection(key) {
  return RESULTS_SECTIONS.includes(key);
}
