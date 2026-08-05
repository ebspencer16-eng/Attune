// admin-explore.js
// Builds an anonymized, partner-linked, pooled per-respondent dataset (a "cube")
// for the admin Explore crosstab tool. One row per respondent (every profile with
// Exercise 1 answers), pooled across Partner A and Partner B. Each row carries the
// respondent's own answers/scores/type/demographics + Exercise 2 expectations
// (life questions and who-does-what responsibilities). Partner attributes are
// denormalized onto the row at request time via partner_profile_id and exposed to
// the client as p_<field>, so any datapoint can be cut by the partner's attributes.
//
// Responsibility values are stored as the partners' actual names. They are normalized
// server-side to Me / Partner / Both / N/A using profile.name and profile.partner_name,
// and the names are then dropped. No names or emails ever leave the server. An
// anonymous couple_id (hash of the sorted profile-id pair) lets the client pair rows
// for correlation without identity.
//
// Auth + access mirror the other admin endpoints: ?secret=ADMIN_SECRET + service key.

import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth } from './_lib/admin-auth.js';
import { calcDimScores, axisScores, typeCodeFromAxes, DIM_KEYS } from './_type-engine.js';
// Individual type from raw ex1 answers (for invited partners who answered via a
// partner_session and never created a full profile).
function typeFromEx1(ans){
  const sc = calcDimScores(ans);
  if (!sc || !Object.keys(sc).length) return null;
  const { withdrawScore, openScore } = axisScores(sc);
  return typeCodeFromAxes(withdrawScore, openScore);
}
import { PERSONALITY_QUESTIONS, LIFE_QUESTIONS, RESPONSIBILITY_CATEGORIES } from './_questions.js';
import { REFLECTION_QUESTIONS } from './_anniversary-questions.js';
import { INTIMACY_QUESTIONS, INTIMACY_DIMENSIONS } from './_intimacy-questions.js';

// Runs on the edge runtime (Web-style (req)=>Response handler), matching the
// other admin endpoints. Without this, Vercel's Node runtime can't invoke it
// and every request fails with FUNCTION_INVOCATION_FAILED.
export const config = { runtime: 'edge' };

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });

const DIM_POLES = {
  energy:     ['Independent', 'Togetherness'],
  expression: ['Keeps it in', 'Shares openly'],
  love:       ['Words', 'Acts & presence'],
  listening:  ['Sits with it', 'Engages & reflects'],
  bids:       ["Doesn't track bids", 'Small moments matter'],
  needs:      ['Names needs directly', 'Wants to be noticed'],
  conflict:   ['Address right away', 'Needs space first'],
  stress:     ['Pulls inward', 'Leans on partner'],
  repair:     ['Repairs quickly', 'Repairs when ready'],
  feedback:   ['Gentle approach', 'Direct & specific'],
};
const DIM_LABELS = {
  energy: 'Energy', expression: 'Expression', love: 'Love', listening: 'Listening',
  bids: 'Bids', needs: 'Needs', conflict: 'Conflict', stress: 'Stress',
  repair: 'Repair', feedback: 'Feedback',
};
const TYPE_LABELS = { W: 'W · Initiator', X: 'X · Anchor', Y: 'Y · Feeler', Z: 'Z · Protector' };
const DEMO_LABELS = {
  age_range: 'Age range', gender: 'Gender', relationship_status: 'Relationship status',
  relationship_length: 'Time together', children: 'Children', signup_source: 'Signup source',
};
const DEMO_KEYS = Object.keys(DEMO_LABELS);
function genderFromPronoun(pr) {
  const v = String(pr || '').toLowerCase();
  return v === 'he/him' ? 'man' : v === 'she/her' ? 'woman' : v === 'they/them' ? 'nonbinary' : null;
}
const RESP_OPTS = ['Me', 'Both', 'Partner', 'N/A'];
const IDIM_LABEL = Object.fromEntries((INTIMACY_DIMENSIONS || []).map((d) => [d.id, d.label]));

