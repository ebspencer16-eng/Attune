// Fails the build if /api/results stops telling clients which partner is asking.
//
// Stored results are keyed by the two user ids in sorted order (orderPair in
// _lib/results-store.js), and each partner's answers travel with them through
// that sort. So results.partners.a is whichever id sorts lower, never "the
// person reading".
//
// The obvious assumption is that a is you. It is wrong for exactly one partner
// in every couple, and it fails quietly: names swap and both marks on every
// scale land on the other person's value. Nothing errors, and the results look
// entirely plausible while describing the wrong person.
//
// This checks the payload still carries `viewer`, and that the app resolves
// through it rather than reading partners.a directly for display.

import { readFileSync } from 'fs';

const problems = [];

const results = readFileSync(new URL('../api/results.js', import.meta.url), 'utf8');
// Matched on its own line rather than by distance from `content: {`. The first
// version windowed 600 characters after that brace and failed the moment the
// explanatory comment above `viewer` grew past it, which is a gate breaking for
// a reason that has nothing to do with the bug it exists to catch.
if (!/^\s*viewer,\s*$/m.test(results)) {
  problems.push('api/results.js no longer puts `viewer` in the content block.');
}
if (!/orderPair\(/.test(results)) {
  problems.push('api/results.js should derive viewer with orderPair, not its own id comparison.');
}
if (!/alignmentThreshold/.test(results)) {
  problems.push('api/results.js no longer sends alignmentThreshold, so clients will invent their own.');
}

const app = readFileSync(
  new URL('../attune-app/src/components/results.tsx', import.meta.url), 'utf8');
if (!/content\?\.viewer/.test(app)) {
  problems.push('attune-app results.tsx no longer reads content.viewer; it is assuming a is the reader.');
}
// Names must be chosen through viewer, never read straight off `a`.
if (/const you = content\?\.names\?\.a/.test(app)) {
  problems.push('attune-app results.tsx reads names.a as "you". That is wrong for half of couples.');
}
// The gap wording must not carry its own numbers.
if (/dim\.gap\s*[<>]=?\s*[0-9]/.test(app)) {
  problems.push('attune-app results.tsx compares a gap against a hardcoded number. Use alignmentThreshold.');
}

if (problems.length) {
  console.error('[check-results-viewer] results would describe the wrong person, or invent a threshold:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('partners.a is whichever user id sorts lower, not whoever is reading.');
  process.exit(1);
}

console.log('[check-results-viewer] viewer side and alignment threshold both come from the server.');
