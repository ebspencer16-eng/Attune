/**
 * /api/admin-csv?type=...
 *
 * Generates one of five admin CSV reports. Server-side so we have access to
 * the service key (can read all rows across all tables) and can compute
 * derived scores the same way the client does.
 *
 * Supported types:
 *   ?type=orders        — one row per order, with addon + add-when columns
 *   ?type=demographics  — one row per couple: pronouns, rel length + status,
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
import { SATISFACTION_QUESTION_IDS } from './_anniversary-questions.js';
import { SURVEY_QUESTIONS } from './_lib/survey.js';
import { checkAdminAuth } from './_lib/admin-auth.js';

import { packageIncludes } from './_lib/ownership.js';

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

import { safeError } from './_lib/http.js';

// ── Scoring + typing now live in the shared engine (single source of truth,
// also used by the app, workbook, and admin typing endpoint). ──
import {
  personResults, readAccuracy, understandingBandFor, readBandFor, ALIGNMENT_THRESHOLD,
} from './_lib/results.js';
// Dimension scores for one person, blended against their partner's reads when
// those exist. Wraps the shared implementation so the exports below cannot
// drift from what couples actually see.
const scoresOf = (self, other) => {
  if (!self || !Object.keys(self).length) return {};
  const r = personResults(self, other && Object.keys(other).length ? other : null);
  return Object.fromEntries(Object.entries(r.dimensions).map(([d, v]) => [d, v.blended]));
};
import { DIM_KEYS, calcDimScores, blendedDimScores, axisScores, typeCodeFromAxes, lowConfidence } from './_type-engine.js';
/* Demo accounts are not people: see api/_lib/demo-accounts.js. */
import { demoOwners, selectProfiles, withoutDemoOrders } from './_lib/demo-accounts.js';
import { pageAll } from './_lib/page-all.js';

