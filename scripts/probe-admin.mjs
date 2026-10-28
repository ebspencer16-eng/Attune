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
const { readInheritance } = await import(`${ROOT}api/_lib/inherited-roles.js`);
const { growingUp, GROWING_UP_FIELDS } = await import(`${ROOT}api/_lib/growing-up.js`);
const { HORSEMAN_KEYS, showsHorseman } = await import(`${ROOT}api/_conflict-questions.js`);
const { categoryAlignment } = await import(`${ROOT}api/_lib/resp-agreement.js`);

/**
 * One person's Expectations answers, built once and read twice.
 *
 * The growing-up fields on a cube row and the inheritance charts are two
 * readings of the SAME answers, and the stub had been generating them
 * separately: two fixtures for one person, which can disagree, and did.
 * Deterministic in `i`, so it can be called wherever it is needed rather
 * than stored on the row and stripped before sending.
 */
const STUB_ADULT_SETS = [
  { a: 'Mom', b: 'Dad', solo: false },
  { a: 'Mom', b: 'Stepdad', solo: false },
  { a: 'Grandma', b: 'Grandpa', solo: false },
  { a: 'Mom', b: '', solo: true },
  { a: 'Mrs Patel', b: '', solo: true },
  /* Two guardians the role names imply are the same gender. Her taxonomy
     asks for that row, and without a pair like this in the fixture the row
     is never drawn and nothing can say whether it works. */
  { a: 'Mom', b: 'Stepmom', solo: false },
];
function stubEx2(i) {
  const set = STUB_ADULT_SETS[i % STUB_ADULT_SETS.length];
  const ans = { childhoodAdults: set, responsibilities: {}, childhood: {} };
  const items = RESPONSIBILITY_CATEGORIES.flatMap((c) => (c.items || []).map((item) => ({ key: c.id + '__' + item, cat: c.id })));
  items.forEach((it, k) => {
    const ci = RESPONSIBILITY_CATEGORIES.findIndex((c) => c.id === it.cat);
    /* Two independent walks. The first version offset the childhood answer
       exactly one step from the expectation, which made "same as they saw"
       impossible and put every gendered case in the one combination the rule
       cannot classify: 0, 0, 0, 0 and 800 unknown, which reads exactly like
       the bug these charts were reported for. */
    const e = (i + k + ci) % 4;
    const c2 = (i * 3 + k * 7 + ci) % 4;
    const who = ['Both of us', STUB_SELF, STUB_PARTNER, "Doesn't apply to us"][e];
    ans.responsibilities[it.key] = who;
    /* Half in the slot spelling the site writes now and half in the word
       spelling most stored answers are in, because a reader that understands
       only one of those is the bug these charts were reported for. */
    const asWord = (i % 2) === 0;
    const slot = ['a', 'b', 'both', 'neither'][c2];
    ans.childhood[it.key] = asWord
      ? ({ a: set.a, b: set.b || set.a, both: 'Both of them', neither: 'Nobody' })[slot]
      : slot;
  });
  return ans;
}
const STUB_SELF = 'A';
const STUB_PARTNER = 'B';
const stubProfile = (i) => ({ name: STUB_SELF, partner_name: STUB_PARTNER, pronouns: pick(PRONOUNS, i) });
/* The survey, from the module the endpoint sends and the function that builds
   its one per-person list, rather than nine questions typed out here. */
