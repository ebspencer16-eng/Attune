/**
 * /api/admin-data
 *
 * GET ?secret=ADMIN_SECRET
 *
 * One service-role payload for every admin dashboard loader. The admin page
 * previously read orders/profiles straight
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
 *   profiles: {
 *     demographics:        [ {age_range, pronouns, relationship_status,
 *                             relationship_length, children, signup_source} ],
 *     started:             count with ex1 or ex2 answers,
 *     both_done_individuals: count with ex1+ex2 answers and a linked partner,
 *     invited_total:       count with an invite_code,
 *     completed_couples:   partner_sessions with ex1+ex2 answers
 *   }
 * }
 */

/**
 * ── AND WHERE IT RUNS ─────────────────────────────────────────────────────
 * Pinned next to the database. An edge function runs near whoever is asking,
 * which is the wrong default when every answer comes from one database
 * somewhere else: a request that landed in San Francisco spent two crossings
 * of the country on a lookup by id. See api/_lib/db-region.js for the
 * measurement, and check-edge-region.mjs, which holds every one of these to
 * the one constant that says where.
 */
export const config = { runtime: 'edge', regions: ['iad1'] };

import { corsHeaders, safeError } from './_lib/http.js';
import { demoOwners, ownedBy, selectProfiles, withoutDemoOrders } from './_lib/demo-accounts.js';

import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth } from './_lib/admin-auth.js';
import { pronounLabel } from './_lib/pronouns.js';
import { RESPONSIBILITY_CATEGORIES, LIFE_QUESTIONS, guardiansOf } from './_questions.js';
import { axisScores, typeCodeFromAxes, blendedDimScores, calcDimScores as engineDimScores, DIM_KEYS } from './_type-engine.js';
import { personResults, readAccuracy, ALIGNMENT_THRESHOLD, readBandFor, understandingBandFor } from './_lib/results.js';
import { COMPILED_BETA_CODES } from './_lib/beta-codes.js';
import { mirrorRespKey, mirrorLifeId, respDistance, lifeDistance } from './_lib/expectations.js';
import { ALIGNMENT_BANDS } from './_lib/alignment.js';
import { readInheritance } from './_lib/inherited-roles.js';
import { REFLECTION_CODES, tallyCodes } from './_lib/reflection-codes.js';
import { ANNIVERSARY_QUESTIONS } from './_anniversary-questions.js';

// ── Response aggregates ──────────────────────────────────────────────────────
// The Responses page charts used to be hardcoded zero arrays: the raw answers
// were fetched here purely to count them, then discarded. These helpers turn
// them into aggregates. Raw answers never leave the server, which keeps the
// "anonymized, UUID only" guarantee on the dashboard intact.

/**
 * ── THE ADMIN SCORES WITH THE ENGINE, NOT WITH ITS OWN ARITHMETIC ─────────
 * This file used to carry its own `calcDimScores`, its own `DIM_ITEMS` and its
 * own `FLIPPED`, under a comment saying it mirrored src/App.jsx. It did not
 * mirror anything. It differed from api/_type-engine.js in two ways:
 *
 *   it took a plain average, where the engine takes a WEIGHTED one, and every
 *   one of the ten dimensions has non-uniform weights;
 *
 *   its FLIPPED was `new Set()`, empty, under a comment reading "st1 is the
 *   only flipped question, and it is handled by the shared scorer rather than
 *   here" — which was true of a shared scorer this file was not calling.
 *
 * So a reverse-worded question was counted forwards. Measured over four hundred
 * answer sets, the two disagreed by as much as 1.25 of a point on a 1-5 scale:
 * the product telling a couple 1.75 on Conflict while the admin charted 3.00
 * for the same answers. A couple answering 4 to everything is 3.40 and 4.00.
 *
 * CLAUDE.md lists api/_type-engine.js as the single source for dimensions,
 * weights and scoring, and says why: two scorers drifting apart is how this
 * product starts lying to people. These were already apart.
 *
 * The engine returns `{}` for a missing answer set where this returned null,
 * and every caller here tests the result for falsiness, so the null is kept at
 * this boundary rather than changed in the engine for one consumer.
 */
