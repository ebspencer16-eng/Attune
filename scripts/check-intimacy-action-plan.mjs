#!/usr/bin/env node
/**
 * The intimacy action plan is the two furthest apart, and anything level with
 * the second.
 *
 * ── WHY IT IS CHECKED AT ALL ──────────────────────────────────────────────
 * This list has been wrong three times. It was four on the website and three
 * in the app, filtered differently, so the same couple saw four items on a
 * laptop and six on a phone. Then it was three on both. Ellie: "should list
 * the top 2 things the pair disagrees on, but if #2 is tied with others, each
 * that it is tied with must also be listed."
 *
 * A fixed count is what makes a tie arbitrary: two aspects the same distance
 * apart, one listed and one not, decided by whichever the sort happened to put
 * first. So the rule is a threshold, and a threshold is worth running against
 * the cases that are easy to get wrong.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Which aspects a real couple sees, which depends on their answers. This is
 * the rule, not the data.
 */

import { intimacyActionPlan } from '../api/_lib/intimacy-results.js';

const row = (id, gap, state = 'discuss') => ({ id, avgGap: gap, state });
const ids = (rows) => intimacyActionPlan(rows).map((r) => r.id).join(',');

const CASES = [
  ['no ties: the top two', [row('a', 9), row('b', 5), row('c', 2)], 'a,b'],
  ['a tie at second: both come', [row('a', 9), row('b', 5), row('c', 5), row('d', 1)], 'a,b,c'],
  ['a three-way tie at the top', [row('a', 5), row('b', 5), row('c', 5), row('d', 1)], 'a,b,c'],
  ['a tie below second changes nothing', [row('a', 9), row('b', 7), row('c', 3), row('d', 3)], 'a,b'],
  ['only one worth naming', [row('a', 5), row('z', 9, 'aligned')], 'a'],
  ['nothing misaligned', [row('z', 9, 'aligned'), row('y', 8, 'aligned')], ''],
  ['an aspect nobody answered is not in it', [row('a', 9), row('u', 9, 'unspoken'), row('b', 4)], 'a,b'],
  ['an aspect with no distance is not in it', [row('a', 9), { id: 'n', state: 'discuss' }, row('b', 4)], 'a,b'],
];

const fails = [];
for (const [name, rows, want] of CASES) {
  const got = ids(rows);
  if (got !== want) fails.push(`${name}: got ${got || '(nothing)'}, expected ${want || '(nothing)'}`);
}

// The payload's own field name, so the function keeps working on both shapes.
const viaPct = intimacyActionPlan([
  { id: 'a', state: 'discuss', distancePct: 80 },
  { id: 'b', state: 'discuss', distancePct: 40 },
  { id: 'c', state: 'discuss', distancePct: 40 },
]).map((r) => r.id).join(',');
if (viaPct !== 'a,b,c') fails.push(`reading distancePct: got ${viaPct}, expected a,b,c`);

if (fails.length) {
  console.error('[check-intimacy-action-plan] the action plan is not the top two plus ties:');
  for (const f of fails) console.error(`  ${f}`);
  process.exit(1);
}

console.log(`[check-intimacy-action-plan] ${CASES.length + 1} cases, including three kinds of tie.`);
