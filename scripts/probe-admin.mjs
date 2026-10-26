#!/usr/bin/env node
/**
 * Render the admin with stubbed data and take a picture of it.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * Ellie, after a round of admin changes: "Still seeing gridlines and x axis
 * labels on the type distribution pie charts, I shouldn't. Also, couple type
 * distribution pie chart still says loading and it's been minutes." And:
 * "I'm worried about your quality of work."
 *
 * She was right. Those changes were checked by reading the code and running
 * the gates, and the gates have nothing to say about a chart: check-admin-html
 * parses the inline scripts and check-tag-closure counts brackets. Neither can
 * see that a tile was handed a div instead of a canvas, which is what made
 * that pie sit on "Loading" for ever.
 *
 * So this draws it. The admin is one static page whose charts all come from
 * /api/admin-explore, so stubbing that one endpoint is enough to get every
 * tile on screen with believable numbers.
 *
 * ── WHAT IT IS NOT ────────────────────────────────────────────────────────
 * Not a gate, and not in `npm run check`: it needs Chrome, it takes a few
 * seconds, and its output is a picture for a person rather than a pass or a
 * fail. It is the thing to run before saying an admin chart works.
 *
 *   node scripts/probe-admin.mjs responses
 *   node scripts/probe-admin.mjs types
 *
 * It reports anything the page logged to console.error, which is how a chart
 * that failed to draw announces itself now.
 */

import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { launch } from './_lib/browser.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const PAGE = process.argv[2] || 'responses';
const OUT = process.env.OUT || `admin-${PAGE}.png`;

/* ── THE STUB ──────────────────────────────────────────────────────────────
   Shaped like the real cube: a `fields` catalogue and one row per person.
   Built from the product's own question sets so a renamed question or a new
   option shows up here rather than being invented. */
const { CONFLICT_QUESTIONS, FREQUENCY_OPTIONS } = await import(`${ROOT}api/_conflict-questions.js`);
/* The derived fields are computed the way the server computes them, not typed
   out here. CLAUDE.md: a hand-typed answer set is a guess about what the
   product stores. The first version of this stub guessed, and it never once
   drew the two axis tiles or the gender tile, because it had no axis_w, no
   axis_o and no pronouns. Seven tiles said "Loading" or "No data yet" and the
   probe reported no error, which is a harness saying nothing about a third of
   the page. */
const { calcDimScores, axisScores, typeCodeFromAxes, DIM_KEYS } = await import(`${ROOT}api/_type-engine.js`);
const { COMPILED_BETA_CODES: COMPILED_CODES } = await import(`${ROOT}api/_lib/beta-codes.js`);
const { PERSONALITY_QUESTIONS } = await import(`${ROOT}api/_questions.js`);
const { pronounLabel } = await import(`${ROOT}api/_lib/pronouns.js`);
const { guardiansOf, CHILDHOOD_ROLES } = await import(`${ROOT}api/_questions.js`);
const { INTIMACY_QUESTIONS } = await import(`${ROOT}api/_intimacy-questions.js`);

const DIMS = ['energy', 'expression', 'reassurance', 'love', 'needs', 'bids', 'listening', 'conflict', 'repair', 'feedback'];
const TYPES = ['W', 'X', 'Y', 'Z'];
const COUPLE_TYPES = ['WW', 'WX', 'WY', 'WZ', 'XX', 'XY', 'XZ', 'YY', 'YZ', 'ZZ'];
const pick = (a, i) => a[i % a.length];

