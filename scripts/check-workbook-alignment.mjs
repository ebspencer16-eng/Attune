#!/usr/bin/env node
/**
 * The workbook's alignment percentages are the ones the couple already read.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * api/_couple-shape.js, which shapes the payload for the PDF workbook, worked
 * out each domain's percentage by counting rows where the two answers are the
 * same string. The results page and the app use domainAlignmentPct, which
 * scores each item for how CLOSE the two answers are and takes the mean, so a
 * pair one step apart gets partial credit.
 *
 * Measured over the same answers, through both real code paths:
 *
 *   a couple one step apart on everything read 50 to 71 per cent on their
 *   results page and 0 per cent in their workbook;
 *   on random answers the workbook came out 12 to 50 points lower on every
 *   domain.
 *
 * One labelled number, two methods, and the harsher one printed in the thing
 * they keep. Nothing failed, because both numbers are plausible percentages.
 *
 * ── WHY IT SURVIVED ───────────────────────────────────────────────────────
 * The duplication was deliberate once and said so: "touching
 * generate-workbook.js would risk breaking the live docx flow that customers
 * depend on today." generate-workbook.js was deleted when the Word workbook
 * went, so the reason expired and the duplication outlived it, with the note
 * still there explaining a risk that could no longer happen. A comment that
 * describes a dead path is worse than no comment: it answers the question
 * nobody then asks.
 *
 * src/App.jsx also carried a comment claiming its own category bars "match the
 * methodology used by the workbook Snapshot and the headline alignPct". Two of
 * those three agreed.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * It runs both paths. For several couples it builds the real workbook payload
 * with buildWorkbookPayload, shapes it with payloadToCouple exactly as
 * /api/store-workbook-pdf does, and compares each domain against
 * expectationsByDomain over the same raw answers.
 *
 * That is not a function compared with itself. The two sides share the
 * arithmetic now, and what this exercises is the plumbing between them: the
 * payload field, its name, and the shaping step. Drop the field and every
 * domain comes back zero, which is what the last version of this did silently.
 *
 * The couples are chosen rather than swept, because the methods differ most
 * where answers are CLOSE and not identical: a pair who agree exactly score
 * 100 either way, which is why "it looked right" for so long.
 *
 * And no file may count exact string matches to make an alignment percentage.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the methodology is the right one, which is Ellie's; the shared one
 * wins here because it is what the results page and the app have always shown.
 * And the row labels in _couple-shape.js, which are the PDF's column headings
 * rather than a rule, so they stay that file's own.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { buildWorkbookPayload } from '../api/_lib/workbook-payload.js';
import { payloadToCouple } from '../api/_couple-shape.js';
import { expectationsByDomain } from '../api/_lib/expectations-alignment.js';
import { RESPONSIBILITY_CATEGORIES, LIFE_QUESTIONS } from '../api/_questions.js';
import { mirrorRespKey, mirrorLifeId } from '../api/_lib/expectations.js';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

const RESP = ['Primarily mine', 'Balanced', "Primarily my partner's"];
const OPPOSITE = {
  'Primarily mine': "Primarily my partner's",
  "Primarily my partner's": 'Primarily mine',
  Balanced: 'Balanced',
};

let seed = 9;
const rnd = (n) => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) % n;

/**
 * One couple's raw answers, in the shape the exercise stores.
 *
 * `agree` is absolute agreement, which is not the same string on both sides:
 * if I say a task is primarily mine, agreement is my partner saying it is
 * primarily theirs. Getting that backwards is what made the first version of
 * this probe report every domain at zero.
 */
