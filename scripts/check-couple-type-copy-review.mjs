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

for (const type of COUPLE_TYPES) {
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

/* And the document itself is the generator's output, regenerated here. */
try {
  execFileSync('node', [`${ROOT}scripts/build-couple-type-copy-review.mjs`], { stdio: 'pipe' });
} catch (e) {
  problems.push(`the generator will not run: ${String(e.message).slice(0, 80)}`);
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

console.log(`[check-couple-type-copy-review] ${pairs} sentences, each with one proposal beside it,`
  + ` across ${COUPLE_TYPES.length} couple types. The document is the generator's output.`);
