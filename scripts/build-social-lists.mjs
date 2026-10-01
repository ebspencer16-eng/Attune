#!/usr/bin/env node
/**
 * SOCIAL-LISTS.md: the two lists Ellie hands to the social and graphics team.
 *
 * ── WHAT SHE ASKED FOR ────────────────────────────────────────────────────
 * "Build me a list in this chat that I can copy and paste to our social
 * media/graphics guy": the home tile prompts by priority, each with its heading
 * and its description, and the In Practice articles with their section and
 * title.
 *
 * ── WHY IT IS GENERATED ───────────────────────────────────────────────────
 * Because a list of what the product says, written out by hand, is a second
 * draft of the product. This repo has paid for that four times: ten action
 * items reviewed and approved that nothing ever rendered, six hand-written
 * email mock-ups while the product sent nineteen, a copy-review document that
 * could not be checked, and an insights page that drifted from the insights.
 *
 * These lists go to someone outside the company who will set the words in
 * artwork. A heading that has been retyped is the worst possible input to that:
 * it comes back as a graphic, and the graphic is what people see.
 *
 * So the prompts are read by RUNNING the priority engine, and the articles by
 * reading the index the app reads. Nothing here types a sentence a customer
 * sees.
 *
 * ── WHAT IT CANNOT SAY ────────────────────────────────────────────────────
 * Which prompt a given person sees. That depends on where a couple actually is.
 * The list is every prompt the engine can produce, in the order it prefers
 * them, which is what artwork needs.
 *
 * Run: node scripts/build-social-lists.mjs
 * Held current by: check-social-lists.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { EXERCISES } from '../api/_exercises.js';
import { IN_PRACTICE, shelfFor } from '../api/_in-practice.js';
import { POST_CATEGORIES } from '../api/_lib/post-categories.js';
import { nextActions } from '../api/_lib/next-action.js';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = `${ROOT}SOCIAL-LISTS.md`;

/**
 * Nothing here may depend on today's date, or the check that holds this file
 * current fails every day for a reason that is not a reason. The idle rotation
 * is keyed to the day, so the days below are fixed.
 */
const NOW = '2026-01-01T12:00:00Z';

const ex = (over = {}) => Object.fromEntries(
  EXERCISES.map((e) => [e.key, { owned: true, mine: true, theirs: true, ...over }]),
);

/**
 * States chosen to surface each card the engine can produce.
 *
 * Driving the real function rather than listing its outputs: a branch that
 * stops firing drops out of this document, which is the point. A hand-written
 * list would go on advertising a prompt nobody can reach.
 */
const SCENARIOS = [
  ['profile not set up', {
    profileComplete: false, exercises: ex({ mine: false, theirs: false }),
  }],
  ['your own exercise not started', {
    profileComplete: true, exercises: ex({ mine: false, theirs: false }),
  }],
  ['your own exercise in progress', {
    profileComplete: true,
    exercises: ex({ mine: false, theirs: false, started: true, answered: 12, total: 30 }),
  }],
  ['waiting on your partner', {
    profileComplete: true, exercises: ex({ theirs: false }),
  }],
  ['you nudged them recently', {
    profileComplete: true, exercises: ex({ theirs: false }),
    partnerNudgedAt: '2025-12-31T12:00:00Z',
  }],
  ['results ready, never opened', {
    profileComplete: true, exercises: ex(), resultsReady: true,
  }],
  ['a tool bought and not started', {
    profileComplete: true, exercises: ex(),
    resources: { budget: { owned: true, started: false, complete: false } },
  }],
  ['a tool in progress', {
    profileComplete: true, exercises: ex(),
    resources: { budget: { owned: true, started: true, complete: false } },
  }],
  ['the other tool, bought and not started', {
    profileComplete: true, exercises: ex(),
    resources: { checklist: { owned: true, started: false, complete: false } },
  }],
  ['a new In Practice piece', {
    profileComplete: true, exercises: ex(),
    inPractice: {
      latestId: 7, latestTitle: 'x',
      latestPublishedAt: '2025-12-28T12:00:00Z', lastReadAt: null,
    },
  }],
  ['come back to your widest gap', {
    profileComplete: true, exercises: ex(), resultsReady: true,
    resultsLastOpenedAt: '2025-10-01T12:00:00Z', topGapDimensionLabel: 'Conflict Style',
  }],
  ['come back to a conversation you flagged', {
    profileComplete: true, exercises: ex(), resultsReady: true,
    resultsLastOpenedAt: '2025-10-01T12:00:00Z',
    unresolvedConversationTitle: 'Money and what it is for',
  }],
  ['a regular we have not heard from', {
    profileComplete: true, exercises: ex(), opens30d: 6,
  }],
];

