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
  energy:      ['en4', 'en6'],
  expression:  ['ex6', 'ex7', 'ex8'],
  reassurance: ['rs1', 'rs3'],
  love:        ['lv1', 'lv2'],
  bids:        ['bd1', 'bd3', 'bd4'],
  needs:       ['nd1', 'nd5'],
  conflict:    ['cf1', 'cf2', 'cf3', 'st1'],
  repair:      ['rp2', 'rp3', 'rp6'],
  feedback:    ['fb2', 'fb5'],
  listening:   ['ls1', 'ls3'],
};

// Share of a dimension's score carried by each of its questions. Questions
// inside a dimension are not equally diagnostic: one usually asks the dimension
// directly while another asks about a specific moment or overlaps a neighbouring
// dimension. The axes already weight dimensions unequally for the same reason;
// this is that principle one level down.
//
// It also fixes a real loss of information. Under a plain mean, answering 2 and
// 4 produced exactly 3.0, indistinguishable from answering 3 and 3, so a person
// with a strong split read as having no orientation at all.
//
// Weights within a dimension must sum to 1.0, enforced below. A dimension
// absent from this table falls back to an equal split.
// Reviewed by: DRAFT, pending Carolina.
export const QUESTION_WEIGHTS = {
  energy:      { en6: 0.60, en4: 0.40 },
  expression:  { ex6: 0.45, ex8: 0.35, ex7: 0.20 },
  reassurance: { rs1: 0.65, rs3: 0.35 },
  love:        { lv1: 0.60, lv2: 0.40 },
  needs:       { nd5: 0.60, nd1: 0.40 },
  bids:        { bd3: 0.40, bd1: 0.35, bd4: 0.25 },
  listening:   { ls1: 0.70, ls3: 0.30 },
  conflict:    { cf1: 0.35, cf2: 0.20, st1: 0.30, cf3: 0.15 },
  repair:      { rp3: 0.40, rp2: 0.35, rp6: 0.25 },
  feedback:    { fb5: 0.55, fb2: 0.45 },
};

// Fails fast rather than silently mis-scoring: a hand edit that breaks a sum or
// names a question the dimension does not have stops the module from loading.
for (const [dim, weights] of Object.entries(QUESTION_WEIGHTS)) {
  const sum = Object.values(weights).reduce((a, w) => a + w, 0);
  if (Math.abs(sum - 1) > 1e-9) {
    throw new Error(`QUESTION_WEIGHTS.${dim} sums to ${sum.toFixed(3)}, must be 1.0`);
  }
  const listed = Object.keys(weights).sort().join(',');
  const actual = [...(DIM_KEYS[dim] || [])].sort().join(',');
  if (listed !== actual) {
    throw new Error(`QUESTION_WEIGHTS.${dim} lists [${listed}] but the dimension has [${actual}]`);
  }
}

// Source of truth for the type formula.
export const AXIS_CONFIG = {
  // Engage/Withdraw was reweighted after Communication Under Stress folded into
  // Conflict Style. Conflict had simply absorbed stress's 0.25 and reached 0.70
  // of the axis on four questions, which is more leverage than any one
  // dimension should carry. 0.55 keeps conflict clearly dominant, since it is
  // the dimension that most defines how a couple moves when things are hard,
  // while giving repair, energy and listening enough weight to matter.
  conflict:   { axis: 'withdraw', weight: 0.55, invert: false },
  repair:     { axis: 'withdraw', weight: 0.20, invert: false },
  energy:     { axis: 'withdraw', weight: 0.15, invert: true  },
  // listening took closeness's slot when the exercise was restructured. Axis
  // (withdraw) and invert (B "respond/engage" -> engage end) still want
  // methodology sign-off; the weight is now deliberate rather than inherited.
  listening:  { axis: 'withdraw', weight: 0.10, invert: true  },
  expression: { axis: 'open',     weight: 0.35, invert: false },
  feedback:   { axis: 'open',     weight: 0.20, invert: false },
  needs:      { axis: 'open',     weight: 0.15, invert: true  },
  reassurance:{ axis: 'open',     weight: 0.15, invert: true  },
  bids:       { axis: 'open',     weight: 0.10, invert: false },
  love:       { axis: 'open',     weight: 0.05, invert: true  },
};

// Questions whose displayed a/b order is reversed relative to their dimension's
// scoring orientation. Their raw 1-5 value is flipped (6 - v) before averaging
// so the dimension stays consistently oriented. lv5: poles display
// physical(a)->verbal(b), but love is oriented verbal->physical (lv1/lv2).
// lv5 was the other flipped question. It was removed from the exercise, so
// st1 is the only one left whose options run opposite to its dimension.
export const FLIPPED_QUESTIONS = new Set(['st1']);

