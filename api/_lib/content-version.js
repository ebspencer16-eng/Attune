/**
 * The version of the customer-facing copy.
 *
 * ── WHAT IS FROZEN, AND WHAT IS NOT ───────────────────────────────────────
 * Scores are frozen. Copy is not, and it used to be.
 *
 * Ellie: "I want formatting changes and prose adjustments to be applied even for
 * couples who have already taken their assessments, but responses and
 * scoring/backend calculations should persist from the time the couples took the
 * assessment. If we catch a typo I want to be able to fix it in the future, but
 * if we change typing weights I don't want that to affect users who have already
 * gotten their results."
 *
 * That is the right split and it is the one in force. A row keeps the engine
 * version that produced it, so changing a weight moves nobody who has finished.
 * It no longer serves from the content version stamped on it, so a correction
 * reaches everybody the moment it is published.
 *
 * ── WHAT THE OLD BEHAVIOUR WAS PROTECTING, WHICH IS NOW EXPOSED ───────────
 * A mark is anchored by the text it was made on. When copy was frozen per
 * couple, editing a sentence could only orphan marks made by couples who had not
 * finished yet. Now it orphans them for everyone who has ever read that
 * sentence, silently, because an anchor that finds no matching text simply does
 * not draw.
 *
 * That is the cost of the correction reaching people, and it is worth knowing
 * before a copy edit rather than after. check-mark-reach.mjs reports an anchored
 * mark that nothing drew.
 *
 * content_version is still stamped on each row. It is a record of what a couple
 * first read, which is worth having, and it is no longer what they are served.
 *
 * ── HOW TO USE THIS ────────────────────────────────────────────────────────
 * Bump CONTENT_VERSION whenever customer-facing copy changes in a way that
 * would alter what an existing couple reads: the shift guidance, the aligned
 * advice, the domain blurbs, couple-type prose, gap blurbs. Do NOT bump it for
 * marketing pages, admin text, or anything a results page does not render.
 *
 * Bumping does not change anyone's scores. It never did. What changed is that it
 * now changes what EVERY couple reads, not only the next one.
 *
 * ── REPUBLISHING ───────────────────────────────────────────────────────────
 * There is nothing left to republish. republish_content.sql moved a cohort onto
 * a newer content version so they would be served newer copy, and everyone is
 * served current copy now. The file stays because the stamps it moves are a
 * record of what a couple first read, and rewriting that record should still be
 * a deliberate act rather than a side effect.
 */

export const CONTENT_VERSION = 1;

/**
 * What each version means, so the number is traceable to a state of the copy.
 * Append, never edit: an entry describes what a stamped row was rendered from.
 */
export const CONTENT_HISTORY = [
  {
    version: 1,
    date: '2026-08-29',
    note: 'First snapshot. 26-question exercise, weighted dimension scores, '
        + 'visibility-weighted partner blend, reassurance shift prose added, '
        + 'restored aligned-advice keep-in-mind lines, rewritten domain blurbs, '
        + '"Small gap." and related fragments removed.',
  },
];

/** Human-readable description of a stamped version, for admin surfaces. */
export function describeContentVersion(v) {
  const found = CONTENT_HISTORY.find(h => h.version === v);
  if (!found) return `Content version ${v} (no record)`;
  return `v${found.version}, ${found.date}: ${found.note}`;
}

/** Is a stamped row rendering from copy older than what is current? */
export function isOlderContent(v) {
  return typeof v === 'number' && v < CONTENT_VERSION;
}
