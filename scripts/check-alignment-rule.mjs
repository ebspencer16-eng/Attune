#!/usr/bin/env node
/**
 * How close two expectations answers are. One rule, and it is the right rule.
 *
 * ── WHAT THIS IS THE SECOND VERSION OF ────────────────────────────────────
 * The first version held a boolean, `agrees()`, against the display-string
 * comparison the website used to do. That caught a real bug: the two surfaces
 * told one couple different things wherever "Doesn't apply" appeared, 33 of
 * the 81 pairs, and the app was always the optimistic one. Ellie found it by
 * noticing her own results did not match between the two products.
 *
 * Both of those rules are gone. Ellie: "I don't think it should be
 * all-or-nothing aligned, I want to include degrees (preston and I were
 * basically aligned on this one so it's a good example)." A boolean cannot
 * carry a degree, so the rule is a distance now and agreement is the top of
 * it. This checks the distance.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Two answers that are close score closer than two that are opposite, and the
 * two surfaces cannot disagree about by how much.
 *
 * ── WHY THE EXPECTED POSITIONS ARE WRITTEN OUT HERE ───────────────────────
 * Because a gate that imports the table it is checking is a gate that asserts
 * a function equals itself. CLAUDE.md has that lesson from check-feedback-
 * mirror, where the website's labels were passed to the server's copy as its
 * input and every sentence was compared against itself.
 *
 * So POSITIONS below is typed out from the exercise as a person experiences
 * it: what the screen offers, and where each answer sits between the two of
 * them. If api/_lib/expectations.js changes its mind about any one of them,
 * these disagree and the build fails.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The roll-ups. A category bar averages its rows and the headline averages
 * five domains that cut across the categories, and which of those a given
 * figure should use is a product decision rather than a rule. This is about
 * one pair of answers.
 */

import { respDistance, lifeDistance } from '../api/_lib/expectations.js';
import { bandFor, closenessPct, distancePct, isAligned, ALIGNMENT_BANDS } from '../api/_lib/alignment.js';

const YOU = 'Ellie';
const THEM = 'Preston';

/**
 * Where each answer sits on the scale between the two of them, 0 to 2.
 *
 * Typed out from the exercise rather than read from the module. The left
 * column is the value as stored; `mine` is what it means when SHE stored it
 * and `theirs` what it means when HE did. A name means the same person either
 * way; "Primarily mine" does not, which is the mirror this whole area is
 * about.
 */
const POSITIONS = [
  // [stored value, detail, position when it is hers, position when it is his]
  [YOU,                      null,                                   0,   0],
  [THEM,                     null,                                   2,   2],
  ['Primarily mine',         null,                                   0,   2],
  ["Primarily my partner's", null,                                   2,   0],
  ['Both of us',             'Genuinely 50/50',                      1,   1],
  ['Both of us',             `Usually ${YOU}, sometimes ${THEM}`,     0.5, 0.5],
  ['Both of us',             `Usually ${THEM}, sometimes ${YOU}`,     1.5, 1.5],
  ['Balanced',               'Genuinely 50/50',                      1,   1],
];

const fails = [];
let checked = 0;

/* ── 1. Every pair of positions is the distance between them ───────────── */
for (const [aVal, aDet, aMine] of POSITIONS) {
  for (const [bVal, bDet, , bTheirs] of POSITIONS) {
    const want = Math.abs(aMine - bTheirs) / 2;
    const got = respDistance({
      yourValue: aVal, theirValue: bVal,
      yourDetail: aDet, theirDetail: bDet,
      youName: YOU, themName: THEM,
    });
    checked += 1;
    if (got !== want) {
      fails.push(`"${aVal}"${aDet ? ` (${aDet})` : ''} at ${aMine} against `
        + `"${bVal}"${bDet ? ` (${bDet})` : ''} at ${bTheirs}: `
        + `the distance should be ${want} and respDistance says ${got}.`);
    }
  }
}

/* ── 2. Ellie's own example, by name ───────────────────────────────────────
   The case she wrote the instruction about. Not a sample of a sweep: the one
   pair of answers that prompted the change, asserted on its own so that a
   regression names her rather than a row number. */
const hers = respDistance({
  yourValue: 'Both of us', yourDetail: `Usually ${YOU}, sometimes ${THEM}`,
  theirValue: YOU, theirDetail: null,
  youName: YOU, themName: THEM,
});
if (closenessPct(hers) !== 75) {
  fails.push('Emotional Labour, her example: she answered Both of us and refined it to'
    + ` "Usually ${YOU}, sometimes ${THEM}", he answered "${YOU}".`
    + ` That is one step on a five-point scale and should read 75 per cent close;`
    + ` it reads ${closenessPct(hers)}.`);
}
if (bandFor(hers) !== 'discuss') {
  fails.push(`her example should land in the discuss band, not ${bandFor(hers)}.`);
}

