/**
 * How a couple's average gap is described, and how it is counted.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * One number, banded into four buckets, twice, with different cut points.
 *
 *   `overallPairingLabel` in src/App.jsx, which is what the couple READS on
 *   their results page: 0.75, 1.50, 2.25.
 *
 *   the `gapTier` expression a few thousand lines further down, which is what
 *   /api/track-type STORES and the admin charts: 1.0, 1.8, 2.5.
 *
 * Over the plausible range those two put the same couple in different buckets
 * 19% of the time, and always in the same direction: the admin counted a couple
 * as more aligned than they had been told they were. A couple at 0.9 reads
 * "Compatible" and is counted "aligned"; at 1.6 reads "Complementary" and is
 * counted "compatible"; at 2.4 reads "Distinctly different" and is counted
 * "complementary".
 *
 * Ellie reads the admin to find out what customers are like, so the chart was
 * answering a question about a different product from the one people saw.
 *
 * ── WHERE THE NUMBERS COME FROM ───────────────────────────────────────────
 * The customer-facing set survives, because it is what people have been told
 * and because it is not arbitrary: 0.75 is STRENGTH and 1.50 is OPPORTUNITY in
 * comms-plan.js, the same two thresholds that decide whether a single
 * dimension reads as a strength, a note or an opportunity. The third cut is the
 * next multiple. So the bands are one, two and three times STRENGTH, derived
 * rather than written down, and check-feedback-mirror already holds that pair
 * against the website either side of each line.
 */

import { STRENGTH } from './comms-plan.js';

/**
 * The four bands, in order, with the label a couple reads and the key the
 * store counts under.
 *
 * `upTo` is inclusive: a gap exactly on a line belongs to the band it closes,
 * which is what the website's own comparisons did (`<=`). The last band has no
 * ceiling.
 */
export const PAIRING_BANDS = [
  { upTo: STRENGTH, label: 'Highly aligned', tier: 'aligned' },
  { upTo: STRENGTH * 2, label: 'Compatible', tier: 'compatible' },
  { upTo: STRENGTH * 3, label: 'Complementary', tier: 'complementary' },
  { upTo: Infinity, label: 'Distinctly different', tier: 'distinct' },
];

/** The band an average gap falls in. */
function bandFor(avgGap) {
  const g = Number(avgGap);
  if (!Number.isFinite(g)) return PAIRING_BANDS[PAIRING_BANDS.length - 1];
  return PAIRING_BANDS.find((b) => g <= b.upTo) || PAIRING_BANDS[PAIRING_BANDS.length - 1];
}

/** What the couple reads. */
export function pairingLabel(avgGap) {
  return bandFor(avgGap).label;
}

/** What the store counts, and the admin charts. */
export function pairingTier(avgGap) {
  return bandFor(avgGap).tier;
}

/** Every tier, for an endpoint validating one and an admin enumerating them. */
export const PAIRING_TIERS = PAIRING_BANDS.map((b) => b.tier);
