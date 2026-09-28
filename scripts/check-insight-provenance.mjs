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

import { INSIGHTS, insightOfTheDay } from '../api/_insights.js';

const fails = [];
const KINDS = new Set(['ours', 'quote']);
const CITE_FIELDS = ['author', 'work', 'url'];

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
  if (entry.kind === 'quote' && !p.source) {
    fails.push(`the payload for the quotation "${p.id}" carries no attribution, so`
      + " it is shown as the product's own words. That is the same error pointing"
      + ' the other way, and it is the one a fix for the first easily introduces.');
  }
}

/** The whole point is that some of each exist to be told apart. */
const quotes = INSIGHTS.filter((i) => i.kind === 'quote').length;
const ours = INSIGHTS.filter((i) => i.kind === 'ours').length;
if (!quotes || !ours) {
  fails.push(`there are ${quotes} quotations and ${ours} of our own sentences. With`
    + ' none of one kind this gate proves nothing about telling them apart.');
}

if (fails.length) {
  console.error('\n check-insight-provenance: a name under words its owner did not write.\n');
  for (const f of [...new Set(fails)]) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`[check-insight-provenance] ${quotes} quotations, each with an author, a`
  + ` publication and a link; ${ours} of our own sentences, none of them attributed to`
  + ' anyone, and no basis field reaches a customer.');