// Thin wrapper preserving this file's null-guard: a couple with no Exercise 1
// answers yields null axes/type rather than a midpoint default.
function computeAxes(scores) {
  const s = scores || {};
  if (s.conflict == null && s.stress == null && s.expression == null) {
    return { withdrawScore: null, openScore: null, typeCode: null };
  }
  const { withdrawScore, openScore } = axisScores(s);
  return { withdrawScore, openScore, typeCode: typeCodeFromAxes(withdrawScore, openScore) };
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

  // Secret gate — fail-closed. If ADMIN_SECRET isn't set in env, the endpoint
  // refuses to serve. Previously this was "if (adminSecret) check, else allow"
  // which exposed every customer's data via service-role queries to anyone
  // who knew the URL whenever the env var was unset.
  const _auth = checkAdminAuth(req);
  if (!_auth.ok) return errResponse(_auth.status, _auth.error);

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
    if (type === 'typing')        return await exportTyping(admin);
    if (type === 'feedback')      return await exportFeedback(admin);
    return errResponse(400, 'Unknown type. Use combined|combined_xlsx|orders|demographics|engagement|results|typing|feedback');
  } catch (e) {
    console.error('[admin-csv]', type, e);
    return errResponse(500, safeError('admin-csv', e, 'Export failed.'));
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
  /* ── THERE IS NO WORKBOOKS TABLE ────────────────────────────────────────
     Both exports used to ask one for `user_id, storage_path`. api/
     delete-account.js says so in a comment, having gone looking: workbook
     files live in the `workbooks` STORAGE BUCKET, and nothing in this product
     has ever written a row to a table of that name. The query comes back with
     an error that is never read, `workbooks` defaults to [], and the
     workbook_generated column has been N for every couple since the day it
     was added, including the ones holding a finished workbook.

     Where it actually lives is the order: store-workbook-pdf.js writes
     workbook_url and sets workbook_status to 'ready'. */
  const [profQ, ordersQ, _demo] = await Promise.all([
    selectProfiles(admin, (q) => q.select('id, invite_code, partner_profile_id, joined_via_invite, pkg, name, pronouns, relationship_status, relationship_length, budget_data, created_at, ex1_answers, ex2_answers, ex3_answers, ex3_completed, couple_type')),
    pageAll(() => admin.from('orders').select('*')),
    demoOwners(admin),
  ]);
  /* Both reads defaulted to an empty list and nothing looked at either error,
     so a failed query produced a CSV saying there are no customers. That is
     the same shape as the workbook column reading N for everybody. */
  const readErr = [profQ, ordersQ].find((q) => q && q.error);
  if (readErr) return errResponse(500, 'Could not read the data for this export');
  const profiles = profQ.data || [];
  const _orders = ordersQ.data || [];

  // Two lookups — one by id (for joining Partner A→B), one filtered to Partner A
  const byId = Object.fromEntries(profiles.map(p => [p.id, p]));
  const partnerAList = profiles.filter(p => p.invite_code && !p.joined_via_invite);

  /* A demo's test order is not a sale, here or on the pages. */
  const orders = withoutDemoOrders(_orders, _demo);

  const ordersByUser = {};
  orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).forEach(o => {
    if (o.user_id && !ordersByUser[o.user_id]) ordersByUser[o.user_id] = o;
  });

  // Column layout: [category_label, column_name]. Category only appears on
  // the first column of each span.
  const DIMS = Object.keys(DIM_KEYS);
  /* The three satisfaction scales, from the question set that defines them.
     This was ['sf_feel', 'sf_future', 'sf_growth'], and none of those three has
     ever been an id in ANNIVERSARY_QUESTIONS, so these six columns have always
     been empty. An empty column reads as a question nobody answered. */
  const SAT_KEYS = SATISFACTION_QUESTION_IDS;

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

    /* Pronouns, not gender: nothing in the product asks anybody their gender,
       so these two columns were empty in every row ever exported. */
    ['Demographics', 'partner_a_pronouns'],
    ['',             'partner_b_pronouns'],
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
    /**
     * ── ALIGNMENT AND UNDERSTANDING, FOR ELLIE ONLY ──────────────────────
     * Ellie: "I want this score available through admin and included in the
     * csv export and tied to users backend data so that I can dive into data
     * if I want, but I don't want users to be able to access those scores
     * (alignment and understanding) at all."
     *
     * So they are here and in the admin, and /api/results stops carrying the
     * understanding block to the device. Both figures come from
     * api/_lib/results.js rather than being worked out again: the gap that
     * counts as wide, how many wide dimensions make a couple misaligned, and
     * the bands that turn a mean error into a word.
     */
    ['Alignment', 'wide_gap_dimensions'],
    ['',          'alignment_group'],
    ['Understanding', 'partner_a_read_error'],
    ['',              'partner_b_read_error'],
    ['',              'understanding_error'],
    ['',              'understanding_band'],
    ['',              'partner_a_reads_partner'],
    ['',              'partner_b_reads_partner'],
    ['',              'understanding_lopsided'],
  ];


  const categoryRow = cols.map(c => c[0]);
  const nameRow = cols.map(c => c[1]);

  const fmt = (n) => n == null ? '' : Number(n).toFixed(3);

  const dataRows = partnerAList.map(p => {
    // p = Partner A profile. Partner B is the linked profile row.
    const ps = p.partner_profile_id ? byId[p.partner_profile_id] : null;
    const o = ordersByUser[p.id];
    const ex2a = p.ex2_answers || {};
    const ex2b = ps?.ex2_answers || {};
    // Scoring via api/_lib/results.js, the one implementation.
    const aScores = scoresOf(p.ex1_answers, ps?.ex1_answers);
    const bScores = scoresOf(ps?.ex1_answers, p.ex1_answers);
    const aAxes = computeAxes(aScores);
    const bAxes = computeAxes(bScores);
    const aEx3 = p.ex3_answers || {};
    const bEx3 = ps?.ex3_answers || {};
    const budgetComplete = p.budget_data && Object.keys(p.budget_data).length > 0;

    const { checklist: pkgHasChecklist, budget: pkgHasBudget, reflection: pkgHasReflection } =
      packageIncludes(o?.pkg_key);
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

    const anonId = (p.id || '').replace(/-/g, '').slice(0, 8);

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

      p.pronouns || '',
      ps?.pronouns || '',
      p.relationship_length || ps?.relationship_length || '',
      p.relationship_status || ps?.relationship_status || '',
      ex2a.childhoodStructure || '',
      ex2b.childhoodStructure || '',
      aAxes.typeCode || '',
      bAxes.typeCode || '',
      p.couple_type?.id || '',

      p.ex1_answers ? 'Y' : 'N',  ps?.ex1_answers ? 'Y' : 'N',
      p.ex2_answers ? 'Y' : 'N',  ps?.ex2_answers ? 'Y' : 'N',
      p.ex3_answers ? 'Y' : 'N',  ps?.ex3_answers ? 'Y' : 'N',
      budgetComplete ? 'Y' : 'N',
      workbookReady(o) ? 'Y' : 'N',
      (o?.is_physical && o?.card_status === 'shipped') ? 'Y' : 'N',

      fmt(aAxes.withdrawScore), fmt(aAxes.openScore),
      fmt(bAxes.withdrawScore), fmt(bAxes.openScore),
      ...DIMS.map(d => fmt(aScores[d])),
      ...DIMS.map(d => fmt(bScores[d])),
      ...SAT_KEYS.map(k => aEx3[k] != null ? aEx3[k] : ''),
      ...SAT_KEYS.map(k => bEx3[k] != null ? bEx3[k] : ''),
      ...alignmentAndUnderstanding(p, ps),
    ];

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

/**
 * The survey is not joined to anybody, on purpose.
 *
 * ── WHAT WAS HERE ─────────────────────────────────────────────────────────
 * A loader that keyed every survey answer by the email that gave it, so the
 * combined export carried one column per question beside the order and the
 * demographics. The old survey asked for an email, so it could.
 *
 * The survey says, above its first question, that the answers are anonymous.
 * That promise is kept here or nowhere: a spreadsheet with an answer in the
 * same row as an order is not anonymous, whatever the questionnaire said.
 *
 * The answers are exported on their own by the survey export below, with no
 * email, no name and no profile id.
 */

// ── 1. ORDERS ──────────────────────────────────────────────────────────
// Includes each add-on with Y/N + when (initial checkout, pre-results,
// post-results). "When" inference: addons present at order creation =
// initial checkout. Added later via upsell = post-results. We don't track
// pre-results upsells separately yet — flagged as TODO below.
async function exportOrders(admin) {
  /* A demo's test order is not a sale. The same rule as the admin pages. */
  const { data: _orders, error: oErr } = await pageAll(() => admin.from('orders').select('*'), { order: ['-created_at', 'id'] });
  /* Without this, a failed read exports a file saying no orders exist. */
  if (oErr) return errResponse(500, 'Could not read the orders table');
  const orders = withoutDemoOrders(_orders, await demoOwners(admin));

  const headers = [
    'order_num', 'order_date', 'package',
    'physical_or_digital', 'gift_or_self',
    'subtotal', 'tax', 'total', 'promo_code',
    'workbook_purchased', 'workbook_purchased_when',
    'reflection_purchased', 'reflection_purchased_when',
    'budget_purchased', 'budget_purchased_when',
    'checklist_purchased', 'checklist_purchased_when',
  ];

  // "When" inference: Addon columns in orders are set at checkout time
  // (addon_* fields). Post-results upsells write the same order row later.
  // To track when accurately we'd
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
    //   premium     → includes reflection + budget
    // Add-ons stack on top of package inclusions.
    const { checklist: pkgHasChecklist, budget: pkgHasBudget, reflection: pkgHasReflection } =
      packageIncludes(o.pkg_key);

    const hasWorkbook   = !!o.addon_workbook;
    const hasReflection = pkgHasReflection || !!o.addon_reflection;
    const hasBudget     = pkgHasBudget     || !!o.addon_budget;
    const hasChecklist  = pkgHasChecklist;  // No addon column today

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
      o.subtotal != null ? Number(o.subtotal).toFixed(2) : '',
      o.tax_amount != null ? Number(o.tax_amount).toFixed(2) : '',
      o.total != null ? Number(o.total).toFixed(2) : '',
      o.promo_code || '',
      hasWorkbook   ? 'Y' : 'N',   hasWorkbook   ? whenForAddon(o, 'addon_workbook') : '',
      hasReflection ? 'Y' : 'N',   hasReflection ? whenFor(pkgHasReflection, 'addon_reflection') : '',
      hasBudget     ? 'Y' : 'N',   hasBudget     ? whenFor(pkgHasBudget, 'addon_budget') : '',
      hasChecklist  ? 'Y' : 'N',   hasChecklist  ? 'initial_checkout' : '',
    ];
  });
  return csvResponse(`attune_orders_${new Date().toISOString().slice(0,10)}.csv`, toCSV(headers, rows));
}

