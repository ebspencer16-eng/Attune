#!/usr/bin/env node
/**
 * The couple type copy review says what the product says.
 *
 * Two things, and the second is the one worth having:
 *
 *   the document is what the generator produces from api/_couple-types.js, so
 *   it cannot drift from the copy that ships.
 *
 *   every proposal still answers a sentence that exists. A proposal is written
 *   against one sentence; if that sentence is rewritten or removed, the
 *   proposal beside it is about something nobody will ever read. This repo has
 *   paid for a review document that quietly described something else once
 *   already.
 *
 * It does not check the proposals themselves. They are copy, and copy is
 * Ellie's.
 */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { COUPLE_TYPES } from '../api/_couple-types.js';

const ROOT = new URL('..', import.meta.url).pathname;
const SHORT = JSON.parse(readFileSync(`${ROOT}scripts/couple-type-short.json`, 'utf8'));

const problems = [];
let pairs = 0;

/**
 * ── AN EMPTY PROPOSALS FILE IS THE ANSWERED STATE ─────────────────────────
 * Ellie rewrote all sixty on 17 October and they went into
 * api/_couple-types.js the same day. A proposal that has been applied is
 * spent: leaving it in the file would put a second column beside sentences
 * identical to it, which reads as a decision still waiting to be made.
 *
 * So `{}` means there is nothing outstanding, and what this still checks is
 * the half that matters either way: the document is the generator's output,
 * so it cannot describe copy the product does not serve. The other half, that
 * every proposal answers a live sentence, has nothing to say about an empty
 * file and says so rather than passing silently.
 */
const answered = Object.keys(SHORT).length === 0;

for (const type of answered ? [] : COUPLE_TYPES) {
  const prop = SHORT[type.id];
  if (!prop) { problems.push(`${type.id} (${type.name}) has no proposals at all.`); continue; }
  for (const [key, field, heading] of [
    ['S', 'strengths', 'What comes naturally'],
    ['P', 'stickingPoints', "What's worth being aware of"],
  ]) {
    const now = type[field] || [];
    const mine = prop[key] || [];
    if (mine.length !== now.length) {
      problems.push(`${type.id} ${heading}: ${now.length} sentence(s) ship and ${mine.length}`
        + ' proposal(s) exist. A proposal with no sentence, or a sentence with no proposal,'
        + ' is a row of that table that says nothing.');
    }
    /* And each proposal still answers the sentence it was written against.
       Counting them is not enough: rewriting a sentence leaves the count the
       same, and the first plant against this gate walked straight through it
       while the header claimed otherwise. */
    const fingerprint = (x) => String(x).replace(/\s+/g, ' ').trim().slice(0, 48);
    now.forEach((sentence, i) => {
      const prop = mine[i];
      if (!prop) return;
      if (prop.was !== fingerprint(sentence)) {
        problems.push(`${type.id} ${heading} ${i + 1}: the proposal was written against`
          + ` "${prop.was}..." and the sentence now reads "${fingerprint(sentence)}...".`
          + ' Rewrite the proposal or drop it.');
      }
    });
    pairs += Math.min(mine.length, now.length);
  }
}

/**
 * ── AND THE COMMITTED DOCUMENT IS THAT OUTPUT ─────────────────────────────
 * This used to run the generator and then look at the file, which is a
 * comparison of a file against itself: the generator had just written it, so
 * a document that disagreed with the module passed every time. CLAUDE.md
 * records that exact failure about the insights review; this is the same
 * gate making the same mistake, found by planting a changed sentence and
 * watching it sail through.
 *
 * So the file is read first, the generator runs, and the two are compared.
 * The regenerated file is left in place, because that is what the author
 * wants next anyway; what changes is that the build fails until it is
 * committed. For the same reason the generator is no longer run ahead of
 * this in `npm run check`.
 */
const DOC = `${ROOT}COUPLE-TYPE-COPY-REVIEW.md`;
let before = '';
try { before = readFileSync(DOC, 'utf8'); } catch { before = ''; }
try {
  execFileSync('node', [`${ROOT}scripts/build-couple-type-copy-review.mjs`], { stdio: 'pipe' });
} catch (e) {
  problems.push(`the generator will not run: ${String(e.message).slice(0, 80)}`);
}
const after = readFileSync(DOC, 'utf8');
if (before !== after) {
  problems.push('COUPLE-TYPE-COPY-REVIEW.md is not what the generator produces from'
    + ' api/_couple-types.js. It has been regenerated; commit it. If the difference is an'
    + ' edit made in the document, it is lost: the document is written from the module and'
    + ' her answers go into the module.');
}

if (problems.length) {
  console.error('[check-couple-type-copy-review] the review table has rows that say nothing:');
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error('');
  console.error('  Her answers go into api/_couple-types.js, and the proposals file follows.');
  console.error('  A proposal left beside a sentence it was not written against is worse than');
  console.error('  no proposal: it reads as a choice about copy that nobody will ever see.');
  process.exit(1);
}

if (answered) {
  /* The document has to be the one column, not sixty rows of "(nothing
     proposed)": that is what the generator does with an empty file, and this
     is where it is checked rather than assumed. */
  const doc = readFileSync(`${ROOT}COUPLE-TYPE-COPY-REVIEW.md`, 'utf8');
  if (doc.includes('(nothing proposed)')) {
    console.error('[check-couple-type-copy-review] the proposals file is empty and the document'
      + ' still has a proposal column. Regenerate it.');
    process.exit(1);
  }
  const lines = (doc.match(/^\| [A-Z]{2} \| \d \|/gm) || []).length;
  const want = COUPLE_TYPES.reduce((n, t) =>
    n + (t.strengths || []).length + (t.stickingPoints || []).length, 0);
  if (lines !== want) {
    console.error(`[check-couple-type-copy-review] the document has ${lines} rows and the module`
      + ` has ${want} sentences.`);
    process.exit(1);
  }
  console.log(`[check-couple-type-copy-review] ${want} sentences, hers, in the module the product`
    + " reads; the document is the generator's output and has no column left to choose.");
  process.exit(0);
}

console.log(`[check-couple-type-copy-review] ${pairs} sentences, each with one proposal beside it,`
  + ` across ${COUPLE_TYPES.length} couple types. The document is the generator's output.`);