/* The idle rotation is one per day, so a week of days surfaces all of them. */
for (let d = 0; d < 7; d += 1) {
  const day = new Date(Date.UTC(2026, 0, 1 + d)).toISOString();
  SCENARIOS.push([`nothing outstanding, day ${d + 1}`, {
    now: day, profileComplete: true, exercises: ex(),
  }]);
}

const seen = new Map();
for (const [, state] of SCENARIOS) {
  const out = nextActions({
    now: NOW, firstName: 'Sarah', partnerName: 'James', partnerPronouns: 'she/her',
    ...state,
  });
  for (const card of [out.primary, ...(out.secondary || [])]) {
    if (!card) continue;
    /* Keyed on the words, not the id: "Continue Communication" and "Complete
       your exercises" are one id and two different headings, and artwork needs
       both. */
    const key = `${card.title} ${card.body}`;
    if (!seen.has(key)) seen.set(key, card);
  }
}

const prompts = [...seen.values()].sort((a, b) => b.priority - a.priority
  || a.title.localeCompare(b.title));

const esc = (s) => String(s).replace(/\|/g, '\\|');

const promptRows = prompts.map((c, n) =>
  `| ${n + 1} | ${c.priority} | ${esc(c.title)} | ${esc(c.body)} | ${esc(c.cta)} |`);

/* Articles grouped by the shelf the server files them under, in shelf order. */
const articleRows = [];
for (const shelf of POST_CATEGORIES) {
  for (const a of IN_PRACTICE.filter((x) => shelfFor(x) === shelf)) {
    articleRows.push(`| ${esc(shelf)} | ${esc(a.title)} |`);
  }
}

const doc = `# Lists for the social and graphics team

Generated by \`scripts/build-social-lists.mjs\` from the product itself. Do not
edit this file: run the generator. Every heading and description below is text
the product actually shows, read out of the priority engine and the In Practice
index rather than retyped.

## 1. Home screen prompts

Every prompt the app's home tile can show, in the order the app prefers them.
The number under Priority is the engine's own: the highest one a couple
qualifies for becomes the large card at the top of the tile, and the next three
sit under it.

A couple sees one of these at a time, not the list. Which one depends on where
they are: whether their profile is set up, whether each partner has finished,
whether their results are ready, and what they have bought and not used.

| # | Priority | Heading | Description | Button |
|---|---|---|---|---|
${promptRows.join('\n')}

${prompts.length} prompts.

## 2. In Practice articles

Every article, under the section it belongs to.

| Section | Title |
|---|---|
${articleRows.join('\n')}

${articleRows.length} articles across ${POST_CATEGORIES.length} sections.
`;

const before = (() => { try { return readFileSync(OUT, 'utf8'); } catch { return null; } })();
if (doc.length < 1500) {
  console.error('[build-social-lists] refusing to write a document this short.');
  process.exit(1);
}
writeFileSync(OUT, doc);
console.log(`[build-social-lists] ${prompts.length} prompts, ${articleRows.length} articles`
  + ` into SOCIAL-LISTS.md${before === doc ? ' (unchanged)' : ''}`);
