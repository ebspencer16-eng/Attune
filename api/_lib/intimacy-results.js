/**
 * Physical Intimacy results, assembled for whoever is reading them.
 *
 * The scoring already lived in api/_intimacy-questions.js and the copy in
 * api/_intimacy-results-prose.js, and the website imports both. Only the
 * assembly was missing, so the app had eight sections and nothing to put in
 * them.
 *
 * ── WHAT IS AND IS NOT SENT ───────────────────────────────────────────────
 * Gaps, states and the copy for each state. Not the raw answers. This is the
 * most private thing in the product, and a payload that carries what each
 * person said about their own sex life is a payload that can leak it. The
 * dimension screens are about the distance between two answers, which is what
 * the exercise measures, and that number is enough to render every one of
 * them.
 */

import {
  INTIMACY_DIMENSIONS,
  summarizeIntimacy,
  intimacyDimensionSkips,
} from '../_intimacy-questions.js';
import { INTIMACY_RESULTS_PROSE } from '../_intimacy-results-prose.js';

/**
 * Which line of copy a dimension gets.
 *
 * `oneSkipped` outranks the gap. If one person declined to answer a whole
 * dimension there is no distance to report, and saying "you are aligned here"
 * to a couple where one of them said nothing would be a lie of exactly the
 * kind this section must not tell.
 */
function proseFor(dimensionId, state, skips) {
  const copy = INTIMACY_RESULTS_PROSE[dimensionId] || {};
  const skip = skips?.[dimensionId];
  if (skip && (skip.mineSkipped || skip.theirsSkipped) && !(skip.mineSkipped && skip.theirsSkipped)) {
    return { body: copy.oneSkipped || copy.unspoken || null, reason: 'one_skipped' };
  }
  if (state === 'unspoken') return { body: copy.unspoken || null, reason: 'both_skipped' };
  return { body: copy[state] || null, reason: state };
}

export function intimacyResults({ mine, theirs }) {
  const answersMine = mine?.answers || mine || null;
  const answersTheirs = theirs?.answers || theirs || null;
  if (!answersMine || !answersTheirs) return null;

  const summary = summarizeIntimacy(answersMine, answersTheirs);
  const skips = intimacyDimensionSkips(answersMine, answersTheirs);

  const dimensions = INTIMACY_DIMENSIONS.map((d) => {
    const found = summary.dimSummary.find((x) => x.id === d.id);
    const state = found?.state || 'unspoken';
    const copy = INTIMACY_RESULTS_PROSE[d.id] || {};
    const prose = proseFor(d.id, state, skips);
    return {
      // The section id the app navigates to and notes anchor against.
      section: 'intimacy-' + d.id,
      id: d.id,
      label: d.label,
      intro: copy.intro || null,
      state,
      // Rounded to a percentage of the scale. The raw average is a distance
      // between 0 and 1 and means nothing to a reader.
      distancePct: found?.avgGap == null ? null : Math.round(found.avgGap * 100),
      body: prose.body,
      reason: prose.reason,
      // The question to take away. This is the actual product of the section:
      // the exercise exists to start a conversation, not to score one.
      prompt: copy.prompt || null,
    };
  });

  return {
    overallState: summary.overallState,
    overallDistancePct: summary.overall == null ? null : Math.round(summary.overall * 100),
    dimensions,
    // Ordered for the Conversations screen: furthest apart first, because that
    // is where a conversation is most worth having. Dimensions nobody answered
    // are left out rather than listed as nothing to discuss.
    conversations: dimensions
      .filter((d) => d.prompt && d.state !== 'unspoken')
      .sort((a, b) => (b.distancePct ?? -1) - (a.distancePct ?? -1)),
  };
}
