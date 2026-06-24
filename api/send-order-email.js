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

export const config = { runtime: 'edge' };

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
    addonLmft,
    addonReflection,
    addonBudget,
    addonIntimacy,
    setupPath,                       // '/app?signup=1&...' built by checkout
  } = body;

  // Account setup link for the setup email. Only accept a same-site /app path
  // so a hostile caller can't aim the CTA at another domain.
  const safeSetupPath = (typeof setupPath === 'string' && setupPath.startsWith('/app?') && !setupPath.includes('//'))
    ? setupPath
    : '/app?signup=1';
  const setupUrl = `https://attune-relationships.com${safeSetupPath}`;

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
    html: orderConfirmationHtml({ buyerName, pkgName, orderNum, total, lineItems, isGift, isPhysical, recipientName, addonWorkbook, addonLmft, addonReflection, addonBudget }),
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
      html: getStartedBuyerHtml({ name: buyerName, partnerName, setupUrl, partnerEmail, hasReflection: addonReflection, hasIntimacy: addonIntimacy }),
      scheduled_at: new Date(Date.now() + 10_000).toISOString(),
    });
  }

  // ── 3. Gift digital: email to recipient ────────────────────────────────────
  if (isGift && !isPhysical && recipientEmail) {
    const giftUrl = `https://attune-relationships.com/app?signup=1&pkg=${pkgKey}&gift=1`;
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

// Escape HTML to prevent XSS via names, package descriptions, etc.
// Buyer-controlled fields (buyerName, partnerName, recipientName, giftNote,
// pkgName from request body) flow into these templates and could contain
// markup if a hostile buyer is testing the system. Email clients sanitize
// most JavaScript but inline images / iframes / CSS can still be problematic.
const _esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

// Shared layout matching the notepad brand: navy header with logo + tagline,
// gradient rule, cream body with serif + sans blend.
function brandedEmail({ preheader = '', title, subtitle, bodyHtml, ctaLabel, ctaUrl, ctaColor = '#E8673A', footerNote = 'Questions? Reply to this email or reach us at hello@attune-relationships.com', userId = null }) {
  const cta = ctaLabel && ctaUrl
    ? `<tr><td style="padding:0 40px 28px;text-align:center">
         <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,${ctaColor},#d45a2e);color:#ffffff;padding:14px 34px;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:.04em;font-family:'DM Sans',Arial,sans-serif">${_esc(ctaLabel)}</a>
       </td></tr>`
    : '';

  // Unsubscribe link — uses encoded userId when available, else a mailto
  const unsubUrl = userId
    ? `https://attune-relationships.com/api/unsubscribe?token=${btoa(userId)}`
    : 'mailto:hello@attune-relationships.com?subject=Unsubscribe';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<!--[if mso]><style>body,table,td,a,p,h1,h2,h3{font-family:Arial,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:#FBF8F3;font-family:'DM Sans',Helvetica,Arial,sans-serif;color:#1E1610;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preheader}</div>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#FBF8F3">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 18px rgba(14,11,7,.08)">

  <!-- Navy header with mark + tagline -->
  <tr><td style="background:#162040;padding:28px 40px 26px" align="left">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
      <td width="50" valign="middle" style="vertical-align:middle;padding-right:16px">
        <img src="https://attune-relationships.com/attune-mark-navy.png" width="44" height="32" alt="Attune" style="display:block;border:0;outline:none">
      </td>
      <td valign="middle" style="vertical-align:middle;border-left:1px solid rgba(255,255,255,.3);padding-left:16px">
        <div style="font-family:Georgia,'Playfair Display',serif;font-style:italic;font-size:18px;font-weight:400;color:#ffffff;line-height:1.2">Understanding takes intention.</div>
        <div style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.55);margin-top:4px">Attune Relationships</div>
      </td>
    </tr></table>
  </td></tr>

  <!-- Gradient rule under header -->
  <tr><td style="height:4px;background:linear-gradient(90deg,#E8673A 0%,#9B5DE5 50%,#1B5FE8 100%);font-size:0;line-height:0">&nbsp;</td></tr>

  <!-- Title -->
  <tr><td style="padding:32px 40px 8px">
    <h1 style="font-family:Georgia,'Playfair Display',serif;font-size:24px;font-weight:700;color:#1E1610;margin:0;line-height:1.2;letter-spacing:-.02em">${title}</h1>
    ${subtitle ? `<p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:14px;color:#8C7A68;line-height:1.65;margin:10px 0 0;font-weight:400">${subtitle}</p>` : ''}
  </td></tr>

  <!-- Body content -->
  <tr><td style="padding:20px 40px 12px;font-family:'DM Sans',Helvetica,Arial,sans-serif">
    ${bodyHtml}
  </td></tr>

  ${cta}

  <!-- Footer note -->
  <tr><td style="padding:18px 40px 24px;border-top:1px solid #F3EDE6">
    <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:12px;color:#8C7A68;margin:0;line-height:1.6;text-align:center">${footerNote}</p>
    <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:11px;color:#B8A898;margin:10px 0 0;text-align:center"><a href="${unsubUrl}" style="color:#B8A898;text-decoration:underline">Manage email preferences</a></p>
  </td></tr>

</table>
<p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:11px;color:#B8A898;margin:16px 0 0;text-align:center">© 2026 Attune Relationships · attune-relationships.com</p>
</td></tr>
</table>
</body>
</html>`;
}

function orderConfirmationHtml({ buyerName, pkgName, orderNum, total, lineItems, isGift, isPhysical, recipientName, addonWorkbook, addonLmft, addonReflection, addonBudget }) {
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
    if (addonLmft)       items.push({ label: 'LMFT Session', price: 150 });
    if (addonReflection) items.push({ label: 'Relationship Reflection', price: 40 });
    if (addonBudget)     items.push({ label: 'Budget Priorities Exercise', price: 20 });
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

function getStartedBuyerHtml({ name, partnerName, setupUrl, partnerEmail, hasReflection, hasIntimacy }) {
  // Exercises this order actually includes, so the email count matches the
  // dashboard. Communication + Expectations are always present.
  const exercises = [
    "Communication",
    "Expectations",
    ...(hasReflection ? ["Relationship Reflection"] : []),
    ...(hasIntimacy ? ["Physical Intimacy"] : []),
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

  return brandedEmail({
    preheader: `Set up your Attune account, ${_esc(name)}`,
    title: `Welcome, ${_esc(name)}.`,
    subtitle: `One step left: set up your account.`,
    bodyHtml: body,
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
