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

  // Legacy expGaps shape — kept for backward compatibility with renderers
  // that haven't been updated to use the new fields. Built from the same
  // life-question data so values stay consistent. Only the original 7-key
  // legacy set is included; new family-contact questions and Extended
  // Family responsibilities live in the new fields above.
  const LEGACY_EXP_KEYS = [
    { key: 'household', label: 'Visible Household Labor' },
    { key: 'emotional', label: 'Emotional & Invisible Labor' },
    { key: 'financial', label: 'Financial & Money' },
    { key: 'career',    label: 'Career' },
    { key: 'children',  label: 'Children & Family' },
    { key: 'lifestyle', label: 'Home & Lifestyle' },
    { key: 'values',    label: 'Faith & Values' },
  ];
  const expGaps = LEGACY_EXP_KEYS.map(({ key, label }) => {
    const yourAns = ex2Answers?.life?.['lq_' + key] || null;
    const partnerAns = partnerEx2?.life?.[mirrorLifeId('lq_' + key)] || null;
    return { key, label, yourAnswer: yourAns, partnerAnswer: partnerAns, aligned: yourAns === partnerAns };
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
    lifeQuestions,
    // LEGACY field — kept for backward compatibility
    expGaps,
  };
}
