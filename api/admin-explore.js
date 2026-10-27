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
import { pronounLabel } from './_lib/pronouns.js';
import { calcDimScores, blendedDimScores, axisScores, typeCodeFromAxes, DIM_KEYS } from './_type-engine.js';
import { personResults, readAccuracy, ALIGNMENT_THRESHOLD, understandingBandFor } from './_lib/results.js';
import { JOURNAL_ANCHOR } from './_lib/tags.js';
import { JOURNAL_BUCKETS, JOURNAL_VOLUME_BANDS, journalBucket, journalUseByOwner, journalVolumeBand } from './_lib/journal-use.js';
// Individual type from raw ex1 answers (for invited partners who answered via a
// partner_session and never created a full profile).
function typeFromEx1(ans){
  const sc = calcDimScores(ans);
  if (!sc || !Object.keys(sc).length) return null;
  const { withdrawScore, openScore } = axisScores(sc);
  return typeCodeFromAxes(withdrawScore, openScore);
}
import { PERSONALITY_QUESTIONS, PARTNER_VIEW_TEXT, LIFE_QUESTIONS, RESPONSIBILITY_CATEGORIES,
  CHILDHOOD_ROLES, guardiansOf } from './_questions.js';
import { REFLECTION_QUESTIONS } from './_anniversary-questions.js';
import { INTIMACY_QUESTIONS, INTIMACY_DIMENSIONS } from './_intimacy-questions.js';
import { withEffectivePromoCodes } from './_lib/order-promo.js';
import { categoryAlignment } from './_lib/resp-agreement.js';
import { genericLabel } from './_lib/generic-label.js';
import { DIM_META, DIM_SCALE_POLES } from './_lib/dimensions.js';
import { CONFLICT_QUESTIONS, FREQUENCY_OPTIONS, RISK_QUESTIONS } from './_conflict-questions.js';

// Runs on the edge runtime (Web-style (req)=>Response handler), matching the
// other admin endpoints. Without this, Vercel's Node runtime can't invoke it
// and every request fails with FUNCTION_INVOCATION_FAILED.
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
import { SURVEY_QUESTIONS } from './_lib/survey.js';
import { demoOwners, ownedBy, selectProfiles, withoutDemoOrders } from './_lib/demo-accounts.js';
import { addonsOnOrder, ORDER_ADDONS } from './_lib/order-addons.js';
import { COMPILED_BETA_CODES, codeMetaFromRow } from './_lib/beta-codes.js';
import { EXPLORE_SECTIONS, placeAll } from './_lib/explore-sections.js';

// No Access-Control-Allow-Origin.
//
// This answered `*`. The admin page fetches it with a relative URL from the
// same origin, so CORS never applied to the only caller it has; the wildcard
// was permission granted to the whole internet for nothing in return.
// Emitting no header is stricter than an allowlist: a cross-origin read is
// refused by the browser outright. corsHeaders takes a request when an
// endpoint genuinely needs to answer another origin.
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: corsHeaders(),
  });

/* DIM_POLES moved to ./_lib/dimensions.js as DIM_SCALE_POLES, beside the
   labels, because it had exactly the same two faults as the label map and
   made independently: a `stress` entry that is not a dimension, and no
   `reassurance`, which is one. Every caller reads `(DIM_POLES[dim] || [])[0]`,
   so the Reassurance slider fell back to "1 · low" and "5 · high" while the
   other nine named their ends. The module now fails to load if the two maps
   ever cover different dimensions. */
const DIM_POLES = DIM_SCALE_POLES;
/* ── THE PRODUCT'S OWN NAMES, NOT A SECOND SET ─────────────────────────────
   This was a map typed here. It carried `stress`, which has not been a
   dimension for a long time, and it had no `reassurance`, which is one. Every
   caller reads `DIM_LABELS[dim] || dim`, so that field fell through to its own
   key and Ellie read a row called "reassurance" in lower case among nine
   capitalised ones: "Reassurance is the only dimension not capitalized."

   A fallback that fires for exactly one of ten entries is the hardest kind to
   see, because nine rows prove the mechanism works. The names come from
   api/_lib/dimensions.js now, which is what the results pages and the workbook
   print, so there is nothing left to drift. */
const DIM_LABELS = Object.fromEntries(Object.entries(DIM_META).map(([k, v]) => [k, v.label]));
const TYPE_LABELS = { W: 'W · Initiator', X: 'X · Anchor', Y: 'Y · Feeler', Z: 'Z · Protector' };
const DEMO_LABELS = {
  /* Labelled Gender at Ellie's ask, converted from the pronoun that was
     collected: "I know we ask pronoun but I want to convert to gender." The
     key stays `pronouns` because that is the field, and the admin's one value
     table turns she/her into Woman. */
  age_range: 'Age range', pronouns: 'Gender', relationship_status: 'Relationship status',
  relationship_length: 'Time together', children: 'Children', signup_source: 'Signup source',
};
const DEMO_KEYS = Object.keys(DEMO_LABELS);

/* Pronouns, not gender: `pronounLabel` is in _lib/pronouns.js, with the whole
   story of why. This file used to carry its own copy of it, identical to the
   one in admin-typing.js. */
const RESP_OPTS = ['Me', 'Both', 'Partner', 'N/A'];
/**
 * Where each answer sits on the one-person-to-the-other axis.
 *
 * `N/A` is deliberately null: "doesn't apply to us" is a real answer and not a
 * point on this line, so it is left out of the mean rather than placed at one
 * end of it. Counting it as "my partner" is how a couple who simply do not own
 * a car would read as expecting their partner to service it.
 */
const RESP_POSITION = { Me: 0, Both: 0.5, Partner: 1, 'N/A': null };
const IDIM_LABEL = Object.fromEntries((INTIMACY_DIMENSIONS || []).map((d) => [d.id, d.label]));

// First sentence / clause, trimmed — used to label the two poles of a scale question.
const shortPole = (t) => {
  const c = String(t || '').split('.')[0].trim();
  return c.length > 30 ? c.slice(0, 28) + '…' : c;
};
// Strip the {userName}/{partnerName} templates to a neutral, name-free label.

// Tiny non-reversible hash of the sorted id pair → anonymous couple key.
const coupleHash = (a, b) => {
  const s = [a, b].filter(Boolean).sort().join('|');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return 'c' + h.toString(36);
};

