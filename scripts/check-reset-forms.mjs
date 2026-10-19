#!/usr/bin/env node
/**
 * Every answer to the reset question has a form the results can say out loud.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Ellie: "Reframe 'the thing you do that most often helps you reset
 * mid-conflict' results section to say 'To help reset mid-conflict' then
 * adjust tense of the answers to say ellie 'Asks a clarifying question' and
 * Preston 'Uses humor'."
 *
 * The question asks somebody about themselves, so its options are gerunds:
 * "Asking a clarifying question". The results page talks about two people in
 * the third person and wants "Asks a clarifying question". Same answer, a
 * different sentence around it.
 *
 * That is a second list beside a first one, which is the shape of every
 * serious bug in this codebase. The list cannot be derived, because turning a
 * gerund into a verb is English rather than arithmetic, so it is gated
 * instead: an option with no form, or a form with no option, fails the build.
 *
 * ── WHY IT MATTERS MORE THAN IT LOOKS ─────────────────────────────────────
 * `resetForm` falls back to the answer as stored, which is right: a couple
 * who answered last year must not lose their answer because somebody edited
 * the list. But that fall-back is also what would hide a missing form, and
 * the symptom is one person's line reading "Taking a break" beside the
 * other's "Uses humor". Nothing errors, nothing looks broken, and it is
 * wrong on exactly the pages Ellie reads.
 */

import { CONFLICT_QUESTIONS } from '../api/_conflict-questions.js';
import { RESET_FORMS, RESET_TITLE, resetForm } from '../api/_conflict-results-prose.js';

const fails = [];
const q = CONFLICT_QUESTIONS.find((x) => x.id === 'c8');

if (!q || !Array.isArray(q.options) || q.options.length < 3) {
  console.error('[check-reset-forms] question c8 is not where it was, or has no options.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

for (const option of q.options) {
  if (!RESET_FORMS[option]) {
    fails.push(`"${option}" is an answer somebody can pick and has no reported form.\n`
      + '      It would be printed as written, beside another answer that was rewritten,\n'
      + '      and nothing would error. Add it to RESET_FORMS.');
  }
}
for (const key of Object.keys(RESET_FORMS)) {
  if (!q.options.includes(key)) {
    fails.push(`RESET_FORMS has "${key}" and nobody can pick it. Either the option was`
      + ' renamed, which orphans every stored answer that says the old thing, or this is left over.');
  }
}

/* And the forms are actually different, or the table is doing nothing. */
const same = q.options.filter((o) => RESET_FORMS[o] === o);
if (same.length) {
  fails.push(`${same.length} form(s) are identical to the option: ${same.join(', ')}.`
    + ' The point of the table is the change of tense.');
}

/* Run it, rather than reading it: the fall-back is the half that hides a gap. */
if (resetForm('Using humor') !== 'Uses humor') {
  fails.push(`resetForm('Using humor') gave "${resetForm('Using humor')}" and should give`
    + ' "Uses humor", which is the example Ellie wrote.');
}
if (resetForm('Something nobody has ever picked') !== 'Something nobody has ever picked') {
  fails.push('an unknown answer is not returned as stored. A couple who answered before'
    + ' the list changed must keep their answer.');
}
if (RESET_TITLE.toLowerCase().includes('the thing you do')) {
  fails.push(`the heading is still the question's own text: "${RESET_TITLE}".`);
}

if (fails.length) {
  console.error('\n check-reset-forms: an answer would be printed in the wrong voice.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`[check-reset-forms] ${q.options.length} answers to the reset question, every one`
  + ` with a form the results can say in the third person, under "${RESET_TITLE}". An answer`
  + ' nobody can pick any more is still printed as it was stored.');
