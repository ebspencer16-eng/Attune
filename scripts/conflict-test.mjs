// Exercise 5 scoring tests. Pure logic, so it belongs in the gate suite rather
// than being checked by hand in a browser.
//
//   node scripts/conflict-test.mjs

import { summarizeConflict, conflictPair, isConflictComplete, riskBand } from '../api/_lib/conflict-results.js';
import { CONFLICT_QUESTIONS, CONFLICT_SECTIONS, CONFLICT_REQUIRED, conflictQuestionsInOrder } from '../api/_conflict-questions.js';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.error(`  FAIL  ${name}${detail ? '  ::  ' + detail : ''}`); }
};

const base = (over = {}) => ({
  c0: 3, c1: 'A', c2: 'B',
  c_crit: 0, c_cont: 0, c_def: 0, c_stone: 0,
  c8: 'Using humor', c9: '',
  c_repair: ['A genuine apology', 'Suggesting a pause', 'Humor to break the tension',
             'Physical affection (a hug, holding hands)', 'Naming that they see it from my side',
             'Directly asking what I need'],
  c_topic: 'A', c_grat: '', ...over,
});

// ── Shape ───────────────────────────────────────────────────────────────────
ok('12 questions across 6 sections', CONFLICT_QUESTIONS.length === 12 && CONFLICT_SECTIONS.length === 6);
ok('display order covers every question', conflictQuestionsInOrder().length === 12);
ok('no duplicate ids', new Set(CONFLICT_QUESTIONS.map(q => q.id)).size === 12);
ok('open text is optional, everything else required', CONFLICT_REQUIRED.length === 10);

// ── Completion ──────────────────────────────────────────────────────────────
ok('complete with both open texts blank', isConflictComplete(base()));
ok('incomplete when a required answer is missing', !isConflictComplete(base({ c_def: undefined })));
ok('incomplete when the ranking is empty', !isConflictComplete(base({ c_repair: [] })));
ok('a zero answer counts as answered', isConflictComplete(base({ c_crit: 0 })));

// ── Bands ───────────────────────────────────────────────────────────────────
ok('never is not a flag', riskBand(0) === 'not_present');
ok('rarely is not a flag', riskBand(1) === 'occasional');
ok('sometimes is worth watching', riskBand(2) === 'worth_watching');
ok('often is worth attention', riskBand(3) === 'worth_attention');
ok('all-never flags nothing', summarizeConflict(base()).flaggedCount === 0);
ok('a single rarely flags nothing',
  summarizeConflict(base({ c_crit: 1, c_cont: 1, c_def: 1, c_stone: 1 })).flaggedCount === 0);

// ── Ordering ────────────────────────────────────────────────────────────────
const mixed = summarizeConflict(base({ c_crit: 1, c_cont: 3, c_def: 2, c_stone: 0 }));
ok('worst pattern leads', mixed.ranked[0].key === 'contempt', mixed.ranked[0].key);
ok('flags only what crosses the line', mixed.flagged.join(',') === 'contempt,defensiveness', mixed.flagged.join(','));

// ── What it must never produce ──────────────────────────────────────────────
const s = summarizeConflict(base({ c_cont: 3 }));
ok('no type or letter assigned', !('type' in s) && !('typeCode' in s));
ok('no single composite score', !('score' in s) && !('total' in s) && !('index' in s));
ok('strengths preserved alongside risks', s.strength === 'Using humor');

// ── Couple view ─────────────────────────────────────────────────────────────
const pair = conflictPair(base({ c_def: 3 }), base({ c_def: 3, c_crit: 2 }));
ok('a shared pattern is identified as shared', pair.sharedFlags.includes('defensiveness'));
ok('one-sided patterns are attributed', pair.onlyB.includes('criticism'));
ok('no averaged couple score', !('score' in pair) && !('average' in pair) && !('coupleScore' in pair));
ok('needs both partners', conflictPair(base(), { c0: 1 }) === null);
ok('overall gap is reported', conflictPair(base({ c0: 4 }), base({ c0: 1 })).overallGap === 3);

// ── Voice ───────────────────────────────────────────────────────────────────
const copy = JSON.stringify(CONFLICT_QUESTIONS);
ok('no em dashes in customer copy', !copy.includes('\u2014'));
// The four pattern names are cleared for customer use. The BRANDING around
// them is not, pending counsel: the concepts are research findings and not
// protectable, but "Gottman Method" is a licensing business and implying
// affiliation is where the risk sits. This fails the build rather than relying
// on anyone remembering.
ok('no branded terminology in customer copy', !/gottman|four horse(man|men)/i.test(copy));
ok('the four pattern labels are present',
  ['Criticism', 'Contempt', 'Defensiveness', 'Stonewalling']
    .every(l => CONFLICT_QUESTIONS.some(q => q.riskLabel === l)));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
