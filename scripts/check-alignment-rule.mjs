// Fails the build when the two products could tell one couple different things
// about the same two answers.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// Whether two expectations answers agree was decided twice. The website
// compared the two answers as a reader sees them, `mine === theirs` over the
// display names. The server compared them as sides, and returned null, meaning
// "drop this row", whenever either partner said "Doesn't apply".
//
// Thirty-three of the eighty-one possible answer pairs came out differently.
// Every one of them involved that value, and the app was always the optimistic
// one: a disagreement the website listed as something to talk about vanished
// from the app's count, its percentage and its list, pushing categories to 100
// per cent aligned that the website showed as gaps.
//
// Ellie found it by noticing her own results did not match between the two.
// Nothing in the build would have.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// Every pair of answers either partner can give, including unanswered and a
// value neither side recognises, through both readings:
//
//   the shared rule, agrees(), which both surfaces now call;
//   the display comparison the website used to do.
//
// They have to give the same verdict for every pair. If a future change to
// normRespValue or to agrees pulls them apart again, this says so with the
// exact pair.
//
// ── WHY BOTH ARE STILL COMPUTED HERE ───────────────────────────────────────
// The display comparison no longer runs in the product; src/App.jsx calls
// agrees() like everything else. It is kept here as an independent second
// opinion, which is the only kind of check worth having on a rule this small
// and this load-bearing: one implementation cannot disagree with itself.

import { agrees, normRespValue } from '../api/_lib/expectations.js';

/** Everything either partner can have stored, plus the two empty cases. */
const VALUES = [
  'Primarily mine',
  "Primarily my partner's",
  'Balanced',
  'Both of us',
  "Doesn't apply",
  "Doesn't apply to us",
  'Something the form has never offered',
  null,
  '',
];

const YOU = 'Ellie';
const THEM = 'Preston';

const problems = [];
let checked = 0;

for (const mine of VALUES) {
  for (const theirs of VALUES) {
    checked += 1;
    // The website's old reading: unanswered is no comparison, otherwise the
    // two answers agree when they name the same person.
    const answered = !!mine && !!theirs;
    const byDisplay = answered
      ? normRespValue(mine, true, YOU, THEM) === normRespValue(theirs, false, YOU, THEM)
      : null;
    const byRule = agrees(mine, theirs);
    if (byRule !== byDisplay) {
      problems.push(
        `${JSON.stringify(mine)} vs ${JSON.stringify(theirs)}: `
        + `agrees() says ${byRule}, the display comparison says ${byDisplay}`);
    }
  }
}

// A row dropped is a row that appears in neither the count nor the list, so
// null has to mean exactly one thing: nobody answered.
for (const v of VALUES.filter(Boolean)) {
  if (agrees(v, v) === null) {
    problems.push(`agrees(${JSON.stringify(v)}, same) returns null, so that row is dropped from results.`);
  }
}

if (problems.length) {
  console.error('[check-alignment-rule] the two products would disagree about a couple:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('One couple must get one answer. agrees() in api/_lib/expectations.js is');
  console.error('the rule; every surface calls it. If the rule should change, change it');
  console.error('there and update this check deliberately.');
  process.exit(1);
}

console.log(`[check-alignment-rule] ${checked} answer pairs, both readings agree on every one.`);
