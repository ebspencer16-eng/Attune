#!/usr/bin/env node
/**
 * A name only appears under words that person wrote.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * api/_insights.js held fifty sentences and a source beside each. The file said,
 * in a comment, that the sentences were the product's own and the sources were
 * not quotations. The comment was right. The product did not honour it: the app
 * drew the sentence with the source underneath and shared it as the sentence
 * followed by the attribution, so fifty sentences written here were attributed,
 * on screen, to Gottman, Johnson and a dozen journals.
 *
 * Ellie saw the tone: "The insight of the day today reads as SO AI. I would
 * rather just use direct quotes from these publications, can you organize those
 * and cite them accurately?" This was underneath it, and it is the more serious
 * half. A wrong sentence is a wrong sentence; a wrong sentence with a
 * researcher's name under it is a claim about what that researcher said.
 *
 * A comment cannot fail a build, which is why it had been true and ignored for
 * as long as the file had existed.
 *
 * ── WHAT THIS CHECKS ──────────────────────────────────────────────────────
 * Every insight is one of two kinds and cannot be half of each. A quotation
 * carries an author, a publication and a url. One of ours carries none of those,
 * and its `basis`, which records the work it is drawn from, must never reach a
 * customer: it is there so Ellie can judge whether the sentence is a fair
 * summary, and a name in front of a reader is exactly the thing being fixed.
 *
 * The payload is built and inspected rather than the entry being read, because
 * the bug was in what got sent, not in what was stored.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether a quotation is accurate. Nothing here can open a book. What it can do
 * is insist there is a url, so the wording can be checked by a person, and
 * refuse a citation with no link behind it.
 *
 * Not the wording of our own sentences. Those are Ellie's to keep or cut, and
 * INSIGHTS-REVIEW.md is where she does it.
 *
 * Not dates. None is claimed: the pages these came from show when they were last
 * edited rather than when they were written, so a date would cite the day I read
 * it. That is a deliberate absence rather than a missing field.
 */

import { readFileSync } from 'node:fs';
import { INSIGHTS, insightOfTheDay, INSIGHT_EYEBROW } from '../api/_insights.js';

const ROOT = new URL('..', import.meta.url).pathname;

const fails = [];
const KINDS = new Set(['ours', 'quote']);
/**
 * ── WHAT A CITATION HAS TO CARRY ──────────────────────────────────────────
 * Always an author and a publication. Then one of two ways for a reader to
 * check it:
 *
 *   a url, for something published on a page, or
 *   an edition and a page number, for something published in a book.
 *
 * Ellie: "I would rather quote from books than sites anyways." A book is the
 * better source and it is the harder one to hold, because no check can open it.
 * What a page number does is make the claim checkable by a person in a minute
 * rather than checkable in principle by nobody, which is the state the six
 * original quotations were in when two of them turned out to be paraphrases.
 */
const CITE_FIELDS = ['author', 'work'];