const { SURVEY_QUESTIONS, TEXT_QUESTIONS, SURVEY_VERSION, rankOptionsFor } = await import(`${ROOT}api/_lib/survey.js`);
const { EXERCISES: SURVEY_EXERCISES } = await import(`${ROOT}api/_exercises.js`);
const { genericLabel } = await import(`${ROOT}api/_lib/generic-label.js`);
const { conflictFrameFor } = await import(`${ROOT}api/_lib/conflict-codes.js`);
const { TESTIMONIAL_THEMES } = await import(`${ROOT}api/_lib/testimonial-themes.js`);
const { codesFor } = await import(`${ROOT}api/_lib/reflection-codes.js`);
const THEME_LABELS = Object.fromEntries(TESTIMONIAL_THEMES.map((t) => [t.id, t.label]));
const { DIM_META, DIM_SCALE_POLES: DIM_SCALE_POLES_STUB } = await import(`${ROOT}api/_lib/dimensions.js`);
const DIM_NAMES_STUB = Object.fromEntries(Object.entries(DIM_META).map(([k, v]) => [k, v.label]));
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
  /* The three derived ones, from the module the endpoint builds them with. */
  ...GROWING_UP_FIELDS,
  /* ── TWO BRANCHES THE STUB DID NOT HAVE AT ALL ──────────────────────────
     The slicer taxonomy has a Horsemen branch and an Alignment by category
     branch, and neither field existed here, so both drew nothing and the
     probe said nothing about them. The horsemen are derived from the
     frequency answers by the module that owns those questions; the alignment
     is the real categoryAlignment over this person and the next one. */
  ...HORSEMAN_KEYS.map((h) => ({ key: h.key, label: 'Shows ' + h.label, group: 'Conflict Patterns',
    kind: 'cat', options: [{ v: 'Yes', label: 'Yes' }, { v: 'No', label: 'No' }], partnerable: true })),
  /* The four engagement cuts, as the endpoint declares them. */
  { key: 'depth_band', label: 'Depth in the portal', group: 'Engagement', kind: 'cat',
    options: ['Bottom 25%', 'Middle 50%', 'Top 25%'].map((v) => ({ v, label: v })),
    ordinal: true, poleLow: 'Bottom 25%', poleHigh: 'Top 25%' },
  { key: 'read_article', label: 'Has read an article', group: 'Engagement', kind: 'cat',
    options: [{ v: 'Yes', label: 'Yes' }, { v: 'No', label: 'No' }] },
  { key: 'has_survey', label: 'Has left a survey response', group: 'Engagement', kind: 'cat',
    options: [{ v: 'Yes', label: 'Yes' }, { v: 'No', label: 'No' }] },
  { key: 'nps_group', label: 'NPS group', group: 'Engagement', kind: 'cat',
    options: ['Promoter', 'Passive', 'Detractor'].map((v) => ({ v, label: v })) },
  { key: 'expalign_overall', label: 'Alignment across categories', group: 'Ex2 \u00b7 Alignment across categories',
    kind: 'scale', poleLow: 'Different answers', poleHigh: 'Same answers', partnerable: false },
  ...RESPONSIBILITY_CATEGORIES.map((c) => ({ key: 'expalign_' + c.id, label: c.label + ' alignment',
    group: 'Ex2 \u00b7 Alignment across categories', kind: 'scale',
    poleLow: 'Different answers', poleHigh: 'Same answers', partnerable: false })),
  { key: 'couple_type', label: 'Couple type', group: 'Type & axes', kind: 'cat' },
  /* The label and the poles as api/admin-explore.js sends them, not the raw
     key. This sent `label: d` and no poles at all, so the dimension tile drew
     ten rows called "energy", "expression" and so on in lower case, each ending
     "1 · low" and "5 · high". I read that as the product being wrong and went
     looking for it twice. A stub is a claim about the server. */
  ...DIMS.map((d) => ({ key: `dim_${d}`, label: (DIM_META[d] && DIM_META[d].label) || d,
    group: 'Dimensions (score 1–5)', kind: 'scale', partnerable: true,
    poleLow: (DIM_SCALE_POLES_STUB[d] || [])[0], poleHigh: (DIM_SCALE_POLES_STUB[d] || [])[1] })),
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
      /* genericLabel, the same function the endpoint runs. Replacing every
         placeholder with "you" gave two identical rows reading "Involvement
         with you's family", which is a stub inventing a label while the
         module that makes them is imported four lines up. */
      key: q.id, label: (q.category ? q.category + ' · ' : '') + genericLabel(String(q.text || q.id)),
      group: 'Ex2 · Life & values', kind: 'cat',
      ...(ordered ? { ordinal: true, poleLow: opts[0], poleHigh: opts[opts.length - 1] } : {}),
      options: opts.map((v) => ({ v, label: v })), partnerable: true,
    };
  }),
  ...RESPONSIBILITY_CATEGORIES.flatMap((cat) => (cat.items || []).slice(0, 2).map((item, i) => ({
    key: 'resp_' + cat.id + '_' + i,
    label: cat.label + ' · ' + genericLabel(String(item)),
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
/* ── THE VALUES THE PRODUCT STORES, NOT PRETTIER ONES ──────────────────────
   These were display-cased inventions: "Engaged", "1-2 years", "Instagram".
   The product stores the option VALUE from the signup form in src/App.jsx:
   `engaged`, `1-2`, `social`. Every admin page converts those through
   QX_VAL_LABELS, so a stub that stores the pretty form makes that conversion
   a no-op, and a page that forgot to convert looks exactly like one that did.
   One had: the Testimonials meta line printed `she/her`, `none`, `friend`
   while every other surface said Woman, None, Friend/family, and no screenshot
   taken against this stub could show it. */
const PRONOUNS = ['she/her', 'he/him', 'they/them', 'other'];
const AGES = ['25-34', '35-44', '45-54', '18-24'];
const STATUS = ['engaged', 'married', 'dating', 'partnership'];
const LENGTH = ['1-2', '3-5', '6-10', '20+'];
const SOURCE = ['social', 'friend', 'search', 'therapist'];

for (let i = 0; i < 40; i++) {
  /* A real answer set, run through the server's own scorer, so every derived
     field the page reads exists and agrees with how it is really produced. */
  const ex1 = {};
  PERSONALITY_QUESTIONS.forEach((q, k) => { ex1[q.id] = 1 + ((i + k * 3) % 5); });
  const scores = calcDimScores(ex1);
  const { withdrawScore, openScore } = axisScores(scores);
  const type = typeCodeFromAxes(withdrawScore, openScore);

  /**
   * ── TWO PEOPLE WITH NOBODY LINKED ───────────────────────────────────────
   * Every row here used to have a couple, so three paths never ran: the
   * funnel's `solo` count, the cube's unpaired reading, and a cut that keeps
   * PEOPLE but no COUPLES. The last of those is a real case - the panel
   * offers a value as soon as one person has it, and the response bundles
   * count pairs - and it is the one that looks exactly like the bug Ellie
   * reported if it is handled by putting the control back to Everyone.
   *
   * So the last pair is unpaired, and both of them are the only therapist
   * referrals, which makes "Heard via - Therapist" a cut with two people and
   * no couples in it.
   */
  const unpaired = i >= 38;
  const r = {
    couple_id: unpaired ? null : 'c' + Math.floor(i / 2),
    /* The per-person handle api/admin-explore.js mints with anonPersonId. The
       Engagement page reads it off the row to say which people a cut keeps,
       so a stub without it would send an empty list and report twelve working
       slicers as dead. The value is opaque on both sides; what has to be true
       is that this stub's engagement reply resolves the same handles. */
    person: 'pp' + i,
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
    /* ── A PERIOD THAT DOES NOT MATCH THE DEMOGRAPHICS ───────────────
       This was `i % 5 === 0`, and `children` cycles through five values
       starting at 'none', so every single intimacy responder had no
       children. Cutting that tile by "No children" kept exactly the same
       eight rows, the chart was byte-identical, and the probe reported a tile
       that honours its slicer as one that ignores it.

       Two moduli that share a factor is the same fixture fault as the
       conflict answers landing only on even i with the option index also i,
       and as the alignment group keyed on i%3 colliding with has_ex2. Seven
       is coprime with the five demographic values, the four of has_ex3 and
       the three of the alignment groups. */
    has_intimacy: i % 7 === 1 || i % 7 === 4,
    pronouns: pronounLabel(pick(PRONOUNS, i)),
    /* Who raised them, so the new Growing up slicers have something to
       draw. Mixed on purpose: two-parent, single, grandparents and a
       typed word that no role matches. */
    ...(() => {
      const ex2 = stubEx2(i);
      const g = guardiansOf(ex2);
      return {
        guardian_a: g.a || 'Something else',
        guardian_b: g.solo ? null : (g.b || 'Something else'),
        guardian_pair: g.pair,
        guardian_count: g.count,
        guardian_mom: g.hadMom ? 'Yes' : 'No',
        guardian_dad: g.hadDad ? 'Yes' : 'No',
        /* The three derived ones, through the module the endpoint uses. */
        ...growingUp(ex2, stubProfile(i), g),
      };
    })(),
    age_range: pick(AGES, i),
    relationship_status: pick(STATUS, i),
    relationship_length: pick(LENGTH, i),
    /* The values the product actually stores. 'Yes' and 'No' were invented
       here, so the regrouped "Children / No children" rows the slicer builds
       from 'none', '1', '2', '3+' matched nobody and never drew. */
    children: pick(['none', '1', '2', '3+', 'expecting'], i),
    /* An existing stored value, not an invented one: QX_VAL_LABELS and the
       slicer's value order both name the four this product collects, and a
       fifth would read as the raw key and might not be offered as a cut at
       all. */
    signup_source: unpaired ? 'therapist' : pick(SOURCE.slice(0, 3), i),
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
  /* ── ONLY THE EXERCISES THIS PERSON DID ────────────────────────────────
     Every row carried an answer to every question while its own has_ex2 and
     has_intimacy flags said otherwise, so the stub was two things at once:
     a cube where a third of people have not done Expectations, and a cube
     where everybody has. Nothing on the page could tell the difference, which
     is why a tile offering a cut with no rows in it looked the same as one
     that had been narrowed properly.

     Conflict has no has_ flag on the server either, so it is spelled the same
     way the page now reads it: the answers are simply absent for people who
     did not do it. */
  const didConflict = i % 2 === 0;
  const has = { cq_: didConflict, iq_: r.has_intimacy, resp_: r.has_ex2, lq_: r.has_ex2, ref_: r.has_ex3 };
  for (const f of fields) {
    if (!f.options || !f.options.length) continue;
    const prefix = Object.keys(has).find((k) => f.key.startsWith(k));
    if (!prefix) continue;
    if (!has[prefix]) continue;
    /* ── A FIXTURE'S PARITY CAN HIDE HALF A QUESTION ───────────────────
       This indexed by `i`, and conflict answers only exist for even `i`, so
       every two-option conflict question landed on the same side for
       everybody: one of its two answers was never stored and the slicer row
       for that side drew nothing. Halving `i` first breaks the collision. */
    r[f.key] = pick(f.options, (i >> 1) + i + f.key.length).v;
    /* How far the partner sits from them varies. It was always one step,
       which on a five-option scale is exactly the width that counts as
       aligned, so every intimacy dimension came out aligned for everybody and
       the "misaligned" half of that branch was never drawn. */
    r['p_' + f.key] = pick(f.options, i + 1 + (i % 3) + f.key.length).v;
  }
  /* ── THE ENGAGEMENT CUTS ────────────────────────────────────────────────
     Portal time is invented here, because page_events is a table this stub
     has no copy of; the BANDING is the endpoint's rule, run over whatever
     this cube's own people have, so the three bands come out the right size
     rather than being assigned by hand. Everything else follows the same
     rules the endpoint uses: a person left a survey response or did not, and
     NPS splits at 9 and 6. */
  r.__portalMs = (i % 7 === 3) ? 0 : (60000 + ((i * 37) % 97) * 15000);
  r.read_article = (i % 3 !== 1) ? 'Yes' : 'No';
  const leftSurvey = i % 3 !== 2;
  r.has_survey = leftSurvey ? 'Yes' : 'No';
  r.nps_group = !leftSurvey ? null : (() => {
    const n = (i * 3) % 11;
    return n >= 9 ? 'Promoter' : n <= 6 ? 'Detractor' : 'Passive';
  })();
  /* The four yes/no horsemen, from the frequency answers, through the module
     the endpoint uses. Null where they did not do the exercise, which is what
     the server leaves too: a slicer counting somebody who never answered as
     "does not show contempt" reports about people who are not there. */
  for (const h of HORSEMAN_KEYS) {
    r[h.key] = showsHorseman(r['cq_' + h.id]);
    r['p_' + h.key] = showsHorseman(r['p_cq_' + h.id]);
  }
  /* Alignment per category, run rather than invented: this person's
     Expectations answers against the next person's, through the same rule the
     Responses page and the cube both call. */
  if (r.has_ex2) {
    const mine = { name: STUB_SELF, partner_name: STUB_PARTNER, ex2_answers: stubEx2(i) };
    /* Half of these couples answer identically, so the "aligned" half of her
       twelve category rows has somebody in it. With every partner one step
       away, every category came out misaligned and six of those rows could
       never be drawn. Keyed on 2 rather than 3: has_ex2 is false exactly when
       i % 3 === 0, so a rule keyed on 3 picks out the people who are not in
       this half of the cube at all. */
    const theirs = { name: STUB_PARTNER, partner_name: STUB_SELF, ex2_answers: stubEx2(i % 2 === 1 ? i : i + 1) };
    const ca = categoryAlignment(mine, theirs);
    r.expalign_overall = ca.overall;
    for (const c of RESPONSIBILITY_CATEGORIES) {
      r['expalign_' + c.id] = ca.byCategory[c.id] ? ca.byCategory[c.id].pct : null;
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
/* The segments both an order and a survey answer carry off their person, the
   same set SEG_KEYS names in api/admin-explore.js. */
const SURVEY_SEG_KEYS = ['pronouns', 'age_range', 'relationship_status', 'relationship_length',
  'children', 'signup_source', 'type', 'axisEngage', 'axisOpen', 'couple_type', 'pkg'];
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
       claim the rule does nothing. The couple is the BUYER's couple, so this
       agrees with owner_row below rather than inventing a parallel set of
       couples the rows know nothing about. */
    couple_id: rows[i] ? rows[i].couple_id : null,
    /* ── WHICH PERSON BOUGHT IT ────────────────────────────────────────
       api/admin-explore.js sends the index of the buyer's cube row, and
       every order-page slicer now cuts through it. There are 48 orders and
       40 rows, so the last eight carry null, which is what an order the
       profile join could not place looks like: those answer through their
       own snapshot fields instead, and the chart stays honest about them. */
    owner_row: rows[i] ? i : null,
    ...row,
    addons: addonsOnOrder(row, promo ? STUB_CODE : null),
    /* The buyer's segments, copied onto the order the way the server copies
       SEG_KEYS. This is what an unplaced order answers a cut with, and the
       stub sent none of it, so the fallback branch in sliceJoined was
       unreachable here. */
    ...Object.fromEntries(SURVEY_SEG_KEYS.map((k) => [k, rows[i] && rows[i][k] != null ? rows[i][k] : null])),
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
/* `count` is the total the Explore page's meta line reports, and it was
   missing here while api/admin-explore.js has always sent it, so the harness
   read "undefined total" on a page that is fine in production. */
/* ── THE SURVEY ROWS THE CUBE CARRIES ──────────────────────────────────────
   `surveys` is one row per survey response, carrying that person's segments
   and their numeric answers, and the Couple type x outcomes tile on Type
   Analytics is built from it. The stub sent no such array at all, so that
   tile drew its empty state and its slicer offered nothing, and the probe
   reported neither. Built from the same question set the endpoint reads, and
   from the people already in this cube, so the segments on a survey row are
   the segments that person has everywhere else. */
const surveys = rows.map((r, i) => [r, i]).filter(([, i]) => i % 3 !== 2).map(([r, ri], i) => {
  const row = {};
  for (const k of SURVEY_SEG_KEYS) row[k] = r[k] != null ? r[k] : null;
  /* ── WHOSE ANSWER THIS IS ────────────────────────────────────────────
     The index into `rows`, not into this filtered list. The first version
     mapped with `.filter().map((r, i) => ...)`, where `i` counts the
     survivors, so every row after the first dropped one would have claimed
     the wrong person: a join that is off by one is worse than no join,
     because every figure it produces is plausible. */
  row.owner_row = ri;
  const when = new Date(Date.now() - (i * 5 + 2) * 86400000);
  row.month = when.toISOString().slice(0, 7);
  row.ts = when.toISOString();
  for (const q of SURVEY_QUESTIONS) {
    if (q.kind === 'stars') row[q.id] = 3 + (i % 3);
    else if (q.kind === 'scale') row[q.id] = 1 + (i % (q.scale || []).length);
    else if (q.kind === 'nps') row[q.id] = (i * 3) % 11;
    else if (q.kind === 'choice') row[q.id] = (q.options || [])[i % Math.max(1, (q.options || []).length)];
  }
  return row;
});

/* Depth, after the loop: a quartile is a fact about a population, and the
   endpoint sets it the same way for the same reason. The temporary field is
   deleted rather than sent, because the cube carries no raw times. */
{
  const measured = rows.map((r) => r.__portalMs).filter((n) => n > 0).sort((a, b) => a - b);
  const at = (frac) => (measured.length ? measured[Math.min(measured.length - 1, Math.floor(frac * (measured.length - 1)))] : null);
  const p25 = at(0.25), p75 = at(0.75);
  for (const r of rows) {
    const ms = r.__portalMs || 0;
    r.depth_band = (!ms || p25 == null) ? null : ms >= p75 ? 'Top 25%' : ms <= p25 ? 'Bottom 25%' : 'Middle 50%';
    delete r.__portalMs;
  }
}

const CUBE = { ok: true, fields: _placed.fields, dimNames: DIM_NAMES_STUB, count: rows.length, sections: EXPLORE_SECTIONS,
  unmappedGroups: _placed.unmapped, rows, orders, surveys, demoFilterApplied: true };

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
      /* The names beside the keys, as api/admin-data.js now sends them. */
      dimNames: DIM_NAMES_STUB,
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
      at: new Date(Date.now() - k * 9 * 864e5).toISOString(),
      life: Number((((k * 7) % 11) / 20).toFixed(4)),
      resp: Number((((k * 5) % 9) / 20).toFixed(4)),
      /* Ellie's rule needs a count of categories a couple is mostly out of
         step in, so the stub has to carry one or the two tiles both read
         "no couple has enough answers" and the rule is unmeasured. Spread
         across 0 to 5 so both halves of the split have couples in them. */
      catsRead: 6,
      catsBelow50: (k * 2) % 6,
    }));
    /* ── THE TWO INHERITANCE CHARTS, RUN RATHER THAN TYPED ───────────────
       These were five numbers per chart, chosen by hand. That is a claim
       about what the classifier does, made without running it, and it cannot
       produce the per-category split the clustered charts now draw: a stub
       that invents the totals would have had to invent the breakdown too, and
       the two would not have added up.

       So the probe builds answers in the shapes the database actually holds,
       including the OLDER childhood spelling where the adult's own word was
       stored, and runs readInheritance over them. The large "not classified"
       group is then a fact about the rule rather than a number I picked: the
       gendered read needs one adult, a gendered role name, a gendered pronoun
       and an expectation naming a person. */
    const inheritance = (() => {
      const items = RESPONSIBILITY_CATEGORIES.flatMap((c) => (c.items || []).map((item) => ({ key: c.id + '__' + item, cat: c.id })));
      const out = {
        people: 0,
        shape: { same: 0, sharedToOne: 0, oneToShared: 0, other: 0, unknown: 0 },
        gendered: { keepsSameGenderRole: 0, handsOffSameGenderRole: 0, takesOnOtherGenderRole: 0, handsOffOtherGenderRole: 0, unknown: 0 },
        byCat: {},
        categories: RESPONSIBILITY_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
      };
      rows.forEach((r, i) => {
        const ans = stubEx2(i);
        const profile = stubProfile(i);
        const adults = guardiansOf(ans);
        const got = readInheritance(ans, profile, items, adults);
        out.people += 1;
        for (const k of Object.keys(out.shape)) out.shape[k] += got.shape[k];
        for (const k of Object.keys(out.gendered)) out.gendered[k] += got.gendered[k];
        for (const [cat, half] of Object.entries(got.byCat || {})) {
          const into = out.byCat[cat] || (out.byCat[cat] = {
            shape: { same: 0, sharedToOne: 0, oneToShared: 0, other: 0, unknown: 0 },
            gendered: { keepsSameGenderRole: 0, handsOffSameGenderRole: 0, takesOnOtherGenderRole: 0, handsOffOtherGenderRole: 0, unknown: 0 },
          });
          for (const k of Object.keys(into.shape)) into.shape[k] += half.shape[k];
          for (const k of Object.keys(into.gendered)) into.gendered[k] += half.gendered[k];
        }
      });
      return out;
    })();
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
    /* ── THE TWO WRITTEN CONFLICT ANSWERS ──────────────────────────────
       Each question carries its OWN frame now, so the stub does too, and the
       sentences are about conflict rather than about the relationship: the
       reflection samples ("He brings me coffee every morning") match a
       conflict frame almost nowhere, and a stub where everything is uncoded
       cannot tell a frame that does not fit from one that was never run. */
    const CONFLICT_WRITING = {
      c9: [
        'He apologised first and that was the end of it',
        'We took a break and came back to it the next morning',
        'She actually listened without interrupting me',
        'We ended up laughing about it',
        'Naming the pattern out loud helped more than anything',
        'I said what was really bothering me instead of the surface thing',
        'Nothing in particular, it just fizzled out',
      ],
      c_grat: [
        'We never go to bed angry',
        'He owns his part every time',
        'Nobody ever shouts in our house',
        'She gives me time to think before we talk',
        'We always come back and finish it',
        'Neither of us brings up old things',
      ],
    };
    const conflictCodes = {
      questions: CONFLICT_QUESTIONS.filter((q) => q.kind === 'openText').map((q) => {
        const frame = conflictFrameFor(q.id) || REFLECTION_CODES;
        const writing = CONFLICT_WRITING[q.id] || SAMPLE_WRITING;
        return {
          id: q.id, label: q.text,
          frame: frame.map((c) => ({ id: c.id, label: c.label })),
          ...tallyCodes(writing, frame),
        };
      }),
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
          /* The poles, as the endpoint sends them. Without these the tile
             drew "one end" and "the other" on every row, which is the
             fallback and looks exactly like a dimension with no poles. */
          poleLow: (d.poles || [])[0] || null,
          poleHigh: (d.poles || [])[1] || null,
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
    /* ── A CUT IS ASKED FOR, NOT PRE-COMPUTED ────────────────────────────
       This stub used to carry a `responsesBySegment` map, one bundle per
       value of a list of fields, because the endpoint did. Both lists were a
       copy of which fields are sliceable, and the stub's was the shorter one
       twice over: two fields against the endpoint's ten, so the eight tiles
       that read these bundles offered eight cuts in the harness whatever the
       product offered, and the thing Ellie reported was invisible here.

       api/admin-data.js now takes the couples a cut keeps and answers with
       that bundle. The page works the list out from the cube's own rows, so
       this has to answer the same question the same way: filter the rows by
       the couple ids asked for, and shift the figures by how many couples
       came back. A cut that changes nothing is then visible as a number that
       did not move, which is what the probe is for.

       `only=responses` is the one-bundle reply; without it the page has the
       whole dashboard payload, as it does on first load. */
    const wanted = (url.searchParams.get('couples') || '').split(',').filter(Boolean);
    const unwanted = (url.searchParams.get('exclude') || '').split(',').filter(Boolean);
    /* `empty=1` is the page saying the cut keeps nobody, which the endpoint
       answers with the bundle over nobody. Without it here the harness would
       answer such a cut with the whole population and the tile would look
       uncut, which is the one case this parameter exists to tell apart. */
    const cutEmpty = url.searchParams.get('empty') === '1';
    let cutPairs = responses.pairs, shift = 0;
    if (cutEmpty) { cutPairs = 0; shift = 0; }
    else if (wanted.length || unwanted.length) {
      const want = new Set(wanted), drop = new Set(unwanted);
      const couples = [...new Set(rows.map((r) => r.couple_id).filter(Boolean))]
        .filter((c) => (want.size ? want.has(c) : !drop.has(c)));
      cutPairs = couples.length;
      /* Deterministic, and derived from the cut rather than from a counter,
         so the same cut gives the same figures on a redraw.
         ── AND NEVER ZERO ────────────────────────────────────────────────
         The first version was `(couples.length % 7) - 3`, which is 0 for a
         cut of ten couples, and ten is what the probe's own cut comes to. So
         four bundle-backed charts were handed figures identical to the whole
         population's and reported as not moving on a click: the fixture
         could not produce the case under test, for one value of one modulus.
         The same shape as a stub whose Unknown bucket sat at an index it
         never reached. */
      shift = 1 + (couples.length % 5);
    }
    /* ── EVERY FIGURE A BUNDLE TILE DRAWS, MOVED ────────────────────────
       The first version of this shifted `pairs` and the two intimacy numbers
       and nothing else, so CLICKCUT reported the dimension chart, the
       responsibilities chart, the big-questions chart and the relationship-
       feel chart as not moving on a cut. All four read dimScores, expAlign,
       lifeGaps and relationshipFeel, and those were byte-identical between
       the cut and the whole: the measurement could not tell a tile that
       honours its slicer from one that ignores it. Every array the shaper
       reads is shifted now. */
    const bump = (arr) => (Array.isArray(arr) ? arr.map((v) => (typeof v === 'number' ? Math.max(0, v + shift * 3) : v)) : arr);
    /**
     * Nobody at all, which is a different answer from a smaller group.
     *
     * The shift-based fake below moves every figure by a few points, and over
     * an empty cut it would move them from 78 to 78 and the tile would print
     * a percentage of nothing. api/admin-data.js runs its real aggregate over
     * no profiles and the means come back null, so this says null too: the
     * tiles have a dash for that and the harness should be able to show it.
     */
    if (cutEmpty && url.searchParams.get('only') === 'responses') {
      res.end(JSON.stringify({
        ok: true, demoFilterApplied: true, matched: 0, asked: null,
        responses: {
          ...responses,
          pairs: 0,
          dimScores: (responses.dimScores || []).map(() => null),
          expAlign: (responses.expAlign || []).map(() => null),
          relationshipFeel: (responses.relationshipFeel || []).map(() => 0),
          lifeGaps: [], respAgreement: [], expCoupleDistances: [],
          intimacyStats: { ...responses.intimacyStats,
            avgAlignment: null, partnerInitiates: null, noveltyCloseness: null,
            couples: 0, meanFor: {}, meanForPeople: 0 },
        },
      }));
      return;
    }
    const cutResponses = (cutEmpty || wanted.length || unwanted.length) ? {
      ...responses,
      pairs: Math.max(0, cutPairs),
      dimScores: bump(responses.dimScores),
      expAlign: bump(responses.expAlign),
      relationshipFeel: bump(responses.relationshipFeel),
      lifeGaps: (responses.lifeGaps || []).map((g) => ({ ...g, pct: Math.max(0, g.pct + shift * 3) })),
      respAgreement: (responses.respAgreement || []).map((g) => (
        typeof g === 'object' && g && typeof g.pct === 'number' ? { ...g, pct: Math.max(0, g.pct + shift * 3) } : g
      )),
      /* `couples` and `meanForPeople` as well as the two percentages. The
         Physical Intimacy at-a-glance tile prints `couples` as its n, and
         without it the probe read "n=18" before and after a cut and reported
         a tile that honours its slicer as one that ignores it. Every number
         a tile prints, or the fixture cannot show the cut landing. */
      intimacyStats: { ...responses.intimacyStats,
        avgAlignment: responses.intimacyStats.avgAlignment + shift,
        partnerInitiates: responses.intimacyStats.partnerInitiates + shift,
        noveltyCloseness: responses.intimacyStats.noveltyCloseness + shift,
        /* Allowed to reach nought, because that is what a cut with people and
           no couples in it really answers and the tile has to be able to show
           it. A floor of one here made the harness read "1 couple" where the
           product reads none. */
        couples: Math.round(responses.intimacyStats.couples * cutPairs / Math.max(1, responses.pairs)),
        meanForPeople: Math.round(responses.intimacyStats.meanForPeople * cutPairs / Math.max(1, responses.pairs)) },
      expCoupleDistances: (responses.expCoupleDistances || []).slice(0, cutPairs),
    } : responses;
    if (url.searchParams.get("only") === "responses") {
      /* `demoFilterApplied` on the cut reply too, as the endpoint sends it:
         the page routes this through noteDemoFilter like every other read,
         and a reply without it raises the "figures may count demo accounts"
         banner on the first slicer click. */
      res.end(JSON.stringify({ ok: true, demoFilterApplied: true, responses: cutResponses, matched: cutPairs, asked: wanted.length || null }));
      return;
    }
    res.end(JSON.stringify({ ok: true, orders, beta_codes, promoLink: { inherited: stubPromoLink.inherited, standalone: stubPromoLink.standalone }, responses: cutResponses }));
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
    /* ── THE CUT, HONOURED ──────────────────────────────────────────────
       This stub sent `slice: null` and the same figures whatever was asked
       for, so CLICKCUT reported every Engagement tile as not moving on a
       click and could not tell a tile that honours its slicer from one that
       ignores it. The endpoint's own cut is a list of person handles now, and
       this resolves the same list against the stub's rows and scales every
       figure by the share of people kept. A real cut on this page shows up as
       smaller numbers, which is what the page is being asked to prove. */
    const engKeep = (url.searchParams.get('people') || '').split(',').filter(Boolean);
    const engDrop = (url.searchParams.get('exclude') || '').split(',').filter(Boolean);
    let engPeople = rows.length;
    if (engKeep.length || engDrop.length) {
      const want = new Set(engKeep), drop = new Set(engDrop);
      engPeople = rows.filter((r) => (want.size ? want.has(r.person) : !drop.has(r.person))).length;
    }
    /* Never 1 for a real cut and never 0, so "it moved" and "there is still
       something to draw" are both testable. */
    const engFrac = engPeople >= rows.length ? 1 : Math.max(0.1, engPeople / rows.length);
    const cutN = (n) => Math.max(1, Math.round(n * engFrac));
    const headline = (value, prev) => ({ available: true, value: cutN(value), prev: cutN(prev), change: prev > 0 ? Math.round(((value - prev) / prev) * 100) : null });
    const unavailable = (why) => ({ available: false, why });
    const clustered = (labels, seedSite, seedApp, salt = 0) => ({
      available: true, labels,
      site: labels.map((_, i) => seedSite ? cutN(40 + (((i + salt) * 37) % 160)) : 0),
      app: labels.map((_, i) => seedApp ? cutN(30 + (((i + salt) * 53) % 220)) : 0),
      n: cutN(labels.length * 6),
      rows: labels.map((label, i) => ({ key: 'k' + i, label,
        site: { seconds: seedSite ? cutN(40 + (((i + salt) * 37) % 160)) : 0, n: seedSite ? cutN(6) : 0 },
        app: { seconds: seedApp ? cutN(30 + (((i + salt) * 53) % 220)) : 0, n: seedApp ? cutN(6) : 0 },
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
      slice: (engKeep.length || engDrop.length)
        ? { asked: engKeep.length || null, people: engPeople }
        : null,
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
          { step: 'Visited', points: MONTHS.map((_, i) => cutN(40 + ((i * 11) % 30))) },
          { step: 'Signed up', points: MONTHS.map((_, i) => cutN(14 + ((i * 7) % 12))) },
          { step: 'Started', points: MONTHS.map((_, i) => cutN(9 + ((i * 5) % 8))) },
          { step: 'Finished', points: MONTHS.map((_, i) => cutN(3 + ((i * 3) % 5))) },
        ] },
      acquisition: { available: true, months: MONTHS, note: 'Visits per month.',
        visits: MONTHS.map((_, i) => cutN(40 + ((i * 13) % 55))), downloads: null,
        downloadsNeeds: 'not collected. App Store Connect needs a key, and the app is not in the store yet.' },
      timePerPage: {
        marketing: clustered(['/home', '/offerings', '/practice', '/faq', '/purpose'], true, false),
        exercises: clustered(['Communication', 'Expectations', 'Reflection', 'Physical Intimacy', 'Conflict'], true, true),
        resources: clustered(['Workbook', 'Budget', 'Checklist'], true, true),
        results: clustered(groups.map((g) => g.label), true, true),
        /* ── EACH GROUP ITS OWN NUMBERS ──────────────────────────────────
         Every group got the same clustered() call, so the detailed tile drew
         identical data whichever pill was on. A probe asking "did tapping a
         pill change this chart" then answered no for the chart that is
         supposed to change, and could not have told a working pill from a
         dead one. The page names differ too, because a group's pages are not
         called Detail A anywhere in the product. */
      detailed: Object.fromEntries(groups.filter((g) => g.pages > 1).map((g, gi) => [
        g.id,
        clustered(
          Array.from({ length: Math.min(4, g.pages) }, (_, i) => `${g.label} ${i + 1}`),
          false, true, gi + 1,
        ),
      ])),
      },
      learning: { available: false, why: 'Not enough reads yet.' },
      groups, queryErrors: [],
      rowsRead: { profiles: engPeople, notes: cutN(12), tags: cutN(7), articleReads: cutN(38), events: cutN(214) },
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
      /* The five figures in the Data quality strip. Without them that row
         printed five em dashes, which reads as a measure nobody collects
         rather than a stub that forgot to send it. Counted from the rows this
         stub already built, so the numbers add up the way the endpoint's do:
         complete + partial = with answers. */
      dataQuality: {
        totalProfiles: rows.length,
        withAnswers: individuals.length,
        complete: individuals.filter((x) => !x.lowConf).length,
        partial: individuals.filter((x) => x.lowConf).length,
        unpaired: rows.length - couples.length * 2,
      },
      config: AXIS_CONFIG, questionWeights: QUESTION_WEIGHTS, dimKeys: DIM_KEYS,
      flipped: [], blend: 0.5, dims: Object.keys(DIM_KEYS) }));
    return;
  }
  /* ── THE SURVEY ─────────────────────────────────────────────────────────
     Feedback is the one page whose numbers come from /api/admin-survey, and
     this fell through to the catch-all below, which answers `{ rows: [] }`.
     So the whole page was an empty grid with no error anywhere: the probe
     printed "chart-grid 1184x0" and "no console errors", which is a harness
     saying nothing about a page it cannot see. Ellie's asks about the x axis
     and the ranking chart could not have been checked at all.

     The questions are SURVEY_QUESTIONS, the ones the endpoint sends. The
     ranking's options are rankOptionsFor, which is the only question built
     per person, so a stub that typed a list would be inventing the thing the
     chart is about. Answers are stored in the spellings the app writes: a
     number for stars, scale and nps, the option's own words for a choice, and
     an array of option names for the ranking. */
  if (url.pathname.startsWith('/api/admin-survey')) {
    const rankOptions = rankOptionsFor({
      done: Object.fromEntries(SURVEY_EXERCISES.map((e) => [e.key, true])),
      caps: { ownsWorkbook: true, ownsBudget: true, ownsChecklist: true },
      exercises: SURVEY_EXERCISES,
    });
    /* ── SENTENCES THE FRAME CAN READ ──────────────────────────────────
       Four short lines, none of which mention a subject, made the By category
       view draw one group and report 110 answers as matching nothing: a stub
       that cannot be coded cannot show whether the coding works. These are
       written the way people answer, across the subjects the frame has
       categories for. */
    const WORDS = [
      'We talked about money for the first time without it turning into a fight.',
      'The expectations section landed. We had never said out loud who does what.',
      'We were close to separating and this gave us somewhere to start.',
      'My mother in law comes up every christmas and we finally talked about it.',
      'I had no idea he felt that way about initiating. It was a surprise.',
      'It made me feel closer to her than I have in years.',
      'We have been together eleven years and still learned something.',
      'Reading my own answers back was the useful part.',
      'We argue less. Neither of us shouts now.',
      'With a baby coming we needed to agree on the chores before it arrives.',
    ];
    const responses = rows.map((r, i) => {
      const when = new Date(Date.now() - (i * 3 + 1) * 86400000).toISOString();
      const answers = {};
      for (const q of SURVEY_QUESTIONS) {
        if (q.kind === 'stars') answers[q.id] = 3 + (i % 3);
        else if (q.kind === 'scale') answers[q.id] = 1 + (i % (q.scale || []).length);
        else if (q.kind === 'nps') answers[q.id] = (i * 3) % 11;
        else if (q.kind === 'choice') answers[q.id] = (q.options || [])[i % Math.max(1, (q.options || []).length)];
        /* A different sentence per question as well as per person. With one
           array indexed by the person, the Testimonials page drew the same
           sentence three times under three different questions, which is a
           page nobody can read for the thing it is for. */
        else if (q.kind === 'text') answers[q.id] = WORDS[(i + q.id.length) % WORDS.length];
        else if (q.kind === 'rank') {
          /* A different order per person, so the mean place differs by option
             rather than every bar being the same height. */
          answers[q.id] = rankOptions.slice(i % rankOptions.length).concat(rankOptions.slice(0, i % rankOptions.length));
        }
      }
      return {
        id: 'sv' + i,
        started_at: when, updated_at: when,
        completed_at: i % 5 === 0 ? null : when,
        version: SURVEY_VERSION,
        answers,
        featured: i === 2,
        segment: {
          relationship_length: r.relationship_length, relationship_status: r.relationship_status,
          children: r.children, age_range: r.age_range, pronouns: r.pronouns,
          signup_source: r.signup_source, pkg: r.pkg,
        },
        /* ── WHICH COUPLE, SO THE TILE SLICERS CAN CUT AT ALL ──────────
           api/admin-survey.js sends the cube's own anonymous couple key on
           every response, and the Feedback page evaluates its cut against
           the cube rather than against the seven demographic columns above.
           A stub that left this off would answer every cut with nothing and
           report eleven working slicers as dead. */
        couple: r.couple_id || null,
        /* Coded by the real frame over the real answer, which is what the
           endpoint does. The stub used to hand-label one question "Money" on
           every fourth person, so the Testimonials category view drew one
           group however good the frame was. */
        codes: Object.fromEntries(TEXT_QUESTIONS
          .map((q) => [q, typeof answers[q] === 'string' && answers[q].trim()
            ? codesFor(answers[q], TESTIMONIAL_THEMES).map((id) => THEME_LABELS[id] || id) : []])
          .filter(([, v]) => v.length)),
      };
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true, version: SURVEY_VERSION, demoFilterApplied: true,
      questions: SURVEY_QUESTIONS.map((q) => (q.kind === 'rank' ? { ...q, options: rankOptions } : q)),
      textQuestions: TEXT_QUESTIONS,
      responses,
      counts: { all: responses.length, finished: responses.filter((x) => x.completed_at).length },
    }));
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
/* ── AN UNCAUGHT THROW IS NOT A console.error ──────────────────────────────
   This listened for console messages and nothing else, so a page whose init
   threw reported "no console errors" while half of it had never run. That is
   what hid an empty Explore page for a run: two selects with no options, a
   title with no text, and a harness saying everything was fine. */
page.on('pageerror', (t) => errors.push('uncaught: ' + t));

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
          /* Which coordinate spreads the categories depends on which way the
             chart runs. On a sideways bar, `.x` is where the bar ENDS, so
             reading it as the category position reports every row at the same
             place and calls a correct chart stale. The categories are on `.y`
             there, down the height of the drawing area. */
          const flipped = ch.options && ch.options.indexAxis === 'y';
          const area = flipped
            ? Math.round(ch.chartArea.bottom - ch.chartArea.top)
            : Math.round(ch.chartArea.right - ch.chartArea.left);
          const at = (pt) => Math.round((flipped ? pt.y - ch.chartArea.top : pt.x - ch.chartArea.left));
          const last = at(pts[pts.length - 1]);
          const stale = pts.length > 1 && last < area * 0.6;
          bars = `  bars ${pts.length}${flipped ? ' rows' : ''} first ${at(pts[0])}`
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
  /* The base bundle, which is the only one that arrives with the payload now.
     Every cut is fetched when a slicer asks for it, so this is a check that
     the payload shape still reaches the page rather than a list of cuts. */
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
console.log('base response bundle keys: ' + JSON.stringify(report.seg) + '  dimScores: ' + JSON.stringify(report.segDims).slice(0,90));
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

/* ── OPTS= ─────────────────────────────────────────────────────────────────
   What a dropdown actually offers. Ellie asked for slicers that only offer
   options with data for their tile, and the thing to measure is the list
   itself: a screenshot of a closed select says nothing, and a native popup is
   painted outside the page. Prints the count and the values so two runs can
   be compared. */
/* ── OPTSCAN= ──────────────────────────────────────────────────────────────
   How many cuts every slicer in the admin offers, in one browser.

   Ellie: "comp funnel only has a couple of slicer categories - it should have
   way more. Be thorough and fix this throughout the site." A count per slicer
   is the only way to tell which are narrow, and the top-level sections each
   one offers is the quickest way to see WHY. */
if (process.env.OPTSCAN) {
  const pages = await page.evaluate(() => [...document.querySelectorAll('.sb-item[onclick]')]
    .map((a) => (/showPage\('([^']+)'\)/.exec(a.getAttribute('onclick') || '') || [])[1]).filter(Boolean));
  for (const name of pages) {
    await page.evaluate((id) => {
      const el = [...document.querySelectorAll('.sb-item[onclick]')]
        .find((a) => (a.getAttribute('onclick') || '').includes("showPage('" + id + "')"));
      if (el) el.click();
    }, name);
    await new Promise((r) => setTimeout(r, 1400));
    const rows = await page.evaluate(() => [...document.querySelectorAll('.page.active .sd select')].map((sel) => {
      const leaves = (nodes) => (nodes || []).reduce((n, x) => n + (x.children ? leaves(x.children) : 1), 0);
      const tree = sel.__sliceTree || [];
      return {
        id: sel.id,
        cuts: leaves(tree),
        sections: tree.filter((n) => n.children).map((n) => n.label).join(' | ') || '(flat)',
      };
    }));
    for (const r of rows) console.log(`  optscan ${name}/${r.id}  ${String(r.cuts).padStart(4)} cuts   ${r.sections}`);
  }
}

if (process.env.OPTS) {
  const ids = process.env.OPTS.split(',').map((x) => x.trim()).filter(Boolean);
  if (process.env.OPTS_ALL) await page.evaluate(() => { window.__optsAll = true; });
  const got = await page.evaluate((list) => list.map((id) => {
    const el = document.getElementById(id);
    if (!el) return id + ': no such control';
    const opts = [...el.options];
    const real = opts.filter((o) => o.value && !o.disabled);
    /* OPTS_ALL prints every value rather than the first six: a taxonomy is
       only checkable if you can read the rows it produced. */
    const show = window.__optsAll ? real : real.slice(0, 6);
    return id + ': ' + real.length + ' choices  [' + show.map((o) => o.value).join(' | ')
      + (show.length < real.length ? ' | …' : '') + ']';
  }), ids);
  for (const line of got) console.log('  opts ' + line);
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
/**
 * CLICK=.fp-btn — press something before the picture is taken.
 *
 * A control that only exists once opened cannot be photographed otherwise,
 * and the field picker's panel is exactly that. Clicks carry coordinates in
 * the middle of the element: a dispatched click with none is a click at x=0,
 * which this repo has already been caught by once, in the one gate written to
 * prove a tap works.
 */
/**
 * PICKER=xp-row-field — what the coloured field picker is actually showing.
 *
 * The picker renders a hidden <select> rather than holding its own copy of the
 * field list, so the thing worth measuring is whether the two agree: a band
 * per optgroup, an option per option, and a real colour on every band. A
 * screenshot shows bands; only a count shows a missing one.
 *
 * Printed as one machine-readable line per picker so check-field-picker can
 * assert on it without a second fixture of its own.
 */
if (process.env.PICKER) {
  for (const id of process.env.PICKER.split(',').map((x) => x.trim()).filter(Boolean)) {
    const out = await page.evaluate((selId) => {
      const sel = document.getElementById(selId);
      if (!sel) return { id: selId, err: 'no such select' };
      const wrap = sel.closest('.sd');
      if (!wrap) return { id: selId, err: 'the select was never mounted in a picker' };
      const btn = wrap.querySelector('.sd-btn');
      if (!btn) return { id: selId, err: 'no button' };
      const panel = wrap.querySelector('.sd-panel');
      const r = btn.getBoundingClientRect();
      const hit = (el) => {
        const b = el.getBoundingClientRect();
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true,
          clientX: Math.round(b.left + b.width / 2), clientY: Math.round(b.top + b.height / 2) }));
      };
      hit(btn);

      const bands = [...panel.querySelectorAll('.sd-band')];
      /* The painted colour, not the declared one: a band whose background
         resolved to nothing is the bug she reported, a banner that is not
         there. */
      const colours = bands.map((b) => getComputedStyle(b).backgroundColor);
      /* What the tree says, walked here rather than counted from the markup,
         because only the top level is drawn at any moment. */
      const leafVals = (nodes, out) => { (nodes || []).forEach((x) => { if (x.children) leafVals(x.children, out); else out.push(x.value); }); return out; };
      const vals = leafVals(sel.__sliceTree, []);
      const opts = [...sel.querySelectorAll('option')].map((o) => o.value);
      /* Compared as sets rather than as counts, because the empty value is
         legitimately in one and not the other: a slicer's "Everyone" row is
         drawn by the picker and a field picker's "— none —" is a leaf. */
      const inTree = new Set(vals), inSel = new Set(opts);
      const sections = (sel.__sliceTree || []).filter((n) => n.children).length;
      const res = {
        id: selId,
        open: !panel.hidden,
        bands: bands.length,
        sections,
        leaves: vals.length,
        selOpts: opts.length,
        /* A leaf nothing can select, and an option nothing offers. */
        missing: vals.filter((v) => !inSel.has(v)).length,
        extra: opts.filter((v) => v !== '' && !inTree.has(v)).length,
        flat: colours.filter((c) => !c || c === 'transparent' || c === 'rgba(0, 0, 0, 0)').length,
        /* Every band is its own colour, or two sections look like one. */
        distinct: new Set(colours).size,
        wide: bands.length ? Math.round(bands[0].getBoundingClientRect().width) : 0,
        panelWide: Math.round(panel.getBoundingClientRect().width),
        btnText: (btn.textContent || '').replace(/\u25be/g, '').trim().slice(0, 60),
      };

      /* ── IT HAS TO GO SOMEWHERE AND COME BACK ────────────────────────
         A panel that lists sections and does nothing when one is clicked is
         the same failure as a band with no colour: it looks finished. */
      if (bands.length) {
        hit(bands[0]);
        const back = panel.querySelector('.sd-back');
        res.drilled = !!back && !!panel.querySelector('.sd-row:not(.sd-back)');
        res.rowsInside = panel.querySelectorAll('.sd-row:not(.sd-back)').length;
        res.crumb = (panel.querySelector('.sd-head') || {}).textContent || '';
        if (back) { hit(back); res.wentBack = panel.querySelectorAll('.sd-band').length === bands.length; }
      }
      /* Her extra row, which only the field pickers have. */
      res.allQuestions = (sel.__sliceTree || []).some((n) => (n.children || []).some((c) => c.label === 'All questions'));

      hit(btn);
      res.closes = !!panel.hidden;
      return res;
    }, id);
    console.log('  picker ' + JSON.stringify(out));
  }
}

/* ── NAMES= ────────────────────────────────────────────────────────────────
   Every control on the open page, and whether a screen reader could say what
   it is. check-control-names does this for the 38 static pages and has never
   looked at the admin, which is the surface with the most controls on it. */
if (process.env.NAMES) {
  /* NAMES=all walks every page in this one browser, because the navigation is
     client side and thirteen launches to ask one question of each page is two
     minutes a build for nothing. */
  const pages = process.env.NAMES === 'all'
    ? await page.evaluate(() => [...document.querySelectorAll('.sb-item[onclick]')]
        .map((a) => (/showPage\('([^']+)'\)/.exec(a.getAttribute('onclick') || '') || [])[1])
        .filter(Boolean))
    : [null];
  for (const name of pages) {
    if (name) {
      await page.evaluate((id) => {
        const el = [...document.querySelectorAll('.sb-item[onclick]')]
          .find((a) => (a.getAttribute('onclick') || '').includes("showPage('" + id + "')"));
        if (el) el.click();
      }, name);
      await new Promise((r) => setTimeout(r, 1200));
    }
  const out = await page.evaluate(() => {
    const vis = (e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed';
    const named = (e) => !!(
      (e.getAttribute('aria-label') || '').trim() ||
      (e.getAttribute('title') || '').trim() ||
      (e.textContent || '').trim() ||
      (e.labels && e.labels.length) ||
      (e.getAttribute('aria-labelledby') || '').trim()
    );
    const bad = [];
    for (const e of document.querySelectorAll('.page.active button, .page.active select, .page.active input, .page.active a')) {
      if (!vis(e)) continue;
      if (e.type === 'hidden') continue;
      if (!named(e)) bad.push(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className ? '.' + String(e.className).split(' ')[0] : ''));
    }
    const total = [...document.querySelectorAll('.page.active button, .page.active select, .page.active input, .page.active a')].filter(vis).length;
    return { total, bad: bad.slice(0, 10), n: bad.length };
  });
  console.log('  names ' + (name || PAGE) + ': ' + out.total + ' visible controls, ' + out.n + ' with no name'
    + (out.n ? ': ' + out.bad.join(', ') : ''));
  }
}

/* ── PILLPROBE= ────────────────────────────────────────────────────────────
   Does tapping a pill change any chart but its own? Ellie has reported this
   twice, and the first fix was real and was not the cause. Reads every chart
   on the page as a fingerprint of its data, taps the second pill, and reads
   them all again. */
if (process.env.PILLPROBE) {
  const snap = () => page.evaluate(() => {
    const out = {};
    for (const c of document.querySelectorAll('.page.active canvas')) {
      const ch = window.Chart && Chart.getChart(c);
      if (!ch) continue;
      /* The instance id as well as the data. mkChart destroys the old chart
         and builds a new one, so a tile that is redrawn with identical
         numbers still gets a new id. That redraw, with its animation, is
         what "the others are changing" looked like; data alone could not
         see it. */
      out[c.id] = ch.id + ':' + JSON.stringify((ch.data.datasets || []).map((d) => d.data));
    }
    return out;
  });
  const before = await snap();
  const tapped = await page.evaluate(() => {
    const pills = [...document.querySelectorAll('#eng-det-pills [data-pick]')];
    const next = pills.find((p) => !p.classList.contains('on'));
    if (!next) return null;
    next.click();
    return next.getAttribute('data-pick');
  });
  await new Promise((r) => setTimeout(r, 1200));
  const after = await snap();
  const changed = Object.keys(before).filter((k) => before[k] !== after[k]);
  console.log('  pillprobe ' + JSON.stringify({ tapped, charts: Object.keys(before).length, changed }));
}

/* ── RESETPROBE= ───────────────────────────────────────────────────────────
   Does a cut survive leaving the page and coming back? Ellie's words: very
   important. Sets the first derived cut on a named slicer, navigates away,
   navigates back, and reports what the slicer holds. */
if (process.env.RESETPROBE) {
  const [selId, other] = process.env.RESETPROBE.split(':');
  /* The TILE, not just the dropdown. A reset that sets `.value` and does not
     tell the tile leaves the control saying Everyone over a chart still
     showing a cut, and reading the select alone cannot see that: the first
     version of this probe passed a plant that removed the change event. */
  const tileOf = (id) => page.evaluate((selId2) => {
    const sel = document.getElementById(selId2);
    const card = sel && sel.closest('.chart-card');
    const canvas = card && card.querySelector('canvas');
    const ch = canvas && window.Chart && Chart.getChart(canvas);
    const sub = card && card.querySelector('.chart-subtitle');
    return {
      data: ch ? JSON.stringify((ch.data.datasets || []).map((d) => d.data)) : null,
      sub: sub ? (sub.textContent || '').trim() : null,
    };
  }, id);
  const uncut = await tileOf(selId);
  const before = await page.evaluate((id) => {
    const sel = document.getElementById(id);
    if (!sel) return { err: 'no such slicer' };
    const pick = [...sel.options].find((o) => o.value);
    if (!pick) return { err: 'that slicer offers nothing' };
    sel.value = pick.value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return { set: pick.value, label: (pick.textContent || '').trim().slice(0, 50) };
  }, selId);
  await new Promise((r) => setTimeout(r, 800));
  const go = async (name) => {
    await page.evaluate((id) => {
      const el = [...document.querySelectorAll('.sb-item[onclick]')]
        .find((a) => (a.getAttribute('onclick') || '').includes("showPage('" + id + "')"));
      if (el) el.click();
    }, name);
    await new Promise((r) => setTimeout(r, 1200));
  };
  await go(other);
  await go(PAGE);
  const after = await page.evaluate((id) => {
    const sel = document.getElementById(id);
    if (!sel) return { err: 'the slicer is gone' };
    const btn = sel.closest('.sd') && sel.closest('.sd').querySelector('.sd-btn-text');
    return { value: sel.value, button: btn ? (btn.textContent || '').trim().slice(0, 50) : null };
  }, selId);
  const tileBack = await tileOf(selId);
  console.log('  resetprobe ' + JSON.stringify({
    ...before, after,
    tileSame: uncut.data != null && tileBack.data === uncut.data,
    uncutSub: uncut.sub, backSub: tileBack.sub,
  }));
}

/* ── TREEAUDIT= ────────────────────────────────────────────────────────────
   Every slicer on the open page, every leaf it offers, resolved.

   A dropdown cannot be read for this. A leaf whose predicate was never
   registered, a leaf that matches nobody, a leaf that matches EVERYBODY and a
   branch with nothing under it are four different bugs, and all four look
   like an ordinary row in a list. The tree and the rows are both in the page,
   so the honest thing is to ask them. */
if (process.env.TREEAUDIT) {
  const out = await page.evaluate(() => {
    const sels = [...document.querySelectorAll('.page.active .sd select')];
    const report = [];
    for (const sel of sels) {
      const tree = sel.__sliceTree || [];
      const leaves = [];
      const emptyBranches = [];
      const walk = (nodes, trail) => nodes.forEach((n) => {
        if (n.children) {
          if (!n.children.length) emptyBranches.push(trail.concat(n.label).join(' > '));
          walk(n.children, trail.concat(n.label));
        } else leaves.push({ v: n.value, path: trail.concat(n.label).join(' > ') });
      });
      walk(tree, []);
      /* The population this slicer was built from. Read back off the tile
         rather than guessed: window.__CUBE_FOR_SLICERS is everybody, and a
         tile's slicer may have been built from fewer. */
      const all = (window.__CUBE_FOR_SLICERS && window.__CUBE_FOR_SLICERS.rows) || [];
      const unregistered = [], nobody = [], everybody = [];
      for (const leaf of leaves) {
        if (!leaf.v) continue;
        if (leaf.v.indexOf('g::') === 0) {
          /* A top-level `const` in a classic script is not a property of
             window, so `window.SLICE_PRED` is undefined and every leaf would
             have reported as unregistered: a sweep that is wrong about where
             it is looking reports a disaster rather than nothing. */
          const preds = (typeof SLICE_PRED !== 'undefined') ? SLICE_PRED : null;
          const pred = preds && preds[leaf.v.slice(3)];
          if (!pred) { unregistered.push(leaf.path); continue; }
          const n = all.filter(pred.test).length;
          if (!n) nobody.push(leaf.path);
          else if (n === all.length && all.length > 1) everybody.push(leaf.path);
        } else {
          const i = leaf.v.indexOf('::');
          const k = leaf.v.slice(0, i), val = leaf.v.slice(i + 2);
          const n = all.filter((r) => String(r[k]) === val).length;
          if (!n) nobody.push(leaf.path);
          else if (n === all.length && all.length > 1) everybody.push(leaf.path);
        }
      }
      report.push({ id: sel.id, leaves: leaves.length, emptyBranches, unregistered, nobody, everybody });
    }
    return report;
  });
  for (const r of out) {
    const bad = r.emptyBranches.length + r.unregistered.length + r.nobody.length + r.everybody.length;
    console.log('  tree ' + r.id + ': ' + r.leaves + ' leaves' + (bad ? '  PROBLEMS ' + JSON.stringify({
      emptyBranches: r.emptyBranches.slice(0, 4), unregistered: r.unregistered.slice(0, 4),
      nobody: r.nobody.slice(0, 6), everybody: r.everybody.slice(0, 6),
    }) : '  clean'));
  }
}

/* ── CLICKCUT= ─────────────────────────────────────────────────────────────
   A cut made the way a person makes one: open the panel, walk down to a leaf,
   click it.

   Every test of a cut so far has assigned `sel.value` in code, which skips the
   whole control: the panel, the walk, pick(), the label and the event. Ellie:
   "Just made a slicer selection but the chart didnt change and slicer still
   says everyone." Nothing here had ever driven that path.

   Reports what the select holds, what the button says, and whether the tile
   behind it moved. */
if (process.env.CLICKCUT) {
  /* CLICKCUT=all walks every slicer on the open page, because the fault Ellie
     hit is on one tile somewhere and testing one tile proves one tile. */
  /* CLICKCUT=every walks the whole admin in one browser, because a gate that
     launches Chrome once per page spends two minutes a build asking one
     question thirteen times. */
  const pages = process.env.CLICKCUT === 'every'
    ? await page.evaluate(() => [...document.querySelectorAll('.sb-item[onclick]')]
        .map((a) => (/showPage\('([^']+)'\)/.exec(a.getAttribute('onclick') || '') || [])[1]).filter(Boolean))
    : [null];
  for (const pageName of pages) {
  if (pageName) {
    await page.evaluate((id) => {
      const el = [...document.querySelectorAll('.sb-item[onclick]')]
        .find((a) => (a.getAttribute('onclick') || '').includes("showPage('" + id + "')"));
      if (el) el.click();
    }, pageName);
    await new Promise((r) => setTimeout(r, 1500));
  }
  const ids = (process.env.CLICKCUT === 'all' || process.env.CLICKCUT === 'every')
    ? await page.evaluate(() => [...document.querySelectorAll('.page.active .sd select')].map((s) => s.id).filter(Boolean))
    : [process.env.CLICKCUT];
  for (const selId of ids) {
  const read = () => page.evaluate((id) => {
    const sel = document.getElementById(id);
    if (!sel) return { err: 'no such slicer' };
    const wrap = sel.closest('.sd');
    const btn = wrap && wrap.querySelector('.sd-btn-text');
    const card = sel.closest('.chart-card');
    const canvas = card && card.querySelector('canvas');
    const ch = canvas && window.Chart && Chart.getChart(canvas);
    const sub = card && card.querySelector('.chart-subtitle');
    return {
      value: sel.value,
      button: btn ? (btn.textContent || '').trim() : null,
      options: sel.options.length,
      /**
       * What the tile is SHOWING, whichever kind of tile it is.
       *
       * A chart's datasets when there is a chart. When there is not, the
       * numbers printed on the card: four at-a-glance tiles on the Responses
       * page are figures rather than charts, and this read null for them and
       * reported "no chart", so a cut landing on one of those was invisible.
       * Two of them drew four dashes on every cut for a while and nothing
       * here could see it.
       *
       * Digits only, so a caption that happens to name the cut does not read
       * as the figure moving.
       */
      /**
       * ── THE BODY, NOT THE WHOLE CARD ──────────────────────────────────
       * The first version scraped `card.textContent`, and the card's head
       * holds the slicer: after a click the button reads "Demographics - Age
       * - 18-24", which has digits in it. So five tiles whose figures had not
       * moved an inch reported moved=true, and a plant that made the server
       * accept a cut and ignore it passed this gate. The measurement was
       * manufacturing the evidence it was written to look for, which is this
       * repo's own warning about a matcher that matches too much.
       *
       * The body is where the figures are: `.chart-body` when there is one,
       * otherwise everything in the card that is not its head.
       */
      data: ch ? JSON.stringify((ch.data.datasets || []).map((d) => d.data))
        : (() => {
          if (!card) return null;
          const body = card.querySelector('.chart-body')
            || [...card.children].filter((c) => !c.classList.contains('chart-head'))
              .map((c) => c.textContent || '').join(' ');
          const text = typeof body === 'string' ? body : (body.textContent || '');
          return ((text.match(/[0-9.]+/g) || []).join(',') || null);
        })(),
      sub: sub ? (sub.textContent || '').trim().slice(0, 60) : null,
    };
  }, selId);

  /**
   * ── TWO PASSES, BECAUSE THE FIRST ONE ONLY EVER TESTED HALF ───────────
   * The walk below takes the first branch and the first leaf, which on every
   * slicer in this admin is Demographics -> Age -> 18-24: a plain
   * `field::value` cut. So twelve Engagement slicers offering a hundred and
   * fifty cuts were driven only on the handful their endpoint could honour,
   * and a DERIVED cut there matched nobody and drew every tile at zero. The
   * measurement could not reach the broken half.
   *
   * A derived cut is a predicate held in the page - a band, a regroup, an
   * alignment either side of a line - so its option label is the path to it,
   * and the path is read off the option and then CLICKED, section by
   * section. Still the control a person uses; aimed at the half that was
   * never being aimed at.
   *
   * Both in one visit, because a gate that opens a second browser and walks
   * all thirteen pages again spends minutes asking the other half of one
   * question. DERIVED=only drives just the second pass.
   */
  const passes = process.env.DERIVED === 'only' ? ['derived']
    : process.env.DERIVED ? ['value', 'derived'] : ['value'];
  for (const pass of passes) {
  const before = await read();
  /**
   * ── THE CUT THIS PASS IS AIMING AT ────────────────────────────────────
   * The walk below takes the first branch and the first leaf, which on every
   * slicer in this admin is Demographics -> Age -> 18-24: a plain
   * `field::value` cut. So twelve Engagement slicers offering a hundred and
   * fifty cuts were driven only on the handful their endpoint could honour,
   * and a derived cut there matched nobody and drew every tile at zero. The
   * measurement could not reach the broken half.
   *
   * A derived cut is a predicate held in the page - a band, a regroup, an
   * alignment either side of a line - and its option label is the path to it,
   * so the path is read off the option and then CLICKED, section by section.
   * Still the control a person uses; just aimed at the half that was never
   * being aimed at.
   */
  const wantPath = pass === 'derived' ? await page.evaluate((id) => {
    const sel = document.getElementById(id);
    if (!sel) return null;
    const o = [...sel.options].find((x) => x.value.indexOf('g::') === 0);
    if (!o) return null;
    return { value: o.value, path: (o.textContent || '').split(' \u00b7 ').map((t) => t.trim()).filter(Boolean) };
  }, selId) : null;
  if (pass === 'derived' && !wantPath) {
    console.log('  derivedcut none ' + (pageName ? pageName + '/' : '') + selId + ' offers no derived cut');
    continue;
  }
  /* Open it the way a finger does. */
  const steps = [];
  const hit = (sel2) => page.evaluate((q) => {
    const el = document.querySelector(q);
    if (!el) return 'nothing at ' + q;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return 'no box at ' + q;
    const label = (el.textContent || '').trim().slice(0, 40);
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true,
      clientX: Math.round(r.left + r.width / 2), clientY: Math.round(r.top + r.height / 2) }));
    return 'clicked ' + label;
  }, sel2);

  const wrapSel = `#${selId}`;
  steps.push(await page.evaluate((id) => {
    const sel = document.getElementById(id);
    const btn = sel && sel.closest('.sd') && sel.closest('.sd').querySelector('.sd-btn');
    if (!btn) return 'no button';
    btn.click();
    return 'opened';
  }, selId));
  await new Promise((r) => setTimeout(r, 300));

  /* Walk down the first branch until a leaf, then take the first leaf. */
  for (let depth = 0; depth < 5; depth++) {
    const what = await page.evaluate(([id, want, d]) => {
      const sel = document.getElementById(id);
      const panel = sel && sel.closest('.sd') && sel.closest('.sd').querySelector('.sd-panel');
      if (!panel || panel.hidden) return { done: 'the panel is not open' };
      const rows = [...panel.querySelectorAll('.sd-row')].filter((r) => !r.classList.contains('sd-back'));
      /* The no-cut row is not a cut. "Everyone" on a slicer and "— none —" on
         a field picker both mean "go back to nothing", and picking one proves
         nothing about whether a choice sticks. */
      const leaf = rows.find((r) => !r.querySelector('.sd-chev')
        && (r.textContent || '').trim() !== 'Everyone'
        && r.__sdValue !== '' && r.__sdValue != null);
      const branch = rows.find((r) => r.querySelector('.sd-chev'));
      /* Aiming at one particular cut: take the row this depth of its path
         names, rather than the first of anything. A path step that is not on
         screen is reported rather than silently falling back to the first
         row, because a fallback here is the measurement quietly testing
         something else. */
      let target = leaf || branch;
      if (want && want.path) {
        const step = want.path[d];
        /* ── THE CHEVRON IS PART OF THE ROW'S TEXT ──────────────────────
           A branch row draws a chevron inside itself, so its textContent is
           "Demographics\u203a" and never equals the option label's
           "Demographics". The first run of this reported every slicer as
           having no such row, which reads exactly like a broken panel: the
           harness was wrong about the markup, which is the first thing to
           suspect. innerText would not have helped either; this is a child
           element rather than a text transform. */
        const clean = (r) => (r.textContent || '').replace(/[\u203a\u276f\u00bb>]/g, '').trim();
        const named = rows.find((r) => clean(r) === step);
        if (!named) return { done: 'no row named ' + JSON.stringify(step) + ' at depth ' + d };
        target = named;
      }
      if (!target) return { done: 'nothing to click' };
      const label = (target.textContent || '').trim().slice(0, 40);
      /* eslint-disable-next-line no-unused-vars */
      /* What the row is FOR, and whether the select can hold it. A leaf whose
         value is not among the options is the failure this was written to
         find, and it looks exactly like a click that did nothing. */
      const picked = target.__sdValue != null && !target.querySelector('.sd-chev') ? target.__sdValue : null;
      target.click();
      return { clicked: label, leaf: picked != null, want: picked,
        /* `picked`, not `want`: when the derived drive arrived, `want` became
           the PATH object passed in, and comparing an option's value to an
           object is false for every option. So every derived pick reported
           "amongTheOptions=false" while the select was plainly holding the
           value a moment later. A shadowed name turned the one assertion
           this line exists for into a constant. */
        hasOption: picked == null ? null : [...sel.options].some((o) => o.value === picked),
        optionCount: sel.options.length };
    }, [selId, wantPath, depth]);
    if (what.done) { steps.push(what.done); break; }
    steps.push((what.leaf ? 'picked ' : 'into ') + what.clicked
      + (what.leaf ? ' [value=' + what.want + ' amongTheOptions=' + what.hasOption + ' of ' + what.optionCount + ']' : ''));
    if (what.leaf) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  await new Promise((r) => setTimeout(r, 900));
  const after = await read();
  /* Aiming at one cut means the test is whether THAT cut landed, not whether
     anything did. */
  const ok = wantPath
    ? after.value === wantPath.value
    : (!!after.value && after.button !== 'Everyone');
  console.log('  ' + (wantPath ? 'derivedcut ' : 'clickcut ') + (ok ? 'ok   ' : 'FAIL ') + (pageName ? pageName + '/' : '') + selId + ' ' + JSON.stringify({
    steps, button: after.button, value: after.value,
    sub: before.sub === after.sub ? 'unchanged: ' + after.sub : before.sub + ' -> ' + after.sub,
    tileMoved: before.data != null ? (after.data !== before.data) : 'no chart',
  }));
  }
  }
  }
}

/* ── CUTTEST= ──────────────────────────────────────────────────────────────
   Does a DERIVED cut actually cut, and does it cut only its own tile?

   A regroup, a score band or an alignment either side of a line is not a
   column, so it is a predicate held in the page rather than a value in a row.
   Nothing about that is visible in the markup: a predicate that matches
   everybody and a predicate that is never consulted both leave the tile
   showing the whole population, and both look exactly like a working slicer.

   So this picks the first derived cut a slicer offers, the way a person would,
   and reads every tile's n before and after. */
if (process.env.CUTTEST) {
  const out = await page.evaluate((selId) => {
    const sel = document.getElementById(selId);
    if (!sel) return { err: 'no such select' };
    const nOf = () => [...document.querySelectorAll('.page.active .chart-card')]
      .map((c) => {
        const sub = c.querySelector('.chart-subtitle');
        const m = /n=(\d+)/.exec((sub && sub.textContent) || '');
        return m ? Number(m[1]) : null;
      });
    const mine = [...document.querySelectorAll('.page.active .chart-card')].findIndex((c) => c.contains(sel));
    const derived = [...sel.options].find((o) => o.value.indexOf('g::') === 0);
    if (!derived) return { err: 'this slicer offers no derived cut at all' };
    const before = nOf();
    sel.value = derived.value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return { id: selId, mine, cut: derived.value, label: derived.textContent, before };
  }, process.env.CUTTEST);
  await new Promise((r) => setTimeout(r, 900));
  /* ── MAKE THE OTHER TILES REDRAW ────────────────────────────────────────
     A tile only reads a slicer when it renders, so a tile that reads the
     WRONG slicer keeps its old number until something makes it draw again:
     the first version of this plant-tested clean against exactly that bug,
     because nothing on the page had re-rendered. Nudging every other slicer
     with its own unchanged value is what a person does by touching anything
     else on the page. */
  await page.evaluate((selId) => {
    [...document.querySelectorAll('.page.active .sd select')]
      .filter((s) => s.id !== selId)
      .forEach((s) => s.dispatchEvent(new Event('change', { bubbles: true })));
  }, process.env.CUTTEST);
  await new Promise((r) => setTimeout(r, 900));
  const after = await page.evaluate(() => [...document.querySelectorAll('.page.active .chart-card')]
    .map((c) => {
      const sub = c.querySelector('.chart-subtitle');
      const m = /n=(\d+)/.exec((sub && sub.textContent) || '');
      return m ? Number(m[1]) : null;
    }));
  console.log('  cuttest ' + JSON.stringify({ ...out, after }));
}

if (process.env.SORTPROBE) {
  /* Click a sortable header and read the column back, because a comparator
     can be read as correct and still order by the weekday name. */
  const [tableId, colIdx] = process.env.SORTPROBE.split(':');
  const out = await page.evaluate(([id, i]) => {
    const t = document.getElementById(id);
    if (!t) return { err: 'no table ' + id };
    const th = t.querySelector('[data-sort-col="' + i + '"]');
    if (!th) return { err: 'column ' + i + ' is not sortable' };
    const col = () => [...t.querySelectorAll('tbody tr')].map((r) => (r.children[i]?.textContent || '').trim()).filter(Boolean);
    const r = th.getBoundingClientRect();
    const click = () => th.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true,
      clientX: Math.round(r.left + r.width / 2), clientY: Math.round(r.top + r.height / 2) }));
    click(); const asc = col();
    click(); const desc = col();
    return { asc: asc.slice(0, 5), descFirst: desc.slice(0, 2), n: asc.length };
  }, [tableId, Number(colIdx)]);
  console.log('  sort ' + process.env.SORTPROBE + ': ' + JSON.stringify(out));
}

if (process.env.CARDS) {
  const out = await page.evaluate(() => [...document.querySelectorAll('.chart-grid')]
    .filter((g) => g.offsetParent !== null)
    .map((g) => [...g.children].map((c) => Math.round(c.getBoundingClientRect().height)).join(' vs ')));
  for (const row of out) console.log('  card row: ' + row);
}

if (process.env.PANEL) {
  const out = await page.evaluate(() => {
    const b = document.querySelector('.fp-btn'); if (!b) return 'no picker';
    const r = b.getBoundingClientRect();
    b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: Math.round(r.left+r.width/2), clientY: Math.round(r.top+r.height/2) }));
    const p = document.querySelector('.fp-panel');
    return [...p.children].map((el) => (el.className.includes('band') ? '## ' : el.className.includes('sub') ? '  # ' : el.tagName === 'INPUT' ? '[search] ' : '    ') + (el.textContent || '').trim()).join('\n');
  });
  console.log(out);
}

