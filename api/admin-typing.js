// /api/admin-typing?secret=...
//
// Live typing + distribution data for the admin dashboard. Computes individual
// and couple types from ex1_answers using the shared type engine (single source
// of truth) — NOT the denormalized profiles.couple_type column, which is sparse
// and can be stale. Returns authoritative default-weight aggregates plus
// anonymized per-individual / per-couple records so the dashboard can filter by
// demographic and run the weight sandbox entirely client-side.

import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth } from './_lib/admin-auth.js';
import { personResults } from './_lib/results.js';
import {
  AXIS_CONFIG, DIM_KEYS, calcDimScores, blendedDimScores, axisScores, typeCodeFromAxes, lowConfidence,
} from './_type-engine.js';

export const config = { runtime: 'edge' };

const DIMS = Object.keys(DIM_KEYS);
const TYPES = ['W', 'X', 'Y', 'Z'];
const COUPLE_TYPES = ['WW', 'WX', 'WY', 'WZ', 'XX', 'XY', 'XZ', 'YY', 'YZ', 'ZZ'];

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

// One individual's typing payload (anonymized — scores + demographics only).
function profileToRecord(p, partnerAnswers = null) {
  // Partner-view blend, same as the app's typingDimScores: a person's type uses
  // their own answers plus their partner's view of them (pv_* on the partner's
  // object). Falls back to self-only when there's no partner. This is what makes
  // the dashboard's couple types match what couples see in their results.
  // Scoring comes from api/_lib/results.js, the one implementation. This used
  // to repeat blendedDimScores -> axisScores -> typeCodeFromAxes inline, which
  // is the pattern that had to be found by hand in five files every time the
  // weights or the blend changed.
  const r = personResults(p.ex1_answers, partnerAnswers);
  const scores = Object.fromEntries(Object.entries(r.dimensions).map(([d, v]) => [d, v.blended]));
  return {
    scores,
    w: r.axes.withdraw,
    o: r.axes.open,
    type: r.typeCode,
    lowConf: r.lowConfidence,
    gender: p.gender || null,
    relLength: p.relationship_length || null,
    relStatus: p.relationship_status || null,
    createdAt: p.created_at || null,
  };
}

const hasAnswers = (p) => p && p.ex1_answers && Object.keys(p.ex1_answers).length > 0;

export default async function handler(req) {
  const url = new URL(req.url);

  const _auth = checkAdminAuth(req);
  if (!_auth.ok) return json({ error: _auth.error }, _auth.status);

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) return json({ error: 'Supabase env vars missing' }, 500);
  const admin = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const { data: profiles = [] } = await admin
      .from('profiles')
      .select('id, invite_code, partner_profile_id, joined_via_invite, gender, relationship_status, relationship_length, ex1_answers, created_at');

    // Partner lookup shared by individual and couple typing below.
    const byId = Object.fromEntries(profiles.map(p => [p.id, p]));
    const partnerAnswersOf = (p) => (p.partner_profile_id && byId[p.partner_profile_id] && byId[p.partner_profile_id].ex1_answers) || null;

    // Individuals: every profile that has Exercise 1 answers (blended with their
    // partner's view where a partner exists, matching the app).
    const withAnswers = profiles.filter(hasAnswers);
    const individuals = withAnswers.map(p => profileToRecord(p, partnerAnswersOf(p)));

    // Couples: pair by partner_profile_id so a couple is counted whenever the
    // link exists and both partners have answers. This does NOT depend on the
    // invite_code / joined_via_invite flags, which get cleared or flipped by
    // account resets and manual relinking (and would otherwise drop a real
    // couple from the distribution). Each unordered pair is counted once, and a
    // one-directional link still resolves from the side that has it.
    const couples = [];
    const pairedIds = new Set();
    const seenPair = new Set();
    for (const a of profiles) {
      if (!a.partner_profile_id) continue;
      const b = byId[a.partner_profile_id];
      if (!b) continue;
      const key = [a.id, b.id].sort().join('|');
      if (seenPair.has(key)) continue;
      seenPair.add(key);
      if (!hasAnswers(a) || !hasAnswers(b)) continue;
      // Keep the inviter as "A" for couple-level fields when we can tell, so
      // gender order and relationship fields stay stable across runs.
      const [pa, pb] = ((a.invite_code && !a.joined_via_invite) || !b.invite_code) ? [a, b] : [b, a];
      pairedIds.add(pa.id); pairedIds.add(pb.id);
      const ra = profileToRecord(pa, pb.ex1_answers), rb = profileToRecord(pb, pa.ex1_answers);
      couples.push({
        aType: ra.type, bType: rb.type,
        coupleType: [ra.type, rb.type].sort().join(''),
        aScores: ra.scores, bScores: rb.scores,
        relLength: pa.relationship_length || pb.relationship_length || null,
        relStatus: pa.relationship_status || pb.relationship_status || null,
        genders: [pa.gender || null, pb.gender || null],
      });
    }

    // Data quality (computed from raw profiles, before anonymizing).
    const allDims = Object.keys(DIM_KEYS);
    let complete = 0;
    for (const p of withAnswers) {
      const s = calcDimScores(p.ex1_answers);
      if (allDims.every(d => s[d] != null)) complete++;
    }
    const dataQuality = {
      totalProfiles: profiles.length,
      withAnswers: withAnswers.length,
      complete,
      partial: withAnswers.length - complete,
      unpaired: withAnswers.filter(p => !pairedIds.has(p.id)).length,
    };

    return json({
      config: AXIS_CONFIG,
      dims: DIMS,
      generatedAt: new Date().toISOString(),
      summary: summarize(individuals, couples),
      dataQuality,
      individuals,
      couples,
    });
  } catch (e) {
    return json({ error: 'Typing query failed: ' + (e.message || e) }, 500);
  }
}

