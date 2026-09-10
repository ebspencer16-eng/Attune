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
import { DIM_KEYS, FLIPPED_QUESTIONS } from '../api/_type-engine.js';

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

console.log(
  `[check-scoring-mirror] ${Object.keys(DIM_KEYS).length} dimensions score from the same `
  + 'questions on both surfaces, same flipped set.');
