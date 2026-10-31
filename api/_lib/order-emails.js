/**
 * The emails an order sends, and the one function that sends them.
 *
 * This was /api/send-order-email, an endpoint checkout posted to. Since A206
 * a purchase makes accounts and sends invitations, which nothing a browser
 * says can be trusted to do, so every order's emails are sent from the server
 * that saw the payment: api/_lib/fulfil-order.js, called by the Stripe webhook
 * for a paid order and by api/create-payment-intent.js for a free one.
 *
 * Sends, per item:
 *   - for yourself: an invitation to the partner, unless "invite later";
 *   - a gift: an invitation to the recipient, with their own set-up link;
 *   - then the confirmation to the buyer, which says what was actually sent.
 */
import { brandedEmail, _esc } from './branded-email.js';
import { APP_LIVE, APP_STORE_URL } from './flags.js';
import { SITE_URL } from './site.js';
import { redactEmails, providerError } from './log-redact.js';

const FROM = process.env.FROM_EMAIL || 'hello@attune-relationships.com';

/**
 * Build and send one item's emails. `ctx` is from orderEmailContext, with
 * the links api/_lib/fulfil-order.js made. The invitation goes first and the
 * confirmation last, so the confirmation can say what was sent rather than
 * what was meant to be: an invitation Resend refused is not "sent".
 */
export async function sendOrderEmails(ctx, apiKey) {
  const { buyerEmail, isGift, isPhysical, recipientEmail, partnerEmail, partnerInviteUrl } = ctx;
  let invitedOk = false;
  let failed = 0;
  const send = async (email) => {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(email),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) return true;
      /* Which email and which domain, not the subject: order subjects carry
         a first name, and Resend's error body repeats the address. */
      console.error('[order-emails] Resend rejected:', redactEmails(email.to), providerError(data));
    } catch (err) {
      console.error('[order-emails] fetch threw:', redactEmails(email.to), err?.message || err);
    }
    failed++;
    return false;
  };

  if (!isPhysical && !isGift && partnerEmail && partnerInviteUrl) {
    invitedOk = await send({ from: `Attune <${FROM}>`, to: [partnerEmail], ...ORDER_EMAILS.order_partner_invite(ctx) });
  }
  if (!isPhysical && isGift && recipientEmail) {
    invitedOk = await send({ from: `Attune <${FROM}>`, to: [recipientEmail], ...ORDER_EMAILS.order_gift_recipient(ctx) });
  }
  const confirmed = await send({
    from: `Attune <${FROM}>`, to: [buyerEmail],
    ...ORDER_EMAILS.order_confirmation({ ...ctx, partnerInvited: !isGift && invitedOk, recipientInvited: isGift && invitedOk }),
  });
  return { sent: (invitedOk ? 1 : 0) + (confirmed ? 1 : 0), failed, invited: invitedOk };
}


/**
 * Every email an order sends, by name, each taking the same context object.
 *
 * The subjects used to sit inline at the three push sites, which meant the
 * only way to read them was to read the handler, and the only way to preview
 * one was to write it out a second time. /email-preview did exactly that and
 * its version had drifted. Both the handler and the preview build from here
 * now, so there is one copy of each subject line.
 *
 * `ctx` is the request body plus the two URLs the handler derives from it.
 */
export const ORDER_EMAILS = {
  order_confirmation: (ctx) => ({
    subject: `Attune Order Confirmation`,
    html: orderConfirmationHtml(ctx),
  }),
  order_partner_invite: (ctx) => ({
    subject: `${ctx.buyerName || 'Your partner'} purchased the Attune Experience for you`,
    html: partnerPurchaseInviteHtml(ctx),
  }),
  order_gift_recipient: (ctx) => ({
    subject: `You've received an Attune gift from ${ctx.buyerName}`,
    html: giftRecipientHtml({
      recipientName: [ctx.partner1Name, ctx.partner2Name].filter(Boolean).join(' and ') || null,
      buyerName: ctx.buyerName,
      pkgName: ctx.pkgName,
      giftUrl: ctx.giftUrl,
      giftNote: ctx.giftNote,
    }),
  }),
};

