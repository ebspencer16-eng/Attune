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
const { calcDimScores, axisScores, typeCodeFromAxes, DIM_KEYS, AXIS_CONFIG, QUESTION_WEIGHTS } = await import(`${ROOT}api/_type-engine.js`);
const { COMPILED_BETA_CODES: COMPILED_CODES } = await import(`${ROOT}api/_lib/beta-codes.js`);
const { PERSONALITY_QUESTIONS } = await import(`${ROOT}api/_questions.js`);
const { pronounLabel } = await import(`${ROOT}api/_lib/pronouns.js`);
const { withEffectivePromoCodes, coupleKeyFromProfiles } = await import(`${ROOT}api/_lib/order-promo.js`);
const { guardiansOf, CHILDHOOD_ROLES } = await import(`${ROOT}api/_questions.js`);
const { LIFE_QUESTIONS, RESPONSIBILITY_CATEGORIES } = await import(`${ROOT}api/_questions.js`);
const { genericLabel } = await import(`${ROOT}api/_lib/generic-label.js`);
const { REFLECTION_QUESTIONS } = await import(`${ROOT}api/_anniversary-questions.js`);
const { ANNIVERSARY_QUESTIONS } = await import(`${ROOT}api/_anniversary-questions.js`);
const { REFLECTION_CODES, tallyCodes } = await import(`${ROOT}api/_lib/reflection-codes.js`);
const { INTIMACY_QUESTIONS, INTIMACY_DIMENSIONS } = await import(`${ROOT}api/_intimacy-questions.js`);
const IDIM_LABEL_STUB = Object.fromEntries((INTIMACY_DIMENSIONS || []).map((d) => [d.id, d.label]));

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
  /* A handful of real Ex1 questions, because the Explore page defaults its
     Rows picker to the first group beginning "Ex1" and the stub had none, so
     the page opened on "— none —" and drew an empty table. */
  ...PERSONALITY_QUESTIONS.slice(0, 6).map((q) => ({
    key: 'q_' + q.id, label: q.text || q.id, group: 'Ex1 · Communication (1–5)', kind: 'cat',
    options: (q.options || []).map((o) => ({ v: o.label || o, label: o.label || o })), partnerable: true,
  })),
  ...CONFLICT_QUESTIONS.flatMap((q) => {
    let options = null;
    if (q.kind === 'scale') options = (q.options || []).map((o) => ({ v: o.label, label: o.label }));
    else if (q.kind === 'frequency') options = FREQUENCY_OPTIONS.map((o) => ({ v: o.label, label: o.label }));
    else if (q.kind === 'forcedAB') options = [{ v: q.a, label: q.a }, { v: q.b, label: q.b }];
    else if (q.kind === 'pickOne') options = (q.options || []).map((o) => ({ v: o.label || o, label: o.label || o }));
    if (!options) return [];
    /* riskLabel travels with the field: the glance tile names the loudest horseman and the column chart labels its bars with it, and neither can work it out from the question text. */
    return [{ key: `cq_${q.id}`, label: (q.riskLabel ? `${q.riskLabel} · ` : '') + q.text, riskLabel: q.riskLabel || null, group: 'Conflict Patterns', kind: 'cat', options, partnerable: true, section: q.section }];
  }),
  /* ── THE EXPECTATIONS QUESTIONS ────────────────────────────────────────
     The stub had neither the life questions nor the responsibilities, so the
     whole All questions block on the Expectations tab drew nothing and the
     probe said no errors about it. The responsibilities carry the positions
     and poles the server now sends, because the thing being looked at is
     whether they draw as a Myself-to-My-partner axis rather than four bars. */
  ...LIFE_QUESTIONS.slice(0, 5).map((q) => {
    const opts = q.options || [];
    const ordered = opts.length >= 3;
    return {
      key: q.id, label: (q.category ? q.category + ' · ' : '') + String(q.text || q.id).replace(/\{[a-zA-Z]+\}/g, 'you'),
      group: 'Ex2 · Life & values', kind: 'cat',
      ...(ordered ? { ordinal: true, poleLow: opts[0], poleHigh: opts[opts.length - 1] } : {}),
      options: opts.map((v) => ({ v, label: v })), partnerable: true,
    };
  }),
  ...RESPONSIBILITY_CATEGORIES.flatMap((cat) => (cat.items || []).slice(0, 2).map((item, i) => ({
    key: 'resp_' + cat.id + '_' + i,
    label: cat.label + ' · ' + String(item).replace(/\{[a-zA-Z]+\}/g, 'you'),
    group: 'Ex2 · Who does what', kind: 'cat', ordinal: true,
    poleLow: 'Myself', poleHigh: 'My partner',
    options: [['Me', 0], ['Both', 0.5], ['Partner', 1], ['N/A', null]].map(([v, val]) => ({ v, label: v, val })),
    partnerable: true,
  }))),
  /* Reflection questions, including the pick the admired-quality chart draws.
     Without them that tile and the whole Rel Reflection All questions block
     drew nothing, and the probe said no errors about either. */
  ...REFLECTION_QUESTIONS.map((q) => {
    const isPick = q.kind === 'pick';
    const opts = (isPick ? q.options : q.labels) || [];
    return {
      key: 'ref_' + q.id, label: q.text, topic: q.topic || null,
      group: 'Ex3 · Relationship Reflection', kind: 'cat',
      ...(!isPick && opts.length >= 2 ? { ordinal: true, poleLow: opts[0], poleHigh: opts[opts.length - 1] } : {}),
      options: opts.map((v) => ({ v, label: v })), partnerable: true,
    };
  }),
  /* ── EVERY DIMENSION, AND ITS REAL NAME ────────────────────────────────
     This was `.slice(0, 6)` with `dimLabel: q.dimension`, and both halves
     were wrong in the same direction: the first six questions belong to two
     dimensions, so the alignment-by-dimension chart drew a two-point radar,
     which Chart.js renders as a line with a dot on it. And the id was being
     sent where the server sends the label, so the two points were captioned
     "frequency" and "initiating" in lower case.

     The real endpoint maps q.dimension through INTIMACY_DIMENSIONS, so this
     does too rather than restating the pairs. A stub that is wrong about the
     shape reports a working feature as broken, which is exactly what I
     started to chase here before reading this line. */
  ...INTIMACY_QUESTIONS.filter((q) => q.kind !== 'multi').map((q) => ({
    key: `iq_${q.id}`, label: q.premarital || q.id, group: 'Physical Intimacy', kind: 'cat',
    options: (q.options || []).map((o) => ({ v: o.label, label: o.label, val: o.value })), partnerable: true,
    dim: q.dimension, dimLabel: IDIM_LABEL_STUB[q.dimension] || q.dimension,
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
  /* ── THE PARTNER'S OWN SCORE, AND HOW WRONG EACH READING IS ──────────────
     The Communication at a glance tile reads `p_dim_<d>` for how far apart two
     people's own answers are, and `readerr_<d>` plus `read_error_mean` for how
     wrong a reading is. The stub carried neither, so all four figures drew an
     em dash and the probe reported no errors about a tile that was working.
     The harness being thin looks exactly like the feature being broken.

     The gaps are deliberately uneven across dimensions so the two "worst on"
     tiles have something to pick out, and the widest gap is NOT the widest
     misread, because those two being the same dimension is the thing Ellie
     asked whether they always are. */
  DIMS.forEach((d, k) => {
    const own = r['dim_' + d];
    if (own != null) r['p_dim_' + d] = Math.max(1, Math.min(5, own + ((i + k) % 5) * 0.4 - 0.8));
    r['readerr_' + d] = Number((((i + k * 3) % 7) * 0.25).toFixed(2));
  });
  r.read_error_mean = Number((DIMS.reduce((a, d) => a + (r['readerr_' + d] || 0), 0) / DIMS.length).toFixed(3));
  for (const f of fields) {
    if (!f.options || !f.options.length) continue;
    if (f.key.startsWith('cq_') || f.key.startsWith('iq_') || f.key.startsWith('resp_') || f.key.startsWith('lq_') || f.key.startsWith('ref_')) {
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
  /* ── THE UNKNOWN BUCKET HAS TO BE REACHABLE ─────────────────────────
     This read `CODE_POOL[i % CODE_POOL.length]` under `i % 2 === 0`, and the
     pool is fourteen long with the unmappable code last, at index 13. An even
     i never lands on an odd index, so the one entry put there to exercise the
     Unknown bucket was unreachable and the chart drew no Unknown bar at all.
     The stub claimed a case it could not produce, which is the same shape as
     sweeping a round grid over a rule made of thresholds. Halving the index
     walks the whole pool. */
  const promo = i % 2 === 0 ? CODE_POOL[(i / 2) % CODE_POOL.length] : null;
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
    /* Two orders per couple, which is the shape that matters here: the
       partner who paid carries the code and the other carries none. Without
       it withEffectivePromoCodes has nothing to join on and the stub would
       claim the rule does nothing. */
    couple_id: 'oc' + Math.floor(i / 2),
    ...row,
    addons: addonsOnOrder(row, promo ? STUB_CODE : null),
  });
}
/* The real rule, not a restatement of it. api/admin-explore.js calls this
   over its own order rows keyed on couple_id; so does this. A stub that
   bucketed the codes itself would be a second implementation of the thing
   under test. */
withEffectivePromoCodes(orders, (o) => o.couple_id || null);
/* ── SECTIONS AND TIERS, FROM THE MODULE THAT DECIDES THEM ───────────────
   The Explore pickers group by `section` and `tier` now, and a stub that
   invented them would be testing my guess rather than the mapping. */
const { EXPLORE_SECTIONS, placeAll } = await import(`${ROOT}api/_lib/explore-sections.js`);
const _placed = placeAll(fields);
const CUBE = { ok: true, fields: _placed.fields, sections: EXPLORE_SECTIONS,
  unmappedGroups: _placed.unmapped, rows, orders, demoFilterApplied: true };

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  /* ── ADMIN ACTIONS ──────────────────────────────────────────────────────
     The page asks this for the waiting-on-a-partner list and writes through it
     to create and toggle codes. Without it the tile answered "nobody is
     waiting", which is a claim rather than a stub: the empty case and the
     unknown case looked identical, which is the thing this probe exists to
     stop. Two rows, so the Send button is on screen to be looked at. */
  if (url.pathname.startsWith('/api/admin-actions')) {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      let action = '';
      try { action = JSON.parse(raw || '{}').action || ''; } catch {}
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (action === 'waiting_partners') {
        res.end(JSON.stringify({ ok: true, waiting: [
          { id: '00000000-0000-4000-8000-000000000001', inviteCode: 'A878FBAD' },
          { id: '00000000-0000-4000-8000-000000000002', inviteCode: 'K3MQ7PWZ' },
        ] }));
        return;
      }
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }
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
      /* ── ALL TWENTY, FROM THE EXERCISE ITSELF ──────────────────────────
         Five labels typed by hand, all of them filed under Household. Ellie
         asked for this tile to become "a 5x4 grid", and five items cannot
         show whether a five by four grid works: it drew one row 90 points
         tall and looked finished. A hand-typed answer set is a guess about
         what the product stores, and the guess here was a quarter of it.

         RESPONSIBILITY_CATEGORIES is what the exercise asks, so the count and
         the categories come from there and cannot drift from the real twenty. */
      respAgreement: RESPONSIBILITY_CATEGORIES.flatMap((cat) => (cat.items || []).map((item) => ({ item, category: cat.label })))
        /* Through the real genericLabel, because the server sends these
           already converted and the raw item still says {userName}. The first
           version of this stub skipped that and the grid drew "Planning
           visits with {userName}'s family" in a tile, which is a stub
           disagreeing with its server about what a label even is. */
        .map((x, k) => ({ label: genericLabel(typeof x.item === 'string' ? x.item : (x.item.label || x.item.id)),
                          pct: 32 + (k * 13) % 62, category: x.category, n: 20 })),
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
      /* An order carries user_id when the buyer had an account, and that id is
         the profile id, which is how the server reaches the partner. */
      user_id: r.id || null,
    }));
    /* The same rule the endpoint applies, from the same module, keyed the way
       api/admin-data.js keys it: profile id and partner_profile_id. */
    const stubPartnerOf = new Map(rows.map((r) => [r.id, r.partner_profile_id || null]));
    const stubPromoLink = withEffectivePromoCodes(orders, (o) => (
      o.user_id && stubPartnerOf.has(o.user_id)
        ? coupleKeyFromProfiles(o.user_id, stubPartnerOf.get(o.user_id))
        : null
    ));
    /* ── CODES ───────────────────────────────────────────────────────────
       The stub had none, so __codeByName was empty: every Discount cell was
       blank and the whole discount chart was one "Unknown" bar. That is the
       exact bug Ellie reported in production, reproduced by the harness rather
       than by the product, which is the thing to be careful about. The real
       endpoint merges the compiled codes in; this does the same so the page
       can be looked at. */
    /* Per-couple expectation distances, for the Expectations at a glance
       tile. Spread either side of the 0.2 line so both of the last two tiles
       have couples in them: a stub where everyone falls on one side draws an
       em dash and looks like the tile is broken. */
    const expCoupleDistances = Array.from({ length: 18 }, (_, k) => ({
      life: Number((((k * 7) % 11) / 20).toFixed(4)),
      resp: Number((((k * 5) % 9) / 20).toFixed(4)),
    }));
    /* The two inheritance charts. Deliberately with a large "not classified"
       group, because that is what the real data will look like: the gendered
       read needs one adult, a gendered role name, a gendered pronoun and an
       expectation naming a person, and a stub where everything classifies
       would hide how much of the answer is "we cannot say". */
    const inheritance = {
      people: 24,
      shape: { same: 61, sharedToOne: 28, oneToShared: 44, other: 12, unknown: 35 },
      gendered: { keepsSameGenderRole: 39, handsOffSameGenderRole: 11, takesOnOtherGenderRole: 22, handsOffOtherGenderRole: 9, unknown: 99 },
    };
    /* The coded written answers. Real sentences through the real frame, so
       the picture shows what the matching actually does rather than numbers I
       chose: an uncoded share that is invented tells you nothing about whether
       the frame works. */
    const SAMPLE_WRITING = [
      'We got through my mum being ill and actually talked about it properly',
      'He brings me coffee every morning without being asked',
      'Moving house while I was pregnant was the hardest year',
      'Saving for the deposit and not arguing about money once',
      'I want us to laugh more and go on more dates',
      'I wish we had been more patient with each other',
      'When he supported me through losing my job',
      'Nothing much really',
      'The way we always talk things through before bed',
      'Having the kids close together and surviving it',
      'Learning to apologise properly instead of going quiet',
      'More weekends away, just the two of us',
    ];
    const reflectionCodes = {
      frame: REFLECTION_CODES.map((c) => ({ id: c.id, label: c.label })),
      questions: ANNIVERSARY_QUESTIONS.filter((q) => q.type === 'text').map((q, qi) => {
        /* A different slice per question so the chart changes when the picker
           does, which is the thing being looked at. */
        const answers = SAMPLE_WRITING.slice(qi % 4).concat(SAMPLE_WRITING.slice(0, qi % 4));
        return { id: q.id, label: q.text, category: q.category || null, ...tallyCodes(answers) };
      }),
    };
    /* The two written conflict answers and the repair ranking. Same real
       sentences through the same real frame as the reflection ones. */
    const conflictCodes = {
      frame: REFLECTION_CODES.map((c) => ({ id: c.id, label: c.label })),
      questions: CONFLICT_QUESTIONS.filter((q) => q.kind === 'openText').map((q, i) => ({
        id: q.id, label: q.text,
        ...tallyCodes(SAMPLE_WRITING.slice(i).concat(SAMPLE_WRITING.slice(0, i))),
      })),
    };
    const repairRank = (() => {
      const q = CONFLICT_QUESTIONS.find((x) => x.kind === 'rank');
      const opts = ((q && q.options) || []).map((o) => (typeof o === 'string' ? o : o.label));
      return opts.map((label, i) => ({ label, place: Number((1 + ((i * 1.7) % 4)).toFixed(2)), n: 14 - i }))
        .sort((a, b) => a.place - b.place);
    })();
    /* The Physical Intimacy page. The two groups are given different average
       placements on purpose: a stub where both columns match would hide
       whether the chart can show a difference at all. */
    const intimacyStats = (() => {
      const multi = INTIMACY_QUESTIONS.find((q) => q.id === 'iq_mean_for');
      const labels = ((multi && multi.options) || []).filter((o) => o.value != null).map((o) => o.label);
      const meanFor = {};
      labels.forEach((l, i) => { meanFor[l] = 9 - i; });
      return {
        avgAlignment: 78, couples: 18,
        meanFor, meanForPeople: 24,
        partnerInitiates: 41, noveltyCloseness: 72,
        stageN: { 'Not yet': 9, 'Regularly intimate': 15 },
        stageRows: INTIMACY_DIMENSIONS.map((d, i) => ({
          id: d.id, label: d.label,
          notYet: Number((0.35 + (i % 4) * 0.08).toFixed(3)),
          intimate: Number((0.52 + ((i + 2) % 4) * 0.09).toFixed(3)),
        })),
      };
    })();
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
    /* ── THE AGGREGATES NEST UNDER `responses`, AS THE SERVER NESTS THEM ──
       These eight were listed at the TOP level here, beside `responses`,
       while api/admin-data.js returns every one of them from
       buildResponseAggregates and therefore sends them inside `responses`.
       So the probe rendered seven tiles correctly that production drew empty,
       and the stub was the only thing claiming they worked.

       A stub is a claim about the server. When it is wrong about the shape it
       reports a broken feature as working, which is how this shipped; the
       Engagement round was the same mistake in the other direction, reporting
       a working page as broken. Build the stub from the server's own return
       statement rather than from what the client happens to read. */
    const responses = Object.assign({}, payload, {
      expCoupleDistances, alignedBand: 0.2, inheritance,
      reflectionCodes, conflictCodes, repairRank, intimacyStats,
    });
    res.end(JSON.stringify({ ok: true, orders, beta_codes, promoLink: { inherited: stubPromoLink.inherited, standalone: stubPromoLink.standalone }, responses, responsesBySegment: { '': responses } }));
    return;
  }
  /* ── ENGAGEMENT ─────────────────────────────────────────────────────────
     Unstubbed, so the page read d.headlines.siteVisits off a payload with no
     headlines and threw on every load. Shaped to match api/admin-engagement.js
     exactly: `headline()` returns { available, value, prev, change } and
     `clustered()` returns { available, labels, site[], app[], n, rows[] }. A
     stub that guesses at those is a stub that reports a working page as broken
     and a broken one as working. */
  if (url.pathname.startsWith('/api/admin-engagement')) {
    const MONTHS = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (11 - i));
      return d.toLocaleDateString('en-US', { month: 'short' });
    });
    const headline = (value, prev) => ({ available: true, value, prev, change: prev > 0 ? Math.round(((value - prev) / prev) * 100) : null });
    const unavailable = (why) => ({ available: false, why });
    const clustered = (labels, seedSite, seedApp) => ({
      available: true, labels,
      site: labels.map((_, i) => seedSite ? Math.round(40 + ((i * 37) % 160)) : 0),
      app: labels.map((_, i) => seedApp ? Math.round(30 + ((i * 53) % 220)) : 0),
      n: labels.length * 6,
      rows: labels.map((label, i) => ({ key: 'k' + i, label,
        site: { seconds: seedSite ? Math.round(40 + ((i * 37) % 160)) : 0, n: seedSite ? 6 : 0 },
        app: { seconds: seedApp ? Math.round(30 + ((i * 53) % 220)) : 0, n: seedApp ? 6 : 0 },
        unknown: { seconds: 0, n: 0 } })),
    });
    const groups = [
      { id: 'highlights', label: 'Highlights', pages: 1 },
      { id: 'couple-type', label: 'Couple Type', pages: 1 },
      { id: 'comms', label: 'Communication', pages: 12 },
      { id: 'expectations', label: 'Expectations', pages: 7 },
      { id: 'intimacy', label: 'Physical Intimacy', pages: 3 },
    ];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true, generatedAt: new Date().toISOString(), demoFilterApplied: true,
      window: { days: 30, from: new Date(Date.now() - 30 * 864e5).toISOString() },
      slice: null,
      headlines: {
        siteVisits: { ...headline(412, 377), note: 'Visits, not unique visitors.' },
        appDownloads: unavailable('Only App Store Connect knows this, and the app is not in the store yet.'),
        articleReaders: { ...headline(38, 22), note: 'People who opened an In Practice post in the app.' },
        annotators: headline(14, 17),
      },
      /* ── BOTH OF THESE ARE OVER MONTHS, NOT OVER STAGES ────────────────
         I first stubbed the funnel as { labels, data } and the acquisition as
         { labels, visits }. Both draw from `months`, and the funnel wants
         `series: [{ step, points }]` rather than one array. So both charts
         came back empty and looked exactly like two broken tiles on a page I
         had been asked to rebuild for being unreadable.

         That is the trap worth naming: a wrong stub does not report a missing
         feature, it reports a working one as broken, and the instruction that
         follows is to fix something that was never wrong. Shapes taken from
         the renderers and from api/admin-engagement.js. */
      funnel: { available: true, months: MONTHS, note: 'Over 12 months · sign-ups counted twice, because a sign-up is one half of a couple.',
        series: [
          { step: 'Visited', points: MONTHS.map((_, i) => 40 + ((i * 11) % 30)) },
          { step: 'Signed up', points: MONTHS.map((_, i) => 14 + ((i * 7) % 12)) },
          { step: 'Started', points: MONTHS.map((_, i) => 9 + ((i * 5) % 8)) },
          { step: 'Finished', points: MONTHS.map((_, i) => 3 + ((i * 3) % 5)) },
        ] },
      acquisition: { available: true, months: MONTHS, note: 'Visits per month.',
        visits: MONTHS.map((_, i) => 40 + ((i * 13) % 55)), downloads: null,
        downloadsNeeds: 'not collected. App Store Connect needs a key, and the app is not in the store yet.' },
      timePerPage: {
        marketing: clustered(['/home', '/offerings', '/practice', '/faq', '/purpose'], true, false),
        exercises: clustered(['Communication', 'Expectations', 'Reflection', 'Physical Intimacy', 'Conflict'], true, true),
        resources: clustered(['Workbook', 'Budget', 'Checklist'], true, true),
        results: clustered(groups.map((g) => g.label), true, true),
        detailed: Object.fromEntries(groups.filter((g) => g.pages > 1).map((g) => [g.id, clustered(['Overview', 'Detail A', 'Detail B'], false, true)])),
      },
      learning: { available: false, why: 'Not enough reads yet.' },
      groups, queryErrors: [],
      rowsRead: { profiles: 40, notes: 12, tags: 7, articleReads: 38, events: 214 },
    }));
    return;
  }
  if (url.pathname.startsWith('/api/admin-typing')) {
    const individuals = rows.map((r, i) => ({
      type: r.type, pronouns: ['she/her', 'he/him', 'they/them'][i % 3],
      relLength: ['< 1 year', '1-3 years', '3+ years'][i % 3],
      relStatus: ['Engaged', 'Married', 'Dating'][i % 3],
      withdrawScore: 2 + (i % 3), openScore: 2 + ((i + 1) % 3),
      /* ── THE PER-DIMENSION SCORES ──────────────────────────────────────
         profileToRecord sends `scores`, one blended value per dimension, and
         the per-dimension table on this page reads r.scores[d] for every
         dimension in the config. Without it the page threw on every load, and
         because an async renderer that throws logs nothing, the probe had been
         reporting no errors about a page that never finished drawing.

         Keyed off DIM_KEYS rather than a list here, so a new dimension cannot
         leave a hole. */
      scores: Object.fromEntries(Object.keys(DIM_KEYS).map((d, k) => [d, 2 + ((i + k) % 3)])),
      lowConf: i % 7 === 0,
    }));
    const couples = [];
    for (let i = 0; i + 1 < rows.length; i += 2) {
      couples.push({ coupleType: rows[i].couple_type, a: individuals[i], b: individuals[i + 1] });
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, individuals, couples, generatedAt: new Date().toISOString(),
      /* ── THE SHAPE THE ENDPOINT ACTUALLY SENDS ────────────────────────
         This invented a `config: { axisConfig, weights, flipped }` wrapper.
         api/admin-typing.js sends `config: AXIS_CONFIG` directly, with
         questionWeights, dimKeys, flipped and dims as siblings. So the page
         read config.conflict.axis off an object that had no dimensions in it
         and threw on every load of Type Analytics, silently, because an async
         renderer that throws logs nothing.

         Taken from the modules rather than typed, so a reweighting cannot
         leave this behind. */
      config: AXIS_CONFIG, questionWeights: QUESTION_WEIGHTS, dimKeys: DIM_KEYS,
      flipped: [], blend: 0.5, dims: Object.keys(DIM_KEYS) }));
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
  /* ── A RENDERER THAT THROWS SAYS NOTHING ────────────────────────────────
     Every tile here is drawn by an async function, and one that throws
     rejects its promise and logs nothing: no console.error, no red, just a
     canvas that stays at its default 300x150. That is indistinguishable in a
     screenshot from a tile with no data, and it cost a round of guessing
     before this was added. Both hooks, because a throw inside an await lands
     on unhandledrejection and one outside lands on error. */
  window.addEventListener('unhandledrejection', (e) => {
    try { window.__probeErrors.push('UNHANDLED REJECTION: ' + ((e.reason && (e.reason.stack || e.reason.message)) || e.reason)); } catch (x) {}
  });
  window.addEventListener('error', (e) => {
    try { window.__probeErrors.push('UNCAUGHT: ' + ((e.error && (e.error.stack || e.error.message)) || e.message)); } catch (x) {}
  });
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
      /* The label TEXT, not only how many. Ellie: "the column labels on the
         horseman chart are weird, they should just be one word each." A count
         cannot say that and neither can a screenshot I read rather than
         measured. Capped so a forty-category cut does not fill the run. */
      const labelText = ((ch.data && ch.data.labels) || []).slice(0, 8).map((x) => String(x).slice(0, 44));
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
      return { id: c.id, state: pts ? 'ok' : 'NO DATA POINTS', datasets: ds.length, points: pts, labels, labelText, drawn,
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
    ? ` ${s.type} ${s.points}pts css ${s.css}` + (s.drawn == null ? '' : `  x-labels drawn ${s.drawn} of ${s.labels}${s.drawn < s.labels ? '  <- AUTOSKIP DROPPED ' + (s.labels - s.drawn) : ''}`) + (s.labelText ? `  [${s.labelText.join(' | ')}]` : '')
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
/**
 * ── DRIVE A CONTROL BEFORE THE PICTURE ────────────────────────────────────
 * SET=slz-ovsum-period=90,slz-ovsum=pronouns:she%2Fher
 *
 * A tile that behaves differently when a slicer is on cannot be checked by
 * loading the page, because loading it is the case where nothing is selected.
 * The comparison line Ellie asked for under every overview stat only exists
 * when something is cut, so without this the probe takes a picture of the one
 * state that does not have it and reports no errors.
 *
 * A real change event, not just a value: the handlers are on `onchange`, and
 * setting `.value` alone fires nothing.
 */
/**
 * TAB=Expectations — open a tab before the picture.
 *
 * Several admin pages are a row of tabs over one page, and the probe always
 * landed on the first. So a tile on any other tab could not be looked at, and
 * a run that drew nothing on it reported no errors.
 */
if (process.env.TAB) {
  const want = process.env.TAB.trim().toLowerCase();
  const got = await page.evaluate((w) => {
    const tabs = [...document.querySelectorAll('.tab')];
    const hit = tabs.find((t) => (t.textContent || '').trim().toLowerCase() === w);
    if (!hit) return 'no tab called "' + w + '"; there are: ' + tabs.map((t) => (t.textContent || '').trim()).join(', ');
    hit.click();
    return 'opened ' + (hit.textContent || '').trim();
  }, want);
  console.log('  tab: ' + got);
  await new Promise((r) => setTimeout(r, 1500));
}

if (process.env.SET) {
  const pairs = process.env.SET.split(',').map((p) => {
    const i = p.indexOf('=');
    return [p.slice(0, i), decodeURIComponent(p.slice(i + 1))];
  });
  const applied = await page.evaluate((list) => {
    const out = [];
    for (const [id, value] of list) {
      const el = document.getElementById(id);
      if (!el) { out.push(id + ': no such control'); continue; }
      const has = [...el.options].some((o) => o.value === value);
      el.value = value;
      /* Report a value the control does not offer rather than silently
         selecting nothing, which looks exactly like the slicer not working. */
      out.push(id + ' = ' + (el.value === value ? value : '(not offered: ' + value + ')') + (has ? '' : ' [absent]'));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return out;
  }, pairs);
  for (const line of applied) console.log('  set ' + line);
  await new Promise((r) => setTimeout(r, 1200));
}

/**
 * READ=resp-agree-bars — print what an element actually contains.
 *
 * A tile that draws nothing looks the same in a screenshot whether it rendered
 * an empty string, rendered white text, or never ran at all. Three different
 * bugs, one picture. This prints the markup so the three can be told apart.
 */
/**
 * ROWS=qx-comm — the geometry of the first All questions rows.
 *
 * Ellie asked for the question text and the pole labels to sit on ONE line:
 * "I want the row with pole labels in line with the row label rather than
 * below it." Whether that happened is a question about two boxes' tops and
 * lefts, and a screenshot cannot answer it: a label one line above its bar
 * and a label beside its bar look similar at a glance and differ by eight
 * points. So it is measured. `sameLine` is the whole assertion.
 */
if (process.env.ROWS) {
  for (const id of process.env.ROWS.split(',').map((x) => x.trim()).filter(Boolean)) {
    const out = await page.evaluate((cid) => {
      const host = document.getElementById(cid);
      if (!host) return { id: cid, err: 'NO SUCH ELEMENT' };
      /* A row is a flex box whose first child is the label column and whose
         second is the content. Found by that shape rather than by a class,
         because these rows are built as inline styles. */
      const rows = [...host.querySelectorAll('div')].filter((d) => {
        const cs = getComputedStyle(d);
        return cs.display === 'flex' && d.children.length === 2
          && getComputedStyle(d.children[0]).textAlign === 'right';
      }).slice(0, 4);
      return { id: cid, found: rows.length, rows: rows.map((r) => {
        const L = r.children[0].getBoundingClientRect();
        const C = r.children[1].getBoundingClientRect();
        const txt = (r.children[0].textContent || '').trim().slice(0, 34);
        return { txt, labelW: Math.round(L.width), labelTop: Math.round(L.top), contentTop: Math.round(C.top),
                 labelRight: Math.round(L.right), contentLeft: Math.round(C.left),
                 sameLine: Math.abs(L.top - C.top) < 14 && L.right <= C.left + 1 };
      }) };
    }, id);
    if (out.err) { console.log(`  rows #${out.id}: ${out.err}`); continue; }
    console.log(`  rows #${out.id}: ${out.found} measured`);
    for (const r of out.rows) {
      console.log(`    ${r.sameLine ? 'SAME LINE' : 'STACKED  '}  label ${r.labelW}px right@${r.labelRight} | content left@${r.contentLeft}  "${r.txt}"`);
    }
  }
}

if (process.env.READ) {
  for (const id of process.env.READ.split(',').map((x) => x.trim()).filter(Boolean)) {
    const out = await page.evaluate((i) => {
      const el = document.getElementById(i);
      if (!el) return 'NO SUCH ELEMENT';
      const html = (el.innerHTML || '').trim();
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      /* The box and how it is laid out, because an element can hold markup and
         still show nothing: zero height, display:none, or a parent clipping
         it. A screenshot cannot tell those apart. */
      const box = ' [box ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' @' + Math.round(r.top)
        + ' display:' + cs.display + ' overflow:' + cs.overflow + ' children:' + el.children.length + ']';
      const par = el.parentElement ? (() => { const p = el.parentElement.getBoundingClientRect();
        return ' [parent .' + (el.parentElement.className || '?') + ' ' + Math.round(p.width) + 'x' + Math.round(p.height)
          + ' overflow:' + getComputedStyle(el.parentElement).overflow + ']'; })() : '';
      return (html ? html.slice(0, 120) : '(empty)') + box + par;
    }, id);
    console.log('  read #' + id + ': ' + out);
  }
}

const shot = await page.screenshot({ fullPage: process.env.FULL_PAGE === '1' });
writeFileSync(OUT, Buffer.from(shot, 'base64'));
console.log('picture: ' + OUT);
await page.close();
server.close();
