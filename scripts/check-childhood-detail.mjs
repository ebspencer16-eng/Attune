#!/usr/bin/env node
/**
 * What somebody grew up with reads as words, including for the answers that
 * were stored broken.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * From 22 to 28 October the website's Expectations exercise built the
 * follow-up to a childhood "Both" by gluing column objects into a sentence, so
 * both buttons read "Usually [object Object], sometimes [object Object]" and
 * that is what was stored. check-exercise-flow now fails on a stored string
 * like that, which holds the website. This holds the answers already stored:
 * the two buttons were identical, so which one somebody meant is gone, and
 * results show the plain answer they gave for certain.
 *
 * Found by probe-exercise-chain in the A169 sweep, alongside the second thing
 * held here: two life questions sent their prompt with {userName} and
 * {partnerName} still in it.
 *
 * ── WHAT IT RUNS ──────────────────────────────────────────────────────────
 * expectationsRows over two people whose answers carry, on one item, the
 * broken stored detail, and on another, a real one. The broken one must read
 * as the plain word; the real one must survive untouched. And every row's
 * prompt and item must carry no {token}.
 */
import { expectationsRows } from '../api/_lib/expectations.js';
import { RESPONSIBILITY_CATEGORIES, LIFE_QUESTIONS } from '../api/_questions.js';

const fails = [];
const cat = RESPONSIBILITY_CATEGORIES.find((c) => c.id !== 'extended_family' && c.items.length >= 2) || RESPONSIBILITY_CATEGORIES[0];
const [k1, k2] = cat.items.slice(0, 2).map((it) => `${cat.id}__${it}`);
const BROKEN = 'Usually [object Object], sometimes [object Object]';
const REAL = 'Usually Mum, sometimes Dad';

const person = () => {
  const responsibilities = {};
  const childhood = {};
  for (const c of RESPONSIBILITY_CATEGORIES) for (const it of c.items) {
    responsibilities[`${c.id}__${it}`] = 'Both of us';
    childhood[`${c.id}__${it}`] = 'both';
  }
  const life = {};
  for (const q of LIFE_QUESTIONS) life[q.id] = (q.options || [])[0];
  return {
    responsibilities, childhood, life,
    bothDetail: {},
    childhoodBothDetail: { [k1]: BROKEN, [k2]: REAL },
    childhoodAdults: { a: 'Mum', b: 'Dad', solo: false },
  };
};

const rows = expectationsRows({ mine: person(), theirs: person(), youName: 'Ellie', themName: 'Preston' });
const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
const r1 = byKey[k1];
const r2 = byKey[k2];
if (!r1 || !r2) {
  fails.push(`could not find rows for ${k1} and ${k2}. A gate that has lost its subject must not pass.`);
} else {
  if (String(r1.youExperienced).includes('[object Object]')) fails.push(`the broken stored detail reached the page: "${r1.youExperienced}"`);
  if (!r1.youExperienced) fails.push('the broken stored detail left the column empty instead of the plain answer');
  if (r2.youExperienced !== REAL) fails.push(`a real detail did not survive: "${r2.youExperienced}"`);
}
let checked = 0;
for (const r of rows) {
  for (const f of ['prompt', 'item']) {
    if (r[f] == null) continue;
    checked += 1;
    if (/\{[a-zA-Z]+\}/.test(r[f])) fails.push(`${r.key}.${f} carries a token: "${String(r[f]).slice(0, 80)}"`);
  }
}
if (checked < 20) fails.push(`only ${checked} prompts and items read. The rows are not what this gate thinks they are.`);

if (fails.length) {
  console.error('check-childhood-detail FAILED');
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log(`[check-childhood-detail] a stored "[object Object]" childhood answer reads "${r1.youExperienced}", a real one reads as written, `
  + `and ${checked} prompts and items across ${rows.length} rows carry no unfilled name.`);
