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

/** Sections are a fixed set, so membership is the whole validation. */
export function isResultsSection(key) {
  return RESULTS_SECTIONS.includes(key);
}
