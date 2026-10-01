/**
 * The Notes tab's own words, for both surfaces.
 *
 * ── WHY IT EXISTS ─────────────────────────────────────────────────────────
 * Ellie: "the notes page looks nothing like the app's."
 *
 * The app's Notes tab is a composition: the word of the day in a card, two
 * small tiles for Recent and Shared with me, one big button to write a journal
 * entry with a streak beside it, then the tags. The website's was a column of
 * headings with the same data under them, which is the same information and not
 * the same screen.
 *
 * Rebuilding it meant the website needed the app's words, and those were seven
 * named constants inside attune-app/src/app/notes.tsx. A word the website
 * cannot read is a word the website rewrites, and then the two pages say
 * slightly different things forever.
 *
 * ── THE ARRANGEMENT ───────────────────────────────────────────────────────
 * Same as api/_lib/journal-copy.js: this module is the source, the website
 * imports it, the app keeps its constants because an Expo project cannot import
 * from api/, and check-journal-copy.mjs holds the two sides equal by name.
 *
 * ── WHOSE WORDS ───────────────────────────────────────────────────────────
 * Ellie's. Every string here was already in the app, where she has read and
 * edited them. Nothing was written for this file; it is a move, not a draft.
 */
export const NOTES_COPY = {
  /** Over the list of the most recent things this person made. */
  recent: 'Recent',
  /** Over the list their partner has sent them. */
  sharedWithMe: 'Shared with me',
  /** The button that opens the journal composer. */
  writeEntry: 'Write a journal entry',
  /** Over the definition, under the word of the day. */
  wordInUse: 'Word in use',
  /** The journal's own name, where it is named rather than shown. */
  journalTitle: 'Relationship journal',
  /** What the journal is, under its name. */
  journalOpen: 'A running diary, just for you',
  /** When they have made nothing yet. */
  mineEmpty: 'Nothing yet. Notes and highlights turn up here.',
  /** When their partner has sent nothing yet. */
  sharedEmpty: 'Nothing shared with you yet.',
};
