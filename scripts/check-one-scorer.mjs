#!/usr/bin/env node
/**
 * There is one scorer, and it is api/_type-engine.js.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * CLAUDE.md lists that file as the single source for dimensions, weights and
 * scoring, and says why: two scorers drifting apart is how this product starts
 * lying to people.
 *
 * ── THEY HAD ALREADY DRIFTED ──────────────────────────────────────────────
 * api/admin-data.js carried its own `calcDimScores`, its own dimension-to-items
 * map and its own flipped set, under a comment saying it mirrored src/App.jsx.
 * It differed in two ways:
 *
 *   it took a plain average where the engine takes a weighted one, and all ten
 *   dimensions have non-uniform weights;
 *
 *   its flipped set was empty, under a comment reading "st1 is the only flipped
 *   question, and it is handled by the shared scorer rather than here" — true
 *   of a shared scorer this file was not calling. So a reverse-worded question
 *   was counted forwards.
 *
 * Over four hundred answer sets the two disagreed by as much as 1.25 of a point
 * on a 1-5 scale. Ellie reads the admin to understand her customers.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * No file outside the engine defines a function that scores dimensions, and no
 * file outside it carries a dimension-to-questions map or a flipped set of its
 * own. Both halves: the bug needed all three copies and deleting only the
 * function would leave the parts for a new one lying beside each other.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The app, which cannot import from api/ and does not score: CLAUDE.md's rule
 * is that results arrive already computed, and check-app-derives holds that.
 * This is about the server and the website, where a second scorer is possible.
 *
 * check-scoring-mirror compares the website's questions and flipped set against
 * the engine's. That is the pair this one cannot delete: it proves the two
 * surfaces agree about WHAT is scored, where this proves there are not two
 * implementations of HOW.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const ENGINE = 'api/_type-engine.js';
const fails = [];

/**
 * The website keeps its own question map by necessity and check-scoring-mirror
 * holds it to the engine's. Named here with that reason rather than skipped
 * silently, so nobody reads its absence as nothing watching it.
 */
const HELD_ELSEWHERE = {
  'src/App.jsx': 'check-scoring-mirror compares its map and flipped set to the engine',
};

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

const engineSrc = readFileSync(join(ROOT, ENGINE), 'utf8');
if (!/export function calcDimScores/.test(engineSrc) || !/QUESTION_WEIGHTS/.test(engineSrc)) {
  console.error(`[check-one-scorer] ${ENGINE} no longer exports a weighted calcDimScores.`
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

let scanned = 0;
for (const rel of ['api', 'src'].flatMap((d) => files(d))) {
  if (rel === ENGINE) continue;
  scanned += 1;
  const src = readFileSync(join(ROOT, rel), 'utf8');
  const held = HELD_ELSEWHERE[rel];

  /*
   * A scorer, by what it does rather than by its name: a function that walks a
   * dimension map and averages. Matching the name alone would miss
   * `scoreDimensions` or `dimAverages`, which is what the same function gets
   * called the second time somebody writes it.
   */
  for (const m of src.matchAll(/function (\w+)\s*\([^)]*\)\s*\{/g)) {
    const name = m[1];
    const body = src.slice(m.index, m.index + 900);
    const walksDims = /Object\.entries\((DIM_\w+|\w*[Dd]im\w*)\)/.test(body);
    /* Sums and then divides. The first version required the divisor to be
       spelled `length`, `totalW` or `w`, so a plant dividing by `v.length`
       walked straight past it: the dot was not in the pattern. What a mean is,
       is a reduce whose result is divided by something. */
    const averages = /reduce\(/.test(body) && /\)\s*\/\s*[\w.$[\]]+/.test(body);
    if (walksDims && averages) {
      if (held) continue;
      fails.push(`${rel}:${src.slice(0, m.index).split('\n').length} defines \`${name}\`, which`
        + ' walks a dimension map and averages it: a second scorer.\n'
        + `      Import calcDimScores from ${ENGINE}. It weights the questions and it reverses the\n`
        + '      reverse-worded ones, and a hand-written average does neither.');
    }
  }

  /*
   * And the materials. A map from a dimension to its question ids, or a set of
   * flipped ids, is half a scorer sitting ready; both copies in admin-data.js
   * were wrong in their own right before anything averaged them.
   */
  /* Question ids, not prose: `['en4','en6']` and never `['Independent',
     'Togetherness']`. api/admin-explore.js maps each dimension to the words at
     its two poles, which is a label table and not half a scorer; the first
     version of this flagged it, which is a gate matching too much and the
     direction that manufactures findings. */
  const map = /const (\w*(?:DIM|Dim)\w*)\s*=\s*\{\s*\n(?:\s*\w+:\s*\[\s*(?:'[a-z]{2,4}\d{1,2}'\s*,?\s*)+\],?\s*\n){5,}/.exec(src);
  if (map && !held) {
    fails.push(`${rel}:${src.slice(0, map.index).split('\n').length} declares \`${map[1]}\`, a`
      + ' dimension-to-questions map of its own.\n'
      + `      DIM_KEYS is exported from ${ENGINE}. A second copy is what the second scorer was\n`
      + '      built out of, and it had the same ten dimensions, which is why nobody looked.');
  }
  const flipped = /const (\w*FLIPPED\w*)\s*=\s*new Set\(/.exec(src);
  if (flipped && !held) {
    fails.push(`${rel}:${src.slice(0, flipped.index).split('\n').length} declares`
      + ` \`${flipped[1]}\`, a flipped-question set of its own.\n`
      + `      FLIPPED_QUESTIONS is exported from ${ENGINE}. The copy this replaced was empty,`
      + '\n      so every reverse-worded answer was counted forwards.');
  }
}

if (scanned < 50) {
  console.error(`[check-one-scorer] scanned only ${scanned} files, which cannot be right.`
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

if (fails.length) {
  console.error('\n check-one-scorer: something other than the engine is scoring dimensions.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-one-scorer] ${scanned} files under api/ and src/: one weighted scorer, one`
  + ' dimension map and one flipped set, all in api/_type-engine.js.');
