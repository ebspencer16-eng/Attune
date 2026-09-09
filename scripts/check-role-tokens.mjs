// Fails the build when couple-type prose could reach a reader with a raw
// template token still in it.
//
// ── WHAT WENT WRONG ────────────────────────────────────────────────────────
// Couple-type copy is written with role tokens: {EXP} and {GRD} for the two
// ends of the open axis, {RCH} and {WDR} for the engage axis, plus _sub, _obj,
// _pos and _isC pronoun forms. The website resolves them. /api/results did not
// forward the fields that carry them, so nothing else had to.
//
// Forwarding strengths, stickingPoints and tips to the app put this on a
// results page:
//
//   "{EXP} can feel like {EXP_isC} always the one initiating depth"
//
// The copy was right. The endpoint had simply never had to resolve anything,
// and adding a field to it quietly made that its job.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// Every string in api/_couple-types.js that /api/results forwards is run
// through the real resolver, for a couple on opposite sides of both axes and
// for a couple on the same side of both, and neither may come back with a
// brace in it. The second case is the one that matters: tokens only resolve
// when the partners actually differ, so a couple who are alike is exactly when
// a raw token escapes.
//
// It also checks the resolver against a token it has never heard of, because
// the guarantee is "no braces reach a reader", not "no braces this file knows
// about reach a reader".

import { COUPLE_TYPES } from '../api/_couple-types.js';
import { resolveRoleTokens } from '../api/_lib/role-tokens.js';

/** The fields /api/results forwards. Keep in step with withContent. */
const FORWARDED = ['description', 'nuance'];
const FORWARDED_LISTS = ['strengths', 'stickingPoints'];

const DIFFERENT = [
  { name: 'Ada', axes: { open: 4.4, withdraw: 2.1 }, pronouns: 'she/her' },
  { name: 'Bo', axes: { open: 2.0, withdraw: 4.2 }, pronouns: 'he/him' },
];
const ALIKE = [
  { name: 'Ada', axes: { open: 4.4, withdraw: 2.1 }, pronouns: 'she/her' },
  { name: 'Bo', axes: { open: 4.2, withdraw: 2.2 }, pronouns: 'they/them' },
];

const problems = [];
let checked = 0;

function assertClean(where, text, pair) {
  if (typeof text !== 'string' || !text) return;
  checked++;
  const out = resolveRoleTokens(text, pair[0], pair[1]);
  // {U} and {P} are supposed to survive: each partner is {U} in their own
  // view, so only whoever renders can resolve them. Everything else is a leak.
  const left = out.match(/\{[A-Za-z0-9_]+\}/g)?.filter((t) => t !== '{U}' && t !== '{P}');
  if (left?.length) problems.push(`${where}: ${left.join(', ')} survived\n      ${out.slice(0, 110)}`);
}

for (const pair of [DIFFERENT, ALIKE]) {
  const label = pair === DIFFERENT ? 'opposite sides' : 'same side';
  for (const t of COUPLE_TYPES) {
    for (const f of FORWARDED) assertClean(`${t.id}.${f} (${label})`, t[f], pair);
    for (const f of FORWARDED_LISTS) {
      for (const [i, s] of (t[f] || []).entries()) assertClean(`${t.id}.${f}[${i}] (${label})`, s, pair);
    }
    for (const [i, tip] of (t.tips || []).entries()) {
      assertClean(`${t.id}.tips[${i}].title (${label})`, tip.title, pair);
      assertClean(`${t.id}.tips[${i}].body (${label})`, tip.body, pair);
    }
  }
}

// A token nobody has heard of must not survive either.
const unknown = resolveRoleTokens('A {NOPE} and a {WEIRD_sub}.', DIFFERENT[0], DIFFERENT[1]);
if (/\{(?!U\}|P\})[A-Za-z0-9_]+\}/.test(unknown)) {
  problems.push(`an unrecognised token survived: ${unknown}`);
}

// {U} and {P} must NOT be stripped: they are resolved by whoever renders,
// because each partner is {U} in their own view.
const keep = resolveRoleTokens('{U} and {P} stay.', DIFFERENT[0], DIFFERENT[1]);
if (!keep.includes('{U}') || !keep.includes('{P}')) {
  problems.push(`{U}/{P} must survive for the renderer, got: ${keep}`);
}

if (problems.length) {
  console.error('[check-role-tokens] template tokens could reach a reader:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('Role tokens only resolve when the two partners are on opposite sides of');
  console.error('that axis. A couple who are alike is when a raw token escapes. Either add');
  console.error('the token to GENERIC in api/_lib/role-tokens.js, or rewrite the copy.');
  process.exit(1);
}

console.log(`[check-role-tokens] ${checked} strings resolve clean for both alike and opposite couples.`);
