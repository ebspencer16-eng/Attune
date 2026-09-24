#!/usr/bin/env node
/**
 * WORDS-REVIEW.md, generated from api/_words.js.
 *
 * ── WHY IT IS GENERATED ───────────────────────────────────────────────────
 * Ellie: "Build 50 words to start, build a review doc for me."
 *
 * A review document that restates the product drifts from it, and this repo
 * has already paid for that twice: a copy-review document listed ten action
 * items the product has never rendered, so ten pieces of copy were reviewed
 * and approved that nobody would ever see, while the nine that ship went
 * through no review at all. And /email-preview held six hand-written mock-ups
 * of emails while the product sent nineteen.
 *
 * So this reads WORDS and writes a row per entry. Edit a definition in
 * api/_words.js, run this, and the document says the new one. There is no way
 * to change one without the other, because there is only one of them.
 *
 * ── WHY MARKDOWN AND NOT A .DOCX ──────────────────────────────────────────
 * The other review documents in scripts/ build Word files, which is right for
 * a thirty-page workbook and wrong for a list of fifty sentences: a .docx has
 * to be generated, downloaded and opened, and this is a table Ellie should be
 * able to read on her phone in the repo. It is committed for the same reason.
 *
 * Run: node scripts/build-words-review.mjs
 * Held current by: check-words-review.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { WORDS } from '../api/_words.js';

/**
 * Nothing in here may depend on the date.
 *
 * The first draft printed today's word. The file is committed and a check
 * holds it current, so that one line would have made the check fail every day
 * for a reason that is not a reason. A tool that always reports a failure is a
 * tool nobody reads, and this repo has already had one.
 */

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = `${ROOT}WORDS-REVIEW.md`;

/**
 * How long the list takes to come round again.
 *
 * wordOfTheDay steps one word per day, so the rotation is as long as the list.
 * Said in weeks because "fifty days" is the number and "seven weeks" is what
 * it means for someone opening the app.
 */
const weeks = (WORDS.length / 7).toFixed(1);

const rows = WORDS.map((w, i) => `| ${i + 1} | **${w.word}** | ${w.part} | ${w.definition} |`);

const doc = `# Word of the day: fifty for review

Generated from \`api/_words.js\` by \`scripts/build-words-review.mjs\`. Do not
edit this file. Change a definition in \`api/_words.js\` and run the script, or
tell me the change and I will make it.

**${WORDS.length} words**, one a day, so the list comes round about every ${weeks}
weeks.

## What I was going for

Not dictionary definitions. "Growth: change you chose, rather than change that
happened to you" is not what a dictionary says and is what this product means.
Each one is a single sentence, present tense, no hedging and no em dashes, and
none of them tells a couple which way to be.

The first four are the words you named. The other forty-six are mine.

## What to tell me

Three kinds of answer are useful, and a whole column of "fine" is one of them:

- **The word is wrong for this product.** Say cut and it goes.
- **The word is right, the sentence is not.** Send me yours and I will swap it.
- **A word is missing.** Send it with or without a definition.

Seven of these are the harder half of a relationship: **rupture**, **conflict**,
**withdrawal**, **escalation**, **resentment**, **contempt** and
**defensiveness**. They are here because naming a pattern is what this product
is for, and they are the easiest ones to cut if a card that says "contempt"
over breakfast is not the tone you want.

## The list

| # | Word | Part | Definition |
|--|--|--|--|
${rows.join('\n')}
`;

const before = (() => { try { return readFileSync(OUT, 'utf8'); } catch { return null; } })();
writeFileSync(OUT, doc);
console.log(`[build-words-review] ${WORDS.length} words written to WORDS-REVIEW.md`
  + `${before === doc ? ' (unchanged)' : ''}.`);