const GUARDIAN_OPTS = [...CHILDHOOD_ROLES, 'Something else'].map((v) => ({ v, label: v }));
const fields = [
  { key: 'type', label: 'Individual type', group: 'Type & axes', kind: 'cat', options: TYPES.map((v) => ({ v, label: v })), partnerable: true },
  /* The Growing up slicers Ellie asked for. */
  { key: 'guardian_a', label: 'Guardian 1', group: 'Growing up', kind: 'cat', options: GUARDIAN_OPTS, partnerable: true },
  { key: 'guardian_b', label: 'Guardian 2', group: 'Growing up', kind: 'cat', options: GUARDIAN_OPTS, partnerable: true },
  { key: 'guardian_pair', label: 'Guardians, as a pair', group: 'Growing up', kind: 'cat', partnerable: true },
  { key: 'guardian_count', label: 'How many adults', group: 'Growing up', kind: 'cat', options: [{ v: 'One adult', label: 'One adult' }, { v: 'Two adults', label: 'Two adults' }], partnerable: true },
  { key: 'guardian_mom', label: 'Had a mom', group: 'Growing up', kind: 'cat', options: [{ v: 'Yes', label: 'Yes' }, { v: 'No', label: 'No' }], partnerable: true },
  { key: 'guardian_dad', label: 'Had a dad', group: 'Growing up', kind: 'cat', options: [{ v: 'Yes', label: 'Yes' }, { v: 'No', label: 'No' }], partnerable: true },
  { key: 'couple_type', label: 'Couple type', group: 'Type & axes', kind: 'cat' },
  ...DIMS.map((d) => ({ key: `dim_${d}`, label: d, group: 'Dimensions (score 1–5)', kind: 'scale', partnerable: true })),
  ...CONFLICT_QUESTIONS.flatMap((q) => {
    let options = null;
    if (q.kind === 'scale') options = (q.options || []).map((o) => ({ v: o.label, label: o.label }));
    else if (q.kind === 'frequency') options = FREQUENCY_OPTIONS.map((o) => ({ v: o.label, label: o.label }));
    else if (q.kind === 'forcedAB') options = [{ v: q.a, label: q.a }, { v: q.b, label: q.b }];
    else if (q.kind === 'pickOne') options = (q.options || []).map((o) => ({ v: o.label || o, label: o.label || o }));
    if (!options) return [];
    return [{ key: `cq_${q.id}`, label: (q.riskLabel ? `${q.riskLabel} · ` : '') + q.text, group: 'Conflict Patterns', kind: 'cat', options, partnerable: true, section: q.section }];
  }),
  ...INTIMACY_QUESTIONS.filter((q) => q.kind !== 'multi').slice(0, 6).map((q) => ({
    key: `iq_${q.id}`, label: q.premarital || q.id, group: 'Physical Intimacy', kind: 'cat',
    options: (q.options || []).map((o) => ({ v: o.label, label: o.label })), partnerable: true,
    dim: q.dimension, dimLabel: q.dimension,
  })),
];

const rows = [];
const PRONOUNS = ['she/her', 'he/him', 'they/them', 'she/they'];
const AGES = ['25-34', '35-44', '45-54', '18-24'];
const STATUS = ['Engaged', 'Married', 'Dating', 'Partnered'];
const LENGTH = ['1-2 years', '3-5 years', '6-10 years', 'Over 10 years'];
const SOURCE = ['Instagram', 'A friend', 'Search', 'Therapist'];

