/**
 * What the app asks before it destroys something somebody wrote.
 *
 * ── WHY IT IS ITS OWN FILE ────────────────────────────────────────────────
 * The same destruction is offered in three places: the note sheet on the
 * Notes tab, an entry in the journal, and the bin in the marking toolbar on
 * any page of results or an article. Two of them asked first and the third
 * did not, so a note written against a sentence came off with one tap and the
 * words went with it.
 *
 * The wording is Ellie's, taken from the sheet that already asked. One copy,
 * so the three cannot drift into asking three different questions about the
 * same thing.
 *
 * ── WHAT ASKS AND WHAT DOES NOT ───────────────────────────────────────────
 * A highlight or an underline is a mark on somebody else's words and comes
 * off with one tap, which is what makes it worth using. A note is the
 * reader's own writing. Only the second asks.
 */

export const DELETE_NOTE = {
  title: 'Delete this note?',
  body: 'This cannot be undone.',
  keep: 'Keep',
  confirm: 'Delete',
} as const;

/** When the delete itself fails. */
export const DELETE_FAILED = {
  title: 'Not deleted',
  body: 'That did not delete. Try again in a moment.',
} as const;

/**
 * Taking a tag off the words it is on, from the margin.
 *
 * Ellie: "if I hold down on the tag, I should have an option to delete that
 * tag." What a hold offers is removing this mark, which for a tag-only mark
 * is the tag itself and for a note is the note: the sheet says which.
 *
 * These four lines are mine and are hers to change.
 */
export const REMOVE_MARK = {
  tagTitle: 'Remove this tag?',
  tagBody: 'The words stay. The tag comes off them.',
  keep: 'Keep',
  confirm: 'Remove',
} as const;