// ── Email HTML templates ────────────────────────────────────────────────────

// _esc and brandedEmail moved to api/_lib/branded-email.js, imported above.
// Deletion has two emails to send and they should look like the rest.

/*
 * A206: the words in the next three functions are placeholders of mine,
 * listed for Ellie under A206 in TASKS.md. Her brief: a gift buyer is told
 * the order went through and an invitation went to the recipient; a buyer
 * for themselves is told it went through, given the website (and the App
 * Store once the app is live) to set up, and told either that their partner
 * was invited or that they can invite them from the dashboard.
 */
const P = (text, extra = '') => `<p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:14px;color:#5C4A38;line-height:1.7;margin:0 0 12px${extra}">${text}</p>`;

function orderConfirmationHtml({ buyerName, pkgName, orderNum, total, lineItems, isGift, isPhysical, partnerName, partnerEmail, recipientEmail, partnerInvited, recipientInvited, existingAccount, partnerLinked, setupUrl }) {
  const them = _esc(partnerName || 'your partner');
  let deliveryLine;
  if (isPhysical) {
    deliveryLine = P('Your gift box will arrive within 3–5 business days. Setup instructions are inside.');
  } else if (isGift) {
    deliveryLine = recipientInvited
      ? P(`We sent an invitation to Attune to <strong style="color:#1E1610">${_esc(recipientEmail)}</strong>.`)
      : P(`We could not send the invitation to <strong style="color:#1E1610">${_esc(recipientEmail || 'the recipient')}</strong>. Reply to this email and we will make sure it reaches them.`);
  } else {
    /* Ellie's words (A208). "Attune app" goes to the App Store, so it is
       linked only once APP_LIVE says there is an app there; until then it is
       the same words unlinked rather than a link to a page that does not
       exist. "website" is the set-up link for a new account, which ends on
       the website signed in: a sign-in page would ask for a password the
       account does not have yet. For an existing account it is sign in. */
    const L = (href, text) => `<a href="${href}" style="color:#C17F47">${text}</a>`;
    const app = APP_LIVE ? L(APP_STORE_URL, 'Attune app') : 'Attune app';
    deliveryLine = (existingAccount
        ? P(`You will be able to access your experience through your portal on the ${APP_LIVE ? L(APP_STORE_URL, 'app') : 'app'} or ${L(setupUrl, 'website')}.`)
        : P(`To begin, download the ${app} or visit the ${L(setupUrl, 'website')}.`))
      + (partnerInvited
        ? P(`We sent ${them} their invitation at <strong style="color:#1E1610">${_esc(partnerEmail)}</strong>.`)
        : partnerLinked ? '' : P(`You can invite ${them} from your dashboard.`));
  }

  /* The lines are receiptLines' (api/_lib/order-email-context.js), priced
     from the catalogue. A fallback here built them again from add-on flags
     with the names and prices typed out, and nothing could reach it: the one
     caller always passes lines. A second price list that agrees today is the
     198/295 bug waiting, so it went (A222). */
  const items = Array.isArray(lineItems) ? lineItems.slice() : [];
  const sub = items.reduce((acc, l) => acc + (Number(l.price) || 0), 0);
  const grandTotal = (total != null && total !== '') ? Number(total) : sub;
  const discount = sub - grandTotal;
  const itemRows = items.map(l =>
    `<tr><td style="padding:6px 0;color:#1E1610;font-size:14px">${_esc(l.label)}</td><td align="right" style="padding:6px 0;color:#1E1610;font-size:14px;font-weight:600">$${_esc(l.price)}</td></tr>`
  ).join('');
  const discountRow = discount > 0
    ? `<tr><td style="padding:6px 0;color:#2F9E6F;font-size:14px">Promo applied</td><td align="right" style="padding:6px 0;color:#2F9E6F;font-size:14px;font-weight:600">-$${_esc(discount)}</td></tr>`
    : '';
  const totalRow = `<tr><td style="border-top:1px solid #E8DDD0;padding:10px 0 4px;color:#1E1610;font-size:15px;font-weight:700">Total</td><td align="right" style="border-top:1px solid #E8DDD0;padding:10px 0 4px;color:#1E1610;font-size:15px;font-weight:700">$${_esc(grandTotal)}</td></tr>`;

  const body = `
    <div style="background:#FBF8F3;border:1px solid #F3EDE6;border-radius:10px;padding:20px 22px;margin:8px 0 16px">
      <div style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:11px;color:#C17F47;font-weight:700;letter-spacing:.2em;text-transform:uppercase;margin-bottom:12px">Order summary</div>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-family:'DM Sans',Helvetica,Arial,sans-serif">
        ${itemRows}
        ${discountRow}
        ${totalRow}
        <tr><td colspan="2" style="padding-top:10px;margin-top:6px;font-size:12px;color:#8C7A68;font-family:'Menlo','SF Mono',monospace">Order #${_esc(orderNum)}</td></tr>
      </table>
    </div>
    ${deliveryLine}
  `;

  return brandedEmail({
    preheader: `Order confirmed: ${_esc(pkgName)}`,
    title: 'Order confirmed.',
    subtitle: `Hi ${_esc(buyerName)}, thank you for your order. Here's what's coming next.`,
    bodyHtml: body,
    ...(!isGift && !isPhysical ? { ctaLabel: existingAccount ? 'Sign in' : 'Set up your account', ctaUrl: setupUrl } : {}),
  });
}

