// Exercise 5 scoring tests. Pure logic, so it belongs in the gate suite rather
// than being checked by hand in a browser.
//
//   node scripts/conflict-test.mjs

import { summarizeConflict, conflictPair, isConflictComplete, riskBand } from '../api/_lib/conflict-results.js';
import { CONFLICT_QUESTIONS, CONFLICT_SECTIONS, CONFLICT_REQUIRED, conflictQuestionsInOrder } from '../api/_conflict-questions.js';
import { resetForm } from '../api/_conflict-results-prose.js';
/* What Comes Next reads the same answers, which is the half that broke. */
import { whatComesNext } from '../api/_lib/what-comes-next.js';
import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.error(`  FAIL  ${name}${detail ? '  ::  ' + detail : ''}`); }
};

const base = (over = {}) => ({
  c0: 3, c1: 'A', c2: 'B',
  c_crit: 0, c_cont: 0, c_def: 0, c_stone: 0,
  c8: 'Using humor', c9: 'We talked it out in the car.',
  c_repair: ['A genuine apology', 'Suggesting a pause', 'Humor to break the tension',
             'Physical affection (a hug, holding hands)', 'Naming that they see it from my side',
             'Directly asking what I need'],
  c_topic: 'A', c_grat: 'She always comes back to it.', ...over,
});

// ── Shape ───────────────────────────────────────────────────────────────────
ok('12 questions across 6 sections', CONFLICT_QUESTIONS.length === 12 && CONFLICT_SECTIONS.length === 6);
ok('display order covers every question', conflictQuestionsInOrder().length === 12);
ok('no duplicate ids', new Set(CONFLICT_QUESTIONS.map(q => q.id)).size === 12);
ok('every question is required, open text included', CONFLICT_REQUIRED.length === 12);

// ── Completion ──────────────────────────────────────────────────────────────
ok('complete when everything including the written answers is filled', isConflictComplete(base()));
ok('incomplete with a written answer blank', !isConflictComplete(base({ c9: '' })));
ok('whitespace does not count as an answer', !isConflictComplete(base({ c_grat: '   ' })));
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
/*
 * The strength survives, and it arrives in the voice the results speak in.
 *
 * This asserted `=== 'Using humor'`, the option exactly as the question asks
 * it. Ellie: "adjust tense of the answers to say ellie 'Asks a clarifying
 * question' and Preston 'Uses humor'." The question asks a person about
 * themselves and the results talk about two people, so the stored answer is
 * reported through resetForm. Checked against the table rather than against a
 * literal, so this says "it is reported" rather than "it is that string".
 */
ok('strengths preserved alongside risks', s.strength === resetForm('Using humor'));
ok('and in the results voice, not the question voice', s.strength === 'Uses humor');

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

// ── Results copy ────────────────────────────────────────────────────────────
// Every pattern needs a line for every frequency. A missing band renders an
// empty tip under a bar, which reads as the product having nothing to say
// about the answer someone just gave honestly.
const { PATTERN_COPY, CONFLICT_RESULTS_COPY, interpConflict,
  SNAPSHOT_ROWS, OPENING_CHIPS } =
  await import('../api/_conflict-results-prose.js');
const { RISK_QUESTIONS } = await import('../api/_conflict-questions.js');

ok('every pattern has copy for every frequency',
  RISK_QUESTIONS.every(q => [0, 1, 2, 3].every(v => PATTERN_COPY[q.riskKey]?.[v]?.note)));
ok('copy labels match the question labels',
  RISK_QUESTIONS.every(q => PATTERN_COPY[q.riskKey]?.label === q.riskLabel));
ok('a Never band says something rather than nothing',
  RISK_QUESTIONS.every(q => PATTERN_COPY[q.riskKey][0].note.length > 30));

const allCopy = JSON.stringify({ PATTERN_COPY, CONFLICT_RESULTS_COPY });
ok('no em dashes in results copy', !allCopy.includes('\u2014'));
ok('no branded terminology in results copy', !/gottman|four horse(man|men)/i.test(allCopy));
ok('no hedging in results copy', !/\b(perhaps|might|possibly|it seems|somewhat)\b/i.test(allCopy));
ok('partner token resolves',
  !interpConflict(PATTERN_COPY.contempt[2].note, { partner: 'Preston' }).includes('{partner}'));
ok('no unresolved tokens left in any line', !/\{(partner|a|b)\}/.test(
  RISK_QUESTIONS.flatMap(q => [0,1,2,3].map(v => interpConflict(PATTERN_COPY[q.riskKey][v].note, { partner: 'P' }))).join(' ')));

