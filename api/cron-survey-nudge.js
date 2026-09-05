/**
 * GET /api/cron-survey-nudge  (daily)
 * Nudges NON-beta couples to complete the short post-results survey:
 *   • Pass 1 ~24h after finishing (survey_nudge_sent_at)
 *   • Pass 2 ~5–7 days after finishing, soft reminder (survey_nudge2_sent_at)
 * Skips anyone who already responded (post_results OR beta_survey) and skips
 * beta testers entirely (they were asked to do the beta survey directly).
 */
export const config = { runtime: 'edge' };
function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } }); }
function nudgeHtml(name) {
  return `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#1a1a1a;">
  <p style="font-size:1rem;">Hi ${name},</p>
  <p style="font-size:.95rem;line-height:1.6;">Congratulations on finishing Attune together. When you're done reviewing your results and workbook, we'd love to hear what you think — it takes about two minutes and genuinely shapes what we build next.</p>
  <p style="text-align:center;margin:1.8rem 0;"><a href="https://attune-relationships.com/app?signin=1" style="background:#E8673A;color:#fff;text-decoration:none;padding:.8rem 1.6rem;border-radius:10px;font-family:Arial,sans-serif;font-size:.9rem;font-weight:700;">Share your experience</a></p>
  <p style="font-size:.8rem;color:#666;line-height:1.5;">The short survey sits at the top of your dashboard whenever you're ready.</p>
</div>`;
}
function nudge2Html(name) {
  return `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#1a1a1a;">
  <p style="font-size:1rem;">Hi ${name},</p>
  <p style="font-size:.95rem;line-height:1.6;">No rush at all — but whenever you've had a chance to sit with your results and workbook, we'd still love to hear how the experience landed for you. Two minutes, and it really does shape what comes next.</p>
  <p style="text-align:center;margin:1.8rem 0;"><a href="https://attune-relationships.com/app?signin=1" style="background:#E8673A;color:#fff;text-decoration:none;padding:.8rem 1.6rem;border-radius:10px;font-family:Arial,sans-serif;font-size:.9rem;font-weight:700;">Share your experience</a></p>
</div>`;
}
export default async function handler(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response('Cron not configured', { status: 500 });
  const _auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (_auth !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'hello@attune-relationships.com';
  if (!url || !key || !resendKey) return json({ error: 'Missing env vars' }, 500);
  const now = new Date();
  const H = { apikey: key, Authorization: `Bearer ${key}` };
  const daysAgo = (d) => new Date(now.getTime() - d * 864e5).toISOString();

  // Already responded (either survey) -> exclude by respondent id.
  const submitted = new Set();
  try {
    const fr = await fetch(`${url}/rest/v1/feedback_submissions?type=in.(post_results,beta_survey)&select=text`, { headers: H });
    for (const r of (await fr.json()) || []) { let p = {}; try { p = typeof r.text === 'string' ? JSON.parse(r.text) : r.text; } catch {} if (p && p.respondentId) submitted.add(p.respondentId); }
  } catch {}

  // Beta testers -> excluded from all survey emails. Beta = an order used a beta code.
  const betaEmails = new Set();
  try {
    const bc = await fetch(`${url}/rest/v1/beta_codes?select=code`, { headers: H });
    const codes = new Set(((await bc.json()) || []).map(c => String(c.code || '').toUpperCase()));
    const ord = await fetch(`${url}/rest/v1/orders?select=buyer_email,promo_code`, { headers: H });
    for (const o of (await ord.json()) || []) { const pc = String(o.promo_code || '').toUpperCase(); if (pc && codes.has(pc) && o.buyer_email) betaEmails.add(String(o.buyer_email).toLowerCase()); }
  } catch {}

  const mark = (id, field) => fetch(`${url}/rest/v1/profiles?id=eq.${id}`, { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ [field]: now.toISOString() }) });
  const sendEmail = (to, subject, html) => fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: `Attune <${fromEmail}>`, to: [to], subject, html }) }).then(r => r.ok);
  const isBeta = (u) => u.email && betaEmails.has(String(u.email).toLowerCase());

  async function runPass(field, startD, endD, subject, htmlFn) {
    let users = [];
    try { const res = await fetch(`${url}/rest/v1/profiles?select=id,email,name&email_opt_in=eq.true&${field}=is.null&ex2_completed_at=gte.${daysAgo(endD)}&ex2_completed_at=lte.${daysAgo(startD)}`, { headers: H }); users = await res.json(); } catch {}
    if (!Array.isArray(users)) users = [];
    let sent = 0, skipped = 0, failed = 0;
    for (const u of users) {
      if (!u.email) continue;
      if (submitted.has(u.id) || isBeta(u)) { skipped++; await mark(u.id, field); continue; }
      const ok = await sendEmail(u.email, subject, htmlFn(u.name || 'there'));
      if (ok) { await mark(u.id, field); sent++; } else failed++;
    }
    return { eligible: users.length, sent, skipped, failed };
  }

  const nudge1 = await runPass('survey_nudge_sent_at', 1, 3, 'How was your Attune experience?', nudgeHtml);
  const nudge2 = await runPass('survey_nudge2_sent_at', 5, 8, "No rush — but we'd still love your thoughts", nudge2Html);
  return json({ ok: true, nudge1, nudge2 });
}