/* ── 3. The refinement has to change the answer ────────────────────────────
   The whole of W63 is that the follow-up after "Both of us" was read by
   nothing. If a gate can pass while that is true again, it is not this gate. */
const bothEven = respDistance({
  yourValue: 'Both of us', yourDetail: 'Genuinely 50/50',
  theirValue: YOU, theirDetail: null, youName: YOU, themName: THEM,
});
if (!(hers < bothEven)) {
  fails.push('"Both, usually Ellie" against "Ellie" is not scored closer than'
    + ' "Both, genuinely 50/50" against "Ellie". The refinement is being ignored,'
    + ' which is the bug this rule exists for.');
}

/* ── 4. A Both with no refinement agrees with any Both ─────────────────────
   A row stored before the follow-up existed must not manufacture a gap
   against a partner who did answer it. */
for (const detail of [null, 'Genuinely 50/50', `Usually ${YOU}, sometimes ${THEM}`]) {
  const d = respDistance({
    yourValue: 'Both of us', yourDetail: null,
    theirValue: 'Both of us', theirDetail: detail,
    youName: YOU, themName: THEM,
  });
  if (d !== 0) {
    fails.push(`"Both of us" with nothing more said against "Both of us"`
      + `${detail ? ` (${detail})` : ' (also nothing)'} reads ${d} and should read 0.`
      + ' A row from before the follow-up existed is not a disagreement.');
  }
}

/* ── 5. Doesn't apply is an answer, and stays off the scale ────────────── */
const NA = ["Doesn't apply", "Doesn't apply to us"];
for (const a of NA) {
  for (const b of NA) {
    if (respDistance({ yourValue: a, theirValue: b, youName: YOU, themName: THEM }) !== 0) {
      fails.push(`both saying it does not apply (${a} / ${b}) is agreement and is not scored as one.`);
    }
  }
  for (const [v, det] of POSITIONS) {
    const d = respDistance({ yourValue: a, theirValue: v, theirDetail: det, youName: YOU, themName: THEM });
    if (d !== 1) {
      fails.push(`"${a}" against "${v}" reads ${d}. One of them saying a responsibility`
        + ' does not apply while the other says who does it is a full difference, which'
        + ' is the reading the website has always given customers.');
    }
  }
}

/* ── 6. Unanswered is not a distance of nought ─────────────────────────── */
for (const empty of [null, undefined, '']) {
  if (respDistance({ yourValue: empty, theirValue: YOU, youName: YOU, themName: THEM }) !== null) {
    fails.push('an unanswered item has a distance, so it would be drawn as a comparison.');
  }
  if (respDistance({ yourValue: YOU, theirValue: empty, youName: YOU, themName: THEM }) !== null) {
    fails.push('an item the partner has not answered has a distance.');
  }
}
if (lifeDistance(null, 'Open to it', ['Uncertain', 'Open to it']) !== null) {
  fails.push('an unanswered life question has a distance.');
}

/* ── 7. Life questions are graded by how far apart the options are ────── */
const OPTS = ['Not part of my future', 'Uncertain', 'Open to it', 'Important to me, I want at least one', 'Central to my future'];
for (let i = 0; i < OPTS.length; i += 1) {
  for (let j = 0; j < OPTS.length; j += 1) {
    const want = Math.abs(i - j) / (OPTS.length - 1);
    const got = lifeDistance(OPTS[i], OPTS[j], OPTS);
    checked += 1;
    if (Math.abs(got - want) > 1e-9) {
      fails.push(`life options ${i} and ${j} are ${Math.abs(i - j)} apart of ${OPTS.length - 1}`
        + ` and read ${got} rather than ${want}.`);
    }
  }
}
/* Adjacent is closer than opposite, which is the instruction in one line. */
if (!(lifeDistance(OPTS[0], OPTS[1], OPTS) < lifeDistance(OPTS[0], OPTS[4], OPTS))) {
  fails.push('two neighbouring life answers are not scored closer than two opposite ones.');
}

