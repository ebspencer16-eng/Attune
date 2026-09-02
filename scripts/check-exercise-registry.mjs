// Fails the build when code hardcodes a list of exercises instead of deriving
// it from api/_exercises.js.
//
// This is the failure that has cost the most time on this project. The same
// list lived by hand in a dozen places, and every time an exercise was added,
// some were updated and some were not. The ones that were missed never errored:
//
//   a granted add-on that never reached the UI
//   partner status that was all-or-nothing across exercises
//   an owned exercise with no dashboard entry at all
//   a partner's newest exercise permanently reading Pending
//   completion status that changed between page loads
//
// Every one of those was a stale list, and every one was found by a person
// noticing something looked wrong rather than by anything failing.
//
// The rule: any place that enumerates three or more exercise identifiers must
// derive them. A block naming some but not all is the exact shape of the bug.

import { readFileSync } from 'fs';
import { EXERCISES, EXERCISE_COLUMNS, EXERCISE_LOCAL_KEYS, PARTNER_SESSION_FIELDS } from '../api/_exercises.js';

const FILES = ['src/App.jsx', 'api/partner-sync.js', 'api/save-exercise.js', 'api/admin-data.js'];

// Each group is a set of identifiers that should always appear together.
const GROUPS = [
  { name: 'profile columns', items: EXERCISE_COLUMNS },
  { name: 'localStorage keys', items: EXERCISES.map(e => e.localKey) },
  { name: 'partner session fields', items: PARTNER_SESSION_FIELDS.map(f => `${f}:`) },
];

const problems = [];

// Per-file coverage, not per-block. A sliding window flags correct code that
// happens to straddle a boundary, and a gate that cries wolf gets ignored,
// which is worse than no gate.
//
// The rule is coarser and honest: if a file handles exercises at all, meaning
// it references three or more members of a group, it must reference every
// member. That is precisely the shape of every bug this has caused: a file
// that knew about ex1, ex2 and ex3 and had never heard of conflict.
//
// It cannot catch a file that mentions an exercise somewhere but omits it from
// one particular block. Deriving from EXERCISES is what prevents that, and
// this gate is the backstop for the places not yet converted.
for (const file of FILES) {
  let text;
  try { text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'); }
  catch { continue; }
  if (text.includes('_exercises.js')) continue;   // already derived

  for (const group of GROUPS) {
    const present = group.items.filter(k => text.includes(k));
    if (present.length < 3) continue;             // not an exercise-handling file
    const missing = group.items.filter(k => !present.includes(k));
    if (missing.length) problems.push({ file, group: group.name, missing });
  }
}

if (problems.length) {
  console.error('[check-exercise-registry] files that handle exercises but do not know about all of them:');
  for (const p of problems) {
    console.error(`  ${p.file}  ${p.group}, never references: ${p.missing.join(', ')}`);
  }
  console.error('');
  console.error('Derive the list from api/_exercises.js instead of restating it.');
  console.error('A list naming some exercises but not all is how a granted add-on');
  console.error('silently fails to appear, and how completion status goes stale.');
  process.exit(1);
}

console.log(`[check-exercise-registry] ${EXERCISES.length} exercises; ${FILES.length} files check out.`);
