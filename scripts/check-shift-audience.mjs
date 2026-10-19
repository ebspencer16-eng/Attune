#!/usr/bin/env node
/**
 * An action item addressed to one partner must not appear in the other's list.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Ellie: "For Preston and Me, our internal processing action item is for both
 * of us, the how you connect action item is for me, and the when things get
 * hard action item is for Preston. The action item for Preston should not be
 * included in my list of things to consider, and vice versa."
 *
 * Three things have to hold, and they fail in three different ways:
 *
 *   1. The committed table still describes the prose. It is generated, so an
 *      edited sentence leaves it stale, and a stale table hides the wrong row.
 *      The generator runs OUTSIDE npm run check for this reason: a check that
 *      regenerates before comparing is comparing a file with itself, which
 *      this project has shipped twice.
 *   2. The reader's side is worked out the same way getDimShift works it out.
 *      If the two disagree about who is `lo`, the filter hides the row that
 *      was addressed to the reader and keeps the one that was not, which is
 *      precisely backwards and completely silent.
 *   3. What Comes Next actually drops a 'them' row, and keeps 'you' and
 *      'both'. Run, not read: this is a filter, and a filter is a behaviour.
 *
 * ── WHAT IT DELIBERATELY DOES NOT DO ──────────────────────────────────────
 * It does not judge the classification. Whether a given sentence is really
 * addressed to one person is a reading of prose, and the rule that decides is
 * written down in the builder's header so it can be argued with. What is held
 * here is that the table matches the prose, the arithmetic matches the copy
 * engine, and the filter runs.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { SHIFTS } from '../api/_content/v1.js';
import { SHIFT_AUDIENCE } from '../api/_content/shift-audience.js';
import { shiftAudience, getDimShift } from '../api/_lib/dimension-copy.js';
import { whatComesNext } from '../api/_lib/what-comes-next.js';
import { contentFor } from '../api/_content/index.js';

const ROOT = new URL('..', import.meta.url).pathname;
const TABLE = `${ROOT}api/_content/shift-audience.js`;
const fails = [];

// ── 1. The committed table still describes the prose ────────────────────────
const before = readFileSync(TABLE, 'utf8');
execFileSync('node', [`${ROOT}scripts/build-shift-audience.mjs`], { stdio: 'pipe' });
const after = readFileSync(TABLE, 'utf8');
if (before !== after) {
  fails.push('api/_content/shift-audience.js is stale: the prose in v1.js has changed since it\n'
    + '      was generated, so some rows are attributed to the wrong person or to nobody.\n'
    + '      A fresh copy has been written in place. Read the diff and commit it.');
}

// ── 2. Every entry in the prose has an answer, and no answer is invented ────
const prose = SHIFTS('«LO»', '«HI»');
for (const dim of Object.keys(prose)) {
  for (const key of Object.keys(prose[dim])) {
    const who = SHIFT_AUDIENCE[dim]?.[key];
    if (!who) fails.push(`${dim} ${key} has prose and no audience.`);
    else if (!['lo', 'hi', 'both'].includes(who)) {
      fails.push(`${dim} ${key} is "${who}", which is not lo, hi or both.`);
    }
  }
}
for (const dim of Object.keys(SHIFT_AUDIENCE)) {
  for (const key of Object.keys(SHIFT_AUDIENCE[dim])) {
    if (!prose[dim]?.[key]) fails.push(`${dim} ${key} has an audience and no prose.`);
  }
}

/*
 * ── 3. The reader's side agrees with the copy engine ───────────────────────
 * Both of these work out which position the reader holds from the two scores.
 * getDimShift puts the lower score's name first; shiftAudience says 'you' when
 * the reader is that person. Swept either side of each of the four bucket
 * lines rather than on a tidy grid: the thresholds are the only places this
 * can be wrong.
 */
