// The mirror, tested.
//
// Expectations questions are asked in the first person. Two people who answer
// "Primarily mine" have disagreed: each has claimed the same job. Compare the
// strings and they match, and every result inverts while looking entirely
// reasonable, which is the kind of wrong this product cannot afford.
//
// This is the test the three previous copies of the comparison never had.

import { isResultsSection } from '../api/_lib/results-sections.js';
import { mirrorRespKey, mirrorLifeId, agrees, normRespValue, expectationsSummary } from '../api/_lib/expectations.js';
import { RESPONSIBILITY_CATEGORIES, EXPECTATIONS_CATEGORIES, LIFE_QUESTIONS } from '../api/_questions.js';

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log(`  ok    ${name}`); } else { fail++; console.error(`  FAIL  ${name}`); } };

console.log('\n— The key mirror —');
ok('both tokens swap in one pass',
  mirrorRespKey('extended_family__{userName} visits {partnerName}s family')
    === 'extended_family__{partnerName} visits {userName}s family');
ok('mirroring twice is the original',
  mirrorRespKey(mirrorRespKey('a__{userName} and {partnerName}')) === 'a__{userName} and {partnerName}');
ok('a key with no tokens is untouched', mirrorRespKey('household__Cooking meals') === 'household__Cooking meals');
ok('life ids swap only the directional pair',
  mirrorLifeId('lq_involve_user') === 'lq_involve_partner'
  && mirrorLifeId('lq_children') === 'lq_children');

console.log('\n— Agreement is about people, not strings —');
ok('both say "mine" is a DISAGREEMENT', agrees('Primarily mine', 'Primarily mine') === false);
ok('opposite answers AGREE', agrees('Primarily mine', "Primarily my partner's") === true);
ok('the other direction agrees too', agrees("Primarily my partner's", 'Primarily mine') === true);
ok('balanced with balanced agrees', agrees('Balanced', 'Balanced') === true);
ok('balanced against a claim disagrees', agrees('Balanced', 'Primarily mine') === false);
ok('unanswered is not a comparison', agrees(null, 'Primarily mine') === null);

// ── "DOESN'T APPLY" USED TO BE DROPPED, AND THAT WAS THE BUG ───────────────
// This line asserted that it returns null, meaning the row leaves results
// entirely. The website never behaved that way: it compared what a reader sees
// and counted the row either as a difference or as agreement. So the same
// couple got different percentages, different gap lists and different things
// to talk about depending on which product they opened, and the app was always
// the optimistic one.
//
// The rule changed on purpose. Only "nobody answered" drops a row now.
// check-alignment-rule.mjs holds the two readings together across every
// possible pair.
ok('one partner saying it does not apply is a DIFFERENCE',
  agrees("Doesn't apply", 'Primarily mine') === false);
ok('both saying it does not apply is AGREEMENT',
  agrees("Doesn't apply", "Doesn't apply") === true);
ok('a row is only dropped when nobody answered',
  agrees("Doesn't apply", '') === null);

console.log('\n— A naive string comparison would get these wrong —');
const naive = (a, b) => a === b;
const inverted = [
  ['Primarily mine', 'Primarily mine'],
  ['Primarily mine', "Primarily my partner's"],
];
ok('and it disagrees with us on both, which is the point',
  inverted.every(([a, b]) => naive(a, b) !== agrees(a, b)));

console.log('\n— Values read as names —');
ok('your "mine" is you', normRespValue('Primarily mine', true, 'Ellie', 'Preston') === 'Ellie');
ok('their "mine" is them', normRespValue('Primarily mine', false, 'Ellie', 'Preston') === 'Preston');
ok('your "my partner\'s" is them', normRespValue("Primarily my partner's", true, 'Ellie', 'Preston') === 'Preston');
ok('their "my partner\'s" is you', normRespValue("Primarily my partner's", false, 'Ellie', 'Preston') === 'Ellie');

