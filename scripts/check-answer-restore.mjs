// Fails the build when a signed-in load cannot restore exercise answers the
// server has and the device does not.
//
// ── WHAT HAPPENED, TWICE ───────────────────────────────────────────────────
// Ellie: "My dashboard, again, showed that ex1 was incomplete. I signed out
// then signed back in and it fixed itself, but I don't want customers to run
// into this confusion."
//
// Signing out fixed it because that path rebuilds the account from the profile
// and rewrites every answer cache from the server. The path a returning
// customer actually takes on every load re-synced entitlements and nothing
// else, so exercise state was whatever localStorage happened to hold, with no
// reconciliation, ever.
//
// Lose the local copy by any route, and there are several, and the site tells
// someone they have not done an exercise the server has answers for. Not once:
// indefinitely, because nothing was going to look again.
//
// check-answer-clears.mjs already guards the other direction, that nothing
// clears a cache except on a read that succeeded. Both are needed. One stops
// answers being thrown away; this one stops them staying lost.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// That the returning-session branch restores from every exercise column in the
// registry, that it never removes anything while doing it, and that it does
// not enumerate exercises by hand. A restore that knows about three of five
// exercises is the bug this codebase has had most often.

import { readFileSync } from 'fs';
import { EXERCISES } from '../api/_exercises.js';

const ROOT = new URL('..', import.meta.url).pathname;
const src = readFileSync(ROOT + 'src/App.jsx', 'utf8');

const problems = [];

// The block is marked by its own heading, so this finds the thing rather than
// a line that happens to look like it.
const MARK = 'EXERCISE ANSWERS, FILL-ONLY';
const at = src.indexOf(MARK);
if (at === -1) {
  problems.push(
    'src/App.jsx has no fill-only exercise restore on the returning-session\n'
    + '      path. Without it, a device that loses its answer cache tells the\n'
    + '      customer they never did the exercise, and nothing ever corrects it.');
} else {
  // The body: from the marker to the reload that ends it.
  const endAt = src.indexOf('const ent = await resolveEntitlements', at);
  const body = src.slice(at, endAt === -1 ? at + 3000 : endAt);

  // Derived, not listed. A hand-written list is how this goes stale.
  if (!/for \(const \w+ of EXERCISES\)/.test(body)) {
    problems.push(
      'the restore does not walk EXERCISES. Naming exercises by hand is how a\n'
      + '      restore ends up knowing about three of five.');
  }

  // Fill-only. A removeItem here would make a failed or partial read delete the
  // very answers this exists to protect.
  if (/removeItem/.test(body)) {
    problems.push(
      'the restore calls removeItem. It is fill-only on purpose: clearing\n'
      + '      belongs to the paths that know an answer was genuinely reset, and those\n'
      + '      are guarded by check-answer-clears.mjs.');
  }

  // Both storage shapes. `record` exercises keep { answers, completedAt }, so a
  // presence test written for bare answers reads a finished one as absent and
  // rewrites it on every load.
  if (!/completedAt/.test(body)) {
    problems.push(
      'the restore does not account for the record shape. Intimacy and Conflict\n'
      + '      store { answers, completedAt }, so a check written for bare answers\n'
      + '      misreads them.');
  }
}

// And that every exercise actually has the two fields the restore needs. A
// registry entry missing one would make the loop skip it silently.
for (const ex of EXERCISES) {
  if (!ex.column) problems.push(`exercise ${ex.key} has no profile column, so nothing can be restored for it`);
  if (!ex.localKey) problems.push(`exercise ${ex.key} has no localKey, so the restore has nowhere to put it`);
}

if (problems.length) {
  console.error('[check-answer-restore] answers the server has can stay lost on this device:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(
  `[check-answer-restore] the returning-session path restores all ${EXERCISES.length} exercises `
  + 'from the server, fill-only.');
