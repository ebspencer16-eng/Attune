/**
 * GET /api/cron-survey-nudge  (daily)
 * Nudges NON-beta couples to complete the short post-results survey:
 *   • Pass 1 ~24h after finishing (survey_nudge_sent_at)
 *   • Pass 2 ~5–7 days after finishing, soft reminder (survey_nudge2_sent_at)
 * Skips anyone who has already answered anything, and skips
 * beta testers entirely (they were asked to do the beta survey directly).
 */
import { unsubscribeLink } from './_lib/email-footer.js';

/**
 * ── AND WHERE IT RUNS ─────────────────────────────────────────────────────
 * Pinned next to the database. An edge function runs near whoever is asking,
 * which is the wrong default when every answer comes from one database
 * somewhere else: a request that landed in San Francisco spent two crossings
 * of the country on a lookup by id. See api/_lib/db-region.js for the
 * measurement, and check-edge-region.mjs, which holds every one of these to
 * the one constant that says where.
 */
export const config = { runtime: 'edge', regions: ['iad1'] };
function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } }); }
function nudgeHtml(name, userId) {
  return `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#1a1a1a;">
  <p style="font-size:1rem;">Hi ${name},</p>
  <p style="font-size:.95rem;line-height:1.6;">Congratulations on finishing Attune together. When you're done reviewing your results and workbook, we'd love to hear what you think. It takes about two minutes and genuinely shapes what we build next.</p>
  <p style="text-align:center;margin:1.8rem 0;"><a href="https://www.attune-relationships.com/app?signin=1" style="background:#E8673A;color:#fff;text-decoration:none;padding:.8rem 1.6rem;border-radius:10px;font-family:Arial,sans-serif;font-size:.9rem;font-weight:700;">Share your experience</a></p>
  <p style="font-size:.8rem;color:#666;line-height:1.5;">The short survey sits at the top of your dashboard whenever you're ready.</p>
  <p style="font-size:.75rem;color:#999;margin-top:1.6rem;">${unsubscribeLink(userId)}</p>
</div>`;
}
function nudge2Html(name, userId) {
  return `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#1a1a1a;">
  <p style="font-size:1rem;">Hi ${name},</p>
  <p style="font-size:.95rem;line-height:1.6;">No rush at all. But whenever you've had a chance to sit with your results and workbook, we'd still love to hear how the experience landed for you. Two minutes, and it really does shape what comes next.</p>
  <p style="text-align:center;margin:1.8rem 0;"><a href="https://www.attune-relationships.com/app?signin=1" style="background:#E8673A;color:#fff;text-decoration:none;padding:.8rem 1.6rem;border-radius:10px;font-family:Arial,sans-serif;font-size:.9rem;font-weight:700;">Share your experience</a></p>
  <p style="font-size:.75rem;color:#999;margin-top:1.6rem;">${unsubscribeLink(userId)}</p>
</div>`;
}
/**
 * The two survey nudges, subject and body together. The subjects used to be
 * arguments at the two runPass calls, which is the only place they existed,
 * so /email-preview had to write them out again to show them. Both are built
 * from here now.
 */
/**
 * What both nudges read, from one profile row. Exported for the same reason
 * cron-checkin.js exports its own: check-unsubscribe.mjs renders the path from
 * a profile row to the link, not just the template.
 */
export function EMAIL_CONTEXT(u) {
  return { name: u.name || 'there', userId: u.id };
}

