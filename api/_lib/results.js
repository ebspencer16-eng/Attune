/**
 * Derived results for one couple, computed in one place.
 *
 * WHY THIS EXISTS
 * The same three lines (blendedDimScores -> axisScores -> typeCodeFromAxes)
 * are repeated in admin-csv, admin-data, admin-explore, admin-typing and the
 * client. Each copy is a chance to drift, and when the axis weights or the
 * partner-view blend changed, every copy had to be found by hand. This is the
 * single implementation those callers should move onto.
 *
 * It is also the bridge to the native app. The app should never reimplement
 * scoring: it asks the server what the results are and renders them. That keeps
 * the ten dimensions, the axis weights, the visibility blend and the flipped
 * questions in exactly one language.
 *
 * Pure: no network, no database, no environment. Give it two answer objects and
 * it returns the derived shape. That makes it testable at the node level, which
 * matters more now that screen-level checks are moving to Xcode.
 */

import {
  DIM_KEYS,
  AXIS_CONFIG,
  PARTNER_VIEW_BLEND,
  calcDimScores,
  blendedDimScores,
  axisScores,
  typeCodeFromAxes,
  lowConfidence,
} from '../_type-engine.js';

// Bump when the shape or the maths changes, so a stored result can be told
// apart from one computed under different rules. Anything persisted carries it.
export const RESULTS_VERSION = 1;

const round = (n, dp = 3) => (n == null || isNaN(n) ? null : Number(Number(n).toFixed(dp)));

/**
 * One person's derived scores.
 *
 * selfAnswers   this person's Exercise 1 answers
 * otherAnswers  their partner's answers, which carry the pv_* reads OF this
 *               person. Null until the partner has finished, in which case the
 *               result is honest self-report rather than a blend against a
 *               phantom neutral.
 */
export function personResults(selfAnswers, otherAnswers) {
  const self = calcDimScores(selfAnswers);
  const blended = otherAnswers ? blendedDimScores(selfAnswers, otherAnswers) : self;
  const axes = axisScores(blended);
  const typeCode = typeCodeFromAxes(axes.withdrawScore, axes.openScore);

  const dimensions = {};
  for (const dim of Object.keys(DIM_KEYS)) {
    const blend = PARTNER_VIEW_BLEND[dim] || { self: 0.5, partner: 0.5 };
    dimensions[dim] = {
      self: round(self[dim]),
      blended: round(blended[dim]),
      // Stated so a reader can see why a blended score differs from self-report
      // without needing the engine.
      blend: otherAnswers ? blend : { self: 1, partner: 0 },
      axis: AXIS_CONFIG[dim]?.axis || null,
      weight: AXIS_CONFIG[dim]?.weight ?? null,
      inverted: !!AXIS_CONFIG[dim]?.invert,
    };
  }

  return {
    typeCode,
    axes: { withdraw: round(axes.withdrawScore), open: round(axes.openScore) },
    // True when the answers sit close to neutral across the board, so the type
    // is a weak read rather than a confident one.
    lowConfidence: !!lowConfidence(blended),
    blendedWithPartner: !!otherAnswers,
    dimensions,
  };
}

/**
 * Both people plus what only exists at the couple level.
 *
 * Returns null when either side has not answered, rather than a half-formed
 * result. Callers should treat null as "not ready" and show the pending state.
 */
export function coupleResults({ aAnswers, bAnswers, aName = null, bName = null }) {
  const hasA = aAnswers && Object.keys(aAnswers).length > 0;
  const hasB = bAnswers && Object.keys(bAnswers).length > 0;
  if (!hasA || !hasB) return null;

  const a = personResults(aAnswers, bAnswers);
  const b = personResults(bAnswers, aAnswers);

  // Couple type is the two letters in a stable order, so WX and XW are one
  // type and the code matches the keys the prose is written against.
  const coupleType = [a.typeCode, b.typeCode].sort().join('');

  // Gap per dimension, on the blended scores, which is what the results pages
  // and the workbook both read.
  const gaps = {};
  for (const dim of Object.keys(DIM_KEYS)) {
    const x = a.dimensions[dim].blended, y = b.dimensions[dim].blended;
    gaps[dim] = (x == null || y == null) ? null : round(Math.abs(x - y), 2);
  }

  // Widest first: the order the action plan and the glance page care about,
  // ties broken by axis weight so the more load-bearing dimension leads.
  const ranked = Object.entries(gaps)
    .filter(([, g]) => g != null)
    .sort((p, q) => (Math.abs(p[1] - q[1]) > 1e-9
      ? q[1] - p[1]
      : (AXIS_CONFIG[q[0]]?.weight ?? 0) - (AXIS_CONFIG[p[0]]?.weight ?? 0)))
    .map(([dim, gap]) => ({ dim, gap }));

  return {
    version: RESULTS_VERSION,
    computedAt: new Date().toISOString(),
    coupleType,
    partners: {
      a: { name: aName, ...a },
      b: { name: bName, ...b },
    },
    gaps,
    rankedGaps: ranked,
  };
}
