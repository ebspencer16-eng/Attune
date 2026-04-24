/**
 * /api/admin-csv?type=...
 *
 * Generates one of five admin CSV reports. Server-side so we have access to
 * the service key (can read all rows across all tables) and can compute
 * derived scores the same way the client does.
 *
 * Supported types:
 *   ?type=orders        — one row per order, with addon + add-when columns
 *   ?type=demographics  — one row per couple: genders, rel length + status,
 *                         childhood contexts, individual types, couple type
 *   ?type=engagement    — one row per couple: Y/N for each exercise + workbook
 *   ?type=results       — one row per couple: W/O scores + 10 dim scores per
 *                         partner + satisfaction scale responses from ex3
 *   ?type=feedback      — one row per feedback response, column per question
 *
 * All exports are anonymized via UUID — no names, emails, partner names.
 *
 * Auth: ?secret=xxx must match ADMIN_SECRET env var if set.
 */

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

// ── Scoring helpers (ported from src/App.jsx so the server computes the
// same values as the client). Keep in sync if scoring logic changes. ──

const DIM_KEYS = {
  energy:     ['en1','en2','en3','en4','en5'],
  expression: ['ex1','ex2','ex3','ex4','ex5'],
  needs:      ['nd1','nd2','nd3','nd4','nd5'],
  bids:       ['bd1','bd2','bd3','bd4','bd5'],
  conflict:   ['cf1','cf2','cf3','cf4','cf5'],
  repair:     ['rp1','rp2','rp3','rp4','rp5'],
  closeness:  ['cl1','cl2','cl3','cl4','cl5'],
  love:       ['lv1','lv2','lv3','lv4','lv5'],
  stress:     ['st1','st2','st3','st4','st5'],
  feedback:   ['fb1','fb2','fb3','fb4','fb5'],
};

function calcDimScores(answers) {
  if (!answers) return {};
  const out = {};
  for (const [dim, keys] of Object.entries(DIM_KEYS)) {
    const vals = keys.map(k => answers[k]).filter(v => v != null && !isNaN(v));
    out[dim] = vals.length ? vals.reduce((s, v) => s + Number(v), 0) / vals.length : null;
  }
  return out;
}

// Engage/Withdraw axis: Conflict (55%) + Stress (30%) + Repair (15%)
// Open/Guarded axis: Expression (45%) + Feedback (30%) + Needs (25%)
function computeAxes(scores) {
  const s = scores || {};
  if (s.conflict == null && s.stress == null && s.expression == null) return { withdrawScore: null, openScore: null, typeCode: null };
  const withdrawScore = (s.conflict || 3) * 0.55 + (s.stress || 3) * 0.30 + (s.repair || 3) * 0.15;
  const openScore     = (s.expression || 3) * 0.45 + (s.feedback || 3) * 0.30 + (s.needs || 3) * 0.25;
  const isEngage = withdrawScore <= 3.0;
  const isOpen   = openScore    >= 3.0;
  const typeCode = isEngage && isOpen ? 'W' : isEngage && !isOpen ? 'X' : !isEngage && isOpen ? 'Y' : 'Z';
  return { withdrawScore, openScore, typeCode };
}

// ── CSV builder ─────────────────────────────────────────────────────────
const csvEscape = (v) => {
  if (v == null) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  // RFC 4180: fields containing quotes, commas, or newlines must be quoted.
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
};
const toCSV = (headers, rows) =>
  [headers.map(csvEscape).join(','),
   ...rows.map(r => r.map(csvEscape).join(','))].join('\n');

const csvResponse = (filename, body) => new Response(body, {
  status: 200,
  headers: {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
  },
});

const errResponse = (status, message) => new Response(
  JSON.stringify({ ok: false, error: message }),
  { status, headers: { 'Content-Type': 'application/json' } }
);

// ── Main handler ────────────────────────────────────────────────────────
export default async function handler(req) {
  const url = new URL(req.url);
  const type = (url.searchParams.get('type') || '').toLowerCase();

  // Optional secret gate (matches /api/get-feedback pattern)
  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret) {
    const provided = url.searchParams.get('secret') || '';
    if (provided !== adminSecret) return errResponse(403, 'Invalid or missing secret');
  }

  const SUPABASE_URL  = process.env.SUPABASE_URL;
  const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) return errResponse(500, 'Supabase env vars missing');
  const admin = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    if (type === 'orders')        return await exportOrders(admin);
    if (type === 'demographics')  return await exportDemographics(admin);
    if (type === 'engagement')    return await exportEngagement(admin);
    if (type === 'results')       return await exportResults(admin);
    if (type === 'feedback')      return await exportFeedback();
    return errResponse(400, 'Unknown type. Use orders|demographics|engagement|results|feedback');
  } catch (e) {
    console.error('[admin-csv]', type, e);
    return errResponse(500, 'Export failed: ' + (e.message || e));
  }
}

