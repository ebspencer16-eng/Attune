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
    subject: `${ctx.buyerName || 'Your partner'} invited you to Attune`,
    html: partnerPurchaseInviteHtml(ctx),
  }),
  order_gift_recipient: (ctx) => ({
    subject: `You've received an Attune gift from ${ctx.buyerName}`,
    html: giftRecipientHtml({
      recipientName: [ctx.partner1Name, ctx.partner2Name].filter(Boolean).join(' and ') || null,
      buyerName: ctx.buyerName,
      pkgName: ctx.pkgName,
      giftUrl: ctx.giftUrl,
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

function orderConfirmationHtml({ buyerName, pkgName, orderNum, total, lineItems, isGift, isPhysical, partnerName, partnerEmail, recipientEmail, partnerInvited, recipientInvited, existingAccount, partnerLinked, setupUrl, addonWorkbook, addonReflection, addonBudget, addonChecklist, addonIntimacy, addonConflict }) {
  const them = _esc(partnerName || 'your partner');
  let deliveryLine;
  if (isPhysical) {
    deliveryLine = P('Your gift box will arrive within 3–5 business days. Setup instructions are inside.');
  } else if (isGift) {
    deliveryLine = recipientInvited
      ? P(`We sent an invitation to Attune to <strong style="color:#1E1610">${_esc(recipientEmail)}</strong>.`)
      : P(`We could not send the invitation to <strong style="color:#1E1610">${_esc(recipientEmail || 'the recipient')}</strong>. Reply to this email and we will make sure it reaches them.`);
  } else {
    const app = APP_LIVE ? ` or download <a href="${APP_STORE_URL}" style="color:#C17F47">the Attune app</a>` : '';
    deliveryLine = (existingAccount
        ? P(`It is on your account now. Sign in on <a href="${setupUrl}" style="color:#C17F47">the website</a>${app} to begin.`)
        : P(`To begin, set up your account on <a href="${setupUrl}" style="color:#C17F47">the website</a>${app}.`))
      + (partnerInvited
        ? P(`We sent ${them} their invitation at <strong style="color:#1E1610">${_esc(partnerEmail)}</strong>.`)
        : partnerLinked ? '' : P(`You can invite ${them} from your dashboard.`));
  }

  // Prefer the explicit itemized list; fall back to package + add-on flags.
  let items = Array.isArray(lineItems) && lineItems.length ? lineItems.slice() : null;
  if (!items) {
    items = [{ label: pkgName, price: Number(total) || 0 }];
    if (addonWorkbook)   items.push({ label: 'Personalized Workbook (' + (addonWorkbook === 'print' ? 'printed' : 'digital') + ')', price: addonWorkbook === 'print' ? 39 : 19 });
    if (addonReflection) items.push({ label: 'Relationship Reflection', price: 40 });
    if (addonBudget)     items.push({ label: 'Budget Priorities Exercise', price: 20 });
    // Checklist, intimacy and conflict were missing. A receipt that omits a
    // paid add-on shows a total that does not match its own line items, which
    // is the kind of thing that generates a support email on the first order.
    if (addonChecklist)  items.push({ label: 'Newlywed Checklist', price: 20 });
    if (addonIntimacy)   items.push({ label: 'Physical Intimacy Expectations', price: 20 });
    if (addonConflict)   items.push({ label: 'Conflict Patterns', price: 40 });
  }
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
    preheader: `${from} invited you to Attune`,
    title: `${from} invited you to Attune.`,
    subtitle: `Hi ${_esc(partnerName || 'there')},`,
    bodyHtml: P(`${from} got Attune for the two of you. You each answer on your own, and your answers stay private until you have both finished. Then your results unlock together.`)
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

function giftRecipientHtml({ recipientName, buyerName, pkgName, giftUrl }) {
  const body = `
    <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:15px;color:#5C4A38;line-height:1.75;margin:0 0 6px">${_esc(buyerName)} gave you <strong style="color:#1E1610">${_esc(pkgName)}</strong>, an experience for you and your partner. Two exercises that map how you communicate and what you each expect. The joint results only appear once you're both done.</p>
    <div style="background:#FBF8F3;border:1px solid #F3EDE6;border-radius:10px;padding:16px 20px;margin:20px 0 0">
      <div style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:11px;color:#C17F47;font-weight:700;letter-spacing:.2em;text-transform:uppercase;margin-bottom:8px">When you claim it</div>
      <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:14px;color:#5C4A38;line-height:1.65;margin:0">You'll set up your account and choose a password, then invite your partner from your dashboard. They'll receive their own unique link. Answer independently. Your results unlock together when you're both finished.</p>
    </div>
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
