/**
 * Is the new alignment measure inflating, and can a couple still score low?
 *
 * READ ONLY. Every database call is a .select(). Nothing is written.
 *
 * ── THE QUESTION ──────────────────────────────────────────────────────────
 * Ellie, after the change moved 29 of 36 category scores upward: "it's not
 * inflating things, right? Is it an accurate way to measure alignment? I know
 * alignment increased, but it's still possible to score low, right?"
 *
 * A measure that moved almost every number up is exactly the kind that should
 * be asked this, and the answer cannot be "it looks principled". Four things
 * are measured here, because "inflating" can mean four different faults:
 *
 *   A. A COMPRESSED SCALE. If the worst possible disagreement does not reach
 *      a distance of 1, no couple can ever read 0, and every score is lifted
 *      off the floor by construction. Measured by enumerating every distinct
 *      pair of answers two people can give and printing the distribution.
 *
 *   B. A GENEROUS TIE-BREAK. respDistance has one branch that returns 0 for
 *      two answers that are not the same: a stored "Both of us" with no
 *      follow-up is treated as agreeing with any shared answer. That is a
 *      judgement, it always rounds toward agreement, and it is the one place
 *      a thumb could be on the scale. Counted in the real data rather than
 *      argued about.
 *
 *   C. A THIN CATEGORY. A category's bar is the mean of its ANSWERED rows.
 *      One answered row out of seven makes that row's score the whole
 *      category's bar. Not inflation exactly, but a confident number built
 *      from very little, which is the same family of problem.
 *
 *   D. THE FLOOR IN PRACTICE. Synthetic couples at known separations, driven
 *      through the real expectationsSummary, so the question "what does a
 *      couple who disagree about everything actually see" has a number rather
 *      than an argument.
 *
 * Part A and D need no database. B and C read profiles.
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

import { respDistance, lifeDistance, DETAIL_EVEN } from '../../api/_lib/resp-distance.js';
import { closenessPct, bandFor } from '../../api/_lib/alignment.js';
import { expectationsSummary } from '../../api/_lib/expectations.js';
import { RESPONSIBILITY_CATEGORIES } from '../../api/_questions.js';
import { LIFE_QUESTION_OPTIONS } from '../../api/_workbook-content.js';
import { DEMO_COLUMN } from '../../api/_lib/demo-accounts.js';

const YOU = 'Alpha', THEM = 'Beta';
const pad = (s, n) => String(s).padEnd(n);

// ── A. The scale, every distinct pair ────────────────────────────────────
/**
 * Every answer one person can store, with the position it means.
 *
 * Written as the stored shape rather than as a position, so this enumerates
 * what the product can actually receive and respDistance does the reading.
 */
const STATES = [
  ['primarily me',            'Primarily mine',          null],
  ['my name',                 YOU,                       null],
  ['both, leaning me',        'Both of us',              `Usually ${YOU}, sometimes ${THEM}`],
  ['both, evenly',            'Both of us',              DETAIL_EVEN],
  ['both, leaning partner',   'Both of us',              `Usually ${THEM}, sometimes ${YOU}`],
  ['primarily partner',       "Primarily my partner's",  null],
  ['partner name',            THEM,                      null],
  ['both, no follow-up',      'Both of us',              null],
  ["doesn't apply",           "Doesn't apply",           null],
];

console.log('── A. THE SCALE ─────────────────────────────────────────────────');
console.log('Closeness for every pair of answers two people can give.');
console.log('Rows are what you said, columns what your partner said.\n');

const header = STATES.map(([n]) => pad(n.slice(0, 9), 10)).join('');
console.log(pad('', 24) + header);
const dist = new Map();
for (const [nameA, valA, detA] of STATES) {
  const cells = [];
  for (const [, valB, detB] of STATES) {
    const d = respDistance({
      yourValue: valA, theirValue: valB,
      yourDetail: detA, theirDetail: detB,
      youName: YOU, themName: THEM,
    });
    const pct = closenessPct(d);
    cells.push(pad(pct == null ? '-' : pct, 10));
    dist.set(pct, (dist.get(pct) || 0) + 1);
  }
  console.log(pad(nameA, 24) + cells.join(''));
}

const keys = [...dist.keys()].filter((k) => k != null).sort((a, b) => a - b);
console.log(`\nValues the scale produces: ${keys.join(', ')}`);
console.log(`Pairs scoring 0 (opposite):  ${dist.get(0) || 0} of ${STATES.length ** 2}`);
console.log(`Pairs scoring 100 (same):    ${dist.get(100) || 0} of ${STATES.length ** 2}`);
console.log(keys[0] === 0
  ? 'FLOOR REACHABLE: two people can score 0 on a row.'
  : `FLOOR NOT REACHABLE: the lowest any row can score is ${keys[0]}.`);

// ── B. Life questions ────────────────────────────────────────────────────
console.log('\n── B. LIFE QUESTIONS ────────────────────────────────────────────');
const lifeVals = new Set();
for (const [, opts] of Object.entries(LIFE_QUESTION_OPTIONS)) {
  for (const a of opts) for (const b of opts) lifeVals.add(closenessPct(lifeDistance(a, b, opts)));
}
const lifeKeys = [...lifeVals].sort((a, b) => a - b);
console.log(`Values produced across all ${Object.keys(LIFE_QUESTION_OPTIONS).length} questions: ${lifeKeys.join(', ')}`);
console.log(lifeKeys[0] === 0 ? 'FLOOR REACHABLE: 0 on a life row.' : `FLOOR NOT REACHABLE: lowest is ${lifeKeys[0]}.`);