for (let i = 0; i < 40; i++) {
  /* A real answer set, run through the server's own scorer, so every derived
     field the page reads exists and agrees with how it is really produced. */
  const ex1 = {};
  PERSONALITY_QUESTIONS.forEach((q, k) => { ex1[q.id] = 1 + ((i + k * 3) % 5); });
  const scores = calcDimScores(ex1);
  const { withdrawScore, openScore } = axisScores(scores);
  const type = typeCodeFromAxes(withdrawScore, openScore);

  const r = {
    couple_id: 'c' + Math.floor(i / 2),
    type,
    couple_type: pick(COUPLE_TYPES, Math.floor(i / 2)),
    axisEngage: type == null ? null : (type === 'W' || type === 'X' ? 'Engage' : 'Withdraw'),
    axisOpen: type == null ? null : (type === 'W' || type === 'Y' ? 'Open' : 'Guarded'),
    axis_w: Number.isFinite(withdrawScore) ? Number(withdrawScore.toFixed(3)) : null,
    axis_o: Number.isFinite(openScore) ? Number(openScore.toFixed(3)) : null,
    pkg: pick(['core', 'newlywed', 'anniversary', 'premium'], i),
    has_ex1: true,
    has_ex2: i % 3 !== 0,
    has_ex3: i % 4 === 0,
    has_intimacy: i % 5 === 0,
    pronouns: pronounLabel(pick(PRONOUNS, i)),
    /* Who raised them, so the new Growing up slicers have something to
       draw. Mixed on purpose: two-parent, single, grandparents and a
       typed word that no role matches. */
    ...(() => {
      const sets = [
        { a: 'Mom', b: 'Dad', solo: false },
        { a: 'Mom', b: 'Stepdad', solo: false },
        { a: 'Grandma', b: 'Grandpa', solo: false },
        { a: 'Mom', b: '', solo: true },
        { a: 'Mrs Patel', b: '', solo: true },
      ];
      const g = guardiansOf({ childhoodAdults: pick(sets, i) });
      return {
        guardian_a: g.a || 'Something else',
        guardian_b: g.solo ? null : (g.b || 'Something else'),
        guardian_pair: g.pair,
        guardian_count: g.count,
        guardian_mom: g.hadMom ? 'Yes' : 'No',
        guardian_dad: g.hadDad ? 'Yes' : 'No',
      };
    })(),
    age_range: pick(AGES, i),
    relationship_status: pick(STATUS, i),
    relationship_length: pick(LENGTH, i),
    children: i % 3 === 0 ? 'No' : 'Yes',
    signup_source: pick(SOURCE, i),
  };
  for (const dim of Object.keys(DIM_KEYS)) {
    r['dim_' + dim] = scores[dim] != null ? Number(Number(scores[dim]).toFixed(3)) : null;
  }
  for (const q of PERSONALITY_QUESTIONS) r['q_' + q.id] = ex1[q.id];
  DIMS.forEach((d, k) => { r[`p_pvdim_${d}`] = 2 + ((i + k + 1) % 3); });
  for (const f of fields) {
    if (!f.options || !f.options.length) continue;
    if (f.key.startsWith('cq_') || f.key.startsWith('iq_')) {
      r[f.key] = pick(f.options, i + f.key.length).v;
      r['p_' + f.key] = pick(f.options, i + 1 + f.key.length).v;
    }
  }
  rows.push(r);
}
/* ── ORDERS ────────────────────────────────────────────────────────────────
   The cube's orders were an empty array, so every tile on the Package Mix page
   drew nothing and the probe said nothing about them. That is the same hole
   the header above describes: a harness that is silent about a third of the
   page.

   Spread across the four packages and twelve months so the stacked column and
   the period slicer both have something to cut. Half of them carry a promo
   code, because that is what the system actually holds today and because the
   add-on chart is specifically about orders whose add-ons came from a code
   rather than from a line item.

   `addons` is computed by the module the server uses, not typed out. That is
   deliberate and it is also the limit of what this proves: it shows the chart
   DRAWS what it is given. Whether the rule is right is check's job, not a
   picture's. */