// Authoritative default-weight aggregates (the dashboard re-derives these
// client-side when a demographic filter or sandbox weight is applied).
export function summarize(individuals, couples) {
  const indivTypes = Object.fromEntries(TYPES.map(t => [t, 0]));
  let lowConf = 0, engage = 0, open = 0;
  // Axis-score histograms in 0.25-wide bins from 1 to 5.
  const bins = [];
  for (let x = 1; x < 5; x += 0.25) bins.push(+x.toFixed(2));
  const wHist = bins.map(() => 0), oHist = bins.map(() => 0);
  const binIdx = (v) => Math.min(bins.length - 1, Math.max(0, Math.floor((v - 1) / 0.25)));

  // Per-dimension: mean score + "outlier rate" (share whose single-dimension
  // classification on its own axis disagrees with their overall axis reading).
  const dimSum = Object.fromEntries(DIMS.map(d => [d, 0]));
  const dimN   = Object.fromEntries(DIMS.map(d => [d, 0]));
  const dimOut = Object.fromEntries(DIMS.map(d => [d, 0]));

  for (const r of individuals) {
    indivTypes[r.type]++;
    if (r.lowConf) lowConf++;
    if (r.w <= 3.0) engage++;
    if (r.o >= 3.0) open++;
    wHist[binIdx(r.w)]++;
    oHist[binIdx(r.o)]++;
    const overallEngage = r.w <= 3.0, overallOpen = r.o >= 3.0;
    for (const d of DIMS) {
      const v = r.scores[d];
      if (v == null) continue;
      dimSum[d] += v; dimN[d]++;
      const cfg = AXIS_CONFIG[d];
      // Single-dimension reading on its own axis, spectrum-oriented.
      const oriented = cfg.invert ? (6 - v) : v;
      if (cfg.axis === 'withdraw') { if ((oriented <= 3.0) !== overallEngage) dimOut[d]++; }
      else                         { if ((oriented >= 3.0) !== overallOpen)   dimOut[d]++; }
    }
  }

  const coupleTypes = Object.fromEntries(COUPLE_TYPES.map(t => [t, 0]));
  for (const c of couples) coupleTypes[c.coupleType] = (coupleTypes[c.coupleType] || 0) + 1;
  const maxCoupleShare = couples.length
    ? +(100 * Math.max(...Object.values(coupleTypes)) / couples.length).toFixed(1) : 0;

  return {
    nIndividuals: individuals.length,
    nCouples: couples.length,
    lowConfidence: lowConf,
    lowConfidencePct: individuals.length ? +(100 * lowConf / individuals.length).toFixed(1) : 0,
    individualTypes: indivTypes,
    engagePct: individuals.length ? +(100 * engage / individuals.length).toFixed(1) : 0,
    openPct: individuals.length ? +(100 * open / individuals.length).toFixed(1) : 0,
    coupleTypes,
    maxCoupleShare,
    histogramBins: bins,
    withdrawHist: wHist,
    openHist: oHist,
    perDimension: DIMS.map(d => ({
      dim: d,
      mean: dimN[d] ? +(dimSum[d] / dimN[d]).toFixed(2) : null,
      n: dimN[d],
      outlierPct: dimN[d] ? +(100 * dimOut[d] / dimN[d]).toFixed(1) : 0,
    })),
  };
}