// ── 1. ORDERS ──────────────────────────────────────────────────────────
// Includes each add-on with Y/N + when (initial checkout, pre-results,
// post-results). "When" inference: addons present at order creation =
// initial checkout. Added later via upsell = post-results. We don't track
// pre-results upsells separately yet — flagged as TODO below.
async function exportOrders(admin) {
  const { data: orders } = await admin.from('orders').select('*').order('created_at', { ascending: false });

  const headers = [
    'order_num', 'order_date', 'package',
    'physical_or_digital', 'gift_or_self',
    'workbook_purchased', 'workbook_purchased_when',
    'reflection_purchased', 'reflection_purchased_when',
    'budget_purchased', 'budget_purchased_when',
    'checklist_purchased', 'checklist_purchased_when',
    'lmft_purchased', 'lmft_purchased_when',
  ];

  // "When" inference: Addon columns in orders are set at checkout time
  // (addon_* fields). Post-results upsells go through a separate flow that
  // calls /api/orders with action='update'. To track when accurately we'd
  // need a dedicated addon_log table; for now, the rule is:
  //   - If addon exists when the order was first created, "initial_checkout"
  //   - If addon was added later (updated_at > created_at + 1h), "post_results"
  // Pre-results purchases (rare) are not distinguished from initial.
  const whenForAddon = (o, addonField) => {
    if (!o[addonField]) return '';
    if (!o.updated_at || !o.created_at) return 'initial_checkout';
    const created = new Date(o.created_at).getTime();
    const updated = new Date(o.updated_at).getTime();
    // If the order was updated within 1 hour of creation, treat as initial checkout.
    // Otherwise assume the addon was added post-results via upsell.
    return (updated - created) < (60 * 60 * 1000) ? 'initial_checkout' : 'post_results';
  };

  const rows = (orders || []).map(o => {
    // Package inclusion rules (from src/App.jsx pkgConfig):
    //   newlywed    → includes checklist + budget
    //   anniversary → includes reflection
    //   premium     → includes reflection + budget + LMFT
    // Add-ons stack on top of package inclusions.
    const pkgHasChecklist   = o.pkg_key === 'newlywed';
    const pkgHasBudget      = o.pkg_key === 'newlywed' || o.pkg_key === 'premium';
    const pkgHasReflection  = o.pkg_key === 'anniversary' || o.pkg_key === 'premium';
    const pkgHasLMFT        = o.pkg_key === 'premium';

    const hasWorkbook   = !!o.addon_workbook;
    const hasReflection = pkgHasReflection || !!o.addon_reflection;
    const hasBudget     = pkgHasBudget     || !!o.addon_budget;
    const hasChecklist  = pkgHasChecklist;  // No addon column today
    const hasLMFT       = pkgHasLMFT       || !!o.addon_lmft;

    // If the feature came with the package, "when" = initial_checkout.
    const whenFor = (pkgIncluded, addonField) => {
      if (pkgIncluded) return 'initial_checkout';
      if (!o[addonField]) return '';
      return whenForAddon(o, addonField);
    };

    return [
      o.order_num || '',
      o.created_at ? new Date(o.created_at).toISOString().slice(0,10) : '',
      o.pkg_key || '',
      o.is_physical ? 'physical' : 'digital',
      o.is_gift ? 'gift' : 'self',
      hasWorkbook   ? 'Y' : 'N',   hasWorkbook   ? whenForAddon(o, 'addon_workbook') : '',
      hasReflection ? 'Y' : 'N',   hasReflection ? whenFor(pkgHasReflection, 'addon_reflection') : '',
      hasBudget     ? 'Y' : 'N',   hasBudget     ? whenFor(pkgHasBudget, 'addon_budget') : '',
      hasChecklist  ? 'Y' : 'N',   hasChecklist  ? 'initial_checkout' : '',
      hasLMFT       ? 'Y' : 'N',   hasLMFT       ? whenFor(pkgHasLMFT, 'addon_lmft') : '',
    ];
  });
  return csvResponse(`attune_orders_${new Date().toISOString().slice(0,10)}.csv`, toCSV(headers, rows));
}