// ── D. Synthetic couples, through the real summary ───────────────────────
/**
 * Build a complete ex2_answers for someone whose every answer is `state`.
 *
 * The keys are the real ones from the question set, so this goes through
 * expectationsSummary exactly as a real couple's answers do.
 */
function fill(valueFor, detailFor, lifeFor) {
  const responsibilities = {}, bothDetail = {}, life = {};
  for (const cat of RESPONSIBILITY_CATEGORIES) {
    for (const item of cat.items) {
      const key = `${cat.id}__${item}`;
      responsibilities[key] = valueFor;
      if (detailFor) bothDetail[key] = detailFor;
    }
  }
  for (const [id, opts] of Object.entries(LIFE_QUESTION_OPTIONS)) life[id] = lifeFor(opts);
  return { responsibilities, bothDetail, life };
}

const SCENARIOS = [
  ['opposite on everything',
    fill('Primarily mine', null, (o) => o[0]),
    fill('Primarily mine', null, (o) => o[o.length - 1])],
  ['two steps apart',
    fill('Primarily mine', null, (o) => o[0]),
    fill('Both of us', DETAIL_EVEN, (o) => o[Math.floor((o.length - 1) / 2)])],
  ['one step apart',
    fill('Both of us', `Usually ${YOU}, sometimes ${THEM}`, (o) => o[0]),
    fill('Primarily my partner\'s', null, (o) => o[1])],
  ['identical on everything',
    fill('Primarily mine', null, (o) => o[0]),
    fill("Primarily my partner's", null, (o) => o[0])],
];

console.log('\n── D. WHAT A COUPLE ACTUALLY SEES ───────────────────────────────');
for (const [label, mine, theirs] of SCENARIOS) {
  const s = expectationsSummary({ mine, theirs, youName: YOU, themName: THEM });
  const bars = s.categories.map((c) => `${c.label.split(' ')[0]} ${c.closeness}`).join('  ');
  console.log(`${pad(label, 26)} overall ${pad(s.closeness, 5)} ${bars}`);
}

// ── B/C. The real data ───────────────────────────────────────────────────
function env() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) return process.env;
  const raw = readFileSync(new URL('../../.env.local', import.meta.url), 'utf8');
  const out = { ...process.env };
  for (const line of raw.split('\n')) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    out[line.slice(0, i)] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}
const E = env();
const admin = createClient(E.SUPABASE_URL, E.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const { data: profiles, error } = await admin
  .from('profiles').select(`id, name, partner_profile_id, ${DEMO_COLUMN}, ex2_answers`);
if (error) { console.error('\nCould not read profiles:', error.message); process.exit(1); }

const byId = new Map(profiles.map((p) => [p.id, p]));
const seen = new Set();
let rowsTotal = 0, bandCount = { aligned: 0, discuss: 0, different: 0 };
const thin = [];
let nonSpecific = 0;

for (const p of profiles) {
  if (seen.has(p.id)) continue;
  const q = p.partner_profile_id ? byId.get(p.partner_profile_id) : null;
  if (!q || p[DEMO_COLUMN] === true || q[DEMO_COLUMN] === true || !p.ex2_answers || !q.ex2_answers) continue;
  seen.add(p.id); seen.add(q.id);

  // How often is a "Both of us" stored with no follow-up? That is the only
  // input to the generous branch, so counting it bounds the branch.
  for (const who of [p, q]) {
    const r = who.ex2_answers.responsibilities || {};
    const d = who.ex2_answers.bothDetail || {};
    for (const [k, v] of Object.entries(r)) {
      if ((v === 'Both of us' || v === 'Balanced') && !d[k]) nonSpecific++;
    }
  }

  const s = expectationsSummary({ mine: p.ex2_answers, theirs: q.ex2_answers, youName: p.name, themName: q.name });
  for (const cat of s.categories) {
    rowsTotal += cat.rows.length;
    for (const row of cat.rows) if (row.band) bandCount[row.band]++;
    const possible = cat.label === 'Life & Values'
      ? Object.keys(LIFE_QUESTION_OPTIONS).length
      : (RESPONSIBILITY_CATEGORIES.find((c) => c.id === cat.categoryId)?.items.length ?? cat.answered);
    if (cat.answered > 0 && cat.answered < possible) thin.push(`${cat.label}: ${cat.answered} of ${possible} answered, bar reads ${cat.closeness}`);
  }
}

console.log('\n── C. THE REAL DATA ─────────────────────────────────────────────');
console.log(`Rows scored across the 6 couples: ${rowsTotal}`);
console.log(`  aligned   ${bandCount.aligned}`);
console.log(`  discuss   ${bandCount.discuss}`);
console.log(`  different ${bandCount.different}`);
console.log(`"Both of us" stored with no follow-up (the generous branch's only input): ${nonSpecific}`);
console.log(thin.length
  ? `Categories scoring on partial answers (${thin.length}):\n  ` + thin.join('\n  ')
  : 'Every category scored on a full set of answers.');
console.log('\nNo database writes were made.');