const DIM_ITEMS = DIM_KEYS;

function calcDimScores(answers) {
  if (!answers || typeof answers !== 'object') return null;
  const out = engineDimScores(answers);
  return Object.values(out).some((v) => v != null) ? out : null;
}

// Alignment = how close two partners sit on a 1-5 dimension, as a percentage.
// A 0 gap is 100%, the maximum 4-point gap is 0%.
const alignPct = (a, b) => Math.round((1 - Math.abs(a - b) / 4) * 100);

function buildResponseAggregates(profiles, sessions) {
  // Extended-family items and the two involvement life questions are person-
  // relative: a partner's answer about "my family" is stored under their
  // {partnerName} key, so mirror the placeholders when reading partner b.
  /* ── MIRRORING LIVES IN ONE PLACE ──────────────────────────────────────
     These were local copies of `mirrorRespKey` and `mirrorLifeId` from
     api/_lib/expectations.js, which every other caller imports. Checked over
     all twenty responsibility keys before removing them: the two agreed, so
     this is not the cause of anything, and that is exactly when a second copy
     is worth deleting. Waiting until they disagree means finding out from a
     chart. */
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
  /**
   * How many couples could be counted at all.
   *
   * Ellie: "Who does what agreement by question chart is empty so I don't know
   * if I have changes."
   *
   * An empty chart cannot say whether the measure is broken or whether nobody
   * has finished the exercise, and those need different responses from her.
   * This is the denominator: couples where BOTH partners answered at least one
   * responsibility. Sent so the tile can say which of the two it is.
   */
  /**
   * One pair of distances per couple: life questions, and responsibilities.
   *
   * ── WHY PER COUPLE ────────────────────────────────────────────────────
   * Ellie: "Start with overview tile with 4 tiles: Avg life and values
   * alignment, Avg responsibilities alignment, Avg degree of misalignment for
   * misaligned couples, Avg degree of misalignment for aligned couples."
   *
   * The last two split couples by where they fall against the alignment
   * threshold and then average inside each group, which cannot be done from a
   * per-question average: you need each couple's own figure before you can
   * decide which side of the line it is on.
   *
   * ── NOTHING IDENTIFYING ───────────────────────────────────────────────
   * Two numbers per couple and no key of any kind, which is the same shape
   * `expGaps` already sends. A couple cannot be picked out of a list of
   * distances.
   *
   * ── THE DISTANCE IS NOT DECIDED HERE ──────────────────────────────────
   * `respDistance` and `lifeDistance` come from api/_lib/expectations.js,
   * which is what the results rows, the workbook and the domain roll-up all
   * call. A second opinion about how far apart two answers are is the bug this
   * codebase keeps having.
   */
  const expCoupleDistances = [];
  pairs.forEach(([a, b]) => {
    const ea = a.ex2_answers, eb = b.ex2_answers;
    if (!ea || !eb) return;
    const aName = (a.name || '').trim(), aPartner = (a.partner_name || '').trim();
    const bName = (b.name || '').trim() || aPartner;
    const respD = [], lifeD = [];
    RESPONSIBILITY_CATEGORIES.forEach((cat) => (cat.items || []).forEach((item) => {
      const key = cat.id + '__' + item;
      const mirrored = mirrorRespKey(key);
      const d = respDistance({
        yourValue: ea.responsibilities?.[key],
        theirValue: eb.responsibilities?.[mirrored],
        yourDetail: ea.bothDetail?.[key],
        theirDetail: eb.bothDetail?.[mirrored],
        youName: aName, themName: bName,
      });
      if (d != null) respD.push(d);
    }));
    LIFE_QUESTIONS.forEach((q) => {
      const d = lifeDistance(ea.life?.[q.id], eb.life?.[mirrorLifeId(q.id)], q);
      if (d != null) lifeD.push(d);
    });
    /* A couple who answered nothing comparable contributes nothing, rather
       than contributing a zero that would read as perfect agreement. */
    if (!respD.length && !lifeD.length) return;
    const mean = (arr) => arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : null;
    expCoupleDistances.push({
      life: lifeD.length ? Number(mean(lifeD).toFixed(4)) : null,
      resp: respD.length ? Number(mean(respD).toFixed(4)) : null,
    });
  });

  /**
   * Expected against experienced, read two ways, over individuals.
   *
   * Per person rather than per couple: it is about what one person saw growing
   * up and what they now expect, and their partner's childhood is a different
   * question with a different answer.
   *
   * Counts only. Nothing here identifies anybody, and no gender is stored: the
   * inference happens at read time for a tally and is thrown away.
   */
  const inheritance = { shape: { same: 0, sharedToOne: 0, oneToShared: 0, other: 0, unknown: 0 },
    gendered: { keepsSameGenderRole: 0, handsOffSameGenderRole: 0, takesOnOtherGenderRole: 0, handsOffOtherGenderRole: 0, unknown: 0 },
    people: 0 };
  {
    const items = RESPONSIBILITY_CATEGORIES.flatMap((c) => (c.items || []).map((item) => ({ key: c.id + '__' + item })));
    for (const p of profiles || []) {
      const ans = p.ex2_answers;
      if (!ans || !ans.responsibilities) continue;
      const adults = guardiansOf(ans);
      const r = readInheritance(ans, p, items, adults);
      inheritance.people++;
      for (const k of Object.keys(inheritance.shape)) inheritance.shape[k] += r.shape[k];
      for (const k of Object.keys(inheritance.gendered)) inheritance.gendered[k] += r.gendered[k];
    }
  }

  /**
   * The written reflection answers, coded.
   *
   * Ellie asked for "a postcoded column chart showing moments that matter" and
   * one "for all text-entry questions to show what evokes pride", then handed
   * me the frame: "You build the code frame, I will adjust if needed." It is
   * api/_lib/reflection-codes.js, one file so that moving it is one edit.
   *
   * ── COUNTS, NEVER WORDS ───────────────────────────────────────────────
   * Nothing anybody wrote leaves this function. The answer goes in, a list of
   * theme ids comes back, and only the tally is sent. The admin's banner says
   * it holds no individual responses, and these are the most personal answers
   * in the product: "the moment I felt most proud of us".
   *
   * `uncoded` is sent with every tally and is not a failure. An answer the
   * frame has no theme for is how the frame gets better, and a chart that
   * shows percentages of only the coded half is a chart about its own
   * vocabulary.
   */
  const reflectionCodes = { questions: [], frame: REFLECTION_CODES.map((c) => ({ id: c.id, label: c.label })) };
  {
    const textQuestions = ANNIVERSARY_QUESTIONS.filter((q) => q.type === 'text');
    for (const q of textQuestions) {
      const answers = (profiles || []).map((p) => p.ex3_answers?.[q.id]).filter((v) => typeof v === 'string' && v.trim());
      const tally = tallyCodes(answers);
      reflectionCodes.questions.push({
        id: q.id,
        /* The question as asked, which is copy and not an answer. */
        label: q.text,
        category: q.category || null,
        ...tally,
      });
    }
  }

  const respPairs = pairs.filter(([a, b]) =>
    a.ex2_answers?.responsibilities && b.ex2_answers?.responsibilities).length;
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

  // ── Headline rates for the overview: how many couples are misaligned, and
  //    how many misunderstand each other. Computed over complete pairs only.
  const GAP = ALIGNMENT_THRESHOLD.gap, CUTOFF = ALIGNMENT_THRESHOLD.dims;
  let misalignedPairs = 0, misunderstoodPairs = 0, ratedPairs = 0, understoodRated = 0;
  // Distribution, so the cutoff can be chosen from the data rather than
  // guessed. gapHist[n] is how many couples have exactly n dimensions at or
  // above GAP; gapGrid[g][n] does the same across candidate gap sizes, which
  // is what shows whether a threshold separates anything or just labels
  // everyone.
  const gapHist = new Array(11).fill(0);
  const GAP_CANDIDATES = [0.75, 1.0, 1.25, 1.5, 2.0];
  const gapGrid = Object.fromEntries(GAP_CANDIDATES.map(g => [g, new Array(11).fill(0)]));
  const allGaps = [];
  pairs.forEach(([a, b]) => {
    const sa = calcDimScores(a.ex1_answers), sb = calcDimScores(b.ex1_answers);
    if (!sa || !sb) return;
    let wide = 0, scored = 0;
    for (const d of dimKeys) {
      if (sa[d] == null || sb[d] == null) continue;
      scored++;
      if (Math.abs(sa[d] - sb[d]) >= GAP) wide++;
    }
    if (!scored) return;
    ratedPairs++;
    gapHist[Math.min(wide, 10)]++;
    // Per-dimension gaps for this couple, so the grid can be built at every
    // candidate threshold in one pass.
    const perDim = [];
    for (const d of dimKeys) {
      if (sa[d] == null || sb[d] == null) continue;
      const g = Math.abs(sa[d] - sb[d]);
      perDim.push(g);
      allGaps.push(g);
    }
    for (const g of GAP_CANDIDATES) {
      gapGrid[g][Math.min(perDim.filter(x => x >= g).length, 10)]++;
    }
    if (wide >= CUTOFF) misalignedPairs++;
    const mine = readAccuracy(a.ex1_answers, b.ex1_answers);
    const theirs = readAccuracy(b.ex1_answers, a.ex1_answers);
    if (mine && theirs) {
      let misread = 0;
      for (const d of Object.keys(mine.dimensions || {})) {
        const x = mine.dimensions[d], y = theirs.dimensions[d];
        if (!x || !y) continue;
        if (x.error >= GAP || y.error >= GAP) misread++;
      }
      // Understanding has its own denominator. It needs Part 2 answers, which
      // only the couples who took the two-part exercise have. Counting the
      // older self-report-only couples as 'in tune' would be wrong: we do not
      // know how they read each other, and treating unknown as good inflates
      // the number in the flattering direction.
      understoodRated++;
      if (misread >= CUTOFF) misunderstoodPairs++;
    }
  });

  return {
    // Rates, with the denominator, so a small n is visible rather than a
    // percentage standing on two couples.
    regrouped: {
      ratedPairs,
      misalignedPairs,
      misunderstoodPairs,
      understoodRated,
      // How many couples land on each side at every candidate threshold. A
      // threshold that puts 6 of 7 couples on one side is not measuring
      // anything; this is what makes that visible.
      gapHist,
      gapGrid,
      gapStats: allGaps.length ? {
        n: allGaps.length,
        mean: Math.round((allGaps.reduce((a, b) => a + b, 0) / allGaps.length) * 100) / 100,
        median: Math.round(allGaps.slice().sort((a, b) => a - b)[Math.floor(allGaps.length / 2)] * 100) / 100,
        p75: Math.round(allGaps.slice().sort((a, b) => a - b)[Math.floor(allGaps.length * 0.75)] * 100) / 100,
        max: Math.round(Math.max(...allGaps) * 100) / 100,
      } : null,
      misalignedPct: ratedPairs ? Math.round((misalignedPairs / ratedPairs) * 100) : 0,
      // Denominator is couples with partner-view answers, not all couples.
      misunderstoodPct: understoodRated ? Math.round((misunderstoodPairs / understoodRated) * 100) : 0,
      threshold: { gap: GAP, dims: CUTOFF },
    },
    dimLabels: dimKeys,
    dimScores,
    expLabels: RESPONSIBILITY_CATEGORIES.map(c => c.label),
    expAlign,
    relationshipFeel: feel,
    lifeGaps,
    respAgreement,
    respPairs,
    expCoupleDistances,
    inheritance,
    reflectionCodes,
    /* The line between aligned and not, from api/_lib/alignment.js, which is
       the only thing allowed to turn a distance into a judgement. Sent rather
       than typed into the admin, because a threshold written in two places is
       two answers to "are these two people aligned". */
    alignedBand: ALIGNMENT_BANDS.aligned,
    pairs: pairs.length,
  };
}

