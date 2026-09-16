/**
 * The two emails deletion sends.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * The published retention policy promises both and neither existed:
 *
 *   "Your partner is notified that you have deleted your account."
 *   "You will receive a confirmation email." (said twice)
 *
 * ── THE WORDING IS MINE ───────────────────────────────────────────────────
 * Ellie writes all customer-facing copy. She asked for these to be built with
 * my language and said she would approve or edit once they are pushed, so
 * this file is the one place to edit them. Nothing else writes these
 * sentences.
 *
 * What each one has to carry:
 *
 *   The confirmation says what is gone, what survives and for how long, and
 *   who to write to. It cannot ask them to do anything: the account is gone
 *   and there is nothing to click.
 *
 *   The partner's says what changed for them and names no reason, because we
 *   do not know one. It says their own answers are still theirs, because the
 *   thing someone fears on reading it is that everything went with the other
 *   person.
 *
 * ── A TIMING RULE ─────────────────────────────────────────────────────────
 * The confirmation has to be addressed before the auth user is deleted. That
 * row is the only copy of the address, and step 6 removes it.
 */

import { brandedEmail, _esc } from './branded-email.js';
import { SITE_URL } from './site.js';

/** To the person who deleted. No call to action: there is nothing to open. */
export function deletionConfirmationEmail({ name, researchKept }) {
  const subject = 'Your Attune account is deleted';
  /**
   * ── THE WORDS ARE ELLIE'S ─────────────────────────────────────────────
   * She read this email in TASKS.md, where it is listed by a generator rather
   * than typed, and sent back what it should say. One paragraph, in her
   * sentences, with the research line still conditional: someone who opted out
   * before deleting should not be told a copy was kept.
   */
  const kept = researchKept
    ? 'A de-identified copy of your exercise answers, with no name, email or invite code attached, and your payment record, which is held by Stripe rather than by us, and kept on their schedule to meet financial recordkeeping law.'
    : 'Your payment record, which is held by Stripe rather than by us, and kept on their schedule to meet financial recordkeeping law. Nothing was kept for research: you had opted out before you deleted, so that copy was never made.';

  return { subject, html: brandedEmail({
    preheader: 'Your Attune account has been deleted.',
    title: 'Your account is deleted',
    bodyHtml: `
      <p style="font-size:14px;line-height:1.7;color:#3C3C43;margin:0 0 16px">${_esc(name || 'Hello')}, this is Attune Relationships confirming that your name, email address, sign-in, and every answer you gave are gone from Attune.</p>
      <p style="font-size:14px;line-height:1.7;color:#3C3C43;margin:0 0 16px">Two things outlast the account: ${kept}</p>
      <p style="font-size:14px;line-height:1.7;color:#3C3C43;margin:0 0 16px">If you had a partner on Attune, they keep their own answers, but the parts of their results section that came from both of you are gone.</p>
      <p style="font-size:14px;line-height:1.7;color:#3C3C43;margin:0">If any of that is not what you expected, write to us at hello@attune-relationships.com and a person will answer.</p>
    `,
    footerNote: 'This is the last email we will send you.',
    // No id: the account is gone, so there is no preference left to manage.
    // unsubscribeUrl falls back to a mailto, which is the honest link here.
    userId: null,
  }) };
}

/** To the partner. Says what changed for them, and asks nothing of them. */
export function partnerDeletedEmail({ toName, theirName, userId }) {
  const them = _esc(theirName || 'Your partner');
  const subject = `${theirName || 'Your partner'} deleted their Attune account`;
  return { subject, html: brandedEmail({
    preheader: `${them} deleted their Attune account.`,
    title: `${them} deleted their Attune account`,
    // Ellie's words, from her review of this email in TASKS.md.
    bodyHtml: `
      <p style="font-size:14px;line-height:1.7;color:#3C3C43;margin:0 0 16px">${_esc(toName || 'Hello')}, this is Attune Relationships writing to let you know that ${them} deleted their Attune account.</p>
      <p style="font-size:14px;line-height:1.7;color:#3C3C43;margin:0 0 16px">Your account is intact and accessible, but the parts of your results that were produced dependent on ${them}'s responses are gone, because they were built from answers that no longer exist.</p>
      <p style="font-size:14px;line-height:1.7;color:#3C3C43;margin:0">We are not able to say why they deleted their account, but if you have questions about your own, please write to hello@attune-relationships.com.</p>
    `,
    ctaLabel: 'Open Attune',
    ctaUrl: `${SITE_URL}/app`,
    userId,
  }) };
}
