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
  } = body;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return new Response('Email service not configured', { status: 503 });

  const emails = [];

  // ── 1. Order confirmation to buyer ─────────────────────────────────────────
  emails.push({
    from: `Attune <${FROM}>`,
    to: [buyerEmail],
    subject: `Your Attune order — ${orderNum}`,
    html: orderConfirmationHtml({ buyerName, pkgName, orderNum, total, isGift, isPhysical, recipientName, addonWorkbook }),
  });

  // ── 2. "Get started" to buyer (digital, for-self) ──────────────────────────
  if (!isGift && !isPhysical) {
    const accessUrl = `https://attune.com/portal?token=${orderNum}-buyer`;
    const partnerInviteUrl = `https://attune.com/portal?partnerToken=${orderNum}-partner`;
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
    const giftUrl = `https://attune.com/portal?token=${orderNum}-gift`;
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

function orderConfirmationHtml({ buyerName, pkgName, orderNum, total, isGift, isPhysical, recipientName, addonWorkbook }) {
  const deliveryNote = isPhysical
    ? 'Your gift box will arrive within 3–5 business days.'
    : isGift
      ? `We'll send ${recipientName}'s access link to this email address.`
      : 'Your access link has been sent in a separate email.';

  return `<!DOCTYPE html><html><body style="font-family:'DM Sans',Arial,sans-serif;background:#FFFDF9;color:#1E1610;max-width:560px;margin:0 auto;padding:2rem">
    <div style="text-align:center;margin-bottom:2rem">
      <div style="font-family:Georgia,serif;font-size:1.4rem;font-weight:700;color:#0E0B07">Attune</div>
    </div>
    <div style="background:white;border:1.5px solid #E8DDD0;border-radius:16px;padding:2rem">
      <p style="font-size:1rem;font-weight:700;color:#0E0B07;margin-bottom:.5rem">Order confirmed ✓</p>
      <p style="color:#8C7A68;font-size:.9rem;margin-bottom:1.5rem">Hi ${buyerName}, your order is confirmed and being processed.</p>
      <div style="background:#FBF8F3;border-radius:10px;padding:1.1rem;margin-bottom:1.25rem">
        <div style="font-size:.7rem;color:#C17F47;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:.75rem">Order summary</div>
        <div style="display:flex;justify-content:space-between;font-size:.88rem;margin-bottom:.4rem"><span style="color:#8C7A68">${pkgName}</span><span style="font-weight:600">$${total}</span></div>
        ${addonWorkbook ? `<div style="display:flex;justify-content:space-between;font-size:.88rem;margin-bottom:.4rem"><span style="color:#8C7A68">Personalized Workbook</span><span style="font-weight:600;color:#C17F47">included</span></div>` : ''}
        <div style="border-top:1px solid #E8DDD0;margin-top:.75rem;padding-top:.75rem;font-size:.75rem;color:#8C7A68">Order #${orderNum}</div>
      </div>
      <p style="font-size:.85rem;color:#8C7A68;line-height:1.7">${deliveryNote}</p>
    </div>
    <p style="text-align:center;font-size:.72rem;color:#C17F47;margin-top:1.5rem">Questions? Reply to this email or reach us at hello@attune-relationships.com</p>
  </body></html>`;
}

function getStartedBuyerHtml({ name, partnerName, accessUrl, partnerInviteUrl, partnerEmail }) {
  return `<!DOCTYPE html><html><body style="font-family:'DM Sans',Arial,sans-serif;background:#FFFDF9;color:#1E1610;max-width:560px;margin:0 auto;padding:2rem">
    <div style="text-align:center;margin-bottom:2rem">
      <div style="font-family:Georgia,serif;font-size:1.4rem;font-weight:700;color:#0E0B07">Attune</div>
    </div>
    <div style="background:white;border:1.5px solid #E8DDD0;border-radius:16px;padding:2rem">
      <p style="font-size:1rem;font-weight:700;color:#0E0B07;margin-bottom:.5rem">Set up your profile, ${name}</p>
      <p style="color:#8C7A68;font-size:.88rem;line-height:1.7;margin-bottom:1.5rem">Your access is ready. Click below to create your profile and start your exercises. Each of you should complete them independently — don't compare answers until you're both done.</p>
      <div style="text-align:center;margin-bottom:1.5rem">
        <a href="${accessUrl}" style="display:inline-block;background:linear-gradient(135deg,#E8673A,#d45a2e);color:white;padding:.85rem 2rem;border-radius:12px;font-size:.85rem;font-weight:700;text-decoration:none;letter-spacing:.04em">Set up my profile →</a>
      </div>
      <div style="background:#FBF8F3;border-radius:10px;padding:1.1rem;margin-bottom:1rem">
        <div style="font-size:.7rem;color:#C17F47;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:.75rem">Your partner's invite link</div>
        <p style="font-size:.83rem;color:#8C7A68;line-height:1.65;margin-bottom:.75rem">
          ${partnerEmail
            ? `We've sent ${partnerName}'s invite directly to ${partnerEmail}. They'll receive their own unique link to set up their profile.`
            : `Share this link with ${partnerName} so they can set up their own profile:`
          }
        </p>
        ${!partnerEmail ? `<div style="background:white;border:1px solid #E8DDD0;border-radius:8px;padding:.65rem .85rem;font-size:.75rem;color:#0E0B07;word-break:break-all">${partnerInviteUrl}</div>` : ''}
      </div>
      <p style="font-size:.75rem;color:#8C7A68;line-height:1.6"><strong>Important:</strong> Each partner uses their own unique link. Results stay private until both of you have finished both exercises.</p>
    </div>
    <p style="text-align:center;font-size:.72rem;color:#C17F47;margin-top:1.5rem">Attune · hello@attune-relationships.com</p>
  </body></html>`;
}

function partnerInviteHtml({ partnerName, buyerName, inviteUrl }) {
  return `<!DOCTYPE html><html><body style="font-family:'DM Sans',Arial,sans-serif;background:#FFFDF9;color:#1E1610;max-width:560px;margin:0 auto;padding:2rem">
    <div style="text-align:center;margin-bottom:2rem">
      <div style="font-family:Georgia,serif;font-size:1.4rem;font-weight:700;color:#0E0B07">Attune</div>
    </div>
    <div style="background:white;border:1.5px solid #E8DDD0;border-radius:16px;padding:2rem">
      <p style="font-size:1rem;font-weight:700;color:#0E0B07;margin-bottom:.5rem">${buyerName} invited you to Attune</p>
      <p style="color:#8C7A68;font-size:.88rem;line-height:1.7;margin-bottom:1.5rem">Hi ${partnerName}, ${buyerName} has set up Attune for the two of you. Click below to create your own profile and complete your exercises. Take your time — your answers stay private until you're both done.</p>
      <div style="text-align:center;margin-bottom:1.5rem">
        <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#1B5FE8,#4555e8);color:white;padding:.85rem 2rem;border-radius:12px;font-size:.85rem;font-weight:700;text-decoration:none;letter-spacing:.04em">Set up my profile →</a>
      </div>
      <p style="font-size:.75rem;color:#8C7A68;line-height:1.6">This link is unique to you and can only be used once. Don't share it.</p>
    </div>
    <p style="text-align:center;font-size:.72rem;color:#C17F47;margin-top:1.5rem">Attune · hello@attune-relationships.com</p>
  </body></html>`;
}

function giftRecipientHtml({ recipientName, buyerName, pkgName, giftUrl }) {
  return `<!DOCTYPE html><html><body style="font-family:'DM Sans',Arial,sans-serif;background:#FFFDF9;color:#1E1610;max-width:560px;margin:0 auto;padding:2rem">
    <div style="text-align:center;margin-bottom:2rem">
      <div style="font-family:Georgia,serif;font-size:1.4rem;font-weight:700;color:#0E0B07">Attune</div>
    </div>
    <div style="background:white;border:1.5px solid #E8DDD0;border-radius:16px;padding:2rem">
      <p style="font-size:1rem;font-weight:700;color:#0E0B07;margin-bottom:.5rem">You've received a gift 🎁</p>
      <p style="color:#8C7A68;font-size:.88rem;line-height:1.7;margin-bottom:1.5rem">Hi ${recipientName}, ${buyerName} gave you ${pkgName} — a relationship experience for you and your partner.</p>
      <div style="text-align:center;margin-bottom:1.5rem">
        <a href="${giftUrl}" style="display:inline-block;background:linear-gradient(135deg,#E8673A,#d45a2e);color:white;padding:.85rem 2rem;border-radius:12px;font-size:.85rem;font-weight:700;text-decoration:none;letter-spacing:.04em">Claim my gift →</a>
      </div>
      <div style="background:#FBF8F3;border-radius:10px;padding:1.1rem">
        <div style="font-size:.7rem;color:#C17F47;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:.75rem">When you claim your gift</div>
        <p style="font-size:.83rem;color:#8C7A68;line-height:1.65">You'll set up your profile and enter your partner's email so we can send them their own unique link. Each of you completes the exercises privately — your results unlock together when you're both done.</p>
      </div>
    </div>
    <p style="text-align:center;font-size:.72rem;color:#C17F47;margin-top:1.5rem">Attune · hello@attune-relationships.com</p>
  </body></html>`;
}
