/**
 * The version of the customer-facing copy.
 *
 * Results are frozen: a couple's scores never change underneath them. Copy has
 * to be frozen the same way, or a highlight written against a paragraph sits on
 * different words after Carolina revises a line, and the couple sees prose that
 * was never written about the results they are looking at.
 *
 * So each couple's results row records the CONTENT_VERSION it was computed
 * under, and their results render from that version's copy rather than from
 * whatever is current.
 *
 * ── HOW TO USE THIS ────────────────────────────────────────────────────────
 * Bump CONTENT_VERSION whenever customer-facing copy changes in a way that
 * would alter what an existing couple reads: the shift guidance, the aligned
 * advice, the domain blurbs, couple-type prose, gap blurbs. Do NOT bump it for
 * marketing pages, admin text, or anything a results page does not render.
 *
 * Bumping does not change anyone's results. It changes what the NEXT couple
 * gets. Existing couples keep the version stamped on their row until someone
 * deliberately republishes them.
 *
 * ── REPUBLISHING ───────────────────────────────────────────────────────────
 * When a genuine error needs fixing for people who already have results, that
 * is a deliberate action, not a side effect of editing a file. See
 * supabase/migrations/diagnostics/republish_content.sql: it moves a chosen
 * cohort to a newer content version and says how many rows it touched.
 *
 * The distinction that matters: editing copy is safe and affects nobody who
 * already has results. Republishing is the explicit decision to change what
 * existing couples see, and it should be rare and considered.
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
