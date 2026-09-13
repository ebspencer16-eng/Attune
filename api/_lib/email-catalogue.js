/**
 * Every email Attune sends, in one place, each one renderable.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * The emails are built in five modules: the endpoint at api/send-email.js, the
 * order emails in api/send-order-email.js, the deletion notices in
 * api/_lib/deletion-emails.js, and the two crons. Nothing joined them up, so
 * the only page that showed Ellie what an email looks like held six
 * hand-written mock-ups of its own, and she writes every word a customer
 * reads.
 *
 * This is the join. Each entry names the function that builds the email and
 * the sample body to build it with, so /api/email-preview renders the same
 * code that sends. Nothing here restates a subject line or a sentence.
 *
 * ── THE `sends` FIELD ─────────────────────────────────────────────────────
 * Where each one is triggered from, read from the generated record in
 * email-triggers.js. Five of the ten types api/send-email.js can build have no
 * trigger at all: three were retired at their triggers in 2793bba, one is sent
 * by the cron from a different template, and one never had one. Showing those
 * beside the live ones without saying so is how copy gets approved that nobody
 * will ever read.
 */

import { SEND_EMAILS } from '../send-email.js';
import { ORDER_EMAILS } from '../send-order-email.js';
import { CHECKIN_EMAILS } from '../cron-checkin.js';
import { NUDGE_EMAILS } from '../cron-survey-nudge.js';
import { deletionConfirmationEmail, partnerDeletedEmail } from './deletion-emails.js';
import {
  EMAIL_SAMPLES, ORDER_SAMPLE, DELETION_SAMPLES, CRON_SAMPLES, SAMPLE_USER_ID,
} from './email-samples.js';
import { EMAIL_TRIGGERS } from './email-triggers.js';

/** key → { build, sample, from }, where `from` is the module that sends it. */
export const EMAIL_CATALOGUE = {};

for (const [key, build] of Object.entries(SEND_EMAILS)) {
  EMAIL_CATALOGUE[key] = {
    build: (s) => build(s, SAMPLE_USER_ID),
    sample: EMAIL_SAMPLES[key],
    from: 'api/send-email.js',
  };
}
for (const [key, build] of Object.entries(ORDER_EMAILS)) {
  EMAIL_CATALOGUE[key] = { build, sample: ORDER_SAMPLE, from: 'api/send-order-email.js' };
}
for (const [key, build] of Object.entries(CHECKIN_EMAILS)) {
  EMAIL_CATALOGUE[key] = { build, sample: CRON_SAMPLES[key], from: 'api/cron-checkin.js' };
}
for (const [key, build] of Object.entries(NUDGE_EMAILS)) {
  EMAIL_CATALOGUE[key] = { build, sample: CRON_SAMPLES[key], from: 'api/cron-survey-nudge.js' };
}
EMAIL_CATALOGUE.account_deleted = {
  build: deletionConfirmationEmail,
  sample: DELETION_SAMPLES.account_deleted,
  from: 'api/_lib/deletion-emails.js',
};
EMAIL_CATALOGUE.partner_deleted = {
  build: partnerDeletedEmail,
  sample: DELETION_SAMPLES.partner_deleted,
  from: 'api/_lib/deletion-emails.js',
};

/**
 * Where an email is sent from, for the ones that go through the endpoint.
 * The order emails, the deletion notices and the crons are sent by the module
 * that defines them, which is what `from` already says, so they count as sent.
 */
export function sendersOf(key) {
  const entry = EMAIL_CATALOGUE[key];
  if (!entry) return [];
  if (entry.from !== 'api/send-email.js') return [entry.from];
  return EMAIL_TRIGGERS[key] || [];
}

/** One rendered email: subject, html, and who asks for it. */
export function renderEmail(key) {
  const entry = EMAIL_CATALOGUE[key];
  if (!entry) return null;
  const built = entry.build(entry.sample);
  return {
    type: key,
    subject: built.subject,
    html: built.html,
    to: entry.sample?.toEmail || entry.sample?.buyerEmail || 'maya@example.com',
    from: entry.from,
    sentFrom: sendersOf(key),
  };
}

export const CATALOGUE_KEYS = Object.keys(EMAIL_CATALOGUE);
