// Fails the build if the partner's half of /api/conflict-results could carry
// anything about their conflict patterns.
//
// SCREENS.md: "This screen must never render the partner's patterns. Not behind
// a toggle, not in a debug view." The way that stays true is the server never
// sending them, so a screen built later by someone who has not read that line
// still cannot leak it.
//
// This gate runs partnerView() over a full summary and asserts that nothing
// pattern-shaped survives. It is deliberately a denylist here, on the test
// side, even though partnerView itself is an allowlist: the test should fail
// when someone adds a leaking field, and an allowlist test would silently pass.

import { readFileSync } from 'fs';

const src = readFileSync(new URL('../api/conflict-results.js', import.meta.url), 'utf8');

// Pull partnerView out of the endpoint and run it, so the gate tests the real
// function rather than a copy of it that can drift.
const start = src.indexOf('function partnerView(');
const end = src.indexOf('\n}', start) + 2;
if (start < 0) {
  console.error('[check-conflict-privacy] partnerView not found in api/conflict-results.js');
  process.exit(1);
}
const partnerView = new Function(`${src.slice(start, end)}; return partnerView;`)();

// A complete summary, shaped like summarizeConflict's output, with every
// pattern field populated so anything passed through is visible.
const fullSummary = {
  overall: 3,
  patterns: [{ id: 'c_crit', key: 'criticism', value: 3, band: 'worth_attention' }],
  ranked: [{ id: 'c_crit', key: 'criticism', value: 3, band: 'worth_attention' }],
  flagged: ['criticism', 'contempt'],
  flaggedCount: 2,
  strength: 'We say sorry quickly.',
  repairRanking: ['Space', 'Talk it through'],
  openings: { start: 0, middle: 1, oldTopics: 0 },
  reflection: 'Something written.',
  appreciation: 'Something else written.',
};

const view = partnerView(fullSummary, 'Sam');
const serialised = JSON.stringify(view);

const forbiddenKeys = ['patterns', 'ranked', 'flagged', 'flaggedCount'];
const leakedKeys = forbiddenKeys.filter(k => Object.prototype.hasOwnProperty.call(view, k));

// Values as well as keys: a pattern name surfacing under a differently named
// field is the same leak.
const forbiddenValues = ['criticism', 'contempt', 'defensiveness', 'stonewalling',
                         'worth_attention', 'worth_watching'];
const leakedValues = forbiddenValues.filter(v => serialised.includes(v));

if (leakedKeys.length || leakedValues.length) {
  console.error('[check-conflict-privacy] the partner half of /api/conflict-results leaks pattern data:');
  if (leakedKeys.length) console.error(`  fields: ${leakedKeys.join(', ')}`);
  if (leakedValues.length) console.error(`  values: ${leakedValues.join(', ')}`);
  console.error('');
  console.error('A person\'s conflict patterns are never shown to their partner.');
  console.error('Keep partnerView an allowlist. Do not add a field that carries');
  console.error('pattern values, bands, flags, or a count of them.');
  process.exit(1);
}

// The half that must survive, or the results screens have nothing to show.
const required = ['overall', 'repairRanking', 'openings', 'reflection'];
const missing = required.filter(k => !Object.prototype.hasOwnProperty.call(view, k));
if (missing.length) {
  console.error(`[check-conflict-privacy] partnerView dropped fields the screens need: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`[check-conflict-privacy] partner half carries ${Object.keys(view).length} fields, none pattern-related.`);
