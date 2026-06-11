/**
 * /api/couple-beta-status
 *
 * GET ?userId=XXX
 *   → Returns { ok, isBeta } for the COUPLE that userId belongs to.
 *
 * Why this exists: the beta tile shows for both partners, but only the buyer
 * (Partner A) has an order, and the invited partner (Partner B) cannot read
 * the buyer's order under RLS. This resolves the couple server-side (service
 * role) and checks either partner's order for a beta promo code.
 *
 * Beta is detected by the order promo_code containing "BETA"
 * (e.g. BETA-CORE-1, ATTUNE-BETA-13). Registration sets orders.user_id, so the
 * buyer's order is found by user_id; the partner is resolved via
 * profiles.partner_profile_id.
 *
 * Low-sensitivity: returns a single boolean. userId is a UUID and validated.
 */

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

import { reportToSentry } from './_lib/sentry-edge.js';

const supabase = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE
);

const CORS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isBetaCode(c) {
  return typeof c === 'string' && c.toUpperCase().includes('BETA');
}

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const userId = (url.searchParams.get('userId') || '').trim();
    if (!UUID_RE.test(userId)) {
      return new Response(JSON.stringify({ ok: false, isBeta: false, error: 'Invalid user id' }), { status: 400, headers: CORS });
    }

    const sb = supabase();

    // Resolve the couple: self + linked partner profile id.
    const { data: self } = await sb
      .from('profiles')
      .select('id, partner_profile_id')
      .eq('id', userId)
      .maybeSingle();

    if (!self) {
      return new Response(JSON.stringify({ ok: true, isBeta: false }), { headers: CORS });
    }

    const ids = [self.id];
    if (self.partner_profile_id) ids.push(self.partner_profile_id);

    // Resolve both partners' auth emails so orders that never got user_id
    // linked (webhook + free-promo writes have no user_id at purchase time)
    // still match via buyer_email.
    const emails = [];
    for (const id of ids) {
      try {
        const { data } = await sb.auth.admin.getUserById(id);
        const em = data?.user?.email;
        if (em) emails.push(em.toLowerCase());
      } catch { /* non-fatal */ }
    }

    // Any order belonging to either partner with a beta promo code?
    const orFilter = [
      `user_id.in.(${ids.join(',')})`,
      ...(emails.length ? [`buyer_email.in.(${emails.map(e => `"${e}"`).join(',')})`] : []),
    ].join(',');
    const { data: orders, error: ordersErr } = await sb
      .from('orders')
      .select('promo_code')
      .or(orFilter);
    if (ordersErr) {
      // Surface schema/RLS problems instead of silently returning false.
      console.error('[couple-beta-status] orders query error:', ordersErr);
      reportToSentry(new Error('couple-beta-status orders query: ' + ordersErr.message), { route: '/api/couple-beta-status' }).catch(() => {});
    }

    const isBeta = Array.isArray(orders) && orders.some(o => isBetaCode(o.promo_code));

    return new Response(JSON.stringify({ ok: true, isBeta }), { headers: CORS });
  } catch (err) {
    console.error('[couple-beta-status] error:', err);
    reportToSentry(err, { route: '/api/couple-beta-status', request: req }).catch(() => {});
    // Fail closed-but-quiet: tile just stays hidden.
    return new Response(JSON.stringify({ ok: false, isBeta: false }), { status: 200, headers: CORS });
  }
}
