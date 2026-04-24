/**
 * Vercel Serverless Function: /api/send-email
 *
 * Handles all transactional emails beyond order confirmation.
 * POST body: { type, ...params }
 *
 * Types:
 *   partner_invite  — { fromName, toEmail, toName, inviteUrl }
 *   workbook_ready  — { toEmail, toName, partnerName, downloadUrl, orderNum }
 *   beta_survey     — { toEmail, toName, partnerName, coupleType, surveyUrl }
 *   checkin_6mo     — { toEmail, toName, partnerName, retakeUrl }
 *   results_viewed  — { toEmail, toName, partnerName, coupleType, portalUrl, hasReflection, hasBudget, hasLMFT }
 *   welcome_account — { toEmail, toName, partnerName, portalUrl }
 *   partner_joined_notification — { toEmail, toName, partnerName, portalUrl }
 *   lmft_scheduled  — { toEmail, toName, partnerName, schedulingUrl, orderNum }
 *   checkin_1yr     — { toEmail, toName, partnerName, retakeUrl, portalUrl }
 *   shipping_notification — { toEmail, toName, partnerName, orderNum, trackingUrl?, trackingNumber?, carrier? }
 *
 * Required env vars (Vercel dashboard):
 *   RESEND_API_KEY   — from https://resend.com
 *   FROM_EMAIL       — verified sender, e.g. hello@attune-relationships.com
 */

export const config = { runtime: 'edge' };

const FROM = process.env.FROM_EMAIL || 'hello@attune-relationships.com';

