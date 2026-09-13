/**
 * Vercel Serverless Function: /api/send-order-email
 *
 * Called from checkout.html on order placement.
 * Sends:
 *   1. Order confirmation to buyer
 *   2. "Get started" email to buyer (digital, for-self) — includes partner invite link
 *   3. "You've received a gift" email to recipient (digital gift) — includes their unique link
 *   4. For physical packages: confirmation only (QR code setup instructions are in the box)
 *
 * Required env vars (set in Vercel dashboard):
 *   RESEND_API_KEY   — from https://resend.com (free tier: 3,000 emails/month)
 *   FROM_EMAIL       — e.g. hello@attune-relationships.com (must be verified in Resend)
 *   SUPPORT_EMAIL    — e.g. hello@attune-relationships.com (receives feedback submissions)
 *
 * To switch to SendGrid: swap the fetch call below to
 *   https://api.sendgrid.com/v3/mail/send  with Authorization: Bearer SENDGRID_API_KEY
 */

import { brandedEmail, _esc } from './_lib/branded-email.js';
import { APP_LIVE } from './_lib/flags.js';

export const config = { runtime: 'edge' };

// Off until the app is in the App Store. Telling buyers to download an app
// that does not exist yet is worse than saying nothing. This was a fourth hand
// -maintained copy of that fact; it reads the one source now.

