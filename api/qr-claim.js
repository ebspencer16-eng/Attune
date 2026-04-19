/**
 * /api/qr-claim
 *
 * GET  ?token=ATQR-xxxx           → look up an order by its QR token.
 *   Returns { order: { pkgKey, partner1Name, partner2Name, giftNote,
 *   buyerName, isPhysical, addonLmft, addonWorkbook, addonReflection,
 *   addonBudget, claimed, alreadyClaimedAt, alreadyClaimedBy } }
 *   or { error } if the token doesn't match any order.
 *
 * POST { token, email }            → mark the order as claimed by this email.
 *   Sets qr_claimed_at = now() and qr_claimed_by = email in the orders row.
 *   Idempotent: safe to call multiple times (re-checks the claim).
 *   Only marks the first claim; subsequent claims by a different email
 *   are rejected with { error: 'already-claimed' }.
 *
 * The QR card on each physical order encodes:
 *   https://attune-relationships.com/app?qr=<token>
 * When the buyer lands on /app with that param, AuthModal calls GET to
 * pre-fill the signup form with the order info, then calls POST after
 * successful signup to stamp the claim.
 */

export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fetchOrder(token) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?qr_token=eq.${encodeURIComponent(token)}&select=*`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0];
}

function orderToPublic(o) {
  return {
    orderNum:         o.order_num,
    pkgKey:           o.pkg_key,
    isPhysical:       !!o.is_physical,
    isGift:           !!o.is_gift,
    buyerName:        o.buyer_name || null,
    partner1Name:     o.partner1_name || null,
    partner2Name:     o.partner2_name || null,
    giftNote:         o.gift_note || null,
    addonLmft:        !!o.addon_lmft,
    addonWorkbook:    o.addon_workbook || null,
    addonReflection:  !!o.addon_reflection,
    addonBudget:      !!o.addon_budget,
    claimed:          !!o.qr_claimed_at,
    claimedAt:        o.qr_claimed_at || null,
    claimedBy:        o.qr_claimed_by || null,
  };
}

export default async function handler(req) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Server not configured' }), {
      status: 503, headers: { 'Content-Type': 'application/json' }
    });
  }

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing token' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }
    const order = await fetchOrder(token);
    if (!order) {
      return new Response(JSON.stringify({ error: 'not-found' }), {
        status: 404, headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ order: orderToPublic(order) }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  }

  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); }
    catch { return new Response('Invalid JSON', { status: 400 }); }
    const token = (body.token || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    if (!token || !email) {
      return new Response(JSON.stringify({ error: 'Missing token or email' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const order = await fetchOrder(token);
    if (!order) {
      return new Response(JSON.stringify({ error: 'not-found' }), {
        status: 404, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Already claimed by someone else?
    if (order.qr_claimed_at && order.qr_claimed_by && order.qr_claimed_by !== email) {
      return new Response(JSON.stringify({
        error: 'already-claimed',
        claimedAt: order.qr_claimed_at,
      }), { status: 409, headers: { 'Content-Type': 'application/json' } });
    }

    // Already claimed by this same email — idempotent, return ok
    if (order.qr_claimed_at && order.qr_claimed_by === email) {
      return new Response(JSON.stringify({ ok: true, alreadyClaimed: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Stamp the claim
    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?qr_token=eq.${encodeURIComponent(token)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          qr_claimed_at: new Date().toISOString(),
          qr_claimed_by: email,
        }),
      }
    );

    if (!patchRes.ok) {
      console.error('[qr-claim] PATCH failed:', await patchRes.text());
      return new Response(JSON.stringify({ error: 'server-error' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response('Method not allowed', { status: 405 });
}