// Average the answered question values for each dimension. Returns null for a
// dimension with no answers (callers / axisScores treat missing as neutral 3).
export function calcDimScores(answers, weights = QUESTION_WEIGHTS) {
  if (!answers) return {};
  const out = {};
  for (const [dim, keys] of Object.entries(DIM_KEYS)) {
    const w = weights?.[dim] || null;
    const parts = keys
      .map(k => {
        const raw = answers[k];
        if (raw == null || isNaN(raw)) return null;
        const v = FLIPPED_QUESTIONS.has(k) ? (6 - Number(raw)) : Number(raw);
        return { v, w: w ? (w[k] ?? 0) : 1 };
      })
      .filter(x => x != null && !isNaN(x.v));
    // Renormalise over the questions actually answered, so a partly answered
    // dimension is still scored on the right scale rather than dragged toward
    // zero by the missing weight.
    const totalW = parts.reduce((s, x) => s + x.w, 0);
    out[dim] = (parts.length && totalW > 0)
      ? parts.reduce((s, x) => s + x.v * x.w, 0) / totalW
      : null;
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
  // Summing weighted floats leaves noise in the last bits: a dead-centre
  // respondent produces 2.9999999999999996, not 3. The boundary below is
  // exact and asymmetric (>= 3.0 is open, < 3.0 is guarded), so that noise
  // flipped an all-neutral respondent from W to X. Round the noise off. This
  // is not normalization, and it does not move any score a person could
  // otherwise land on.
  const _clean = (n) => Math.round(n * 1e10) / 1e10;
  return { withdrawScore: _clean(withdrawScore), openScore: _clean(openScore) };
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


// ──────────────────────────────────────────────────────────────────────────
// PARTNER-VIEW BLEND. Part 2 of the comms exercise asks every question again
// about the partner, so a partner-view answer now exists for all ten
// dimensions. A person's dimension score blends their own answer with their
// partner's read of them.
//
// The split follows VISIBILITY, specifically whether the partner can see BOTH
// ends of the dimension equally. Where one pole is defined by being hard to
// detect, the partner's read is not merely noisier, it is biased in a fixed
// direction: they can only report what reached them, so weighting them heavily
// drags everyone toward the visible end. A subtle bid is one the partner may
// not register. An indirect ask is easy to miss. Assumed reassurance and
// inward energy are invisible by design. Those dimensions lead with self.
//
//   0.7 / 0.3  energy, reassurance, love, needs, bids
//              One end is low-visibility, or the thing being measured is what
//              lands internally rather than what is done.
//   0.6 / 0.4  repair, listening
//              You know your intent; they see whether it landed.
//   0.4 / 0.6  conflict, expression, feedback
//              Conflict passes the test outright: pressing and going quiet are
//              both observable. Expression and feedback are a deliberate
//              exception. The same visibility argument would push them toward
//              self, but "how you come across" is the more useful signal in a
//              relationship product even when it is the weaker measurement of
//              the person. That is a product judgement, made on purpose.
//
// A dimension is blended ONLY when the partner-view answer exists, never
// against a phantom neutral, so interim (self-only) scoring stays correct
// until the partner has answered. Dimensions absent from this table fall back
// to an even split; none should be absent.
// ──────────────────────────────────────────────────────────────────────────
export const PARTNER_VIEW_BLEND = {
  energy:      { self: 0.7, partner: 0.3 },
  reassurance: { self: 0.7, partner: 0.3 },
  love:        { self: 0.7, partner: 0.3 },
  needs:       { self: 0.7, partner: 0.3 },
  bids:        { self: 0.7, partner: 0.3 },
  repair:      { self: 0.6, partner: 0.4 },
  listening:   { self: 0.6, partner: 0.4 },
  conflict:    { self: 0.4, partner: 0.6 },
  expression:  { self: 0.4, partner: 0.6 },
  feedback:    { self: 0.4, partner: 0.6 },
};
// selfAnswers = this person's exercise answers; partnerAnswers = their partner's
// answers (source of the pv_* view-of-this-person). Returns dimension scores with
// the blend applied where a partner-view answer exists.
export function blendedDimScores(selfAnswers, partnerAnswers) {
  const selfDim = calcDimScores(selfAnswers);
  if (!partnerAnswers) return selfDim;
  // Part 2 of the exercise stores the partner-view of each question as pv_<qid>.
  // Key the partner's pv_* answers back to <qid> and run the same dimension math to
  // get a per-dimension "how the partner sees this person" score, then blend it in.
  const pvSelf = {};
  for (const [k, v] of Object.entries(partnerAnswers)) {
    if (k.startsWith('pv_')) pvSelf[k.slice(3)] = v;
  }
  const partnerViewDim = calcDimScores(pvSelf); // null for dims with no partner-view
  const out = { ...selfDim };
  for (const dim of Object.keys(out)) {
    const pv = partnerViewDim[dim];
    if (pv == null || isNaN(pv)) continue;
    const w = PARTNER_VIEW_BLEND[dim] || { self: 0.5, partner: 0.5 };
    const self = out[dim];
    out[dim] = (self == null || isNaN(self)) ? Number(pv) : (w.self * self + w.partner * Number(pv));
  }
  return out;
}
