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
  /**
   * ── THE LOCK ──────────────────────────────────────────────────────────
   * Ellie: "the journal isn't even behind a passcode."
   *
   * The app puts the journal behind the phone's own passcode or Face ID. A web
   * page cannot ask for either, so the website asks for the account password,
   * which is the only thing it can check and is already what it asks for before
   * deleting an account.
   *
   * `lockedApp` is the app's line and `lockedWeb` is the website's, because the
   * two mechanisms are genuinely different and one sentence describing both
   * would be wrong on one of them. Both live here so neither surface writes its
   * own.
   *
   * These two and `unlock` are mine and need her eye. The four below are hers.
   */
  lockedApp: 'Locked with your passcode',
  lockedWeb: 'Locked. Enter your password to read your entries.',
  unlock: 'Unlock',
  wrongPassword: 'That password did not match.',

  /** The composer. */
  placeholder: 'Write about today',
  /** The search field over past entries. */
  search: 'Search your entries',
  /** Nothing matched what was typed into the search. */
  noMatch: 'Nothing here matches that.',
  /** No entries at all, yet. */
  empty: 'Nothing here yet. The first entry is usually the hardest one.',

  /**
   * ── KEEPING AN INSIGHT ────────────────────────────────────────────────
   * Ellie: "there should be a button on the insight of the day page that allows
   * users to save this to relationship journal. It should save nicely in a tile
   * with the quote and the user can add commentary about it."
   *
   * Four sentences that were typed into attune-app/src/components/journal.tsx
   * and nowhere else, which was fine while the app was the only surface that
   * could save one. Then: "Learn web page insight section is missing save
   * button - I want the functionality to save it to a journal entry just like
   * the app can." The moment there are two surfaces the words need one home.
   */
  saveTitle: 'Keep this in your journal',
  savePlaceholder: 'Add commentary',
  saveAction: 'Save',
  saveFailed: 'That did not save. Try again in a moment.',
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
