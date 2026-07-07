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
 */

export const config = { runtime: 'edge' };

import { createClient } from '@supabase/supabase-js';
import { writeEntitlements } from './_lib/entitlements.js';

const CORS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'POST only' }), { status: 405, headers: CORS });
  }
  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!accessToken) {
      return new Response(JSON.stringify({ ok: false, error: 'missing auth token' }), { status: 401, headers: CORS });
    }
    // Resolve the caller from their token. They can only touch their own row.
    const userClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } },
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser(accessToken);
    if (authErr || !user?.id) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid auth token' }), { status: 401, headers: CORS });
    }
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE
                    || process.env.SUPABASE_SERVICE_ROLE_KEY
                    || process.env.SUPABASE_SERVICE_KEY;
    const result = await writeEntitlements({
      supabaseUrl: process.env.SUPABASE_URL,
      serviceKey,
      userId: user.id,
      email: user.email,
    });
    if (!result.ok) {
      return new Response(JSON.stringify({ ok: false, error: result.error }), { status: 500, headers: CORS });
    }
    return new Response(JSON.stringify({ ok: true, entitlements: result.entitlements }), { status: 200, headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e && e.message ? e.message : e) }), { status: 500, headers: CORS });
  }
}