if (process.env.CLICK) {
  for (const q of process.env.CLICK.split('|').map((x) => x.trim()).filter(Boolean)) {
    const out = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return 'no such element';
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return 'element has no box, so a click would land nowhere';
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true,
        clientX: Math.round(r.left + r.width / 2), clientY: Math.round(r.top + r.height / 2) }));
      return 'clicked at ' + Math.round(r.left + r.width / 2) + ',' + Math.round(r.top + r.height / 2);
    }, q);
    console.log(`  click ${q}: ${out}`);
  }
  /* React is not on screen when dispatchEvent returns, and nor is anything
     else that redraws. Click, wait, then read. */
  await new Promise((r) => setTimeout(r, 600));
}

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

/* ── TEXT= ─────────────────────────────────────────────────────────────────
   The words at a CSS selector. Most of what the admin says about a tile is in
   a subtitle with no id, so READ=, which takes ids, cannot reach it: "n=40"
   against "n=12" is the only way to tell whether a cut actually cut. */
if (process.env.TEXT) {
  const sels = process.env.TEXT.split('|').map((x) => x.trim()).filter(Boolean);
  const got = await page.evaluate((list) => list.map((q) => {
    const els = [...document.querySelectorAll(q)].filter((e) => e.offsetParent !== null);
    if (!els.length) return q + ': nothing visible matches';
    return q + ': ' + els.slice(0, 6).map((e) => (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 70)).join('  |  ');
  }), sels);
  for (const line of got) console.log('  text ' + line);
}

