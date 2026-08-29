/**
 * Reading and writing persisted couple results.
 *
 * Results are computed from raw answers. Recomputing on every page load is fine
 * for a website read once; it is wrong for an app opened repeatedly on a phone,
 * where results should appear instantly, survive a bad signal, and give
 * annotations something stable to attach to.
 *
 * The rule: serve the stored row when it is current, recompute and store when
 * it is not. Current means the RESULTS_VERSION matches AND the answers have not
 * changed since it was computed.
 *
 * Staleness is detected by fingerprint rather than by timestamps. Comparing
 * updated_at across two profile rows is fragile: clocks, partial writes, and
 * the reset saga all produced cases where a timestamp said fresh and the data
 * said otherwise. A hash of the actual answers cannot lie about that.
 */

import { coupleResults, RESULTS_VERSION } from './results.js';

/**
 * Stable fingerprint of both partners' answers.
 *
 * Key order is normalised, so two objects with the same answers hash the same
 * regardless of insertion order. Partner order is normalised by the caller
 * passing them in canonical order.
 */
export async function answersFingerprint(aAnswers, bAnswers) {
  const norm = (o) => JSON.stringify(Object.keys(o || {}).sort().map(k => [k, o[k]]));
  const input = norm(aAnswers) + '|' + norm(bAnswers) + '|v' + RESULTS_VERSION;
  // Web Crypto: present on the edge runtime and in Node 18+.
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

/** Canonical pair order, so a couple can only ever produce one row. */
export function orderPair(idA, idB) {
  return idA < idB ? { a: idA, b: idB, swapped: false } : { a: idB, b: idA, swapped: true };
}

/**
 * The couple's results, from cache when current and recomputed when not.
 *
 * db is a small adapter so this stays testable without a database:
 *   read(a, b)      -> the stored row or null
 *   write(row)      -> persists, may fail silently
 *
 * Returns { results, cached, reason } where reason explains a recompute.
 */
export async function getOrComputeResults({ db, aId, bId, aAnswers, bAnswers, aName, bName }) {
  const { a, b, swapped } = orderPair(aId, bId);
  // Answers travel with their owner through the swap, or the fingerprint and
  // the stored partner order would disagree with each other.
  const answersA = swapped ? bAnswers : aAnswers;
  const answersB = swapped ? aAnswers : bAnswers;
  const nameA = swapped ? bName : aName;
  const nameB = swapped ? aName : bName;

  const hash = await answersFingerprint(answersA, answersB);

  let stored = null;
  try { stored = await db.read(a, b); } catch { /* a cache miss must never fail the request */ }

  if (stored && stored.version === RESULTS_VERSION && stored.answers_hash === hash) {
    return { results: stored.results, cached: true, reason: null };
  }

  const results = coupleResults({ aAnswers: answersA, bAnswers: answersB, aName: nameA, bName: nameB });
  if (!results) return { results: null, cached: false, reason: 'not_ready' };

  const reason = !stored ? 'first_computation'
    : stored.version !== RESULTS_VERSION ? 'version_changed'
    : 'answers_changed';

  try {
    await db.write({
      partner_a: a, partner_b: b,
      version: RESULTS_VERSION,
      couple_type: results.coupleType,
      results,
      answers_hash: hash,
      computed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    // A failed write must not fail the read. The caller still gets correct
    // results; the next request simply recomputes again.
    console.warn('[results-store] write failed, serving uncached:', e?.message || e);
  }

  return { results, cached: false, reason };
}
