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
  INTIMACY_DIMENSIONS, INTIMACY_DOMAINS,
  INTIMACY_QUESTIONS,
  summarizeIntimacy,
  intimacyDimensionSkips, intimacyOption } from '../_intimacy-questions.js';
import {
  INTIMACY_RESULTS_PROSE, TALK_ABOUT_IT, INTIMACY_LEAD, INTIMACY_ALL_ALIGNED,
} from '../_intimacy-results-prose.js';

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
/**
 * The aspects the at-a-glance action plan names: the two furthest apart, and
 * anything level with the second.
 *
 * ── WHY IT IS NOT A FIXED NUMBER ──────────────────────────────────────────
 * It was four on the website and three in the app, then three on both. Ellie:
 * "should list the top 2 things the pair disagrees on, but if #2 is tied with
 * others, each that it is tied with must also be listed."
 *
 * A fixed count cuts a tie in half, and a tie is the one case where the cut is
 * arbitrary: two aspects the same distance apart, one listed and one not,
 * decided by whichever the list happened to hold first. So the rule is a
 * threshold rather than a count. Two, unless the second is level with a third,
 * in which case everything at that distance comes too.
 *
 * Takes either shape of row: the payload's dimensions carry `distancePct` and
 * the website's summary carries `avgGap`, and both order the same way.
 *
 * Aligned aspects are left out, because an action plan is the things to do
 * something about. So are aspects neither of them answered: there is no
 * distance to be furthest on.
 */
export function intimacyActionPlan(rows) {
  const distance = (d) => d.distancePct ?? d.avgGap ?? null;
  const ranked = (rows || [])
    .filter((d) => d.state !== 'unspoken' && d.state !== 'aligned' && distance(d) != null)
    .sort((a, b) => distance(b) - distance(a));

  if (ranked.length <= 2) return ranked;
  // The distance the second one sits at. Everything at that distance is in,
  // however many that turns out to be.
  const cutoff = distance(ranked[1]);
  return ranked.filter((d) => distance(d) >= cutoff);
}

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
  /**
   * Through the registry's own lookup, not a second copy of it.
   *
   * This used to match on `o.label` here and nowhere else, which meant an
   * answer given under a wording that has since been edited resolved in the
   * scorer and not on the results page, or the other way round. One function,
   * and it knows about retired wordings. See RETIRED_OPTION_LABELS.
   */
  const option = intimacyOption(question, answer);
  return option && option.value != null ? option.value : null;
}

/**
 * What each of them chose on a question that takes more than one answer.
 *
 * ── THE QUESTION THAT WAS NEVER SHOWN ─────────────────────────────────────
 * Ellie: "can you make sure the what it's for question on physical intimacy is
 * pulling correctly?"
 *
 * It was not pulling at all. `iq_mean_for` asks what physical intimacy is
 * primarily about and takes up to two answers from a list, so its answer is a
 * pair of choices rather than a point on a scale. questionRows places points,
 * finds no position for a list, and drops the row. So the What It Is For page
 * showed two questions and neither of them was what it is for, on both
 * surfaces, since the section shipped.
 *
 * The fix is to carry the choices rather than to force them onto an axis:
 * "closeness and play" against "release" is two answers to compare, not a gap
 * to measure. No new words: the heading is the question's own `topic` and the
 * chips are its own option labels.
 */
