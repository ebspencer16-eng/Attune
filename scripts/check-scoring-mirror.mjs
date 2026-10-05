// Fails the build when the website's copy of the scoring engine stops matching
// the real one.
//
// ── WHY THERE ARE TWO ──────────────────────────────────────────────────────
// api/_type-engine.js is the engine. src/App.jsx keeps a mirror of
// calcDimScores because it types from raw answers client-side on the demo
// path, where there is no server call to make.
//
// The mirror already imports QUESTION_WEIGHTS rather than restating them,
// because that duplication is what let the admin dashboard and the results
// pages disagree once. What it still restates is which questions belong to
// which dimension: ten literal lists, written out beside a call to score().
// Add a question to DIM_KEYS and the engine scores it while the website
// silently does not, and the same couple gets two different dimension scores.
//
// ── WHAT IS CHECKED ────────────────────────────────────────────────────────
// The ten lists, against DIM_KEYS, in both directions and in order. And the
// flipped-question set, since a question whose scale runs backwards on one
// side and forwards on the other inverts that dimension for that couple.
//
// ── ONE DIFFERENCE THAT IS DELIBERATE ──────────────────────────────────────
// The engine returns null for a dimension nobody answered; the mirror returns
// 3. That is not drift: the website needs a position to draw and the app
// leaves an unanswered dimension off the track rather than putting a mark at
// neutral, which would read as a real answer. It is asserted here so that it
// stays a decision rather than becoming a surprise.

import { readFileSync } from 'fs';
import { DIM_KEYS, FLIPPED_QUESTIONS, QUESTION_WEIGHTS, calcDimScores } from '../api/_type-engine.js';

const src = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const start = src.indexOf('function calcDimScores');
if (start === -1) {
  console.error('[check-scoring-mirror] src/App.jsx has no calcDimScores.');
  console.error('If the mirror is gone for good, delete this check with it.');
  process.exit(1);
}
const body = src.slice(start, src.indexOf('\n}', src.indexOf('return {', start)));

const problems = [];

// ── the ten dimension lists ────────────────────────────────────────────────
const mirror = {};
for (const m of body.matchAll(/(\w+):\s*score\('(\w+)'((?:,\s*'\w+')+)\)/g)) {
  if (m[1] !== m[2]) problems.push(`${m[1]} is scored as '${m[2]}', which is a different dimension`);
  mirror[m[1]] = m[3].split(',').map((x) => x.trim().replace(/'/g, '')).filter(Boolean);
}
if (!Object.keys(mirror).length) {
  problems.push('could not read any dimension from the mirror; the shape of calcDimScores changed.');
}
for (const dim of new Set([...Object.keys(DIM_KEYS), ...Object.keys(mirror)])) {
  const engine = (DIM_KEYS[dim] || []).join(',');
  const site = (mirror[dim] || []).join(',');
  if (engine !== site) {
    problems.push(
      `${dim} is scored from different questions:\n`
      + `      engine: ${engine || '(absent)'}\n`
      + `      site:   ${site || '(absent)'}`);
  }
}

// ── the flipped set ────────────────────────────────────────────────────────
const flipped = new Set(
  [...(/const FLIPPED = new Set\(\[([^\]]*)\]\)/.exec(body)?.[1] || '')
    .matchAll(/'(\w+)'/g)].map((m) => m[1]));
const engineFlipped = [...FLIPPED_QUESTIONS].sort().join(',');
const siteFlipped = [...flipped].sort().join(',');
if (engineFlipped !== siteFlipped) {
  problems.push(
    'the flipped questions differ, which inverts that dimension on one surface:\n'
    + `      engine: ${engineFlipped || '(none)'}\n      site:   ${siteFlipped || '(none)'}`);
}

// ── the one deliberate difference ──────────────────────────────────────────
if (!/:\s*3;/.test(body)) {
  problems.push(
    'the mirror no longer falls back to 3 for an unanswered dimension. That was '
    + 'deliberate, so if it changed on purpose update this check and say why.');
}

if (problems.length) {
  console.error('[check-scoring-mirror] the website scores a couple differently from the engine:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('api/_type-engine.js is the engine. The mirror in src/App.jsx exists only');
  console.error('for the demo path and must agree with it on every dimension.');
  process.exit(1);
}

/**
 * ── AND THE SAME ANSWER, NOT JUST THE SAME QUESTIONS ──────────────────────
 * Everything above compares the inputs: which questions belong to which
 * dimension, and which are reversed. None of it looks at the arithmetic.
 *
 * That is the half that was actually wrong somewhere else. api/admin-data.js
 * scored the same questions, with the same ten dimensions, and took a plain
 * average where the engine takes a weighted one; it disagreed with the product
 * by as much as 1.25 of a point on a one-to-five scale. Every input check in
 * this file would have passed on it.
 *
 * So the website's own scorer is lifted and run. It is a closure over
 * QUESTION_WEIGHTS and `score`, which it declares inside itself, so it comes
 * out whole and is given only what it reads from the module scope.
 *
 * The one agreed difference: the engine returns null for a dimension nothing
 * answered and the website returns 3, because the website positions a mark on
 * an axis and always needs a number. That is documented where it happens, and
 * is the only place the two are allowed to differ.
 */
const webScorer = await (async () => {
  const at = src.indexOf('function calcDimScores');
  let depth = 0;
  let end = -1;
  for (let i = src.indexOf('{', at); i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') { depth -= 1; if (depth === 0) { end = i + 1; break; } }
  }
  if (end === -1) return null;
  try {
    // eslint-disable-next-line no-new-func
    return new Function('QUESTION_WEIGHTS',
      `${src.slice(at, end)}\nreturn calcDimScores;`)(QUESTION_WEIGHTS);
  } catch { return null; }
})();

if (typeof webScorer !== 'function') {
  console.error('[check-scoring-mirror] could not lift calcDimScores out of src/App.jsx to run it.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

/*
 * Varied answers rather than a sweep of round numbers: a weighting difference
 * vanishes when every answer in a dimension is the same, which is exactly what
 * a tidy fixture of all-3s would have been.
 */
let worst = 0;
let worstAt = null;
for (let seed = 0; seed < 400; seed += 1) {
  const answers = {};
  let i = 0;
  for (const keys of Object.values(DIM_KEYS)) {
    for (const k of keys) { answers[k] = 1 + ((seed * 7 + (i += 1) * 3) % 5); }
  }
  const engine = calcDimScores(answers);
  const web = webScorer(answers);
  for (const dim of Object.keys(DIM_KEYS)) {
    if (engine[dim] == null) continue;   // the agreed difference, above
    const gap = Math.abs(engine[dim] - web[dim]);
    if (gap > worst) { worst = gap; worstAt = { dim, engine: engine[dim], web: web[dim] }; }
  }
}
if (worst > 0.0001) {
  console.error('[check-scoring-mirror] the website scores a couple differently from the engine:');
  console.error(`  ${worstAt.dim} comes out ${worstAt.engine.toFixed(3)} in api/_type-engine.js`
    + ` and ${worstAt.web.toFixed(3)} in src/App.jsx, on the same answers.`);
  console.error('  Same questions and the same flipped set are not the same score: the engine'
    + ' weights\n  each question by QUESTION_WEIGHTS and renormalises over the ones answered.');
  process.exit(1);
}

console.log(
  `[check-scoring-mirror] ${Object.keys(DIM_KEYS).length} dimensions score from the same `
  + 'questions on both surfaces, same flipped set, and 400 answer sets score identically.');