// No Access-Control-Allow-Origin.
//
// This answered `*`. The admin page fetches it with a relative URL from the
// same origin, so CORS never applied to the only caller it has; the wildcard
// was permission granted to the whole internet for nothing in return.
// Emitting no header is stricter than an allowlist: a cross-origin read is
// refused by the browser outright. corsHeaders takes a request when an
// endpoint genuinely needs to answer another origin.
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: corsHeaders(),
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
    const [ordersQ, codesQ, profQ, psQ] = await Promise.all([
      admin.from('orders').select('*').order('created_at', { ascending: false }).limit(1000),
      admin.from('beta_codes').select('*').order('code', { ascending: true }),
      selectProfiles(admin, (q) => q.select('id, partner_profile_id, invite_code, name, partner_name, age_range, pronouns, partner_pronouns, relationship_status, relationship_length, children, signup_source, ex1_answers, ex2_answers, ex3_answers, intimacy_data, conflict_data')),
      /* Legacy. Nothing has written a row to partner_sessions since the
         invited partner got a profile of their own, so this comes back empty;
         it is kept only as a fallback for any couple whose rows predate that.
         See the note on completedCouples below for what it used to decide. */
      admin.from('partner_sessions').select('invite_code, ex1_answers, ex2_answers'),
    ]);

    const firstErr = [ordersQ, codesQ, profQ, psQ].find(q => q.error);
    if (firstErr) return json({ error: safeError('admin-data', firstErr.error, 'Could not load admin data.') }, 500);

    const profiles = profQ.data || [];
    const demoFilterApplied = profQ.demoFilterApplied !== false;

    /**
     * Rows of the other two tables, cut down to the same people.
     *
     * B61 filtered this profile read and left the orders whole, so a demo's
     * test order was in the order count and in revenue, and a demo's invited
     * partner was in completed_couples. An order carries a user_id when the
     * buyer had an account and only an email when they did not, so both are
     * asked for. Invite sessions are keyed by code, and the codes the figures
     * are about are the ones on these profiles.
     */
    const demo = await demoOwners(admin);
    const orders = withoutDemoOrders(ordersQ.data, demo);
    const inviteCodes = new Set(profiles.map((p) => p.invite_code).filter(Boolean));
    const sessions = ownedBy(psQ.data || [], inviteCodes, 'invite_code');

    // Relationship-level demographics (status, length, children) describe the
    // couple, not the individual. If one partner answered and the other left it
    // blank, share the answer across both linked profiles so couple-level facts
    // aren't undercounted. Individual fields (age, pronouns) stay per-person.
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
    /**
     * ── COUPLES WHO HAVE BOTH FINISHED ───────────────────────────────────
     * This counted rows in `partner_sessions`, which is where an invited
     * partner's answers used to go. They go on that partner's own profile
     * now, and nothing has written a row to that table since: every read of
     * it in this file is a leftover, and this figure was the one that had
     * nothing else to fall back on.
     *
     * So the Completion rate tile on the dashboard has read 0% for every
     * couple since the invited partner got an account of their own. Found by
     * listing every table this product reads and asking which of them
     * anything writes.
     *
     * Counted off the profiles, pairing on partner_profile_id and counting
     * each couple once, which is the same rule bothDoneIndividuals uses one
     * line up, applied to the pair rather than the person.
     */
    const bothDone = new Set(profiles
      .filter((p) => hasAnswers(p.ex1_answers) && hasAnswers(p.ex2_answers))
      .map((p) => p.id));
    const countedCouple = new Set();
    let completedCouples = 0;
    for (const p of profiles) {
      if (!p.partner_profile_id || countedCouple.has(p.id)) continue;
      if (bothDone.has(p.id) && bothDone.has(p.partner_profile_id)) {
        completedCouples += 1;
        countedCouple.add(p.id);
        countedCouple.add(p.partner_profile_id);
      }
    }

    const responses = buildResponseAggregates(profiles, sessions);
    // Precompute the same aggregates for each couple-level segment value, reusing
    // the exact formulas on a filtered profile set. Only couple-level fields
    // (shared by both partners) are sliced — individual fields like pronouns/age
    // don't have a single value for a couple, so slicing couple metrics by them
    // would be ambiguous.
    // Annotate each profile with its couple type (sorted pair of both partners'
    // individual types) so the aggregates can be sliced by couple type. Uses the
    // same type engine as the cube so values match the slicer's dropdown.
    // Type with the partner-view blend (same shared engine the app uses), so the
    // slicer's couple types match what couples see in their results.
    // Scoring via api/_lib/results.js, the one implementation.
    const _typeOf = (selfAns, partnerAns) => {
      if (!selfAns || !Object.keys(selfAns).length) return null;
      return personResults(selfAns, partnerAns).typeCode;
    };
    {
      const byIdT = {}; profiles.forEach(p => { byIdT[p.id] = p; });
      const byInviteT = new Map(); sessions.forEach(s => { if (s.invite_code) byInviteT.set(s.invite_code, s); });
      profiles.forEach(p => {
        const partner = (p.partner_profile_id && byIdT[p.partner_profile_id]) || (p.invite_code && byInviteT.get(p.invite_code)) || null;
        // Understanding: how accurately these two read each other, which is a
        // different question from how different they are. Attached to the
        // profile so the slicer can cut by it like any other segment.
        // ── Regrouped cuts: aligned vs misaligned, in tune vs misunderstood ──
        // Two different questions that are easy to conflate. ALIGNMENT is how
        // similar their positions are. UNDERSTANDING is how accurately each
        // reads the other. A couple can be far apart and read each other
        // perfectly, or nearly identical and misread each other badly.
        //
        // Threshold: a gap of 1.0+ on the 1-5 scale, in 3 or more of the 10
        // dimensions. Deliberately coarse and deliberately provisional. See
        // the note in the admin UI: this needs revisiting against a real
        // distribution rather than being treated as settled.
        const GAP_THRESHOLD = ALIGNMENT_THRESHOLD.gap;
        const DIM_COUNT_CUTOFF = ALIGNMENT_THRESHOLD.dims;
        if (partner?.ex1_answers && p.ex1_answers) {
          const mineScores = calcDimScores(p.ex1_answers);
          const theirScores = calcDimScores(partner.ex1_answers);
          let wideDims = 0, scored = 0;
          for (const d of Object.keys(DIM_ITEMS)) {
            const x = mineScores[d], y = theirScores[d];
            if (x == null || y == null) continue;
            scored++;
            if (Math.abs(x - y) >= GAP_THRESHOLD) wideDims++;
          }
          if (scored) {
            p.alignment_group = wideDims >= DIM_COUNT_CUTOFF ? 'Misaligned' : 'Aligned';
            p.wide_gap_dims = wideDims;
          }
        }
        if (partner?.ex1_answers && p.ex1_answers) {
          const mine = readAccuracy(p.ex1_answers, partner.ex1_answers);      // how well I read them
          const theirs = readAccuracy(partner.ex1_answers, p.ex1_answers);    // how well they read me
          if (mine && theirs) {
            const mean = (mine.meanError + theirs.meanError) / 2;
            /* The band from the module that defines it, not a second copy of
               its cut points. This read `mean < 0.5 ? ...` with its own
               labels while readAccuracy was already returning a band, which is
               the same shape as this file scoring with a plain average where
               the engine weights: a figure Ellie trusts, computed by a second
               rule. */
            p.understanding = understandingBandFor(mean).label;
            p.understanding_error = Number(mean.toFixed(2));
            // How well this person reads their partner, separately from the
            // couple average, so a lopsided pair is visible.
            p.reads_partner = readBandFor(mine.meanError).label;
            p.reads_partner_error = Number(mine.meanError.toFixed(2));
            p.understanding_lopsided = Math.abs(mine.meanError - theirs.meanError) >= 0.4 ? 'Lopsided' : 'Even';
            // Same shape as the alignment cut, applied to read error: how many
            // dimensions either partner has the other wrong about by 1.0+.
            let misreadDims = 0;
            for (const d of Object.keys(mine.dimensions || {})) {
              const a = mine.dimensions[d], b = theirs.dimensions[d];
              if (!a || !b) continue;
              if (a.error >= GAP_THRESHOLD || b.error >= GAP_THRESHOLD) misreadDims++;
            }
            p.understanding_group = misreadDims >= DIM_COUNT_CUTOFF ? 'Misunderstood' : 'In tune';
            p.wide_misread_dims = misreadDims;
            // The dimension this person has their partner most wrong about.
            p.worst_misread_dim = mine.worst?.[0]?.dim || null;
          }
        }
        const myType = _typeOf(p.ex1_answers, partner ? partner.ex1_answers : null);
        if (!myType) return;
        const partnerType = partner ? _typeOf(partner.ex1_answers, p.ex1_answers) : null;
        if (myType && partnerType) p.couple_type = [myType, partnerType].sort().join('');
      });
    }
    const COUPLE_SEG = ['relationship_status', 'relationship_length', 'children', 'couple_type',
      // The two regrouped cuts. Both couple-level, so partners share a value.
      'alignment_group', 'understanding_group',
      // Understanding cuts. Couple-level, so both partners carry the same value.
      'understanding', 'understanding_lopsided',
      // Person-level: this individual's accuracy about their partner.
      'reads_partner', 'worst_misread_dim'];
    const responsesBySegment = { '': responses };
    for (const fld of COUPLE_SEG) {
      const vals = [...new Set(profiles.map(p => p[fld]).filter(v => v != null && v !== ''))];
      for (const v of vals) {
        responsesBySegment[fld + '::' + v] = buildResponseAggregates(profiles.filter(p => p[fld] === v), sessions);
      }
    }

    return json({
      ok: true,
      /* False until migration 082 has run, and the page says so when it is. */
      demoFilterApplied,
      responses,
      responsesBySegment,
      orders,
      /**
       * Every code the product will accept, not just the issued ones.
       *
       * Ellie: "Discount size distribution shows 100% off and unknown, each
       * with 9. I believe all 18 orders are 100% off, please adjust this
       * chart."
       *
       * She was right and the chart was not wrong about what it had. Codes
       * come from two places, the same two the checkout and the tax endpoint
       * read: the compiled set in api/_lib/beta-codes.js, and the beta_codes
       * table where per-couple codes are issued. This endpoint sent only the
       * table, so every order placed on a compiled code looked up to nothing
       * and fell into "Unknown". Nine and nine.
       *
       * The compiled ones go first and a table row of the same name wins, so
       * a code that has been edited in the admin reads as edited.
       */
      beta_codes: [
        ...Object.entries(COMPILED_BETA_CODES || {})
          .filter(([code]) => !(codesQ.data || []).some((r) => String(r.code || '').toUpperCase() === String(code).toUpperCase()))
          /**
           * A compiled entry is either a package key on its own, meaning a
           * free code for that package, or an object with mode and amount.
           * Shaped into the same columns a beta_codes row has, because the
           * admin reads one lookup and must not learn two shapes.
           */
          .map(([code, meta]) => {
            const m = (typeof meta === 'string') ? { pkg: meta, mode: 'free', amount: 0 } : (meta || {});
            return {
              code,
              pkg_key: m.pkg || null,
              discount_mode: m.mode || 'free',
              discount_value: m.mode === 'percent' ? (m.amount ?? 100) : (m.amount ?? 0),
              includes_workbook: !!m.includesWorkbook,
              active: true,
              source: 'compiled',
            };
          }),
        ...(codesQ.data || []).map((r) => ({ ...r, source: 'issued' })),
      ],
      profiles: {
        demographics: profiles.map(p => ({
          /* Normalised the way the other two admin endpoints normalise it, so
             the page's buckets are the values it is sent. Raw, a pronoun
             nobody is offered any more sat in the total and in no bar: four
             people, three bars, and the percentages summed to 75 with nothing
             saying why. */
          age_range: p.age_range, pronouns: pronounLabel(p.pronouns),
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
