// Fails the build when Physical Intimacy answers reach a surface that has no
// business with them.
//
// ── THE PROMISE THIS KEEPS ─────────────────────────────────────────────────
// The exercise intro tells the customer, in words that ship:
//
//   "You answer on your own. Neither of you sees the other's answers until you
//    have both finished."
//
// Until, not never. And the catalogue sells the exercise as "Answered
// independently, compared side by side". So the promise is about *timing* and
// about *who*, and it is not a promise of secrecy between partners.
//
// The rule, therefore:
//
//   1. Nothing about either person's answers leaves the server until BOTH have
//      finished. That is the whole of what was promised.
//   2. Positions may be shared between the two partners once both are done,
//      because the comparison is the thing they bought.
//   3. Nobody else ever sees them, in any form.
//
// ── WHAT THIS GATE USED TO CHECK, AND WHY THAT WAS WRONG ───────────────────
// It asserted the payload carried no positions at all, and no question ids.
// That was a privacy rule invented in this repo rather than one the product
// made. It did not protect anyone: both partners are entitled to the
// comparison. What it did was stop the app drawing a screen the website has
// always had, so the two surfaces disagreed about what a customer had bought.
//
// The check is narrower and truer now. What changed is which surfaces are
// allowed, not whether anything is checked.
//
// ── WHAT THIS DELIBERATELY DOES NOT COVER ──────────────────────────────────
// Conflict Patterns, which carry a real promise of secrecy from the partner
// ("This is the one section that stays private, always") and are guarded by
// check-conflict-privacy.mjs and check-partner-privacy.mjs. Do not merge these
// rules: they are different promises, and collapsing them would either leak
// patterns or delete the intimacy comparison.

import { readFileSync, readdirSync } from 'fs';
import { INTIMACY_QUESTIONS } from '../api/_intimacy-questions.js';
import { intimacyResults } from '../api/_lib/intimacy-results.js';
import { insideResponse, isComment, holdsColumn } from './_lib/source-scan.mjs';
import { EXERCISE_COLUMNS } from '../api/_exercises.js';

const problems = [];

// ── 1. Nothing is produced until both partners have finished ───────────────
const answers = {};
for (const q of INTIMACY_QUESTIONS) {
  answers[q.id] = q.kind === 'multi' ? [q.options[0].value] : q.options[0].label;
}

if (intimacyResults({ mine: { answers }, theirs: null }) !== null) {
  problems.push('a payload was produced with only one partner finished');
}
if (intimacyResults({ mine: null, theirs: { answers } }) !== null) {
  problems.push('a payload was produced with only the partner finished');
}

