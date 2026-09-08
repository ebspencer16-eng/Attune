// The mirror, tested.
//
// Expectations questions are asked in the first person. Two people who answer
// "Primarily mine" have disagreed: each has claimed the same job. Compare the
// strings and they match, and every result inverts while looking entirely
// reasonable, which is the kind of wrong this product cannot afford.
//
// This is the test the three previous copies of the comparison never had.

import { mirrorRespKey, mirrorLifeId, agrees, normRespValue, expectationsSummary } from '../api/_lib/expectations.js';
import { RESPONSIBILITY_CATEGORIES } from '../api/_questions.js';

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
ok('"doesn\'t apply" is not a comparison', agrees("Doesn't apply", 'Primarily mine') === null);

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
const summary = expectationsSummary({
  mine: { responsibilities: { [k0]: 'Primarily mine', [k1]: 'Primarily mine' } },
  theirs: { responsibilities: {
    [mirrorRespKey(k0)]: 'Primarily mine',
    [mirrorRespKey(k1)]: "Primarily my partner's",
  } },
  youName: 'Ellie', themName: 'Preston',
});
ok('two rows compared', summary.answered === 2);
ok('one agreement, one difference', summary.aligned === 1 && summary.differences === 1);
ok('alignment is a percentage', summary.alignedPct === 50);
ok('one bucket per conversation screen', summary.categories.length === RESPONSIBILITY_CATEGORIES.length);
ok('buckets carry the section id the app navigates to',
  summary.categories[0].section === 'exp-convo-0');
ok('the disagreement names two different people',
  summary.categories[0].rows.find((r) => !r.aligned)?.you === 'Ellie'
  && summary.categories[0].rows.find((r) => !r.aligned)?.them === 'Preston');
ok('unanswered items are absent rather than blank',
  summary.categories[0].answered === 2 && cat.items.length > 2);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
