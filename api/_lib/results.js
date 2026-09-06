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

import { DIM_META } from '../_workbook-content.js';
import {
  DIM_KEYS,
  QUESTION_WEIGHTS,
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
 * How accurately one person reads the other.
 *
 * A GAP is how differently two people are wired. A MISREAD is how wrongly one
 * sees the other. They are independent: a couple can be far apart and read each
 * other perfectly, or nearly identical and still misread each other. The second
 * is the actionable one, and until Part 2 existed we could not measure it.
 *
 * reader   the person doing the reading; their pv_* answers are their view of
 *          the other person
 * subject  the person being read; their own answers are the truth to compare to
 *
 * Returns per-dimension error on the 1-5 scale, signed so direction is visible:
 * positive means the reader placed them further toward the B pole than they
 * placed themselves.
 */
export function readAccuracy(readerAnswers, subjectAnswers) {
  if (!readerAnswers || !subjectAnswers) return null;
  const truth = calcDimScores(subjectAnswers);
  // The reader's pv_<question> answers, keyed back to plain question ids so the
  // same weighted scorer runs over them.
  const asRead = {};
  for (const [k, v] of Object.entries(readerAnswers)) {
    if (k.startsWith('pv_')) asRead[k.slice(3)] = v;
  }
  const read = calcDimScores(asRead);

  const dimensions = {};
  const errors = [];
  for (const dim of Object.keys(DIM_KEYS)) {
    const t = truth[dim], r = read[dim];
    if (t == null || r == null) { dimensions[dim] = null; continue; }
    const signed = round(r - t, 2);
    dimensions[dim] = { readAs: round(r), actual: round(t), error: Math.abs(signed), signed };
    errors.push(Math.abs(signed));
  }
  if (!errors.length) return null;

  const mean = errors.reduce((a, b) => a + b, 0) / errors.length;
  // Worst first: the dimensions where this person has the other most wrong.
  const worst = Object.entries(dimensions)
    .filter(([, d]) => d)
    .sort((a, b) => b[1].error - a[1].error)
    .map(([dim, d]) => ({ dim, ...d }));

  return {
    meanError: round(mean, 2),
    // Bands are deliberately coarse and are a starting point for tuning. On a
    // 1-5 scale, half a point is a nudge and a full point is a different read.
    band: mean < 0.5 ? 'reads_them_well' : mean < 1.0 ? 'mixed' : 'misreads_them',
    dimensions,
    worst,
  };
}

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
    // Carries the customer-facing label, not just the key. The app must not
    // keep its own map of dimension names: that is a second copy of a list the
    // server already owns, and it is also results copy, which is version-pinned
    // and belongs here. Without this the Insights tab rendered raw keys, so a
    // couple read "love, conflict, feedback" as though it were prose.
    .map(([dim, gap]) => ({ dim, gap, label: DIM_META[dim]?.label || dim }));

  // Understanding, both directions. aReadsB is how accurately A sees B.
  const aReadsB = readAccuracy(aAnswers, bAnswers);
  const bReadsA = readAccuracy(bAnswers, aAnswers);
  let understanding = null;
  if (aReadsB && bReadsA) {
    const mean = (aReadsB.meanError + bReadsA.meanError) / 2;
    // Asymmetry matters on its own: one partner reading the other far better
    // than the reverse is a different situation from both being equally off,
    // and it is invisible in the couple average.
    const asymmetry = round(Math.abs(aReadsB.meanError - bReadsA.meanError), 2);
    understanding = {
      meanError: round(mean, 2),
      band: mean < 0.5 ? 'understand_each_other' : mean < 1.0 ? 'partial' : 'misunderstand_each_other',
      asymmetry,
      lopsided: asymmetry >= 0.4,
      betterReader: aReadsB.meanError === bReadsA.meanError ? null
        : (aReadsB.meanError < bReadsA.meanError ? 'a' : 'b'),
      aReadsB,
      bReadsA,
      // Where the couple most misreads each other, either direction. This is
      // the list worth surfacing: it is not the same as their widest gaps.
      worstDimensions: Object.keys(gaps)
        .map(dim => {
          const x = aReadsB.dimensions[dim], y = bReadsA.dimensions[dim];
          if (!x || !y) return null;
          return { dim, error: round(Math.max(x.error, y.error), 2), aOnB: x.error, bOnA: y.error };
        })
        .filter(Boolean)
        .sort((m, n) => n.error - m.error),
    };
  }

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
    understanding,
  };
}

/**
 * Where a gap stops being ordinary variation and starts being a difference
 * worth naming.
 *
 * 1.5 is the 75th percentile of every dimension gap observed across the first
 * cohort, so "misaligned" means a gap in the top quarter of gaps, in at least
 * three of the ten dimensions. That is a definition that survives being
 * explained, unlike a number picked because it produced a pleasing split.
 *
 * The previous 1.0 in 3+ flagged 6 of 7 couples, which is labelling rather
 * than measuring.
 *
 * Provisional on a small cohort. The threshold explorer in the admin overview
 * shows the distribution; reread it once there are thirty or so couples and
 * check whether 1.5 still sits near the 75th percentile.
 */
export const ALIGNMENT_THRESHOLD = { gap: 1.5, dims: 3 };