// Per-respondent "own" fields (the partner-denormalized p_* are added in a second pass).
function ownFields(p) {
  const hasE1 = !!(p.ex1_answers && Object.keys(p.ex1_answers).length > 0);
  const scores = hasE1 ? calcDimScores(p.ex1_answers) : {};
  const { withdrawScore, openScore } = axisScores(scores);
  const type = hasE1 ? typeCodeFromAxes(withdrawScore, openScore) : null;
  const _axisW = (hasE1 && Number.isFinite(withdrawScore)) ? Number(withdrawScore.toFixed(3)) : null;
  const _axisO = (hasE1 && Number.isFinite(openScore)) ? Number(openScore.toFixed(3)) : null;
  const r = {
    type,
    axisEngage: type == null ? null : (type === 'W' || type === 'X' ? 'Engage' : 'Withdraw'),
    axisOpen: type == null ? null : (type === 'W' || type === 'Y' ? 'Open' : 'Guarded'),
    pkg: p.pkg || 'core',
    axis_w: _axisW,
    axis_o: _axisO,
    has_ex2: !!(p.ex2_answers && Object.keys(p.ex2_answers).length > 0),
    has_ex1: hasE1,
    has_ex3: !!(p.ex3_answers && Object.keys(p.ex3_answers).length > 0),
    has_intimacy: !!(p.intimacy_data && p.intimacy_data.answers && Object.keys(p.intimacy_data.answers).length > 0),
  };
  for (const k of DEMO_KEYS) r[k] = p[k] != null && p[k] !== '' ? p[k] : null;
  r.pronouns = pronounLabel(p.pronouns);
  for (const dim of Object.keys(DIM_KEYS)) {
    r['dim_' + dim] = scores[dim] != null ? Number(Number(scores[dim]).toFixed(3)) : null;
  }
  for (const q of PERSONALITY_QUESTIONS) {
    const v = p.ex1_answers ? p.ex1_answers[q.id] : null;
    r['q_' + q.id] = v != null && !isNaN(v) ? Number(v) : null;
  }
  // Partner-view answers: Part 2 of the comms exercise re-asks all 27 questions
  // about the partner, stored as pv_<questionId>. Denormalized as p_pv_* onto
  // the partner's row = "how your partner sees you". (The old scheme was four
  // dimension-level pv_<dim> items; those no longer exist.)
  const pvRaw = {};
  for (const q of PERSONALITY_QUESTIONS) {
    const v = p.ex1_answers ? p.ex1_answers['pv_' + q.id] : null;
    const n = v != null && !isNaN(v) ? Number(v) : null;
    r['pv_' + q.id] = n;
    if (n != null) pvRaw[q.id] = n;
  }
  // Dimension scores built from those answers: how this person reads their
  // partner on each dimension, on the same 1-5 scale as dim_*.
  const pvScores = Object.keys(pvRaw).length ? calcDimScores(pvRaw) : {};
  for (const dim of Object.keys(DIM_KEYS)) {
    r['pvdim_' + dim] = pvScores[dim] != null ? Number(Number(pvScores[dim]).toFixed(3)) : null;
    // How far this person's read of their partner is from what the partner
    // actually said. Signed, so over- and under-reading are distinguishable.
    r['readerr_' + dim] = null;
  }
  // Ex2 life questions: stored flat under ex2_answers.life
  const life = (p.ex2_answers && p.ex2_answers.life) || {};
  for (const lq of LIFE_QUESTIONS) r[lq.id] = life[lq.id] != null && life[lq.id] !== '' ? life[lq.id] : null;
  /* ── WHO RAISED THEM ──────────────────────────────────────────────────
     Ellie: "I want to be able to segment in admin based on which guardians
     someone selected, or if they had a mom."

     From api/_questions.js, which also reads the eight legacy structures, so
     a couple who answered before the pickers existed is segmentable too. The
     raw word stays in their answers; these are the grouped version. */
  const guardians = guardiansOf(p.ex2_answers);
  r.guardian_a = guardians?.a || (guardians ? 'Something else' : null);
  r.guardian_b = guardians ? (guardians.solo ? null : (guardians.b || 'Something else')) : null;
  r.guardian_pair = guardians?.pair || null;
  r.guardian_count = guardians?.count || null;
  r.guardian_mom = guardians ? (guardians.hadMom ? 'Yes' : 'No') : null;
  r.guardian_dad = guardians ? (guardians.hadDad ? 'Yes' : 'No') : null;

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
  /**
   * Which wording this person answered under.
   *
   * Ellie: "I want a chart above all questions that shows pre-intimate vs
   * intimate couples' avg placement on each dimension."
   *
   * Every intimacy question carries two wordings and the record says which was
   * shown: `premarital` imagines it, `married` describes it. That is the only
   * thing in the product that separates the two groups she is asking about, so
   * it is the thing to group by. Null for somebody who has not taken it, which
   * keeps them out of both columns rather than defaulting them into one.
   */
  r.intimacy_variant = p.intimacy_data?.variant === 'married' ? 'Regularly intimate'
    : p.intimacy_data?.variant === 'premarital' ? 'Not yet'
    : null;
  /**
   * ── CONFLICT PATTERNS ───────────────────────────────────────────────────
   * Ellie: "Need a responses page in admin for conflict exercise."
   *
   * The same treatment Physical Intimacy already gets: every answer that is a
   * choice becomes a category you can slice by, and the two open-text
   * questions do not, because a paragraph is not a category. The ranking is
   * skipped for the same reason the intimacy multi-selects are: an ordering is
   * not one answer.
   *
   * ── AND WHAT IS NOT HERE ────────────────────────────────────────────────
   * Nothing that identifies anybody. This cube is anonymous by construction
   * and the admin reads it that way. The rule these answers are under
   * elsewhere, SCREENS.md's "this screen must never render the partner's
   * patterns", is about one partner seeing the other's: the person, not the
   * aggregate. check-conflict-privacy holds that, over the partner view, and
   * is untouched by this.
   */
  const conf = (p.conflict_data && p.conflict_data.answers) || {};
  for (const q of CONFLICT_QUESTIONS) {
    const raw = conf[q.id];
    if (q.kind === 'scale') {
      const opt = (q.options || []).find((o) => o.value === raw);
      r['cq_' + q.id] = opt ? opt.label : null;
    } else if (q.kind === 'frequency') {
      const opt = FREQUENCY_OPTIONS.find((o) => o.value === raw);
      r['cq_' + q.id] = opt ? opt.label : null;
    } else if (q.kind === 'forcedAB') {
      /* Stored as the chosen side. The label is the sentence they picked,
         which is what makes a distribution readable without the question
         beside it. */
      r['cq_' + q.id] = raw === 'a' ? q.a : raw === 'b' ? q.b : null;
    } else if (q.kind === 'pickOne') {
      r['cq_' + q.id] = (typeof raw === 'string' && raw) ? raw : null;
    }
  }
  /* The four yes/no fields the slicer offers. Null rather than "No" when the
     question is unanswered: a slicer that counts somebody who never took the
     exercise as "does not show contempt" is reporting about people who are
     not there. */
  for (const h of HORSEMAN_KEYS) {
    const v = r['cq_' + h.id];
    r[h.key] = v == null ? null : (HORSEMAN_PRESENT.includes(v) ? 'Yes' : 'No');
  }
  return r;
}

// Fields whose partner-equivalent (p_<key>) is meaningful to segment by.
/**
 * Whether somebody shows each of the four horsemen, as a sliceable yes or no.
 *
 * ── WHY IT IS DERIVED AND NOT THE ANSWER ──────────────────────────────────
 * Ellie: "Add to slicer 'exhibits [horseman]', add 4 rows, one for each. Also
 * add 'partner exhibits [horseman]', 4 more rows."
 *
 * The stored answer is a frequency, one of Never, Rarely, Sometimes, Often. A
 * slicer over four frequencies for four horsemen is sixteen rows, and the cut
 * anybody actually wants is "the people this shows up for". So each one
 * becomes a yes or no at the same line the Risk patterns chart already draws:
 * Sometimes or Often.
 *
 * That line is written once, here, and read by both. It was previously typed
 * into the chart alone, so moving it would have moved the chart and left the
 * slicer cutting at the old place, which is two answers to "does this show up
 * for them".
 */
const HORSEMAN_PRESENT = ['Sometimes', 'Often'];
const HORSEMAN_KEYS = RISK_QUESTIONS.map((q) => ({ key: 'horse_' + q.id.replace(/^c_/, ''), id: q.id, label: q.riskLabel || q.id }));

