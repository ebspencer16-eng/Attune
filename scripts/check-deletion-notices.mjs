// Fails the build when deleting an account tells nobody.
//
// ── THE PROMISE ────────────────────────────────────────────────────────────
// The published retention policy says two things happen when someone deletes
// their account:
//
//   "Your partner is notified that you have deleted your account."
//   "You will receive a confirmation email." (stated twice)
//
// Neither happened. api/delete-account.js contained no email and no
// notification; the word did not appear in the file.
//
// ── THE ORDERING THAT MAKES IT WORK ────────────────────────────────────────
// Both emails need an address and a name, and step 6 deletes the auth user and
// cascades the profile row, which are the only copies. So the read has to
// happen before the first destructive call and the send after the last one: a
// confirmation sent before the deletion is a lie if the deletion fails.
//
// This checks that order, because getting it wrong is silent. The email simply
// goes to undefined and nobody hears anything.
//
// ── WHAT IT DOES NOT COVER ─────────────────────────────────────────────────
// Whether Resend accepted them. Nothing in a build can know that. And the
// wording, which is in api/_lib/deletion-emails.js for Ellie to edit.

import { readFileSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;
const strip = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|\s)\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));

const api = strip(readFileSync(`${ROOT}api/delete-account.js`, 'utf8'));
const problems = [];

// Positions inside the handler, not in the import list at the top. The first
// version measured `deletionConfirmationEmail` at its import and concluded the
// email was sent before the account was deleted.
const BODY = Math.max(0, api.indexOf('export default'));
const at = (needle) => { const i = api.indexOf(needle, BODY); return i < 0 ? -1 : i; };

const readAddresses = at('select(\'name, email, partner_profile_id\')');
const deleteUser = at('auth.admin.deleteUser');
const confirmation = at('deletionConfirmationEmail');
const partnerEmail = at('partnerDeletedEmail');
const notificationRow = at("from('notifications')");

if (confirmation < 0) {
  problems.push('nothing sends the confirmation email the policy promises twice.');
}
if (partnerEmail < 0 && notificationRow < 0) {
  problems.push('nothing tells the partner, by email or by a notification row.');
}
if (readAddresses < 0) {
  problems.push(
    'the names and addresses are never read from profiles.\n'
    + '      Both messages need them and deleting the auth user takes them away.');
}

if (readAddresses >= 0 && deleteUser >= 0 && readAddresses > deleteUser) {
  problems.push(
    'the addresses are read after the auth user is deleted, so they are gone.\n'
    + '      Both emails would be sent to undefined, silently.');
}
for (const [name, at_] of [['the confirmation', confirmation], ["the partner's email", partnerEmail]]) {
  if (at_ < 0 || deleteUser < 0) continue;
  if (at_ > deleteUser) continue;
  problems.push(
    `${name} is sent before the account is actually deleted.\n`
    + '      If the delete then fails, the message was not true.');
}

// The partner's own preference still counts, and it has to be checked at the
// send. Looking for the word anywhere in the file passed a plant that deleted
// the condition, because the field was still being read into an object
// further up: a gate that matches on presence cannot see a guard removed.
if (partnerEmail >= 0) {
  const guard = api.slice(Math.max(0, partnerEmail - 400), partnerEmail);
  if (!/optedIn|email_opt_in/.test(guard)) {
    problems.push(
      'the partner is emailed without checking email_opt_in at the send.\n'
      + '      Someone who asked us to stop emailing them asked for that.');
  }
}

if (problems.length) {
  console.error('[check-deletion-notices] deleting an account tells nobody:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log('[check-deletion-notices] addresses read before the delete, both messages sent after it, opt-in honoured.');