// ── Shared layout wrapper ────────────────────────────────────────────────────
function layout(bodyHtml, userId = null) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body { margin:0; padding:0; background:#F3EDE6; font-family:'Helvetica Neue',Arial,sans-serif; }
  .wrap { max-width:560px; margin:0 auto; padding:32px 16px; }
  .card { background:#FFFDF9; border-radius:20px; padding:40px 36px; box-shadow:0 4px 24px rgba(14,11,7,0.08); }
  .logo { display:flex; align-items:center; gap:8px; margin-bottom:32px; }
  .logo-text { font-size:1.1rem; font-weight:700; color:#0E0B07; letter-spacing:-0.01em; }
  .grad-bar { height:3px; background:linear-gradient(90deg,#E8673A,#1B5FE8); border-radius:2px; margin-bottom:28px; }
  h1 { font-size:1.5rem; font-weight:700; color:#0E0B07; margin:0 0 12px; line-height:1.2; }
  p { font-size:0.9rem; color:#5C4D3C; line-height:1.75; margin:0 0 16px; }
  .btn { display:inline-block; padding:14px 28px; background:linear-gradient(135deg,#E8673A,#1B5FE8); color:white!important; text-decoration:none; border-radius:12px; font-weight:700; font-size:0.88rem; letter-spacing:0.03em; }
  .btn-wrap { text-align:center; margin:28px 0; }
  .divider { height:1px; background:#E8DDD0; margin:24px 0; }
  .footer { text-align:center; font-size:0.7rem; color:#C17F47; margin-top:24px; line-height:1.8; }
  .detail-row { display:flex; justify-content:space-between; font-size:0.82rem; padding:8px 0; border-bottom:1px solid #F3EDE6; color:#5C4D3C; }
  .detail-row strong { color:#0E0B07; }
  .badge { display:inline-block; padding:4px 10px; border-radius:20px; font-size:0.7rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; }
  .badge-orange { background:#FFF0EB; color:#E8673A; }
  .badge-blue { background:#EEF0FF; color:#1B5FE8; }
  .badge-green { background:#ECFDF5; color:#059669; }
</style>
</head>
<body>
<div class="wrap">
<div class="card">
<div class="logo">
  <svg width="28" height="20" viewBox="0 0 103 76" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="eg" x1="0" y1="0" x2="103" y2="76" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#E8673A"/><stop offset="100%" stop-color="#1B5FE8"/></linearGradient></defs>
    <path d="M14,4 L44,4 A9,9 0 0,1 53,13 L53,42 A9,9 0 0,1 44,51 L20,51 L6,61 L11,51 A6,6 0 0,1 5,45 L5,13 A9,9 0 0,1 14,4 Z" fill="url(#eg)"/>
    <path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="white" opacity="0.93" transform="translate(13.16,11.3) scale(0.72)"/>
    <path d="M89,14 L59,14 A9,9 0 0,0 50,23 L50,52 A9,9 0 0,0 59,61 L83,61 L97,71 L92,61 A6,6 0 0,0 98,55 L98,23 A9,9 0 0,0 89,14 Z" fill="none" stroke="url(#eg)" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="url(#eg)" transform="translate(58.16,21.3) scale(0.72)"/>
  </svg>
  <span class="logo-text">Attune</span>
</div>
<div class="grad-bar"></div>
${bodyHtml}
</div>
<div class="footer">
  Attune · <a href="https://attune-relationships.com" style="color:#C17F47">attune-relationships.com</a><br/>
  Questions? Reply to this email or write to hello@attune-relationships.com<br/>
  ${userId ? `<a href="https://attune-relationships.com/api/unsubscribe?token=${btoa(userId)}" style="color:#C17F47">Unsubscribe</a>` : '<a href="mailto:hello@attune-relationships.com?subject=Unsubscribe" style="color:#C17F47">Unsubscribe</a>'}
</div>
</div>
</body>
</html>`;
}

// ── Email builders ───────────────────────────────────────────────────────────

function partnerInviteEmail({ fromName, toName, inviteUrl }, userId = null) {
  const name = toName || "there";
  return {
    subject: `${fromName} invited you to take Attune`,
    html: layout(`
      <h1>${fromName} invited you to take Attune together.</h1>
      <p>Hi ${name},</p>
      <p>${fromName} completed their Attune exercises and wants to see your results together. Attune maps how you each communicate, what you expect from each other, and where you're already aligned.</p>
      <p>Your answers are private until both of you are done. Results unlock the moment you finish.</p>
      <div class="btn-wrap"><a href="${inviteUrl}" class="btn">Start my exercises →</a></div>
      <div class="divider"></div>
      <p style="font-size:0.78rem;color:#8C7A68;">Takes about 25 minutes total. No right answers — just yours.</p>
    `),
  };
}

function workbookReadyEmail({ toName, partnerName, downloadUrl, orderNum }) {
  return {
    subject: "Your Attune workbook is ready",
    html: layout(`
      <span class="badge badge-green">Workbook ready</span>
      <h1 style="margin-top:14px;">Your personalized workbook is ready.</h1>
      <p>Hi ${toName},</p>
      <p>Your workbook for ${toName} &amp; ${partnerName} has been generated from your actual results. It covers your top growth areas, the dimensions where you're most aligned, and practices built for how you two specifically are wired.</p>
      <div class="btn-wrap"><a href="${downloadUrl}" class="btn">Download workbook</a></div>
      <div class="divider"></div>
      <div class="detail-row"><span>Order</span><strong>#${orderNum}</strong></div>
      <div class="detail-row"><span>Format</span><strong>.docx — opens in Word, Pages, or Google Docs</strong></div>
      <p style="font-size:0.78rem;color:#8C7A68;margin-top:16px;">The download link is active for 30 days. Reply to this email if you have trouble accessing your file.</p>
    `),
  };
}

// ── shipping_notification email ──────────────────────────────────────────────
// Sent when admin flips card_status to 'shipped'. trackingUrl is optional.
function shippingNotificationEmail({ toName, partnerName, orderNum, trackingUrl, trackingNumber, carrier }) {
  const who = partnerName ? `${toName} &amp; ${partnerName}` : toName;
  const trackingBlock = trackingUrl ? `
    <div class="btn-wrap"><a href="${trackingUrl}" class="btn">Track your package</a></div>
    ${trackingNumber ? `<div class="detail-row"><span>Tracking number</span><strong>${trackingNumber}</strong></div>` : ''}
    ${carrier ? `<div class="detail-row"><span>Carrier</span><strong>${carrier}</strong></div>` : ''}
  ` : `
    ${trackingNumber ? `<div class="detail-row"><span>Tracking number</span><strong>${trackingNumber}</strong></div>` : ''}
    ${carrier ? `<div class="detail-row"><span>Carrier</span><strong>${carrier}</strong></div>` : ''}
    <p style="font-size:0.82rem;color:#8C7A68;">Tracking details will arrive separately if not listed above.</p>
  `;
  return {
    subject: "Your Attune box has shipped",
    html: layout(`
      <span class="badge badge-green">Shipped</span>
      <h1 style="margin-top:14px;">Your Attune box is on its way.</h1>
      <p>Hi ${toName},</p>
      <p>Your package for ${who} has shipped. It includes your printed workbook and anything else you added to your box.</p>
      ${trackingBlock}
      <div class="divider"></div>
      <div class="detail-row"><span>Order</span><strong>#${orderNum}</strong></div>
      <p style="font-size:0.78rem;color:#8C7A68;margin-top:16px;">Most shipments arrive within 5–7 business days. Reply to this email if you have any questions.</p>
    `),
  };
}

function betaSurveyEmail({ toName, partnerName, coupleType, surveyUrl }) {
  return {
    subject: "A quick question about your Attune experience",
    html: layout(`
      <span class="badge badge-orange">Beta feedback</span>
      <h1 style="margin-top:14px;">How did it land?</h1>
      <p>Hi ${toName},</p>
      <p>You and ${partnerName} completed Attune${coupleType ? ` — your couple type is <strong>${coupleType}</strong>` : ""}. We'd love to know what was useful and what wasn't.</p>
      <p>It's four questions and takes under two minutes.</p>
      <div class="btn-wrap"><a href="${surveyUrl}" class="btn">Share feedback →</a></div>
      <div class="divider"></div>
      <p style="font-size:0.78rem;color:#8C7A68;">This is a beta product. Your feedback shapes what we build next.</p>
    `),
  };
}

function checkin6moEmail({ toName, partnerName, retakeUrl }) {
  return {
    subject: "Six months with Attune — worth a look",
    html: layout(`
      <h1>Six months is a good time to check in.</h1>
      <p>Hi ${toName},</p>
      <p>Six months ago, you and ${partnerName} took Attune together. Couples who retake it after 6–12 months often find their results have shifted — usually in ways that reflect real changes in how they're relating.</p>
      <p>A lot can move in half a year: how you handle stress, what you need, how you repair. Some things get easier. New friction appears. The assessment is most useful as a check-in, not a one-time snapshot.</p>
      <div class="btn-wrap"><a href="${retakeUrl}" class="btn">Retake Attune →</a></div>
      <div class="divider"></div>
      <p style="font-size:0.78rem;color:#8C7A68;">Your previous results are still accessible in your dashboard. Retaking creates a new session — you'll be able to compare the two.</p>
    `),
  };
}

// ── results_viewed email ─────────────────────────────────────────────────────
function resultsViewedEmail({ toName, partnerName, coupleType, portalUrl, hasReflection, hasBudget, hasLMFT }) {
  const name = toName || "there";
  const partner = partnerName || "your partner";
  const appUrl = portalUrl || "https://attune-relationships.com/app";

  const addonRows = [
    ...(!hasReflection ? [`
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #F3EDE6;vertical-align:top">
        <div style="display:flex;align-items:flex-start;gap:12px">
          <div style="width:36px;height:36px;border-radius:10px;background:#EEF2FF;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1rem">♡</div>
          <div>
            <div style="font-size:0.88rem;font-weight:700;color:#0E0B07;margin-bottom:3px">Relationship Reflection</div>
            <div style="font-size:0.78rem;color:#8C7A68;line-height:1.6">A third exercise: shared history, meaningful moments, priorities, and what you admire in each other. Includes side-by-side insights and action plan.</div>
          </div>
          <div style="text-align:right;flex-shrink:0;padding-left:8px">
            <div style="font-size:0.92rem;font-weight:700;color:#0E0B07">+$40</div>
          </div>
        </div>
      </td>
    </tr>`] : []),
    ...(!hasBudget ? [`
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #F3EDE6;vertical-align:top">
        <div style="display:flex;align-items:flex-start;gap:12px">
          <div style="width:36px;height:36px;border-radius:10px;background:#FFF8F5;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1rem">💰</div>
          <div>
            <div style="font-size:0.88rem;font-weight:700;color:#0E0B07;margin-bottom:3px">Budget Priorities Exercise</div>
            <div style="font-size:0.78rem;color:#8C7A68;line-height:1.6">Map what each of you values spending on and where your instincts differ. Adds context to your expectations results.</div>
          </div>
          <div style="text-align:right;flex-shrink:0;padding-left:8px">
            <div style="font-size:0.92rem;font-weight:700;color:#0E0B07">+$20</div>
          </div>
        </div>
      </td>
    </tr>`] : []),
    ...(!hasLMFT ? [`
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #F3EDE6;vertical-align:top">
        <div style="display:flex;align-items:flex-start;gap:12px">
          <div style="width:36px;height:36px;border-radius:10px;background:#F0F0FF;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1rem">🧠</div>
          <div>
            <div style="font-size:0.88rem;font-weight:700;color:#0E0B07;margin-bottom:3px">LMFT Session</div>
            <div style="font-size:0.78rem;color:#8C7A68;line-height:1.6">A 50-minute video session with a licensed marriage and family therapist who reviews your joint results before you meet. Not a first appointment — a real conversation about what your results mean.</div>
          </div>
          <div style="text-align:right;flex-shrink:0;padding-left:8px">
            <div style="font-size:0.92rem;font-weight:700;color:#0E0B07">+$150</div>
          </div>
        </div>
      </td>
    </tr>`] : []),
    `<tr>
      <td style="padding:12px 0;vertical-align:top">
        <div style="display:flex;align-items:flex-start;gap:12px">
          <div style="width:36px;height:36px;border-radius:10px;background:#FDF8F3;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1rem">📖</div>
          <div>
            <div style="font-size:0.88rem;font-weight:700;color:#0E0B07;margin-bottom:3px">Personalized Workbook</div>
            <div style="font-size:0.78rem;color:#8C7A68;line-height:1.6">A 20–30 page workbook drawn entirely from your results — conversation starters, reflection activities, and exercises built for how you two are actually wired.</div>
          </div>
          <div style="text-align:right;flex-shrink:0;padding-left:8px">
            <div style="font-size:0.92rem;font-weight:700;color:#0E0B07">from $19</div>
          </div>
        </div>
      </td>
    </tr>`,
  ].join('');

  return {
    subject: `Your Attune results are ready${coupleType ? ` — you're ${coupleType}` : ""}`,
    html: layout(`
      <h1>Your results are ready.</h1>
      <p>Hi ${name}, you and ${partner} just completed Attune${coupleType ? ` — your couple type is <strong>${coupleType}</strong>` : ""}. Everything you need is in your results portal.</p>
      <div class="btn-wrap"><a href="${appUrl}" class="btn">View your results →</a></div>
      <div class="divider"></div>
      <p style="font-size:0.82rem;font-weight:700;color:#0E0B07;margin-bottom:6px">What did you think?</p>
      <p style="font-size:0.82rem;">We'd love to hear how it landed. Reply to this email with anything — what was useful, what felt off, what surprised you. We read every response.</p>
      <div class="divider"></div>
      <p style="font-size:0.82rem;font-weight:700;color:#0E0B07;margin-bottom:10px">Go deeper with your results</p>
      <p style="font-size:0.8rem;color:#8C7A68;margin-bottom:14px">A few things you can add from your portal, based on what you've already completed:</p>
      <table style="width:100%;border-collapse:collapse">
        ${addonRows}
      </table>
      <div class="btn-wrap" style="margin-top:20px"><a href="${appUrl}" class="btn" style="background:linear-gradient(135deg,#0E0B07,#2D2250)">Add to your package →</a></div>
      <div class="divider"></div>
      <p style="font-size:0.82rem;font-weight:700;color:#0E0B07;margin-bottom:6px">In Practice</p>
      <p style="font-size:0.8rem;color:#8C7A68;margin-bottom:14px">A few things worth reading while your results are fresh:</p>
      ${[
        { title: "How to review your results together", url: "https://attune-relationships.com/practice/how-to-review-your-results-together", tag: "Guide" },
        { title: "Why couples fight about the same things", url: "https://attune-relationships.com/practice/why-couples-fight-about-the-same-things", tag: "Read" },
        { title: "How to start a hard conversation", url: "https://attune-relationships.com/practice/how-to-start-a-hard-conversation", tag: "Guide" },
      ].map(r => `<p style="margin:0 0 10px"><a href="${r.url}" style="color:#E8673A;font-weight:600;font-size:0.82rem;text-decoration:none">${r.tag}: ${r.title} →</a></p>`).join('')}
    `),
  };
}


// ── welcome_account email ────────────────────────────────────────────────────
function welcomeAccountEmail({ toName, toEmail, portalUrl, partnerName }) {
  const name = toName || "there";
  const url = portalUrl || "https://attune-relationships.com/app";
  return {
    subject: "Welcome to Attune — let's get started",
    html: layout(`
      <h1>You're in. Let's get started.</h1>
      <p>Hi ${name},</p>
      <p>Your Attune account is set up. Both you and ${partnerName ? `<strong>${partnerName}</strong>` : "your partner"} each complete the exercises independently — your answers stay private until both of you are done.</p>
      <div class="btn-wrap"><a href="${url}" class="btn">Go to my dashboard →</a></div>
      <div class="divider"></div>
      <p style="font-size:0.82rem;font-weight:700;color:#0E0B07;margin-bottom:6px;">What happens next</p>
      <p style="font-size:0.8rem;">1. Complete Exercise 01: Communication (about 10 minutes).<br/>
      2. Complete Exercise 02: Expectations (about 15 minutes).<br/>
      3. Invite your partner — or they'll receive a link if you already added their email.<br/>
      4. Once both of you are done, your joint results unlock.</p>
      <div class="divider"></div>
      <p style="font-size:0.78rem;color:#8C7A68;">Your answers are never visible to your partner while you're in progress. Results unlock the moment you both finish.</p>
    `),
  };
}

// ── partner_joined_notification email ────────────────────────────────────────
function partnerJoinedNotificationEmail({ toName, partnerName, portalUrl }) {
  const name = toName || "there";
  const url = portalUrl || "https://attune-relationships.com/app";
  return {
    subject: `${partnerName} just joined Attune`,
    html: layout(`
      <span class="badge badge-green">Partner joined</span>
      <h1 style="margin-top:14px;">${partnerName} just created their account.</h1>
      <p>Hi ${name},</p>
      <p>${partnerName} has joined Attune. Once both of you have completed your exercises, your joint results will unlock. Your answers stay private until then.</p>
      <div class="btn-wrap"><a href="${url}" class="btn">Go to my dashboard →</a></div>
      <div class="divider"></div>
      <p style="font-size:0.78rem;color:#8C7A68;">Results unlock automatically when both partners have finished. You'll receive another email when they're ready.</p>
    `),
  };
}

// ── lmft_scheduled email ─────────────────────────────────────────────────────
function lmftScheduledEmail({ toName, partnerName, schedulingUrl, orderNum }) {
  const name = toName || "there";
  const url = schedulingUrl || "https://attune-relationships.com/app";
  return {
    subject: "Book your LMFT session — Attune",
    html: layout(`
      <span class="badge badge-blue">LMFT session included</span>
      <h1 style="margin-top:14px;">Book your session with a licensed therapist.</h1>
      <p>Hi ${name},</p>
      <p>Your Attune package includes a 50-minute session with a licensed marriage and family therapist (LMFT). They'll review your joint results before you meet — so the session starts from your actual data, not from scratch.</p>
      <div class="btn-wrap"><a href="${url}" class="btn">Book your session →</a></div>
      <div class="divider"></div>
      <p style="font-size:0.82rem;font-weight:700;color:#0E0B07;margin-bottom:6px;">How it works</p>
      <p style="font-size:0.8rem;">1. Complete your Attune exercises if you haven't yet.<br/>
      2. Once both partners are done, click the link above to book your session.<br/>
      3. Your therapist will receive your joint results in advance.<br/>
      4. The session is conducted over video — 50 minutes, just the two of you and the therapist.</p>
      <div class="divider"></div>
      <p style="font-size:0.82rem;font-weight:700;color:#0E0B07;margin-bottom:6px;">What to expect</p>
      <p style="font-size:0.8rem;">This is not a first therapy appointment. The therapist uses your Attune results as the starting point — they already know your couple type, your biggest dimension gaps, and your expectation misalignments. The session is focused on translating your data into practical next steps.</p>
      <div class="divider"></div>
      <div class="detail-row"><span>Order</span><strong>#${orderNum || "—"}</strong></div>
      <div class="detail-row"><span>Format</span><strong>50-minute video session</strong></div>
      <div class="detail-row"><span>Participants</span><strong>${name} + ${partnerName || "partner"} + LMFT</strong></div>
      <p style="font-size:0.78rem;color:#8C7A68;margin-top:16px;">The scheduling link above lets you select a time that works for both of you. If you have trouble booking, reply to this email.</p>
    `),
  };
}

// ── checkin_1yr email ─────────────────────────────────────────────────────────
function checkin1yrEmail({ toName, partnerName, retakeUrl, portalUrl }) {
  const name = toName || "there";
  const url = retakeUrl || portalUrl || "https://attune-relationships.com/app";
  return {
    subject: "One year with Attune — your results are worth revisiting",
    html: layout(`
      <h1>A year is a meaningful unit of time.</h1>
      <p>Hi ${name},</p>
      <p>You and ${partnerName} took Attune a year ago. In that time, you've navigated seasons, decisions, and the ordinary accumulation of a shared life. The patterns that showed up in your results may look different now.</p>
      <p>Couples who retake the assessment after a year typically find that some dimensions have shifted significantly — often in ways they can trace to specific experiences. The comparison is usually more useful than either session on its own.</p>
      <div class="btn-wrap"><a href="${url}" class="btn">Retake Attune →</a></div>
      <div class="divider"></div>
      <p style="font-size:0.78rem;color:#8C7A68;">Your original results are still in your dashboard. Retaking creates a new session — you'll be able to see both side by side.</p>
    `),
  };
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  // Basic origin guard — only accept requests from our own domain or internal (no origin = server-to-server)
  const origin = req.headers.get('origin') || '';
  if (origin && !origin.includes('attune-relationships.com') && !origin.includes('localhost') && !origin.includes('vercel.app')) {
    return new Response('Forbidden', { status: 403 });
  }

  let body;
  try { body = await req.json(); }
  catch { return new Response('Invalid JSON', { status: 400 }); }

  const { type } = body;
  let email;

  const userId = body.userId || null;
  if (type === 'partner_invite') {
    if (!body.toEmail || !body.fromName) return new Response('Missing toEmail or fromName', { status: 400 });
    email = partnerInviteEmail(body, userId);
    email.to = body.toEmail;
  } else if (type === 'workbook_ready') {
    if (!body.toEmail) return new Response('Missing toEmail', { status: 400 });
    email = workbookReadyEmail(body);
    email.to = body.toEmail;
  } else if (type === 'beta_survey') {
    if (!body.toEmail) return new Response('Missing toEmail', { status: 400 });
    email = betaSurveyEmail(body);
    email.to = body.toEmail;
  } else if (type === 'checkin_6mo') {
    if (!body.toEmail) return new Response('Missing toEmail', { status: 400 });
    email = checkin6moEmail(body);
    email.to = body.toEmail;
  } else if (type === 'results_viewed') {
    if (!body.toEmail) return new Response('Missing toEmail', { status: 400 });
    email = resultsViewedEmail(body);
    email.to = body.toEmail;
  } else if (type === 'welcome_account') {
    if (!body.toEmail) return new Response('Missing toEmail', { status: 400 });
    email = welcomeAccountEmail(body);
    email.to = body.toEmail;
  } else if (type === 'partner_joined_notification') {
    if (!body.toEmail) return new Response('Missing toEmail', { status: 400 });
    email = partnerJoinedNotificationEmail(body);
    email.to = body.toEmail;
  } else if (type === 'lmft_scheduled') {
    if (!body.toEmail) return new Response('Missing toEmail', { status: 400 });
    email = lmftScheduledEmail(body);
    email.to = body.toEmail;
  } else if (type === 'checkin_1yr') {
    if (!body.toEmail) return new Response('Missing toEmail', { status: 400 });
    email = checkin1yrEmail(body);
    email.to = body.toEmail;
  } else if (type === 'shipping_notification') {
    if (!body.toEmail) return new Response('Missing toEmail', { status: 400 });
    email = shippingNotificationEmail(body);
    email.to = body.toEmail;
  } else {
    return new Response(`Unknown type: ${type}`, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Dev mode — log and return mock success
    console.log('[send-email] No RESEND_API_KEY — would send:', { type, to: email.to, subject: email.subject });
    return new Response(JSON.stringify({ ok: true, mock: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ from: FROM, to: email.to, subject: email.subject, html: email.html }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[send-email] Resend error:', data);
    return new Response(JSON.stringify({ ok: false, error: data }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: true, id: data.id }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
