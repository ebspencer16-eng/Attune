#!/usr/bin/env node
/**
 * A couple keeps the scores they were given and reads the copy as it is today.
 *
 * ── THE RULE, IN ELLIE'S WORDS ────────────────────────────────────────────
 * "I want formatting changes and prose adjustments to be applied even for
 * couples who have already taken their assessments, but responses and
 * scoring/backend calculations should persist from the time the couples took the
 * assessment. If we catch a typo I want to be able to fix it in the future, but
 * if we change typing weights I don't want that to affect users who have already
 * gotten their results."
 *
 * Two halves that used to be one. Before this, a stored row carried both an
 * engine version and a content version and was served from both, so a typo fixed
 * in January never reached anybody who finished in December.
 *
 * ── WHY IT IS EASY TO GET BACKWARDS ───────────────────────────────────────
 * Both live on the same row, one line apart, and both read like the same kind of
 * thing. Serving the stored content version again would be a one-word change
 * that nothing else would notice: every couple would still get results, still
 * get prose, and a correction would silently stop reaching the people who
 * already had results. Which is the state this replaced.
 *
 * Freezing the engine wrongly is the louder failure and the gate covers it too,
 * because a fix for one is a plausible place to break the other.
 *
 * ── HOW IT DECIDES ────────────────────────────────────────────────────────
 * A row is stored under an old engine and an old content version, then served
 * back, and the two halves are read off the answer. Behavioural, because the
 * rule is about what a specific row produces and both versions are plain numbers
 * that look interchangeable in the source.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * That the copy is correct, or that a given content version still has every key
 * the renderer wants. check-content-version covers resolution, and
 * check-frozen-results covers a stored row missing fields the code now expects.
 *
 * Not the cost. Serving current copy to an old row means a copy edit can orphan
 * marks anyone ever made on that sentence, where before it could only orphan
 * those of couples who had not finished. That is a real consequence of a
 * deliberate decision, it is written down beside the code, and it is
 * check-mark-reach's subject rather than this one's.
 */

import { getOrComputeResults } from '../api/_lib/results-store.js';
import { CONTENT_VERSION } from '../api/_lib/content-version.js';
import { RESULTS_VERSION } from '../api/_lib/results.js';

const fails = [];

/** An engine and a copy library older than today's, as an old row would carry. */
const OLD_ENGINE = RESULTS_VERSION - 1;
const OLD_CONTENT = CONTENT_VERSION - 1;

if (OLD_ENGINE < 0 || OLD_CONTENT < 0) {
  console.error('[check-frozen-split] cannot build an older row: RESULTS_VERSION is'
    + ` ${RESULTS_VERSION} and CONTENT_VERSION is ${CONTENT_VERSION}. Refusing to`
    + ' pass, because with nothing older than today every assertion below is'
    + ' trivially true and the gate proves nothing.');
  process.exit(1);
}

/**
 * A stored row for a couple who finished long ago.
 *
 * answers_hash has to match what the store computes for these answers, or it
 * reads the row as a retake and recomputes, which is a different path.
 */
const answers = { q1_self: 3, q1_partner: 4 };
const stored = {
  partner_a: 'a', partner_b: 'b',
  version: OLD_ENGINE,
  content_version: OLD_CONTENT,
  couple_type: 'WX',
  results: { coupleType: 'WX', marker: 'the stored results, untouched' },
  computed_at: '2025-01-01T00:00:00.000Z',
  frozen_at: '2025-01-01T00:00:00.000Z',
};

const { answersFingerprint } = await import('../api/_lib/results-store.js');
stored.answers_hash = await answersFingerprint(answers, answers);

let wrote = false;
const db = {
  read: async () => stored,
  write: async () => { wrote = true; },
  archive: async () => {},
};

const served = await getOrComputeResults({
  db,
  aId: 'a', bId: 'b',
  aAnswers: answers, bAnswers: answers,
  aName: 'A', bName: 'B',
});

if (wrote) {
  fails.push('serving an unchanged stored row recomputed and wrote it. Results are'
    + ' frozen: only the couple answering again recomputes, and this path is what'
    + ' guarantees a score never moves under anyone.');
}

if (!served.cached) {
  fails.push('a stored row whose answers have not changed came back as not cached,'
    + ' so nothing below is testing a frozen row.');
}

if (served.results?.marker !== stored.results.marker) {
  fails.push('the stored results were not served back as written. Whatever else is'
    + ' true, the scores a couple was given have to be the scores they keep.');
}

// ── The half that must stay frozen ─────────────────────────────────────────
if (served.computedUnderVersion !== OLD_ENGINE) {
  fails.push(`a row computed under engine ${OLD_ENGINE} came back as`
    + ` ${served.computedUnderVersion}. Ellie: "if we change typing weights I don't`
    + ' want that to affect users who have already gotten their results." The engine'
    + ' on the row is what produced those scores and it is what they keep.');
}

// ── The half that must not ─────────────────────────────────────────────────
if (served.contentVersion !== CONTENT_VERSION) {
  fails.push(`a row stamped with content version ${OLD_CONTENT} was served with`
    + ` content version ${served.contentVersion} instead of the current`
    + ` ${CONTENT_VERSION}. Ellie: "If we catch a typo I want to be able to fix it in`
    + ' the future." Serving the stamp back means a correction never reaches anyone'
    + ' who already has results, which is the behaviour this replaced and is a'
    + ' one-word change away.');
}

/** And the stamp itself is still recorded, because it says what they first read. */
let written = null;
const freshDb = {
  read: async () => null,
  write: async (row) => { written = row; },
  archive: async () => {},
};
await getOrComputeResults({
  db: freshDb,
  aId: 'a', bId: 'b',
  aAnswers: answers, bAnswers: answers,
  aName: 'A', bName: 'B',
});
if (!written) {
  fails.push('a couple with no stored row did not get one written, so there is'
    + ' nothing to freeze the scores on.');
} else {
  if (written.content_version !== CONTENT_VERSION) {
    fails.push('a new row is not stamped with the current content version. The stamp'
      + ' is no longer what a couple is served, and it is still the record of what'
      + ' they first read.');
  }
  if (written.version !== RESULTS_VERSION) {
    fails.push('a new row is not stamped with the current engine version, so nothing'
      + ' records which engine produced its scores.');
  }
}

if (fails.length) {
  console.error('\n check-frozen-split: the scores and the words are frozen together'
    + ' again.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`[check-frozen-split] a row stored under engine ${OLD_ENGINE} and content`
  + ` ${OLD_CONTENT} keeps its engine and its scores, and is served the current copy`
  + ` (${CONTENT_VERSION}). New rows are stamped with both.`);