const PARTNERABLE = [
  'type', 'axisEngage', 'axisOpen', ...DEMO_KEYS,
  /* Who raised each of them, which is the pair of questions you would
     most want side by side: a mom-and-dad household beside a
     grandparent one. */
  'guardian_a', 'guardian_b', 'guardian_pair', 'guardian_count', 'guardian_mom', 'guardian_dad',
  /* The partner half of Ellie's eight rows. Marked partnerable rather than
     computed twice: the denormaliser already copies every partnerable key onto
     the row as p_<key>, so "partner exhibits Contempt" is the same derivation
     read from the other side. */
  ...HORSEMAN_KEYS.map((h) => h.key),
  ...Object.keys(DIM_KEYS).map((d) => 'dim_' + d),
  ...PERSONALITY_QUESTIONS.map((q) => 'q_' + q.id),
  ...LIFE_QUESTIONS.map((lq) => lq.id),
  ...RESPONSIBILITY_CATEGORIES.flatMap((c) => c.items.map((_, i) => 'resp_' + c.id + '_' + i)),
  ...REFLECTION_QUESTIONS.map((q) => 'ref_' + q.id),
  ...INTIMACY_QUESTIONS.filter((q) => q.kind !== 'multi').map((q) => 'iq_' + q.id),
  'intimacy_variant',
  ...CONFLICT_QUESTIONS.filter((q) => ['scale', 'frequency', 'forcedAB', 'pickOne'].includes(q.kind)).map((q) => 'cq_' + q.id),
  ...PERSONALITY_QUESTIONS.map((q) => 'pv_' + q.id),
  ...Object.keys(DIM_KEYS).map((d) => 'pvdim_' + d),
  ...Object.keys(DIM_KEYS).map((d) => 'readerr_' + d),
  'read_error_mean', 'reads_partner', 'understanding', 'worst_misread_dim',
];

// Beta-survey fields joined onto the respondent by their profile id, so survey
// answers are segmentable by every demographic/type field already in the cube.
/**
 * The survey's own questions as explorable fields.
 *
 * ── DERIVED, NOT RESTATED ─────────────────────────────────────────────────
 * This was five hand-typed maps naming nine scales and two categories of the
 * 26-question beta survey, with their labels and their pole wording. Every one
 * of those questions is retired, and the maps would have gone on offering them
 * as filters over rows that can no longer carry an answer.
 *
 * So the fields come from SURVEY_QUESTIONS. A rating, a scale and an NPS are
 * numbers, which the explorer can cross-tab as scales; a choice is a category
 * whose options are the question's own. The ranking and the open answers are
 * not fields: an ordering is not a number and a paragraph is not a category.
 * `fb_<id>` keys are kept so a saved view in somebody's browser still resolves.
 */
const FB_NUMERIC = new Set(['stars', 'scale', 'nps']);
const FB_FIELDS = SURVEY_QUESTIONS
  .filter((q) => FB_NUMERIC.has(q.kind) || q.kind === 'choice')
  .map((q) => ({
    key: `fb_${q.id}`,
    src: q.id,
    label: `Survey \u00b7 ${q.label.replace(/\?$/, '')}`,
    kind: FB_NUMERIC.has(q.kind) ? 'scale' : 'cat',
    /* A scale's two ends, where the question gives them. The old map typed
       them out; a five-point scale carries its own labels. */
    poleLow: q.scale ? q.scale[0] : (q.kind === 'nps' ? '0' : '1'),
    poleHigh: q.scale ? q.scale[q.scale.length - 1] : String(q.max || 5),
    options: q.kind === 'choice' ? (q.options || []) : null,
  }));
const FB_SCALE_SRC = Object.fromEntries(FB_FIELDS.filter((f) => f.kind === 'scale').map((f) => [f.key, f.src]));
const FB_CAT_SRC = Object.fromEntries(FB_FIELDS.filter((f) => f.kind === 'cat').map((f) => [f.key, f.src]));