const copy = contentFor(undefined);
const POINTS = [1.0, 1.79, 1.81, 2.59, 2.61, 3.0, 3.39, 3.41, 4.19, 4.21, 5.0];
let swept = 0;
for (const dim of Object.keys(SHIFT_AUDIENCE)) {
  for (const mine of POINTS) {
    for (const theirs of POINTS) {
      const text = getDimShift(dim, mine, theirs, '«ME»', '«THEM»', copy);
      if (!text) continue;
      swept += 1;
      const who = shiftAudience(dim, mine, theirs);
      /* The same sentence read from the other side has to give the mirrored
         answer: what is mine from here is theirs from there. */
      const mirrored = shiftAudience(dim, theirs, mine);
      const ok = who === 'both' ? mirrored === 'both'
        : (who === 'you' ? mirrored === 'them' : mirrored === 'you');
      if (!ok) {
        fails.push(`${dim} at ${mine}/${theirs}: this reader gets "${who}" and their partner`
          + ` gets "${mirrored}". One sentence, two readers, and the two have to mirror.`);
      }
      /* And when it says "you", the sentence really does name the reader as
         the one with the modal. «ME» is whoever scored lower or higher; the
         table is in lo/hi terms, so this is the end-to-end check that the two
         coordinate systems line up. */
      if (who !== 'both') {
        const stored = SHIFT_AUDIENCE[dim][`${bucket(Math.min(mine, theirs))}_${bucket(Math.max(mine, theirs))}`];
        const iAmLo = bucket(mine) <= bucket(theirs);
        const expected = (stored === 'lo') === iAmLo ? 'you' : 'them';
        if (who !== expected) {
          fails.push(`${dim} at ${mine}/${theirs}: table says ${stored}, reader is`
            + ` ${iAmLo ? 'lo' : 'hi'}, so it should be ${expected} and it is ${who}.`);
        }
      }
    }
  }
}
function bucket(s) { return s <= 1.8 ? 1 : s <= 2.6 ? 2 : s <= 3.4 ? 3 : s <= 4.2 ? 4 : 5; }

if (swept < 200) {
  console.error(`[check-shift-audience] only ${swept} sentences were reached, which cannot be right.`
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

// ── 4. The filter runs ──────────────────────────────────────────────────────
/*
 * Three tiles, one of them addressed to the partner. The row has to be gone
 * from What Comes Next and the other two have to stay.
 *
 * `audience` is set by commsActionPlan in the product; here it is passed in
 * directly, because what is under test is the filter rather than the
 * classification, and a fixture that recomputes the thing it is testing is a
 * fixture that cannot fail.
 */
const page = whatComesNext({
  coupleTypeId: 'WX',
  commsPlan: {
    tiles: [
      { domain: 'internal', label: 'Internal Processing', body: 'For the two of you', dim: 'expression', audience: 'both' },
      { domain: 'connect', label: 'How You Connect', body: 'For the reader', dim: 'bids', audience: 'you' },
      { domain: 'hard', label: 'When Things Get Hard', body: 'For the partner', dim: 'conflict', audience: 'them' },
    ],
    protocols: [],
  },
  expectations: null,
  intimacy: null,
  reflection: null,
  conflictReady: false,
  conflictAnswers: null,
  names: { you: 'Ellie', them: 'Preston' },
  sides: null,
});
const comm = page.groups.find((g) => g.id === 'comm');
const titles = (comm?.items || []).map((i) => i.title).join(' | ');
if (!comm || comm.items.length !== 2) {
  fails.push(`What Comes Next kept ${comm ? comm.items.length : 0} of the three Communication`
    + ` rows and should have kept two: ${titles}`);
}
if (titles.includes('For the partner')) {
  fails.push('the row addressed to the partner is still in the reader\'s list.');
}
for (const want of ['For the two of you', 'For the reader']) {
  if (!titles.includes(want)) fails.push(`"${want}" was dropped and should not have been.`);
}

if (fails.length) {
  console.error('\n check-shift-audience: an action item is reaching the wrong person.\n');
  for (const f of fails) console.error(`  ✗ ${f}`);
  console.error('');
  process.exit(1);
}

const one = Object.values(SHIFT_AUDIENCE)
  .flatMap((d) => Object.values(d)).filter((v) => v !== 'both').length;
const all = Object.values(SHIFT_AUDIENCE).flatMap((d) => Object.values(d)).length;
console.log(`[check-shift-audience] ${all} shift sentences, ${one} of them addressed to one`
  + ` partner, swept over ${swept} score pairs either side of every bucket line, and the two`
  + ' readers mirror on every one. What Comes Next drops the partner\'s row and keeps the'
  + ' other two, run rather than read.');
