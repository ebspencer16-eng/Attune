#!/usr/bin/env node
/**
 * Only one module decides how aligned two people are.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Ellie: "One source of truth for every alignment score, wherever it appears."
 *
 * check-alignment-rule.mjs proves the rule is right. This proves nothing goes
 * round it. The two cannot be merged without losing one of those: a correct
 * rule with four copies is what this codebase keeps shipping, and the copies
 * agree on the day they are written.
 *
 * ── WHAT WAS ACTUALLY THERE ───────────────────────────────────────────────
 * Four separate rules for one figure, and they disagreed:
 *
 *   api/_lib/expectations.js      a boolean over three positions
 *   api/_lib/expectations-alignment.js  a similarity over three ranks
 *   src/App.jsx, builder A        that similarity, averaged for the bars
 *   src/App.jsx, builder B        `mine === theirs` over two DISPLAY strings,
 *                                 the exact comparison check-alignment-rule
 *                                 was originally written to abolish
 *   attune-app results.tsx        `cat.aligned / cat.answered` on the phone
 *
 * So the same category's bar was one number on the website and a different
 * number on the phone, and the follow-up the exercise asks after "Both of us"
 * was read by none of them.
 *
 * ── THE TWO SHAPES IT FORBIDS ─────────────────────────────────────────────
 * Turning a gap into a percentage by hand, and counting matches instead of
 * measuring distance. Both are one line, both look obviously correct, and both
 * are how a fifth copy arrives.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Communication. Its line is CARD_ALIGNED_GAP in api/_lib/comm-alignment.js,
 * one point on a one-to-five scale, which normalises to 0.25 and not to the
 * 0.2 the bands use. That constant's own note says why it has not moved:
 * changing it changes a figure every existing customer has already read, and
 * that is Ellie's decision rather than a side effect of this work. Named here
 * so nobody reads this gate as "all alignment is one rule" and either widens
 * it into a feature or quietly loosens it.
 *
 * The workbook's own scorer in api/_workbook-content.js is also out of scope,
 * for the reason stated there: it generates documents people already have.
 *
 * And `individual-profile.js` compares a score against 0.2 to describe which
 * way ONE person leans. That is not two people's answers and is not this.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { bandFor, closenessPct, meanPct, ALIGNMENT_BANDS } from '../api/_lib/alignment.js';

const ROOT = new URL('..', import.meta.url).pathname;
const MODULE = 'api/_lib/alignment.js';

/** Where the figures are produced and drawn. */
const TREES = ['api', 'src', 'attune-app/src'];

/**
 * The one place allowed to hold the arithmetic, plus the two documented
 * exceptions above. Each entry says WHY, because an allowlist with no reasons
 * is an allowlist that grows.
 */
const EXEMPT = {
  'api/_lib/alignment.js': 'is the module',
  'api/_lib/comm-alignment.js': "Communication's own threshold, Ellie's call to move",
  'api/_workbook-content.js': 'the workbook scorer; changing it changes generated documents',
};

const fails = [];

/** Every source file under the trees, recursively. */
function walk(dir, out = []) {
  for (const name of readdirSync(`${ROOT}${dir}`)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const rel = `${dir}/${name}`;
    if (statSync(`${ROOT}${rel}`).isDirectory()) walk(rel, out);
    else if (/\.(js|jsx|ts|tsx)$/.test(name)) out.push(rel);
  }
  return out;
}
const files = TREES.flatMap((t) => walk(t));
if (files.length < 50) {
  console.error(`[check-alignment-source] found only ${files.length} source files, which cannot`
    + ' be right. Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

/**
 * Comments are blanked before scanning.
 *
 * Every one of the lines this forbids is now described, in a comment, in the
 * file that used to contain it. CLAUDE.md has this lesson four times over:
 * punishing a file for recording what went wrong is how a gate makes the
 * history unwritable.
 */
function code(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));
}

/**
 * The shapes. Each one is this rule being decided outside the module.
 *
 * ── WHY THEY ARE STATEMENTS AND NOT LINES ─────────────────────────────────
 * The first version matched two literal spellings: `(1 - x) * 100` and
 * `.aligned / total`. Both plants of the bug as it was found failed it, and
 * three plants of the bug as a refactor would leave it walked straight
 * through:
 *
 *   the count taken with reduce instead of filter, so the `/` no longer
 *     follows the word `aligned`
 *   the subtraction hoisted one line up, so `1 -` and `* 100` are two
 *     statements
 *   the import replaced by a local function of the same name, which the
 *     import check accepted because `./comm-alignment.js` also ends in
 *     alignment.js
 *
 * None of those is exotic. They are what the code becomes when somebody tidies
 * it. So the scan works on statements rather than lines, and asks a question
 * about meaning: is a percentage being made here out of alignment data.
 */
