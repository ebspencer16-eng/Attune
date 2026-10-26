/**
 * Nobody gets into Attune without answering the setup questions.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Ellie, of Rebecca: "Prompt rebecca to do her profile setup, this was a miss
 * to allow her to take a backdoor into attune, we need to ensure that users
 * always have to complete their demos."
 *
 * There was no back door in the usual sense. "Prefer not to say" was the first
 * option on all five questions and its value was the empty string, which
 * create-profile stores as null, which is also what it stores for somebody who
 * never saw the form. So the default answer was "declined", the product could
 * not tell declining from skipping, and anybody who clicked through was
 * recorded as having answered nothing.
 *
 * ── WHAT IT HOLDS ─────────────────────────────────────────────────────────
 *   1. Declining has a value of its own, and it is not the empty string.
 *   2. Every question offers it, because requiring an answer without a way to
 *      decline is a form somebody cannot honestly finish.
 *   3. Nothing is pre-selected: the first option is a placeholder with an
 *      empty value, so the form does not answer on anybody's behalf.
 *   4. Every question the form asks is required by the completeness rule, and
 *      every column that rule reads is selected by the endpoint that reads it.
 *
 * Four is the one that matters most and is the easiest to get wrong in either
 * direction: a question added to the form and not to the rule is a question
 * nothing checks, and a column in the rule that the select does not ask for
 * arrives undefined, which reads as "not answered" for every account at once.
 *
 * ── WHAT IT DOES NOT COVER ────────────────────────────────────────────────
 * Whether the form refuses to submit. That is two surfaces' worth of client
 * code and is checked by driving them, not by reading. This holds the data
 * rule underneath: what counts as finished, and that the server can see it.
 */
import { readFileSync } from 'node:fs';
import { ABOUT_YOU, PREFER_NOT_TO_SAY } from '../api/_lib/profile-setup-copy.js';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

// ── 1, 2, 3: the options ─────────────────────────────────────────────────
if (!PREFER_NOT_TO_SAY || typeof PREFER_NOT_TO_SAY !== 'string') {
  fails.push('there is no value for declining to answer.');
} else if (!PREFER_NOT_TO_SAY.trim()) {
  fails.push('declining is stored as an empty string again, which is the same thing the database holds'
    + ' for somebody who never saw the form. That is the bug this exists about.');
}

const fields = ABOUT_YOU.fields || [];
if (fields.length < 3) fails.push(`ABOUT_YOU has ${fields.length} questions; the matcher has lost its subject.`);

for (const f of fields) {
  const opts = f.options || [];
  const values = opts.map((o) => o[0]);
  if (values[0] !== '') {
    fails.push(`${f.key}'s first option has the value ${JSON.stringify(values[0])}, so the form arrives with`
      + ' an answer already chosen and somebody who touches nothing is recorded as having said it.');
  }
  if (!values.includes(PREFER_NOT_TO_SAY)) {
    fails.push(`${f.key} offers no way to decline, so requiring an answer makes it a question nobody can`
      + ' honestly finish.');
  }
  const blanks = values.filter((v) => v === '').length;
  if (blanks > 1) fails.push(`${f.key} has ${blanks} options with an empty value; only the placeholder may.`);
}

// ── 4: the form, the rule and the select agree ───────────────────────────
const home = readFileSync(`${ROOT}api/home.js`, 'utf8');
const m = /const DEMOGRAPHIC_COLUMNS = \[([^\]]*)\]/.exec(home);
if (!m) {
  fails.push('api/home.js no longer names DEMOGRAPHIC_COLUMNS, so nothing says which questions are required.');
} else {
  const required = m[1].split(',').map((x) => x.trim().replace(/^'|'$/g, '')).filter(Boolean);

  /* `ageRange` is the column `age_range`. Converted rather than listed twice:
     a second list is the thing this gate is about. */
  const colOf = (key) => key.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
  for (const f of fields) {
    const col = colOf(f.key);
    if (!required.includes(col)) {
      fails.push(`the form asks "${f.label}" (${col}) and the completeness rule does not require it, so it is`
        + ' a question nothing checks.');
    }
  }
  for (const col of required) {
    if (!fields.some((f) => colOf(f.key) === col)) {
      fails.push(`the rule requires ${col} and the form never asks it, so nobody can finish setup.`);
    }
  }

  /* The select has to ask for them. A column that is not selected arrives
     undefined, which reads as "not answered" for every account at once. */
  const stripped = home.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, '');
  if (!/\.\.\.DEMOGRAPHIC_COLUMNS/.test(stripped)) {
    fails.push('api/home.js requires these columns and does not select them. They arrive undefined, so every'
      + ' account on the system reads as having an incomplete profile.');
  }
  if (!required.every((c) => new RegExp('\\b' + c + '\\b').test(stripped))) {
    fails.push('a required column is named nowhere else in api/home.js.');
  }
}

if (fails.length) {
  console.error('[check-setup-required] setup can be skipped, or cannot be finished:');
  for (const f of [...new Set(fails)]) console.error('  ✖ ' + f);
  process.exit(1);
}

console.log(`[check-setup-required] ${fields.length} setup questions, each offering "${PREFER_NOT_TO_SAY}" as a real`
  + ' stored answer and none of them pre-selected, each required by the completeness rule in api/home.js, and'
  + ' every column that rule reads is in the select beside it. Declining is still one click.');
