#!/usr/bin/env node
/**
 * The anonymous handles have one implementation, and both ends use the names.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * A cut made on the admin page is evaluated on the page, where the cut is
 * defined, and sent to the server as the people or the couples it keeps. The
 * handle is a non-reversible hash: `couple_id` for a pair, `person` for one
 * person, both minted by api/admin-explore.js onto every cube row.
 *
 * Three endpoints read one of them back. That is two sides agreeing about a
 * hash and about a field name, which is the exact shape this codebase fails
 * at, so both halves are held here.
 *
 * ── WHY IT MATTERS MORE THAN IT LOOKS ─────────────────────────────────────
 * A disagreement does not throw. The server resolves nobody, and the honest
 * answers would be "nought people", which reads like a finding rather than
 * like a fault: the Engagement page drew exactly that for months on every
 * derived cut. Both callers now refuse a cut that matched nothing and say so,
 * and this gate stops the rename that would cause it.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the two endpoints resolve "does this person have a partner" the
 * same way. They read different queries to answer it and pass the answer in,
 * which is why the RULE is shared and the lookups are not. A difference there
 * shows up as a lower n on a cut, and the `matched`/`people` figure in each
 * reply is what makes it visible.
 */
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');
/* Comments blanked before any search: a file that explains what the old
   mechanism was must not fail for naming it. */
const code = (p) => read(p)
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const MODULE = 'api/_lib/couple-id.js';
const fail = [];

/* ── One implementation ─────────────────────────────────────────────────── */
const mod = code(MODULE);
for (const name of ['coupleHash', 'coupleKeyOf', 'anonCoupleId', 'anonPersonId']) {
  if (!new RegExp('export function ' + name + '\\s*\\(').test(mod)) {
    fail.push(`${MODULE} no longer exports ${name}; this gate has lost its subject`);
  }
}

/* The arithmetic itself, so a copy pasted elsewhere is caught even when it is
   given a different name. `h * 31` with a base-36 string is the hash. */
const HASH_SHAPE = /\*\s*31\s*\+[\s\S]{0,120}toString\(36\)/;
const FILES = [
  'api/admin-explore.js', 'api/admin-data.js', 'api/admin-survey.js',
  'api/admin-engagement.js', 'public/admin.html',
];
for (const f of FILES) {
  if (HASH_SHAPE.test(code(f))) {
    fail.push(`${f} computes the handle itself. It must import from ${MODULE}: two copies of a hash is two different handles the day one of them is edited.`);
  }
}

/* ── Every reader imports it ────────────────────────────────────────────── */
const IMPORTERS = {
  'api/admin-explore.js': ['anonCoupleId', 'anonPersonId'],
  'api/admin-data.js': ['anonCoupleId'],
  'api/admin-survey.js': ['anonCoupleId'],
  'api/admin-engagement.js': ['anonPersonId'],
};
for (const [f, names] of Object.entries(IMPORTERS)) {
  const src = code(f);
  /* The import with its PATH, not the bare name: `[^'"]*couple-id.js` would
     be satisfied by a different module whose name ends the same way, which is
     the mistake `[^'"]*alignment.js` already made here once. */
  const imp = /import\s*\{([^}]*)\}\s*from\s*'\.\/_lib\/couple-id\.js'|import\s*\{([^}]*)\}\s*from\s*'\.\/couple-id\.js'/.exec(src);
  if (!imp) { fail.push(`${f} does not import from ${MODULE}`); continue; }
  const got = (imp[1] || imp[2]).split(',').map((x) => x.trim());
  for (const n of names) {
    if (!got.includes(n)) fail.push(`${f} must import ${n} from ${MODULE}; it imports ${got.join(', ') || 'nothing'}`);
    if (!new RegExp('\\b' + n + '\\s*\\(').test(src)) {
      fail.push(`${f} imports ${n} and never calls it. An import that is not called is not a mechanism.`);
    }
  }
}

/* ── The field names, on both sides ─────────────────────────────────────── */
const explore = code('api/admin-explore.js');
const survey = code('api/admin-survey.js');
const page = code('public/admin.html');
const SENT = [
  ['api/admin-explore.js', explore, /couple_id:/, 'couple_id', 'every cube row'],
  ['api/admin-explore.js', explore, /person:\s*anonPersonId\(/, 'person', 'every cube row'],
  ['api/admin-explore.js', explore, /owner_row:/, 'owner_row', 'every order row'],
  ['api/admin-survey.js', survey, /couple:\s*coupleOf\[/, 'couple', 'every survey response'],
];
for (const [f, src, re, name, where] of SENT) {
  if (!re.test(src)) fail.push(`${f} no longer puts \`${name}\` on ${where}, and the page cuts by it`);
}
const READ = [
  [/\.couple_id\b/, 'couple_id', 'the response-bundle cut'],
  [/\.person\b/, 'person', 'the Engagement cut'],
  [/\.owner_row\b/, 'owner_row', 'the order and survey joins'],
  [/r\.couple\b/, 'couple', 'the Feedback cut'],
];
for (const [re, name, what] of READ) {
  if (!re.test(page)) fail.push(`public/admin.html no longer reads \`${name}\`, so ${what} cannot work`);
}

/* ── And a cut that matched nothing is refused, not drawn ───────────────── */
if (!/matched\s*===\s*0|!d\.matched|d\.matched\s*===\s*0/.test(page)) {
  fail.push('public/admin.html does not test `matched` on a response cut. Nought couples resolved would draw the figure for everybody under a label naming a cut.');
}
if (!/slice\.asked[\s\S]{0,80}slice\.people/.test(page)) {
  fail.push('public/admin.html does not compare the Engagement cut\'s `asked` against its `people`. Nought people resolved would draw every tile at zero, which reads as a finding.');
}

/* ── The handle behaves ─────────────────────────────────────────────────── */
const { coupleHash, anonCoupleId, anonPersonId, coupleKeyOf } = await import('../' + MODULE);
const A = 'aaaaaaaa-1111-2222-3333-444444444444';
const B = 'bbbbbbbb-5555-6666-7777-888888888888';
const checks = [
  [coupleHash(A, B) === coupleHash(B, A), 'the couple hash must not depend on which partner is asked'],
  [anonCoupleId({ id: A, partner_profile_id: B }, { partnerPresent: true }) === coupleHash(A, B),
    'a linked couple must hash to the pair'],
  [anonCoupleId({ id: A, partner_profile_id: B }, { partnerPresent: false }) === null,
    'a partner nobody can see is not a couple'],
  [anonCoupleId({ id: A, invite_code: 'XY' }, { invitePresent: true }) === coupleHash(A, 'inv:XY'),
    'an invited partner keys the couple on the invite code'],
  [coupleKeyOf({ id: A }, { partnerPresent: true, invitePresent: true }) === null,
    'a profile with neither route is a couple of one'],
  [anonPersonId(A) !== coupleHash(A, B) && anonPersonId(A) === anonPersonId(A),
    'a person handle must be stable and must not collide with their couple'],
  [anonPersonId(null) === null, 'no id, no handle'],
  [!/[0-9a-f]{8}-/.test(anonPersonId(A) + anonCoupleId({ id: A, partner_profile_id: B }, { partnerPresent: true })),
    'a handle must not carry the uuid it was made from'],
];
for (const [pass, why] of checks) if (!pass) fail.push('the handle misbehaves: ' + why);

if (fail.length) {
  console.error('check-couple-id FAILED');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log('[check-couple-id] one implementation of the two anonymous handles, imported and called by all four endpoints, '
  + 'with the four field names sent and read on both sides, and a cut that resolves nobody refused rather than drawn.');