/* ── 8. The bands, sampled either side of each line by a hundredth ────────
   A round grid over a rule made of thresholds tests everywhere except the
   only places that matter. CLAUDE.md has that from check-feedback-mirror,
   where a plant moved a threshold from 0.75 to 0.80 and the sweep had no
   sample point between them.

   ── AND THE EDGES ARE TYPED OUT, NOT IMPORTED ─────────────────────────────
   They were ALIGNMENT_BANDS.aligned and .discuss, read from the module under
   test, so moving the aligned band to 0.21 moved this gate's sample points
   with it and the plant walked straight through. That is the same vacuous
   comparison this file's own header warns about, two sections lower down,
   committed by the person who wrote the warning.

   The numbers below are the product's promise rather than the module's
   current state. Changing a band is a change to what every customer's
   results say, so it has to be made here as well, deliberately. */
const EDGE_ALIGNED = 0.2;
const EDGE_DISCUSS = 0.5;
if (ALIGNMENT_BANDS.aligned !== EDGE_ALIGNED || ALIGNMENT_BANDS.discuss !== EDGE_DISCUSS) {
  fails.push(`the bands have moved: ALIGNMENT_BANDS is ${JSON.stringify(ALIGNMENT_BANDS)}`
    + ` and this check expects aligned at ${EDGE_ALIGNED} and discuss at ${EDGE_DISCUSS}.\n`
    + '      Every figure on every results page shifts with these, so if the move is'
    + ' intended, change the two constants in this file too and say so in the commit.');
}
for (const [edge, inside, outside] of [
  [EDGE_ALIGNED, 'aligned', 'discuss'],
  [EDGE_DISCUSS, 'discuss', 'different'],
]) {
  checked += 2;
  if (bandFor(edge) !== inside) {
    fails.push(`a distance of exactly ${edge} reads ${bandFor(edge)} and should read ${inside}.`);
  }
  if (bandFor(edge + 0.01) !== outside) {
    fails.push(`a distance of ${edge + 0.01} reads ${bandFor(edge + 0.01)} and should read ${outside}.`);
  }
}

/* ── 9. Closeness is the distance inverted, and monotonic ─────────────── */
let last = 101;
for (let i = 0; i <= 100; i += 1) {
  const pct = closenessPct(i / 100);
  if (pct > last) {
    fails.push(`closeness is not monotonic: distance ${i / 100} reads ${pct} after ${last}.`);
    break;
  }
  last = pct;
}
if (closenessPct(0) !== 100 || closenessPct(1) !== 0) {
  fails.push(`identical answers read ${closenessPct(0)} and opposite answers read ${closenessPct(1)};`
    + ' they should read 100 and 0.');
}
if (!isAligned(0) || isAligned(1)) {
  fails.push('isAligned does not agree with the ends of its own scale.');
}

/* ── 10. The two readings of one distance are exact complements ───────────
   Physical Intimacy draws both: the bar says how close they are and the prose
   under it is chosen by how far apart they are. If those two stop adding to a
   hundred, a page says 87 per cent aligned beside a sentence written for a
   wider gap than that, and nothing errors. The claim was written in a comment
   on distancePct and checked by nothing, which is this file's own subject. */
for (let i = 0; i <= 100; i += 1) {
  const d = i / 100;
  checked += 1;
  if (closenessPct(d) + distancePct(d) !== 100) {
    fails.push(`at a distance of ${d}, closeness reads ${closenessPct(d)} and distance reads`
      + ` ${distancePct(d)}, which add to ${closenessPct(d) + distancePct(d)} rather than 100.`);
    break;
  }
}
if (distancePct(null) !== null) {
  fails.push('an unmeasurable distance has a percentage, so an unanswered aspect would'
    + ' be drawn as a gap of nought rather than as unanswered.');
}

/* A gate that has lost its subject must never report success. */
if (checked < 80) {
  console.error(`[check-alignment-rule] only ${checked} comparisons ran, which cannot be right.`
    + ' Refusing to pass.');
  process.exit(1);
}

if (fails.length) {
  console.error('\n check-alignment-rule: the product would tell a couple the wrong thing'
    + ' about how close their answers are.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  console.error('  api/_lib/expectations.js measures the distance; api/_lib/alignment.js says');
  console.error('  what a distance means. Both are one place on purpose. If the rule should');
  console.error('  change, change it there and change the table at the top of this file too,');
  console.error('  deliberately, because it is written out independently for a reason.\n');
  process.exit(1);
}

console.log(`[check-alignment-rule] ${checked} comparisons across the five-point responsibility`
  + ' scale and a five-option life question, every one the distance the exercise implies.'
  + ' Her Emotional Labour example reads 75 per cent close where it used to read a flat miss,'
  + ' the refinement after "Both of us" changes the answer, a row stored before that'
  + " follow-up existed does not manufacture a gap, and both band edges hold to a hundredth.");
