/**
 * GET /api/cron-survey-nudge  (daily)
 * ~24h after a couple finishes (ex2_completed_at), nudge them to complete the
 * short post-results survey — but only if they haven't already told us
 * (post_results OR beta_survey) and haven't been nudged before.
 */
export const config = { runtime: 'edge' };
function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } }); }
function nudgeHtml(name) {
  return `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#1a1a1a;">
  <p style="font-size:1rem;">Hi ${name},</p>
  <p style="font-size:.95rem;line-height:1.6;">Congratulations on finishing Attune together. We'd love to hear how it went — it takes about two minutes and genuinely shapes what we build next.</p>
  <p style="text-align:center;margin:1.8rem 0;"><a href="https://attune-relationships.com/app?signin=1" style="background:#E8673A;color:#fff;text-decoration:none;padding:.8rem 1.6rem;border-radius:10px;font-family:Arial,sans-serif;font-size:.9rem;font-weight:700;">Share your experience</a></p>
  <p style="font-size:.8rem;color:#666;line-height:1.5;">You can also open your dashboard anytime — the short survey sits right at the top.</p>
</div>`;
}
export default async function handler(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response('Cron not configured', { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'hello@attune-relationships.com';
  if (!supabaseUrl || !serviceKey || !resendKey) return json({ error: 'Missing env vars' }, 500);
  const now = new Date();
  const start = new Date(now.getTime() - 3 * 864e5).toISOString(); // finished up to 3d ago
  const end = new Date(now.getTime() - 864e5).toISOString();       // ...at least 24h ago
  const H = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  const submitted = new Set();
  try {
    const fr = await fetch(`${supabaseUrl}/rest/v1/feedback_submissions?type=in.(post_results,beta_survey)&select=text`, { headers: H });
    for (const r of (await fr.json()) || []) { let p = {}; try { p = typeof r.text === 'string' ? JSON.parse(r.text) : r.text; } catch {} if (p && p.respondentId) submitted.add(p.respondentId); }
  } catch {}

  let users = [];
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id,email,name&email_opt_in=eq.true&survey_nudge_sent_at=is.null&ex2_completed_at=gte.${start}&ex2_completed_at=lte.${end}`, { headers: H });
    users = await res.json();
  } catch {}
  if (!Array.isArray(users)) users = [];

  const mark = (id) => fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${id}`, { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ survey_nudge_sent_at: now.toISOString() }) });
  const sendEmail = (to, subject, html) => fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: `Attune <${fromEmail}>`, to: [to], subject, html }) }).then(r => r.ok);

  let sent = 0, skipped = 0, failed = 0;
  for (const u of users) {
    if (!u.email) continue;
    if (submitted.has(u.id)) { skipped++; await mark(u.id); continue; }
    const ok = await sendEmail(u.email, 'How was your Attune experience?', nudgeHtml(u.name || 'there'));
    if (ok) { await mark(u.id); sent++; } else failed++;
  }
  return json({ ok: true, eligible: users.length, sent, skipped, failed });
}
