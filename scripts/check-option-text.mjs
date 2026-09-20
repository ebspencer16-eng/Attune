#!/usr/bin/env node
/**
 * An intimacy option says the same thing while answering and afterwards.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * An option has a `label`, which is what a stored answer says and what the
 * scoring reads, and it may carry a `premarital` and a `married` wording,
 * which are what a person sees. Wherever an option is shown to someone, they
 * see the variant wording. Nobody shows them the storage label.
 *
 * ── WHY IT EXISTS ─────────────────────────────────────────────────────────
 * That split is the only way to reword a question without orphaning every
 * answer already given to it, and Ellie asked for exactly that on 20
 * September: "Change this for users who have already taken it as well, they
 * mean the same thing this is just more clear."
 *
 * It was half wired. The exercise payload read the variant wording. The
 * results read `label`: for the two poles of every side-by-side row, and for
 * every multi-select pick. So a reworded option said one thing while you
 * answered it and a different thing on the page that showed you the answer,
 * and nothing anywhere would have said so. It is the failure this repo is
 * organised against, in two words instead of two lists.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * By running both paths. Every option that carries a variant wording is
 * followed through `intimacyResults` and through the shape `api/questions.js`
 * sends the app, and neither may come back with the storage label.
 *
 * A scanner would not do: the label and the wording are both strings on the
 * same object, and reading the wrong one is a valid program.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The middle options of a scale question. A side-by-side row draws the two
 * ends and a mark on the track between them, and never prints the three in
 * between, so holding them to appearing would fail on correct code. Their
 * wording still matters in the exercise, which section 2 covers.
 *
 * Whether the wording is good. That is Ellie's.
 */

import { readFileSync } from 'fs';
import {
  INTIMACY_QUESTIONS, RETIRED_QUESTIONS, optionText,
} from '../api/_intimacy-questions.js';
import { intimacyResults } from '../api/_lib/intimacy-results.js';

const ROOT = new URL('..', import.meta.url).pathname;
const problems = [];
const VARIANTS = ['premarital', 'married'];

// ── 1. Every option the results actually name, through the results ─────────
//
// Which is not every option. A scale question's side-by-side row draws its two
// ENDS and a position on the track between them; the three middle wordings are
// never printed anywhere, so asking for them would be a gate failing on code
// that is correct. A multi question prints every pick.
//
// One answer at a time, so a row cannot pass because its other end happened to
// be right.
let checked = 0;
for (const q of INTIMACY_QUESTIONS) {
  if (RETIRED_QUESTIONS[q.id]) continue;
  const scored = (q.options || []).filter((o) => o.value != null)
    .slice().sort((a, b) => a.value - b.value);
  const shownByResults = q.multi
    ? new Set(scored.map((o) => o.label))
    : new Set([scored[0]?.label, scored[scored.length - 1]?.label]);
  for (const o of q.options || []) {
    if (o.value == null) continue;
    if (!shownByResults.has(o.label)) continue;
    for (const variant of VARIANTS) {
      const shown = optionText(o, variant);
      if (shown === o.label) continue; // nothing reworded here
      checked += 1;

      const answers = { [q.id]: q.multi ? [o.value] : o.label };
      const res = intimacyResults({ mine: answers, theirs: {}, variant });
      const text = JSON.stringify(res);

      if (!text.includes(shown)) {
        problems.push(
          `${q.id}/"${o.label}": the results never say "${shown}" under ${variant}.`,
        );
      }
      if (text.includes(`"${o.label}"`)) {
        problems.push(
          `${q.id}: the results show the storage label "${o.label}" under ${variant}, `
          + `where a reader should see "${shown}".`,
        );
      }
    }
  }
}

if (!checked) {
  // A gate that has lost its subject must never report success.
  console.error('[check-option-text] no reworded option found at all; refusing to pass.');
  process.exit(1);
}

// ── 2. And the exercise payload sends the wording, not the label ───────────
//
// api/questions.js builds this inline inside a handler that needs a request
// and a database, so the shape is read rather than executed. Both halves are
// named: `label` takes the variant, and `labels` carries both wordings.
const questions = readFileSync(`${ROOT}api/questions.js`, 'utf8');
const SHAPE = [
  [/label:\s*o\[variant\]\s*\|\|\s*o\.label/, 'sends the variant wording as the option label'],
  [/premarital:\s*o\.premarital\s*\|\|\s*o\.label/, 'sends the premarital wording'],
  [/married:\s*o\.married\s*\|\|\s*o\.label/, 'sends the married wording'],
];
for (const [re, what] of SHAPE) {
  if (!re.test(questions)) problems.push(`api/questions.js no longer ${what}.`);
}

// ── 3. And both renderers read it through the one helper ───────────────────
//
// The website draws intimacy from the question bank directly rather than from
// the results payload, so it is a second reader of the same rule and has to be
// held to it by name. It read `label` for both ends of every bar and matched
// stored answers on `label` alone, so a reworded option said the app's words
// on a phone and the storage words on a laptop, and an answer given under a
// retired wording was drawn by one and dropped by the other.
const READERS = [
  ['api/_lib/intimacy-results.js', [
    [/optionText\(/, 'reads option wordings through optionText'],
  ]],
  ['src/App.jsx', [
    [/lo: optionText\(lo, variant\)/, 'draws the low end in the reader\'s wording'],
    [/hi: optionText\(hi, variant\)/, 'draws the high end in the reader\'s wording'],
    [/const o = intimacyOption\(q, ans\)/, 'resolves a stored answer through intimacyOption, retired wordings included'],
  ]],
];
for (const [file, needs] of READERS) {
  const text = readFileSync(ROOT + file, 'utf8');
  for (const [re, what] of needs) {
    if (!re.test(text)) problems.push(`${file} no longer ${what}.`);
  }
}

if (problems.length) {
  console.error('[check-option-text] an option says different things in two places:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('`label` is storage. A reader sees the variant wording, which is what');
  console.error('lets a question be reworded without orphaning the answers already');
  console.error('given to it. See optionText in api/_intimacy-questions.js.');
  process.exit(1);
}

console.log(
  `[check-option-text] ${checked} reworded option/variant pairs; `
  + 'every one reaches the results in the wording the reader chose.',
);
