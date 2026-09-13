/**
 * One sample body per email we send, so the preview shows the real thing.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * /email-preview used to be six hand-written mock-ups with their own CSS and
 * their own copy, sitting in public/email-preview.html. api/send-email.js
 * sends ten. So five real emails had no preview at all, including
 * results_viewed, which is the one that tells a couple their results are
 * ready; one preview, order_confirm, was of an email that module has never
 * sent; and every subject line and every word in the six was a second draft
 * that nothing kept in step with the first.
 *
 * That is the failure CLAUDE.md names: one rule maintained by hand in two
 * places with nothing checking they agree. It matters more here than most,
 * because Ellie writes every word a customer reads and this was the page she
 * would read them on.
 *
 * The preview now renders the same template functions the sender calls, with
 * these bodies. The only thing that can drift is the sample data, and
 * check-email-preview.mjs fails the build if a type exists without one.
 *
 * ── THE NAMES ─────────────────────────────────────────────────────────────
 * Maya and Alex throughout, the pair the old previews used.
 */

import { SITE_URL as U } from './site.js';

/** A recognisable id so a preview never looks like a real account. */
export const SAMPLE_USER_ID = '00000000-0000-4000-8000-000000000000';

export const EMAIL_SAMPLES = {
  partner_invite: {
    toEmail: 'alex@example.com', toName: 'Alex', fromName: 'Maya',
    inviteUrl: `${U}/app?invite=ABC123`,
  },
  workbook_promo: {
    toEmail: 'maya@example.com', toName: 'Maya', partnerName: 'Alex',
    code: 'WB20', checkoutUrl: `${U}/checkout?addon_workbook=1`, discountPercent: 20,
  },
  checkin_6mo: {
    toEmail: 'maya@example.com', toName: 'Maya', partnerName: 'Alex',
    retakeUrl: `${U}/app?view=exercises`,
  },
  results_viewed: {
    toEmail: 'maya@example.com', toName: 'Maya', partnerName: 'Alex',
    coupleType: 'The Orbit', portalUrl: `${U}/app`,
    hasReflection: true, hasBudget: true, hasWorkbook: true,
    hasIntimacy: true, hasChecklist: true,
  },
  shipping_notification: {
    toEmail: 'maya@example.com', toName: 'Maya', partnerName: 'Alex',
    orderNum: 'ATT-20260401', carrier: 'UPS',
    trackingNumber: '1Z999AA10123456784',
    trackingUrl: 'https://www.ups.com/track?tracknum=1Z999AA10123456784',
  },
};

/**
 * The order emails, which come from api/send-order-email.js rather than from
 * the endpoint. One context object covers all three: the request body as
 * checkout posts it, plus the two URLs that handler derives.
 */
export const ORDER_SAMPLE = {
  pkgKey: 'core',
  pkgName: 'The Attune Assessment',
  buyerName: 'Maya', buyerEmail: 'maya@example.com',
  partnerName: 'Alex', partnerEmail: 'alex@example.com',
  recipientName: 'Sam', recipientEmail: 'sam@example.com',
  orderNum: 'ATT-20260401',
  total: 149,
  lineItems: [
    { label: 'The Attune Assessment', price: 89 },
    { label: 'Relationship Reflection', price: 40 },
    { label: 'Shared Budgeting Activity', price: 20 },
  ],
  addonReflection: true,
  addonBudget: true,
  setupUrl: `${U}/app?signup=1&pkg=core`,
  giftUrl: `${U}/app?signup=1&pkg=core&gift=1`,
};

/**
 * The two emails a deletion sends, from api/_lib/deletion-emails.js.
 * researchKept true because that is the default: opting out is the exception.
 */
export const DELETION_SAMPLES = {
  account_deleted: { name: 'Maya', researchKept: true },
  partner_deleted: { toName: 'Maya', theirName: 'Alex', userId: SAMPLE_USER_ID },
};

/** The three the crons send, from cron-checkin.js and cron-survey-nudge.js. */
export const CRON_SAMPLES = {
  cron_checkin_6mo:  { toName: 'Maya', partnerName: 'Alex', months: 6,  hasReflection: true, retakeUrl: `${U}/app?signin=1`, userId: SAMPLE_USER_ID },
  cron_checkin_12mo: { toName: 'Maya', partnerName: 'Alex', months: 12, hasReflection: true, retakeUrl: `${U}/app?signin=1`, userId: SAMPLE_USER_ID },
  survey_nudge_1:    { name: 'Maya', userId: SAMPLE_USER_ID },
  survey_nudge_2:    { name: 'Maya', userId: SAMPLE_USER_ID },
};

/** What the preview page lists, in the order it lists them. */
export const SAMPLE_TYPES = Object.keys(EMAIL_SAMPLES);
