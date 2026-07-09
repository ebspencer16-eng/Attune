/**
 * GET /api/cron-beta-digest
 *
 * Vercel Cron — weekly (Mondays 09:00 UTC). Emails a live beta health digest
 * to the team. Pulls live data via the service-role Supabase client (same
 * source the admin dashboard reads): profiles, orders, lmft_requests,
 * partner_sessions. Revenue comes from orders.total, which is mirrored from
 * Stripe at payment time, so it reflects real charges.
 *
 * Required env: SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY, CRON_SECRET
 * Optional env: FROM_EMAIL (default hello@attune-relationships.com),
 *               DIGEST_TO   (default buildunison@gmail.com)
 */

export const config = { runtime: 'edge' };

import { createClient } from '@supabase/supabase-js';

const hasAnswers = (v) => v && typeof v === 'object' && Object.keys(v).length > 0;
const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;
const pct = (num, den) => den > 0 ? `${Math.round((num / den) * 100)}%` : '—';

export default async function handler(req) {
  const auth = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  // Fail closed: without CRON_SECRET set, an unauthenticated caller could
  // trigger this endpoint at will. Vercel Cron sends Authorization: Bearer
  // <CRON_SECRET> automatically when the env var exists.
  if (!secret) return new Response('Cron not configured', { status: 500 });
  if (auth !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'hello@attune-relationships.com';
  const to = process.env.DIGEST_TO || 'buildunison@gmail.com';
  if (!SUPABASE_URL || !SUPABASE_KEY || !resendKey) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500 });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_KEY);
  const now = new Date();
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const wIso = weekAgo.toISOString();

  try {
    const [profQ, ordersQ, lmftQ, psQ] = await Promise.all([
      admin.from('profiles').select('id, created_at, partner_profile_id, invite_code, joined_via_invite, is_comp, ex1_completed, ex2_completed, ex3_completed, ex1_answers, ex2_answers'),
      admin.from('orders').select('order_num, created_at, total, pkg_key, is_physical, addon_lmft, addon_reflection, addon_budget, addon_checklist, addon_intimacy, addon_workbook').order('created_at', { ascending: false }).limit(2000),
      admin.from('lmft_requests').select('created_at').order('created_at', { ascending: false }).limit(500),
      admin.from('partner_sessions').select('invite_code, ex1_answers, ex2_answers'),
    ]);
    const firstErr = [profQ, ordersQ, lmftQ, psQ].find(q => q.error);
    if (firstErr) return new Response(JSON.stringify({ error: firstErr.error.message }), { status: 500 });

    const profiles = (profQ.data || []).filter(p => !p.is_comp); // exclude comp/test accounts from beta metrics
    const orders = ordersQ.data || [];
    const lmft = lmftQ.data || [];
    const sessions = psQ.data || [];

    // ── Accounts ──
    const totalAccounts = profiles.length;
    const newAccounts = profiles.filter(p => p.created_at && p.created_at >= wIso).length;
    const buyers = profiles.filter(p => !p.joined_via_invite);
    const invitees = profiles.filter(p => p.joined_via_invite);

    // ── Activation funnel ──
    const started = profiles.filter(p => hasAnswers(p.ex1_answers) || hasAnswers(p.ex2_answers)).length;
    const ex1Done = profiles.filter(p => p.ex1_completed).length;
    const ex2Done = profiles.filter(p => p.ex2_completed).length;
    const ex3Done = profiles.filter(p => p.ex3_completed).length;

    // ── Invites ──
    const invitedTotal = buyers.filter(p => p.invite_code).length;
    const partnersJoined = invitees.length;
    const completedCouples = sessions.filter(s => hasAnswers(s.ex1_answers) && hasAnswers(s.ex2_answers)).length;

    // ── Orders + revenue ──
    const ordersWeek = orders.filter(o => o.created_at && o.created_at >= wIso);
    const revWeek = ordersWeek.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const revAll = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const pkgCounts = {};
    for (const o of orders) { const k = o.pkg_key || 'unknown'; pkgCounts[k] = (pkgCounts[k] || 0) + 1; }
    const pkgLine = Object.entries(pkgCounts).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}: ${n}`).join(' · ') || '—';

    // ── LMFT ──
    const lmftWeek = lmft.filter(r => r.created_at && r.created_at >= wIso).length;
    const lmftAll = lmft.length;

    const row = (label, value, sub = '') =>
      `<tr><td style="padding:6px 12px;color:#6a6052;font-size:13px">${label}</td>` +
      `<td style="padding:6px 12px;font-weight:700;color:#191634;font-size:15px">${value}${sub ? ` <span style="font-weight:400;color:#8a7e6c;font-size:12px">${sub}</span>` : ''}</td></tr>`;

    const html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#191634">
  <h2 style="font-size:18px;margin:0 0 2px">Attune beta health</h2>
  <p style="color:#8a7e6c;font-size:12px;margin:0 0 16px">Week ending ${now.toISOString().slice(0, 10)} · live from Supabase + orders</p>

  <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#B8431F;margin:16px 0 4px">Accounts</h3>
  <table style="width:100%;border-collapse:collapse">
    ${row('New this week', newAccounts)}
    ${row('Total (excl. comp)', totalAccounts)}
    ${row('Buyers / invited partners', `${buyers.length} / ${partnersJoined}`)}
  </table>

  <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#B8431F;margin:16px 0 4px">Activation</h3>
  <table style="width:100%;border-collapse:collapse">
    ${row('Started an exercise', started, `of ${totalAccounts}`)}
    ${row('Exercise 1 complete', ex1Done)}
    ${row('Exercise 2 complete', ex2Done)}
    ${row('Reflection (Ex 3) complete', ex3Done)}
    ${row('Completed couples', completedCouples)}
  </table>

  <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#B8431F;margin:16px 0 4px">Invite funnel</h3>
  <table style="width:100%;border-collapse:collapse">
    ${row('Invites sent', invitedTotal)}
    ${row('Partners joined', partnersJoined, pct(partnersJoined, invitedTotal))}
  </table>

  <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#B8431F;margin:16px 0 4px">Orders &amp; revenue</h3>
  <table style="width:100%;border-collapse:collapse">
    ${row('Orders this week', ordersWeek.length, money(revWeek))}
    ${row('Orders all time', orders.length, money(revAll))}
    ${row('By package', pkgLine)}
  </table>

  <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#B8431F;margin:16px 0 4px">LMFT bookings</h3>
  <table style="width:100%;border-collapse:collapse">
    ${row('This week', lmftWeek)}
    ${row('All time', lmftAll)}
  </table>

  <p style="color:#a99f8f;font-size:11px;margin-top:20px">Comp/test accounts are excluded from account and activation counts. Revenue is from recorded orders (mirrored from Stripe at payment).</p>
</div>`;

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `Attune <${fromEmail}>`, to: [to], subject: `Attune beta health — week of ${now.toISOString().slice(0, 10)}`, html }),
    });
    if (!r.ok) return new Response(JSON.stringify({ error: 'Resend failed', detail: await r.text().catch(() => '') }), { status: 502 });
    return new Response(JSON.stringify({ ok: true, sentTo: to, newAccounts, ordersWeek: ordersWeek.length }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e && e.message ? e.message : e) }), { status: 500 });
  }
}
