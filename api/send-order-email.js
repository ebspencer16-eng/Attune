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
    orderNum, total,
    addonWorkbook,
    addonLmft,
    addonReflection,
    addonBudget,
  } = body;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return new Response('Email service not configured', { status: 503 });

  const emails = [];

  // ── 1. Order confirmation to buyer ─────────────────────────────────────────
  emails.push({
    from: `Attune <${FROM}>`,
    to: [buyerEmail],
    subject: `Your Attune order — ${orderNum}`,
    html: orderConfirmationHtml({ buyerName, pkgName, orderNum, total, isGift, isPhysical, recipientName, addonWorkbook, addonLmft, addonReflection, addonBudget }),
  });

  // ── 2. "Get started" to buyer (digital, for-self) ──────────────────────────
  if (!isGift && !isPhysical) {
    const accessUrl = `https://attune-relationships.com/app?signup=1&pkg=${pkgKey}&p1=${encodeURIComponent(buyerName||"")}`;
    const partnerInviteUrl = `https://attune-relationships.com/app?invite=INVITE_CODE&from=${encodeURIComponent(buyerName||"")}&pkg=${pkgKey}`;
    emails.push({
      from: `Attune <${FROM}>`,
      to: [buyerEmail],
      subject: `Set up your Attune profile — ${buyerName}`,
      html: getStartedBuyerHtml({ name: buyerName, partnerName, accessUrl, partnerInviteUrl, partnerEmail }),
    });

    // If buyer provided partner's email, send partner their invite directly
    if (partnerEmail) {
      emails.push({
        from: `Attune <${FROM}>`,
        to: [partnerEmail],
        subject: `${buyerName} invited you to Attune`,
        html: partnerInviteHtml({ partnerName, buyerName, inviteUrl: partnerInviteUrl }),
      });
    }
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
  const results = await Promise.allSettled(
    emails.map(email =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(email),
      }).then(r => r.json())
    )
  );

  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length > 0) {
    console.error('Some emails failed:', failed);
  }

  return new Response(JSON.stringify({ ok: true, sent: emails.length - failed.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── Email HTML templates ────────────────────────────────────────────────────

// Shared layout matching the notepad brand: navy header with logo + tagline,
// gradient rule, cream body with serif + sans blend.
function brandedEmail({ preheader = '', title, subtitle, bodyHtml, ctaLabel, ctaUrl, ctaColor = '#E8673A', footerNote = 'Questions? Reply to this email or reach us at hello@attune-relationships.com' }) {
  const cta = ctaLabel && ctaUrl
    ? `<tr><td style="padding:0 40px 28px;text-align:center">
         <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,${ctaColor},#d45a2e);color:#ffffff;padding:14px 34px;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:.04em;font-family:'DM Sans',Arial,sans-serif">${ctaLabel}</a>
       </td></tr>`
    : '';

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
  <tr><td style="padding:18px 40px 28px;border-top:1px solid #F3EDE6">
    <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:12px;color:#8C7A68;margin:0;line-height:1.6;text-align:center">${footerNote}</p>
  </td></tr>

</table>
<p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:11px;color:#B8A898;margin:16px 0 0;text-align:center">© 2026 Attune Relationships · attune-relationships.com</p>
</td></tr>
</table>
</body>
</html>`;
}

function orderConfirmationHtml({ buyerName, pkgName, orderNum, total, isGift, isPhysical, recipientName, addonWorkbook, addonLmft, addonReflection, addonBudget }) {
  const deliveryLine = isPhysical
    ? 'Your gift box will arrive within 3–5 business days. Setup instructions are inside.'
    : isGift
      ? `We've sent ${recipientName}'s access link in a separate email.`
      : 'Your access link has been sent in a separate email — check your inbox to set up your profile.';

  const addonRows = [
    addonWorkbook ? `<tr><td style="padding:6px 0;color:#8C7A68;font-size:14px">Personalized Workbook</td><td align="right" style="padding:6px 0;color:#C17F47;font-size:14px;font-weight:600">included</td></tr>` : '',
    addonLmft ? `<tr><td style="padding:6px 0;color:#8C7A68;font-size:14px">LMFT Session</td><td align="right" style="padding:6px 0;color:#5B6DF8;font-size:14px;font-weight:600">scheduling link to follow</td></tr>` : '',
    addonReflection ? `<tr><td style="padding:6px 0;color:#8C7A68;font-size:14px">Relationship Reflection</td><td align="right" style="padding:6px 0;color:#5B6DF8;font-size:14px;font-weight:600">included</td></tr>` : '',
    addonBudget ? `<tr><td style="padding:6px 0;color:#8C7A68;font-size:14px">Budget Priorities Exercise</td><td align="right" style="padding:6px 0;color:#C17F47;font-size:14px;font-weight:600">included</td></tr>` : '',
  ].filter(Boolean).join('');

  const body = `
    <div style="background:#FBF8F3;border:1px solid #F3EDE6;border-radius:10px;padding:20px 22px;margin:8px 0 16px">
      <div style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:11px;color:#C17F47;font-weight:700;letter-spacing:.2em;text-transform:uppercase;margin-bottom:12px">Order summary</div>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-family:'DM Sans',Helvetica,Arial,sans-serif">
        <tr><td style="padding:6px 0;color:#1E1610;font-size:14px;font-weight:600">${pkgName}</td><td align="right" style="padding:6px 0;color:#1E1610;font-size:14px;font-weight:600">$${total}</td></tr>
        ${addonRows}
        <tr><td colspan="2" style="border-top:1px solid #E8DDD0;padding-top:10px;margin-top:10px;font-size:12px;color:#8C7A68;font-family:'Menlo','SF Mono',monospace">Order #${orderNum}</td></tr>
      </table>
    </div>
    <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:14px;color:#5C4A38;line-height:1.7;margin:0">${deliveryLine}</p>
  `;

  return brandedEmail({
    preheader: `Order confirmed — ${pkgName}`,
    title: 'Order confirmed.',
    subtitle: `Hi ${buyerName}, thank you for your order. Here's what's coming next.`,
    bodyHtml: body,
  });
}

function getStartedBuyerHtml({ name, partnerName, accessUrl, partnerInviteUrl, partnerEmail }) {
  const partnerBlock = partnerEmail
    ? `<div style="background:#FBF8F3;border:1px solid #F3EDE6;border-radius:10px;padding:16px 20px;margin:16px 0 0">
         <div style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:11px;color:#C17F47;font-weight:700;letter-spacing:.2em;text-transform:uppercase;margin-bottom:8px">Your partner</div>
         <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:14px;color:#5C4A38;line-height:1.65;margin:0">We've sent ${partnerName}'s invite directly to <strong style="color:#1E1610">${partnerEmail}</strong>. They'll get their own unique link to set up their profile.</p>
       </div>`
    : `<div style="background:#FBF8F3;border:1px solid #F3EDE6;border-radius:10px;padding:16px 20px;margin:16px 0 0">
         <div style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:11px;color:#C17F47;font-weight:700;letter-spacing:.2em;text-transform:uppercase;margin-bottom:8px">Invite ${partnerName}</div>
         <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:14px;color:#5C4A38;line-height:1.65;margin:0 0 10px">Share this link so ${partnerName} can set up their own profile:</p>
         <div style="background:#ffffff;border:1px solid #E8DDD0;border-radius:8px;padding:10px 14px;font-family:'Menlo','SF Mono',monospace;font-size:12px;color:#1E1610;word-break:break-all">${partnerInviteUrl}</div>
       </div>`;

  const body = `
    <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:15px;color:#5C4A38;line-height:1.75;margin:0 0 6px">Your access is ready. Two exercises, about 25 minutes each. Answer independently — your joint results unlock when both of you are done.</p>
    ${partnerBlock}
    <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:13px;color:#8C7A68;line-height:1.6;margin:20px 0 0"><strong style="color:#1E1610">One note:</strong> don't compare answers until you're both finished. The value comes from answering honestly first.</p>
  `;

  return brandedEmail({
    preheader: `Set up your Attune profile, ${name}`,
    title: `Welcome, ${name}.`,
    subtitle: `Let's get your profile set up.`,
    bodyHtml: body,
    ctaLabel: 'Set up my profile →',
    ctaUrl: accessUrl,
  });
}

function partnerInviteHtml({ partnerName, buyerName, inviteUrl }) {
  const body = `
    <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:15px;color:#5C4A38;line-height:1.75;margin:0 0 6px">${buyerName} set up Attune for the two of you — two short exercises mapping how you each communicate and what you each expect. Your answers stay private until you're both done.</p>
    <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:14px;color:#5C4A38;line-height:1.7;margin:16px 0 0">Plan on about 25 minutes. Find a quiet moment and answer honestly — that's where the value is.</p>
    <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:13px;color:#8C7A68;line-height:1.6;margin:20px 0 0"><strong style="color:#1E1610">Heads up:</strong> this link is unique to you and works only once. Don't share it.</p>
  `;

  return brandedEmail({
    preheader: `${buyerName} invited you to Attune`,
    title: `${buyerName} invited you.`,
    subtitle: `Hi ${partnerName}, here's how to get started.`,
    bodyHtml: body,
    ctaLabel: 'Set up my profile →',
    ctaUrl: inviteUrl,
    ctaColor: '#1B5FE8',
  });
}

function giftRecipientHtml({ recipientName, buyerName, pkgName, giftUrl }) {
  const body = `
    <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:15px;color:#5C4A38;line-height:1.75;margin:0 0 6px">${buyerName} gave you <strong style="color:#1E1610">${pkgName}</strong> — an experience for you and your partner. Two exercises that map how you communicate and what you each expect. The joint results only appear once you're both done.</p>
    <div style="background:#FBF8F3;border:1px solid #F3EDE6;border-radius:10px;padding:16px 20px;margin:20px 0 0">
      <div style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:11px;color:#C17F47;font-weight:700;letter-spacing:.2em;text-transform:uppercase;margin-bottom:8px">When you claim it</div>
      <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:14px;color:#5C4A38;line-height:1.65;margin:0">You'll set up your profile and add your partner's email. They'll receive their own unique link. Answer independently — your results unlock together when you're both finished.</p>
    </div>
  `;

  return brandedEmail({
    preheader: `You've received an Attune gift from ${buyerName}`,
    title: `A gift from ${buyerName}.`,
    subtitle: `Hi ${recipientName}, here's how to open it.`,
    bodyHtml: body,
    ctaLabel: 'Claim my gift →',
    ctaUrl: giftUrl,
  });
}
