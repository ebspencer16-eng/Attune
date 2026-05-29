// ═══════════════════════════════════════════════════════════════════════════
// TYPE ENGINE — single source of truth for individual type derivation.
//
// Imported by BOTH the frontend (src/App.jsx computeIndividualType) and the
// workbook backend (api/_workbook-content.js). Keep all axis math here so the
// two cannot drift. Pure module: no imports, no side effects.
//
// Two axes, each a weighted average on the 1-5 score scale so the 3.0 split
// keeps its meaning. Every dimension is oriented by its SPECTRUM meaning, so
// a high axis score always means the same thing:
//   withdrawScore high = withdraw   (engage if <= 3.0)
//   openScore     high = open       (open   if >= 3.0)
//
// Dimensions whose high-score end is the OTHER pole are inverted with 6-score
// (midpoint 3 unchanged): stress, energy, closeness on E/W; needs, love on O/G.
// This also fixes the prior bug where stress and needs were added in the
// reverse of their spectrum direction.
//
// Weights (0.05-step tiers; anchor / strong / core / supporting / minor):
//   Engage/Withdraw: conflict .45, stress .25, repair .15, energy .10, closeness .05
//   Open/Guarded:    expression .40, feedback .25, needs .20, bids .10, love .05
// closeness is a single-question dimension (all others have three), so it
// carries the minimum weight. energy/love are construct assumptions held to
// low weight pending validation against real response data.
// ═══════════════════════════════════════════════════════════════════════════

const _v = (s, k) => (s[k] == null || isNaN(s[k])) ? 3 : Number(s[k]);

// Weighted axis scores from a full set of dimension scores.
export function axisScores(scores) {
  const s = scores || {};
  const withdrawScore =
      _v(s, 'conflict')      * 0.45
    + (6 - _v(s, 'stress'))  * 0.25
    + _v(s, 'repair')        * 0.15
    + (6 - _v(s, 'energy'))  * 0.10
    + (6 - _v(s, 'closeness')) * 0.05;
  const openScore =
      _v(s, 'expression')    * 0.40
    + _v(s, 'feedback')      * 0.25
    + (6 - _v(s, 'needs'))   * 0.20
    + _v(s, 'bids')          * 0.10
    + (6 - _v(s, 'love'))    * 0.05;
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
export function computeIndividualTypeCode(scores) {
  const { withdrawScore, openScore } = axisScores(scores);
  return typeCodeFromAxes(withdrawScore, openScore);
}
