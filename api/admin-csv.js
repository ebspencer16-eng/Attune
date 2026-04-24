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
    if (type === 'combined')      return await exportCombined(admin);
    if (type === 'combined_xlsx') return await exportCombinedXlsx(admin);
    if (type === 'orders')        return await exportOrders(admin);
    if (type === 'demographics')  return await exportDemographics(admin);
    if (type === 'engagement')    return await exportEngagement(admin);
    if (type === 'results')       return await exportResults(admin);
    if (type === 'feedback')      return await exportFeedback();
    return errResponse(400, 'Unknown type. Use combined|combined_xlsx|orders|demographics|engagement|results|feedback');
  } catch (e) {
    console.error('[admin-csv]', type, e);
    return errResponse(500, 'Export failed: ' + (e.message || e));
  }
}

// ── 0. COMBINED ─────────────────────────────────────────────────────────
// One row per couple with ALL fields across every category, plus a top
// header row naming the category over each group of columns.
//
// For CSV: we place the category label in the first column of each span
// and leave the rest blank. Excel/Sheets displays this visually like a
// merged header and filters applied on row 2 still work.
//
// For XLSX: we use real merged cells via SheetJS !merges. Bold headers,
// frozen panes, and an auto-filter on row 2.
//
// The data-building is shared between CSV and XLSX paths so the only
// difference is the output format.
async function buildCombinedData(admin) {
  // ── Gather everything we need in parallel ─────────────────────────────
  // In the unified model, both partners are rows in `profiles`. Partner A
  // has an invite_code; Partner B has joined_via_invite=true. They link to
  // each other via partner_profile_id.
  //
  // To produce one row per COUPLE, we iterate over Partner A's rows
  // (i.e. rows with an invite_code) and join to Partner B via the
  // partner_profile_id FK.
  //
  // Exercise answers are read directly from profiles.ex{1,2,3}_answers —
  // no more partner_sessions or exercise_sessions lookups.
  const [
    { data: profiles = [] },
    { data: workbooks = [] },
    { data: orders = [] },
  ] = await Promise.all([
    admin.from('profiles').select('id, invite_code, partner_profile_id, joined_via_invite, pkg, name, gender, relationship_status, relationship_length, budget_data, created_at, ex1_answers, ex2_answers, ex3_answers, ex3_completed'),
    admin.from('workbooks').select('user_id, storage_path'),
    admin.from('orders').select('*'),
  ]);

  // Two lookups — one by id (for joining Partner A→B), one filtered to Partner A
  const byId = Object.fromEntries(profiles.map(p => [p.id, p]));
  const partnerAList = profiles.filter(p => p.invite_code && !p.joined_via_invite);

  const wbByUser   = Object.fromEntries(workbooks.map(w => [w.user_id, w]));
  const ordersByUser = {};
  orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).forEach(o => {
    if (o.user_id && !ordersByUser[o.user_id]) ordersByUser[o.user_id] = o;
  });

  const feedbackByEmail = await loadFeedbackByEmail();

  // Column layout: [category_label, column_name]. Category only appears on
  // the first column of each span.
  const DIMS = Object.keys(DIM_KEYS);
  const SAT_KEYS = ['sf_feel', 'sf_future', 'sf_growth'];

  const cols = [
    ['Identity', 'anon_couple_id'],
    ['',         'signed_up_at'],
    ['',         'package'],

    ['Order details', 'order_num'],
    ['',              'order_date'],
    ['',              'physical_or_digital'],
    ['',              'gift_or_self'],
    ['',              'workbook_purchased'],
    ['',              'workbook_when'],
    ['',              'reflection_purchased'],
    ['',              'reflection_when'],
    ['',              'budget_purchased'],
    ['',              'budget_when'],
    ['',              'checklist_purchased'],
    ['',              'checklist_when'],
    ['',              'lmft_purchased'],
    ['',              'lmft_when'],

    ['Demographics', 'partner_a_gender'],
    ['',             'partner_b_gender'],
    ['',             'relationship_length'],
    ['',             'marital_status'],
    ['',             'partner_a_childhood_context'],
    ['',             'partner_b_childhood_context'],
    ['',             'partner_a_individual_type'],
    ['',             'partner_b_individual_type'],
    ['',             'couple_type'],

    ['Engagement', 'partner_a_comms_complete'],
    ['',           'partner_b_comms_complete'],
    ['',           'partner_a_expectations_complete'],
    ['',           'partner_b_expectations_complete'],
    ['',           'partner_a_reflection_complete'],
    ['',           'partner_b_reflection_complete'],
    ['',           'partner_a_budget_complete'],
    ['',           'workbook_generated'],
    ['',           'workbook_shipped'],

    ['Results', 'partner_a_engage_withdraw_score'],
    ['',        'partner_a_open_guarded_score'],
    ['',        'partner_b_engage_withdraw_score'],
    ['',        'partner_b_open_guarded_score'],
    ...DIMS.map(d => ['', `partner_a_comms_${d}`]),
    ...DIMS.map(d => ['', `partner_b_comms_${d}`]),
    ...SAT_KEYS.map(k => ['', `partner_a_satisfaction_${k}`]),
    ...SAT_KEYS.map(k => ['', `partner_b_satisfaction_${k}`]),
  ];

  // Discover feedback keys dynamically
  const feedbackKeys = new Set();
  Object.values(feedbackByEmail).forEach(fb => {
    Object.keys(fb || {}).forEach(k => feedbackKeys.add(k));
  });
  const SKIP_FB = new Set(['email', 'user_id', 'submitted_at']);
  const feedbackCols = [...feedbackKeys].filter(k => !SKIP_FB.has(k)).sort();
  if (feedbackCols.length > 0) {
    // First feedback column gets the 'Feedback' category label
    cols.push(['Feedback', 'feedback_submitted_at']);
    feedbackCols.forEach(fk => cols.push(['', `feedback_${fk}`]));
  }

  const categoryRow = cols.map(c => c[0]);
  const nameRow = cols.map(c => c[1]);

  const fmt = (n) => n == null ? '' : Number(n).toFixed(3);

  const dataRows = partnerAList.map(p => {
    // p = Partner A profile. Partner B is the linked profile row.
    const ps = p.partner_profile_id ? byId[p.partner_profile_id] : null;
    const w = wbByUser[p.id];
    const o = ordersByUser[p.id];
    const ex2a = p.ex2_answers || {};
    const ex2b = ps?.ex2_answers || {};
    const aScores = calcDimScores(p.ex1_answers);
    const bScores = calcDimScores(ps?.ex1_answers);
    const aAxes = computeAxes(aScores);
    const bAxes = computeAxes(bScores);
    const aEx3 = p.ex3_answers || {};
    const bEx3 = ps?.ex3_answers || {};
    const budgetComplete = p.budget_data && Object.keys(p.budget_data).length > 0;

    const pkgHasChecklist   = o?.pkg_key === 'newlywed';
    const pkgHasBudget      = o?.pkg_key === 'newlywed' || o?.pkg_key === 'premium';
    const pkgHasReflection  = o?.pkg_key === 'anniversary' || o?.pkg_key === 'premium';
    const pkgHasLMFT        = o?.pkg_key === 'premium';
    const whenHeuristic = (o_, field) => {
      if (!o_ || !o_[field]) return '';
      if (!o_.updated_at || !o_.created_at) return 'initial_checkout';
      return (new Date(o_.updated_at) - new Date(o_.created_at)) < 3.6e6 ? 'initial_checkout' : 'post_results';
    };
    const whenFor = (pkgIncluded, field) => {
      if (pkgIncluded) return 'initial_checkout';
      return whenHeuristic(o, field);
    };
    const hasWorkbook   = !!o?.addon_workbook;
    const hasReflection = pkgHasReflection || !!o?.addon_reflection;
    const hasBudget     = pkgHasBudget     || !!o?.addon_budget;
    const hasChecklist  = pkgHasChecklist;
    const hasLMFT       = pkgHasLMFT       || !!o?.addon_lmft;

    const anonId = (p.id || '').replace(/-/g, '').slice(0, 8);
    const fb = (o?.buyer_email && feedbackByEmail[o.buyer_email.toLowerCase()]) || null;

    const row = [
      anonId,
      p.created_at ? new Date(p.created_at).toISOString().slice(0,10) : '',
      p.pkg || '',

      o?.order_num || '',
      o?.created_at ? new Date(o.created_at).toISOString().slice(0,10) : '',
      o?.is_physical ? 'physical' : (o ? 'digital' : ''),
      o?.is_gift ? 'gift' : (o ? 'self' : ''),
      hasWorkbook   ? 'Y' : 'N',  hasWorkbook   ? whenHeuristic(o, 'addon_workbook') : '',
      hasReflection ? 'Y' : 'N',  hasReflection ? whenFor(pkgHasReflection, 'addon_reflection') : '',
      hasBudget     ? 'Y' : 'N',  hasBudget     ? whenFor(pkgHasBudget, 'addon_budget') : '',
      hasChecklist  ? 'Y' : 'N',  hasChecklist  ? 'initial_checkout' : '',
      hasLMFT       ? 'Y' : 'N',  hasLMFT       ? whenFor(pkgHasLMFT, 'addon_lmft') : '',

      p.gender || '',
      ps?.gender || '',
      p.relationship_length || ps?.relationship_length || '',
      p.relationship_status || ps?.relationship_status || '',
      ex2a.childhoodStructure || '',
      ex2b.childhoodStructure || '',
      aAxes.typeCode || '',
      bAxes.typeCode || '',
      s?.couple_type?.id || '',

      s?.ex1_answers ? 'Y' : 'N',  ps?.ex1_answers ? 'Y' : 'N',
      s?.ex2_answers ? 'Y' : 'N',  ps?.ex2_answers ? 'Y' : 'N',
      s?.ex3_answers ? 'Y' : 'N',  ps?.ex3_answers ? 'Y' : 'N',
      budgetComplete ? 'Y' : 'N',
      w ? 'Y' : 'N',
      (o?.is_physical && o?.card_status === 'shipped') ? 'Y' : 'N',

      fmt(aAxes.withdrawScore), fmt(aAxes.openScore),
      fmt(bAxes.withdrawScore), fmt(bAxes.openScore),
      ...DIMS.map(d => fmt(aScores[d])),
      ...DIMS.map(d => fmt(bScores[d])),
      ...SAT_KEYS.map(k => aEx3[k] != null ? aEx3[k] : ''),
      ...SAT_KEYS.map(k => bEx3[k] != null ? bEx3[k] : ''),
    ];

    if (feedbackCols.length > 0) {
      row.push(fb?.submitted_at || '');
      feedbackCols.forEach(fk => row.push(fb?.[fk] != null ? fb[fk] : ''));
    }
    return row;
  });

  return { categoryRow, nameRow, dataRows };
}

