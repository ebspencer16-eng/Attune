// admin-explore.js
// Builds an anonymized, partner-linked, pooled per-respondent dataset (a "cube")
// for the admin Explore crosstab tool. One row per respondent (every profile with
// Exercise 1 answers), pooled across Partner A and Partner B. Each row carries the
// respondent's own answers/scores/type/demographics. Partner attributes are
// denormalized onto the row at request time via partner_profile_id and exposed to
// the client as p_<field>, so any datapoint can be cut by the partner's attributes.
// No names or emails ever leave the server. An anonymous couple_id (hash of the
// sorted profile-id pair) lets the client pair rows for correlation without identity.
//
// Auth + access mirror the other admin endpoints: ?secret=ADMIN_SECRET + service key.

import { createClient } from '@supabase/supabase-js';
import { calcDimScores, axisScores, typeCodeFromAxes, DIM_KEYS } from './_type-engine.js';
import { PERSONALITY_QUESTIONS } from './_questions.js';
import { LIFE_QUESTION_OPTIONS } from './_workbook-content.js';

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });

const DIM_LABELS = {
  energy: 'Energy', expression: 'Expression', love: 'Love', closeness: 'Closeness',
  bids: 'Bids', needs: 'Needs', conflict: 'Conflict', stress: 'Stress',
  repair: 'Repair', feedback: 'Feedback',
};
const TYPE_LABELS = { W: 'W · Initiator', X: 'X · Anchor', Y: 'Y · Feeler', Z: 'Z · Protector' };
const DEMO_LABELS = {
  age_range: 'Age range', gender: 'Gender', relationship_status: 'Relationship status',
  relationship_length: 'Time together', children: 'Children', signup_source: 'Signup source',
};
const DEMO_KEYS = Object.keys(DEMO_LABELS);
const LIFE_KEYS = Object.keys(LIFE_QUESTION_OPTIONS);

// First sentence / clause, trimmed — used to label the two poles of a scale question.
const shortPole = (t) => {
  const c = String(t || '').split('.')[0].trim();
  return c.length > 30 ? c.slice(0, 28) + '…' : c;
};

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
  const r = {
    type,
    axisEngage: type === 'W' || type === 'X' ? 'Engage' : 'Withdraw',
    axisOpen: type === 'W' || type === 'Y' ? 'Open' : 'Guarded',
    pkg: p.pkg || 'core',
  };
  for (const k of DEMO_KEYS) r[k] = p[k] != null && p[k] !== '' ? p[k] : null;
  for (const dim of Object.keys(DIM_KEYS)) {
    r['dim_' + dim] = scores[dim] != null ? Number(Number(scores[dim]).toFixed(3)) : null;
  }
  for (const q of PERSONALITY_QUESTIONS) {
    const v = p.ex1_answers ? p.ex1_answers[q.id] : null;
    r['q_' + q.id] = v != null && !isNaN(v) ? Number(v) : null;
  }
  const lq = (p.ex2_answers && p.ex2_answers.lifeQuestions && p.ex2_answers.lifeQuestions.user) || {};
  for (const k of LIFE_KEYS) r['lq_' + k] = lq[k] != null && lq[k] !== '' ? lq[k] : null;
  return r;
}

// Fields whose partner-equivalent (p_<key>) is meaningful to segment by.
const PARTNERABLE = [
  'type', 'axisEngage', 'axisOpen', ...DEMO_KEYS,
  ...Object.keys(DIM_KEYS).map((d) => 'dim_' + d),
  ...PERSONALITY_QUESTIONS.map((q) => 'q_' + q.id),
  ...LIFE_KEYS.map((k) => 'lq_' + k),
];

function buildCatalog(lifeMeta) {
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
  f.push({ key: 'role', label: 'Partner A / B (acquisition)', group: 'Package & cohort', kind: 'cat',
    options: [{ v: 'A', label: 'A (purchaser)' }, { v: 'B', label: 'B (invited)' }] });
  for (const k of DEMO_KEYS) f.push({ key: k, label: DEMO_LABELS[k], group: 'Demographics', kind: 'cat', partnerable: true });
  for (const dim of Object.keys(DIM_KEYS)) f.push({ key: 'dim_' + dim, label: DIM_LABELS[dim] || dim, group: 'Dimensions (score 1–5)', kind: 'scale', partnerable: true });
  for (const q of PERSONALITY_QUESTIONS) f.push({ key: 'q_' + q.id, label: q.text, group: 'Ex1 · Communication (1–5)', kind: 'scale', poleLow: shortPole(q.a), poleHigh: shortPole(q.b), partnerable: true });
  for (const k of LIFE_KEYS) {
    const m = lifeMeta[k] || {};
    const label = m.topic ? (m.category ? m.category + ' · ' + m.topic : m.topic) : k;
    f.push({ key: 'lq_' + k, label, group: 'Ex2 · Expectations', kind: 'cat', options: (LIFE_QUESTION_OPTIONS[k] || []).map((v) => ({ v, label: v })), partnerable: true });
  }
  return f;
}

export default async function handler(req) {
  const url = new URL(req.url);
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return json({ error: 'Admin endpoint not configured' }, 503);
  if ((url.searchParams.get('secret') || '') !== adminSecret) return json({ error: 'Invalid or missing secret' }, 403);

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) return json({ error: 'Supabase env vars missing' }, 500);
  const admin = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const { data: profiles = [], error } = await admin.from('profiles').select('*');
    if (error) return json({ error: error.message }, 500);

    const hasEx1 = (p) => p && p.ex1_answers && Object.keys(p.ex1_answers).length > 0;
    const byId = {};
    for (const p of profiles) byId[p.id] = p;

    // Pass 1: own fields for every respondent who took Exercise 1.
    const computed = {};
    let lifeMeta = {};
    for (const p of profiles) {
      if (!hasEx1(p)) continue;
      computed[p.id] = ownFields(p);
      if (!Object.keys(lifeMeta).length && p.ex2_answers && p.ex2_answers.lifeQuestions && p.ex2_answers.lifeQuestions.meta) {
        lifeMeta = p.ex2_answers.lifeQuestions.meta;
      }
    }

    // Pass 2: pairing + partner denormalization.
    const rows = [];
    for (const p of profiles) {
      const own = computed[p.id];
      if (!own) continue;
      const partnerId = p.partner_profile_id || null;
      const partner = partnerId ? computed[partnerId] : null;
      const row = {
        ...own,
        role: p.joined_via_invite ? 'B' : 'A',
        couple_id: partner ? coupleHash(p.id, partnerId) : null,
        couple_type: partner ? [own.type, partner.type].sort().join('') : null,
      };
      if (partner) for (const k of PARTNERABLE) row['p_' + k] = partner[k];
      rows.push(row);
    }

    return json({
      generatedAt: new Date().toISOString(),
      count: rows.length,
      paired: rows.filter((r) => r.couple_id).length,
      fields: buildCatalog(lifeMeta),
      rows,
    });
  } catch (e) {
    return json({ error: String(e && e.message ? e.message : e) }, 500);
  }
}
