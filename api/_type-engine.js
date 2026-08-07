// ═══════════════════════════════════════════════════════════════════════════
// TYPE ENGINE — single source of truth for scoring + individual type derivation.
//
// Imported by the frontend (src/App.jsx), the workbook backend
// (api/_workbook-content.js), the CSV export (api/admin-csv.js), and the admin
// typing endpoint (api/admin-typing.js). Pure module: no imports, no side
// effects. Keep ALL scoring + axis math here so nothing drifts.
//
// AXIS_CONFIG is the source of truth for the type formula. Each dimension
// declares its axis, weight, and whether it is inverted (oriented by spectrum
// via 6-score). The admin weight sandbox reads this config from the server and
// applies the same generic weighted-sum, so the only thing it varies is the
// weights — no formula constants live in the browser.
//
//   Engage/Withdraw (higher = withdraw; engage if <= 3.0):
//     conflict .45, stress .25, repair .15, energy .10, listening .05
//   Open/Guarded (higher = open; open if >= 3.0):
//     expression .40, feedback .25, needs .20, bids .10, love .05
//   Inverted (6-score, spectrum orientation): stress, energy, listening, needs, love
// ═══════════════════════════════════════════════════════════════════════════

// Question id -> dimension. Question counts per dimension are uneven after the
// communication-exercise restructure (expression 5, conflict/repair/bids/love 3,
// energy/needs 2, stress/feedback/listening 1). calcDimScores averages within a
// dimension, so the axis math is unaffected by count.
export const DIM_KEYS = {
  energy:     ['en4', 'en6'],
  expression: ['ex6', 'ex7', 'ex8', 'ex9', 'ex10'],
  love:       ['lv1', 'lv2', 'lv5'],
  bids:       ['bd1', 'bd3', 'bd4'],
  needs:      ['nd1', 'nd5'],
  conflict:   ['cf1', 'cf2'],
  stress:     ['st1'],
  repair:     ['rp2', 'rp3', 'rp6'],
  feedback:   ['fb5'],
  listening:  ['ls1'],
};

// Source of truth for the type formula.
export const AXIS_CONFIG = {
  conflict:   { axis: 'withdraw', weight: 0.45, invert: false },
  stress:     { axis: 'withdraw', weight: 0.25, invert: true  },
  repair:     { axis: 'withdraw', weight: 0.15, invert: false },
  energy:     { axis: 'withdraw', weight: 0.10, invert: true  },
  // listening took closeness's slot/weight when the exercise was restructured.
  // Axis (withdraw) + invert (B "respond/engage" -> engage end) + weight are a
  // first pass pending methodology sign-off. See the next-steps list.
  listening:  { axis: 'withdraw', weight: 0.05, invert: true  },
  expression: { axis: 'open',     weight: 0.40, invert: false },
  feedback:   { axis: 'open',     weight: 0.25, invert: false },
  needs:      { axis: 'open',     weight: 0.20, invert: true  },
  bids:       { axis: 'open',     weight: 0.10, invert: false },
  love:       { axis: 'open',     weight: 0.05, invert: true  },
};

// Questions whose displayed a/b order is reversed relative to their dimension's
// scoring orientation. Their raw 1-5 value is flipped (6 - v) before averaging
// so the dimension stays consistently oriented. lv5: poles display
// physical(a)->verbal(b), but love is oriented verbal->physical (lv1/lv2).
export const FLIPPED_QUESTIONS = new Set(['lv5']);

// Average the answered question values for each dimension. Returns null for a
// dimension with no answers (callers / axisScores treat missing as neutral 3).
export function calcDimScores(answers) {
  if (!answers) return {};
  const out = {};
  for (const [dim, keys] of Object.entries(DIM_KEYS)) {
    const vals = keys
      .map(k => {
        const raw = answers[k];
        if (raw == null || isNaN(raw)) return null;
        return FLIPPED_QUESTIONS.has(k) ? (6 - Number(raw)) : Number(raw);
      })
      .filter(v => v != null && !isNaN(v));
    out[dim] = vals.length ? vals.reduce((s, v) => s + Number(v), 0) / vals.length : null;
  }
  return out;
}