function partnerPurchaseInviteHtml({ buyerName, partnerName, partnerInviteUrl }) {
  const from = _esc(buyerName || 'Your partner');
  return brandedEmail({
    preheader: `${from} purchased the Attune Experience for you`,
    title: `${from} purchased the Attune Experience for you.`,
    subtitle: `Hi ${_esc(partnerName || 'there')},`,
    bodyHtml: P('The Attune Experience involves individual exercises and personalized insights for you and your partner to explore together.')
      + P('Use the button below to create your account and begin.'),
    ctaLabel: 'Accept the invitation',
    ctaUrl: partnerInviteUrl,
  });
}

// The buyer-side partner invite template lived here and was never called.
// The comment at the push site says why: AuthModal sends the real partner
// invite, through /api/send-email, once the buyer has a profile and an invite
// code. So this was a second draft of an email that ships from somewhere
// else, which is the thing that made /email-preview wrong. Removed rather
// than previewed.

function giftRecipientHtml({ recipientName, buyerName, pkgName, giftUrl, giftNote }) {
  const body = `
    <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:15px;color:#5C4A38;line-height:1.75;margin:0 0 6px">${_esc(buyerName)} gave you <strong style="color:#1E1610">${_esc(pkgName)}</strong>, an experience for you and your partner. Two exercises that map how you communicate and what you each expect. The joint results only appear once you're both done.</p>
    <div style="background:#FBF8F3;border:1px solid #F3EDE6;border-radius:10px;padding:16px 20px;margin:20px 0 0">
      <div style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:11px;color:#C17F47;font-weight:700;letter-spacing:.2em;text-transform:uppercase;margin-bottom:8px">When you claim it</div>
      <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:14px;color:#5C4A38;line-height:1.65;margin:0">You'll set up your account and choose a password, then invite your partner from your dashboard. They'll receive their own unique link. Answer independently. Your results unlock together when you're both finished.</p>
    </div>
    ${giftNote ? `<div style="border-left:3px solid #E8673A;padding:4px 0 4px 16px;margin:20px 0 0">
      <div style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:11px;color:#C17F47;font-weight:700;letter-spacing:.2em;text-transform:uppercase;margin-bottom:6px">A note from ${_esc(buyerName)}</div>
      <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:15px;color:#1E1610;line-height:1.7;margin:0;white-space:pre-line">${_esc(giftNote)}</p>
    </div>` : ''}
  `;

  return brandedEmail({
    preheader: `You've received an Attune gift from ${_esc(buyerName)}`,
    title: `A gift from ${_esc(buyerName)}.`,
    subtitle: `Hi ${_esc(recipientName || 'there')}, here's how to open it.`,
    bodyHtml: body,
    ctaLabel: 'Claim my gift →',
    ctaUrl: giftUrl,
  });
}
