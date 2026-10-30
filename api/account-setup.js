/**
 * POST /api/account-setup  { token }
 *
 * The button in an order confirmation, or in a gift invitation, opens
 * /app?setup=<token>; the website posts the token here and goes wherever this
 * answers (A206).
 *
 * ── WHY THE LINK IS OURS ──────────────────────────────────────────────────
 * The account was made when the payment went through (api/_lib/fulfil-order.js)
 * with no password. Supabase's own password link would do, except that it
 * expires after about an hour, and an order email is often opened the next
 * day. So the email carries the order's setup_token (migration 105), and the
 * Supabase link is made here, fresh, at the moment it is used. It lands on
 * the website's existing "choose a new password" screen, signed in.
 *
 * ── ONCE ──────────────────────────────────────────────────────────────────
 * The first use is recorded, by compare and swap, and every use after that
 * answers { signin: true }: the person has a password by then, and a link
 * that could set a new one for as long as the email exists would let anyone
 * the email was forwarded to take the account.
 *
 * A token that is no order's answers { signin: true } too, rather than an
 * error: the honest next step is the same, and it says nothing about which
 * tokens exist. A failed read is 503, never "sign in".
 */
export const config = { runtime: 'edge', regions: ['iad1'] };

import { createClient } from '@supabase/supabase-js';
import { jsonBody } from './_lib/http.js';
import { SITE_URL } from './_lib/site.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

export default async function handler(req) {
  if (req.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405);
  const parsed = await jsonBody(req);
  if (parsed.error) return parsed.error;
  const token = String(parsed.body?.token || '').trim();
  if (!UUID_RE.test(token)) return json({ ok: true, signin: true });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!supabaseUrl || !serviceKey) return json({ ok: false, error: 'not configured' }, 503);
  const H = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };

  // The claim is the read: one row back means this use is the first.
  const r = await fetch(
    `${supabaseUrl}/rest/v1/orders?setup_token=eq.${token}&setup_used_at=is.null&select=user_id`,
    { method: 'PATCH', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify({ setup_used_at: new Date().toISOString() }) },
  ).catch(() => null);
  if (!r?.ok) return json({ ok: false, error: 'could not check that right now' }, 503);
  const rows = await r.json().catch(() => null);
  if (!Array.isArray(rows)) return json({ ok: false, error: 'could not check that right now' }, 503);
  const userId = rows[0]?.user_id;
  if (!userId) return json({ ok: true, signin: true });

  const admin = createClient(supabaseUrl, serviceKey);
  const release = () => fetch(`${supabaseUrl}/rest/v1/orders?setup_token=eq.${token}`, {
    method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ setup_used_at: null }),
  }).catch(() => null);
  // supabase-js throws on some bad input rather than returning an error.
  const { data: u, error: uErr } = await admin.auth.admin.getUserById(userId).catch((e) => ({ error: e }));
  const email = u?.user?.email;
  if (uErr || !email) { await release(); return json({ ok: false, error: 'could not check that right now' }, 503); }
  const { data: link, error: lErr } = await admin.auth.admin.generateLink({
    type: 'recovery', email, options: { redirectTo: `${SITE_URL}/app?reset=1` },
  }).catch((e) => ({ error: e }));
  const url = link?.properties?.action_link;
  // Given back, so a link that could not be made can be tried again.
  if (lErr || !url) { await release(); return json({ ok: false, error: 'could not make the link' }, 503); }
  return json({ ok: true, url });
}
