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

const rows = INSIGHTS.map((i, n) => {
  const mark = onPage.has(i.id) ? ' *' : '';
  return `| ${n + 1}${mark} | ${i.body} | ${i.source} |`;
});

const doc = `# Insight of the day: fifty for review

Generated from \`api/_insights.js\` by \`scripts/build-insights-review.mjs\`. Do
not edit this file. Change an insight in \`api/_insights.js\` and run the
script, or tell me the change and I will make it.

**${INSIGHTS.length} insights**, one a day, so the list comes round about every
${weeks} weeks.

## What I was going for

Short declarative sentences in your voice. No em dashes, no hedging, and
nothing that tells a couple which way to be: an insight names a pattern, it
does not prescribe one.

The three marked **\\*** are the ones already published on the Our Purpose page.
They are here word for word, with the same ids, so someone who meets one in the
app and then reads the page does not find it reworded. Changing one means
changing the page too, and \`check-research.mjs\` will say so.

## The one thing to read carefully

Every source named is a real book or a real body of work, and **the sentence
above it is ours, not a quotation.** None of these is presented in quote marks
and none should be turned into one without checking the wording against the
source. A citation that drifts attributes a claim to someone who did not quite
make it, which is worse than most drift.

If a claim looks wrong to you, the fix is to cut the entry rather than soften
it. Tell me which number and it goes.

## What to tell me

- **Cut it.** The claim is wrong, or it is not the tone you want.
- **Keep it, reword it.** Send me yours and I will swap it in.
- **The source is wrong.** Say so, and I will cut it rather than guess.

## The list

| # | Insight | Source |
|--|--|--|
${rows.join('\n')}
`;

const before = (() => { try { return readFileSync(OUT, 'utf8'); } catch { return null; } })();
writeFileSync(OUT, doc);
console.log(`[build-insights-review] ${INSIGHTS.length} insights written to INSIGHTS-REVIEW.md`
  + `${before === doc ? ' (unchanged)' : ''}.`);
