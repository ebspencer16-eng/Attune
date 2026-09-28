#!/usr/bin/env node
/**
 * INSIGHTS-REVIEW.md, generated from api/_insights.js.
 *
 * ── WHY IT IS GENERATED ───────────────────────────────────────────────────
 * Ellie: "Build a list of 50 insights of the day to rotate through, I will
 * review these later when I review the words list."
 *
 * The same argument as WORDS-REVIEW.md, and the same reason: a review document
 * that restates the product drifts from it. This repo has paid for that twice,
 * once when ten action items the product never rendered were reviewed and
 * approved while the nine that ship went through no review at all.
 *
 * Run: node scripts/build-insights-review.mjs
 * Held current by: check-insights-review.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { INSIGHTS } from '../api/_insights.js';
import { RESEARCH } from '../api/_research.js';

/**
 * Nothing in here may depend on the date, or the check that holds this file
 * current fails every day for a reason that is not a reason.
 */
const ROOT = new URL('..', import.meta.url).pathname;
const OUT = `${ROOT}INSIGHTS-REVIEW.md`;

const onPage = new Set(RESEARCH.map((r) => r.id));
const weeks = (INSIGHTS.length / 7).toFixed(1);

const quotes = INSIGHTS.filter((i) => i.kind === 'quote');
const ours = INSIGHTS.filter((i) => i.kind !== 'quote');

const quoteRows = quotes.map((i, n) =>
  `| Q${n + 1} | ${i.body} | ${i.author}, ${i.work} | [read it](${i.url}) |`);

const oursRows = ours.map((i, n) => {
  const mark = onPage.has(i.id) ? ' *' : '';
  return `| ${n + 1}${mark} | ${i.body} | ${i.basis || ''} |`;
});

const doc = `# Insight of the day, for review

Generated from \`api/_insights.js\` by \`scripts/build-insights-review.mjs\`. Do
not edit this file. Change an insight in \`api/_insights.js\` and run the
script, or tell me the change and I will make it.

**${INSIGHTS.length} insights**, one a day, so the list comes round about every
${weeks} weeks. ${quotes.length} are quotations and ${ours.length} are ours.

## What changed, and why you are seeing two tables

You: "The insight of the day today reads as SO AI. I would rather just use direct
quotes from these publications, can you organize those and cite them accurately?"

The tone was the half you could see. Underneath it was something worse. Every one
of these sentences is mine, and the product drew each one with a source
underneath it and shared it as the sentence followed by the attribution. A line
with a name under it reads as that person's line, so fifty sentences I wrote were
being attributed on screen to Gottman, Johnson and a dozen journals.

That is fixed at the root rather than in the wording. There are two kinds now and
the product cannot confuse them:

- **Quotations** carry the exact words, the author, the publication and a link to
  where I read them. Only these are shown with a citation.
- **Ours** are the product's own sentences and are shown with no attribution at
  all, because nobody said them but us. The work each is drawn from is recorded
  for you, in the third column below, and it never reaches a customer.

\`check-insight-provenance.mjs\` fails the build if those two are mixed.

## On whether we are allowed to quote

Yes, with limits, and the limits are the ordinary ones: keep the extract short,
name the author and where it was published, do not reproduce a substantial part
of anything, and do not imply the author endorses Attune. That is normal practice
and it is what the table below does. I am not a lawyer and this is the same
category of thing your lawyer is already reviewing, so it is worth one line of
their time.

What I will not do is produce fifty of them quickly. Each one has to be checked
against the source, and two traps turned up in the first three: the byline on a
page can be a current display name rather than the name a piece was published
under, and the date shown is usually when the page was last edited rather than
when it was written. So no date is claimed on any of these, and the link is there
so you can check the wording yourself.

## What to tell me

- **Cut it.** The claim is wrong, or it is not the tone you want.
- **Keep it, reword it.** Send me yours and I will swap it in.
- **Turn this one into a quote.** Name the book and I will find the wording and
  cite it, or tell you I could not verify it.

## Quotations

| # | Quotation | Source | Checked |
|--|--|--|--|
${quoteRows.join('\n')}

## Ours

The third column is where the sentence comes from. **It is not shown to anyone**,
and it is here so you can tell whether the sentence is a fair summary of the work
beside it.

The ones marked **\\*** are also published on the Our Purpose page, word for word
and with the same ids, so someone who meets one in the app and then reads the page
does not find it reworded. Changing one means changing the page too, and
\`check-research.mjs\` will say so.

| # | Insight | Drawn from |
|--|--|--|
${oursRows.join('\n')}
`;


const before = (() => { try { return readFileSync(OUT, 'utf8'); } catch { return null; } })();
writeFileSync(OUT, doc);
console.log(`[build-insights-review] ${INSIGHTS.length} insights written to INSIGHTS-REVIEW.md`
  + `${before === doc ? ' (unchanged)' : ''}.`);