// First sentence / clause, trimmed — used to label the two poles of a scale question.
const shortPole = (t) => {
  const c = String(t || '').split('.')[0].trim();
  return c.length > 30 ? c.slice(0, 28) + '…' : c;
};
// Strip the {userName}/{partnerName} templates to a neutral, name-free label.
const genericLabel = (t) =>
  String(t || '')
    .replace(/\{userName\}'s family/g, "one's own family")
    .replace(/\{partnerName\}'s family/g, "other partner's family")
    .replace(/\{userName\}'s/g, 'your')
    .replace(/\{partnerName\}'s/g, "partner's")
    .replace(/\{userName\}/g, 'you')
    .replace(/\{partnerName\}/g, 'partner');

// Tiny non-reversible hash of the sorted id pair → anonymous couple key.
const coupleHash = (a, b) => {
  const s = [a, b].filter(Boolean).sort().join('|');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return 'c' + h.toString(36);
};

// Per-respondent "own" fields (the partner-denormalized p_* are added in a second pass).
function ownFields(p) {
  const scores = calcDimScores(p.ex1_answers);
  const { withdrawScore, openScore } = axisScores(scores);
  const type = typeCodeFromAxes(withdrawScore, openScore);
  const _axisW = Number.isFinite(withdrawScore) ? Number(withdrawScore.toFixed(3)) : null;
  const _axisO = Number.isFinite(openScore) ? Number(openScore.toFixed(3)) : null;
  const r = {
    type,
    axisEngage: type === 'W' || type === 'X' ? 'Engage' : 'Withdraw',
    axisOpen: type === 'W' || type === 'Y' ? 'Open' : 'Guarded',
    pkg: p.pkg || 'core',
    axis_w: _axisW,
    axis_o: _axisO,
    has_ex2: !!(p.ex2_answers && Object.keys(p.ex2_answers).length > 0),
  };
  for (const k of DEMO_KEYS) r[k] = p[k] != null && p[k] !== '' ? p[k] : null;
  // Gender isn't collected directly; derive it from the person's own pronouns.
  if (!r.gender && p.pronouns) r.gender = genderFromPronoun(p.pronouns);
  for (const dim of Object.keys(DIM_KEYS)) {
    r['dim_' + dim] = scores[dim] != null ? Number(Number(scores[dim]).toFixed(3)) : null;
  }
  for (const q of PERSONALITY_QUESTIONS) {
    const v = p.ex1_answers ? p.ex1_answers[q.id] : null;
    r['q_' + q.id] = v != null && !isNaN(v) ? Number(v) : null;
  }
  // Ex2 life questions: stored flat under ex2_answers.life
  const life = (p.ex2_answers && p.ex2_answers.life) || {};
  for (const lq of LIFE_QUESTIONS) r[lq.id] = life[lq.id] != null && life[lq.id] !== '' ? life[lq.id] : null;
  // Ex2 responsibilities: stored flat under ex2_answers.responsibilities, keyed
  // `categoryId__item`. Values are names — normalize to Me/Partner/Both/N/A here.
  const resp = (p.ex2_answers && p.ex2_answers.responsibilities) || {};
  const me = (p.name || '').trim();
  const partner = (p.partner_name || '').trim();
  const norm = (v) => {
    if (v == null || v === '') return null;
    if (v === 'Both of us') return 'Both';
    if (v === "Doesn't apply to us") return 'N/A';
    if (me && v === me) return 'Me';
    if (partner && v === partner) return 'Partner';
    return 'Partner'; // any other name-like value belongs to the partner
  };
  for (const cat of RESPONSIBILITY_CATEGORIES) {
    cat.items.forEach((item, i) => {
      // The app stores responsibility keys with the RAW {userName}/{partnerName}
      // template (not the substituted name), so the raw item is the real key.
      // Fall back to the name-substituted form for any legacy data.
      const realItem = item.replace(/\{userName\}/g, me).replace(/\{partnerName\}/g, partner);
      const raw = resp[cat.id + '__' + item];
      r['resp_' + cat.id + '_' + i] = norm(raw != null ? raw : resp[cat.id + '__' + realItem]);
    });
  }
  // Ex3 Relationship Reflection: scale answers stored as option index (0-4),
  // pick answers as the chosen string. Free-text/ranking omitted.
  const ex3 = p.ex3_answers || {};
  for (const q of REFLECTION_QUESTIONS) {
    const v = ex3[q.id];
    if (q.kind === 'pick') r['ref_' + q.id] = (typeof v === 'string' && v) ? v : null;
    else r['ref_' + q.id] = (typeof v === 'number' && q.labels[v] != null) ? q.labels[v] : null;
  }
  // Physical Intimacy: single-select answers stored as the option label string.
  // Multi-select questions (arrays) are skipped for distribution.
  const intim = (p.intimacy_data && p.intimacy_data.answers) || {};
  for (const q of INTIMACY_QUESTIONS) {
    if (q.kind === 'multi') continue;
    const raw = intim[q.id];
    r['iq_' + q.id] = (typeof raw === 'string' && raw) ? raw : null;
  }
  return r;
}

// Fields whose partner-equivalent (p_<key>) is meaningful to segment by.
const PARTNERABLE = [
  'type', 'axisEngage', 'axisOpen', ...DEMO_KEYS,
  ...Object.keys(DIM_KEYS).map((d) => 'dim_' + d),
  ...PERSONALITY_QUESTIONS.map((q) => 'q_' + q.id),
  ...LIFE_QUESTIONS.map((lq) => lq.id),
  ...RESPONSIBILITY_CATEGORIES.flatMap((c) => c.items.map((_, i) => 'resp_' + c.id + '_' + i)),
  ...REFLECTION_QUESTIONS.map((q) => 'ref_' + q.id),
  ...INTIMACY_QUESTIONS.filter((q) => q.kind !== 'multi').map((q) => 'iq_' + q.id),
];

// Beta-survey fields joined onto the respondent by their profile id, so survey
// answers are segmentable by every demographic/type field already in the cube.
const FB_SCALE = {
  fb_expectationMatch: 'Feedback · Expectation match', fb_commsOverall: 'Feedback · Communication overall',
  fb_commsHonesty: 'Feedback · Communication honesty', fb_expOverall: 'Feedback · Expectations overall',
  fb_expHonesty: 'Feedback · Expectations honesty', fb_shiftCouple: 'Feedback · Shift as a couple',
  fb_shiftSelf: 'Feedback · Shift in yourself', fb_returnLikelihood: 'Feedback · Likely to revisit',
  fb_valuePct: 'Feedback · Value vs other spend',
};
const FB_SCALE_SRC = { fb_expectationMatch:'expectationMatch', fb_commsOverall:'commsOverall', fb_commsHonesty:'commsHonesty', fb_expOverall:'expOverall', fb_expHonesty:'expHonesty', fb_shiftCouple:'shiftCouple', fb_shiftSelf:'shiftSelf', fb_returnLikelihood:'returnLikelihood', fb_valuePct:'valuePct' };
const FB_POLES = {
  fb_expectationMatch:['Fell short','Exceeded it'], fb_commsOverall:['Poor','Excellent'],
  fb_commsHonesty:['Held back a lot','Completely honest'], fb_expOverall:['Poor','Excellent'],
  fb_expHonesty:['Held back a lot','Completely honest'], fb_shiftCouple:['No shift','Significant shift'],
  fb_shiftSelf:['No shift','Significant shift'], fb_returnLikelihood:['Very unlikely','Very likely'],
  fb_valuePct:['Much less value','Much more value'],
};
const FB_CAT = { fb_ahaMarker: 'Feedback · Biggest recognition moment', fb_convoHappened: 'Feedback · Led to a conversation' };
const FB_CAT_SRC = { fb_ahaMarker:'ahaMarker', fb_convoHappened:'convoHappened' };

function buildCatalog(fbCatOptions) {
  const f = [];
  f.push({ key: 'type', label: 'Individual type', group: 'Type & axes', kind: 'cat',
    options: Object.entries(TYPE_LABELS).map(([v, label]) => ({ v, label })), partnerable: true });
  f.push({ key: 'axisEngage', label: 'Engage / Withdraw', group: 'Type & axes', kind: 'cat',
    options: [{ v: 'Engage', label: 'Engage' }, { v: 'Withdraw', label: 'Withdraw' }], partnerable: true });
  f.push({ key: 'axisOpen', label: 'Open / Guarded', group: 'Type & axes', kind: 'cat',
    options: [{ v: 'Open', label: 'Open' }, { v: 'Guarded', label: 'Guarded' }], partnerable: true });
  f.push({ key: 'couple_type', label: 'Couple type', group: 'Type & axes', kind: 'cat' });
  f.push({ key: 'pkg', label: 'Package', group: 'Package & cohort', kind: 'cat',
    options: [['core', 'Core'], ['newlywed', 'Newlywed'], ['anniversary', 'Anniversary'], ['premium', 'Premium']].map(([v, label]) => ({ v, label })) });
  for (const k of DEMO_KEYS) f.push({ key: k, label: DEMO_LABELS[k], group: 'Demographics', kind: 'cat', partnerable: true });
  for (const dim of Object.keys(DIM_KEYS)) f.push({ key: 'dim_' + dim, label: DIM_LABELS[dim] || dim, group: 'Dimensions (score 1–5)', kind: 'scale', poleLow: (DIM_POLES[dim]||[])[0], poleHigh: (DIM_POLES[dim]||[])[1], partnerable: true });
  for (const q of PERSONALITY_QUESTIONS) f.push({ key: 'q_' + q.id, label: q.text, group: 'Ex1 · Communication (1–5)', kind: 'scale', poleLow: shortPole(q.a), poleHigh: shortPole(q.b), partnerable: true });
  for (const lq of LIFE_QUESTIONS) f.push({ key: lq.id, label: (lq.category ? lq.category + ' · ' : '') + genericLabel(lq.text), group: 'Ex2 · Life & values', kind: 'cat', options: (lq.options || []).map((v) => ({ v, label: v })), partnerable: true });
  for (const cat of RESPONSIBILITY_CATEGORIES) {
    cat.items.forEach((item, i) => {
      f.push({ key: 'resp_' + cat.id + '_' + i, label: cat.label + ' · ' + genericLabel(item), group: 'Ex2 · Who does what', kind: 'cat', options: RESP_OPTS.map((v) => ({ v, label: v })), partnerable: true });
    });
  }
  for (const q of REFLECTION_QUESTIONS) {
    const isPick = q.kind === 'pick';
    const opts = (isPick ? q.options : q.labels) || [];
    const fld = { key: 'ref_' + q.id, label: (q.topic ? q.topic + ' · ' : '') + q.text, group: 'Ex3 · Relationship Reflection', kind: 'cat', options: opts.map((v) => ({ v, label: v })), partnerable: true };
    if (!isPick && opts.length >= 2) { fld.ordinal = true; fld.poleLow = opts[0]; fld.poleHigh = opts[opts.length - 1]; }
    f.push(fld);
  }
  for (const q of INTIMACY_QUESTIONS) {
    if (q.kind === 'multi') continue;
    const valid = (q.options || []).filter((o) => o.value != null);
    const fld = { key: 'iq_' + q.id, label: (q.topic ? q.topic + ' · ' : '') + (q.premarital || q.married || q.id), group: 'Physical Intimacy', kind: 'cat', options: valid.map((o) => ({ v: o.label, label: o.label, val: o.value })), partnerable: true, dim: q.dimension, dimLabel: IDIM_LABEL[q.dimension] || q.dimension };
    if (valid.length >= 2) {
      const lo = valid.reduce((a, b) => (b.value < a.value ? b : a));
      const hi = valid.reduce((a, b) => (b.value > a.value ? b : a));
      fld.ordinal = true; fld.poleLow = lo.label; fld.poleHigh = hi.label;
    }
    f.push(fld);
  }
  for (const k of Object.keys(FB_SCALE)) f.push({ key: k, label: FB_SCALE[k], group: 'Beta feedback survey', kind: 'scale', poleLow: (FB_POLES[k]||[])[0], poleHigh: (FB_POLES[k]||[])[1] });
  for (const k of Object.keys(FB_CAT)) f.push({ key: k, label: FB_CAT[k], group: 'Beta feedback survey', kind: 'cat', options: ((fbCatOptions && fbCatOptions[k]) || []).map((v) => ({ v, label: v })) });
  f.push({ key: 'fb_nps', label: 'Feedback \u00b7 NPS (raw 0\u201310)', group: 'Beta feedback survey', kind: 'cat', options: Array.from({ length: 11 }, (_, i) => ({ v: String(i), label: String(i) })) });
  return f;
}

export default async function handler(req) {
  const url = new URL(req.url);
  const _auth = checkAdminAuth(req);
  if (!_auth.ok) return json({ error: _auth.error }, _auth.status);

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) return json({ error: 'Supabase env vars missing' }, 500);
  const admin = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const { data: profiles = [], error } = await admin.from('profiles').select('*');
    if (error) return json({ error: error.message }, 500);
    const profileById = {}; for (const p of profiles) profileById[p.id] = p;
    // Invited partners answer via partner_sessions (keyed by invite_code) and may
    // never create a full profile. Pull them so a couple isn't shown as unpaired
    // just because one half came in through an invite.
    let partnerSessions = [];
    try { const _ps = await admin.from('partner_sessions').select('invite_code, ex1_answers'); partnerSessions = _ps.data || []; } catch (e) {}
    const sessByInvite = new Map();
    for (const sx of partnerSessions) { if (sx && sx.invite_code && sx.ex1_answers) sessByInvite.set(sx.invite_code, sx); }

    // Beta survey responses, keyed by respondent profile id, for the join below.
    const surveyByRespondent = {};
    const fbCatOptions = { fb_ahaMarker: new Set(), fb_convoHappened: new Set() };
    try {
      const { data: fbRows = [] } = await admin.from('feedback_submissions').select('id, type, text, submitted_at, featured').eq('type', 'beta_survey');
      for (const r of fbRows) {
        let payload = null;
        try { payload = typeof r.text === 'string' ? JSON.parse(r.text) : r.text; } catch {}
        if (payload && payload.respondentId) {
          payload._ts = r.submitted_at || payload._ts || null;
          payload._rowId = r.id; payload._featured = !!r.featured;
          surveyByRespondent[payload.respondentId] = payload;
          for (const [fk, src] of Object.entries(FB_CAT_SRC)) { const v = payload[src]; if (v) fbCatOptions[fk].add(v); }
        }
      }
    } catch {}
    const fbCatOpts = Object.fromEntries(Object.entries(fbCatOptions).map(([k, set]) => [k, [...set]]));

    const hasEx1 = (p) => p && p.ex1_answers && Object.keys(p.ex1_answers).length > 0;

    // Pass 1: own fields for every respondent who took Exercise 1.
    const computed = {};
    for (const p of profiles) {
      if (!hasEx1(p)) continue;
      computed[p.id] = ownFields(p);
    }

    // Pass 2: pairing + partner denormalization.
    // Segment lookups so orders can be joined to a purchaser's demographics
    // server-side (by user_id or email) without ever exposing PII to the client.
    const SEG_KEYS = ['gender','age_range','relationship_status','relationship_length','children','signup_source','type','axisEngage','axisOpen','couple_type','pkg'];
    const RETRO_COUPLE_TYPE = { 'ATTUNE-BETA-1':'WZ', 'ATTUNE-BETA-2':'WX', 'ATTUNE-BETA-5':'WY' };
    const segById = {}, segByEmail = {};
    const rows = [];
    for (const p of profiles) {
      const own = computed[p.id];
      if (!own) continue;
      const partnerId = p.partner_profile_id || null;
      const partner = partnerId ? computed[partnerId] : null;
      // Fall back to the invited partner's session answers when there's no
      // profile-to-profile link, so the couple is still paired and typed.
      let partnerType = partner ? partner.type : null;
      let coupleKey = partnerId;
      if (!partner && p.invite_code && sessByInvite.has(p.invite_code)) {
        const st = typeFromEx1(sessByInvite.get(p.invite_code).ex1_answers);
        if (st) { partnerType = st; coupleKey = 'inv:' + p.invite_code; }
      }
      const row = {
        ...own,
        role: p.joined_via_invite ? 'B' : 'A',
        couple_id: partnerType ? coupleHash(p.id, coupleKey) : null,
        couple_type: partnerType ? [own.type, partnerType].sort().join('') : null,
      };
      if (partner) for (const k of PARTNERABLE) row['p_' + k] = partner[k];
      // Gender fallback: each partner records the other's pronouns, so a person
      // who never set their own can still be filled from their partner's record.
      if (!row.gender && partnerId && profileById[partnerId]?.partner_pronouns) {
        const g = genderFromPronoun(profileById[partnerId].partner_pronouns);
        if (g) row.gender = g;
      }
      const survey = surveyByRespondent[p.id];
      if (survey) {
        for (const [fk, src] of Object.entries(FB_SCALE_SRC)) { const v = Number(survey[src]); row[fk] = Number.isFinite(v) ? v : null; }
        for (const [fk, src] of Object.entries(FB_CAT_SRC)) { row[fk] = survey[src] != null && survey[src] !== '' ? survey[src] : null; }
        { const _nv = parseInt(survey.nps, 10); row.fb_nps = Number.isFinite(_nv) ? String(_nv) : null; }
      }
      rows.push(row);
      // Anonymized segment snapshot for order joins (keyed by id + email; no PII emitted).
      const _seg = {}; for (const k of SEG_KEYS) _seg[k] = row[k] !== undefined ? row[k] : null;
      segById[p.id] = _seg;
      if (p.email) segByEmail[String(p.email).toLowerCase()] = _seg;
    }

    // ── Orders, joined to purchaser demographics, fully anonymized ───────────
    let orderRows = [];
    try {
      const { data: ords = [] } = await admin.from('orders').select('*').limit(2000);
      const monthOf = (d) => { const t = new Date(d); return isNaN(t) ? null : t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0'); };
      orderRows = (ords || []).map((o) => {
        const email = o.buyer_email ? String(o.buyer_email).toLowerCase() : null;
        const seg = (o.user_id && segById[o.user_id]) || (email && segByEmail[email]) || {};
        const merged = {};
        for (const k of SEG_KEYS) merged[k] = seg[k] != null ? seg[k] : null;
        // Retroactive beta-code couple-type tagging when the profile join is absent.
        const retro = RETRO_COUPLE_TYPE[o.promo_code];
        if (retro && !merged.couple_type) merged.couple_type = retro;
        if (retro && !merged.pkg) merged.pkg = 'premium';
        return {
          month: monthOf(o.created_at),
          ts: o.created_at || null,
          amount: Number(o.total) || 0,
          order_pkg: o.pkg_key || null,
          is_physical: !!o.is_physical,
          promo_code: o.promo_code || null,
          addon_lmft: !!o.addon_lmft,
          addon_workbook: o.addon_workbook || null,
          addon_reflection: !!o.addon_reflection,
          addon_budget: !!o.addon_budget,
          addon_intimacy: !!o.addon_intimacy,
          state: o.shipping_state || o.billing_state || null,
          country: o.shipping_country || o.billing_country || null,
          matched: !!(seg && Object.keys(seg).length),
          ...merged,
        };
      });
    } catch (e) { orderRows = []; }

    // ── Survey responses, anonymized + segment-tagged (NPS / ratings slicing) ──
    const monthOfTs = (d) => { const t = new Date(d); return isNaN(t) ? null : t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0'); };
    const surveysAnon = [];
    const testimonialsAnon = [];
    const betaResponsesAnon = [];
    for (const [rid, payload] of Object.entries(surveyByRespondent)) {
      const seg = segById[rid] || {};
      const row = {};
      for (const k of SEG_KEYS) row[k] = seg[k] != null ? seg[k] : null;
      row.month = monthOfTs(payload._ts);
      row.ts = payload._ts || null;
      const nps = parseInt(payload.nps, 10); row.nps = Number.isFinite(nps) ? nps : null;
      const rl = parseInt(payload.returnLikelihood, 10); row.returnLikelihood = Number.isFinite(rl) ? rl : null;
      row.convo = payload.convoHappened != null && payload.convoHappened !== '' ? String(payload.convoHappened) : null;
      surveysAnon.push(row);
      // Full beta response (all answer fields) + segments, PII stripped, for the
      // segment-sliceable beta feedback charts.
      { const br = {};
        for (const k of Object.keys(payload)) { if (['respondentId','userName','email','_ts','_rowId','_featured'].includes(k)) continue; br[k] = payload[k]; }
        for (const k of SEG_KEYS) br[k] = seg[k] != null ? seg[k] : null;
        br._ts = payload._ts || null;
        betaResponsesAnon.push(br); }
      // Beta-survey testimonial (from the survey's last section) -> Testimonials page.
      const _btxt = String(payload.testimonial || '').trim();
      if (_btxt) {
        const bt = { id: payload._rowId != null ? payload._rowId : ('beta-' + rid), featured: !!payload._featured,
          name: payload.consentFirstName || payload.consentInitials || payload.userName || '', ts: payload._ts || null,
          rating: null, nps: row.nps, testimonial: _btxt, coupleTypeName: payload.coupleType || null, source: 'beta' };
        for (const k of SEG_KEYS) bt[k] = seg[k] != null ? seg[k] : null;
        testimonialsAnon.push(bt);
      }
    }
    // Post-results survey (general couples) — same shape so NPS/ratings charts
    // combine both cohorts. Its star rating maps onto the 1-5 rating axis.
    try {
      const { data: prRows = [] } = await admin.from('feedback_submissions').select('id, text, submitted_at, featured').eq('type', 'post_results');
      for (const r of prRows) {
        let payload = null; try { payload = typeof r.text === 'string' ? JSON.parse(r.text) : r.text; } catch {}
        if (!payload) continue;
        const a = payload.answers || {};
        const seg = (payload.respondentId && segById[payload.respondentId]) || {};
        const row = {};
        for (const k of SEG_KEYS) row[k] = seg[k] != null ? seg[k] : null;
        row.month = monthOfTs(r.submitted_at);
        row.ts = r.submitted_at || null;
        const nps = parseInt(a.nps, 10); row.nps = Number.isFinite(nps) ? nps : null;
        const rl = parseInt(a.rating, 10); row.returnLikelihood = Number.isFinite(rl) ? rl : null;
        row.convo = a.convo != null && a.convo !== '' ? String(a.convo) : null;
        surveysAnon.push(row);
        // Testimonial entry (segment-tagged) for the admin Testimonials page.
        const t = { id: r.id, featured: !!r.featured, name: payload.userName || '', ts: r.submitted_at || null,
          rating: Number.isFinite(rl) ? rl : null, nps: Number.isFinite(nps) ? nps : null,
          testimonial: String(a.testimonial || '').trim(), coupleTypeName: payload.coupleType || null };
        for (const k of SEG_KEYS) t[k] = seg[k] != null ? seg[k] : null;
        testimonialsAnon.push(t);
      }
    } catch (e) {}

    return json({
      generatedAt: new Date().toISOString(),
      count: rows.length,
      paired: rows.filter((r) => r.couple_id).length,
      fields: buildCatalog(fbCatOpts),
      rows,
      orders: orderRows,
      surveys: surveysAnon,
      testimonials: testimonialsAnon,
      betaResponses: betaResponsesAnon,
    });
  } catch (e) {
    return json({ error: String(e && e.message ? e.message : e) }, 500);
  }
}
