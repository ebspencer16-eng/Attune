/**
 * Resolves a content version to the copy that version means.
 *
 * A couple's results row records the CONTENT_VERSION it was computed under.
 * Their results render from that version's copy, not from whatever is current,
 * so revising the wording never moves the words a highlight was written
 * against.
 *
 * ADDING A VERSION
 *   1. cp v1.js v2.js, edit v2.js
 *   2. bump CONTENT_VERSION in api/_lib/content-version.js
 *   3. add it to VERSIONS below
 * New couples get v2. Everyone already stamped keeps what they had until
 * someone deliberately republishes them.
 *
 * Never edit a published version in place. That is the one rule this whole
 * mechanism exists to enforce.
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