function questionPicks(dimensionId, answersMine, answersTheirs, variant) {
  /**
   * ── THE TWO STORAGE SHAPES, RECONCILED ──────────────────────────────────
   * One exercise, two conventions: a single-select answer is stored as the
   * option's LABEL and a multi-select answer as its VALUE. See `choose` in
   * attune-app/src/components/intimacy-exercise.tsx, which says so.
   *
   * So the first version of this handed 'closeness' and 'play' straight to the
   * screen, which is an internal key in front of a customer. Everything a
   * reader sees is a label, whichever way it was stored, and a stored value
   * with no option behind it is dropped rather than printed raw.
   *
   * A null in the list is "prefer not to say". It is left out: a decline is
   * the absence of a choice, not a choice, and the website has never drawn one.
   */
  const labelsFor = (q, stored) => {
    const opts = q.options || [];
    return (Array.isArray(stored) ? stored : stored == null ? [] : [stored])
      .filter((v) => v != null)
      .map((v) => opts.find((o) => o.value === v) || intimacyOption(q, v))
      .filter((o) => o && o.value != null)
      .map((o) => o.label);
  };

  return INTIMACY_QUESTIONS
    .filter((q) => q.dimension === dimensionId && q.multi)
    .map((q) => ({
      id: q.id,
      text: q[variant] || q.premarital || q.topic || '',
      topic: q.topic || '',
      you: labelsFor(q, answersMine?.[q.id]),
      them: labelsFor(q, answersTheirs?.[q.id]),
    }))
    .filter((r) => r.you.length || r.them.length);
}

/**
 * The side-by-side rows for one dimension, matching the website's screen.
 *
 * selfref questions are left out, as the website leaves them out: they ask
 * about you relative to your partner, so two positions on one axis would be
 * comparing two different questions.
 *
 * So are multi-answer questions, explicitly rather than by accident. They used
 * to fall out here because no option label matched a list, which looked like
 * filtering and was really a question quietly going missing. They come back
 * through questionPicks.
 */
