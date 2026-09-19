/**
 * What exercises exist, and everything that follows from that.
 *
 * ── WHY THIS FILE ─────────────────────────────────────────────────────────
 * The same list was maintained by hand in a dozen places: dashboard rows, the
 * results checklist, the storage-to-state sync, the post-login reload
 * condition, the partner session, order-building sites, entitlement grant
 * sources, admin selects. Every time an exercise was added, some of those were
 * updated and some were not, and the ones that were missed failed silently.
 *
 * In two days that produced: a granted add-on that never reached the UI,
 * partner status that was all-or-nothing, an exercise with no dashboard entry,
 * a partner's Conflict Patterns permanently reading Pending, and a completion
 * status that changed between page loads.
 *
 * None of those errored. All of them were a list that stopped matching the
 * product.
 *
 * Adding an exercise now means adding one entry here. Anything that still
 * hardcodes its own list is a bug, and check-exercise-registry.mjs fails the
 * build when it finds one.
 */

/**
 * order        display order; also the numbering shown to customers, which is
 *              positional over what a couple owns rather than fixed
 * key          stable internal id
 * label        customer-facing name
 * column       the profile column holding the answers
 * shape        'answers' = a bare answers object
 *              'record'  = { answers, completedAt }, which is why these two
 *              need different completion checks and their own state sync
 * localKey     browser cache key
 * progressKey  in-progress cache key, null where the exercise has none
 * view         the app route
 * capability   the pkg capability gating it; null means every package has it
 * partnerField the field name inside the partner session
 * selfOnly     no partner-view questions, so no pv_ answers exist
 * inApp        the iOS app can ask this one. /api/questions serves it and
 *              /api/home tells the app, so the app keeps no list of its own.
 *              Flip to true here when the screen exists, in one place.
 */
/**
 * The colour each exercise wears, everywhere it is named.
 *
 * ── WHY IT IS HERE ────────────────────────────────────────────────────────
 * Ellie: "Please make the colors in the nav landing match the exercise
 * colors." They did not, and could not: the results nav had its own five
 * colours typed into api/_lib/results-sections.js, and the app tints each
 * exercise screen from its own table in attune-theme.ts. Two lists, no third
 * thing saying what an exercise's colour is, so Communication was the brand
 * orange while you were answering it and a violet the moment you read it back.
 *
 * The registry is the one place that already knows what exercises exist, so
 * it is where the colour belongs. The nav reads it; check-exercise-colours.mjs
 * holds the app's copy to it, because an Expo project cannot import from api/.
 *
 * This is not the same thing as a results page's GROUND, which is a gradient
 * per page and lives in api/_lib/section-grounds.js. A colour names a section;
 * a ground is what one of its pages is painted on.
 */
export const EXERCISES = [
  {
    order: 1, key: 'ex1', color: '#E8673A', inApp: true, label: 'Communication',
    /**
     * What to call it where there is room for its whole name.
     *
     * Ellie, of the exercise's own eyebrow: "please change the eyebrow to say
     * communication styles rather than just communication", and of its
     * completion screen: "Communication styles exercise complete".
     *
     * A second name rather than a rename, because `label` is the column header
     * in a three-column table on a phone and "Communication styles" does not
     * fit it. Anything without one falls back to label, so this is a field to
     * fill in when a name needs more room, not a field to keep in step.
     */
    fullLabel: 'Communication styles',
    column: 'ex1_answers', shape: 'answers',
    localKey: 'attune_ex1', progressKey: 'attune_ex1_progress',
    view: 'exercise1', capability: null, partnerField: 'ex1', selfOnly: false,
  },
  {
    order: 2, key: 'ex2', color: '#1B5FE8', inApp: true, label: 'Expectations',
    column: 'ex2_answers', shape: 'answers',
    localKey: 'attune_ex2', progressKey: 'attune_ex2_progress',
    view: 'exercise2', capability: null, partnerField: 'ex2', selfOnly: false,
  },
  {
    order: 3, key: 'ex3', color: '#10B981', inApp: true, label: 'Relationship Reflection',
    column: 'ex3_answers', shape: 'answers',
    localKey: 'attune_ex3', progressKey: 'attune_ex3_progress',
    view: 'exercise3', capability: 'hasAnniversary', partnerField: 'ex3', selfOnly: false,
  },
  {
    order: 4, key: 'intimacy', color: '#B5546E', inApp: true, label: 'Physical Intimacy Expectations',
    column: 'intimacy_data', shape: 'record',
    localKey: 'attune_intimacy', progressKey: 'attune_intimacy_progress',
    view: 'intimacy', capability: 'hasIntimacy', partnerField: 'intimacy', selfOnly: false,
  },
  {
    order: 5, key: 'conflict', color: '#1B5FE8', inApp: true, label: 'Conflict Patterns',
    column: 'conflict_data', shape: 'record',
    localKey: 'attune_conflict', progressKey: 'attune_conflict_progress',
    view: 'conflict', capability: 'hasConflict', partnerField: 'conflict', selfOnly: true,
  },
];

/** Every profile column holding exercise answers. */
export const EXERCISE_COLUMNS = EXERCISES.map(e => e.column);

/** Every browser cache key, answers and progress. */
export const EXERCISE_LOCAL_KEYS = EXERCISES.flatMap(e => [e.localKey, e.progressKey].filter(Boolean));

/** Fields the partner session must carry for status to be reportable. */
export const PARTNER_SESSION_FIELDS = EXERCISES.map(e => e.partnerField);


/**
 * The exercises a couple owns, in display order, numbered positionally.
 *
 * Numbering is by position rather than by the exercise's own order, so a core
 * package plus Conflict Patterns reads 01, 02, 03 rather than 01, 02, 05. A
 * customer should never see a number for something they did not buy.
 */
export function ownedExercises(pkg) {
  return EXERCISES
    .filter(e => !e.capability || !!pkg?.[e.capability])
    .map((e, i) => ({ ...e, num: String(i + 1).padStart(2, '0') }));
}

/**
 * Is this exercise finished, given whatever the app holds for it?
 *
 * The two shapes are the reason this exists as a function. A bare answers
 * object counts as done when it has any keys; a record counts as done only
 * when completedAt is set. Getting that backwards is how an exercise reads as
 * complete the moment someone opens it.
 */
export function isExerciseDone(exercise, value) {
  if (!value) return false;
  if (exercise.shape === 'record') return !!value.completedAt;
  return typeof value === 'object' && Object.keys(value).length > 0;
}

/** Completion for every owned exercise, for one side of the couple. */
export function exerciseStatus(pkg, valuesByKey) {
  return ownedExercises(pkg).map(e => ({
    ...e,
    done: isExerciseDone(e, valuesByKey?.[e.key]),
  }));
}
