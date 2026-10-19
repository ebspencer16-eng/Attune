#!/usr/bin/env node
/**
 * The two rings on the Expectations storycard count the right rows.
 *
 * ── THE BUG, TWICE ────────────────────────────────────────────────────────
 * The card shows Life & values and Responsibilities as two percentages. It
 * read `expectations.life` for the first, a field the summary used to send.
 * When Life & Values became the sixth category those rows moved into
 * `categories` and the array was dropped, so `|| []` took over: the ring read
 * 0% for every couple who has ever seen the card, and Responsibilities quietly
 * counted the life rows in with its own.
 *
 * Ellie has reported this figure wrong twice, and asked for it to be made
 * solid rather than fixed again. This is what makes it solid: not a second
 * description of the arithmetic, but the arithmetic run.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * Two people's answers are built so the two halves cannot come out the same:
 * every life question agreed, every responsibility at opposite ends. A card
 * that reads the wrong rows cannot produce 100 and 0 from that. Then the
 * mirror case, so a gate that only ever sees one arrangement cannot pass by
 * accident.
 *
 * The expected figures are computed from the question lists here, not copied
 * from the card, so this is two independent readings of the same answers.
 *
 * ── AND A THIRD CASE, BECAUSE THE RINGS MEASURE NOW ───────────────────────
 * Ellie: "I don't think it should be all-or-nothing aligned, I want to include
 * degrees." The rings were the share of rows that matched exactly and are the
 * mean closeness of the rows now.
 *
 * Two things about that. The "disagree" fixture used each question's first TWO
 * options, which are NEIGHBOURS: under the old rule that was a flat miss and
 * under the new one it is 72 per cent, so this gate failed the moment the rule
 * changed and was right to. Disagreement here means the two ENDS of the option
 * list, which is what the fixture was always trying to say.
 *
 * And a gate that only ever sees 0 and 100 cannot tell a mean from a count, so
 * there is a third case one step apart, where the two readings differ and the
 * expected figure is worked out from the option count rather than asserted.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The overall figure above the rings, which averages six domains that cut
 * across the categories rather than the rows of one, and has its own test in
 * expectations-test.mjs.
 */

import { RESPONSIBILITY_CATEGORIES, LIFE_QUESTIONS } from '../api/_questions.js';
import { mirrorRespKey, mirrorLifeId, expectationsSummary } from '../api/_lib/expectations.js';
import { highlightCards } from '../api/_lib/highlight-cards.js';

/**
 * A pair of answer sets, with each half's agreement dictated.
 *
 * Responsibility answers are directional: the two people answer about
 * themselves, so "Mostly me" from one and "Mostly them" from the other is
 * agreement. Life answers are not, and compare directly.
 */
function answers({ lifeAgree, respAgree, lifeStep = null }) {
  const mine = { responsibilities: {}, life: {} };
  const theirs = { responsibilities: {}, life: {} };

  for (const cat of RESPONSIBILITY_CATEGORIES) {
    for (const item of cat.items) {
      const key = `${cat.id}__${item}`;
      // The exercise's own words. Two people who both say "Primarily mine"
      // have disagreed: each thinks they carry it. Saying it as the values
      // rather than as true and false is what keeps this test honest about
      // what the rule is.
      mine.responsibilities[key] = 'Primarily mine';
      theirs.responsibilities[mirrorRespKey(key)] = respAgree ? "Primarily my partner's" : 'Primarily mine';
    }
  }
  for (const q of LIFE_QUESTIONS) {
    /**
     * Life answers compare directly, by how far apart the two options are in
     * the question's own ordered list. So disagreement is the two ENDS, not
     * the first two: the first two are neighbours, which is a near miss and
     * reads about 72 per cent rather than nought.
     *
     * Taken from the question's own options, so a question whose options
     * change is still being answered with something it offers.
     */
    const opts = q.options || ['Yes', 'No'];
    mine.life[q.id] = opts[0];
    if (lifeStep != null) {
      theirs.life[mirrorLifeId(q.id)] = opts[Math.min(lifeStep, opts.length - 1)];
    } else {
      theirs.life[mirrorLifeId(q.id)] = lifeAgree ? opts[0] : opts[opts.length - 1];
    }
  }
  return { mine, theirs };
}

