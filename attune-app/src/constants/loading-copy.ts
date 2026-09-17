/**
 * What the app says while it is waiting.
 *
 * ── WHY THEY ARE IN ONE PLACE ─────────────────────────────────────────────
 * Ellie: "Can you build me a list to review in tasks of each of the loading
 * messages and their location/context?"
 *
 * There were fifteen of them, typed into fifteen screens, and three said the
 * same thing in two different ways. A line nobody can list is a line nobody
 * reviews, which is how "Checking where you both are" ended up in front of
 * her: a sentence written to fill a spinner rather than to be read.
 *
 * Every key here is one screen's line, and TASKS.md lists them from this file,
 * so she can read them all in one place and change any of them.
 *
 * ── THEY ARE NOT ERRORS ───────────────────────────────────────────────────
 * A spinner means the product is doing what it was asked to do, so these say
 * what is being fetched rather than apologising for the wait.
 */

export const LOADING = {
  /** Home: the dashboard's first paint. */
  home: 'Loading your dashboard',
  /** Insights: results and exercise status together. */
  insights: 'Generating your insights',
  /** Resources: the tools and the In Practice list. */
  resources: 'Gathering your resources',
  /** Notes: notes, marks and tags. */
  notes: 'Getting your notes',
  /** Any exercise, fetching its questions. */
  exercise: 'Fetching your exercise',
  /** An In Practice piece opening. */
  post: 'Opening',
  /** Settings, reading the profile to edit. */
  profile: 'Loading your profile',
  /** The budget tool. */
  budget: 'Loading your budget',
  /** The Starting Out checklist. */
  checklist: 'Loading your checklist',
  /** Profile setup and the feedback form, both waiting on their copy. */
  moment: 'One moment',
} as const;