// ── 2. What both partners may see, once both are done ──────────────────────
const both = intimacyResults({ mine: { answers }, theirs: { answers }, variant: 'premarital' });
if (!both) {
  problems.push('no payload was produced when both partners had finished');
} else {
  // `promptLabel` is the two words the website prints above every prompt,
  // "Talk about it". It was typed inline in src/App.jsx, so the app printed
  // each prompt as a bare heading with nothing saying it was a question to
  // ask. Copy, not an answer, and the same for every couple.
  const ALLOWED_TOP = ['overallState', 'overallDistancePct', 'dimensions', 'conversations', 'promptLabel'];
  // `positions` is the two partners' averages over the questions in this
  // dimension. It is an aggregate of `questions`, which is already listed
  // below and is the whole point of the screen, so it exposes nothing new: it
  // exists because the website's overview plots each partner on a track and
  // the app only had the distance between them. Listed deliberately, because
  // this allowlist is the promise and a field nobody declared is a field
  // nobody thought about.
  // `poles` is the two ends of the dimension's scale, from the question
  // registry. It is the same pair for every couple and says nothing about
  // either person: it is the axis the positions are plotted on. Without it the
  // app drew a track with no ends, which is a mark on an unlabelled line.
  const ALLOWED_DIM = ['section', 'id', 'label', 'intro', 'poles', 'state', 'distancePct', 'positions', 'ground',
    'body', 'reason', 'prompt', 'questions'];
  const ALLOWED_ROW = ['id', 'text', 'low', 'high', 'you', 'them'];

  const extraTop = Object.keys(both).filter((k) => !ALLOWED_TOP.includes(k));
  if (extraTop.length) problems.push(`payload carries unlisted fields: ${extraTop.join(', ')}`);

  for (const d of both.dimensions) {
    const extra = Object.keys(d).filter((k) => !ALLOWED_DIM.includes(k));
    if (extra.length) problems.push(`dimension ${d.id} carries unlisted fields: ${extra.join(', ')}`);
    for (const row of d.questions || []) {
      const extraRow = Object.keys(row).filter((k) => !ALLOWED_ROW.includes(k));
      if (extraRow.length) problems.push(`a ${d.id} row carries unlisted fields: ${extraRow.join(', ')}`);
      // Positions are numbers on a shared scale. A raw answer label reaching
      // the client would be the answer itself rather than a position, and the
      // website has never shown one.
      for (const side of ['you', 'them']) {
        if (row[side] != null && typeof row[side] !== 'number') {
          problems.push(`${d.id}/${row.id} sends ${side} as ${typeof row[side]}, not a position`);
        }
      }
    }
  }

  // The comparison must actually be there. A gate that only removes things
  // eventually removes the feature, which is how this one went wrong before.
  const withRows = both.dimensions.filter((d) => (d.questions || []).length > 0);
  if (!withRows.length) {
    problems.push('no dimension carries any side-by-side rows; the comparison is the product');
  }
}

// ── 3. Nobody but the two partners, ever ───────────────────────────────────
// intimacy_data is the raw record. /api/results reads it to build the payload
// above, and /api/partner-sync passes it to the person it belongs with. Any
// other endpoint returning it is sending it somewhere it was never promised.
const apiDir = new URL('../api/', import.meta.url);

// Endpoints that legitimately handle it, and the reason each is allowed.
const ALLOWED_ENDPOINTS = new Map([
  // Builds the compared payload checked above.
  ['results.js', 'builds the side-by-side comparison'],
  // Hands one partner the other's record, which is the exercise working.
  ['partner-sync.js', 'serves the linked partner, which is the comparison'],
  // Writes it.
  ['save-exercise.js', 'stores the answers'],
  // Removes it.
  ['delete-account.js', 'deletes and archives on request'],
]);

let checked = 0;
function scan(dir, prefix = '') {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) { scan(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`); continue; }
    if (!entry.name.endsWith('.js')) continue;
    const rel = `${prefix}${entry.name}`;
    const text = readFileSync(new URL(entry.name, dir), 'utf8');
    // Named directly, or selected through EXERCISE_COLUMNS.
    if (!holdsColumn(text, 'intimacy_data', EXERCISE_COLUMNS)) continue;
    checked++;
    if (ALLOWED_ENDPOINTS.has(rel)) continue;

    // Whether the column is inside a response is decided by
    // scripts/_lib/source-scan.mjs, shared with check-partner-privacy.mjs.
    // Both gates got this wrong the same two ways before it was shared.
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      if (isComment(line)) return;
      if (!line.includes('intimacy_data')) return;
      if (insideResponse(lines, i)) {
        problems.push(`api/${rel}:${i + 1} returns intimacy_data, and is not one of the endpoints allowed to`);
      }
    });
  }
}
scan(apiDir);

if (problems.length) {
  console.error('[check-intimacy-privacy] intimacy answers are going somewhere they should not:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('The promise is that neither partner sees the other\'s answers until both');
  console.error('have finished, and that the comparison is then theirs. Nothing before');
  console.error('both are done, nothing to anyone else, and the comparison stays intact.');
  process.exit(1);
}

console.log(`[check-intimacy-privacy] nothing before both finish; ${checked} endpoints touch intimacy_data, only the ${ALLOWED_ENDPOINTS.size} that must.`);
