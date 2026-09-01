/**
 * Scoring for Exercise 5: How You Fight.
 *
 * ── WHAT THIS DELIBERATELY DOES NOT DO ────────────────────────────────────
 * No type, no letter, no couple pairing. The other exercises describe a
 * dynamic; this one measures a rate on patterns where one direction is
 * genuinely worse. Turning that into an identity label would be the single
 * most harmful thing this product could do: "you are a Critic" is a sentence
 * someone repeats to themselves for years.
 *
 * It also produces no combined couple score. Averaging two people's risk
 * patterns hides the case that matters most, one partner high and one low,
 * and invites a couple to read a middling number as fine.
 *
 * What it does produce: per-pattern frequency, a band, and which patterns are
 * worth attention. Rates and bands, described, never ranked into a verdict.
 */

import {
  CONFLICT_QUESTIONS, RISK_QUESTIONS, CONFLICT_REQUIRED, conflictQuestionsInOrder,
} from '../_conflict-questions.js';

/**
 * Bands for a 0-3 frequency answer.
 *
 * 'Sometimes' is where this stops being ordinary. Everyone is occasionally
 * defensive; the research signal is about it being habitual. Deliberately
 * generous at the low end so that a single honest 'Rarely' does not get
 * flagged, which would teach people to under-report.
 */
export function riskBand(value) {
  if (value == null || isNaN(value)) return null;
  const v = Number(value);
  if (v <= 0) return 'not_present';
  if (v === 1) return 'occasional';
  if (v === 2) return 'worth_watching';
  return 'worth_attention';
}

const BAND_ORDER = { not_present: 0, occasional: 1, worth_watching: 2, worth_attention: 3 };

/** Is the exercise finished? Open text is optional; everything else required. */
export function isConflictComplete(answers) {
  if (!answers) return false;
  return CONFLICT_REQUIRED.every(id => {
    const v = answers[id];
    if (v == null) return false;
    if (Array.isArray(v)) return v.length > 0;
    return v !== '';
  });
}

/**
 * One person's results. Never merged with their partner's.
 */
export function summarizeConflict(answers) {
  if (!answers || !isConflictComplete(answers)) return null;

  const patterns = RISK_QUESTIONS.map(q => {
    const value = answers[q.id] == null ? null : Number(answers[q.id]);
    return { id: q.id, key: q.riskKey, value, band: riskBand(value) };
  });

  // Worth attention first, so the results page leads with what matters rather
  // than with whatever happened to be asked first.
  const ranked = [...patterns]
    .filter(p => p.band)
    .sort((a, b) => (BAND_ORDER[b.band] - BAND_ORDER[a.band]) || (b.value - a.value));

  const flagged = ranked.filter(p => BAND_ORDER[p.band] >= 2);

  return {
    // Their own read on how conflict goes, kept separate from the risk items:
    // it is a feeling, not a measurement, and the two should not be blended.
    overall: answers.c0 == null ? null : Number(answers.c0),
    patterns,
    ranked,
    flagged: flagged.map(p => p.key),
    // A count, not a score. Four out of four is not "100% bad", and a single
    // number invites exactly that reading.
    flaggedCount: flagged.length,
    // What they said already works, which the results lead with.
    strength: answers.c8 || null,
    repairRanking: Array.isArray(answers.c_repair) ? answers.c_repair : [],
    openings: { start: answers.c1 ?? null, middle: answers.c2 ?? null, oldTopics: answers.c_topic ?? null },
    reflection: (answers.c9 || '').trim() || null,
    appreciation: (answers.c_grat || '').trim() || null,
  };
}

/**
 * The couple view: both summaries side by side, never averaged.
 *
 * The useful comparison is repair preferences, what each says helps them
 * reset, because that is directly actionable by the other person. Risk
 * patterns are shown per person and never combined into a couple verdict.
 */
export function conflictPair(mine, theirs) {
  const a = summarizeConflict(mine);
  const b = summarizeConflict(theirs);
  if (!a || !b) return null;

  // Top-ranked repair move each: what most helps this person reset. Positions
  // are what one partner can act on for the other.
  const topRepair = (s) => s.repairRanking?.[0] || null;

  return {
    a, b,
    // Both people naming the same pattern is a shared dynamic rather than one
    // person's problem, and reads very differently in the copy.
    sharedFlags: a.flagged.filter(k => b.flagged.includes(k)),
    // Where one flags and the other does not: worth naming carefully, since
    // this is the case most likely to be read as blame.
    onlyA: a.flagged.filter(k => !b.flagged.includes(k)),
    onlyB: b.flagged.filter(k => !a.flagged.includes(k)),
    repair: { a: topRepair(a), b: topRepair(b) },
    // How differently they read the relationship's conflict health. A wide gap
    // here is its own conversation, independent of the risk items.
    overallGap: (a.overall == null || b.overall == null) ? null : Math.abs(a.overall - b.overall),
  };
}

export { CONFLICT_QUESTIONS, conflictQuestionsInOrder };