const SHAPES = [
  {
    what: 'a percentage made out of alignment data',
    /* A statement that multiplies by 100 and mentions a gap, a distance or an
       aligned row. That is the only reason to turn one of those into a
       percentage, and there is one function for it. */
    test: (chunk) => /\*\s*100\b/.test(chunk)
      && /\b(aligned|avgGap|\w*[gG]ap|closeness|distance)\b/.test(chunk),
    say: 'closenessPct(gap) or meanPct(rows.map((r) => r.closeness))',
  },
  {
    what: 'a missing closeness read as nought',
    /**
     * ── WHY THIS IS ITS OWN SHAPE ─────────────────────────────────────────
     * The app drew `cat.closeness ?? 0`, and the moment it was published ahead
     * of the server every category bar read 0 per cent: six confident claims
     * of total disagreement, from a field that simply had not arrived yet. Seen
     * on a simulator, not reasoned about.
     *
     * Null here means "no figure", and nought means "as far apart as two
     * people can be". Collapsing the first into the second is the same mistake
     * as reading an unanswered question as a disagreement, which `meanPct` here
     * and `commAlignmentPct` next door were both written to avoid.
     *
     * Scoped to a figure read straight off a payload, which is where the lag
     * lives. The website computes its rows' closeness in the same render, so
     * `meanPct(rows.map(r => r.closeness)) ?? 0` there can only be reached by a
     * category with no comparable rows, and those are filtered out before any
     * bar is drawn. Saying so rather than widening the pattern until it catches
     * both: a gate that matches too much gets loosened until it matches nothing.
     */
    test: (chunk) => /\bcloseness\s*(\?\?|\|\|)\s*0\b/.test(chunk),
    say: 'null, and a row that says it has no figure rather than drawing one',
  },
  {
    what: 'a gap subtracted from one',
    /* The inversion on its own, which is how it survives being hoisted out of
       the expression that rounds it. */
    test: (chunk) => /\b1(?:\.0)?\s*-\s*[A-Za-z_$][\w$.?[\]]*([gG]ap|[dD]istance)\b/.test(chunk),
    say: 'closenessPct(gap)',
  },
];

/**
 * And the band chain, which is a different question from a number.
 *
 * An earlier version looked for a comparison against 0.2 or 0.5 anywhere, and
 * flagged four lines of which two were real code: a sentence about which way
 * ONE person leans, and a colour ramp on a one-to-five gap. 0.2 and 0.5 are
 * ordinary numbers. A gate that matches too much is not the safe direction,
 * because it gets loosened until it matches nothing.
 *
 * What is actually forbidden is the CHAIN: both thresholds, as comparisons, in
 * one file. That is `gapState` written out again, which is the only way this
 * particular rule has ever been duplicated.
 */
const EDGE_RE = (n) => new RegExp(`[<>]=?\\s*${String(n).replace('.', '\\.')}(?![0-9])`);
const CHAIN = [EDGE_RE(ALIGNMENT_BANDS.aligned), EDGE_RE(ALIGNMENT_BANDS.discuss)];

/** Statements, roughly: enough to keep a hoisted expression out of its
 *  neighbour's chunk while keeping one expression whole. */
function statements(src) {
  return src.split(/;|\n/).map((t) => t.trim()).filter(Boolean);
}

let scanned = 0;
let examined = 0;
const hits = [];
for (const rel of files) {
  const src = code(readFileSync(`${ROOT}${rel}`, 'utf8'));
  scanned += 1;
  for (const chunk of statements(src)) {
    examined += 1;
    for (const shape of SHAPES) {
      if (!shape.test(chunk)) continue;
      if (EXEMPT[rel]) { hits.push(`${rel} (exempt: ${EXEMPT[rel]})`); continue; }
      fails.push(`${rel} is ${shape.what}, outside ${MODULE}.\n`
        + `      ${chunk.slice(0, 120)}\n`
        + `      Use ${shape.say}. Four copies of this rule disagreed about one couple's\n`
        + '      results; the fifth will too, and it will agree on the day it is written.');
    }
  }
  if (CHAIN.every((re) => re.test(src))) {
    if (EXEMPT[rel]) hits.push(`${rel} (exempt: ${EXEMPT[rel]})`);
    else {
      fails.push(`${rel} compares against both ${ALIGNMENT_BANDS.aligned} and`
        + ` ${ALIGNMENT_BANDS.discuss}, which is the band chain written out again.\n`
        + '      Use bandFor(gap). One of these numbers moving without the other is a\n'
        + '      results page that calls the same gap two different things.');
    }
  }
}

/**
 * And the positive half: the surfaces that draw a figure read the module.
 *
 * A forbidding gate alone is satisfied by a surface that draws nothing, which
 * is how `/api/notes` ended up handing results.tsx the wrong list for months.
 */
const MUST_IMPORT = [
  ['api/_lib/expectations.js', 'the expectations rows and the category bars'],
  ['api/_lib/intimacy-results.js', "Physical Intimacy's per-aspect percentage"],
  ['api/_intimacy-questions.js', 'what an intimacy gap means'],
  ['api/_lib/highlight-cards.js', "the storycard's two rings"],
  ['src/App.jsx', "the website's bars, donuts and rows"],
];
for (const [rel, what] of MUST_IMPORT) {
  const src = readFileSync(`${ROOT}${rel}`, 'utf8');
  /* `[^'"]*alignment.js` was satisfied by `./comm-alignment.js`, which every
     one of these files also imports, so a surface could drop this module
     entirely and still pass. The slash is the whole fix. */
  if (!/from ['"][^'"]*\/alignment\.js['"]/.test(src)) {
    fails.push(`${rel} draws ${what} and does not import ${MODULE}.\n`
      + '      Either it has stopped drawing that, in which case remove this line, or it\n'
      + '      has gone back to working the figure out for itself.');
  }
}

/* The module answers at all. A gate about where a rule lives is worthless if
   the rule has been emptied out. */
if (closenessPct(0) !== 100 || closenessPct(1) !== 0 || bandFor(0) !== 'aligned'
    || bandFor(1) !== 'different' || meanPct([100, 0]) !== 50) {
  fails.push(`${MODULE} does not answer correctly about its own ends, so holding every`
    + ' surface to it proves nothing.');
}

if (fails.length) {
  console.error('\n check-alignment-source: a second rule for how aligned two people are.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-alignment-source] ${scanned} source files across api, the website and the app:`
  + ` no gap inverted by hand, no aligned rows counted over a total, and no band threshold`
  + ` read outside ${MODULE}. ${MUST_IMPORT.length} surfaces that draw one of these figures`
  + ` import it. ${hits.length} exempt line(s), each named with its reason in this file;`
  + " Communication's own threshold is deliberately not covered and says so.");
