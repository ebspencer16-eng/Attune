// Fails the build if the intimacy payload can carry raw answers.
//
// Same rule as check-conflict-privacy.mjs, for the section that needs it most.
// Physical Intimacy asks people what they want, how often, and what it is for.
// The results screens are about the distance between two answers, and that
// distance is all any of them render, so nothing else has any business
// crossing the wire.
//
// An allowlist, never a denylist. A denylist protects the fields someone
// thought of on the day they wrote it.

import { INTIMACY_QUESTIONS } from '../api/_intimacy-questions.js';
import { intimacyResults } from '../api/_lib/intimacy-results.js';

const ALLOWED_TOP = ['overallState', 'overallDistancePct', 'dimensions', 'conversations'];
const ALLOWED_DIM = ['section', 'id', 'label', 'intro', 'state', 'distancePct', 'body', 'reason', 'prompt'];

// Answers that are individually identifying if they escape: distinct strings
// planted so they can be searched for in the serialised payload.
const mine = {}, theirs = {};
for (const q of INTIMACY_QUESTIONS) {
  if (q.kind === 'multi') {
    mine[q.id] = [q.options[0].value];
    theirs[q.id] = [q.options[q.options.length - 1].value];
  } else {
    mine[q.id] = q.options[0].label;
    theirs[q.id] = q.options[q.options.length - 1].label;
  }
}

const payload = intimacyResults({ mine: { answers: mine }, theirs: { answers: theirs } });
const problems = [];

const extraTop = Object.keys(payload).filter((k) => !ALLOWED_TOP.includes(k));
if (extraTop.length) problems.push(`payload carries unlisted fields: ${extraTop.join(', ')}`);

for (const d of payload.dimensions) {
  const extra = Object.keys(d).filter((k) => !ALLOWED_DIM.includes(k));
  if (extra.length) problems.push(`dimension ${d.id} carries unlisted fields: ${extra.join(', ')}`);
}

// No question id should appear anywhere in the payload: a per-question field
// is per-answer data by another name.
const serialised = JSON.stringify(payload);
for (const q of INTIMACY_QUESTIONS) {
  if (serialised.includes(q.id)) problems.push(`question id ${q.id} reaches the client`);
}

// And no answer label either.
const labels = new Set();
for (const q of INTIMACY_QUESTIONS) for (const o of q.options || []) if (o.label) labels.add(o.label);
for (const label of labels) {
  if (serialised.includes(label)) problems.push(`answer label "${label}" reaches the client`);
}

if (problems.length) {
  console.error('[check-intimacy-privacy] the intimacy payload leaks:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('These screens render a distance between two answers. Add the field to');
  console.error('the allowlist here only if a screen genuinely needs it, and never add');
  console.error('anything that says what either person answered.');
  process.exit(1);
}

console.log(`[check-intimacy-privacy] ${payload.dimensions.length} dimensions, no answers, no question ids.`);