// ── The three snapshot answers, end to end ─────────────────────────────────
//
// The exercise stores a letter for a forced-A/B question: setAns(q.id, 'A').
// summarizeConflict carries it through onto `openings`, and both surfaces look
// the text up in OPENING_CHIPS by that letter.
//
// The app did not. It compared the value to 0 and printed chips.B whenever it
// was not, so every A answer showed the B text: all three rows on Your
// Conflict Snapshot told each partner the opposite of what they said, on the
// one page whose job is showing what they said. It survived because the app's
// type declared `number`, so tsc enforced the mistake.
//
// This pins the chain: what the exercise writes, what the summary carries, and
// what a surface prints. All three, because the bug was in the join.
{
  const answered = (letter) => ({
    c0: 3, c1: letter, c2: letter, c_topic: letter,
    c_crit: 1, c_cont: 0, c_def: 2, c_stone: 1,
    c8: 'Taking a break', c_repair: ['A genuine apology'],
    c9: 'It went fine.', c_grat: 'You never walk out.',
  });

  for (const letter of ['A', 'B']) {
    const summary = summarizeConflict(answered(letter));
    ok(`a complete ${letter} answer set summarises`, !!summary);
    if (!summary) continue;

    for (const row of SNAPSHOT_ROWS) {
      const stored = summary.openings[row.field];
      ok(`${row.id} keeps the stored letter on openings.${row.field}`, stored === letter);
      // What both surfaces print. A lookup by the stored value, never by an
      // index derived from it.
      const text = OPENING_CHIPS[row.id]?.[stored];
      ok(`${row.id} resolves to the ${letter} text, not the other one`,
        text === OPENING_CHIPS[row.id][letter]
        && text !== OPENING_CHIPS[row.id][letter === 'A' ? 'B' : 'A']);
    }
  }

  // And that the two chips for a row are actually different, or the assertion
  // above would pass on a row where both options say the same thing.
  for (const row of SNAPSHOT_ROWS) {
    ok(`${row.id} has two distinct options`,
      OPENING_CHIPS[row.id].A !== OPENING_CHIPS[row.id].B);
  }
}

// ── What Comes Next counts the same patterns the overview does ──────────────
//
// Ellie: "I have 4 items in my conflict action plan on that overview page, but
// one thing listed in the what comes next section for conflict." Four and one.
//
// api/conflict-results.js draws the overview from `me.conflict_data?.answers`.
// api/results.js passed the WHOLE record into whatComesNext, and
// summarizeConflict answers null for a record, so the group fell back to its
// "no patterns worth watching" row: one item. Nothing threw. A record is an
// object, and an object with no question ids on it is what an unfinished
// exercise looks like.
//
// api/results.js carried a comment saying "check-conflict-plans-agree holds
// the two together now", and there has never been such a file. The rule is
// true today, by both call sites going through one summariser, and nothing was
// watching it. It is watched here rather than in a new gate because the
// complete record this needs is `base()` above: a second fixture mirroring an
// existing one is a second version of a rule, not a second half of it.
{
  const answers = base({ c_crit: 4, c_cont: 4, c_def: 4, c_stone: 4 });
  const call = (conflictAnswers) => whatComesNext({
    coupleTypeId: 'WZ', conflictReady: true, conflictAnswers,
    names: { you: 'Ellie', them: 'Preston' },
    sides: {
      you: { name: 'Ellie', axes: { open: 4, withdraw: 2 } },
      them: { name: 'Preston', axes: { open: 2, withdraw: 4 } },
    },
  });
  const conflictGroup = (built) => (built.groups || []).find((g) => /Conflict/.test(g.label));
  const itemsFor = (ca) => (conflictGroup(call(ca))?.items || []).length;

  const overview = summarizeConflict(answers).ranked.length;
  ok('What Comes Next lists one item per pattern the overview ranks',
    itemsFor(answers) === overview, `what comes next ${itemsFor(answers)} against overview ${overview}`);

  /* And the test can tell the two shapes apart, or the assertion above would
     pass on a surface that had regressed. This is the exact miscount she
     reported: four against one. */
  ok('passing the whole record instead of its answers is still visibly fewer',
    itemsFor({ answers, completedAt: new Date().toISOString() }) < overview);

  /* The call site, because that is what regressed. A gate that only runs the
     module cannot see an endpoint handing it the wrong half. */
  const resultsSrc = readFileSync(new URL('../api/results.js', import.meta.url), 'utf8');
  ok('api/results.js passes the answers half of the conflict record',
    /conflictAnswers:\s*me\?\.conflict_data\?\.answers/.test(resultsSrc));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
