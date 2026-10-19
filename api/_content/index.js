/**
 * Resolves a content version to the copy that version means.
 *
 * A couple's results row records the CONTENT_VERSION it was computed under.
 * That stamp is a record of what they first read; it is NOT what they are
 * served. api/_lib/results-store.js hands back the current content version, so
 * everybody renders from the newest copy and a correction reaches them.
 *
 * ── SO WHEN IS A NEW VERSION WORTH MAKING? ────────────────────────────────
 * Rarely, and not for a copy fix. A fix goes into the current file, because
 * that is how it reaches the couples who have already read the wrong thing,
 * which is what Ellie asked for. A new version is for a wholesale rewrite you
 * want recorded as a separate edition.
 *
 * ADDING ONE
 *   1. cp v1.js v2.js, edit v2.js
 *   2. bump CONTENT_VERSION in api/_lib/content-version.js
 *   3. add it to VERSIONS below
 *
 * This header used to say a published version could never be edited in place
 * and that everyone kept their stamped copy. Both halves described a path the
 * product stopped taking, which is worse than no comment: it sends you to
 * build a v2 for a typo and leaves the typo in front of everybody who has
 * already read it.
 */

import * as v1 from './v1.js';

const VERSIONS = { 1: v1 };

/** The newest version, used for couples not yet stamped. */
export const CURRENT_CONTENT_VERSION = Math.max(...Object.keys(VERSIONS).map(Number));

/**
 * Copy for a given version. A null or unknown version falls back to current,
 * which is correct for rows written before pinning existed: those couples
 * should read current copy rather than break.
 */
export function contentFor(version) {
  return VERSIONS[version] || VERSIONS[CURRENT_CONTENT_VERSION];
}

export { VERSIONS };