function buildCatalog(fbCatOptions) {
  const f = [];
  f.push({ key: 'type', label: 'Individual type', group: 'Type & axes', kind: 'cat',
    options: Object.entries(TYPE_LABELS).map(([v, label]) => ({ v, label })), partnerable: true });
  f.push({ key: 'axisEngage', label: 'Engage / Withdraw', group: 'Type & axes', kind: 'cat',
    options: [{ v: 'Engage', label: 'Engage' }, { v: 'Withdraw', label: 'Withdraw' }], partnerable: true });
  f.push({ key: 'axisOpen', label: 'Open / Guarded', group: 'Type & axes', kind: 'cat',
    options: [{ v: 'Open', label: 'Open' }, { v: 'Guarded', label: 'Guarded' }], partnerable: true });

  /* ── GUARDIANS ─────────────────────────────────────────────────────────
     Her ask, and the options are the role list the pickers offer plus the two
     answers a free-typed word can produce, so a slicer can never show a value
     the cube cannot hold. */
  const ROLE_OPTS = [...CHILDHOOD_ROLES, 'Something else'].map((v) => ({ v, label: v }));
  f.push({ key: 'guardian_a', label: 'Guardian 1', group: 'Growing up', kind: 'cat',
    options: ROLE_OPTS, partnerable: true });
  f.push({ key: 'guardian_b', label: 'Guardian 2', group: 'Growing up', kind: 'cat',
    options: ROLE_OPTS, partnerable: true });
  f.push({ key: 'guardian_pair', label: 'Guardians, as a pair', group: 'Growing up', kind: 'cat',
    partnerable: true });
  f.push({ key: 'guardian_count', label: 'How many adults', group: 'Growing up', kind: 'cat',
    options: [{ v: 'One adult', label: 'One adult' }, { v: 'Two adults', label: 'Two adults' }],
    partnerable: true });
  f.push({ key: 'guardian_mom', label: 'Had a mom', group: 'Growing up', kind: 'cat',
    options: [{ v: 'Yes', label: 'Yes' }, { v: 'No', label: 'No' }], partnerable: true });
  f.push({ key: 'guardian_dad', label: 'Had a dad', group: 'Growing up', kind: 'cat',
    options: [{ v: 'Yes', label: 'Yes' }, { v: 'No', label: 'No' }], partnerable: true });
  f.push({ key: 'couple_type', label: 'Couple type', group: 'Type & axes', kind: 'cat' });
  f.push({ key: 'pkg', label: 'Package', group: 'Package & cohort', kind: 'cat',
    options: [['core', 'Core'], ['newlywed', 'Newlywed'], ['anniversary', 'Anniversary'], ['premium', 'Premium']].map(([v, label]) => ({ v, label })) });
  for (const k of DEMO_KEYS) f.push({ key: k, label: DEMO_LABELS[k], group: 'Demographics', kind: 'cat', partnerable: true });
  for (const dim of Object.keys(DIM_KEYS)) f.push({ key: 'dim_' + dim, label: DIM_LABELS[dim] || dim, group: 'Dimensions (score 1–5)', kind: 'scale', poleLow: (DIM_POLES[dim]||[])[0], poleHigh: (DIM_POLES[dim]||[])[1], partnerable: true });
  for (const q of PERSONALITY_QUESTIONS) f.push({ key: 'q_' + q.id, label: q.text, group: 'Ex1 · Communication (1–5)', kind: 'scale', poleLow: shortPole(q.a), poleHigh: shortPole(q.b), partnerable: true });
  /* ── A ROW HAS TO SAY WHAT IT IS ──────────────────────────────────────────
     Ellie, of the field picker: "what are all of the 'read error' lines under
     comms styles?"

     Fair question, and the label was the whole of the answer: ten rows saying
     "Energy & Recharge read error" and nothing else. What they measure is how
     far this person's guess about their partner was from what the partner
     actually said, signed, so nought is a perfect read. That used to be
     carried by the GROUP name, "Ex1 . Understanding (0 = read exactly right)",
     and the picker groups by section now, so the group never reaches the
     screen and the explanation went with it.

     The group stays, because a grouping can still use it. The label is what
     she reads. */
  for (const dim of Object.keys(DIM_KEYS)) f.push({ key: 'readerr_' + dim, label: 'How far their guess was off: ' + (DIM_LABELS[dim] || dim), group: 'Ex1 . Understanding (0 = read exactly right)', kind: 'scale', partnerable: true });
  f.push({ key: 'read_error_mean', label: 'Mean read error', group: 'Ex1 . Understanding (0 = read exactly right)', kind: 'scale', partnerable: true });
  f.push({ key: 'reads_partner', label: 'Reads partner', group: 'Ex1 . Understanding (0 = read exactly right)', kind: 'cat', partnerable: true });
  f.push({ key: 'understanding', label: 'Couple understanding', group: 'Ex1 . Understanding (0 = read exactly right)', kind: 'cat' });
  f.push({ key: 'alignment_group', label: 'Aligned / Misaligned', group: 'Ex1 . Understanding (0 = read exactly right)', kind: 'cat' });
  f.push({ key: 'understanding_group', label: 'In tune / Misunderstood', group: 'Ex1 . Understanding (0 = read exactly right)', kind: 'cat' });
  f.push({ key: 'worst_misread_dim', label: 'Most misread dimension', group: 'Ex1 . Understanding (0 = read exactly right)', kind: 'cat', partnerable: true });
  /* ── IT SAID THE OPPOSITE OF WHAT IT HOLDS ────────────────────────────────
     Ellie: "as read by partner doesn't make sense." It did not, and the
     reason is that it was backwards. This field is built eight lines up from
     `pvScores`, which the comment there calls "how this person reads their
     PARTNER": it is the row's own guess about the other person, on the same
     one-to-five scale. The label said somebody else had read them.

     So anyone cutting by it was reading the wrong person's answer, and the
     only clue was a label that already did not make sense. */
  for (const dim of Object.keys(DIM_KEYS)) f.push({ key: 'pvdim_' + dim, label: 'Their guess about their partner: ' + (DIM_LABELS[dim] || dim), group: 'Ex1 · Their read of their partner (1–5)', kind: 'scale', poleLow: (DIM_POLES[dim]||[])[0], poleHigh: (DIM_POLES[dim]||[])[1], partnerable: true });
  for (const q of PERSONALITY_QUESTIONS) {
    const pvt = PARTNER_VIEW_TEXT[q.id] || {};
    f.push({ key: 'pv_' + q.id, label: pvt.text || q.text, group: 'Ex1 · Partner-view (1–5)', kind: 'scale', poleLow: shortPole(pvt.a || q.a), poleHigh: shortPole(pvt.b || q.b), partnerable: true });
  }
  /**
   * ── A LIFE QUESTION IS AN ORDERED SCALE ─────────────────────────────────
   * Ellie: "All questions should have pole labels with avg placement marked. I
   * want it just like comms with the slicer that defaults to mean but can show
   * the breakdown."
   *
   * These were plain categories, so the admin drew five coloured segments and
   * no mean. Their options are written in order, from one end of a position to
   * the other, which is what makes a mean meaningful at all: "Not part of my
   * future" through to "Central to my future" is an axis, and the ends of it
   * are the poles.
   *
   * Taken from the question's own option list rather than written here, so a
   * reworded end moves the label with it. A question with fewer than three
   * options is left as a category: two answers are a split, not a position,
   * and a dot halfway along a two-point line says nothing a pair of bars does
   * not say better.
   */
  for (const lq of LIFE_QUESTIONS) {
    const opts = lq.options || [];
    const ordered = opts.length >= 3;
    f.push({ key: lq.id, label: (lq.category ? lq.category + ' · ' : '') + genericLabel(lq.text),
      group: 'Ex2 · Life & values', kind: 'cat',
      ...(ordered ? { ordinal: true, poleLow: opts[0], poleHigh: opts[opts.length - 1] } : {}),
      options: opts.map((v) => ({ v, label: v })), partnerable: true });
  }
  for (const cat of RESPONSIBILITY_CATEGORIES) {
    cat.items.forEach((item, i) => {
      /**
       * ── A RESPONSIBILITY IS A POSITION, NOT A CATEGORY ─────────────────
       * Ellie: "Pole labels for responsibility should show 'Myself' and 'My
       * partner' and should populate accordingly so that we can see how many
       * people assume responsibility vs assume the other person will be
       * responsible."
       *
       * These were plain categories, so the admin drew a distribution of four
       * bars and no mean. They are an axis: one person, both, the other
       * person. Marked ordinal with a position per option, which is what makes
       * the slider and its mean dot available.
       *
       * The positions are given rather than taken from the option's index,
       * because by index "N/A" would sit at the far end of the axis and read
       * as the strongest possible "my partner". It is not on the axis at all:
       * a null position leaves it out of the mean, the same way a question
       * nobody answered is left out.
       */
      f.push({ key: 'resp_' + cat.id + '_' + i, label: cat.label + ' · ' + genericLabel(item),
        group: 'Ex2 · Who does what', kind: 'cat', ordinal: true,
        poleLow: 'Myself', poleHigh: 'My partner',
        options: RESP_OPTS.map((v) => ({ v, label: v, val: RESP_POSITION[v] })), partnerable: true });
    });
  }
  /* ── THE EXERCISE'S OWN SUMMARY ROWS ──────────────────────────────────
     Six: one for the exercise and one per category. A percentage, so the
     poles are named rather than left to "low" and "high", and `scale` so the
     All questions block draws them as a slider with a mean like every other
     measure on these pages. */
  f.push({ key: 'expalign_overall', label: 'Alignment across categories',
    group: 'Ex2 · Alignment across categories', kind: 'scale',
    poleLow: 'Different answers', poleHigh: 'Same answers', partnerable: false });
  for (const cat of RESPONSIBILITY_CATEGORIES) {
    f.push({ key: 'expalign_' + cat.id, label: cat.label + ' alignment',
      group: 'Ex2 · Alignment across categories', kind: 'scale',
      poleLow: 'Different answers', poleHigh: 'Same answers', partnerable: false });
  }
  /* One field per horseman, so the Explore page can cut by it too and every
     slicer has a label and an option list to draw from. */
  for (const h of HORSEMAN_KEYS) {
    f.push({ key: h.key, label: 'Shows ' + h.label, group: 'Conflict Patterns', kind: 'cat',
      options: [{ v: 'Yes', label: 'Yes' }, { v: 'No', label: 'No' }], partnerable: true });
  }
  /* The wording someone answered under, as something to cut by. Two groups and
     no order, so a plain category. */
  f.push({ key: 'intimacy_variant', label: 'Intimacy stage', group: 'Physical Intimacy', kind: 'cat',
    options: [{ v: 'Not yet', label: 'Not yet' }, { v: 'Regularly intimate', label: 'Regularly intimate' }],
    partnerable: true });
  for (const q of REFLECTION_QUESTIONS) {
    const isPick = q.kind === 'pick';
    const opts = (isPick ? q.options : q.labels) || [];
    /* Ellie: "All questions should not have the section name in each row."
       Every reflection question carried its topic as a prefix, and four of the
       five say "How We're Doing", so the useful half of each row started a
       third of the way in. The topic is kept as a field of its own so a
       grouping can still use it; it is just not printed on every line. */
    const fld = { key: 'ref_' + q.id, label: q.text, topic: q.topic || null, group: 'Ex3 · Relationship Reflection', kind: 'cat', options: opts.map((v) => ({ v, label: v })), partnerable: true };
    if (!isPick && opts.length >= 2) { fld.ordinal = true; fld.poleLow = opts[0]; fld.poleHigh = opts[opts.length - 1]; }
    f.push(fld);
  }
  for (const q of INTIMACY_QUESTIONS) {
    if (q.kind === 'multi') continue;
    const valid = (q.options || []).filter((o) => o.value != null);
    /* Ellie: "All questions at the bottom should use the framing for couples
       who are regularly physically intimate." Every question stores both
       wordings and this was drawing the premarital one without saying so, so
       the admin asked "how often do you imagine wanting" about people who had
       answered "how often do you want". */
    /* Ellie: "the all questions section rows on this page still have the
       category text then the question, I only want the question."

       The same edit the reflection questions got one round earlier, which is
       the tell that the prefix was a habit rather than a decision. The topic
       stays as a field of its own so a grouping can still use it; it is just
       not printed on every line. */
    const fld = { key: 'iq_' + q.id, label: (q.married || q.premarital || q.id), topic: q.topic || null, group: 'Physical Intimacy', kind: 'cat', options: valid.map((o) => ({ v: o.label, label: o.label, val: o.value })), partnerable: true, dim: q.dimension, dimLabel: IDIM_LABEL[q.dimension] || q.dimension };
    /* ── THIS LOOP USED TO RUN OFF THE END OF ITSELF ────────────────────
       The Conflict Patterns block below was INSIDE this loop: the intimacy
       loop opened here, the conflict loop opened and closed in the middle of
       it, and this loop's own tail sat after it. So every conflict field was
       defined once per intimacy question, fourteen times each, 126 fields
       where there should be nine.

       It was invisible from the outside. The Explore page builds its lists
       from the field array, and a duplicate field has the same key, the same
       label and the same options as the original, so the lists looked right
       and every dropdown carried the same entry fourteen times without saying
       so. Closing the loop where it belongs is the whole fix. */
    if (valid.length >= 2) {
      const lo = valid.reduce((a, b) => (b.value < a.value ? b : a));
      const hi = valid.reduce((a, b) => (b.value > a.value ? b : a));
      fld.ordinal = true; fld.poleLow = lo.label; fld.poleHigh = hi.label;
    }
    f.push(fld);
  }

  /**
   * ── CONFLICT PATTERNS, AS EXPLORABLE FIELDS ────────────────────────────
   * Ellie: "Need a responses page in admin for conflict exercise."
   *
   * One field per answerable question, grouped so the page can find them, and
   * `partnerable` so a cut by one partner's answer against the other's works
   * the way it does for every other exercise. The two open-text questions and
   * the ranking are not here: a paragraph is not a category and an ordering is
   * not one answer, which is the same line this file already draws around the
   * reflection and intimacy questions.
   */
  const CSECTION_LABEL = { start: 'How it goes', openings: 'Openings', risk: 'Risk patterns', works: 'What works', repair: 'Repair', closing: 'Closing' };
  for (const q of CONFLICT_QUESTIONS) {
    let options = null;
    if (q.kind === 'scale') options = (q.options || []).map((o) => ({ v: o.label, label: o.label, val: o.value }));
    else if (q.kind === 'frequency') options = FREQUENCY_OPTIONS.map((o) => ({ v: o.label, label: o.label, val: o.value }));
    else if (q.kind === 'forcedAB') options = [{ v: q.a, label: q.a }, { v: q.b, label: q.b }];
    else if (q.kind === 'pickOne') options = (q.options || []).map((o) => ({ v: o.label || o, label: o.label || o }));
    if (!options) continue;
    f.push({
      key: 'cq_' + q.id,
      label: (q.riskLabel ? q.riskLabel + ' \u00B7 ' : '') + q.text,
      /**
       * ── THE ONE-WORD NAME, AS A FIELD OF ITS OWN ──────────────────────
       * Ellie: "Horseman should just say criticism not the full paragraph",
       * and of the chart beside it: "the column labels on the horseman chart
       * are weird, they should just be one word each."
       *
       * Both the tile and the chart already asked for `riskLabel` and fell
       * back to `label` when it was missing, and it was always missing: the
       * one word was being CONCATENATED into `label` here and never sent as
       * itself. So the fallback ran every time and the tile printed
       * "Criticism \u00B7 <the whole question>".
       *
       * A fallback that always fires is the same as no fallback, and it reads
       * like cover. The word comes from q.riskLabel in
       * api/_conflict-questions.js, which is the only place the four
       * horsemen are named, so this carries it rather than restating it.
       */
      riskLabel: q.riskLabel || null,
      group: 'Conflict Patterns',
      kind: 'cat',
      options,
      partnerable: true,
      section: q.section,
      sectionLabel: CSECTION_LABEL[q.section] || q.section,
      /**
       * ── POLES, WHERE THE ANSWERS ARE AN ORDER ─────────────────────────
       * Ellie: "All questions should match setup of other pages' and should
       * have pole labels."
       *
       * A scale and a frequency are ordered, so they get a slider with the
       * ends named and a mean dot, the same as every other page. The ends come
       * from the options' own `value`, lowest and highest, rather than from
       * their position in the list: a question whose options are written
       * best-first would otherwise show its poles the wrong way round.
       *
       * A forced A-or-B is deliberately left as a category. Two answers are a
       * split, not a position, and a dot halfway along a two-point line says
       * less than a pair of bars. Same line this file already draws for a life
       * question with fewer than three options.
       *
       * pickOne is a list of unrelated things with no order at all.
       */
      ...(() => {
        if (q.kind !== 'scale' && q.kind !== 'frequency') return {};
        const withVal = options.filter((o) => typeof o.val === 'number');
        if (withVal.length < 2) return {};
        const lo = withVal.reduce((a, b) => (b.val < a.val ? b : a));
        const hi = withVal.reduce((a, b) => (b.val > a.val ? b : a));
        return { ordinal: true, poleLow: lo.label, poleHigh: hi.label };
      })(),
    });
  }
  for (const fb of FB_FIELDS) {
    f.push({
      key: fb.key, label: fb.label, group: 'Survey', kind: fb.kind,
      ...(fb.kind === 'scale' ? { poleLow: fb.poleLow, poleHigh: fb.poleHigh } : {}),
      /* A choice's options come from the question. Anything else actually
         answered is added too, so a renamed option still filters. */
      ...(fb.kind === 'cat' ? {
        options: [...new Set([...(fb.options || []), ...((fbCatOptions && fbCatOptions[fb.key]) || [])])]
          .map((v) => ({ v, label: v })),
      } : {}),
    });
  }
  /**
   * ── THE JOURNAL, AS A RATE ──────────────────────────────────────────
   * Ellie: "I want a slicer variable for never used journal, uses <3x/mo, or
   * uses 3x+/mo." The three buckets come from api/_lib/journal-use.js so the
   * boundaries are written once, and the raw count rides beside it because a
   * bucket nobody can check is a bucket nobody trusts.
   *
   * Nothing anyone wrote reaches this page: the query behind it asks for
   * owner_id and created_at.
   */
  f.push({
    key: 'journal_use', label: 'Journal use', group: 'Engagement', kind: 'cat',
    options: [JOURNAL_BUCKETS.never, JOURNAL_BUCKETS.light, JOURNAL_BUCKETS.regular]
      .map((v) => ({ v, label: v })),
    ordinal: true, poleLow: JOURNAL_BUCKETS.never, poleHigh: JOURNAL_BUCKETS.regular,
  });
  f.push({
    key: 'journal_entries', label: 'Journal entries (all time)', group: 'Engagement', kind: 'cat',
    options: JOURNAL_VOLUME_BANDS.map((v) => ({ v, label: v })),
    ordinal: true, poleLow: JOURNAL_VOLUME_BANDS[0], poleHigh: JOURNAL_VOLUME_BANDS[JOURNAL_VOLUME_BANDS.length - 1],
  });
  return f;
}

