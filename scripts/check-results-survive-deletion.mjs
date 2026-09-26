// Fails the build when the remaining partner would lose their results.
//
// ── THE PROMISE ────────────────────────────────────────────────────────────
// The published retention policy says: "If one partner deletes their account,
// we will anonymize that partner's responses in the joint results display. The
// other partner retains access to their own responses and the portions of the
// joint results derived solely from their own answers."
//
// They lost all of it. couple_results declared both partner columns ON DELETE
// CASCADE, so deleting either person deleted the couple's one frozen row, and
// api/delete-account.js nulled the survivor's link, so api/results.js answered
// ready:false. Someone who paid, finished, and read their results opened the
// app and was told they were waiting on a partner who no longer existed.
// Results are frozen: there was nothing left to recompute from.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// The behaviour, by running the anonymiser over a payload shaped like a stored
// one, rather than by matching on names in the source. Gates in this repo that
// run the code have held under every plant; the ones that match a literal have
// not.
//
//   1. The departed partner's name does not survive anywhere, including inside
//      prose that was rendered when the results were computed and cannot be
//      re-rendered.
//   2. The survivor's own name does.
//   3. The scores stay. The policy says anonymize, and removing the scores
//      would take every joint section with them, which is the outcome this
//      exists to prevent.
//   4. The stored payload is not mutated: results are frozen, and a read that
//      edits them is a read that changes what someone already saw.
//
// And three things about the path, which cannot be run without a database:
//   5. delete-account marks the survivor, or "my partner deleted their
//      account" and "I never linked with anyone" stay the same state.
//   6. results.js reads that mark and serves the stored row.
//   7. Migration 059 changes the foreign keys, or there is no row to serve.

import { readFileSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(`${ROOT}${f}`, 'utf8');

const problems = [];

// ── Run the anonymiser ────────────────────────────────────────────────────
const src = read('api/results.js');
const start = src.indexOf('const DEPARTED =');
/**
 * The next function down, whether or not it is exported.
 *
 * This looked for '\nfunction withContent(' exactly, and the day withContent
 * gained a named export so another check could run it, this one lost its end
 * marker and refused to pass. It was right to refuse rather than to guess,
 * which is the behaviour worth keeping; what was wrong is that a slice of a
 * file was anchored on a keyword that has nothing to do with the thing being
 * sliced.
 */
const endAt = src.search(/\n(?:export\s+)?function withContent\(/);
const end = endAt;
if (start < 0 || end < 0 || end < start) {
  console.error('[check-results-survive-deletion] cannot find anonymizePartner in api/results.js.');
  console.error('  Refusing to pass: this gate tests behaviour, and it has nothing to run.');
  process.exit(1);
}
const mod = await import(
  'data:text/javascript,'
  + encodeURIComponent(src.slice(start, end) + '\nexport { anonymizePartner, DEPARTED };')
);

const stored = Object.freeze({
  names: { a: 'Sarah', b: 'James' },
  partnerName: 'James',
  coupleType: { headline: 'Sarah and James both lead with warmth.' },
  sections: [{ id: 'comm-overview', body: 'James tends to withdraw; Sarah reaches.' }],
  dimensions: [{ key: 'energy', a: 0.7, b: 0.4 }],
});
const input = JSON.parse(JSON.stringify(stored));
const out = mod.anonymizePartner(input, 'a');
const text = JSON.stringify(out);

if (text.includes('James')) {
  problems.push('the departed partner\'s name survives the anonymiser, including in frozen prose.');
}
if (!text.includes('Sarah')) {
  problems.push('the surviving partner\'s own name was removed. It is their name and their results.');
}
if (out.dimensions?.[0]?.b !== 0.4) {
  problems.push(
    'the departed partner\'s scores were removed.\n'
    + '      The policy says anonymize, and removing them takes every joint section\n'
    + '      with them, which is the outcome this exists to prevent.');
}
if (JSON.stringify(input) !== JSON.stringify(stored)) {
  problems.push(
    'the anonymiser mutated the payload it was given.\n'
    + '      Results are frozen. A read that edits them changes what someone has\n'
    + '      already seen.');
}
if (!out.names || out.names.b === 'James' || !String(out.names.b || '').trim()) {
  problems.push('the departed partner has no label in place of their name.');
}

// ── The path around it ────────────────────────────────────────────────────
// Comments blanked. The first version matched partner_deleted_at in the
// comment that explains it, so removing the write changed nothing it could
// see. That is the third time a gate here has read its target's prose as
// evidence.
const strip = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|\s)\/\/[^\n]*/g, ' ');
const del = strip(read('api/delete-account.js'));
if (!/partner_deleted_at/.test(del)) {
  problems.push(
    'api/delete-account.js does not set partner_deleted_at on the survivor.\n'
    + '      Without it, "my partner deleted their account" and "I never linked\n'
    + '      with anyone" are the same state, and the product shows the second.');
}
if (!/deleted_partner_at/.test(del)) {
  problems.push('api/delete-account.js does not mark the couple_results row as half orphaned.');
}
const srcCode = strip(src);
if (!/partnerDeletedAt/.test(srcCode) || !/couple_results\?or=/.test(srcCode)) {
  problems.push('api/results.js does not look for the survivor\'s stored row, so it serves them nothing.');
}

const migration = (() => {
  try { return read('supabase/migrations/059_results_survive_deletion.sql'); } catch { return ''; }
})();
if (!/on delete set null/i.test(migration) || !/couple_results/.test(migration)) {
  problems.push(
    'migration 059 does not change couple_results to ON DELETE SET NULL.\n'
    + '      The row is deleted with the account and there is nothing to serve.');
}

if (problems.length) {
  console.error('[check-results-survive-deletion] the remaining partner loses their results:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(
  '[check-results-survive-deletion] the departed name is gone, the survivor\'s is not, '
  + 'the scores stay, and the frozen payload is untouched.');