/* ── SCROLL= ───────────────────────────────────────────────────────────────
   FULL_PAGE=1 re-lays out every responsive chart mid-capture, which this file
   already says about pie axes and which cost a round here: the ranking tile
   photographed as eight stubs huddled at the left while the chart reported
   its bars ending at 860 of 1032. The picture was wrong and the measurement
   was right. So a tile below the fold is reached by scrolling to it and
   taking an ordinary viewport shot, which changes no layout at all. */
if (process.env.SCROLL) {
  await page.evaluate((to) => {
    const n = Number(to);
    if (Number.isFinite(n)) { window.scrollTo(0, n); return n; }
    const el = document.querySelector(to);
    if (el) el.scrollIntoView({ block: 'start' });
    return el ? Math.round(window.scrollY) : null;
  }, process.env.SCROLL);
  await new Promise((r) => setTimeout(r, 400));
}
/**
 * ── ERRORS THE PROBE ITSELF CAUSED ────────────────────────────────────────
 * The report above reads window.__probeErrors once, before SET, CLICK,
 * CLICKCUT and the rest have run. So anything those caused was collected and
 * never printed: driving a slicer into a refusal logged a console.error and
 * the run still ended with "no console errors", which is the harness unable
 * to see what it did itself.
 *
 * Read again at the end, and print only what is new.
 */
{
  const after = await page.evaluate(() => window.__probeErrors || []);
  const before = (report.errors || []).length;
  const fresh = after.slice(before);
  if (fresh.length) {
    console.log(`\nconsole.error while driving (${fresh.length}):`);
    for (const e of fresh.slice(0, 8)) console.log('  ' + String(e).slice(0, 160));
  }
}
const shot = await page.screenshot({ fullPage: process.env.FULL_PAGE === '1' });
writeFileSync(OUT, Buffer.from(shot, 'base64'));
console.log('picture: ' + OUT);
await page.close();
server.close();
