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
//     conflict .45, stress .25, repair .15, energy .10, closeness .05
//   Open/Guarded (higher = open; open if >= 3.0):
//     expression .40, feedback .25, needs .20, bids .10, love .05
//   Inverted (6-score, spectrum orientation): stress, energy, closeness, needs, love
// ═══════════════════════════════════════════════════════════════════════════

// Question id -> dimension. Every dimension has three questions except
// closeness, which has one (held to the minimum weight for that reason).
export const DIM_KEYS = {
  energy:     ['en1', 'en2', 'en4'],
  expression: ['ex1', 'ex2', 'ex4'],
  love:       ['lv1', 'lv2', 'lv5'],
  bids:       ['bd1', 'bd3', 'bd4'],
  needs:      ['nd1', 'nd3', 'nd5'],
  conflict:   ['cf1', 'cf2', 'cf5'],
  stress:     ['st1', 'st2', 'st5'],
  repair:     ['rp1', 'rp2', 'rp3'],
  feedback:   ['fb1', 'fb2', 'fb5'],
  closeness:  ['cl2'],
};

// Source of truth for the type formula.
export const AXIS_CONFIG = {
  conflict:   { axis: 'withdraw', weight: 0.45, invert: false },
  stress:     { axis: 'withdraw', weight: 0.25, invert: true  },
  repair:     { axis: 'withdraw', weight: 0.15, invert: false },
  energy:     { axis: 'withdraw', weight: 0.10, invert: true  },
  closeness:  { axis: 'withdraw', weight: 0.05, invert: true  },
  expression: { axis: 'open',     weight: 0.40, invert: false },
  feedback:   { axis: 'open',     weight: 0.25, invert: false },
  needs:      { axis: 'open',     weight: 0.20, invert: true  },
  bids:       { axis: 'open',     weight: 0.10, invert: false },
  love:       { axis: 'open',     weight: 0.05, invert: true  },
};

// Average the answered question values for each dimension. Returns null for a
// dimension with no answers (callers / axisScores treat missing as neutral 3).
export function calcDimScores(answers) {
  if (!answers) return {};
  const out = {};
  for (const [dim, keys] of Object.entries(DIM_KEYS)) {
    const vals = keys.map(k => answers[k]).filter(v => v != null && !isNaN(v));
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