if (!Array.isArray(INSIGHTS) || INSIGHTS.length < 10) {
  console.error(`[check-insight-provenance] found ${INSIGHTS?.length ?? 0} insights.`
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

for (const i of INSIGHTS) {
  const at = `insight "${i.id}"`;

  if (!KINDS.has(i.kind)) {
    fails.push(`${at} has kind ${JSON.stringify(i.kind)}. Every insight is either`
      + " 'ours' or 'quote', because the difference decides whether a name appears"
      + ' under it.');
    continue;
  }

  if (i.kind === 'quote') {
    for (const f of CITE_FIELDS) {
      if (!i[f] || !String(i[f]).trim()) {
        fails.push(`${at} is a quotation with no ${f}. Someone else's words need`
          + ' saying whose, where they were published, and where they can be read.');
      }
    }

    /**
     * One of the two ways to be checkable, and not neither.
     *
     * A page number was the first answer for books and a volume id is a better
     * one: a page number can only be checked by a person holding the book, and a
     * volume id can be checked by asking Google whether the sentence is in that
     * scan. So `edition` is still required alongside it, because that is what a
     * reader sees under the quotation, but it is the volume that makes the claim
     * verifiable.
     */
    const hasUrl = !!String(i.url || '').trim();
    const hasVolume = !!String(i.volumeId || '').trim() && !!String(i.edition || '').trim();
    if (!hasUrl && !hasVolume) {
      fails.push(`${at} is a quotation nobody can check. Give it a url, or a`
        + ' Google Books volumeId and the edition a reader should see. A quotation'
        + ' with neither is a claim about what someone said resting on nothing,'
        + ' which is exactly how "Contempt is the single greatest predictor of'
        + ' divorce" came to sit under a researcher\'s name.');
    }
    if (hasUrl && hasVolume) {
      fails.push(`${at} carries both a url and a volumeId. Pick the one that is`
        + ' actually the source, so the check that runs is the one that means'
        + ' something.');
    }
    {
    }
    if (i.url && !/^https:\/\//.test(i.url)) {
      fails.push(`${at} cites ${i.url}, which is not a link a reader can open.`);
    }
    if (i.basis) {
      fails.push(`${at} is a quotation and also carries a basis. basis is for our`
        + ' own sentences, recording the work they summarise. A quotation has an'
        + ' author instead.');
    }
  }

  if (i.kind === 'ours') {
    for (const f of CITE_FIELDS) {
      if (i[f]) {
        fails.push(`${at} is our own sentence and carries ${f}. That is how fifty`
          + ' sentences came to be attributed to people who did not write them. If'
          + " it really is someone's words, make it a quotation and check the"
          + ' wording against the source.');
      }
    }
  }

  if (!i.body || !String(i.body).trim()) fails.push(`${at} has no body.`);
}

/**
 * And the payload, which is where the damage actually happened.
 *
 * Every day in the rotation is checked, because the bug was one field on one
 * entry reaching a screen, and a spread would put it there for all of them at
 * once.
 */
for (let day = 0; day < INSIGHTS.length; day += 1) {
  const p = insightOfTheDay(new Date(day * 86400000));
  const entry = INSIGHTS.find((i) => i.id === p.id);
  if (!entry) {
    fails.push(`the payload for day ${day} has id "${p.id}", which is not an insight.`);
    continue;
  }

  if ('basis' in p) {
    fails.push('the payload carries basis. That field names the work one of our'
      + ' own sentences is drawn from, and putting it under that sentence on a'
      + ' screen is the misattribution this whole file was restructured to stop.');
    break;
  }

  if (entry.kind === 'ours' && (p.source || p.url)) {
    fails.push(`the payload for "${p.id}" carries an attribution (${JSON.stringify(p.source || p.url)})`
      + ' for one of our own sentences. Nobody said it but us.');
  }
  if (entry.kind === 'quote' && !/^\u201c[\s\S]*\u201d$/.test(p.body)) {
    fails.push(`the quotation "${p.id}" is not sent in quotation marks. Ellie: "I`
      + ' want the format to be direct quotes in quotation marks, with the citation'
      + ' below." Three surfaces draw this and one shares it as text, so the marks'
      + ' are put on once, here, rather than by each of them.');
  }
  if (entry.kind === 'ours' && /^\u201c/.test(p.body)) {
    fails.push(`"${p.id}" is one of our own sentences and is sent in quotation`
      + ' marks, which makes it look like something somebody said.');
  }
  if (entry.kind === 'quote' && !p.source) {
    fails.push(`the payload for the quotation "${p.id}" carries no attribution, so`
      + " it is shown as the product's own words. That is the same error pointing"
      + ' the other way, and it is the one a fix for the first easily introduces.');
  }
}

/**
 * Both surfaces open the same card the same way.
 *
 * ── WHY IT IS HERE ────────────────────────────────────────────────────────
 * Ellie: "Not seeing share at the bottom right on the quick access insight of the
 * day card, just save to journal." The card opened from Learn had Share and the
 * one on the home screen did not, because they are two call sites of one
 * component and only one was changed. Nothing failed: the card rendered, it just
 * offered one control instead of two.
 *
 * The same shape as the insight's own citation, one layer out, so it is checked
 * beside it rather than in a file of its own.
 */
const CARD_SITES = ['attune-app/src/app/index.tsx', 'attune-app/src/app/resources.tsx'];
for (const f of CARD_SITES) {
  const src = readFileSync(`${ROOT}${f}`, 'utf8');
  /**
   * The StoryCard a reader opens, not the first `insightCard(` in the file.
   *
   * This took the first one, and the Learn tab now renders a second, hidden off
   * the edge of the screen so the Share control on the banner has a card to
   * photograph. That copy has no Save and no Share, because nobody can see it,
   * and the window landed on it: the check reported Share missing from a card
   * that has it. Anchored to the element it is about.
   */
  const at = src.indexOf('<StoryCard');
  if (at < 0) {
    fails.push(`${f} no longer opens the insight of the day, so one of the two ways`
      + ' into it is gone.');
    continue;
  }
  const end = src.indexOf('/>', at);
  const block = src.slice(at, end === -1 ? at + 900 : end);
  if (!/insightCard\(/.test(block)) {
    fails.push(`${f} opens a StoryCard that is not the insight of the day, so this is pointed at`
      + ' the wrong element. Refusing to pass: a gate that has lost its subject must never report'
      + ' success.');
    continue;
  }
  for (const [prop, what] of [['journal', 'Save to journal'], ['share', 'Share']]) {
    if (!new RegExp(`${prop}=\\{`).test(block)) {
      fails.push(`${f} opens the insight of the day without ${prop}, so ${what} is`
        + ' missing from that card. The other surface has it, which is exactly how'
        + ' this was reported.');
    }
  }
}

/**
 * ── ONE BOOK, ONE CITATION ────────────────────────────────────────────────
 * The Seven Principles for Making Marriage Work was cited two ways at once:
 * "John Gottman, Harmony 2002" under nine quotations and "John Gottman and
 * others, Harmony 2015" under one. Both were true of some edition, and a reader
 * meeting the same book under two bylines on two days has no way to know that.
 *
 * It happened because each quotation took its citation from whichever volume
 * Google surfaced when that quotation was added, and Google surfaces different
 * editions on different days. The quotation check already stopped pinning to a
 * volume id for that reason; this is the same lesson one layer up.
 *
 * Found by a sweep rather than by a gate, which is why it is a gate now.
 */
{
  const byWork = new Map();
  for (const i of INSIGHTS) {
    if (i.kind !== 'quote' || !i.volumeId) continue;
    const cite = `${i.author} | ${i.edition}`;
    if (!byWork.has(i.work)) byWork.set(i.work, new Map());
    byWork.get(i.work).set(cite, (byWork.get(i.work).get(cite) || 0) + 1);
  }
  for (const [work, cites] of byWork) {
    if (cites.size === 1) continue;
    const shown = [...cites].map(([c, n]) => `${c} (${n})`).join('  //  ');
    fails.push(`"${work}" is cited ${cites.size} different ways: ${shown}. Pick the`
      + ' edition the quotations should be attributed to and use it for all of them.'
      + ' A reader meeting one book under two bylines cannot tell which is right.');
  }
}

/**
 * ── THE SUBJECT CHANGED, SO THIS GUARD DID ────────────────────────────────
 * It used to require some of each kind, on the grounds that with none of one
 * kind the gate proved nothing about telling them apart. That was right while
 * both kinds existed, and it fired the moment the last of our own sentences was
 * retired at Ellie's ask, which is the gate doing its job: it noticed its
 * subject had moved rather than quietly passing.
 *
 * What it protects now is the direction that can still go wrong. Every insight
 * is a quotation, so what matters is that there are some, that each one can be
 * checked, and that if a sentence of ours is ever added back it arrives with no
 * citation and no basis reaching a customer, which the loop above covers.
 *
 * `ours` being zero is a decision and is stated as one in the summary rather
 * than checked, because a check that insisted on zero would stop her ever
 * choosing to add one back.
 */
const quotes = INSIGHTS.filter((i) => i.kind === 'quote').length;
const ours = INSIGHTS.filter((i) => i.kind === 'ours').length;
if (!quotes) {
  fails.push('there are no quotations at all. Every insight is one, so this gate has'
    + ' lost its subject and must not report success.');
}

if (fails.length) {
  console.error('\n check-insight-provenance: a name under words its owner did not write.\n');
  for (const f of [...new Set(fails)]) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
/**
 * ── THE LABEL, WHICH BOTH SURFACES SHOW ───────────────────────────────────
 * The app keeps a literal as its fallback, for a payload cached from before the
 * server sent one. A fallback that says something different from the module is
 * the drift it exists to survive, printed on screen.
 */
{
  const app = readFileSync(`${ROOT}attune-app/src/app/resources.tsx`, 'utf8');
  const m = app.match(/const INSIGHT_OF_THE_DAY = '([^']*)';/);
  if (!m) {
    fails.push("attune-app's resources.tsx no longer declares INSIGHT_OF_THE_DAY."
      + ' Either it reads the label from the payload alone, in which case delete this'
      + ' assertion with it, or the name changed. Refusing to guess.');
  } else if (m[1] !== INSIGHT_EYEBROW) {
    fails.push(`the app calls the insight ${JSON.stringify(m[1])} and api/_insights.js`
      + ` calls it ${JSON.stringify(INSIGHT_EYEBROW)}. The dashboard reads the module and`
      + ' the app falls back to its own copy, so those two strings are one label written'
      + ' twice.');
  }
}

if (fails.length) {
  console.error('[check-insight-provenance] a name sits under words that are not that'
    + " person's:");
  for (const f of fails) console.error(`  ✗ ${f}`);
  process.exit(1);
}

const onPages = INSIGHTS.filter((i) => i.kind === 'quote' && String(i.url || '').trim()).length;
const inBooks = quotes - onPages;
console.log(`[check-insight-provenance] ${quotes} quotations, each with an author and a`
  + ` publication: ${onPages} on a page that can be fetched, ${inBooks} in a book with a`
  + ` Google Books volume behind it. ${ours} sentences of our own, which is the number Ellie`
  + ' asked for.');
