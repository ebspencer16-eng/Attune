/**
 * What the workbook generator is given.
 *
 * ── WHY THIS IS A MODULE ──────────────────────────────────────────────────
 * It was a function inside src/App.jsx, which meant the workbook could only
 * ever be built by a browser with the buyer's order in its storage. Ellie:
 * "I clicked workbook and it said generating now... shouldn't it be there
 * already?" It should, and now the server builds one the moment a couple's
 * results open, so it needs the same payload the website builds.
 *
 * The alternative was writing this a second time server-side, which is the
 * failure this codebase is organised against: two builders, one workbook, and
 * nothing checking that a couple gets the same document either way.
 *
 * ── THE SCORES ARE THE ENGINE'S ───────────────────────────────────────────
 * The website's copy of calcDimScores differed from api/_type-engine.js in one
 * respect: an unanswered dimension came back as 3 rather than null, because
 * the display always needs a position. That is preserved here, on top of the
 * engine's own function, rather than by keeping a second implementation.
 */

import { calcDimScores } from '../_type-engine.js';
import { expectationsByDomain } from './expectations-alignment.js';
import { RESPONSIBILITY_CATEGORIES, LIFE_QUESTIONS, substName } from '../_questions.js';
import { normRespValue, mirrorRespKey, mirrorLifeId } from './expectations.js';

/** Dimension scores, with a neutral 3 where nothing was answered. */
function workbookDimScores(answers) {
  if (!answers) return {};
  const out = calcDimScores(answers);
  for (const k of Object.keys(out)) if (out[k] == null) out[k] = 3;
  return out;
}

export function buildWorkbookPayload(userName, partnerName, ex1Answers, partnerEx1, ex2Answers, partnerEx2, coupleType) {
  const myS = workbookDimScores(ex1Answers);
  const partS = workbookDimScores(partnerEx1);

  // Responsibilities: per-category arrays of { item, value } per partner.
  // Item label is name-substituted (Extended Family rows reference each
  // partner's family by name) so the renderer doesn't need access to
  // userName/partnerName for substitution.
  const responsibilities = { user: {}, partner: {} };
  RESPONSIBILITY_CATEGORIES.forEach(cat => {
    responsibilities.user[cat.id] = [];
    responsibilities.partner[cat.id] = [];
    cat.items.forEach(rawItem => {
      const key = cat.id + '__' + rawItem;
      const itemLabel = substName(rawItem, userName, partnerName);
      const userValue = normRespValue(ex2Answers?.responsibilities?.[key] || null, true, userName, partnerName);
      const partnerValue = normRespValue(partnerEx2?.responsibilities?.[mirrorRespKey(key)] || null, false, userName, partnerName);
      responsibilities.user[cat.id].push({ item: itemLabel, value: userValue });
      responsibilities.partner[cat.id].push({ item: itemLabel, value: partnerValue });
    });
  });

  // Life questions: full set, keyed by lq_id, per partner. Topic is name-
  // substituted so the renderer can use it directly.
  const lifeQuestions = { user: {}, partner: {}, meta: {} };
  LIFE_QUESTIONS.forEach(q => {
    lifeQuestions.user[q.id] = ex2Answers?.life?.[q.id] || null;
    lifeQuestions.partner[q.id] = partnerEx2?.life?.[mirrorLifeId(q.id)] || null;
    lifeQuestions.meta[q.id] = {
      category: q.category,
      topic: substName(q.topic || '', userName, partnerName),
    };
  });

  /**
   * ── expGaps, DERIVED RATHER THAN NAMED ──────────────────────────────────
   * Ellie: "I only want the PDF workbook to exist, and if the PDF builder uses
   * outdated references, then we need to update those."
   *
   * This was a hand-written list of seven keys looked up as `lq_<key>`:
   * household, emotional, financial, career, children, lifestyle, values. Five
   * of the seven name a question that does not exist. The real ids are
   * lq_location, lq_faith, lq_finances, lq_routine, lq_social and the rest, so
   * five of seven rows carried a null answer for both partners and
   * `aligned: false`, and public/workbook-render.html drew six of them.
   *
   * It survived because every value it produced was a valid value. A null
   * answer and an unaligned flag is exactly what an unanswered question looks
   * like, so the output was indistinguishable from a couple who had not
   * finished.
   *
   * Built from LIFE_QUESTIONS now, which is the registry the questions
   * themselves come from, so a key cannot fail to resolve: there is no key.
   * The label is the question's own topic, name-substituted, which is what the
   * reader is shown everywhere else.
   */
  const expGaps = LIFE_QUESTIONS.map((q) => {
    const yourAns = lifeQuestions.user[q.id];
    const partnerAns = lifeQuestions.partner[q.id];
    return {
      key: q.id.replace(/^lq_/, ''),
      label: lifeQuestions.meta[q.id].topic,
      yourAnswer: yourAns,
      partnerAnswer: partnerAns,
      /* Both unanswered is not agreement. The old shape called two nulls
         aligned, which is how a couple who had answered nothing read as
         agreeing about everything. */
      aligned: Boolean(yourAns) && yourAns === partnerAns,
    };
  });

  return {
    userName,
    partnerName,
    scores: myS,
    partnerScores: partS,
    coupleType: coupleType || null,
    // Per-couple-type phrase from tips[0].phraseTry. Surfaced separately
    // so renderers don't need to walk the full tips array. Used by the
    // Python workbook builder's reference card (sits between the names
    // and the tiles). Null if coupleType is unavailable.
    phraseThatLands: coupleType?.tips?.[0]?.phraseTry || null,
    // NEW Phase 5a fields — full ex2 data
    responsibilities,
    /**
     * ── THE PER-DOMAIN PERCENTAGES, COMPUTED THE ONE WAY ────────────────
     * api/_couple-shape.js worked these out itself, by counting rows where
     * the two answers are the same string. The results page and the app use
     * domainAlignmentPct, which scores each item for how close the two
     * answers are and takes the mean, so a pair one step apart gets partial
     * credit.
     *
     * Measured over the same answers: a couple one step apart on everything
     * reads 50 to 71 per cent on their results page and 0 per cent in their
     * workbook. On random answers the workbook came out 12 to 50 points
     * lower on every domain. One number, two methods, and the harsher one
     * printed in the thing they keep.
     *
     * Computed here because this is where the raw answers are. By the time
     * _couple-shape sees the payload the responsibilities have been
     * normalised to names and the original pair is gone, so it could not
     * have called the shared function even if it had wanted to.
     */
    expectationsPct: Object.fromEntries(
      expectationsByDomain({ mine: ex2Answers, theirs: partnerEx2, youName: userName, themName: partnerName })
        .map((d) => [d.key, d.pct]),
    ),
    lifeQuestions,
    // LEGACY field — kept for backward compatibility
    expGaps,
  };
}