export const NUDGE_EMAILS = {
  survey_nudge_1: (ctx) => ({
    subject: 'How was your Attune experience?',
    html: nudgeHtml(ctx.name, ctx.userId),
  }),
  survey_nudge_2: (ctx) => ({
    subject: "No rush, but we'd still love your thoughts",
    html: nudge2Html(ctx.name, ctx.userId),
  }),
};

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

  /**
   * ── AN EXCLUSION LIST THAT FAILS OPEN SENDS MORE MAIL, NOT LESS ─────────
   * Both lists below say who must NOT be emailed, and both were built inside a
   * `try { ... } catch {}`. A rejected select left the set empty and the run
   * carried on, so the failure mode was: everyone who had already answered the
   * survey gets nudged to answer it again, and every beta tester gets a survey
   * they were deliberately excluded from. Silently, and in the direction that
   * reaches customers.
   *
   * That is the shape CLAUDE.md records for the engagement page, pointed the
   * other way: there a failed select read as an empty table and drew a zero;
   * here it reads as an empty exclusion list and sends an email. A query that
   * decides who to leave alone has to fail closed.
   *
   * So a failure is recorded and the run sends nothing. The response says which
   * list could not be read, because a cron that quietly does nothing is the
   * other half of this same bug.
   */
  const unreadable = [];

  /* Already answered -> leave alone.
   *
   * One row per person in survey_responses, including half-finished ones.
   * Somebody who answered two questions and stopped has been asked, and
   * emailing them again is asking twice.
   *
   * This read two retired row types and parsed a respondent id out of a JSON
   * blob; migration 079 deletes every one of those rows, which would have made
   * this exclusion list empty and nudged everybody. */
  const submitted = new Set();
  try {
    const fr = await fetch(`${url}/rest/v1/survey_responses?select=respondent_id`, { headers: H });
    if (!fr.ok) throw new Error(`survey_responses ${fr.status}`);
    const rows = await fr.json();
    if (!Array.isArray(rows)) throw new Error('survey_responses did not answer with rows');
    for (const r of rows) { if (r && r.respondent_id) submitted.add(r.respondent_id); }
  } catch (e) {
    console.error('[cron-survey-nudge] who has already answered:', e?.message || e);
    unreadable.push('already answered');
  }

  // Beta testers -> excluded from all survey emails. Beta = an order used a beta code.
  const betaEmails = new Set();
  try {
    const bc = await fetch(`${url}/rest/v1/beta_codes?select=code`, { headers: H });
    if (!bc.ok) throw new Error(`beta_codes ${bc.status}`);
    const codeRows = await bc.json();
    if (!Array.isArray(codeRows)) throw new Error('beta_codes did not answer with rows');
    const codes = new Set(codeRows.map(c => String(c.code || '').toUpperCase()));
    const ord = await fetch(`${url}/rest/v1/orders?select=buyer_email,promo_code`, { headers: H });
    if (!ord.ok) throw new Error(`orders ${ord.status}`);
    const orderRows = await ord.json();
    if (!Array.isArray(orderRows)) throw new Error('orders did not answer with rows');
    for (const o of orderRows) { const pc = String(o.promo_code || '').toUpperCase(); if (pc && codes.has(pc) && o.buyer_email) betaEmails.add(String(o.buyer_email).toLowerCase()); }
  } catch (e) {
    console.error('[cron-survey-nudge] who is a beta tester:', e?.message || e);
    unreadable.push('beta testers');
  }

  if (unreadable.length) {
    return json({
      ok: false,
      sent: 0,
      error: `could not read who to leave alone (${unreadable.join(', ')}), so nothing was sent`,
    }, 503);
  }

  const mark = (id, field) => fetch(`${url}/rest/v1/profiles?id=eq.${id}`, { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ [field]: now.toISOString() }) });
  const sendEmail = (to, subject, html) => fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: `Attune <${fromEmail}>`, to: [to], subject, html }) }).then(r => r.ok);
  const isBeta = (u) => u.email && betaEmails.has(String(u.email).toLowerCase());

  async function runPass(field, startD, endD, build) {
    let users = [];
    try { const res = await fetch(`${url}/rest/v1/profiles?select=id,email,name&email_opt_in=eq.true&${field}=is.null&ex2_completed_at=gte.${daysAgo(endD)}&ex2_completed_at=lte.${daysAgo(startD)}`, { headers: H }); users = await res.json(); } catch {}
    if (!Array.isArray(users)) users = [];
    let sent = 0, skipped = 0, failed = 0;
    for (const u of users) {
      if (!u.email) continue;
      if (submitted.has(u.id) || isBeta(u)) { skipped++; await mark(u.id, field); continue; }
      const mail = build(EMAIL_CONTEXT(u));
      const ok = await sendEmail(u.email, mail.subject, mail.html);
      if (ok) { await mark(u.id, field); sent++; } else failed++;
    }
    return { eligible: users.length, sent, skipped, failed };
  }

  const nudge1 = await runPass('survey_nudge_sent_at', 1, 3, NUDGE_EMAILS.survey_nudge_1);
  const nudge2 = await runPass('survey_nudge2_sent_at', 5, 8, NUDGE_EMAILS.survey_nudge_2);
  return json({ ok: true, nudge1, nudge2 });
}