// ── 2. DEMOGRAPHICS ────────────────────────────────────────────────────
// One row per couple. Pulls Partner A demographics from profiles, Partner B
// from partner_sessions (limited: only pronouns of B are known via
// partner_pronouns-like fields, which don't exist yet — so Partner B gender
// is left blank until we collect it). Childhood contexts from ex2.
async function exportDemographics(admin) {
  const { data: profiles } = await admin.from('profiles').select('id, gender, partner_pronouns, relationship_length, relationship_status, invite_code');
  const { data: sessions } = await admin.from('exercise_sessions').select('user_id, ex1_answers, ex2_answers, couple_type');
  const { data: partnerRows } = await admin.from('partner_sessions').select('invite_code, ex1_answers, ex2_answers');

  const sessByUser = Object.fromEntries((sessions || []).map(s => [s.user_id, s]));
  const pbyCode    = Object.fromEntries((partnerRows || []).map(p => [p.invite_code, p]));

  const headers = [
    'anon_couple_id',
    'partner_a_gender',
    'partner_b_gender',            // Not currently collected — will stay blank
    'relationship_length',
    'marital_status',
    'partner_a_childhood_context',
    'partner_b_childhood_context',
    'partner_a_individual_type',
    'partner_b_individual_type',
    'couple_type',
  ];

  const rows = (profiles || []).map(p => {
    const session = sessByUser[p.id];
    const partnerSession = p.invite_code ? pbyCode[p.invite_code] : null;

    const ex2a = session?.ex2_answers || {};
    const ex2b = partnerSession?.ex2_answers || {};

    const aScores = calcDimScores(session?.ex1_answers);
    const bScores = calcDimScores(partnerSession?.ex1_answers);
    const aAxes = computeAxes(aScores);
    const bAxes = computeAxes(bScores);

    // Anonymize couple id — first 8 chars of profile UUID, not reversible
    const anonId = (p.id || '').replace(/-/g, '').slice(0, 8);

    return [
      anonId,
      p.gender || '',
      '', // Partner B gender — not collected via the B-signup flow yet
      p.relationship_length || '',
      p.relationship_status || '',
      ex2a.childhoodStructure || '',
      ex2b.childhoodStructure || '',
      aAxes.typeCode || '',
      bAxes.typeCode || '',
      session?.couple_type?.id || '',
    ];
  });
  return csvResponse(`attune_demographics_${new Date().toISOString().slice(0,10)}.csv`, toCSV(headers, rows));
}

// ── 3. ENGAGEMENT ──────────────────────────────────────────────────────
// One row per couple. Y/N for each exercise + workbook download/ship.
async function exportEngagement(admin) {
  const { data: profiles } = await admin.from('profiles').select('id, invite_code, pkg, budget_data');
  const { data: sessions } = await admin.from('exercise_sessions').select('user_id, ex1_answers, ex2_answers, ex3_answers');
  const { data: partnerRows } = await admin.from('partner_sessions').select('invite_code, ex1_answers, ex2_answers, ex3_answers');
  const { data: workbooks } = await admin.from('workbooks').select('user_id, storage_path, generated_at');
  const { data: orders } = await admin.from('orders').select('user_id, addon_workbook, is_physical, workbook_status, card_status');

  const sessByUser = Object.fromEntries((sessions || []).map(s => [s.user_id, s]));
  const pbyCode    = Object.fromEntries((partnerRows || []).map(p => [p.invite_code, p]));
  const wbByUser   = Object.fromEntries((workbooks || []).map(w => [w.user_id, w]));
  const ordersByUser = {};
  (orders || []).forEach(o => { if (o.user_id) ordersByUser[o.user_id] = o; });

  const headers = [
    'anon_couple_id', 'package',
    'partner_a_comms_complete', 'partner_b_comms_complete',
    'partner_a_expectations_complete', 'partner_b_expectations_complete',
    'partner_a_reflection_complete', 'partner_b_reflection_complete',
    'partner_a_budget_complete',
    'workbook_generated',
    'workbook_shipped',
  ];

  const rows = (profiles || []).map(p => {
    const s = sessByUser[p.id];
    const ps = p.invite_code ? pbyCode[p.invite_code] : null;
    const w = wbByUser[p.id];
    const o = ordersByUser[p.id];
    const budgetComplete = p.budget_data && Object.keys(p.budget_data).length > 0;
    const anonId = (p.id || '').replace(/-/g, '').slice(0, 8);

    return [
      anonId, p.pkg || '',
      s?.ex1_answers ? 'Y' : 'N',   ps?.ex1_answers ? 'Y' : 'N',
      s?.ex2_answers ? 'Y' : 'N',   ps?.ex2_answers ? 'Y' : 'N',
      s?.ex3_answers ? 'Y' : 'N',   ps?.ex3_answers ? 'Y' : 'N',
      budgetComplete ? 'Y' : 'N',
      w ? 'Y' : 'N',
      (o?.is_physical && o?.card_status === 'shipped') ? 'Y' : 'N',
    ];
  });
  return csvResponse(`attune_engagement_${new Date().toISOString().slice(0,10)}.csv`, toCSV(headers, rows));
}

