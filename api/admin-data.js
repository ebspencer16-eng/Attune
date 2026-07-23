/**
 * /api/admin-data
 *
 * GET ?secret=ADMIN_SECRET
 *
 * One service-role payload for every admin dashboard loader. The admin page
 * previously read orders/profiles/lmft_requests/feedback_submissions straight
 * from PostgREST with the anon key; migration 010 (correctly) locked anon out
 * of those tables, which silently broke every real-data section. Migration
 * 010's comments call for exactly this pattern: admin reads via service role
 * behind the ADMIN_SECRET gate.
 *
 * Returns:
 * {
 *   ok: true,
 *   orders:               [ full order rows, newest first, limit 1000 ],
 *   beta_codes:           [ full rows ],
 *   lmft_requests:        [ full rows, newest first, limit 200 ],
 *   feedback_submissions: [ full rows, newest first, limit 2000 ],
 *   profiles: {
 *     demographics:        [ {age_range, gender, relationship_status,
 *                             relationship_length, children, signup_source} ],
 *     started:             count with ex1 or ex2 answers,
 *     both_done_individuals: count with ex1+ex2 answers and a linked partner,
 *     invited_total:       count with an invite_code,
 *     completed_couples:   partner_sessions with ex1+ex2 answers
 *   }
 * }
 */

export const config = { runtime: 'edge' };

import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth } from './_lib/admin-auth.js';
import { RESPONSIBILITY_CATEGORIES, LIFE_QUESTIONS } from './_questions.js';
import { axisScores, typeCodeFromAxes } from './_type-engine.js';

// ── Response aggregates ──────────────────────────────────────────────────────
// The Responses page charts used to be hardcoded zero arrays: the raw answers
// were fetched here purely to count them, then discarded. These helpers turn
// them into aggregates. Raw answers never leave the server, which keeps the
// "anonymized, UUID only" guarantee on the dashboard intact.

// Mirrors calcDimScores in src/App.jsx. lv5's a/b display order is reversed
// relative to its dimension orientation, so its raw value is flipped.
const DIM_ITEMS = {
  energy:     ['en4','en6'],
  expression: ['ex6','ex7','ex8','ex9','ex10'],
  love:       ['lv1','lv2','lv5'],
  bids:       ['bd1','bd3','bd4'],
  needs:      ['nd1','nd5'],
  conflict:   ['cf1','cf2'],
  stress:     ['st1'],
  repair:     ['rp2','rp3','rp6'],
  feedback:   ['fb5'],
  listening:  ['ls1'],
};
const FLIPPED = new Set(['lv5']);

function calcDimScores(answers) {
  if (!answers || typeof answers !== 'object') return null;
  const out = {};
  let answeredAny = false;
  for (const [dim, keys] of Object.entries(DIM_ITEMS)) {
    const vals = keys.map(k => {
      const raw = answers[k];
      if (raw == null || isNaN(raw)) return null;
      return FLIPPED.has(k) ? (6 - Number(raw)) : Number(raw);
    }).filter(v => v != null);
    if (vals.length) answeredAny = true;
    out[dim] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }
  return answeredAny ? out : null;
}

// Alignment = how close two partners sit on a 1-5 dimension, as a percentage.
// A 0 gap is 100%, the maximum 4-point gap is 0%.
const alignPct = (a, b) => Math.round((1 - Math.abs(a - b) / 4) * 100);

