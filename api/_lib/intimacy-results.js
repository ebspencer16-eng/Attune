/**
 * Physical Intimacy results, assembled for whoever is reading them.
 *
 * The scoring already lived in api/_intimacy-questions.js and the copy in
 * api/_intimacy-results-prose.js, and the website imports both. Only the
 * assembly was missing, so the app had eight sections and nothing to put in
 * them.
 *
 * ── WHAT IS SENT, AND WHY THAT CHANGED ────────────────────────────────────
 * Gaps, states, the copy for each state, and each person's position on each
 * question.
 *
 * The first version sent distances only, on the reasoning that this is the
 * most private thing in the product. That was a rule invented here rather than
 * one the product ever made. What the product actually promises, in the
 * exercise intro, is:
 *
 *   "You answer on your own. Neither of you sees the other's answers until you
 *    have both finished."
 *
 * Until, not never. And the catalogue sells the exercise as "Answered
 * independently, compared side by side". The comparison is the product.
 *
 * Withholding positions did not make anyone safer. It made the app unable to
 * draw a screen the website has always had, so the two surfaces disagreed
 * about what a customer bought.
 *
 * What is still withheld: nothing is sent before both partners have finished.
 * That is the promise, and /api/results only builds this payload when both are
 * done. A declined question carries no position, so choosing not to answer
 * stays invisible rather than becoming its own signal.
 */

import {
  INTIMACY_DIMENSIONS,
  INTIMACY_QUESTIONS,
  summarizeIntimacy,
  intimacyDimensionSkips,
} from '../_intimacy-questions.js';
import { INTIMACY_RESULTS_PROSE, TALK_ABOUT_IT } from '../_intimacy-results-prose.js';

/**
 * The ground each dimension's page is painted with.
 *
 * The website tints every Physical Intimacy detail page to its dimension. The
 * app drew all six on cream, so the section that is most obviously designed on
 * one product looked undesigned on the other. One table, both surfaces.
 */
const DIM_TINT = {
  frequency: '#7A2540',
  initiating: '#8A3350',
  comfort: '#6E2A48',
  communication: '#5E2E52',
  adventure: '#8A3A3A',
  meaning: '#4E2A55',
};

/** The three stops, dark to light, for one dimension's page. */
export function groundForDimension(id) {
  const t = DIM_TINT[id] || DIM_TINT.frequency;
  return [`${t}dd`, `${t}99`, '#22204a'];
}

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

/**
 * Where each person sits on one question, 0 to 1.
 *
 * Answers are stored as the option label, so the position is that option's
 * value. A declined answer has a null value and returns null, which renders as
 * no mark rather than as a mark at zero.
 */
function positionOf(question, answer) {
  if (answer == null) return null;
  const option = (question.options || []).find((o) => o.label === answer);
  return option && option.value != null ? option.value : null;
}

/**
 * The side-by-side rows for one dimension, matching the website's screen.
 *
 * selfref questions are left out, as the website leaves them out: they ask
 * about you relative to your partner, so two positions on one axis would be
 * comparing two different questions.
 */
function questionRows(dimensionId, answersMine, answersTheirs, variant) {
  return INTIMACY_QUESTIONS
    .filter((q) => q.dimension === dimensionId && q.kind !== 'selfref')
    .map((q) => {
      const scored = (q.options || []).filter((o) => o.value != null)
        .slice().sort((a, b) => a.value - b.value);
      return {
        id: q.id,
        text: q[variant] || q.premarital || q.topic || '',
        low: scored[0]?.label || '',
        high: scored[scored.length - 1]?.label || '',
        you: positionOf(q, answersMine?.[q.id]),
        them: positionOf(q, answersTheirs?.[q.id]),
      };
    })
    // A row neither of them answered has nothing to show.
    .filter((r) => r.you != null || r.them != null);
}

export function intimacyResults({ mine, theirs, variant = 'premarital' }) {
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
      // The gradient the website paints this dimension's page. Sent so the app
      // stops drawing all six on cream while the website tints each one.
      ground: groundForDimension(d.id),
      intro: copy.intro || null,
      /**
       * The two ends of this dimension's scale.
       *
       * The website prints them either side of the track on the dimension
       * page. The app had no access to them, so it drew a bar with no ends: a
       * position on an unlabelled line, which tells a reader nothing about
       * which direction is which.
       */
      poles: d.poles || null,
      state,
      // Rounded to a percentage of the scale. The raw average is a distance
      // between 0 and 1 and means nothing to a reader.
      distancePct: found?.avgGap == null ? null : Math.round(found.avgGap * 100),
      body: prose.body,
      reason: prose.reason,
      // The question to take away. This is the actual product of the section:
      // the exercise exists to start a conversation, not to score one.
      prompt: copy.prompt || null,
      // Both people's positions, question by question. This is the screen the
      // catalogue sells as "compared side by side".
      questions: questionRows(d.id, answersMine, answersTheirs, variant),
      // ── AND THE TWO AVERAGES, FOR THE OVERVIEW ROW ───────────────────
      // The website's overview plots each partner on a track per dimension.
      // The app only had the distance between them, so it drew one bar where
      // the website draws two people, which reads as a score rather than as a
      // comparison. Averaged over the questions each of them answered.
      positions: (() => {
        const rows = questionRows(d.id, answersMine, answersTheirs, variant);
        const mean = (side) => {
          const vals = rows.map((r) => r[side]).filter((v) => v != null);
          return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        };
        return { you: mean('you'), them: mean('them') };
      })(),
    };
  });

  return {
    overallState: summary.overallState,
    overallDistancePct: summary.overall == null ? null : Math.round(summary.overall * 100),
    /**
     * The label the website puts above every prompt. Sent because it was typed
     * inline in src/App.jsx and nowhere the app could read it, so the app
     * printed each prompt as a bare heading with nothing saying it was a
     * question to ask each other.
     */
    promptLabel: TALK_ABOUT_IT,
    dimensions,
    // Ordered for the Conversations screen: furthest apart first, because that
    // is where a conversation is most worth having. Dimensions nobody answered
    // are left out rather than listed as nothing to discuss.
    conversations: dimensions
      .filter((d) => d.prompt && d.state !== 'unspoken')
      .sort((a, b) => (b.distancePct ?? -1) - (a.distancePct ?? -1)),
  };
}