// ── 4. RESULTS ─────────────────────────────────────────────────────────
// Full scored results. Per-partner axis scores + 10 dim scores +
// ex3 satisfaction scale questions.
async function exportResults(admin) {
  const { data: profiles } = await admin.from('profiles').select('id, invite_code');
  const { data: sessions } = await admin.from('exercise_sessions').select('user_id, ex1_answers, ex3_answers, couple_type');
  const { data: partnerRows } = await admin.from('partner_sessions').select('invite_code, ex1_answers, ex3_answers');

  const sessByUser = Object.fromEntries((sessions || []).map(s => [s.user_id, s]));
  const pbyCode    = Object.fromEntries((partnerRows || []).map(p => [p.invite_code, p]));

  const dimCols = (prefix) => Object.keys(DIM_KEYS).map(d => `${prefix}_${d}`);
  // Ex3 has three scale questions specifically for couple satisfaction.
  // Keys from ANNIVERSARY_QUESTIONS in src/App.jsx — sf_feel, sf_future, sf_growth.
  // If any of those change, keep this list in sync.
  const SATISFACTION_KEYS = ['sf_feel', 'sf_future', 'sf_growth'];
  const satCols = (prefix) => SATISFACTION_KEYS.map(k => `${prefix}_${k}`);

  const headers = [
    'anon_couple_id',
    'couple_type',
    'partner_a_engage_withdraw_score', 'partner_a_open_guarded_score',
    'partner_b_engage_withdraw_score', 'partner_b_open_guarded_score',
    ...dimCols('partner_a_comms'),
    ...dimCols('partner_b_comms'),
    ...satCols('partner_a_satisfaction'),
    ...satCols('partner_b_satisfaction'),
  ];

  const fmt = (n) => n == null ? '' : Number(n).toFixed(3);
  const rows = (profiles || []).map(p => {
    const s = sessByUser[p.id];
    const ps = p.invite_code ? pbyCode[p.invite_code] : null;
    const aScores = calcDimScores(s?.ex1_answers);
    const bScores = calcDimScores(ps?.ex1_answers);
    const aAxes = computeAxes(aScores);
    const bAxes = computeAxes(bScores);
    const aEx3 = s?.ex3_answers || {};
    const bEx3 = ps?.ex3_answers || {};
    const anonId = (p.id || '').replace(/-/g, '').slice(0, 8);

    return [
      anonId,
      s?.couple_type?.id || '',
      fmt(aAxes.withdrawScore), fmt(aAxes.openScore),
      fmt(bAxes.withdrawScore), fmt(bAxes.openScore),
      ...Object.keys(DIM_KEYS).map(d => fmt(aScores[d])),
      ...Object.keys(DIM_KEYS).map(d => fmt(bScores[d])),
      ...SATISFACTION_KEYS.map(k => aEx3[k] != null ? aEx3[k] : ''),
      ...SATISFACTION_KEYS.map(k => bEx3[k] != null ? bEx3[k] : ''),
    ];
  });
  return csvResponse(`attune_results_${new Date().toISOString().slice(0,10)}.csv`, toCSV(headers, rows));
}

// ── 5. FEEDBACK ────────────────────────────────────────────────────────
// Pulls the beta_survey responses from Vercel KV (same source as the
// admin Feedback page) and produces one column per question.
async function exportFeedback() {
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (!kvUrl || !kvToken) return errResponse(500, 'KV not configured (KV_REST_API_URL, KV_REST_API_TOKEN)');

  const res = await fetch(`${kvUrl}/lrange/feedback:beta_survey/0/-1`, {
    headers: { Authorization: `Bearer ${kvToken}` },
  });
  if (!res.ok) return errResponse(500, 'Could not fetch feedback from KV');
  const data = await res.json();
  const entries = (data.result || []).map(r => {
    try { return typeof r === 'string' ? JSON.parse(r) : r; } catch { return null; }
  }).filter(Boolean);

  if (entries.length === 0) {
    return csvResponse('attune_feedback_empty.csv', 'No feedback responses yet.');
  }

  // Discover all question keys across all responses, plus metadata.
  const allKeys = new Set();
  entries.forEach(e => {
    if (e && typeof e === 'object') {
      Object.keys(e).forEach(k => allKeys.add(k));
    }
  });
  const metaKeys = ['submitted_at', 'couple_type', 'pkg'];
  const questionKeys = [...allKeys].filter(k => !metaKeys.includes(k)).sort();
  const headers = [...metaKeys, ...questionKeys];

  const rows = entries.map(e => headers.map(k => e[k] != null ? e[k] : ''));
  return csvResponse(`attune_feedback_${new Date().toISOString().slice(0,10)}.csv`, toCSV(headers, rows));
}
