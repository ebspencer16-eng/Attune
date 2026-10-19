// The mirror, tested.
//
// Expectations questions are asked in the first person. Two people who answer
// "Primarily mine" have disagreed: each has claimed the same job. Compare the
// strings and they match, and every result inverts while looking entirely
// reasonable, which is the kind of wrong this product cannot afford.
//
// This is the test the three previous copies of the comparison never had.

import { isResultsSection } from '../api/_lib/results-sections.js';
import { mirrorRespKey, mirrorLifeId, respDistance, normRespValue, expectationsSummary } from '../api/_lib/expectations.js';
import { isAligned, closenessPct } from '../api/_lib/alignment.js';
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

// ── `agrees` IS GONE, AND THIS IS THE SAME SET OF CLAIMS ──────────────────
// It answered as a boolean over three positions. Ellie: "I don't think it
// should be all-or-nothing aligned, I want to include degrees." A boolean
// cannot carry a degree, so the rule is a distance and agreement is the top of
// it. Every assertion below is the one that was here, asked of the new rule.
const agree = (a, b, da = null, db = null) => {
  const d = respDistance({
    yourValue: a, theirValue: b, yourDetail: da, theirDetail: db,
    youName: 'Ellie', themName: 'Preston',
  });
  return d === null ? null : isAligned(d);
};

console.log('\n— Agreement is about people, not strings —');
ok('both say "mine" is a DISAGREEMENT', agree('Primarily mine', 'Primarily mine') === false);
ok('opposite answers AGREE', agree('Primarily mine', "Primarily my partner's") === true);
ok('the other direction agrees too', agree("Primarily my partner's", 'Primarily mine') === true);
ok('balanced with balanced agrees', agree('Balanced', 'Balanced') === true);
ok('balanced against a claim disagrees', agree('Balanced', 'Primarily mine') === false);
ok('unanswered is not a comparison', agree(null, 'Primarily mine') === null);

console.log('\n— And the degrees, which a boolean could not say —');
ok('both claiming it is as far apart as the scale goes',
  closenessPct(respDistance({ yourValue: 'Primarily mine', theirValue: 'Primarily mine', youName: 'Ellie', themName: 'Preston' })) === 0);
ok('her Emotional Labour example is 75 per cent close, not a flat miss',
  closenessPct(respDistance({
    yourValue: 'Both of us', yourDetail: 'Usually Ellie, sometimes Preston',
    theirValue: 'Ellie', youName: 'Ellie', themName: 'Preston',
  })) === 75);
ok('one step apart beats two steps apart',
  respDistance({ yourValue: 'Both of us', theirValue: 'Ellie', youName: 'Ellie', themName: 'Preston' })
  < respDistance({ yourValue: 'Preston', theirValue: 'Ellie', youName: 'Ellie', themName: 'Preston' }));

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
  agree("Doesn't apply", 'Primarily mine') === false);
ok('both saying it does not apply is AGREEMENT',
  agree("Doesn't apply", "Doesn't apply") === true);
ok('a row is only dropped when nobody answered',
  agree("Doesn't apply", '') === null);

console.log('\n— A naive string comparison would get these wrong —');
const naive = (a, b) => a === b;
const inverted = [
  ['Primarily mine', 'Primarily mine'],
  ['Primarily mine', "Primarily my partner's"],
];
ok('and it disagrees with us on both, which is the point',
  inverted.every(([a, b]) => naive(a, b) !== agree(a, b)));

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
// `summary.differences` is gone with the line that drew it. B96, her words:
// "Remove 'already aligned:20 worth discussing:12' line from top of
// expectations overview page." So the count is derived here the way a reader
// would derive it, and this line went on asserting the old field for one run
// after the field stopped existing.
ok('two agreements, two differences',
  summary.aligned === 2 && summary.answered - summary.aligned === 2);
// The alignment percentage is gone too: the server computed it and neither
// surface drew it, so Ellie asked for it to stop being sent. The two counts
// it was derived from are checked on the line above, and they are what the
// surfaces actually use.
/**
 * By kind rather than by position.
 *
 * These two sliced the array: the responsibilities were the first five and the
 * life rows were the last one. Ellie: "Please move life and values to be the
 * first expectations page in the results flow", and both assertions became
 * assertions about where a category sits rather than about what is in it.
 */
const lifeBucket = summary.categories.find((c) => c.rows.every((r) => r.kind === 'life'));
const respBuckets = summary.categories.filter((c) => c !== lifeBucket);
ok('the responsibility half is one and one',
  respBuckets.flatMap((c) => c.rows).filter((r) => r.aligned).length === 1);
ok('the life half is one and one',
  lifeBucket.rows.filter((r) => r.aligned).length === 1);
// One bucket per NAVIGABLE screen, which is six: the five responsibility
// categories and Life & Values. This asserted RESPONSIBILITY_CATEGORIES.length,
// which is the input to scoring rather than the list a reader navigates, and
// that is exactly the confusion that broke the link: the website's sidebar
// offered exp-convo-5 and the section registry stopped at 4, so tapping Life &
// Values fell through to the storycards, and the app was never offered the
// page at all.
ok('one bucket per conversation screen', summary.categories.length === EXPECTATIONS_CATEGORIES.length);
// Ellie: "Please move life and values to be the first expectations page in the
// results flow." First, and it is the order of this list that decides, so this
// is where that order is held rather than in a screen.
ok('the first bucket is Life & Values', summary.categories[0]?.label === 'Life & Values');
ok('Life & Values navigates to a section that exists',
  isResultsSection(lifeBucket?.section));
// Against LIFE_QUESTIONS rather than a `life` array on the payload. That array
// was removed: it held the same rows as this bucket, and sending both is what
// put two Life & Values dropdowns on the app's Expectations page.
ok('Life & Values carries the life rows, not an empty bucket',
  lifeBucket?.rows.length > 0 && lifeBucket?.rows.every((r) => r.kind === 'life'));
ok('the payload no longer carries a second copy of the life rows',
  !('life' in summary));
ok('a responsibility bucket carries no life rows',
  respBuckets.every((c) => c.rows.every((r) => r.kind === 'responsibility')));
/**
 * The id is the category's, not the bucket's place in the list.
 *
 * This asserted categories[0].section === 'exp-convo-0', which was true only
 * while the two were the same number. Every bucket is checked against the
 * category it came from instead, which is the thing that has to hold: a mark
 * is anchored by this string, so it may not follow a page around the flow.
 */
ok('buckets carry their own category\'s section id, whatever the order',
  summary.categories.every((c, i) => c.section === EXPECTATIONS_CATEGORIES[i].section));
ok('Life & Values keeps the id it has always had', lifeBucket?.section === 'exp-convo-5');
const household = summary.categories.find((c) => c.label === cat.label);
ok('the disagreement names two different people',
  household.rows.find((r) => !r.aligned)?.you === 'Ellie'
  && household.rows.find((r) => !r.aligned)?.them === 'Preston');
ok('unanswered items are absent rather than blank',
  household.answered === 2 && cat.items.length > 2);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