const { addonsOnOrder } = await import(`${ROOT}api/_lib/order-addons.js`);
const PKGS = ['core', 'newlywed', 'anniversary', 'premium'];
const STUB_CODE = { includesIntimacy: true, includesBudget: true };
const orders = [];
for (let i = 0; i < 48; i++) {
  const d = new Date();
  d.setMonth(d.getMonth() - (i % 12));
  const pkg = PKGS[i % PKGS.length];
  /* Codes the lookup will actually resolve: eleven of the compiled ones, plus
     the two issued ones, plus one that is in no list at all so the "Unknown"
     bucket is still exercised rather than being assumed empty. */
  const CODE_POOL = [...Object.keys(COMPILED_CODES).slice(0, 11), 'SPRING25', 'FRIENDS10', 'GONE-FROM-THE-TABLE'];
  const promo = i % 2 === 0 ? CODE_POOL[i % CODE_POOL.length] : null;
  const row = {
    pkg_key: pkg,
    addon_workbook: i % 7 === 0,
    addon_reflection: i % 5 === 0,
    addon_budget: false,
    addon_intimacy: false,
    addon_checklist: i % 6 === 0,
    addon_conflict: i % 4 === 0,
  };
  orders.push({
    month: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
    ts: d.toISOString(),
    amount: promo ? 0 : [99, 149, 199, 295][i % 4],
    order_pkg: pkg,
    is_physical: i % 9 === 0,
    promo_code: promo,
    ...row,
    addons: addonsOnOrder(row, promo ? STUB_CODE : null),
  });
}
const CUBE = { ok: true, fields, rows, orders, demoFilterApplied: true };

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/admin-explore')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(CUBE));
    return;
  }
  /* The Type Analytics page needs this one as well as the cube: it was the
     only page that came back blank with no error, because every other /api/
     path fell through to the empty answer below and that page reads
     `TYPES_DATA.individuals` straight off it. */
  /* The Responses page's tiles come from here, not the cube: the radar, the
     responsibilities chart and the Life & Values chart all read
     `responses.pairs`. Without it those canvases are never touched and look
     identical to a chart that drew nothing. */
  if (url.pathname.startsWith('/api/admin-data')) {
    /* The exact shape shapeResponses reads: dimLabels + dimScores by index,
       expLabels + expAlign, lifeGaps, respAgreement, relationshipFeel. Read
       off that function rather than invented, because a stub that does not
       match leaves the tiles blank and looks like the product being broken. */
    const payload = {
      /* A COUNT, which is what api/admin-data.js sends: `pairs: pairs.length`.
         Sending the array here printed "n=[object Object],[object Object]…"
         across the tile subtitles and looked exactly like a product bug. The
         harness is the first thing to suspect. */
      pairs: Math.floor(rows.length / 2),
      dimLabels: DIMS,
      dimScores: DIMS.map((d, k) => 45 + (k * 6) % 50),
      expLabels: ['Household', 'Financial', 'Career', 'Extended family', 'Emotional'],
      expAlign: [72, 58, 81, 64, 49],
      relationshipFeel: [2, 5, 11, 14, 8],
      lifeGaps: [
        { label: 'Children', pct: 41 }, { label: 'Faith', pct: 33 },
        { label: 'Where to live', pct: 28 }, { label: 'Money', pct: 22 },
        { label: 'Social life', pct: 17 },
      ],
      respAgreement: ['Cooking', 'Bills', 'Planning visits', 'Mental load', 'Savings']
        .map((l, k) => ({ label: l, pct: 40 + (k * 9) % 50, category: 'Household', n: 20 })),
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    /* Orders too. The page only reaches loadRealResponses from the branch
       that finds real orders: with none, every Responses tile stayed at its
       empty state and the probe reported "no errors" about a page that had
       drawn nothing. */
    const orders = rows.map((r, i) => ({
      order_num: 'A' + (1000 + i), pkg_key: ['core', 'newlywed', 'anniversary', 'premium'][i % 4],
      total: [89, 139, 139, 198][i % 4], created_at: new Date(Date.now() - i * 864e5).toISOString(),
      buyer_email: null, shipping_state: 'CA', shipping_country: 'US',
      /* A code on half of them, so the table's Promo and Discount columns have
         something to draw and the empty case is still represented. */
      promo_code: i % 2 === 0 ? ['BETA-CORE', 'SPRING25', 'FRIENDS10', 'ATTUNE-BETA-01'][i % 4] : null,
    }));
    /* ── CODES ───────────────────────────────────────────────────────────
       The stub had none, so __codeByName was empty: every Discount cell was
       blank and the whole discount chart was one "Unknown" bar. That is the
       exact bug Ellie reported in production, reproduced by the harness rather
       than by the product, which is the thing to be careful about. The real
       endpoint merges the compiled codes in; this does the same so the page
       can be looked at. */
    const beta_codes = [
      ...Object.entries(COMPILED_CODES).map(([code, meta]) => {
        const m = (typeof meta === 'string') ? { pkg: meta, mode: 'free', amount: 0 } : (meta || {});
        return { code, pkg_key: m.pkg || null, discount_mode: m.mode || 'free',
          discount_value: m.mode === 'percent' ? (m.amount ?? 100) : (m.amount ?? 0),
          includes_workbook: !!m.includesWorkbook, active: true, source: 'compiled' };
      }),
      { code: 'SPRING25', package_key: 'core', discount_mode: 'percent', discount_value: 25, active: true, uses_count: 3, max_uses: 50, source: 'issued' },
      { code: 'FRIENDS10', package_key: '*', discount_mode: 'fixed', discount_value: 10, active: false, uses_count: 0, max_uses: null, source: 'issued' },
    ];
    res.end(JSON.stringify({ ok: true, orders, beta_codes, responses: payload }));
    return;
  }
  if (url.pathname.startsWith('/api/admin-typing')) {
    const individuals = rows.map((r, i) => ({
      type: r.type, pronouns: ['she/her', 'he/him', 'they/them'][i % 3],
      relLength: ['< 1 year', '1-3 years', '3+ years'][i % 3],
      relStatus: ['Engaged', 'Married', 'Dating'][i % 3],
      withdrawScore: 2 + (i % 3), openScore: 2 + ((i + 1) % 3),
    }));
    const couples = [];
    for (let i = 0; i + 1 < rows.length; i += 2) {
      couples.push({ coupleType: rows[i].couple_type, a: individuals[i], b: individuals[i + 1] });
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, individuals, couples, generatedAt: new Date().toISOString(),
      config: { axisConfig: {}, weights: {}, flipped: [] } }));
    return;
  }
  if (url.pathname.startsWith('/api/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rows: [], data: [] }));
    return;
  }
  const p = join(`${ROOT}public`, url.pathname === '/' ? 'admin.html' : url.pathname.slice(1));
  if (!existsSync(p)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

/* The width is the whole question for a chart whose labels auto-skip. Ellie
   reported missing column labels three times on a chart that has all ten at
   1500 points, which is only a contradiction until you ask what width she is
   looking at. WIDTH=1280 node scripts/probe-admin.mjs responses */
const WIDTH = Number(process.env.WIDTH || 1500);
const page = await launch({ width: WIDTH, height: Number(process.env.HEIGHT || 1100) });
const errors = [];
page.on('console', (m) => { if (/error/i.test(m.type || '')) errors.push(m.text); });

/* The page gates on `attune_admin_s`, read by window.adminApiSecret, and
   hides #admin-login-gate once signed in. Both are set before the first script
   runs, the same state a signed-in browser is in. The first version of this
   guessed two other key names and left the login overlay up, so every tile sat
   on "Loading" and the probe cheerfully reported no errors: a harness that
   measures its own stub. */
await page.onNewDocument(`
  try { localStorage.setItem('attune_admin_s', 'probe'); } catch (e) {}
  document.addEventListener('DOMContentLoaded', function () {
    var g = document.getElementById('admin-login-gate');
    if (g) g.classList.add('hidden');
  });
  window.__probeErrors = [];
  const _ce = console.error;
  console.error = function () { try { window.__probeErrors.push([].slice.call(arguments).join(' ')); } catch (e) {} return _ce.apply(console, arguments); };
`);
await page.goto(`http://127.0.0.1:${PORT}/`);
await new Promise((r) => setTimeout(r, 2500));

/* Click the sidebar item rather than calling showPage: the real navigation
   does whatever else a page needs on the way in, and calling the function
   alone left the overview on screen while reporting success. */
const shown = await page.evaluate((name) => {
  const el = [...document.querySelectorAll('[onclick]')]
    .find((x) => (x.getAttribute('onclick') || '').includes(`showPage('${name}')`));
  if (!el) return 'no sidebar item for ' + name;
  el.click();
  return 'clicked';
}, PAGE);
await new Promise((r) => setTimeout(r, 4000));

/* An inner tab on the Responses page, so a picture of the conflict tab is
   possible at all. Without this the probe could only ever photograph
   Communication. */
if (process.env.TAB) {
  await page.evaluate((t) => {
    const el = [...document.querySelectorAll('.tab')].find((x) => (x.textContent || '').trim() === t);
    if (el) el.click();
  }, process.env.TAB);
  await new Promise((r) => setTimeout(r, 2500));
}

/* What the page actually got from the stub. A blank chart and a chart with no
   data look the same; this says which. */
const cubeState = await page.evaluate(async () => {
  try {
    const c = await ensureCube();
    return { ok: true, rows: (c.rows || []).length, fields: (c.fields || []).length };
  } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
});
console.log('cube: ' + JSON.stringify(cubeState));

const report = await page.evaluate(() => ({
  errors: window.__probeErrors || [],
  gated: !document.getElementById('admin-login-gate')?.classList.contains('hidden'),
  /* Only inside the page on screen. Counting the whole document included the
     thirteen tabs that are not open, whose tiles correctly say Loading until
     somebody visits them, so the figure read 7 whatever was fixed. A count is
     a question about what was counted. */
  loading: (() => {
    const page = document.querySelector('.page:not(.hidden)') || document.body;
    const stuck = [...page.querySelectorAll('*')]
      .filter((e) => e.children.length === 0 && /^loading/i.test((e.textContent || '').trim()));
    return { n: stuck.length, where: stuck.map((e) => e.id || e.className || e.tagName).slice(0, 10) };
  })(),
  /* And the tiles that drew nothing, which look finished and are not. */
  empty: (() => {
    const page = document.querySelector('.page:not(.hidden)') || document.body;
    return [...page.querySelectorAll('.chart-card')]
      .filter((c) => /no data yet|nobody in this slice|not enough/i.test(c.textContent || ''))
      .map((c) => (c.querySelector('.chart-card-title') || {}).textContent || '(untitled)');
  })(),
  canvases: [...document.querySelectorAll('canvas')].filter((c) => c.offsetParent !== null).length,
  /* Computed display, not the inline attribute. The first version of this
     matched on `[style*="display: none"]` and reported the overview as visible
     on every page, which is a harness lying about the thing it exists to
     check. */
  /* Which canvases actually have a chart on them. A canvas with no Chart
     instance is a blank rectangle, and that looks identical to a chart with
     no data; this is the one thing that tells them apart. */
  /* The box each canvas actually got. A chart that looks too small is a
     canvas that was given the wrong size, and the only way to tell which is
     to read it rather than guess at the CSS. */
  boxes: [...document.querySelectorAll('canvas')].filter((c) => c.offsetParent !== null)
    .map((c) => { const r = c.getBoundingClientRect(); const p = c.parentElement.getBoundingClientRect();
      return c.id + ' css ' + Math.round(r.width) + 'x' + Math.round(r.height) + '  bitmap ' + c.width + 'x' + c.height + '  in ' + Math.round(p.width) + 'x' + Math.round(p.height) + ' @top ' + Math.round(r.top); }),
  /* A chart with an instance attached but NOTHING IN IT looks exactly like a
     working one from outside, and `Chart.getChart(c) ? 'drawn' : 'EMPTY'` says
     drawn for both. The Responses radar had an instance and no series, and the
     couple-type doughnut there had an instance and sat on a spinner, and this
     probe reported both as drawn. Count the points. */
  series: [...document.querySelectorAll('canvas')]
    .filter((c) => c.offsetParent !== null)
    .map((c) => {
      const ch = window.Chart && Chart.getChart(c);
      if (!ch) return { id: c.id, state: 'no chart instance' };
      const ds = (ch.data && ch.data.datasets) || [];
      const pts = ds.reduce((n, d) => n + ((d.data || []).filter((v) => v != null).length), 0);
      const labels = ((ch.data && ch.data.labels) || []).length;
      const vals = (ds[0] && ds[0].data || []).slice(0, 12).map((v) => (typeof v === 'number' ? Number(v.toFixed(2)) : v));
      const r = c.getBoundingClientRect();
      const box = c.parentElement ? c.parentElement.getBoundingClientRect() : r;
      /* The labels Chart.js DREW, not the ones it was given. autoSkip silently
         drops them when they would collide, which is exactly what a narrower
         window does and exactly what a reader reports as "missing labels". */
      let drawn = null;
      try {
        /* The CATEGORY axis, which is y on a horizontal bar. Reading x
           regardless printed "5 of 4" for the rebuilt risk chart: that was
           the 0/25/50/75/100 value ticks counted against four category
           labels. A count is a question about what was counted. */
        const catAxis = (ch.options && ch.options.indexAxis === 'y') ? 'y' : 'x';
        const sc = ch.scales && ch.scales[catAxis];
        if (sc && sc.ticks) drawn = sc.ticks.filter((t) => t.label !== undefined && t.label !== '').length;
      } catch (e) {}
      return { id: c.id, state: pts ? 'ok' : 'NO DATA POINTS', datasets: ds.length, points: pts, labels, drawn,
               type: ch.config && ch.config.type, vals,
               css: Math.round(r.width) + 'x' + Math.round(r.height),
               box: Math.round(box.width) + 'x' + Math.round(box.height) };
    }),
  /* A spinner that never stops is a tile nobody can read, and it carries no
     text at all, so a Loading count cannot see it. */
  spinners: [...document.querySelectorAll('.page:not(.hidden) .spinner, .page:not(.hidden) [class*="spin"], .page:not(.hidden) [class*="load"]')]
    .filter((e) => e.offsetParent !== null).map((e) => e.id || e.className).slice(0, 8),
  charts: [...document.querySelectorAll('canvas')]
    .filter((c) => c.offsetParent !== null)
    .map((c) => c.id + ':' + (window.Chart && Chart.getChart(c) ? 'drawn' : 'EMPTY')),
  /* ── WHAT KIND OF CHART, AND WHICH AXES IT HAS ────────────────────────
     Ellie, twice: "Still seeing gridlines and x axis labels on the type
     distribution pie charts, I shouldn't." A screenshot could not settle
     that: a full-page capture re-lays-out a responsive chart mid-shot, so
     the picture shows an axis the chart does not have. Asking the chart is
     the measurement; the picture is the illustration. */
  kinds: [...document.querySelectorAll('canvas')].filter((c) => c.offsetParent !== null)
    .map((c) => {
      const ch = window.Chart && Chart.getChart(c);
      if (!ch) return c.id + ': no chart';
      const scales = Object.keys(ch.scales || {});
      const drawn = scales.filter((k) => {
        const sc = ch.scales[k];
        return sc && sc.options && sc.options.display !== false;
      });
      const grids = scales.filter((k) => {
        const g = ch.scales[k] && ch.scales[k].options && ch.scales[k].options.grid;
        return g && g.display !== false;
      });
      const legend = !!(ch.options.plugins && ch.options.plugins.legend
        && ch.options.plugins.legend.display !== false);
      /* ── AND WHETHER THE BARS SIT UNDER THEIR LABELS ───────────────
         A chart built while its tab was hidden lays its bars out for a
         container a few pixels wide. The axis re-measures when the tab is
         shown and the bars do not, so the names spread across the width and
         the columns stay huddled at the left. It reads as a broken chart and
         every structural check passes. The numbers are the evidence: the
         last bar's centre should be near the right of the drawing area. */
      let bars = '';
      if (ch.config.type === 'bar') {
        const meta = ch.getDatasetMeta(0);
        const pts = (meta && meta.data) || [];
        if (pts.length) {
          const area = Math.round(ch.chartArea.right - ch.chartArea.left);
          const last = Math.round(pts[pts.length - 1].x - ch.chartArea.left);
          const stale = pts.length > 1 && last < area * 0.6;
          bars = `  bars ${pts.length} first ${Math.round(pts[0].x - ch.chartArea.left)}`
            + ` last ${last} of ${area}${stale ? '  <-- LAID OUT FOR A NARROWER BOX' : ''}`;
        }
      }
      return `${c.id}: ${ch.config.type}  scales[${drawn.join(',') || 'none'}]`
        + `  gridlines[${grids.join(',') || 'none'}]  legend:${legend}${bars}`;
    }),
  /* What the Responses tiles read. An empty object here is why a canvas is
     never touched, and is indistinguishable on screen from a broken chart. */
  seg: Object.keys(window.__responsesBySeg || {}),
  /* A chart whose drawing area disagrees with its canvas was laid out for a
     different size and never re-measured, which is what a hidden page does to
     a responsive chart. */
  bars: (() => {
    const c = document.getElementById('svp-gap-canvas');
    const ch = c && window.Chart && Chart.getChart(c);
    if (!ch) return null;
    const meta = ch.getDatasetMeta(0);
    return {
      labels: ch.data.labels.length,
      points: ch.data.datasets[0].data.length,
      firstX: Math.round(meta.data[0].x), lastX: Math.round(meta.data[meta.data.length - 1].x),
      width: Math.round(meta.data[0].width),
      area: Math.round(ch.chartArea.right - ch.chartArea.left),
      ticks: ch.scales.x.ticks.length,
    };
  })(),
  geom: [...document.querySelectorAll('canvas')].filter((c) => c.offsetParent !== null)
    .map((c) => { const ch = window.Chart && Chart.getChart(c); if (!ch) return c.id + ':none';
      return c.id + ' area ' + Math.round(ch.chartArea.right - ch.chartArea.left) + ' of canvas ' + Math.round(c.getBoundingClientRect().width); }),
  /* Where the page's own blocks actually sit. A tile that draws nothing and a
     tile that is laid out at zero height look identical in a screenshot. */
  where: (() => {
    const c = document.getElementById('types-ct-bars');
    const pt = document.getElementById('page-types');
    const chain = [];
    let n = c;
    while (n && n !== document.body) { chain.push(n.tagName + (n.id ? '#' + n.id : '') + (n.className ? '.' + String(n.className).split(' ')[0] : '')); n = n.parentElement; }
    return { inPage: c && c.closest('.page') ? c.closest('.page').id : 'none',
      pageTypesChildren: pt ? pt.children.length : -1,
      pageTypesRect: pt ? Math.round(pt.getBoundingClientRect().height) : -1,
      chain: chain.slice(0, 10) };
  })(),
  blocks: (() => {
    const page = [...document.querySelectorAll('.page')].find((p) => getComputedStyle(p).display !== 'none');
    if (!page) return [];
    return [...page.children].map((el) => {
      const r = el.getBoundingClientRect();
      return `${el.tagName}.${(el.className || '').toString().split(' ')[0] || '-'} ${Math.round(r.width)}x${Math.round(r.height)} @${Math.round(r.top)}`;
    });
  })(),
  segDims: (window.__responsesBySeg && window.__responsesBySeg[''] && window.__responsesBySeg[''].dimScores) || null,
  visible: [...document.querySelectorAll('.page')]
    .filter((p) => getComputedStyle(p).display !== 'none').map((p) => p.id).join(',') || '(none)',
}));
if (report.gated) {
  console.error('the login gate is still up, so nothing fetched and every tile is a placeholder.');
  console.error('Refusing to report: a picture of the sign-in screen is not a picture of the admin.');
  await page.close(); server.close();
  process.exit(1);
}
console.log(`page: ${PAGE} (${shown})  visible: ${report.visible}`);
console.log('responsesBySeg keys: ' + JSON.stringify(report.seg) + '  dimScores: ' + JSON.stringify(report.segDims).slice(0,90));
for (const g of report.geom) console.log('  geom ' + g);
console.log('svp bars: ' + JSON.stringify(report.bars));
console.log('charts: ' + report.charts.join('  '));
for (const s of report.series) {
  console.log(`  series ${s.id}: ${s.state}` + (s.state === 'ok'
    ? ` ${s.type} ${s.points}pts css ${s.css}` + (s.drawn == null ? '' : `  x-labels drawn ${s.drawn} of ${s.labels}${s.drawn < s.labels ? '  <- AUTOSKIP DROPPED ' + (s.labels - s.drawn) : ''}`)
    : ` <- a tile that looks finished and is not`));
}
if (report.spinners.length) console.log('spinners still turning: ' + report.spinners.join(', '));
for (const k of report.kinds) console.log('  kind ' + k);
for (const b of report.boxes) console.log('  ' + b);
for (const b of report.blocks) console.log('  block ' + b);
console.log('  where ' + JSON.stringify(report.where));
console.log(`canvases on screen: ${report.canvases}   stuck on "Loading" in the open page: ${report.loading.n}${report.loading.n ? ' -> ' + report.loading.where.join(', ') : ''}`);
if (report.empty.length) console.log(`tiles that drew nothing: ${report.empty.length} -> ${report.empty.join(' | ')}`);
else console.log('tiles that drew nothing: none');
if (report.errors.length) {
  console.log(`\nconsole.error (${report.errors.length}):`);
  for (const e of report.errors.slice(0, 8)) console.log('  ' + String(e).slice(0, 160));
} else {
  console.log('no console errors.');
}

/* A responsive chart laid out while its page was hidden keeps that layout
   until something makes it measure again. Resizing every chart before the
   picture tells a stale layout apart from a wrong one: if the picture is only
   right after this, the product needs the resize, not the probe. */
if (process.env.NO_RESIZE !== '1') {
  await page.evaluate(() => {
    for (const c of document.querySelectorAll('canvas')) {
      const ch = window.Chart && Chart.getChart(c);
      if (ch) ch.resize();
    }
  });
  await new Promise((r) => setTimeout(r, 600));
}
/* Viewport, not fullPage. A fullPage capture in this driver resizes the page
   to its whole height, and a responsive chart re-lays-out mid-capture: the
   bars were photographed on one layout and the axis on another, which looked
   exactly like a chart drawing its columns in the wrong place. The chart's own
   model said the bars spanned the full width the whole time. */
const shot = await page.screenshot({ fullPage: process.env.FULL_PAGE === '1' });
writeFileSync(OUT, Buffer.from(shot, 'base64'));
console.log('picture: ' + OUT);
await page.close();
server.close();
