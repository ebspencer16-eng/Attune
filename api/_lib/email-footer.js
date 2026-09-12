/**
 * The unsubscribe link every customer email carries.
 *
 * ── WHY THIS IS SHARED ────────────────────────────────────────────────────
 * It existed in one sender and not the other two. api/send-order-email.js
 * built the token, wrote the markup and linked "Manage email preferences";
 * api/cron-checkin.js and api/cron-survey-nudge.js went to real customers,
 * on a schedule, with a footer that offered a reply address and no way out.
 *
 * Both crons do respect profiles.email_opt_in, so the preference is honoured
 * once it is set. What was missing was any way to set it from the email that
 * prompted the thought.
 *
 * ── THE TOKEN ─────────────────────────────────────────────────────────────
 * base64 of the profile id, which is what /api/unsubscribe already expects.
 * Not a secret and not pretending to be one: it identifies a row to flip a
 * boolean on, and the endpoint writes nothing else.
 *
 * The wording is Ellie's, from the order email, unchanged.
 */

const BASE = 'https://www.attune-relationships.com';

/** Where the link goes. A mailto when there is no id to encode. */
export function unsubscribeUrl(userId) {
  if (!userId) return 'mailto:hello@attune-relationships.com?subject=Unsubscribe';
  const token = typeof btoa === 'function'
    ? btoa(userId)
    : Buffer.from(String(userId)).toString('base64');
  return `${BASE}/api/unsubscribe?token=${token}`;
}

/** The line itself, styled as the order email styles it. */
export function unsubscribeLink(userId) {
  return `<a href="${unsubscribeUrl(userId)}" style="color:#B8A898;text-decoration:underline">Manage email preferences</a>`;
}
