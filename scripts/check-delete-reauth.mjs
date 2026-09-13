// Fails the build when an account can be deleted without proving who you are.
//
// ── THE PROMISE ────────────────────────────────────────────────────────────
// The published retention policy says, of deleting an account: "Confirm
// deletion with your password." Neither surface asked for one. A live session
// was the whole of it, so a borrowed unlocked phone could delete someone's
// account, their answers, and the couple's frozen results, with two taps and
// the word DELETE.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// 1. api/delete-account.js verifies the password before it destroys anything,
//    and the verification happens before the first delete call.
// 2. Both surfaces send one.
//
// ── WHAT IT DELIBERATELY DOES NOT COVER ────────────────────────────────────
// Accounts with no password. Google and Apple sign-ins have none, and refusing
// them would lock people out of something they are entitled to do, so the
// endpoint asks only when the account has an email identity and the surfaces
// send the field only when it was filled in. This gate does not require a
// password to be typed; it requires the product to ask for one and the server
// to check it when there is one.

import { readFileSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(`${ROOT}${f}`, 'utf8');

const problems = [];
// Comments blanked, positions preserved. The file's own header names
// auth.admin.deleteUser while explaining what the endpoint does, and the
// ordering check below found that sentence and called it a deletion.
const api = read('api/delete-account.js')
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|\s)\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));

// ── 1. The server checks ──────────────────────────────────────────────────
const checks = /signInWithPassword/.test(api);
if (!checks) {
  problems.push(
    'api/delete-account.js never verifies a password.\n'
    + '      A valid session is not the same as the person whose session it is.');
}

// The check has to come first. Verifying after the archive, or after orders are
// removed, is a check that runs once the damage is done.
const at = api.indexOf('signInWithPassword');
const firstDestruction = Math.min(
  ...['deleteUser', ".delete({ count: 'exact' })", 'storage.from(']
    .map((needle) => { const i = api.indexOf(needle); return i < 0 ? Infinity : i; }),
);
if (checks && Number.isFinite(firstDestruction) && at > firstDestruction) {
  problems.push(
    'api/delete-account.js verifies the password after it has already started\n'
    + '      deleting. A wrong password would then refuse a request that had\n'
    + '      removed something.');
}

// It must gate on the identity rather than on whether a password was sent: an
// endpoint that skips the check when the field is absent is not a check.
if (checks && !/identities/.test(api)) {
  problems.push(
    'api/delete-account.js does not look at the account identities, so it cannot\n'
    + '      tell a social sign-in with no password from a request that simply\n'
    + '      omitted one. Omitting the field would skip the check.');
}

// ── 2. Both surfaces send one ─────────────────────────────────────────────
const SURFACES = [
  ['src/App.jsx', /deletePassword/],
  ['attune-app/src/components/settings.tsx', /deleteAccount\(password/],
  ['attune-app/src/api/client.ts', /deleteAccount\(password\?: string/],
];
for (const [file, pattern] of SURFACES) {
  if (pattern.test(read(file))) continue;
  problems.push(
    `${file} does not ask for or pass a password when deleting an account.\n`
    + '      The policy says it does.');
}

if (problems.length) {
  console.error('[check-delete-reauth] an account can be deleted without proving who you are:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log('[check-delete-reauth] both surfaces ask for a password; the server checks it before deleting anything.');
