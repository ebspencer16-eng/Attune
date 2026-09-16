/**
 * The third row on the app's home screen: something to return to.
 *
 * ── WHY THE SERVER DECIDES ────────────────────────────────────────────────
 * The row has two states. Someone who has written a note or highlighted
 * something gets that thing back. Someone who has not gets the newest In
 * Practice post instead, so the row is never empty and never says "you have
 * nothing".
 *
 * Which of the two, and what it says, is decided here rather than in the app,
 * for the same reason the priority engine is: the app renders what it is given
 * and routes on the target, so a change to this rule ships without an app
 * release. It is also the only place with the data. The home screen calls
 * /api/home and nothing else.
 *
 * ── PRIVACY ───────────────────────────────────────────────────────────────
 * Only the reader's own notes. A partner's shared note is readable on the
 * Notes tab, where the screen says whose it is; surfacing one here, under a
 * heading that says "where you left off", would put their partner's words in
 * the reader's mouth. The query is scoped to owner_id and the caller passes
 * only their own rows.
 *
 * ── THE PREVIEW ───────────────────────────────────────────────────────────
 * A sneak peek, so it is deliberately short and never a whole note. Notes are
 * the most private thing in this product and the home screen is the most
 * over-the-shoulder place in it.
 */

/** How much of a note the home screen shows. */
const PREVIEW = 90;

function peek(text) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  return t.length > PREVIEW ? `${t.slice(0, PREVIEW).trimEnd()}…` : t;
}

/**
 * @param {object} args
 * @param {{title: string|null, body: string, anchor_context: string|null}|null} args.note
 *        The reader's most recently updated note, or null.
 * @param {{latestId: string, latestTitle: string}|null} args.inPractice
 * @returns {{kind: string, label: string, title: string, preview: string|null,
 *            app: object, deepLink: string}|null}
 */
export function pickUp({ note, inPractice } = {}) {
  if (note) {
    /**
     * ── WHAT THE ROW SAYS, AND WHAT IT SHOWS ────────────────────────────
     * Ellie: "I would like for the prompt to revisit a note/mark to instead
     * read 'Pick up where you left off' as the bold subject line then 1 line of
     * the text I highlighted/marked/selected as the grey text."
     *
     * So the bold line is the same four words every time, and the grey line is
     * what she marked. The row used to put her own marked text in bold and her
     * note underneath, which reads as a quotation with a comment: two pieces of
     * her writing and nothing saying what the row is for.
     *
     * The marked text first, because that is the thing she pointed at. A loose
     * note has none, so its own words stand in.
     */
    return {
      kind: 'resume',
      label: 'Pick up where you left off',
      title: 'Pick up where you left off',
      preview: peek(note.anchor_context) || peek(note.body) || (note.title || '').trim() || null,
      app: { route: '/notes' },
      deepLink: '/?view=notes',
    };
  }

  if (inPractice?.latestId && inPractice?.latestTitle) {
    return {
      kind: 'discover',
      // Ellie: "explore something new should just match #8", which is the new
      // post card in the engine. The same event should not have two names
      // depending on which row of the tile it lands in.
      label: 'New publication to explore',
      title: 'New publication to explore',
      preview: 'View this and others in your resources tab',
      app: { route: '/resources' },
      deepLink: '/?view=practice',
    };
  }

  return null;
}