const _v = (s, k) => (s[k] == null || isNaN(s[k])) ? 3 : Number(s[k]);

// Weighted axis scores. Generic over a config so the same math serves
// production (default AXIS_CONFIG) and the weight sandbox (overridden weights).
export function axisScores(scores, config = AXIS_CONFIG) {
  const s = scores || {};
  let withdrawScore = 0, openScore = 0;
  for (const [dim, cfg] of Object.entries(config)) {
    const oriented = cfg.invert ? (6 - _v(s, dim)) : _v(s, dim);
    if (cfg.axis === 'withdraw') withdrawScore += oriented * cfg.weight;
    else                          openScore     += oriented * cfg.weight;
  }
  return { withdrawScore, openScore };
}

// Type code from axis scores. Boundary at 3.0: engage/open inclusive,
// withdraw/guarded exclusive (intentional asymmetry, unchanged).
//   W = engage + open · X = engage + guarded · Y = withdraw + open · Z = withdraw + guarded
export function typeCodeFromAxes(withdrawScore, openScore) {
  const isEngage = withdrawScore <= 3.0;
  const isOpen   = openScore    >= 3.0;
  return isEngage && isOpen  ? 'W'
       : isEngage && !isOpen ? 'X'
       : !isEngage && isOpen ? 'Y'
       :                       'Z';
}

// Convenience: type code straight from dimension scores.
export function computeIndividualTypeCode(scores, config = AXIS_CONFIG) {
  const { withdrawScore, openScore } = axisScores(scores, config);
  return typeCodeFromAxes(withdrawScore, openScore);
}

// Low-confidence flag: answers bunched near the midpoint make the type
// mechanically valid but informationally weak. Mirrors the app's logic.
export function lowConfidence(scores) {
  const s = scores || {};
  const { withdrawScore, openScore } = axisScores(s);
  const vals = Object.keys(DIM_KEYS).map(k => s[k]).filter(v => v != null && !isNaN(v));
  let stdDev = 0;
  if (vals.length >= 3) {
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    stdDev = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
  }
  const nearMid = Math.abs(withdrawScore - 3) < 0.3 && Math.abs(openScore - 3) < 0.3;
  return stdDev < 0.3 && nearMid;
}


// ─────────────────────────────────────────────────────────────────────────────
// PARTNER-VIEW BLEND (Proposal B). A person's type blends their own dimension
// scores with their partner's view of them, per dimension. The partner-view
// answers (pv_*) live on the PARTNER'S answer object (their rating of THIS
// person). Only observable dimensions are blended; the rest stay self-report.
// A dimension is blended ONLY when the partner-view answer exists — never
// against a phantom neutral — so interim (self-only) scoring stays correct
// until the partner has answered.
// ─────────────────────────────────────────────────────────────────────────────
export const PARTNER_VIEW_QUESTIONS = {
  pv_conflict: 'conflict', pv_stress: 'stress', pv_repair: 'repair',
  pv_expression: 'expression', pv_feedback: 'feedback',
};
export const PARTNER_VIEW_BLEND = {
  conflict:   { self: 0.5, partner: 0.5 },
  stress:     { self: 0.5, partner: 0.5 },
  repair:     { self: 0.6, partner: 0.4 },
  expression: { self: 0.4, partner: 0.6 },
  feedback:   { self: 0.4, partner: 0.6 },
};
// selfAnswers = this person's exercise answers; partnerAnswers = their partner's
// answers (source of the pv_* view-of-this-person). Returns dimension scores with
// the blend applied where a partner-view answer exists.
export function blendedDimScores(selfAnswers, partnerAnswers) {
  const selfDim = calcDimScores(selfAnswers);
  if (!partnerAnswers) return selfDim;
  const out = { ...selfDim };
  for (const [pvId, dim] of Object.entries(PARTNER_VIEW_QUESTIONS)) {
    const pv = partnerAnswers[pvId];
    if (pv == null || isNaN(pv)) continue;
    const w = PARTNER_VIEW_BLEND[dim] || { self: 0.5, partner: 0.5 };
    const self = out[dim];
    out[dim] = (self == null || isNaN(self)) ? Number(pv) : (w.self * self + w.partner * Number(pv));
  }
  return out;
}
