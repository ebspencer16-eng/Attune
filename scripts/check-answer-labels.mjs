#!/usr/bin/env node
/**
 * Editing a word of an answer option must not delete anyone's answer.
 *
 * ── WHAT HAPPENED ─────────────────────────────────────────────────────────
 * Ellie, reading her own Physical Intimacy results: "why don't I have a
 * response for the second one?"
 *
 * Because an answer is stored as the words that were on the button. Commit
 * 6b00d10 renamed three options, one of them "One of several ways" to "One of
 * several ways we stay close", and that was the option she had chosen. From
 * that commit on, her saved answer matched no option, the lookup returned
 * null, and the mark did not draw. No error. A results page quietly missing
 * half of what she said, and her conclusion, in her words: "This is making me
 * question the methodology, which is EXACTLY what I don't want a user doing."
 *
 * Five options have been reworded since the exercise shipped. Every one of
 * them silently dropped the answers already given under the old wording.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * Every option label in api/_intimacy-questions.js is compared against the
 * last committed version of that file. A label that changed has to appear in
 * RETIRED_OPTION_LABELS under its question, pointing at what it became. Then
 * the old answer still resolves and the copy edit costs nobody their results.
 *
 * In a product whose founder rewrites every customer-facing word until it is
 * right, this is the difference between a copy edit and a data loss, and it is
 * not something anyone can be expected to remember.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The other exercises. Communication, Expectations and Relationship Reflection
 * store answers by question id and option index or value rather than by
 * display copy, so editing their words costs nothing. This is scoped to the
 * one set that stores labels, and the real fix for that is a migration over
 * saved answers, which is Ellie's to run and a larger decision than a gate.
 *
 * It also cannot see an edit made in the same commit as the file it compares
 * against, which is the point: it runs before the change is committed.
 */

import { execFileSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const FILE = 'api/_intimacy-questions.js';

const live = await import(`${ROOT}${FILE}`);

/** Every option label in a module's question list, by question id. */
function labelsOf(mod) {
  const out = {};
  for (const q of mod.INTIMACY_QUESTIONS || []) {
    out[q.id] = new Set((q.options || []).map((o) => o.label).filter(Boolean));
  }
  return out;
}

/** The last committed version of the same module, loaded from git. */
let before;
try {
  const src = execFileSync('git', ['show', `HEAD:${FILE}`], { cwd: ROOT, encoding: 'utf8' });
  before = await import(`data:text/javascript;base64,${Buffer.from(src).toString('base64')}`);
} catch (e) {
  // No git history to compare against is not a pass and not a failure: there
  // is nothing to check. Say so rather than printing a green line.
  console.log(`[check-answer-labels] no committed ${FILE} to compare against; nothing checked.`);
  process.exit(0);
}

const now = labelsOf(live);
const was = labelsOf(before);
const retired = live.RETIRED_OPTION_LABELS || {};
const retiredQuestions = live.RETIRED_QUESTIONS || {};
const problems = [];

for (const [qid, oldLabels] of Object.entries(was)) {
  const current = now[qid];
  if (!current) {
    /**
     * A question can be taken out on purpose, and that is not a data loss: the
     * answers stay in the row and are simply never read again. What must not
     * happen is a question vanishing without anyone saying they meant it, so
     * the removal has to be recorded in RETIRED_QUESTIONS with a reason.
     */
    if (!retiredQuestions[qid]) {
      problems.push(
        `question ${qid} is gone and is not in RETIRED_QUESTIONS. `
        + 'Every answer stored against it becomes unreadable. Record the removal and why.');
    }
    continue;
  }
  for (const label of oldLabels) {
    if (current.has(label)) continue;
    const becomes = retired[qid]?.[label];
    if (!becomes) {
      problems.push(
        `${qid}: the option "${label}" is gone and is not in RETIRED_OPTION_LABELS. `
        + 'Every answer already given under those words stops resolving.');
    } else if (!current.has(becomes)) {
      problems.push(
        `${qid}: "${label}" is recorded as becoming "${becomes}", which is not an option either.`);
    }
  }
}

/** A retired wording that is also a live one would resolve to itself. */
for (const [qid, map] of Object.entries(retired)) {
  // A retired wording on a question that has itself been retired is dead
  // weight rather than a fault. Say so once, quietly, by skipping it.
  if (!now[qid] && retiredQuestions[qid]) continue;
  for (const [from, to] of Object.entries(map)) {
    if (now[qid]?.has(from)) {
      problems.push(`${qid}: "${from}" is listed as retired and is still an option.`);
    }
    if (!now[qid]?.has(to)) {
      problems.push(`${qid}: "${from}" points at "${to}", which is not an option.`);
    }
  }
}

if (problems.length) {
  console.error('[check-answer-labels] a copy edit is about to delete saved answers:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('Intimacy answers are stored as the option label that was on the button.');
  console.error('Record the old wording in RETIRED_OPTION_LABELS in api/_intimacy-questions.js');
  console.error('and the answers already given keep resolving.');
  process.exit(1);
}

const kept = Object.values(retired).reduce((n, m) => n + Object.keys(m).length, 0);
console.log(
  `[check-answer-labels] ${Object.keys(now).length} questions; every reworded option is recorded `
  + `(${kept} retired wordings, ${Object.keys(retiredQuestions).length} retired questions).`);
