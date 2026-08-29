/**
 * Reading and writing persisted couple results.
 *
 * Results are computed from raw answers. Recomputing on every page load is fine
 * for a website read once; it is wrong for an app opened repeatedly on a phone,
 * where results should appear instantly, survive a bad signal, and give
 * annotations something stable to attach to.
 *
 * THE RULE: results are frozen once computed. A couple's results never change
 * underneath them. Changing the weights, the questions or the prose applies to
 * couples computed after the change, not to anyone who already has results.
 *
 * So a newer RESULTS_VERSION does NOT invalidate a stored row. The version on
 * the row is a record of what that couple was shown, not a staleness marker.
 * Only a retake recomputes, because that is the couple asking for new results
 * rather than us changing them from underneath.
 *
 * Retakes archive the previous row instead of overwriting it, so notes and
 * highlights written against the old results still resolve.
 *
 * A retake is detected by fingerprint rather than by timestamps. Comparing
 * updated_at across two profile rows is fragile: clocks, partial writes, and
 * the reset saga all produced cases where a timestamp said fresh and the data
 * said otherwise. A hash of the actual answers cannot lie about that.
 */

import { coupleResults, RESULTS_VERSION } from './results.js';
import { CONTENT_VERSION } from './content-version.js';

/**
 * Stable fingerprint of both partners' answers.
 *
 * Key order is normalised, so two objects with the same answers hash the same
 * regardless of insertion order. Partner order is normalised by the caller
 * passing them in canonical order.
 */
export async function answersFingerprint(aAnswers, bAnswers) {
  const norm = (o) => JSON.stringify(Object.keys(o || {}).sort().map(k => [k, o[k]]));
  // Deliberately NOT including RESULTS_VERSION: the fingerprint answers "have
  // the answers changed", and folding the engine version in would make every
  // engine change look like a retake, which is exactly what freezing prevents.
  const input = norm(aAnswers) + '|' + norm(bAnswers);
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

  // Frozen: serve it back whatever version it was computed under. The only
  // thing that supersedes a frozen result is the couple answering again.
  if (stored && stored.answers_hash === hash) {
    return {
      results: stored.results,
      cached: true,
      reason: null,
      frozenAt: stored.frozen_at || stored.computed_at || null,
      computedUnderVersion: stored.version,
      // The copy this couple's results should render from. Not the current
      // one: that is the point.
      contentVersion: stored.content_version ?? CONTENT_VERSION,
      stale: stored.version !== RESULTS_VERSION,
    };
  }

  const results = coupleResults({ aAnswers: answersA, bAnswers: answersB, aName: nameA, bName: nameB });
  if (!results) return { results: null, cached: false, reason: 'not_ready' };

  const reason = stored ? 'retaken' : 'first_computation';

  // Archive before overwriting, so annotations written against the previous
  // results still have something to resolve to.
  if (stored && db.archive) {
    try { await db.archive(stored); }
    catch (e) { console.warn('[results-store] archive failed:', e?.message || e); }
  }

  const frozenAtIso = new Date().toISOString();
  try {
    await db.write({
      partner_a: a, partner_b: b,
      version: RESULTS_VERSION,
      content_version: CONTENT_VERSION,
      couple_type: results.coupleType,
      results,
      answers_hash: hash,
      computed_at: frozenAtIso,
      frozen_at: frozenAtIso,
      updated_at: frozenAtIso,
    });
  } catch (e) {
    // A failed write must not fail the read. The caller still gets correct
    // results; the next request simply recomputes again.
    console.warn('[results-store] write failed, serving uncached:', e?.message || e);
  }

  return { results, cached: false, reason, frozenAt: frozenAtIso,
    computedUnderVersion: RESULTS_VERSION, contentVersion: CONTENT_VERSION, stale: false };
}
