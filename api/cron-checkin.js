/**
 * GET /api/cron-checkin
 *
 * Vercel Cron Job — runs daily at 09:00 UTC.
 * Sends two timed follow-ups:
 *   • 6-month check-in (checkin_sent_at IS NULL)
 *   • 1-year check-in  (checkin_1yr_sent_at IS NULL, created_at ~12 months ago)
 *
 * Both emails include a Relationship Reflection CTA if the user hasn't yet
 * completed Exercise 03 (detected via profiles.ex3_completed field).
 *
 * Required env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY, FROM_EMAIL, CRON_SECRET
 */
export const config = { runtime: 'edge' };

export default async function handler(req) {
  const auth = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY;
  const resendKey   = process.env.RESEND_API_KEY;
  const fromEmail   = process.env.FROM_EMAIL || 'hello@attune-relationships.com';

  if (!supabaseUrl || !serviceKey || !resendKey) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500 });
  }

  const now = new Date();
  let sent6mo = 0, sent1yr = 0, failed = 0;

  // ── Helper: date window ───────────────────────────────────────────────────
  function windowFor(monthsAgo, daysBefore = 7, daysAfter = 7) {
    const target = new Date(now);
    target.setMonth(target.getMonth() - monthsAgo);
    const start = new Date(target); start.setDate(start.getDate() - daysBefore);
    const end   = new Date(target); end.setDate(end.getDate() + daysAfter);
    return { start, end };
  }

  // ── Helper: fetch eligible users ─────────────────────────────────────────
  async function fetchUsers(sentAtField, window) {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=id,email,name,partner_name,created_at,ex3_completed,has_anniversary` +
      `&email_opt_in=eq.true` +
      `&${sentAtField}=is.null` +
      `&created_at=gte.${window.start.toISOString()}` +
      `&created_at=lte.${window.end.toISOString()}`,
      { headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` } }
    );
    if (!res.ok) { console.error('[cron-checkin] Query failed:', await res.text()); return []; }
    return res.json();
  }

  // ── Helper: mark sent ─────────────────────────────────────────────────────
  async function markSent(userId, field) {
    await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json', 'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ [field]: now.toISOString() }),
    });
  }

  // ── Helper: send via Resend ───────────────────────────────────────────────
  async function sendEmail(to, subject, html) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `Attune <${fromEmail}>`, to: [to], subject, html }),
    });
    return r.ok;
  }

  // ── 6-month check-in ──────────────────────────────────────────────────────
  const users6mo = await fetchUsers('checkin_sent_at', windowFor(6));
  for (const user of users6mo) {
    if (!user.email) continue;
    const hasRefl = !!(user.ex3_completed || user.has_anniversary);
    const ok = await sendEmail(
      user.email,
      `How are you and ${user.partner_name || 'your partner'} doing?`,
      checkinHtml({ toName: user.name || 'there', partnerName: user.partner_name || 'your partner', months: 6, hasReflection: hasRefl, retakeUrl: 'https://attune-relationships.com/app?signin=1' })
    );
    if (ok) { await markSent(user.id, 'checkin_sent_at'); sent6mo++; }
    else { console.error('[cron-checkin] 6mo email failed:', user.email); failed++; }
  }

  // ── 1-year check-in ───────────────────────────────────────────────────────
  const users1yr = await fetchUsers('checkin_1yr_sent_at', windowFor(12));
  for (const user of users1yr) {
    if (!user.email) continue;
    const hasRefl = !!(user.ex3_completed || user.has_anniversary);
    const ok = await sendEmail(
      user.email,
      `A year with ${user.partner_name || 'your partner'} — how things look now`,
      checkinHtml({ toName: user.name || 'there', partnerName: user.partner_name || 'your partner', months: 12, hasReflection: hasRefl, retakeUrl: 'https://attune-relationships.com/app?signin=1' })
    );
    if (ok) { await markSent(user.id, 'checkin_1yr_sent_at'); sent1yr++; }
    else { console.error('[cron-checkin] 1yr email failed:', user.email); failed++; }
  }

  console.log(`[cron-checkin] 6mo: sent ${sent6mo}, 1yr: sent ${sent1yr}, failed: ${failed}`);
  return new Response(JSON.stringify({ sent6mo, sent1yr, failed }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
}

// ── Email template ────────────────────────────────────────────────────────────
function checkinHtml({ toName, partnerName, months, hasReflection, retakeUrl }) {
  const is6mo = months === 6;
  const reflBlock = !hasReflection ? `
    <div style="margin:24px 0;background:#EEF2FF;border:1.5px solid rgba(27,95,232,0.2);border-radius:14px;padding:20px 22px">
      <div style="font-size:0.62rem;letter-spacing:.18em;text-transform:uppercase;color:#1B5FE8;font-weight:700;margin-bottom:6px;font-family:'Helvetica Neue',Arial,sans-serif">New · Relationship Reflection ♡</div>
      <div style="font-size:0.88rem;font-weight:700;color:#0E0B07;margin-bottom:8px;font-family:'Helvetica Neue',Arial,sans-serif">You haven't tried Relationship Reflection yet.</div>
      <p style="font-size:0.8rem;color:#5C4D3C;line-height:1.65;margin:0 0 14px;font-family:'Helvetica Neue',Arial,sans-serif">It's a third exercise: shared history, meaningful moments, what you admire in each other, and where you want to invest together this year. Takes about 15 minutes, completed independently like the first two. Add it from your portal for $40.</p>
      <a href="${retakeUrl}" style="display:inline-block;background:#1B5FE8;color:white;padding:10px 20px;border-radius:10px;font-size:0.8rem;font-weight:700;text-decoration:none;font-family:'Helvetica Neue',Arial,sans-serif">Add Relationship Reflection →</a>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body { margin:0; padding:0; background:#F3EDE6; font-family:'Helvetica Neue',Arial,sans-serif; }
  .wrap { max-width:560px; margin:0 auto; padding:32px 16px; }
  .card { background:#FFFDF9; border-radius:20px; padding:40px 36px; box-shadow:0 4px 24px rgba(14,11,7,0.08); }
  .logo-text { font-size:1.1rem; font-weight:700; color:#0E0B07; letter-spacing:-0.01em; }
  .grad-bar { height:3px; background:linear-gradient(90deg,#E8673A,#1B5FE8); border-radius:2px; margin-bottom:28px; }
  h1 { font-size:1.4rem; font-weight:700; color:#0E0B07; margin:0 0 12px; line-height:1.2; }
  p { font-size:0.88rem; color:#5C4D3C; line-height:1.75; margin:0 0 16px; }
  .btn { display:inline-block; padding:14px 28px; background:linear-gradient(135deg,#E8673A,#1B5FE8); color:white!important; text-decoration:none; border-radius:12px; font-weight:700; font-size:0.88rem; letter-spacing:0.03em; }
  .btn-wrap { text-align:center; margin:28px 0; }
  .divider { height:1px; background:#E8DDD0; margin:24px 0; }
  .footer { text-align:center; font-size:0.7rem; color:#C17F47; margin-top:24px; line-height:1.8; }
</style>
</head>
<body>
<div class="wrap">
<div class="card">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:28px">
    <svg width="28" height="20" viewBox="0 0 103 76" fill="none">
      <defs><linearGradient id="eg" x1="0" y1="0" x2="103" y2="76" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#E8673A"/><stop offset="100%" stop-color="#1B5FE8"/></linearGradient></defs>
      <path d="M14,4 L44,4 A9,9 0 0,1 53,13 L53,42 A9,9 0 0,1 44,51 L20,51 L6,61 L11,51 A6,6 0 0,1 5,45 L5,13 A9,9 0 0,1 14,4 Z" fill="url(#eg)"/>
      <path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="white" opacity="0.93" transform="translate(13.16,11.3) scale(0.72)"/>
      <path d="M89,14 L59,14 A9,9 0 0,0 50,23 L50,52 A9,9 0 0,0 59,61 L83,61 L97,71 L92,61 A6,6 0 0,0 98,55 L98,23 A9,9 0 0,0 89,14 Z" fill="none" stroke="url(#eg)" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="url(#eg)" transform="translate(58.16,21.3) scale(0.72)"/>
    </svg>
    <span class="logo-text">Attune</span>
  </div>
  <div class="grad-bar"></div>
  <h1>${is6mo ? "Six months in." : "One year."}</h1>
  <p>Hi ${toName}, ${is6mo
    ? `six months ago you and ${partnerName} took Attune together. Most couples find their results have shifted by now — in ways that reflect real changes in how they're relating.`
    : `a year ago you and ${partnerName} took Attune together. A retake at this point usually surfaces something different — the early patterns are clearer, and the things you've been navigating together tend to show up in the results.`
  }</p>
  <p>The retake is the same exercises, answered independently. Your new results sit alongside your original ones so you can see what's changed.</p>
  ${reflBlock}
  <div class="btn-wrap"><a href="${retakeUrl}" class="btn">Return to Attune →</a></div>
  <div class="divider"></div>
  <p style="font-size:0.78rem;color:#8C7A68;">Your previous results are still in your dashboard. Retaking creates a new session — you'll be able to compare the two.</p>
</div>
<div class="footer">
  Attune · <a href="https://attune-relationships.com" style="color:#C17F47">attune-relationships.com</a><br/>
  Questions? Reply to this email or write to hello@attune-relationships.com
</div>
</div>
</body>
</html>`;
}