async function exportCombined(admin) {
  const { categoryRow, nameRow, dataRows } = await buildCombinedData(admin);
  const csv = [
    categoryRow.map(csvEscape).join(','),
    nameRow.map(csvEscape).join(','),
    ...dataRows.map(r => r.map(csvEscape).join(','))
  ].join('\n');
  return csvResponse(`attune_all_${new Date().toISOString().slice(0,10)}.csv`, csv);
}

// ── 0b. COMBINED XLSX ───────────────────────────────────────────────────
// Same data as exportCombined but as a native XLSX file with actual merged
// cells on the category row, bold headers, frozen top 2 rows, and an
// auto-filter on row 2. Uses SheetJS (xlsx package).
async function exportCombinedXlsx(admin) {
  const XLSX = (await import('xlsx')).default || (await import('xlsx'));
  const { categoryRow, nameRow, dataRows } = await buildCombinedData(admin);

  // Build worksheet from arrays-of-arrays
  const aoa = [categoryRow, nameRow, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Compute merges for the category row (row 0). A category span starts
  // wherever a non-empty label appears and continues until the next
  // non-empty label (or the end of the row).
  const merges = [];
  let spanStart = null;
  for (let c = 0; c < categoryRow.length; c++) {
    const label = categoryRow[c];
    if (label) {
      // Close any prior span
      if (spanStart !== null && c - 1 > spanStart) {
        merges.push({ s: { r: 0, c: spanStart }, e: { r: 0, c: c - 1 } });
      }
      spanStart = c;
    }
  }
  // Close the final span
  if (spanStart !== null && spanStart < categoryRow.length - 1) {
    merges.push({ s: { r: 0, c: spanStart }, e: { r: 0, c: categoryRow.length - 1 } });
  }
  ws['!merges'] = merges;

  // Style: category row bold + centered, column-name row bold.
  // SheetJS free version supports the `s` property on cells when the file
  // is written with cellStyles: true. Note: full styling requires the Pro
  // version; we set basic alignment + bold that the free writer supports.
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let c = range.s.c; c <= range.e.c; c++) {
    const topAddr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[topAddr]) ws[topAddr].s = { font: { bold: true, sz: 12 }, alignment: { horizontal: 'center' }, fill: { fgColor: { rgb: 'F3EDE6' } } };
    const nameAddr = XLSX.utils.encode_cell({ r: 1, c });
    if (ws[nameAddr]) ws[nameAddr].s = { font: { bold: true, sz: 10 }, alignment: { horizontal: 'left' } };
  }

  // Freeze the two header rows + set auto-filter on row 2 so users can
  // immediately filter/sort every column.
  ws['!freeze'] = { xSplit: 0, ySplit: 2 };
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({
    s: { r: 1, c: 0 },
    e: { r: Math.max(1, dataRows.length + 1), c: categoryRow.length - 1 },
  }) };

  // Column widths — guess based on header length; Excel will honor these
  // as initial widths, users can adjust.
  ws['!cols'] = nameRow.map(n => ({ wch: Math.max(12, Math.min(28, n.length + 2)) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attune data');

  // Write to buffer. `type: 'buffer'` returns a Node Buffer we can return.
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });

  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="attune_all_${new Date().toISOString().slice(0,10)}.xlsx"`,
    },
  });
}

// Pull feedback responses from Vercel KV and key by email where possible.
// Returns { [email_lowercased]: response_object }
async function loadFeedbackByEmail() {
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (!kvUrl || !kvToken) return {};
  try {
    const res = await fetch(`${kvUrl}/lrange/feedback:beta_survey/0/-1`, {
      headers: { Authorization: `Bearer ${kvToken}` },
    });
    if (!res.ok) return {};
    const data = await res.json();
    const entries = (data.result || []).map(r => {
      try { return typeof r === 'string' ? JSON.parse(r) : r; } catch { return null; }
    }).filter(Boolean);

    const byEmail = {};
    entries.forEach(e => {
      const email = (e.email || '').toLowerCase();
      if (email) {
        // Keep the most recent response if a user answered multiple times
        const prev = byEmail[email];
        if (!prev || new Date(e.submitted_at || 0) > new Date(prev.submitted_at || 0)) {
          byEmail[email] = e;
        }
      }
    });
    return byEmail;
  } catch {
    return {};
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
// One row per couple in the unified model. Partner A rows have an
// invite_code and link to Partner B via partner_profile_id. Both
// partners' data lives on their respective profile rows.
async function exportDemographics(admin) {
  const { data: profiles } = await admin.from('profiles').select('id, partner_profile_id, invite_code, joined_via_invite, gender, relationship_length, relationship_status, ex1_answers, ex2_answers, couple_type');

  const byId = Object.fromEntries((profiles || []).map(p => [p.id, p]));
  const partnerAList = (profiles || []).filter(p => p.invite_code && !p.joined_via_invite);

  const headers = [
    'anon_couple_id',
    'partner_a_gender',
    'partner_b_gender',
    'relationship_length',
    'marital_status',
    'partner_a_childhood_context',
    'partner_b_childhood_context',
    'partner_a_individual_type',
    'partner_b_individual_type',
    'couple_type',
  ];

  const rows = partnerAList.map(p => {
    const partnerB = p.partner_profile_id ? byId[p.partner_profile_id] : null;

    const ex2a = p.ex2_answers || {};
    const ex2b = partnerB?.ex2_answers || {};

    const aScores = calcDimScores(p.ex1_answers);
    const bScores = calcDimScores(partnerB?.ex1_answers);
    const aAxes = computeAxes(aScores);
    const bAxes = computeAxes(bScores);

    const anonId = (p.id || '').replace(/-/g, '').slice(0, 8);

    return [
      anonId,
      p.gender || '',
      partnerB?.gender || '',
      p.relationship_length || partnerB?.relationship_length || '',
      p.relationship_status || partnerB?.relationship_status || '',
      ex2a.childhoodStructure || '',
      ex2b.childhoodStructure || '',
      aAxes.typeCode || '',
      bAxes.typeCode || '',
      p.couple_type?.id || '',
    ];
  });
  return csvResponse(`attune_demographics_${new Date().toISOString().slice(0,10)}.csv`, toCSV(headers, rows));
}

// ── 3. ENGAGEMENT ──────────────────────────────────────────────────────
// One row per couple. Y/N for each exercise + workbook download/ship.
async function exportEngagement(admin) {
  const { data: profiles } = await admin.from('profiles').select('id, invite_code, partner_profile_id, joined_via_invite, pkg, budget_data, ex1_answers, ex2_answers, ex3_answers');
  const { data: workbooks } = await admin.from('workbooks').select('user_id, storage_path, generated_at');
  const { data: orders } = await admin.from('orders').select('user_id, addon_workbook, is_physical, workbook_status, card_status');

  const byId = Object.fromEntries((profiles || []).map(p => [p.id, p]));
  const partnerAList = (profiles || []).filter(p => p.invite_code && !p.joined_via_invite);

  const wbByUser = Object.fromEntries((workbooks || []).map(w => [w.user_id, w]));
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

  const rows = partnerAList.map(p => {
    const ps = p.partner_profile_id ? byId[p.partner_profile_id] : null;
    const w = wbByUser[p.id];
    const o = ordersByUser[p.id];
    const budgetComplete = p.budget_data && Object.keys(p.budget_data).length > 0;
    const anonId = (p.id || '').replace(/-/g, '').slice(0, 8);

    return [
      anonId, p.pkg || '',
      p.ex1_answers ? 'Y' : 'N',   ps?.ex1_answers ? 'Y' : 'N',
      p.ex2_answers ? 'Y' : 'N',   ps?.ex2_answers ? 'Y' : 'N',
      p.ex3_answers ? 'Y' : 'N',   ps?.ex3_answers ? 'Y' : 'N',
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
  const { data: profiles } = await admin.from('profiles').select('id, invite_code, partner_profile_id, joined_via_invite, couple_type, ex1_answers, ex3_answers');

  const byId = Object.fromEntries((profiles || []).map(p => [p.id, p]));
  const partnerAList = (profiles || []).filter(p => p.invite_code && !p.joined_via_invite);

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
  const rows = partnerAList.map(p => {
    const ps = p.partner_profile_id ? byId[p.partner_profile_id] : null;
    const aScores = calcDimScores(p.ex1_answers);
    const bScores = calcDimScores(ps?.ex1_answers);
    const aAxes = computeAxes(aScores);
    const bAxes = computeAxes(bScores);
    const aEx3 = p.ex3_answers || {};
    const bEx3 = ps?.ex3_answers || {};
    const anonId = (p.id || '').replace(/-/g, '').slice(0, 8);

    return [
      anonId,
      p.couple_type?.id || '',
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