function questionRows(dimensionId, answersMine, answersTheirs, variant) {
  return INTIMACY_QUESTIONS
    .filter((q) => q.dimension === dimensionId && q.kind !== 'selfref' && !q.multi)
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
      /**
       * How aligned the two of them are here, as a percentage.
       *
       * Ellie: "can we make the bars % aligned rather than the placement
       * dots?" The at-a-glance page plotted two marks per aspect, which is
       * six two-person charts stacked, and the question that page answers is
       * how close the two of you are on each one.
       *
       * It is the distance inverted, so a couple who answered identically
       * reads 100 and the widest possible gap reads 0. Null when one of them
       * skipped the aspect: an unanswered aspect is not 0 per cent aligned,
       * it is unanswered, and the row says so in words.
       */
      alignedPct: found?.avgGap == null ? null : Math.round((1 - found.avgGap) * 100),
      body: prose.body,
      reason: prose.reason,
      // The question to take away. This is the actual product of the section:
      // the exercise exists to start a conversation, not to score one.
      prompt: copy.prompt || null,
      // Both people's positions, question by question. This is the screen the
      // catalogue sells as "compared side by side".
      questions: questionRows(d.id, answersMine, answersTheirs, variant),
      /**
       * The questions that take more than one answer, with what each of them
       * chose. "What it is primarily about" is the only one today, and it is
       * the question the section is named after.
       */
      picks: questionPicks(d.id, answersMine, answersTheirs, variant),
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

  /**
   * The two pages Physical Intimacy is read on.
   *
   * ── WHY THEY ARE BUILT FROM THE DIMENSIONS ────────────────────────────
   * Ellie: "Organize these pages just like the comms detailed pages are
   * organized. No intro paragraph, but an overall orientation tile that has
   * the 3 bars, and a 'talk about it' prompt based on whichever of the 3
   * sections had the biggest discrepancy for the pairing."
   *
   * Everything here is the dimension payload already built above, grouped.
   * Nothing is recomputed: a domain's three bars are its three dimensions'
   * positions, and its prompt is one of their prompts. A second scoring pass
   * over the same answers is how two pages of one section start disagreeing.
   */
  const domains = INTIMACY_DOMAINS.map((dom) => {
    const mine = dom.dims
      .map((id) => dimensions.find((d) => d.id === id))
      .filter(Boolean);

    /**
     * Which of the three to ask about.
     *
     * "If two are tied, use the above ordering as a prioritized list for which
     * should be prompted." `dom.dims` is that order, and `mine` is built from
     * it, so a stable sort on distance alone leaves ties in her order. A
     * dimension neither of them answered has no distance and cannot be the
     * widest gap in anything.
     */
    const ranked = mine
      .filter((d) => d.distancePct != null)
      .slice()
      .sort((a, b) => b.distancePct - a.distancePct);
    const lead = ranked[0] || null;

    return {
      section: `intimacy-${dom.id}`,
      id: dom.id,
      label: dom.label,
      /** The section's own ground, so both pages of it match. */
      ground: groundForDimension(dom.dims[0]),
      /**
       * The three rows of the orientation tile, in her order.
       *
       * `leadWithPicks` is the rule for which of them is chips rather than a
       * bar, decided here so the two surfaces cannot decide it differently.
       * Ellie: "what makes it work should feature the what is it primarily
       * about section in the overview tile instead of the bar for the 'what is
       * it for' section." A dimension with choices and no position has nothing
       * to plot, which is true of What It Is For now that its two scale
       * questions have moved or gone, and would be true of the next one like
       * it without anyone naming it.
       */
      dimensions: mine.map((d) => ({
        ...d,
        leadWithPicks: (d.picks?.length || 0) > 0
          && d.positions?.you == null && d.positions?.them == null,
      })),
      /**
       * The one thing to talk about, and which aspect it came from.
       *
       * The prompt is that dimension's own, written for it. A prompt invented
       * for the pair would be a new claim on a page whose whole content is
       * things the reader has already met.
       */
      prompt: lead?.prompt || null,
      promptFrom: lead ? { id: lead.id, label: lead.label } : null,
      /**
       * Whether this page leads with choices instead of a bar.
       *
       * Ellie: "what makes it work should feature the what is it primarily
       * about section in the overview tile instead of the bar for the 'what is
       * it for' section." What It Is For has only the multi-answer question
       * left now, so it has no position to plot and its chips are the only
       * thing it has to show. Derived rather than named: a dimension with
       * picks and no scale questions leads with its picks, which is true of
       * that one and would be true of the next one like it.
       */
      picks: mine.flatMap((d) => (d.positions?.you == null && d.positions?.them == null
        ? (d.picks || [])
        : [])),
    };
  });

  return {
    /**
     * The two grouped pages. The six dimensions are still sent, because the
     * overview plots all six and the action plan names them.
     */
    domains,
    /**
     * The label the website puts above every prompt. Sent because it was typed
     * inline in src/App.jsx and nowhere the app could read it, so the app
     * printed each prompt as a bare heading with nothing saying it was a
     * question to ask each other.
     */
    promptLabel: TALK_ABOUT_IT,
    /**
     * `lead` was the line under the two names on the glance page, by variant.
     * Ellie: the hero should read Physical Intimacy Expectations "and the line
     * saying 'based on how things are now' should be removed". The variant
     * lines are still in api/_intimacy-results-prose.js, unsent.
     */
    /**
     * Set only when nothing is misaligned, which is when the conversations
     * page needs to say why it is still showing a list.
     */
    allAlignedNote: dimensions.some((d) => d.state === 'discuss' || d.state === 'different')
      ? null
      : INTIMACY_ALL_ALIGNED,
    dimensions,
    /**
     * The action plan on the at-a-glance page: three, furthest apart first.
     *
     * ── WHY IT IS ONE LIST AND WHY IT IS THREE ────────────────────────────
     * The website filtered its own copy of the dimensions to "not aligned,
     * and answered" and took four; the app took the first three of a list
     * sorted by distance and filtered differently, so the same couple saw four
     * items on a laptop and six on a phone. Ellie: "6 is too many. Make sure
     * these are aligned and maybe only list the top 3 based on where you're
     * most misaligned."
     *
     * Aligned dimensions are left out: an action plan is the things to do
     * something about. A dimension neither of them answered is left out too,
     * because there is no distance to be furthest on.
     */
    actionPlan: intimacyActionPlan(dimensions),
  };
}