export default async function handler(req) {
  const url = new URL(req.url);
  const _auth = checkAdminAuth(req);
  if (!_auth.ok) return json({ error: _auth.error }, _auth.status);

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) return json({ error: 'Supabase env vars missing' }, 500);

  /**
   * ── A QUERY THAT FAILED IS NOT A TABLE THAT IS EMPTY ────────────────────
   * Three selects below were wrapped in `try { ... } catch {}` with an empty
   * array left behind, so a rejected query made this page quietly smaller: a
   * couple whose partner came in through an invite shows as unpaired, a filter
   * loses its options, the testimonials disappear. Every one of those is a
   * confident answer and a wrong one.
   *
   * That is the bug Ellie reported about the Engagement page, in a different
   * tab: "there should be data for some of these already." That endpoint
   * answers with the rows it could read AND a list of what it could not. This
   * one now does the same, and the page prints it.
   */
  const couldNotRead = [];
  const admin = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    /* Demo accounts are not people: see api/_lib/demo-accounts.js. */
    const { data: profiles = [], error, demoFilterApplied } =
      await selectProfiles(admin, (q) => q.select('*'));
    if (error) return json({ error: safeError('admin-explore', error, 'Query failed.') }, 500);
    const profileById = {}; for (const p of profiles) profileById[p.id] = p;
    // Invited partners answer via partner_sessions (keyed by invite_code) and may
    // never create a full profile. Pull them so a couple isn't shown as unpaired
    // just because one half came in through an invite.
    let partnerSessions = [];
    try {
      const _ps = await admin.from('partner_sessions').select('invite_code, ex1_answers');
      if (_ps.error) throw _ps.error;
      /* Keyed by code, so the codes the figures are about are the ones on
         these profiles. A demo's invited partner was otherwise a person. */
      const _codes = new Set(profiles.map((p) => p.invite_code).filter(Boolean));
      partnerSessions = ownedBy(_ps.data || [], _codes, 'invite_code');
    } catch (e) {
      console.error('[admin-explore] partner_sessions:', e?.message || e);
      couldNotRead.push('invited partners, so some couples may read as unpaired');
    }
    const sessByInvite = new Map();
    for (const sx of partnerSessions) { if (sx && sx.invite_code && sx.ex1_answers) sessByInvite.set(sx.invite_code, sx); }

    /**
     * How often each person writes in the journal.
     *
     * owner_id and created_at only. A body must never reach an admin page, so
     * the select is the guarantee rather than a promise further down: there is
     * nothing in this variable to leak.
     */
    let journalByOwner = new Map();
    try {
      const { data: jRows = [] } = await admin
        .from('notes')
        .select('owner_id, created_at')
        .eq('anchor_type', JOURNAL_ANCHOR);
      journalByOwner = journalUseByOwner(jRows);
    } catch (e) { /* the column arrives with migration 073; before it, nobody has entries. */ }

    /**
     * Survey answers, keyed by respondent profile id, for the join below.
     *
     * One row per person in survey_responses, including the half-finished
     * ones: Ellie asked for incomplete responses to be collected, and a person
     * who answered three questions can be sliced on those three.
     *
     * This read feedback_submissions rows of type beta_survey, which migration
     * 079 deletes. The answers are keyed by question id now, so the join below
     * needs no translation layer.
     */
    const surveyByRespondent = {};
    const fbCatOptions = Object.fromEntries(Object.keys(FB_CAT_SRC).map((k) => [k, new Set()]));
    try {
      const { data: svRows = [], error: svErr } = await admin.from('survey_responses')
        .select('id, respondent_id, answers, updated_at, completed_at, featured_at');
      /* supabase-js RETURNS its error rather than throwing it, so the try
         around this read catches nothing on a failed query: the default fires
         and every respondent reads as unsegmented. Throwing is what reaches
         the catch below. */
      if (svErr) throw svErr;
      for (const r of (svRows || [])) {
        if (!r.respondent_id) continue;
        const payload = { ...(r.answers || {}) };
        payload._ts = r.completed_at || r.updated_at || null;
        payload._rowId = r.id;
        surveyByRespondent[r.respondent_id] = payload;
        for (const [fk, src] of Object.entries(FB_CAT_SRC)) { const v = payload[src]; if (v) fbCatOptions[fk].add(v); }
      }
    } catch (e) {
      console.error('[admin-explore] survey filters:', e?.message || e);
      couldNotRead.push('the survey, so its filter options are missing');
    }
    const fbCatOpts = Object.fromEntries(Object.entries(fbCatOptions).map(([k, set]) => [k, [...set]]));

    const _has = (o) => !!(o && typeof o === 'object' && Object.keys(o).length > 0);
    const hasEx1 = (p) => p && _has(p.ex1_answers);
    const tookAny = (p) => p && (_has(p.ex1_answers) || _has(p.ex2_answers) || _has(p.ex3_answers));

    // Pass 1: own fields for every respondent who took ANY exercise, so Ex2
    // (expectations) and Ex3 (relationship reflection) responses still appear
    // for people who haven't done Exercise 1. Communication type is left null
    // for them (set in ownFields), so type/axis views stay Ex1-only.
    const computed = {};
    for (const p of profiles) {
      if (!tookAny(p)) continue;
      computed[p.id] = ownFields(p);
    }

    // Pass 2: pairing + partner denormalization.
    // Segment lookups so orders can be joined to a purchaser's demographics
    // server-side (by user_id or email) without ever exposing PII to the client.
    const SEG_KEYS = ['pronouns','age_range','relationship_status','relationship_length','children','signup_source','type','axisEngage','axisOpen','couple_type','pkg','guardian_pair','guardian_count','guardian_mom','guardian_dad'];
    const RETRO_COUPLE_TYPE = { 'ATTUNE-BETA-1':'WZ', 'ATTUNE-BETA-2':'WX', 'ATTUNE-BETA-5':'WY' };
    const segById = {}, segByEmail = {};
    const rows = [];
    for (const p of profiles) {
      const own = computed[p.id];
      if (!own) continue;
      const partnerId = p.partner_profile_id || null;
      const partner = partnerId ? computed[partnerId] : null;
      const partnerRaw = partnerId ? profileById[partnerId] : null;
      // Partner-view blend (matches the app): a person's type uses their own
      // answers plus their partner's view of them. Recomputed here where the
      // partner's raw answers are available. Raw axis/dim columns stay
      // self-report; only the classification (type/couple_type) is blended.
      // Scoring via api/_lib/results.js, the one implementation.
      const blendType = (self, pans) => {
        if (!self || !Object.keys(self).length) return null;
        return personResults(self, pans).typeCode;
      };
      let ownType = own.type == null ? null : (blendType(p.ex1_answers, partnerRaw ? partnerRaw.ex1_answers : null) || own.type);
      let partnerType = (partnerRaw && partnerRaw.ex1_answers) ? blendType(partnerRaw.ex1_answers, p.ex1_answers) : null;
      let coupleKey = partnerId;
      let hasPartner = !!partnerRaw;
      if (!partnerRaw && p.invite_code && sessByInvite.has(p.invite_code)) {
        const sAns = sessByInvite.get(p.invite_code).ex1_answers;
        hasPartner = true; coupleKey = 'inv:' + p.invite_code;
        const st = blendType(sAns, p.ex1_answers);
        if (st) { if (own.type != null) ownType = blendType(p.ex1_answers, sAns) || ownType; partnerType = st; }
      }
      // Understanding, computed once per row from whichever partner answers we
      // resolved above (linked profile, or the legacy session by invite code).
      const _partnerAns = partnerRaw?.ex1_answers
        || (p.invite_code && sessByInvite.get(p.invite_code)?.ex1_answers)
        || null;
      const _u = {};
      /* ── ALIGNMENT ACROSS CATEGORIES, PER COUPLE ────────────────────────
         Ellie: "Expectations should have a high-level for 'alignment across
         categories' that shows avg alignment across each category."

         A separate block from the Ex1 one below, because this needs ex2
         answers and that needs ex1, and a couple can have finished one and
         not the other. Folding them together would have made every
         Expectations figure depend on Communication being done.

         The rule is api/_lib/resp-agreement.js, which api/admin-data.js also
         calls: "did these two name the same person" is one rule and resolving
         an answer to a side of the couple is the whole of it. */
      if (partnerRaw && p.ex2_answers && partnerRaw.ex2_answers) {
        const _ca = categoryAlignment(p, partnerRaw);
        /* Null rather than nought where nothing could be counted. A couple who
           skipped a category have no alignment in it, which is not the same
           fact as disagreeing about all of it. */
        _u.expalign_overall = _ca.overall;
        for (const cat of RESPONSIBILITY_CATEGORIES) {
          _u['expalign_' + cat.id] = _ca.byCategory[cat.id] ? _ca.byCategory[cat.id].pct : null;
        }
      }
      if (_partnerAns && p.ex1_answers) {
        // Same thresholds as the dashboard cuts, so a slice in the explorer
        // matches the same slice elsewhere.
        const _sa = calcDimScores(p.ex1_answers), _sb = calcDimScores(_partnerAns);
        let _wide = 0, _scored = 0;
        for (const d of Object.keys(DIM_KEYS)) {
          if (_sa[d] == null || _sb[d] == null) continue;
          _scored++;
          if (Math.abs(_sa[d] - _sb[d]) >= ALIGNMENT_THRESHOLD.gap) _wide++;
        }
        if (_scored) _u.alignment_group = _wide >= ALIGNMENT_THRESHOLD.dims ? 'Misaligned' : 'Aligned';
        const mine = readAccuracy(p.ex1_answers, _partnerAns);    // my read of them
        const theirs = readAccuracy(_partnerAns, p.ex1_answers);  // their read of me
        if (mine) {
          for (const [dim, d] of Object.entries(mine.dimensions)) {
            _u['readerr_' + dim] = d ? d.signed : null;
          }
          _u.read_error_mean = mine.meanError;
          _u.reads_partner = mine.band === 'reads_them_well' ? 'Reads them well'
            : mine.band === 'mixed' ? 'Mixed' : 'Misreads them';
          _u.worst_misread_dim = mine.worst?.[0]?.dim || null;
        }
        if (mine && theirs) {
          let _mis = 0;
          for (const d of Object.keys(mine.dimensions || {})) {
            const x = mine.dimensions[d], y = theirs.dimensions[d];
            if (!x || !y) continue;
            if (x.error >= ALIGNMENT_THRESHOLD.gap || y.error >= ALIGNMENT_THRESHOLD.gap) _mis++;
          }
          _u.understanding_group = _mis >= ALIGNMENT_THRESHOLD.dims ? 'Misunderstood' : 'In tune';
        }
        if (mine && theirs) {
          const mean = (mine.meanError + theirs.meanError) / 2;
          /* The same banding admin-data and the results module use; this was
             a third copy of its two cut points. */
          _u.understanding = understandingBandFor(mean).label;
        }
      }

      const row = {
        ...own,
        ..._u,
        type: ownType,
        role: p.joined_via_invite ? 'B' : 'A',
        // couple_id is set whenever a partner exists (so Ex2/Ex3 couple visuals
        // pair them), even when a communication type can't be computed.
        couple_id: hasPartner ? coupleHash(p.id, coupleKey) : null,
        /**
         * The day this account was made, so a tile can carry a period slicer.
         *
         * Ellie: "I want that done to every page that has the boxes at the
         * top... one to select time period." The order-backed tiles could do
         * that from the order date; the person-backed ones had no date at all,
         * so the control would have been a decoration.
         *
         * A day, not a timestamp: the period buckets go down to a week, so a
         * day is the coarsest thing that can answer all of them, and it is the
         * least this has to carry to do the job. It is no more identifying
         * than the ten dimension scores already on this row, which is the bar
         * the rest of the cube is built to.
         */
        signup_day: p.created_at ? String(p.created_at).slice(0, 10) : null,
        couple_type: (ownType && partnerType) ? [ownType, partnerType].sort().join('') : null,
      };
      if (partner) { for (const k of PARTNERABLE) row['p_' + k] = partner[k]; if (partnerType) row.p_type = partnerType; }
      // Gender fallback: each partner records the other's pronouns, so a person
      // who never set their own can still be filled from their partner's record.
      /* Each partner records the other's pronouns at signup, so somebody who
         never set their own still has them from the person who invited them. */
      if (!row.pronouns && partnerId && profileById[partnerId]?.partner_pronouns) {
        row.pronouns = pronounLabel(profileById[partnerId].partner_pronouns);
      }
      {
        const use = journalByOwner.get(p.id) || { ever: 0, recent: 0 };
        row.journal_use = journalBucket(use);
        row.journal_entries = journalVolumeBand(use.ever);
      }
      const survey = surveyByRespondent[p.id];
      if (survey) {
        for (const [fk, src] of Object.entries(FB_SCALE_SRC)) { const v = Number(survey[src]); row[fk] = Number.isFinite(v) ? v : null; }
        for (const [fk, src] of Object.entries(FB_CAT_SRC)) { row[fk] = survey[src] != null && survey[src] !== '' ? survey[src] : null; }
      }
      rows.push(row);
      // Anonymized segment snapshot for order joins (keyed by id + email; no PII emitted).
      const _seg = {}; for (const k of SEG_KEYS) _seg[k] = row[k] !== undefined ? row[k] : null;
      /**
       * The anonymous couple key travels with the segment snapshot.
       *
       * Ellie, of the completion funnel: "is the ordered column a count of
       * individuals and the other columns are counting couples? That would
       * make more sense to me."
       *
       * Close. It was a count of ORDERS, while every bar after it counted
       * couples, so a couple who bought twice stood taller than a couple who
       * bought once and the funnel could not be read as a funnel. It is not a
       * SEG_KEY because it is not something to slice by; it is the key the
       * funnel groups on.
       */
      _seg.couple_id = row.couple_id || null;
      segById[p.id] = _seg;
      if (p.email) segByEmail[String(p.email).toLowerCase()] = _seg;
    }

    // ── Orders, joined to purchaser demographics, fully anonymized ───────────
    let orderRows = [];
    try {
      /* A demo's test order was a row in the cube, unsegmented but counted. */
      const { data: _ords = [], error: oErr } = await admin.from('orders').select('*').limit(2000);
      /* Same as the survey read above: without this, a failed orders query and
         a shop that has sold nothing are the same empty cube. */
      if (oErr) throw oErr;
      const ords = withoutDemoOrders(_ords, await demoOwners(admin));

      /**
       * ── WHAT EACH PROMO CODE BUNDLES ────────────────────────────────────
       * Ellie: "Add-on attachment by package isn't correct, I and a few other
       * beta users have access to add-ons and should see that."
       *
       * Every order on the system today is a promo order, and a code that
       * bundles an add-on leaves nothing in the order's own addon columns. So
       * the chart counted zero of everything.
       *
       * Two sources, the same two the checkout and the tax endpoint read: the
       * twelve compiled codes, and the beta_codes table where per-couple codes
       * are issued. Read once for the whole cube rather than per order.
       *
       * A failed read is not fatal here and must not be silent either. The
       * compiled codes still resolve, the table-issued ones come back with no
       * bundle, and the figure would be low rather than wrong in a way nobody
       * could see. It joins `couldNotRead`, which this
       * endpoint already returns and the page already shows: a measure that is
       * incomplete says so rather than drawing a confident zero.
       */
      const codeMeta = {};
      for (const [code, meta] of Object.entries(COMPILED_BETA_CODES || {})) {
        codeMeta[String(code).toUpperCase()] = meta;
      }
      {
        const { data: betaRows, error: bErr } = await admin.from('beta_codes').select('*').limit(1000);
        if (bErr) couldNotRead.push('the issued promo codes, so add-on attachment counts only what was bought outright');
        else for (const row of betaRows || []) {
          if (row?.code) codeMeta[String(row.code).toUpperCase()] = codeMetaFromRow(row);
        }
      }
      const monthOf = (d) => { const t = new Date(d); return isNaN(t) ? null : t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0'); };
      orderRows = (ords || []).map((o) => {
        const email = o.buyer_email ? String(o.buyer_email).toLowerCase() : null;
        const seg = (o.user_id && segById[o.user_id]) || (email && segByEmail[email]) || {};
        /* Carried out of the segment snapshot explicitly: `merged` below only
           copies SEG_KEYS, and this is deliberately not one of those. */
        const orderCouple = seg.couple_id || null;
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
          /* Which couple this order belongs to, so the funnel counts couples
             all the way across instead of orders at the first bar. Null for an
             order whose buyer has no partner linked, which the funnel counts
             as one unit of its own. */
          couple_id: orderCouple,
          is_physical: !!o.is_physical,
          promo_code: o.promo_code || null,
          addon_workbook: o.addon_workbook || null,
          addon_reflection: !!o.addon_reflection,
          addon_budget: !!o.addon_budget,
          addon_intimacy: !!o.addon_intimacy,
          addon_checklist: !!o.addon_checklist,
          addon_conflict: !!o.addon_conflict,
          /**
           * Every add-on this order includes, however it got there: bought as
           * a line item, carried by the package, or bundled by a promo code.
           * Computed here so the chart cannot restate the rule, which is what
           * it was doing when it reported nobody had any.
           */
          addons: addonsOnOrder(o, codeMeta[String(o.promo_code || '').toUpperCase()] || null),
          state: o.shipping_state || o.billing_state || null,
          country: o.shipping_country || o.billing_country || null,
          matched: !!(seg && Object.keys(seg).length),
          ...merged,
        };
      });
      /* Each order's code, including the one its partner used. Same rule as
         api/admin-data.js, same module, and this endpoint's way of naming a
         couple is the couple_id it has already worked out above. Ellie:
         "Still listed as unknown, this should go off of their partner's order
         code." */
      withEffectivePromoCodes(orderRows, (o) => o.couple_id || null);
    } catch (e) { orderRows = []; }

    /**
     * Survey responses, anonymised and segment-tagged.
     *
     * One row per person who has answered anything, carrying the numeric
     * answers the Feedback Overview charts, plus the segment fields it slices
     * by. The keys are the question ids, so a chart reading `rating` is
     * reading the star question and nothing has to be translated.
     *
     * This was three arrays built from two kinds of feedback_submissions row:
     * `surveys` for the charts, `betaResponses` for the 26-question tiles, and
     * `testimonials` for a page that asked for a name. Migration 079 deletes
     * every row all three read, and the new survey asks for no name at all.
     */
    const monthOfTs = (d) => { const t = new Date(d); return isNaN(t) ? null : t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0'); };
    const surveysAnon = [];
    for (const [rid, payload] of Object.entries(surveyByRespondent)) {
      /* A respondent the figures are not about: a demo, or an account that no
         longer exists. Either way there is nobody to count the answer under. */
      if (!segById[rid]) continue;
      /* `|| {}` after the guard looks redundant and is not: without it, a
         disabled guard throws instead of over-counting, and a gate that
         catches a 500 has not measured the count it was written for. */
      const seg = segById[rid] || {};
      const row = {};
      for (const k of SEG_KEYS) row[k] = seg[k] != null ? seg[k] : null;
      row.month = monthOfTs(payload._ts);
      row.ts = payload._ts || null;
      /* Every numeric answer, by its question id, and every choice as given. */
      for (const f of FB_FIELDS) {
        const v = payload[f.src];
        if (f.kind === 'scale') {
          const n = parseInt(v, 10);
          row[f.src] = Number.isFinite(n) ? n : null;
        } else {
          row[f.src] = v != null && v !== '' ? String(v) : null;
        }
      }
      surveysAnon.push(row);
    }

    const placed = placeAll(buildCatalog(fbCatOpts));
    return json({
      generatedAt: new Date().toISOString(),
      /* False until migration 082 has run, and the page says so when it is. */
      demoFilterApplied,
      count: rows.length,
      paired: rows.filter((r) => r.couple_id).length,
      /**
       * ── THE SEVEN SECTIONS ──────────────────────────────────────────────
       * Ellie: "Row and column organization should be as follows: Section
       * header (with colored row) for: Demographic, Communication Styles,
       * Expectations, Relationship Reflection, Physical Intimacy
       * Expectations, Conflict Patterns, Engagement."
       *
       * Each field carries its section and whether it is high-level, decided
       * in api/_lib/explore-sections.js. The Explore pickers draw both halves
       * and the slicers draw only the high-level one, which is the other half
       * of her instruction. Deciding that on the page would give those two
       * their own copies of which group is a roll-up, and the day they
       * disagreed one would offer a cut the other refused.
       */
      fields: placed.fields,
      /**
       * The ten dimensions, in the product's own words, so public/admin.html
       * does not have to restate them. It cannot import from api/, which is
       * why it had three separate maps of these names: a seed array, a PRETTY
       * map and an LBL map, disagreeing about both the words and the set. Two
       * of the three named `stress`, which is not a dimension, and omitted
       * `reassurance`, which is.
       *
       * Sent rather than solved on the page, because the page has no access to
       * the list and a list it cannot see is a list it will get wrong.
       *
       * Called dimNames and not dimLabels: the responses payload already sends
       * `dimLabels`, and there it is the array of KEYS in score order. Two
       * payloads carrying one name for two different things is how a reader
       * takes the wrong one, which this codebase did with notes and
       * annotations and has not forgotten.
       */
      dimNames: DIM_LABELS,
      sections: EXPLORE_SECTIONS,
      /* A group nobody mapped lands in Demographic as a detail row and is
         named here, so a new exercise turns up in the wrong place rather than
         vanishing. A field nobody can find looks exactly like one that was
         never built. */
      unmappedGroups: placed.unmapped,
      rows,
      orders: orderRows,
      surveys: surveysAnon,
      /* Empty on a clean run. Anything in it is a question the page cannot
         answer, said out loud rather than drawn as a smaller number. */
      couldNotRead,
    });
  } catch (e) {
    return json({ error: safeError('admin-explore', e, 'Query failed.') }, 500);
  }
}