// ── 2. DEMOGRAPHICS ────────────────────────────────────────────────────
// One row per couple in the unified model. Partner A rows have an
// invite_code and link to Partner B via partner_profile_id. Both
// partners' data lives on their respective profile rows.
async function exportDemographics(admin) {
  const { data: profiles, error: pErr } = await selectProfiles(admin, (q) => q.select('id, partner_profile_id, invite_code, joined_via_invite, pronouns, relationship_length, relationship_status, ex1_answers, ex2_answers, couple_type'));
  if (pErr) return errResponse(500, 'Could not read the profiles table');

  const byId = Object.fromEntries((profiles || []).map(p => [p.id, p]));
  const partnerAList = (profiles || []).filter(p => p.invite_code && !p.joined_via_invite);

  const headers = [
    'anon_couple_id',
    'partner_a_pronouns',
    'partner_b_pronouns',
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

    const aScores = scoresOf(p.ex1_answers, partnerB?.ex1_answers);
    const bScores = scoresOf(partnerB?.ex1_answers, p.ex1_answers);
    const aAxes = computeAxes(aScores);
    const bAxes = computeAxes(bScores);

    const anonId = (p.id || '').replace(/-/g, '').slice(0, 8);

    return [
      anonId,
      p.pronouns || '',
      partnerB?.pronouns || '',
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
/**
 * Whether a couple's workbook has actually been made.
 *
 * store-workbook-pdf.js writes both of these together, so either answers it;
 * the url is the one that survives a status column somebody forgot to set.
 */
/**
 * The nine figures at the end of a research row.
 *
 * ── WHY THEY ARE HERE AND NOWHERE A CUSTOMER CAN REACH ──────────────────
 * Ellie: "I want this score available through admin and included in the csv
 * export and tied to users backend data so that I can dive into data if I
 * want, but I don't want users to be able to access those scores (alignment
 * and understanding) at all."
 *
 * ── AND WHY NOTHING HERE DECIDES ANYTHING ───────────────────────────────
 * The gap that counts as wide, the number of wide dimensions that makes a
 * couple misaligned, and the bands that turn a mean error into a word all
 * come from api/_lib/results.js. This file scored with a plain average once,
 * where the engine weights, and the two answers were a point and a quarter
 * apart on a five point scale.
 *
 * Empty strings rather than zeros when a couple has not both answered: a zero
 * is a score and an empty cell is a couple who have not finished.
 */
function alignmentAndUnderstanding(a, b) {
  const blank = ['', '', '', '', '', '', '', '', ''];
  if (!a?.ex1_answers || !b?.ex1_answers) return blank;

  const mineScores = calcDimScores(a.ex1_answers);
  const theirScores = calcDimScores(b.ex1_answers);
  if (!mineScores || !theirScores) return blank;

  let wide = 0;
  let scored = 0;
  /* The dimensions from the engine, not the local alias inside the export
     function, which is not in scope here. */
  for (const d of Object.keys(DIM_KEYS)) {
    const x = mineScores[d];
    const y = theirScores[d];
    if (x == null || y == null) continue;
    scored += 1;
    if (Math.abs(x - y) >= ALIGNMENT_THRESHOLD.gap) wide += 1;
  }
  const alignment = scored
    ? [String(wide), wide >= ALIGNMENT_THRESHOLD.dims ? 'Misaligned' : 'Aligned']
    : ['', ''];

  /* How well each read the other, which needs the cross-view answers. */
  const aReads = readAccuracy(a.ex1_answers, b.ex1_answers);
  const bReads = readAccuracy(b.ex1_answers, a.ex1_answers);
  if (!aReads || !bReads) return [...alignment, '', '', '', '', '', '', ''];

  const mean = (aReads.meanError + bReads.meanError) / 2;
  return [
    ...alignment,
    aReads.meanError.toFixed(2),
    bReads.meanError.toFixed(2),
    mean.toFixed(2),
    understandingBandFor(mean).label,
    readBandFor(aReads.meanError).label,
    readBandFor(bReads.meanError).label,
    Math.abs(aReads.meanError - bReads.meanError) >= 0.4 ? 'Lopsided' : 'Even',
  ];
}

function workbookReady(order) {
  return !!order && (order.workbook_status === 'ready' || !!order.workbook_url);
}

async function exportEngagement(admin) {
  const { data: profiles, error: pErr } = await selectProfiles(admin, (q) => q.select('id, invite_code, partner_profile_id, joined_via_invite, pkg, budget_data, ex1_answers, ex2_answers, ex3_answers'));
  if (pErr) return errResponse(500, 'Could not read the profiles table');
  /* No workbooks table: see the note in the research export above. The order
     carries it. */
  const { data: orders, error: oErr } = await pageAll(() => admin.from('orders').select('user_id, addon_workbook, is_physical, workbook_status, workbook_url, card_status'));
  if (oErr) return errResponse(500, 'Could not read the orders table');

  const byId = Object.fromEntries((profiles || []).map(p => [p.id, p]));
  const partnerAList = (profiles || []).filter(p => p.invite_code && !p.joined_via_invite);

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
    const o = ordersByUser[p.id];
    const budgetComplete = p.budget_data && Object.keys(p.budget_data).length > 0;
    const anonId = (p.id || '').replace(/-/g, '').slice(0, 8);

    return [
      anonId, p.pkg || '',
      p.ex1_answers ? 'Y' : 'N',   ps?.ex1_answers ? 'Y' : 'N',
      p.ex2_answers ? 'Y' : 'N',   ps?.ex2_answers ? 'Y' : 'N',
      p.ex3_answers ? 'Y' : 'N',   ps?.ex3_answers ? 'Y' : 'N',
      budgetComplete ? 'Y' : 'N',
      workbookReady(o) ? 'Y' : 'N',
      (o?.is_physical && o?.card_status === 'shipped') ? 'Y' : 'N',
    ];
  });
  return csvResponse(`attune_engagement_${new Date().toISOString().slice(0,10)}.csv`, toCSV(headers, rows));
}

// ── 4. RESULTS ─────────────────────────────────────────────────────────
// Full scored results. Per-partner axis scores + 10 dim scores +
// ex3 satisfaction scale questions.
async function exportResults(admin) {
  const { data: profiles, error: pErr } = await selectProfiles(admin, (q) => q.select('id, invite_code, partner_profile_id, joined_via_invite, couple_type, ex1_answers, ex3_answers'));
  if (pErr) return errResponse(500, 'Could not read the profiles table');

  const byId = Object.fromEntries((profiles || []).map(p => [p.id, p]));
  const partnerAList = (profiles || []).filter(p => p.invite_code && !p.joined_via_invite);

  const dimCols = (prefix) => Object.keys(DIM_KEYS).map(d => `${prefix}_${d}`);
  /* The same three, and the second copy of them in this file. The comment here
     used to read "If any of those change, keep this list in sync", which is
     this codebase's failure mode given as an instruction. */
  const SATISFACTION_KEYS = SATISFACTION_QUESTION_IDS;
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
    // Scoring via api/_lib/results.js, the one implementation.
    const aScores = scoresOf(p.ex1_answers, ps?.ex1_answers);
    const bScores = scoresOf(ps?.ex1_answers, p.ex1_answers);
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

// ── TYPING ──────────────────────────────────────────────────────────────
// One row per INDIVIDUAL: 10 dimension scores, both axis scores, type code,
// low-confidence flag, and demographics. For offline factor/correlation work.
// Anonymized: an 8-char id slice, no name/email.
async function exportTyping(admin) {
  const { data: profiles, error: pErr } = await selectProfiles(admin, (q) => q
    .select('id, pronouns, relationship_status, relationship_length, ex1_answers, partner_profile_id'));
  if (pErr) return errResponse(500, 'Could not read the profiles table');
  const _byIdScored = Object.fromEntries((profiles || []).map(p => [p.id, p]));

  const dimCols = Object.keys(DIM_KEYS).map(d => `comms_${d}`);
  const headers = [
    'anon_id', 'pronouns', 'relationship_length', 'relationship_status',
    'engage_withdraw_score', 'open_guarded_score', 'type_code', 'low_confidence',
    ...dimCols,
  ];
  const fmt = (n) => n == null ? '' : Number(n).toFixed(3);
  const rows = (profiles || [])
    .filter(p => p.ex1_answers && Object.keys(p.ex1_answers).length)
    .map(p => {
      const _partner = p.partner_profile_id ? _byIdScored[p.partner_profile_id] : null;
      // Scoring via api/_lib/results.js, the one implementation.
      const _r = personResults(p.ex1_answers, _partner ? _partner.ex1_answers : null);
      const scores = Object.fromEntries(Object.entries(_r.dimensions).map(([d, v]) => [d, v.blended]));
      const withdrawScore = _r.axes.withdraw, openScore = _r.axes.open;
      return [
        (p.id || '').replace(/-/g, '').slice(0, 8),
        p.pronouns || '', p.relationship_length || '', p.relationship_status || '',
        fmt(withdrawScore), fmt(openScore),
        _r.typeCode, _r.lowConfidence ? 'Y' : 'N',
        ...Object.keys(DIM_KEYS).map(d => fmt(scores[d])),
      ];
    });
  return csvResponse(`attune_typing_${new Date().toISOString().slice(0,10)}.csv`, toCSV(headers, rows));
}

// ── 5. THE SURVEY ──────────────────────────────────────────────────────
// One row per response, one column per question, in the order the survey asks
// them. No email, no name, no profile id: the survey says its answers are
// anonymous, and this file is one of the two places that promise is kept.
//
// It read two retired row types until migration 079 deleted them, and before
// that it read a Vercel KV key nothing had written for months, which is how a
// button in the admin came to return an error.

async function exportFeedback(admin) {
  /* `respondent_id` is read and never written, the same way api/admin-survey.js
     reads it: it is how a demo's answers are left out, and the row that reaches
     the file carries no id, no name and no email. */
  const { data, error } = await pageAll(() => admin
    .from('survey_responses')
    .select('answers, version, source, started_at, updated_at, completed_at, respondent_id'),
    { order: ['-updated_at', 'id'] });
  if (error) return errResponse(500, 'Could not read the survey table');
  const { ids: demoRespondents } = await demoOwners(admin);
  const entries = (data || [])
    .filter((r) => !(r.respondent_id && demoRespondents.has(r.respondent_id)))
    .map(({ respondent_id: _who, ...rest }) => rest);

  if (entries.length === 0) {
    return csvResponse('attune_survey_empty.csv', 'Nobody has answered the survey yet.');
  }

  /* The questions, in the order they are asked, from the module that defines
     them. Discovering the columns from the rows would put them in whatever
     order the first response happened to have, and would silently drop a
     question nobody has answered yet, which is the one worth noticing. */
  const metaKeys = ['started', 'last_answered', 'finished', 'where', 'version'];
  const headers = [...metaKeys, ...SURVEY_QUESTIONS.map((q) => q.id)];
  const cell = (v) => {
    if (v == null) return '';
    if (Array.isArray(v)) return v.join(' > ');   // the ranking, in order
    return String(v);
  };
  const rows = entries.map((r) => [
    r.started_at || '',
    r.updated_at || '',
    r.completed_at || '',
    r.source || '',
    r.version || '',
    ...SURVEY_QUESTIONS.map((q) => cell((r.answers || {})[q.id])),
  ]);
  return csvResponse(`attune_survey_${new Date().toISOString().slice(0, 10)}.csv`, toCSV(headers, rows));
}