function buildResponseAggregates(profiles, sessions) {
  // Extended-family items and the two involvement life questions are person-
  // relative: a partner's answer about "my family" is stored under their
  // {partnerName} key, so mirror the placeholders when reading partner b.
  const mirrorRespKey = (key) => (!key || (key.indexOf('{userName}') < 0 && key.indexOf('{partnerName}') < 0)) ? key
    : String(key).replace(/\{userName\}/g, '\u0001').replace(/\{partnerName\}/g, '{userName}').replace(/\u0001/g, '{partnerName}');
  const mirrorLifeId = (id) => id === 'lq_involve_user' ? 'lq_involve_partner' : id === 'lq_involve_partner' ? 'lq_involve_user' : id;
  const famLabel = (t) => String(t || '')
    .replace(/\{userName\}'s family/g, "one's own family")
    .replace(/\{partnerName\}'s family/g, "other partner's family")
    .replace(/\{userName\}'s/g, "one's own")
    .replace(/\{partnerName\}'s/g, "the other partner's")
    .replace(/\{userName\}/g, 'one')
    .replace(/\{partnerName\}/g, 'the partner');
  // Pair each profile with its partner. partner_sessions rows are keyed by
  // invite_code, which is how an invited partner's answers are stored.
  const byInvite = new Map();
  (sessions || []).forEach(s => { if (s.invite_code) byInvite.set(s.invite_code, s); });
  const byId = new Map();
  (profiles || []).forEach(p => byId.set(p.id, p));

  const seen = new Set();
  const pairs = [];
  (profiles || []).forEach(p => {
    if (seen.has(p.id)) return;
    let partner = null;
    if (p.partner_profile_id && byId.has(p.partner_profile_id)) partner = byId.get(p.partner_profile_id);
    else if (p.invite_code && byInvite.has(p.invite_code)) partner = byInvite.get(p.invite_code);
    if (!partner) return;
    seen.add(p.id);
    if (partner.id) seen.add(partner.id);
    pairs.push([p, partner]);
  });

  // ── Communication: average alignment per dimension ──
  const dimKeys = Object.keys(DIM_ITEMS);
  const dimTotals = Object.fromEntries(dimKeys.map(d => [d, []]));
  pairs.forEach(([a, b]) => {
    const sa = calcDimScores(a.ex1_answers), sb = calcDimScores(b.ex1_answers);
    if (!sa || !sb) return;
    dimKeys.forEach(d => {
      if (sa[d] == null || sb[d] == null) return;
      dimTotals[d].push(alignPct(sa[d], sb[d]));
    });
  });
  const dimScores = dimKeys.map(d => {
    const v = dimTotals[d];
    return v.length ? Math.round(v.reduce((x, y) => x + y, 0) / v.length) : 0;
  });

  // ── Expectations: percent of items both partners answered identically ──
  const catAgree = {}, catTotal = {};
  RESPONSIBILITY_CATEGORIES.forEach(c => { catAgree[c.id] = 0; catTotal[c.id] = 0; });
  pairs.forEach(([a, b]) => {
    const ra = a.ex2_answers?.responsibilities, rb = b.ex2_answers?.responsibilities;
    if (!ra || !rb) return;
    RESPONSIBILITY_CATEGORIES.forEach(cat => {
      cat.items.forEach(item => {
        const k = cat.id + '__' + item;
        const bv = rb[mirrorRespKey(k)];
        if (ra[k] == null || bv == null) return;
        catTotal[cat.id]++;
        if (ra[k] === bv) catAgree[cat.id]++;
      });
    });
  });
  let expAlign = RESPONSIBILITY_CATEGORIES.map(c =>
    catTotal[c.id] ? Math.round(100 * catAgree[c.id] / catTotal[c.id]) : 0);

  // ── Per-question couple agreement (directional "who does X" items) ──────────
  // Two answers AGREE when they point to the SAME person: one "Me" + one
  // "Partner" is agreement (both name the same person), which plain string
  // equality misses. Resolve each answer perspective-aware to a couple side
  // (A/B) using names. A session partner (b) has no name columns, so derive them
  // from a (a.partner_name is b's name).
  const resolveSide = (v, selfName, partnerName, selfTok, partnerTok) => {
    if (v == null || v === '') return null;
    if (v === 'Both of us' || v === 'Balanced') return 'both';
    if (v === "Doesn't apply to us" || v === "Doesn't apply") return 'na';
    if (v === 'Primarily mine' || (selfName && v === selfName)) return selfTok;
    if (v === "Primarily my partner's" || (partnerName && v === partnerName)) return partnerTok;
    return null;
  };
  const raCount = {}, raTotal = {};
  RESPONSIBILITY_CATEGORIES.forEach(c => c.items.forEach(item => { const k = c.id + '__' + item; raCount[k] = 0; raTotal[k] = 0; }));
  pairs.forEach(([a, b]) => {
    const ra = a.ex2_answers?.responsibilities, rb = b.ex2_answers?.responsibilities;
    if (!ra || !rb) return;
    const aName = (a.name || '').trim(), aPartner = (a.partner_name || '').trim();
    const bName = (b.name || '').trim() || aPartner, bPartner = (b.partner_name || '').trim() || aName;
    RESPONSIBILITY_CATEGORIES.forEach(cat => cat.items.forEach(item => {
      const key = cat.id + '__' + item;
      const ares = resolveSide(ra[key], aName, aPartner, 'A', 'B');
      const bres = resolveSide(rb[mirrorRespKey(key)], bName, bPartner, 'B', 'A');
      if (ares == null || bres == null || ares === 'na' || bres === 'na') return;
      raTotal[key]++;
      if (ares === bres) raCount[key]++;
    }));
  });
  const respAgreement = [];
  RESPONSIBILITY_CATEGORIES.forEach(c => c.items.forEach(item => {
    const key = c.id + '__' + item;
    if (raTotal[key] > 0) respAgreement.push({ category: c.label, label: famLabel(item), pct: Math.round(100 * raCount[key] / raTotal[key]), n: raTotal[key] });
  }));
  // Category radar uses the same perspective-aware agreement (naive string
  // equality undercounts complementary "Me"/"Partner" answers).
  expAlign = RESPONSIBILITY_CATEGORIES.map(c => {
    let ac = 0, tt = 0;
    c.items.forEach(item => { const k = c.id + '__' + item; ac += raCount[k]; tt += raTotal[k]; });
    return tt ? Math.round(100 * ac / tt) : 0;
  });

  // ── Life & Values: % of couples whose answers differ, per life question ──
  // Life answers are stored as plain option strings under ex2_answers.life, so
  // no name resolution is needed (unlike the responsibility items).
  const lifeAgree = {}, lifeTotal = {};
  LIFE_QUESTIONS.forEach(q => { lifeAgree[q.id] = 0; lifeTotal[q.id] = 0; });
  pairs.forEach(([a, b]) => {
    const la = a.ex2_answers?.life, lb = b.ex2_answers?.life;
    if (!la || !lb) return;
    LIFE_QUESTIONS.forEach(q => {
      const va = la[q.id], vb = lb[mirrorLifeId(q.id)];
      if (va == null || va === '' || vb == null || vb === '') return;
      lifeTotal[q.id]++;
      if (va === vb) lifeAgree[q.id]++;
    });
  });
  const lifeGaps = LIFE_QUESTIONS
    // Neutral, name-free phrasing for the family questions (and any other
    // {userName}/{partnerName} templates) so the overview reads clearly.
    .map(q => ({ label: famLabel(q.topic || q.text), pct: lifeTotal[q.id] ? Math.round(100 * (lifeTotal[q.id] - lifeAgree[q.id]) / lifeTotal[q.id]) : 0, n: lifeTotal[q.id] }))
    .filter(g => g.n > 0)
    .sort((x, y) => y.pct - x.pct);

  // ── Relationship feel: distribution of the reflection a0 answer (index 0-4) ──
  const feel = [0, 0, 0, 0, 0];
  (profiles || []).forEach(p => {
    const v = p.ex3_answers?.a0;
    if (Number.isInteger(v) && v >= 0 && v <= 4) feel[v]++;
  });

  return {
    dimLabels: dimKeys,
    dimScores,
    expLabels: RESPONSIBILITY_CATEGORIES.map(c => c.label),
    expAlign,
    relationshipFeel: feel,
    lifeGaps,
    respAgreement,
    pairs: pairs.length,
  };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

export default async function handler(req) {
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const url = new URL(req.url);
  const _auth = checkAdminAuth(req);
  if (!_auth.ok) return json({ error: _auth.error }, _auth.status);

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_ROLE;
  if (!SUPABASE_URL || !SUPABASE_KEY) return json({ error: 'Supabase env vars missing' }, 500);
  const admin = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const [ordersQ, codesQ, lmftQ, fbQ, profQ, psQ] = await Promise.all([
      admin.from('orders').select('*').order('created_at', { ascending: false }).limit(1000),
      admin.from('beta_codes').select('*').order('code', { ascending: true }),
      admin.from('lmft_requests').select('*').order('created_at', { ascending: false }).limit(200),
      admin.from('feedback_submissions').select('*').order('submitted_at', { ascending: false }).limit(2000),
      admin.from('profiles').select('id, partner_profile_id, invite_code, name, partner_name, age_range, gender, pronouns, partner_pronouns, relationship_status, relationship_length, children, signup_source, ex1_answers, ex2_answers, ex3_answers'),
      admin.from('partner_sessions').select('invite_code, ex1_answers, ex2_answers'),
    ]);

    const firstErr = [ordersQ, codesQ, lmftQ, fbQ, profQ, psQ].find(q => q.error);
    if (firstErr) return json({ error: firstErr.error.message }, 500);

    const profiles = profQ.data || [];

    // Relationship-level demographics (status, length, children) describe the
    // couple, not the individual. If one partner answered and the other left it
    // blank, share the answer across both linked profiles so couple-level facts
    // aren't undercounted. Individual fields (age, gender/pronouns) stay per-person.
    const byId = {};
    profiles.forEach(p => { byId[p.id] = p; });
    const sharedFields = ['relationship_status', 'relationship_length', 'children'];
    profiles.forEach(p => {
      const partner = p.partner_profile_id ? byId[p.partner_profile_id] : null;
      if (!partner) return;
      sharedFields.forEach(f => { if (!p[f] && partner[f]) p[f] = partner[f]; });
      // Each partner records the other's pronouns. If someone never set their
      // own, recover it from what their partner recorded for them.
      if (!p.pronouns && partner.partner_pronouns) p.pronouns = partner.partner_pronouns;
    });

    const hasAnswers = v => v && typeof v === 'object' && Object.keys(v).length > 0;
    const started = profiles.filter(p => hasAnswers(p.ex1_answers) || hasAnswers(p.ex2_answers)).length;
    const bothDoneIndividuals = profiles.filter(p => hasAnswers(p.ex1_answers) && hasAnswers(p.ex2_answers) && p.partner_profile_id).length;
    const invitedTotal = profiles.filter(p => p.invite_code).length;
    const completedCouples = (psQ.data || []).filter(s => hasAnswers(s.ex1_answers) && hasAnswers(s.ex2_answers)).length;

    const responses = buildResponseAggregates(profiles, psQ.data || []);
    // Precompute the same aggregates for each couple-level segment value, reusing
    // the exact formulas on a filtered profile set. Only couple-level fields
    // (shared by both partners) are sliced — individual fields like gender/age
    // don't have a single value for a couple, so slicing couple metrics by them
    // would be ambiguous.
    // Annotate each profile with its couple type (sorted pair of both partners'
    // individual types) so the aggregates can be sliced by couple type. Uses the
    // same type engine as the cube so values match the slicer's dropdown.
    const _typeOf = (ans) => {
      const sc = calcDimScores(ans);
      if (!sc || !Object.keys(sc).length) return null;
      const { withdrawScore, openScore } = axisScores(sc);
      return typeCodeFromAxes(withdrawScore, openScore);
    };
    {
      const byIdT = {}; profiles.forEach(p => { byIdT[p.id] = p; });
      const byInviteT = new Map(); (psQ.data || []).forEach(s => { if (s.invite_code) byInviteT.set(s.invite_code, s); });
      profiles.forEach(p => {
        const myType = _typeOf(p.ex1_answers);
        if (!myType) return;
        const partner = (p.partner_profile_id && byIdT[p.partner_profile_id]) || (p.invite_code && byInviteT.get(p.invite_code)) || null;
        const partnerType = partner ? _typeOf(partner.ex1_answers) : null;
        if (myType && partnerType) p.couple_type = [myType, partnerType].sort().join('');
      });
    }
    const COUPLE_SEG = ['relationship_status', 'relationship_length', 'children', 'couple_type'];
    const responsesBySegment = { '': responses };
    for (const fld of COUPLE_SEG) {
      const vals = [...new Set(profiles.map(p => p[fld]).filter(v => v != null && v !== ''))];
      for (const v of vals) {
        responsesBySegment[fld + '::' + v] = buildResponseAggregates(profiles.filter(p => p[fld] === v), psQ.data || []);
      }
    }

    return json({
      ok: true,
      responses,
      responsesBySegment,
      orders: ordersQ.data || [],
      beta_codes: codesQ.data || [],
      lmft_requests: lmftQ.data || [],
      feedback_submissions: fbQ.data || [],
      profiles: {
        demographics: profiles.map(p => ({
          age_range: p.age_range, gender: p.gender, pronouns: p.pronouns,
          relationship_status: p.relationship_status,
          relationship_length: p.relationship_length,
          children: p.children, signup_source: p.signup_source,
        })),
        started,
        both_done_individuals: bothDoneIndividuals,
        invited_total: invitedTotal,
        completed_couples: completedCouples,
      },
    });
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
}
