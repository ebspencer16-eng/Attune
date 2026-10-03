/**
 * GET /api/admin-session
 *
 * A signed-in admin account asks for a ticket that gets it into the admin
 * without typing the admin password.
 *
 * ── WHY IT EXISTS ─────────────────────────────────────────────────────────
 * Ellie: "Carolina and I shouldn't have to enter the admin password if we are
 * entering through our accounts. We should have the 4-digit pin once when we
 * initially click admin from settings, but no passwords from that point."
 *
 * The app holds their Supabase session and the admin pages want ADMIN_SECRET.
 * This is where the two meet, and it grants nothing new: api/_lib/admins.js
 * already decides whose app shows an Admin row at all, and this asks the same
 * question of the same list.
 *
 * ── WHAT IT DOES NOT HAND OVER ────────────────────────────────────────────
 * The secret. It returns a ticket good for two minutes, which the admin page
 * exchanges at /api/admin-login. The thing that travels in a URL expires while
 * you are still looking at the page.
 *
 * ── THE PIN IS NOT PART OF THIS ───────────────────────────────────────────
 * The four digits are a lock on a phone, kept in that phone's keychain. They
 * are never sent here and this endpoint would be no weaker if they did not
 * exist: what authorises is the account.
 */

import { isAdminAddress } from './_lib/admins.js';
import { mintAdminTicket, ADMIN_TICKET_TTL_SECONDS } from './_lib/admin-ticket.js';

export const config = { runtime: 'edge' };

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { 'Content-Type': 'application/json' },
});

export default async function handler(req) {
  if (req.method !== 'GET') return json({ ok: false, error: 'Method not allowed' }, 405);

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const adminSecret = process.env.ADMIN_SECRET;
  if (!supabaseUrl || !anonKey || !adminSecret) {
    console.error('[admin-session] missing SUPABASE_URL / SUPABASE_ANON_KEY / ADMIN_SECRET');
    return json({ ok: false, error: 'Admin endpoint not configured' }, 503);
  }

  const auth = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return json({ ok: false, error: 'missing auth token' }, 401);

  let user = null;
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return json({ ok: false, error: 'invalid auth token' }, 401);
    user = await res.json().catch(() => null);
  } catch (e) {
    console.error('[admin-session] auth lookup failed:', e?.message || e);
    return json({ ok: false, error: 'Could not verify that session' }, 503);
  }
  if (!user?.id) return json({ ok: false, error: 'invalid auth token' }, 401);

  /**
   * The same question the app asked to decide whether to draw the row. Answered
   * again here, because a surface deciding what to show is not a surface
   * deciding what is allowed.
   */
  if (!isAdminAddress(user.email)) {
    return json({ ok: false, error: 'Not an admin account' }, 403);
  }

  return json({
    ok: true,
    ticket: await mintAdminTicket(adminSecret),
    expiresIn: ADMIN_TICKET_TTL_SECONDS,
  });
}
