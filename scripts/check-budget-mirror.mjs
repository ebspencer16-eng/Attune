// Fails the build when the app's budget arithmetic stops matching the server's.
//
// ── WHY THERE ARE TWO ──────────────────────────────────────────────────────
// CLAUDE.md says the app never scores anything, and the reason is that two
// scorers drifting apart is how this product starts lying to couples about
// their relationship.
//
// The budget is not that. computeReveal is a calculator over numbers the
// reader typed in themselves, and it makes no claim about them. It also
// cannot sit behind an endpoint the way results do: the reveal updates as you
// type, and a round trip per keystroke is not a budget tool.
//
// So it follows the pattern already used for the one other thing in that
// position, the website's copy of the scoring engine: one implementation in
// api/_budget.js, a mirror in the app, and this, which runs both over the same
// states and fails if a single number differs.
//
// ── HOW IT COMPARES ────────────────────────────────────────────────────────
// The app's copy is TypeScript, so it is compiled with esbuild and evaluated.
// esbuild rather than a pile of regexes: the first attempt stripped types by
// hand, produced something that would not parse, and told me the mirror was
// broken when what was broken was the stripper. esbuild is already here for
// the website's build, so this adds nothing.
//
// The states below are chosen to reach every branch: all four pooling models,
// zero income (every ratio divides by it), goals with and without a duration,
// and more than three categories with spend so topCats actually truncates.

import { readFileSync } from 'fs';
import { transformSync } from 'esbuild';

import { computeReveal as serverReveal, BUDGET_CATEGORIES } from '../api/_budget.js';
import * as serverModule from '../api/_budget.js';

const ROOT = new URL('..', import.meta.url).pathname;
const src = readFileSync(ROOT + 'attune-app/src/constants/budget.ts', 'utf8');

const compiled = transformSync(src, { loader: 'ts', format: 'cjs' }).code;

let appReveal;
/* The whole evaluated module, so this can compare anything the two copies are
   both meant to hold rather than only the function. */
let appModule;
try {
  const module = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', compiled)(module, module.exports);
  appModule = module.exports;
  appReveal = module.exports.computeReveal;
  if (typeof appReveal !== 'function') throw new Error('computeReveal is not exported');
} catch (e) {
  console.error('[check-budget-mirror] could not evaluate the app copy:', e.message);
  process.exit(1);
}

const U = 'Ellie';
const P = 'Preston';
const cats = BUDGET_CATEGORIES;
const expenseKey = (ci, ii) => `${cats[ci].id}__${cats[ci].items[ii]}`;

const STATES = [
  { name: 'empty', s: {} },
  {
    name: 'proportional, mixed income',
    s: {
      incomes: { [U]: '5200', [P]: '3100' }, pooling: 'proportional',
      expenses: { [expenseKey(0, 0)]: '2,100', [expenseKey(1, 0)]: '$410', [expenseKey(2, 0)]: '650', [expenseKey(5, 1)]: '500' },
      personal: { [U]: '250', [P]: '180' },
      goals: [{ target: '9000', months: '18' }, { target: '1200', months: '' }],
    },
  },
  { name: 'fifty fifty', s: { incomes: { [U]: '4000', [P]: '4000' }, pooling: 'fifty_fifty', expenses: { [expenseKey(0, 0)]: '1800' }, personal: { [U]: '100', [P]: '100' } } },
  { name: 'combined', s: { incomes: { [U]: '6000', [P]: '0' }, pooling: 'combined', expenses: { [expenseKey(3, 0)]: '700' } } },
  { name: 'separate', s: { incomes: { [U]: '2000', [P]: '2500' }, pooling: 'separate', expenses: { [expenseKey(6, 0)]: '90' } } },
  { name: 'no income at all', s: { incomes: { [U]: '', [P]: '' }, pooling: 'proportional', expenses: { [expenseKey(0, 0)]: '1000' }, goals: [{ target: '500', months: '5' }] } },
];

const problems = [];
const round = (v) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v);

for (const { name, s } of STATES) {
  const a = serverReveal(s, U, P);
  const b = appReveal(s, cats, U, P);
  for (const key of Object.keys(a)) {
    const x = JSON.stringify(a[key], (_, v) => round(v));
    const y = JSON.stringify(b[key], (_, v) => round(v));
    if (x !== y) problems.push(`"${name}": ${key} is ${x} on the server and ${y} in the app.`);
  }
  for (const key of Object.keys(b)) {
    if (!(key in a)) problems.push(`"${name}": the app returns ${key} and the server does not.`);
  }
}

/**
 * ── AND THE THREE STATS ARE THE SAME THREE COLOURS ────────────────────────
 * This compared every number the two copies produce and nothing about how they
 * are drawn. The budget's three headline stats were four hex values typed into
 * the website's component and the same four typed into the app's, and the note
 * beside the website's copy records what happened the last time these three
 * numbers were kept in two places: the LABELS drifted, and "the two tools came
 * to disagree about which numbers a budget has". The labels were moved into
 * BUDGET_COPY and the colours were left where they were.
 *
 * They are in both modules now, beside the copy and the arithmetic, so this
 * compares them the way it compares a number. `left` and `over` are one figure
 * in two states and the colour is the only thing that says which, so the pair
 * has to agree as a pair.
 */
{
  const theirs = appModule.BUDGET_STAT_COLORS;
  const ours = serverModule.BUDGET_STAT_COLORS;
  if (!ours || !theirs) {
    problems.push('one of the two budget modules no longer exports BUDGET_STAT_COLORS, so the'
      + ' three stat colours are being written somewhere else and nothing compares them.');
  } else {
    for (const key of [...new Set([...Object.keys(ours), ...Object.keys(theirs)])]) {
      const a = String(ours[key] || '').toUpperCase();
      const b = String(theirs[key] || '').toUpperCase();
      if (a !== b) {
        problems.push(`the ${key} stat is ${ours[key] || 'missing'} on the website and`
          + ` ${theirs[key] || 'missing'} in the app.`);
      }
    }
  }
}

if (problems.length) {
  console.error('[check-budget-mirror] the two budget calculators disagree:');
  for (const p of problems.slice(0, 12)) console.error(`  ${p}`);
  console.error('');
  console.error('api/_budget.js is the original. attune-app/src/constants/budget.ts mirrors it.');
  process.exit(1);
}

console.log(`[check-budget-mirror] ${STATES.length} budgets, every figure identical on both surfaces, and the three stat colours the same three.`);
