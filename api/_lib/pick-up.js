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
    // A note's title is optional. When there is none the anchored thing names
    // it, and when it is loose the first words of the body do.
    const title = (note.title || '').trim()
      || (note.anchor_context || '').trim()
      || peek(note.body)
      || 'Your note';
    return {
      kind: 'resume',
      label: 'Pick up where you left off',
      title,
      // Not repeated when the title already is the body's opening words.
      preview: title === peek(note.body) ? null : peek(note.body),
      app: { route: '/notes' },
      deepLink: '/?view=notes',
    };
  }

  if (inPractice?.latestId && inPractice?.latestTitle) {
    return {
      kind: 'discover',
      label: 'Explore something new',
      title: inPractice.latestTitle,
      preview: null,
      app: { route: '/resources' },
      deepLink: '/?view=practice',
    };
  }

  return null;
}