console.log('\n— A whole summary —');
// Both claim the first item, and split the second the same way round.
const cat = RESPONSIBILITY_CATEGORIES[0];
const k0 = cat.id + '__' + cat.items[0];
const k1 = cat.id + '__' + cat.items[1];
/**
 * Both partners answer two life questions, so the Life & Values bucket has
 * something in it.
 *
 * It did not before. The assertion below read
 * `rows.length === summary.life.length`, and with no life answers anywhere
 * that is 0 === 0, so a test named "not an empty bucket" passed on an empty
 * bucket for as long as it has existed.
 */
const lq0 = LIFE_QUESTIONS[0];
const lq1 = LIFE_QUESTIONS[1];

const summary = expectationsSummary({
  mine: {
    responsibilities: { [k0]: 'Primarily mine', [k1]: 'Primarily mine' },
    life: { [lq0.id]: lq0.options[0], [lq1.id]: lq1.options[0] },
  },
  theirs: {
    responsibilities: {
      [mirrorRespKey(k0)]: 'Primarily mine',
      [mirrorRespKey(k1)]: "Primarily my partner's",
    },
    life: {
      [mirrorLifeId(lq0.id)]: lq0.options[0],
      [mirrorLifeId(lq1.id)]: lq1.options[lq1.options.length - 1],
    },
  },
  youName: 'Ellie', themName: 'Preston',
});
// Four rows now, not two: the fixture answers two life questions as well as
// two responsibilities, because without life answers the Life & Values bucket
// was empty and the assertion about it passed on nothing.
//
// One agreement and one difference on each side, so the halves are still
// distinguishable in the totals.
ok('four rows compared', summary.answered === 4);
ok('two agreements, two differences', summary.aligned === 2 && summary.differences === 2);
ok('alignment is a percentage', summary.alignedPct === 50);
ok('the responsibility half is one and one',
  summary.categories.slice(0, 5).flatMap((c) => c.rows).filter((r) => r.aligned).length === 1);
ok('the life half is one and one',
  summary.categories.at(-1).rows.filter((r) => r.aligned).length === 1);
// One bucket per NAVIGABLE screen, which is six: the five responsibility
// categories and Life & Values. This asserted RESPONSIBILITY_CATEGORIES.length,
// which is the input to scoring rather than the list a reader navigates, and
// that is exactly the confusion that broke the link: the website's sidebar
// offered exp-convo-5 and the section registry stopped at 4, so tapping Life &
// Values fell through to the storycards, and the app was never offered the
// page at all.
ok('one bucket per conversation screen', summary.categories.length === EXPECTATIONS_CATEGORIES.length);
ok('the last bucket is Life & Values', summary.categories.at(-1)?.label === 'Life & Values');
ok('Life & Values navigates to a section that exists',
  isResultsSection(summary.categories.at(-1)?.section));
// Against LIFE_QUESTIONS rather than a `life` array on the payload. That array
// was removed: it held the same rows as this bucket, and sending both is what
// put two Life & Values dropdowns on the app's Expectations page.
ok('Life & Values carries the life rows, not an empty bucket',
  summary.categories.at(-1)?.rows.length > 0
  && summary.categories.at(-1)?.rows.every((r) => r.kind === 'life'));
ok('the payload no longer carries a second copy of the life rows',
  !('life' in summary));
ok('a responsibility bucket carries no life rows',
  summary.categories[0].rows.every((r) => r.kind === 'responsibility'));
ok('buckets carry the section id the app navigates to',
  summary.categories[0].section === 'exp-convo-0');
ok('the disagreement names two different people',
  summary.categories[0].rows.find((r) => !r.aligned)?.you === 'Ellie'
  && summary.categories[0].rows.find((r) => !r.aligned)?.them === 'Preston');
ok('unanswered items are absent rather than blank',
  summary.categories[0].answered === 2 && cat.items.length > 2);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
