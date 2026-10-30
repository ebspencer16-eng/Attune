#!/usr/bin/env node
/**
 * check-email-senders: no email reaches a customer except from the catalogue.
 *
 * The Stripe webhook built a confirmation of its own, inline, for months: in
 * a different design, never in /email-preview, and sent beside Ellie's, so
 * every card buyer got two (A203b). Nothing could see it, because
 * check-email-triggers records which catalogue emails are sent from where and
 * this one was not a catalogue email at all.
 *
 * So: a file that calls Resend's send endpoint is either one of the senders
 * below, each of which builds its customer emails from a `*_EMAILS` map or the
 * deletion module (all joined in api/_lib/email-catalogue.js), or one of the
 * two digests that go only to the admin addresses. Anything else fails, and
 * so does a listed sender that stops using the catalogue.
 *
 * Planted: the webhook's inline send restored, and cron-checkin's
 * CHECKIN_EMAILS replaced by an inline subject. Both fail.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SENDERS = {
  'api/send-email.js': /SEND_EMAILS\[/,
  'api/send-order-email.js': /ORDER_EMAILS\./,
  'api/cron-checkin.js': /CHECKIN_EMAILS\[|CHECKIN_EMAILS\./,
  'api/cron-survey-nudge.js': /NUDGE_EMAILS\[|NUDGE_EMAILS\./,
  'api/delete-account.js': /deletionConfirmationEmail\(|partnerDeletedEmail\(/,
  'api/cron-new-articles.js': /ARTICLE_EMAILS\./,
};
/** To the admin addresses only, never a customer. */
const ADMIN_DIGESTS = new Set(['api/cron-beta-digest.js', 'api/cron-feedback-synthesis.js']);

const files = [];
const walk = (d) => { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) { if (e !== 'node_modules') walk(p); } else if (/\.m?js$/.test(e)) files.push(p); } };
walk(join(ROOT, 'api'));

const fails = [];
let senders = 0;
for (const f of files) {
  const rel = f.slice(ROOT.length);
  const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  if (!src.includes('api.resend.com/emails')) continue;
  senders++;
  if (ADMIN_DIGESTS.has(rel)) continue;
  if (!SENDERS[rel]) { fails.push(`${rel} sends email itself, and is not a catalogue sender. A customer email belongs in a *_EMAILS map, joined in api/_lib/email-catalogue.js, so Ellie can see it in /email-preview.`); continue; }
  if (!SENDERS[rel].test(src)) fails.push(`${rel} sends email and no longer builds it from its catalogue map.`);
}
for (const rel of Object.keys(SENDERS)) {
  if (!files.some((f) => f.endsWith(rel))) fails.push(`${rel} is listed as a sender and is not in the tree.`);
}
if (senders < 5) fails.push(`Only ${senders} files call Resend; the scan has lost its subject.`);
if (fails.length) {
  console.error('[check-email-senders] ' + fails.length + ' problem(s):');
  for (const x of fails) console.error('  ' + x);
  process.exit(1);
}
console.log(`[check-email-senders] ${senders} files call Resend: ${Object.keys(SENDERS).length} catalogue senders, ${ADMIN_DIGESTS.size} admin digests, and nothing else.`);
