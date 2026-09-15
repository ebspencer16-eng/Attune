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
 * every life question agreed, every responsibility disagreed. A card that
 * reads the wrong rows cannot produce 100 and 0 from that. Then the mirror
 * case, so a gate that only ever sees one arrangement cannot pass by accident.
 *
 * The expected figures are computed from the question lists here, not copied
 * from the card, so this is two independent readings of the same answers.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The overall figure above the rings, which is a similarity score across six
 * domains rather than a count of rows, and has its own test in
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
function answers({ lifeAgree, respAgree }) {
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
    // Life answers compare directly, so the question's own first two options
    // are enough, and using them means a question whose options change is
    // still being answered with something it offers.
    const [first, second] = q.options || ['Yes', 'No'];
    mine.life[q.id] = first;
    theirs.life[mirrorLifeId(q.id)] = lifeAgree ? first : (second ?? 'No');
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

if (fails.length) {
  console.error('[check-expectations-rings] the storycard is counting the wrong rows:');
  for (const f of fails) console.error(`  ${f}`);
  console.error('');
  console.error('The two rings split on the row\'s own `kind`, which is what decides it');
  console.error('everywhere else. See api/_lib/highlight-cards.js.');
  process.exit(1);
}

console.log(`[check-expectations-rings] ${LIFE_QUESTIONS.length} life questions and ${RESPONSIBILITY_CATEGORIES.reduce((n, c) => n + c.items.length, 0)} responsibilities, counted into the right ring both ways round.`);