const FROM = process.env.FROM_EMAIL || 'hello@attune-relationships.com';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Origin guard
  const origin = req.headers.get('origin') || '';
  if (origin && !origin.includes('attune-relationships.com') && !origin.includes('localhost') && !origin.includes('vercel.app')) {
    return new Response('Forbidden', { status: 403 });
  }

  let body;
  try { body = await req.json(); }
  catch { return new Response('Invalid JSON', { status: 400 }); }

  const {
    pkgKey, pkgName, isGift, isPhysical,
    buyerName, buyerEmail,
    partnerName, partnerEmail,       // for-self digital
    recipientName, recipientEmail,   // gift digital
    orderNum, total, lineItems,
    addonWorkbook,
    addonReflection,
    addonBudget,
    addonIntimacy,
    addonChecklist,
    addonConflict,
    setupPath,                       // '/app?signup=1&...' built by checkout
  } = body;

  // Account setup link for the setup email. Only accept a same-site /app path
  // so a hostile caller can't aim the CTA at another domain.
  const safeSetupPath = (typeof setupPath === 'string' && setupPath.startsWith('/app?') && !setupPath.includes('//'))
    ? setupPath
    : '/app?signup=1';
  const setupUrl = `https://www.attune-relationships.com${safeSetupPath}`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return new Response('Email service not configured', { status: 503 });

  const emails = [];

  // ── 1. Order confirmation to buyer ─────────────────────────────────────────
  // Pushed first; sent sequentially below so this email always arrives before
  // the setup email.
  emails.push({
    from: `Attune <${FROM}>`,
    to: [buyerEmail],
    subject: `Attune Order Confirmation`,
    html: orderConfirmationHtml({ buyerName, pkgName, orderNum, total, lineItems, isGift, isPhysical, recipientName, addonWorkbook, addonReflection, addonBudget }),
  });

  // ── 2. "Set up your account" to buyer (digital, for-self) ──────────────────
  // Note: partner invite is NOT sent here — AuthModal sends the real partner
  // invite (with a proper invite code) when the buyer completes signup and
  // enters their partner's email in the profile setup step.
  //
  // Scheduled 10 seconds in the future so the order confirmation reliably
  // lands first. Resend processes emails asynchronously after API accept,
  // so sequential await alone doesn't guarantee delivery order — this does.
  // Kept short: a longer gap reads as a missing email.
  if (!isGift && !isPhysical) {
    emails.push({
      from: `Attune <${FROM}>`,
      to: [buyerEmail],
      subject: `Set up your Attune account, ${buyerName}`,
      html: getStartedBuyerHtml({ name: buyerName, partnerName, setupUrl, partnerEmail, hasReflection: addonReflection, hasConflict: addonConflict, hasIntimacy: addonIntimacy }),
      scheduled_at: new Date(Date.now() + 10_000).toISOString(),
    });
  }

  // ── 3. Gift digital: email to recipient ────────────────────────────────────
  if (isGift && !isPhysical && recipientEmail) {
    const giftUrl = `https://www.attune-relationships.com/app?signup=1&pkg=${pkgKey}&gift=1`;
    emails.push({
      from: `Attune <${FROM}>`,
      to: [recipientEmail],
      subject: `You've received an Attune gift from ${buyerName}`,
      html: giftRecipientHtml({ recipientName, buyerName, pkgName, giftUrl }),
    });
  }

  // ── Send all emails via Resend ──────────────────────────────────────────────
  // Sequential so they arrive in the pushed order: order confirmation first,
  // then the setup email, then any gift recipient email. Resend's parallel
  // processing was delivering them out of order on a noticeable percentage
  // of orders.
  const results = [];
  let failed = 0;
  for (const email of emails) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(email),
      });
      const data = await r.json();
      results.push({ status: r.ok ? 'fulfilled' : 'rejected', value: data });
      if (!r.ok) {
        failed++;
        console.error('[send-order-email] Resend rejected:', email.subject, data);
      }
    } catch (err) {
      failed++;
      console.error('[send-order-email] fetch threw:', email.subject, err);
      results.push({ status: 'rejected', reason: String(err) });
    }
  }

  return new Response(JSON.stringify({ ok: true, sent: emails.length - failed }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── Email HTML templates ────────────────────────────────────────────────────

// _esc and brandedEmail moved to api/_lib/branded-email.js, imported above.
// Deletion has two emails to send and they should look like the rest.

function orderConfirmationHtml({ buyerName, pkgName, orderNum, total, lineItems, isGift, isPhysical, recipientName, addonWorkbook, addonReflection, addonBudget }) {
  const deliveryLine = isPhysical
    ? 'Your gift box will arrive within 3–5 business days. Setup instructions are inside.'
    : isGift
      ? `We've sent ${_esc(recipientName)}'s access link in a separate email.`
      : 'Your account setup link is on its way in a separate email. Use it to create your account and get started.';

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
    <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:14px;color:#5C4A38;line-height:1.7;margin:0">${deliveryLine}</p>
  `;

  return brandedEmail({
    preheader: `Order confirmed: ${_esc(pkgName)}`,
    title: 'Order confirmed.',
    subtitle: `Hi ${_esc(buyerName)}, thank you for your order. Here's what's coming next.`,
    bodyHtml: body,
  });
}

function getStartedBuyerHtml({ name, partnerName, setupUrl, partnerEmail, hasReflection, hasIntimacy, hasConflict }) {
  // Exercises this order actually includes, so the email count matches the
  // dashboard. Communication + Expectations are always present.
  const exercises = [
    "Communication",
    "Expectations",
    ...(hasReflection ? ["Relationship Reflection"] : []),
    ...(hasIntimacy ? ["Physical Intimacy"] : []),
    // Conflict Patterns was missing, so a buyer was told they had fewer
    // exercises than they paid for, and the count in the sentence was wrong.
    ...(hasConflict ? ["Conflict Patterns"] : []),
  ];
  const exCount = exercises.length;
  const exWord = exCount === 1 ? "exercise" : "exercises";
  const exList = exCount === 2
    ? exercises.join(" and ")
    : exercises.slice(0, -1).join(", ") + ", and " + exercises[exCount - 1];
  const exMins = 25 + Math.max(0, exCount - 2) * 10; // ~25 min for two, +10 each
  const partnerBlock = partnerEmail
    ? `<div style="background:#FBF8F3;border:1px solid #F3EDE6;border-radius:10px;padding:16px 20px;margin:16px 0 0">
         <div style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:11px;color:#C17F47;font-weight:700;letter-spacing:.2em;text-transform:uppercase;margin-bottom:8px">Your partner</div>
         <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:14px;color:#5C4A38;line-height:1.65;margin:0">Once you finish setting up your profile, we'll email <strong style="color:#1E1610">${_esc(partnerEmail)}</strong> their own unique invite link to get started.</p>
       </div>`
    : `<div style="background:#FBF8F3;border:1px solid #F3EDE6;border-radius:10px;padding:16px 20px;margin:16px 0 0">
         <div style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:11px;color:#C17F47;font-weight:700;letter-spacing:.2em;text-transform:uppercase;margin-bottom:8px">Inviting ${_esc(partnerName || 'your partner')}</div>
         <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:14px;color:#5C4A38;line-height:1.65;margin:0">When you set up your profile, you'll be able to send ${_esc(partnerName || 'your partner')} their own unique invite link.</p>
       </div>`;

  const body = `
    <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:15px;color:#5C4A38;line-height:1.75;margin:0 0 6px">Your order is in. Use the button below to set up your account and create a password.</p>
    <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:14px;color:#5C4A38;line-height:1.7;margin:16px 0 0">Next you'll set up your profile and invite ${_esc(partnerName || 'your partner')}. Then you each answer ${exCount} short ${exWord}: ${exList}. Plan on about ${exMins} minutes. Answer independently. Your joint results unlock when both of you are done.</p>
    ${partnerBlock}
    <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:13px;color:#8C7A68;line-height:1.6;margin:20px 0 0"><strong style="color:#1E1610">One note:</strong> don't compare answers until you're both finished. The value comes from answering honestly first.</p>
  `;

  // The app prompt sits after the CTA copy rather than before it: the setup
  // link works in a browser today, and telling someone to download an app
  // before they can finish something they just paid for loses people. Once
  // the app is live setupUrl becomes a universal link, so the same button
  // opens the app for anyone who has it.
  const appLine = APP_LIVE
    ? `<p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:14px;color:#5C4A38;line-height:1.7;margin:18px 0 0">Download the Attune app to set up your account there. The button above opens it automatically if you already have it installed.</p>`
    : '';

  return brandedEmail({
    preheader: `Set up your Attune account, ${_esc(name)}`,
    title: `Welcome, ${_esc(name)}.`,
    subtitle: `One step left: set up your account.`,
    bodyHtml: body + appLine,
    ctaLabel: 'Set up your account →',
    ctaUrl: setupUrl,
  });
}

function partnerInviteHtml({ partnerName, buyerName, inviteUrl }) {
  const body = `
    <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:15px;color:#5C4A38;line-height:1.75;margin:0 0 6px">${_esc(buyerName)} set up Attune for the two of you. Two short exercises mapping how you each communicate and what you each expect. Your answers stay private until you're both done.</p>
    <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:14px;color:#5C4A38;line-height:1.7;margin:16px 0 0">Plan on about 25 minutes. Find a quiet moment and answer honestly. That's where the value is.</p>
    <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:13px;color:#8C7A68;line-height:1.6;margin:20px 0 0"><strong style="color:#1E1610">Heads up:</strong> this link is unique to you and works only once. Don't share it.</p>
  `;

  return brandedEmail({
    preheader: `${_esc(buyerName)} invited you to Attune`,
    title: `${_esc(buyerName)} invited you.`,
    subtitle: `Hi ${_esc(partnerName)}, here's how to get started.`,
    bodyHtml: body,
    ctaLabel: 'Set up my profile →',
    ctaUrl: inviteUrl,
    ctaColor: '#1B5FE8',
  });
}

function giftRecipientHtml({ recipientName, buyerName, pkgName, giftUrl }) {
  const body = `
    <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:15px;color:#5C4A38;line-height:1.75;margin:0 0 6px">${_esc(buyerName)} gave you <strong style="color:#1E1610">${_esc(pkgName)}</strong>, an experience for you and your partner. Two exercises that map how you communicate and what you each expect. The joint results only appear once you're both done.</p>
    <div style="background:#FBF8F3;border:1px solid #F3EDE6;border-radius:10px;padding:16px 20px;margin:20px 0 0">
      <div style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:11px;color:#C17F47;font-weight:700;letter-spacing:.2em;text-transform:uppercase;margin-bottom:8px">When you claim it</div>
      <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:14px;color:#5C4A38;line-height:1.65;margin:0">You'll set up your profile and add your partner's email. They'll receive their own unique link. Answer independently. Your results unlock together when you're both finished.</p>
    </div>
  `;

  return brandedEmail({
    preheader: `You've received an Attune gift from ${_esc(buyerName)}`,
    title: `A gift from ${_esc(buyerName)}.`,
    subtitle: `Hi ${_esc(recipientName)}, here's how to open it.`,
    bodyHtml: body,
    ctaLabel: 'Claim my gift →',
    ctaUrl: giftUrl,
  });
}
