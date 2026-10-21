/**
 * SWEEP: every percentage the product computes, over its whole input space.
 *
 * A behavioural sweep, which CLAUDE.md argues is the kind that holds: it runs
 * each producer rather than reading it. Four of them turn a distance or a
 * count into a number a person reads as "x% aligned". The property measured is
 * that each one stays within 0..100 and is a whole number, for EVERY input it
 * can be given, including the ones a tidy fixture never produces: a distance
 * past the end of the scale, an empty list, a list of nothing but zeroes.
 *
 * The inputs are chosen either side of each boundary by a hundredth rather
 * than swept on a round grid. CLAUDE.md records why: a quarter-step sweep over
 * a rule made of thresholds tests everywhere except the only places that
 * matter.
 */
import { closenessPct, distancePct, meanPct, ALIGNMENT_BANDS } from '../../api/_lib/alignment.js';
import { commAlignmentPct } from '../../api/_lib/comm-alignment.js';

const fails = [];
let checks = 0;

/** Distances either side of every band edge, plus the illegal ones. */
const edges = [...new Set(
  Object.values(ALIGNMENT_BANDS || {})
    .flatMap((b) => (typeof b === 'object' ? Object.values(b) : [b]))
    .filter((v) => typeof v === 'number'),
)].sort((a, b) => a - b);

const distances = [
  -5, -1, -0.01, 0, 0.01,
  ...edges.flatMap((e) => [e - 0.01, e, e + 0.01]),
  0.99, 1, 1.01, 2, 4, 100,
  NaN, Infinity, -Infinity,
];

/* null is the DESIGNED answer for "there is no figure here", documented in
   alignment.js and asked for by name: "a category with no figure says so
   instead of claiming nought". The first run called all four of those a
   failure, which is the harness, not the product. They are counted instead. */
let noFigure = 0;
function expect(label, got, { whole = true } = {}) {
  checks++;
  if (got === null || got === undefined) { noFigure++; return; }
  if (!Number.isFinite(got)) { fails.push(`${label} -> ${got}, which is neither a figure nor the no-figure answer`); return; }
  if (got < 0 || got > 100) fails.push(`${label} -> ${got}, outside 0..100`);
  if (whole && !Number.isInteger(got)) fails.push(`${label} -> ${got}, not a whole percentage`);
}

for (const d of distances) {
  expect(`closenessPct(${d})`, closenessPct(d));
  expect(`distancePct(${d})`, distancePct(d));
}

/** The roll-up takes a list of percentages that may be empty or degenerate. */
const lists = [
  [], [0], [100], [0, 100], [50, 50],
  [0, 0, 0], [100, 100, 100],
  [33, 33, 34], [1, 99],
  [-10, 110],                 // a caller that has already gone wrong
  [NaN], [50, NaN],
];
for (const l of lists) expect(`meanPct(${JSON.stringify(l)})`, meanPct(l));

/** Comms takes gaps per dimension, and an empty set is a real case: a couple
    where neither person answered a scored dimension. */
const gapSets = [
  [], [0], [4], [0, 0], [4, 4], [0, 4],
  [0, 1, 2, 3, 4], [1.5, 1.5],
  [-1], [99],
  [NaN],
];
for (const g of gapSets) expect(`commAlignmentPct(${JSON.stringify(g)})`, commAlignmentPct(g));

/* The two expectations producers take a pair of answer bags. An empty bag is
   a real case: a couple where neither person answered that domain. */
const { domainAlignmentPct, overallExpectationsPct } = await import('../../api/_lib/expectations-alignment.js');
const bags = [
  { mine: {}, theirs: {} },
  { mine: { lq_faith: 'a' }, theirs: {} },
  { mine: { lq_faith: 'a' }, theirs: { lq_faith: 'a' } },
  { mine: { lq_faith: 'a' }, theirs: { lq_faith: 'e' } },
  { mine: null, theirs: null },
];
const domains = ['life', 'responsibility', 'money', 'family', 'future'];
for (const b of bags) {
  const arg = { ...b, youName: 'A', themName: 'B' };
  expect(`overallExpectationsPct(${JSON.stringify(b.mine)})`, safe(() => overallExpectationsPct(arg)));
  for (const d of domains) expect(`domainAlignmentPct('${d}', ${JSON.stringify(b.mine)})`, safe(() => domainAlignmentPct(d, arg)));
}
function safe(fn) { try { return fn(); } catch (e) { return `threw: ${e.message}`; } }

console.log(`[sweep-percentage-range] 6 producers, ${checks} inputs, chosen either side of ${edges.length} band edges plus the illegal ones.`);
console.log(`  ${noFigure} of those inputs answered null, which is the designed "no figure here" and not a fault.`);
if (!fails.length) {
  console.log('  nothing: every percentage this product can produce is a whole number in 0..100.');
} else {
  for (const f of fails) console.log('  ' + f);
  console.log(`\n  ${fails.length} out of range.`);
}
