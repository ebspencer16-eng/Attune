#!/usr/bin/env node
/**
 * Every written answer on Side by Side carries a question under it.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Side by Side prints two people's answers to the same question. The prompt
 * under the pair is the half that does the work: it is the thing to do with
 * having read them, and without it the page is two quotes and no invitation.
 *
 * One question had no prompt on either surface, and it was the first one the
 * exercise asks. Nobody could see it from the code: the prompt map is keyed by
 * question id, and a question with no key simply renders without the line.
 * Ellie saw it on a phone and reported it as the app missing some of them.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * Every text question in the Reflection exercise has a prompt. Derived from
 * the questions themselves rather than a list here, so adding a question to
 * the exercise fails this until it has one.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the prompt is any good, which is Ellie's call and not a gate's. Nor
 * the scale questions: they are drawn as a comparison, not quoted, and there
 * is no pair of sentences to sit with.
 */

import { ANNIVERSARY_QUESTIONS } from '../api/_anniversary-questions.js';
import { REFLECTION_PROMPTS, promptFor } from '../api/_lib/reflection-prompts.js';

const text = ANNIVERSARY_QUESTIONS.filter((q) => q.type === 'text');
const missing = text.filter((q) => !promptFor(q.id));
const orphans = Object.keys(REFLECTION_PROMPTS).filter((id) => !text.some((q) => q.id === id));

const fails = [];
for (const q of missing) {
  fails.push(`${q.id} ("${String(q.text).slice(0, 60)}") has no prompt, so its pair prints with nothing under it`);
}
for (const id of orphans) {
  // The other direction: a prompt for a question that no longer exists is copy
  // nobody will read, sitting in a file Ellie reviews.
  fails.push(`${id} has a prompt and is not a written question any more`);
}

if (fails.length) {
  console.error('[check-reflection-prompts] Side by Side is missing the question under a pair:');
  for (const f of fails) console.error(`  ${f}`);
  console.error('');
  console.error('Add it to REFLECTION_PROMPTS in api/_lib/reflection-prompts.js. Both');
  console.error('surfaces read that map, so one line covers the site and the app.');
  process.exit(1);
}

console.log(`[check-reflection-prompts] ${text.length} written questions, ${text.length} prompts, none spare.`);
