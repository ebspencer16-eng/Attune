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

import { EXERCISES } from '../_exercises.js';
import { EXPECTATIONS_CATEGORIES } from '../_questions.js';
import { INTIMACY_DIMENSIONS, INTIMACY_DOMAINS } from '../_intimacy-questions.js';
import { COMM_DOMAINS } from './tags.js';
import { SECTION_GROUNDS, groundFor, groundLocations, groundForCategory } from './section-grounds.js';

/**
 * The cover page each exercise section opens on. See `cover` in resultsNav.
 *
 * Listed here as well as built there because this is the list the anchor
 * validator reads: a section id the validator does not know refuses every note
 * anchored to it, silently, which is how Conflict Patterns went a release
 * without being annotatable.
 */
/**
 * Section ids that no longer exist, and the page that took their place.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Physical Intimacy had a page per aspect and now has two pages, at Ellie's
 * ask. A note is found by the id of the page it sits on, so every mark anyone
 * has made on `intimacy-frequency` and its five siblings would simply stop
 * resolving: no error, no warning, the note still in the table and invisible
 * on every surface.
 *
 * That is the same failure as the copy edit that lost her own answer, and it
 * is avoidable in exactly the same way: keep the old name, say what it became,
 * and resolve through it. check-section-aliases holds every alias to a section
 * that exists and fails the build if a retired id is left pointing nowhere.
 *
 * The anchor validator accepts these, so an old note still validates. The nav
 * never offers them, so nothing new is written against one.
 */
export const RETIRED_SECTIONS = Object.fromEntries(
  INTIMACY_DOMAINS.flatMap(d => d.dims.map(dim => [`intimacy-${dim}`, `intimacy-${d.id}`])),
);

/** The page a section id leads to today, following a rename if there was one. */
export function currentSection(id) {
  return RETIRED_SECTIONS[id] || id;
}

export const COVER_SECTIONS = ['comm-cover', 'exp-cover', 'reflection-cover', 'intimacy-cover', 'conflict-cover'];

/*
 * ── THE ORDER HERE IS THE ORDER THE NAV WALKS ─────────────────────────────
 * check-results-nav holds these two to the same sequence, and it caught the
 * covers being listed as a block at the top while the nav visits each one just
 * before its own section's overview. Worth keeping: this list decides what
 * "the next page" means, and a list in a different order from the nav is a
 * next button that skips.
 */
export const RESULTS_SECTIONS = [
  'highlights',
  'couple-type',

  'comm-cover', 'comm-overview', 'comm-inner', 'comm-connection', 'comm-hard',

  // Conversations are numbered by position, matching how App.jsx builds them.
  'exp-cover', 'exp-overview',
  // Six, not five: Life & Values is a category a reader navigates to, and
  // building this from the responsibility list alone is what made the
  // website's link to it fall through to the storycards.
  ...EXPECTATIONS_CATEGORIES.map((_, i) => `exp-convo-${i}`),

  // Ellie: "App and site both show a detailed page for rel relf called action
  // plan. Remove that page from both web and app." The action plan itself stays;
  // it is on the at-a-glance page, where a reader sees it without a detour.
  'reflection-cover', 'reflection-overview', 'reflection-ratings', 'reflection-story',

  // Ellie: "Remove conversations worth having from intimacy section on app and
  // site." Its list is the at-a-glance page's action plan, which a reader
  // meets without a detour, and the six dimension pages each carry their own
  // question. The page repeated both.
  'intimacy-cover', 'intimacy-overview',
  ...INTIMACY_DOMAINS.map(d => `intimacy-${d.id}`),

  // The four that the old regex silently refused.
  'conflict-cover', 'conflict-overview', 'conflict-snapshot', 'conflict-patterns', 'conflict-wrote',

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
  /**
   * Ellie, first: page titles "should read 'Expectations Overview' rather than
   * just 'Expectations'". Then, once the cover pages existed: "Because we will
   * have the cover pages, the overview pages should only say overview at the
   * top and should also have a count in the top right (1/4)."
   *
   * Which is right: the cover carries the exercise's name two taps earlier, so
   * repeating it here is the section's name printed twice in a row.
   */
  'comm-overview': 'Overview',
  /**
   * Ellie: the Physical Intimacy at-a-glance hero "should have the hero read
   * physical intimacy expectations". Both surfaces led with the couple's two
   * names there, which does not say what the page is.
   */
  'intimacy-overview': 'Overview',
  'exp-overview': 'Overview',
  'conflict-overview': 'Overview',
  'reflection-ratings': 'How you each view the relationship',
  /**
   * Ellie: the at-a-glance title "should read Relationship Reflection". It
   * led with the couple's two names, which is what every glance page used to
   * do and what the other four have stopped doing.
   */
  'reflection-overview': 'Overview',
};

