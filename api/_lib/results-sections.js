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

import { EXPECTATIONS_CATEGORIES } from '../_questions.js';
import { INTIMACY_DIMENSIONS } from '../_intimacy-questions.js';
import { COMM_DOMAINS } from './tags.js';

export const RESULTS_SECTIONS = [
  'highlights',
  'couple-type',

  'comm-overview', 'comm-inner', 'comm-connection', 'comm-hard',

  // Conversations are numbered by position, matching how App.jsx builds them.
  'exp-overview',
  // Six, not five: Life & Values is a category a reader navigates to, and
  // building this from the responsibility list alone is what made the
  // website's link to it fall through to the storycards.
  ...EXPECTATIONS_CATEGORIES.map((_, i) => `exp-convo-${i}`),

  // Ellie: "App and site both show a detailed page for rel relf called action
  // plan. Remove that page from both web and app." The action plan itself stays;
  // it is on the at-a-glance page, where a reader sees it without a detour.
  'reflection-overview', 'reflection-ratings', 'reflection-story',

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
 * These name a section on its own, which is what a note anchored to it needs:
 * "Communication" rather than "Results at a glance". The nav below uses the
 * website's own wording, where an overview sits under its section heading and
 * "Results at a glance" reads correctly. That is the one place the two sets
 * differ, and they differ on purpose.
 */
/**
 * The heading a results page prints at the top of itself.
 *
 * ── WHY THIS IS NOT THE NAV LABEL ─────────────────────────────────────────
 * The nav says "Results at a glance" under a section heading, which reads
 * correctly there and says nothing on its own at the top of a page. So the two
 * surfaces each wrote their own page heading, and they wrote different ones:
 * the communication overview led with the couple's names on the website and
 * with the couple type's name and tagline in the app.
 *
 * Ellie, naming the four she wants and why: the couple type page has just
 * covered the type, so the communication page should not repeat it, and a page
 * titled with two names does not say what the page is.
 *
 * A section missing from here keeps whatever heading its surface already draws.
 * These are the four that had to agree.
 */
export const PAGE_TITLES = {
  'comm-overview': 'Communication Styles',
  'exp-overview': 'Expectations',
  'conflict-overview': 'Conflict Styles',
  'reflection-ratings': 'How you each view the relationship',
};

/**
 * Copy inside a page that both surfaces print.
 *
 * Small enough to feel like it does not need sharing, which is exactly how
 * "Where you each land" came to be written twice and renamed once.
 */
export const PAGE_COPY = {
  /** Over the placement bars on the communication overview. */
  commPlacements: 'Communication style overview',
  /** The tip tiles on an expectations conversation page. Takes both names. */
  expectationsTip: (you, them) => `A tip for ${you} and ${them}`,
  /**
   * The couple type page's heading.
   *
   * Ellie: "any way to make this title fit on 3 lines? Maybe just [Partner
   * name] and [Partner name]'s unique relationship dynamic". Her wording. The
   * old line, "What your responses uncover about your unique relationship
   * dynamic", ran to five on a phone and said the same thing.
   */
  coupleTypeTitle: (you, them) => `${you} and ${them}'s unique relationship dynamic`,
};

export const RESULTS_SECTION_LABELS = {
  'highlights': 'Highlights',
  'couple-type': 'Couple Type',
  'comm-overview': 'Communication',
  'comm-inner': 'Internal Processing',
  'comm-connection': 'How You Connect',
  'comm-hard': 'When Things Get Hard',
  'exp-overview': 'Expectations',
  ...Object.fromEntries(EXPECTATIONS_CATEGORIES.map((cat, i) => [`exp-convo-${i}`, cat.label])),
  'reflection-overview': 'Relationship Reflection',
  'reflection-ratings': 'How You Each Rated',
  'reflection-story': 'Side by Side',
  'intimacy-overview': 'Physical Intimacy',
  ...Object.fromEntries(INTIMACY_DIMENSIONS.map(d => [`intimacy-${d.id}`, d.label])),
  'intimacy-plan': 'Conversations Worth Having',
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

/**
 * The results navigation, as two levels.
 *
 * ── WHY THIS IS HERE ──────────────────────────────────────────────────────
 * src/App.jsx built this tree as `sidebarSections`, with its own labels, and
 * the app built a flat list with different labels again. So the same screen
 * was called "Results at a glance" on a laptop and "Communication" on a phone,
 * and "Conversations Worth Having" became "Conversations".
 *
 * A group with no children is a page. A group with children is a section whose
 * children are pages, and the first child is always the overview.
 *
 * Labels are the website's, exactly, because the website is the product this
 * is meant to match.
 */
export function resultsNav({ hasReflection = false, intimacyReady = false, conflictListed = false } = {}) {
  const AT_A_GLANCE = 'Results at a glance';

  const groups = [
    { id: 'highlights', label: 'Highlights', color: '#E8673A' },
    { id: 'couple-type', label: 'Couple Type', color: '#E8673A' },
    {
      id: 'comm', label: 'Communication', shortLabel: 'Comms', color: '#9B5DE5',
      children: [
        { id: 'comm-overview', label: AT_A_GLANCE },
        ...COMM_DOMAINS.map(d => ({ id: `comm-${d.id}`, label: d.label, color: d.color })),
      ],
    },
    {
      id: 'exp', label: 'Expectations', color: '#1B5FE8',
      children: [
        { id: 'exp-overview', label: AT_A_GLANCE },
        ...EXPECTATIONS_CATEGORIES.map((cat, i) => ({
          id: `exp-convo-${i}`, label: cat.label, color: '#10B981',
        })),
      ],
    },
  ];

  if (hasReflection) {
    groups.push({
      id: 'reflection', label: 'Relationship Reflection', shortLabel: 'Rel. Refl.', color: '#1B5FE8',
      children: [
        { id: 'reflection-overview', label: AT_A_GLANCE },
        { id: 'reflection-ratings', label: 'How You Each Rated' },
        { id: 'reflection-story', label: 'Side by Side' },
      ],
    });
  }

  if (intimacyReady) {
    groups.push({
      id: 'intimacy', label: 'Physical Intimacy', shortLabel: 'Intimacy', color: '#B5546E',
      children: [
        { id: 'intimacy-overview', label: AT_A_GLANCE },
        ...INTIMACY_DIMENSIONS.map(d => ({ id: `intimacy-${d.id}`, label: d.label })),
        { id: 'intimacy-plan', label: 'Conversations Worth Having' },
      ],
    });
  }

  if (conflictListed) {
    groups.push({
      id: 'conflict', label: 'Conflict Patterns', shortLabel: 'Conflict', color: '#1B5FE8',
      children: [
        { id: 'conflict-overview', label: AT_A_GLANCE },
        { id: 'conflict-snapshot', label: 'Your Conflict Snapshot' },
        { id: 'conflict-patterns', label: 'Your Patterns' },
        { id: 'conflict-wrote', label: 'What You Each Wrote' },
      ],
    });
  }

  groups.push({ id: 'what-comes-next', label: 'What Comes Next', shortLabel: "What's Next", color: '#E8673A' });
  return groups;
}

/** Every page id the nav can reach, in order. */
export function navPageIds(opts) {
  return resultsNav(opts).flatMap(g => (g.children ? g.children.map(c => c.id) : [g.id]));
}
