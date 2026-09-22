/**
 * Every word the relationship journal says, in one place.
 *
 * ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
 * Ellie: "Ensure that site mirrors app notes functionality."
 *
 * The journal is now on both surfaces. The website can import this module; an
 * Expo project cannot import from api/, so attune-app/src/components/
 * journal.tsx keeps its own named constants at the foot of the file, and
 * check-journal-copy.mjs fails the build if the two ever say different things.
 *
 * That is the second-best arrangement and it is the best one available. The
 * best would be one copy read by both, and the thing standing in the way is a
 * bundler boundary rather than a decision.
 *
 * ── THESE ARE PLACEHOLDERS ────────────────────────────────────────────────
 * Ellie writes every word a customer reads. These are mine, standing in, and
 * they are listed in TASKS.md as C4 so they are findable rather than quietly
 * shipped as finished. Changing one here and the matching one in journal.tsx
 * is the whole of the edit.
 */

export const JOURNAL_COPY = {
  /** The composer. */
  placeholder: 'Write about today',
  /** The search field over past entries. */
  search: 'Search your entries',
  /** Nothing matched what was typed into the search. */
  noMatch: 'Nothing here matches that.',
  /** No entries at all, yet. */
  empty: 'Nothing here yet. The first entry is usually the hardest one.',
};

/**
 * ── WHAT IS NOT IN HERE, AND WHY ──────────────────────────────────────────
 * The app's failure line, "Your journal could not be loaded. Pull down to try
 * again." Pulling down is a phone, and the website's Notes page already has
 * one failure line for the whole page rather than one per block. A string that
 * is only true on one surface does not belong in a map whose promise is that
 * both surfaces say it.
 *
 * It is still Ellie's to write. It is in TASKS.md as part of C4, named FAILED
 * at the foot of attune-app/src/components/journal.tsx.
 */