/**
 * Copy inside a page that both surfaces print.
 *
 * Small enough to feel like it does not need sharing, which is exactly how
 * "Where you each land" came to be written twice and renamed once.
 */
export const PAGE_COPY = {
  /**
   * Over the placement bars on the communication overview.
   *
   * Ellie: "can just be titled 'overview' now that the main hero says
   * communication styles". It read "Where you each land" before she renamed
   * it, then "Communication style overview", which said the page's own title
   * back to the reader two inches under it.
   */
  commPlacements: 'Overview',
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
  // Ellie: "remove 'unique' from hero of couple type results page".
  coupleTypeTitle: (you, them) => `${you} and ${them}'s relationship dynamic`,
};

export const RESULTS_SECTION_LABELS = {
  'highlights': 'Highlights',
  'couple-type': 'Couple Type',
  'comm-cover': 'Communication Styles',
  'exp-cover': 'Expectations',
  'reflection-cover': 'Relationship Reflection',
  'intimacy-cover': 'Physical Intimacy Expectations',
  'conflict-cover': 'Conflict Patterns',
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
  ...Object.fromEntries(INTIMACY_DOMAINS.map(d => [`intimacy-${d.id}`, d.label])),
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
  /**
   * A retired id is still a valid anchor.
   *
   * Notes anchored to the six Physical Intimacy dimension pages were written
   * when those pages existed. Refusing them now would make every one of those
   * marks fail validation on its next write, which is the quietest way for a
   * feature to stop working. See RETIRED_SECTIONS.
   */
  return RESULTS_SECTIONS.includes(key) || key in RETIRED_SECTIONS;
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
  /**
   * Ellie: "Change 'at a glance' to 'overview' throughout site and app nav and
   * page titles. Page titles should read 'Expectations Overview' rather than
   * just 'Expectations'."
   */
  const AT_A_GLANCE = 'Overview';

  /**
   * A section that is an exercise takes the exercise's name and colour.
   *
   * ── WHY IT IS LOOKED UP RATHER THAN TYPED ────────────────────────────────
   * Ellie asked for two things at once: "Please make the colors in the nav
   * landing match the exercise colors", and "Use full names of exercises in
   * nav landing and hamburger (communication styles, physical intimacy
   * expectations)".
   *
   * Both were the same bug. Five colours and five names were typed here, and
   * five more of each live in api/_exercises.js, which is the registry that
   * decides what exercises exist at all. So Communication was orange while you
   * answered it and violet when you read it back, and the section that is
   * called "Physical Intimacy Expectations" everywhere else was "Physical
   * Intimacy" here.
   *
   * `fullLabel` first, because that field exists for exactly this: a name for
   * where there is room for the whole of it. A group whose id is not an
   * exercise keeps whatever it was given.
   */
  /**
   * The fallback carries no colour of its own.
   *
   * A hex here "just in case the registry is missing one" is the second copy
   * this is meant to remove, whatever value it holds today. An exercise the
   * registry has never heard of gets the brand's neutral clay, which belongs
   * to no section and therefore cannot be the wrong section's colour.
   */
  const NEUTRAL = '#C17F47';
  const fromExercise = (key, fallbackLabel) => {
    const e = EXERCISES.find(x => x.key === key);
    return {
      label: e ? (e.fullLabel || e.label) : fallbackLabel,
      color: e?.color || NEUTRAL,
    };
  };

  /**
   * An at-a-glance entry, with the two things that make it one.
   *
   * `glance` is what tells the app to draw the page in the rounded tile rather
   * than full width, so that rule is the server's and not a list of five ids
   * typed into a phone. `ground` is the page's gradient, the same stops the
   * website paints, so the two products cannot end up in different colours.
   * The Communication page did exactly that: the website drew it purple into
   * orange and the app drew it in Conflict's blue.
   */
  const glance = (id) => ({
    id, label: AT_A_GLANCE, glance: true,
    ground: groundFor(id), groundStops: groundLocations(id),
  });

  /**
   * The page a section opens on.
   *
   * ── WHY A COVER ───────────────────────────────────────────────────────
   * Ellie: "I think there should be a cover page for each exercise with that
   * exercise's color as a tinted gradient on cream, then that same bg persists
   * through the exercise's section behind the tiles."
   *
   * It carries the exercise's name and nothing else. Nothing new is written on
   * it: the name is the registry's and the ground is the section's, and a
   * cover that introduced a section in fresh prose would be a page of copy
   * nobody had approved.
   *
   * It is also what makes the count honest. With a cover in front of it the
   * overview is one page of the set rather than a thing outside the set, which
   * is why the counts below include it and exclude this.
   */
  const cover = (groupId, label) => ({
    id: `${groupId}-cover`, label, cover: true,
  });

  /**
   * A detail page painted with its section's own ground.
   *
   * Takes the overview's id rather than a colour, so a section that is
   * repainted moves all of its pages at once and none of them can be left on
   * last year's gradient.
   */
  const detail = (overviewId) => ({
    ground: groundFor(overviewId), groundStops: groundLocations(overviewId),
  });

  const groups = [
    { id: 'highlights', label: 'Highlights', color: '#E8673A' },
    { id: 'couple-type', label: 'Couple Type', color: '#E8673A' },
    {
      id: 'comm', shortLabel: 'Comms', ...fromExercise('ex1', 'Communication'),
      children: [
        cover('comm', fromExercise('ex1', 'Communication').label),
        glance('comm-overview'),
        ...COMM_DOMAINS.map(d => ({ id: `comm-${d.id}`, label: d.label, color: d.color })),
      ],
    },
    {
      id: 'exp', ...fromExercise('ex2', 'Expectations'),
      children: [
        cover('exp', fromExercise('ex2', 'Expectations').label),
        glance('exp-overview'),
        ...EXPECTATIONS_CATEGORIES.map((cat, i) => ({
          id: `exp-convo-${i}`, label: cat.label, color: '#10B981',
          // Each conversation page is on its own category's colour. They were
          // all on the one violet, on both surfaces.
          ground: groundForCategory(cat.color), groundStops: groundLocations('exp-detail'),
        })),
      ],
    },
  ];

  if (hasReflection) {
    groups.push({
      id: 'reflection', shortLabel: 'Rel. Refl.', ...fromExercise('ex3', 'Relationship Reflection'),
      children: [
        cover('reflection', fromExercise('ex3', 'Relationship Reflection').label),
        glance('reflection-overview'),
        /**
         * Ellie: "Rel Relf detailed pages can't be cream tiles. Match them to
         * exercise please. Same with conflict patterns detailed pages."
         *
         * Their section's own ground, which is the one its overview page is
         * already painted with. Not a new gradient: two pages of one section
         * on two greens is the thing these grounds exist to stop.
         */
        { id: 'reflection-ratings', label: 'How You Each Rated', ...detail('reflection-overview') },
        { id: 'reflection-story', label: 'Side by Side', ...detail('reflection-overview') },
      ],
    });
  }

  if (intimacyReady) {
    groups.push({
      id: 'intimacy', shortLabel: 'Intimacy', ...fromExercise('intimacy', 'Physical Intimacy'),
      children: [
        cover('intimacy', fromExercise('intimacy', 'Physical Intimacy').label),
        glance('intimacy-overview'),
        ...INTIMACY_DOMAINS.map(d => ({ id: `intimacy-${d.id}`, label: d.label, ...detail('intimacy-overview') })),
      ],
    });
  }

  if (conflictListed) {
    groups.push({
      id: 'conflict', shortLabel: 'Conflict', ...fromExercise('conflict', 'Conflict Patterns'),
      children: [
        cover('conflict', fromExercise('conflict', 'Conflict Patterns').label),
        glance('conflict-overview'),
        { id: 'conflict-snapshot', label: 'Your Conflict Snapshot', ...detail('conflict-overview') },
        { id: 'conflict-patterns', label: 'Your Patterns', ...detail('conflict-overview') },
        { id: 'conflict-wrote', label: 'What You Each Wrote', ...detail('conflict-overview') },
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
