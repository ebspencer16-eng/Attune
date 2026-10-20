/**
 * What today's alignment change did to every real couple's numbers.
 *
 * READ ONLY. Every database call in here is a .select(). Nothing writes,
 * nothing is created, and the stored results rows are not touched: this
 * recomputes from the answers on the profiles and compares two calculations
 * against each other, it does not republish anything to anybody.
 *
 * ── THE TWO CALCULATIONS ──────────────────────────────────────────────────
 * Commit 2a94c322 ("One rule for how close two answers are") replaced
 * all-or-nothing alignment with degrees. Before it, a category's bar was
 * `cat.aligned / cat.answered`, worked out on the phone and again on the
 * website, where a row counted as aligned only if the two answers were
 * identical. After it, a category's bar is the mean of its rows' closeness,
 * and closeness comes from a distance that knows "Both of us, usually Ellie"
 * is a neighbour of "Ellie" rather than a flat miss.
 *
 * Both are RUN, not described. The old one is `_expectations-at-dbfea844.js`,
 * the real module from the commit before the change, vendored unmodified
 * except for three import paths. Rewriting the old rule from memory would
 * have been a second copy of a rule, which is the failure this whole codebase
 * is organised against, and it would have been a copy written by someone who
 * already knew what answer he expected.
 *
 * ── WHERE THE ANSWERS COME FROM, AND WHY NOT partner_sessions ─────────────
 * The brief said "every couple with complete partner_sessions". That table
 * exists and holds ZERO rows, measured rather than assumed: it is the retired
 * invite flow, and api/partner-sync.js records that the old POST path was
 * removed and that "exercise answers now save to the partner's own profile
 * row". A sweep keyed on it would have found no couples and printed a clean
 * empty report, which is exactly how the workbooks table reported "no
 * workbook" for every couple since the day it shipped.
 *
 * So a couple is two `profiles` rows linked by `partner_profile_id`, and
 * complete means both of them have `ex2_answers`, which is what api/results.js
 * itself requires before it will build an expectations summary at all.
 *
 * ── WHAT A BAND IS HERE ───────────────────────────────────────────────────
 * Neither implementation has ever had a band per CATEGORY. The row-level
 * bands in api/_lib/alignment.js are per row, and the old code had no bands at
 * all, only a boolean. What both surfaces actually draw for a category is a
 * colour from `alignedTone`, green at 80 and amber at 50, so that ramp is the
 * band here and it is imported rather than retyped. The same ramp is applied
 * to both percentages, so a band change in the CSV means the SCORE moved
 * across a line, not that two different rules were used on the two columns.
 *
 * ── WHY THE COUPLE TYPE COLUMNS ARE EQUAL ─────────────────────────────────
 * They are equal for every couple, by construction, and that is the finding
 * rather than a bug in this script. Couple type is computed by
 * api/_type-engine.js from the Communication answers (ex1_answers). That file
 * is byte-identical between dbfea844 and HEAD, checked with git diff before
 * this was written, and it reads none of the modules 2a94c322 touched. So it
 * is computed once and printed in both columns. A script that recomputed it
 * twice through the same unchanged function and then reported "no change"
 * would be a function compared with itself.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

import { expectationsSummary as summaryNew } from '../../api/_lib/expectations.js';
import { expectationsSummary as summaryOld } from './_expectations-at-dbfea844.js';
import { ALIGNED_TONE_STOPS } from '../../attune-app/src/lib/aligned-tone.js';
import { DEMO_COLUMN } from '../../api/_lib/demo-accounts.js';
import { calcDimScores, axisScores, typeCodeFromAxes } from '../../api/_type-engine.js';

const OUT = process.argv[2] || 'alignment-change.csv';

/* ── Credentials ────────────────────────────────────────────────────────
   From the environment first, falling back to .env.local, which is what
   Vercel CLI wrote and what is gitignored. Nothing is printed from it. */
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
if (!E.SUPABASE_URL || !E.SUPABASE_SERVICE_KEY) {
  console.error('No SUPABASE_URL / SUPABASE_SERVICE_KEY. Nothing was read.');
  process.exit(1);
}
const admin = createClient(E.SUPABASE_URL, E.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

/** A stable, non-reversible id for a pair. Same input, same id, every run. */
const coupleId = (idA, idB) =>
  'C-' + createHash('sha256').update([idA, idB].sort().join('|')).digest('hex').slice(0, 10).toUpperCase();

/** The category band both surfaces actually draw, from the shared ramp. */
const NAMES = { '#10b981': 'close', '#F5B841': 'middle' };
function band(pct) {
  if (pct == null || Number.isNaN(pct)) return '';
  const stop = ALIGNED_TONE_STOPS.find((s) => pct >= s.from);
  return stop ? NAMES[stop.color] : 'far';
}

/** One person's communication type letter, or null with no Exercise 1. */
function typeLetter(ex1) {
  if (!ex1) return null;
  const s = calcDimScores(ex1) || {};
  if (s.conflict == null && s.stress == null && s.expression == null) return null;
  const { withdrawScore, openScore } = axisScores(s);
  return typeCodeFromAxes(withdrawScore, openScore);
}

// ── Read ─────────────────────────────────────────────────────────────────
const COLUMNS = `id, name, partner_profile_id, ${DEMO_COLUMN}, ex1_answers, ex2_answers`;
let { data: profiles, error } = await admin.from('profiles').select(COLUMNS);
if (error) {
  console.error('Could not read profiles:', error.code, error.message);
  process.exit(1);
}
profiles = profiles || [];
const byId = new Map(profiles.map((p) => [p.id, p]));

// ── Who is excluded, and why ─────────────────────────────────────────────
const excluded = [];
const seen = new Set();
const couples = [];

for (const p of profiles) {
  if (seen.has(p.id)) continue;
  const partner = p.partner_profile_id ? byId.get(p.partner_profile_id) : null;

  if (p[DEMO_COLUMN] === true) {
    seen.add(p.id);
    excluded.push({ who: p.name || '(no name)', reason: 'marked is_demo in profiles' });
    continue;
  }
  if (!partner) {
    seen.add(p.id);
    excluded.push({ who: p.name || '(no name)', reason: p.partner_profile_id ? 'partner row not found' : 'no partner linked' });
    continue;
  }
  if (partner[DEMO_COLUMN] === true) {
    seen.add(p.id); seen.add(partner.id);
    excluded.push({ who: `${p.name || '(no name)'} + ${partner.name || '(no name)'}`, reason: 'partner marked is_demo' });
    continue;
  }
  if (!p.ex2_answers || !partner.ex2_answers) {
    seen.add(p.id); seen.add(partner.id);
    const missing = [!p.ex2_answers && (p.name || 'one'), !partner.ex2_answers && (partner.name || 'the other')].filter(Boolean);
    const verb = missing.length > 1 ? 'have' : 'has';
    excluded.push({ who: `${p.name || '(no name)'} + ${partner.name || '(no name)'}`, reason: `Expectations not complete (${missing.join(' and ')} ${verb} no ex2_answers)` });
    continue;
  }
  seen.add(p.id); seen.add(partner.id);
  couples.push([p, partner]);
}

// ── Compute ──────────────────────────────────────────────────────────────
const HEADERS = ['couple_id', 'category', 'old_score', 'new_score', 'difference',
  'old_band', 'new_band', 'couple_type_old', 'couple_type_new'];
const rows = [];
const disagree = { oldSaidAligned: 0, newSaysAligned: 0 };
let rowsCompared = 0;

for (const [a, b] of couples) {
  const args = { mine: a.ex2_answers, theirs: b.ex2_answers, youName: a.name || 'You', themName: b.name || 'Your partner' };
  const oldSum = summaryOld(args);
  const newSum = summaryNew(args);

  const letters = [typeLetter(a.ex1_answers), typeLetter(b.ex1_answers)];
  const type = letters.every(Boolean) ? letters.sort().join('') : '';

  const oldByLabel = new Map(oldSum.categories.map((c) => [c.label, c]));
  for (const cat of newSum.categories) {
    const was = oldByLabel.get(cat.label);
    /* Where the two rules disagree at ROW level, which is what moves a bar.
       Counted rather than inferred from the percentages: a category can come
       out level while rows underneath it move in both directions. */
    if (was) {
      for (let i = 0; i < cat.rows.length; i++) {
        const oldAligned = was.rows[i]?.aligned === true;
        const newAligned = cat.rows[i]?.band === 'aligned';
        if (oldAligned && !newAligned) disagree.oldSaidAligned++;
        if (!oldAligned && newAligned) disagree.newSaysAligned++;
        rowsCompared++;
      }
    }
    // The old percentage, exactly as the two surfaces worked it out. 0 of 0 is
    // not 0 per cent, it is nothing answered, so it stays blank.
    const oldPct = was && was.answered > 0 ? Math.round((was.aligned / was.answered) * 100) : null;
    const newPct = cat.closeness;
    rows.push([
      coupleId(a.id, b.id),
      cat.label,
      oldPct ?? '',
      newPct ?? '',
      (oldPct != null && newPct != null) ? newPct - oldPct : '',
      band(oldPct),
      band(newPct),
      type,
      type,
    ]);
  }
}

// ── Out ──────────────────────────────────────────────────────────────────
const esc = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const csv = [HEADERS.join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
writeFileSync(OUT, csv + '\n');

console.log(`Couples included: ${couples.length}`);
console.log(`Rows written:     ${rows.length}  (${couples.length} couples x ${rows.length / (couples.length || 1)} categories)`);
console.log(`CSV:              ${OUT}`);
console.log('');
console.log(`Excluded (${excluded.length}):`);
for (const x of excluded) console.log(`  - ${x.who}: ${x.reason}`);
console.log('');
console.log(`Row-level disagreement between the two rules, over ${rowsCompared} answered rows:`);
console.log(`  ${disagree.oldSaidAligned} the old rule called aligned and the new one does not.`);
console.log(`  ${disagree.newSaysAligned} the new rule calls aligned and the old one did not.`);
console.log('');
console.log('No database writes were made. Stored results rows were not read or changed.');
