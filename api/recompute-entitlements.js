/**
 * POST /api/recompute-entitlements
 *
 * Recomputes and stores the caller's authoritative entitlements
 * (profiles.entitlements) as the grant-only union of all their orders, their
 * profile columns, any comp grant, and, for an invitee, Partner A's orders.
 *
 * Auth: the caller's Supabase access token in the Authorization header. A
 * caller can only recompute their own account (the user id comes from the
 * verified token, never from the body).
 *
 * Deliberately does NOT use createClient: it throws synchronously when the URL
 * or key is undefined, which surfaces as an opaque 500 with no outgoing
 * request. Verifying the JWT with a plain fetch keeps the failure modes
 * explicit and lets us report exactly which env var is missing.
 */

export const config = { runtime: 'edge' };

import { writeEntitlements } from './_lib/entitlements.js';

const CORS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const json = (body, status) => new Response(JSON.stringify(body), { status, headers: CORS });

export default async function handler(req) {
  // Env resolution mirrors the rest of api/: SUPABASE_URL is not reliably set,
  // so fall back to VITE_SUPABASE_URL the way the other functions do.
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || serviceKey;

  if (req.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405);

  const missing = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL (or VITE_SUPABASE_URL)');
  if (!serviceKey) missing.push('SUPABASE_SERVICE_KEY');
  if (missing.length) {
    console.error('[recompute] missing env:', missing.join(', '));
    return json({ ok: false, error: `Missing env: ${missing.join(', ')}` }, 500);
  }

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!accessToken) return json({ ok: false, error: 'missing auth token' }, 401);

  try {
    // Verify the caller's token and resolve their identity. Plain fetch, no SDK.
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) {
      return json({ ok: false, error: 'invalid auth token' }, 401);
    }
    const user = await userRes.json().catch(() => null);
    if (!user?.id) return json({ ok: false, error: 'invalid auth token' }, 401);

    const result = await writeEntitlements({
      supabaseUrl,
      serviceKey,
      userId: user.id,
      email: user.email,
    });
    if (!result.ok) {
      console.error('[recompute] writeEntitlements failed:', result.error);
      return json({ ok: false, error: result.error }, 500);
    }
    return json({ ok: true, entitlements: result.entitlements }, 200);
  } catch (e) {
    const msg = String(e && e.message ? e.message : e);
    console.error('[recompute] unhandled:', msg);
    return json({ ok: false, error: msg }, 500);
  }
}