function answersFor(mode) {
  const a = { responsibilities: {}, life: {} };
  const b = { responsibilities: {}, life: {} };
  let i = 0;
  for (const cat of RESPONSIBILITY_CATEGORIES) {
    for (const item of (cat.items || [])) {
      const key = `${cat.id}__${item}`;
      i += 1;
      if (mode === 'agree') {
        const mine = RESP[i % RESP.length];
        a.responsibilities[key] = mine;
        b.responsibilities[mirrorRespKey(key)] = OPPOSITE[mine];
      } else if (mode === 'one step apart') {
        a.responsibilities[key] = 'Primarily mine';
        b.responsibilities[mirrorRespKey(key)] = 'Balanced';
      } else {
        a.responsibilities[key] = RESP[rnd(RESP.length)];
        b.responsibilities[mirrorRespKey(key)] = RESP[rnd(RESP.length)];
      }
    }
  }
  for (const q of LIFE_QUESTIONS) {
    const opts = q.options || q.choices || [];
    if (!opts.length) continue;
    const at = (n) => (typeof opts[n] === 'string' ? opts[n] : opts[n]?.value ?? opts[n]?.label);
    if (mode === 'agree') { a.life[q.id] = at(0); b.life[mirrorLifeId(q.id)] = at(0); }
    else if (mode === 'one step apart') {
      a.life[q.id] = at(0); b.life[mirrorLifeId(q.id)] = at(Math.min(1, opts.length - 1));
    } else { a.life[q.id] = at(rnd(opts.length)); b.life[mirrorLifeId(q.id)] = at(rnd(opts.length)); }
  }
  return { a, b };
}

const MODES = ['agree', 'one step apart', 'random', 'random', 'random'];
let compared = 0;
let widest = 0;

for (const mode of MODES) {
  const { a, b } = answersFor(mode);
  /* The real path: the payload the client builds, shaped the way
     /api/store-workbook-pdf shapes it. */
  const payload = buildWorkbookPayload('Ellie', 'Preston', {}, {}, a, b, null);
  const couple = payloadToCouple(payload);
  const wb = couple?.expectations || {};
  const shown = expectationsByDomain({ mine: a, theirs: b, youName: 'Ellie', themName: 'Preston' });

  if (!shown.length) {
    console.error('[check-workbook-alignment] expectationsByDomain returned no domains.'
      + ' Refusing to pass: a gate that has lost its subject must never report success.');
    process.exit(1);
  }
  for (const d of shown) {
    compared += 1;
    const got = wb[d.key];
    if (got == null) {
      fails.push(`${mode}: the workbook carries no percentage for "${d.key}".`
        + '\n      The payload field it reads is expectationsPct; a renamed or dropped field'
        + '\n      makes every domain come back zero, which is what used to happen quietly.');
      continue;
    }
    if (got !== d.pct) {
      widest = Math.max(widest, Math.abs(got - d.pct));
      fails.push(`${mode}: "${d.key}" is ${d.pct}% on the results page and ${got}% in the`
        + ' workbook.');
    }
  }
}

/* And nobody makes an alignment percentage by counting identical strings. */
function files(dir, out = []) {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) {
      if (/node_modules|\.expo|dist/.test(name)) continue;
      files(rel, out);
      continue;
    }
    if (/\.(js|jsx)$/.test(name)) out.push(rel);
  }
  return out;
}
for (const rel of ['api', 'src'].flatMap((d) => files(d))) {
  const src = readFileSync(join(ROOT, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));
  const m = /\.filter\([^)]*\.userValue\s*===\s*\w+\.partnerValue[^)]*\)/.exec(src);
  if (m) {
    fails.push(`${rel}:${src.slice(0, m.index).split('\n').length} counts rows whose two answers`
      + ' are the same string to make a percentage.'
      + '\n      domainAlignmentPct scores how close they are and takes the mean, which is what'
      + '\n      the couple has already been shown. Exact matching gives no partial credit and'
      + '\n      came out up to 71 points lower on the same answers.');
  }
}

if (fails.length) {
  console.error('[check-workbook-alignment] The workbook and the results page disagree about how'
    + ' aligned a couple is:');
  for (const f of fails) console.error(`  ${f}`);
  console.error('');
  console.error('One methodology: domainAlignmentPct in api/_lib/expectations-alignment.js.');
  process.exit(1);
}

console.log(`[check-workbook-alignment] ${compared} domain percentages over ${MODES.length} couples,`
  + ' including one who agree exactly and one a single step apart on everything, built through'
  + ' buildWorkbookPayload and payloadToCouple: every one equals what the results page shows.');