/** The card's two rings, for one pair of answer sets. */
function rings({ mine, theirs }) {
  const expectations = expectationsSummary({ mine, theirs, youName: 'Ellie', themName: 'Preston' });
  const cards = highlightCards({
    dimensions: [],
    coupleTypeId: null,
    names: { you: 'Ellie', them: 'Preston' },
    expectations,
    reflection: null,
    intimacy: null,
    ex2: { mine, theirs },
  });
  const card = cards.find((c) => c.id === 'expectations');
  if (!card) return null;
  return Object.fromEntries((card.rings || []).map((r) => [r.label, r.pct]));
}

const fails = [];

for (const [name, opts] of [
  ['life agreed, responsibilities not', { lifeAgree: true, respAgree: false }],
  ['responsibilities agreed, life not', { lifeAgree: false, respAgree: true }],
]) {
  const pair = answers(opts);
  const got = rings(pair);
  if (!got) { fails.push(`${name}: the card was not built at all`); continue; }

  const wantLife = opts.lifeAgree ? 100 : 0;
  const wantResp = opts.respAgree ? 100 : 0;
  if (got['Life & values'] !== wantLife) {
    fails.push(`${name}: Life & values reads ${got['Life & values']}%, and every life question ${opts.lifeAgree ? 'agrees' : 'disagrees'}, so it should read ${wantLife}%`);
  }
  if (got.Responsibilities !== wantResp) {
    fails.push(`${name}: Responsibilities reads ${got.Responsibilities}%, and every responsibility ${opts.respAgree ? 'agrees' : 'disagrees'}, so it should read ${wantResp}%`);
  }
}

/**
 * ── THE DEGREES REACH THE RING ────────────────────────────────────────────
 * Every life question answered one step apart. Under a count that is nought;
 * under a mean it is the average of (1 - 1/(options - 1)) over the questions,
 * which is computed here from the question list rather than asserted, because
 * the number depends on how many options each question has.
 */
{
  const pair = answers({ lifeAgree: false, respAgree: true, lifeStep: 1 });
  const got = rings(pair);
  const each = LIFE_QUESTIONS.map((q) => {
    const n = (q.options || ['Yes', 'No']).length;
    return Math.round((1 - 1 / (n - 1)) * 100);
  });
  const want = Math.round(each.reduce((a, b) => a + b, 0) / each.length);
  if (!got) fails.push('one step apart: the card was not built at all');
  else if (got['Life & values'] !== want) {
    fails.push(`one step apart on every life question: Life & values reads`
      + ` ${got['Life & values']}% and should read ${want}%.`
      + ' A near miss is not a flat miss, which is the whole of the degrees change;'
      + ' a ring reading 0 here is counting matches again.');
  } else if (got['Life & values'] === 0 || got['Life & values'] === 100) {
    fails.push('one step apart produced a figure at one end of the scale, so this case'
      + ' cannot tell a mean from a count. Pick options that are genuinely one apart.');
  }
}

if (fails.length) {
  console.error('[check-expectations-rings] the storycard is counting the wrong rows:');
  for (const f of fails) console.error(`  ${f}`);
  console.error('');
  console.error('The two rings split on the row\'s own `kind`, which is what decides it');
  console.error('everywhere else. See api/_lib/highlight-cards.js.');
  process.exit(1);
}

console.log(`[check-expectations-rings] ${LIFE_QUESTIONS.length} life questions and ${RESPONSIBILITY_CATEGORIES.reduce((n, c) => n + c.items.length, 0)} responsibilities, into the right ring both ways round, and a third case one step apart where a ring that counted matches would read nought.`);
