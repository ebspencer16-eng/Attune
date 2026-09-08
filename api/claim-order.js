/**
 * /api/claim-order
 *
 * Attaches the order someone paid for to the account they just created, and
 * records what they bought under, so it can be found again.
 *
 * POST { orderNum }  (Authorization: Bearer <access token>)
 *
 * ── WHY THIS IS NOT DONE IN THE BROWSER ANY MORE ──────────────────────────
 * It was, fire and forget, with a comment saying that if it failed, linkage
 * "falls back to buyer_email match on later sign-in". That fallback is fine
 * while everyone signs in with the address they bought with.
 *
 * It stops being fine the moment Sign in with Apple exists. Apple can return a
 * private relay address, which never matches the purchase email, so a failed
 * link leaves a paying customer with an account, no entitlements, and no
 * automatic way back. A background request the page does not wait for is the
 * wrong shape for the only thing connecting a person to what they paid for.
 *
 * So: awaited, on the server, idempotent, and it writes purchase_email onto the
 * profile while the order is still in hand.
 *
 * Claiming is deliberately narrow. An order can be claimed when nobody owns it,
 * or when this same person already owns it. It cannot be taken from someone
 * else, and knowing an order number is not proof of anything on its own.
 */

export const config = { runtime: 'edge' };

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: HEADERS });

/** Order numbers are ATT-style ids, and multi-item orders suffix -1, -2. */
const ORDER_RE = /^[A-Za-z0-9-]{4,64}$/;

export default async function handler(req) {
  if (req.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || serviceKey;
  if (!supabaseUrl || !serviceKey) return json({ ok: false, error: 'Server not configured' }, 500);

  const token = (req.headers.get('authorization') || req.headers.get('Authorization') || '')
    .replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ ok: false, error: 'missing auth token' }, 401);

  try {
    const uRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    });
    if (!uRes.ok) return json({ ok: false, error: 'invalid auth token' }, 401);
    const user = await uRes.json().catch(() => null);
    if (!user?.id) return json({ ok: false, error: 'invalid auth token' }, 401);

    const body = await req.json().catch(() => ({}));
    const orderNum = String(body.orderNum || '').trim();
    if (!orderNum || !ORDER_RE.test(orderNum)) {
      return json({ ok: false, error: 'invalid order number' }, 400);
    }

    const svc = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    const jsonHeaders = { ...svc, 'Content-Type': 'application/json' };
    const rest = (path, init) => fetch(`${supabaseUrl}/rest/v1/${path}`, init);

    // Multi-item orders are written as ORDER-1, ORDER-2 by the stripe webhook,
    // so the whole family is claimed together.
    const filter = `or=(order_num.eq.${encodeURIComponent(orderNum)},order_num.like.${encodeURIComponent(orderNum + '-')}*)`;
    const oRes = await rest(`orders?${filter}&select=order_num,user_id,buyer_email`, { headers: svc });
    const orders = await oRes.json().catch(() => []);

    if (!Array.isArray(orders) || !orders.length) {
      return json({ ok: false, error: 'order not found', claimed: false }, 404);
    }

    // Someone else's order. Not an error the customer caused, and not something
    // to explain in detail either: an endpoint that says "that belongs to
    // another account" tells an attacker their guess was real.
    const takenByOther = orders.some(o => o.user_id && o.user_id !== user.id);
    if (takenByOther) return json({ ok: false, error: 'order not available', claimed: false }, 409);

    const unclaimed = orders.filter(o => !o.user_id);
    if (unclaimed.length) {
      const r = await rest(`orders?${filter}&user_id=is.null`, {
        method: 'PATCH',
        headers: { ...jsonHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({ user_id: user.id }),
      });
      if (!r.ok) return json({ ok: false, error: 'could not claim order' }, 500);
    }

    // The purchase email, written while the order is in hand. This is the whole
    // point: after this, the account can be found from what was paid for even
    // if the login address is a relay.
    const purchaseEmail = orders.find(o => o.buyer_email)?.buyer_email || null;

    // Which identity this account uses. Taken from the verified user rather
    // than the request, and normalised to the three values the product knows.
    const provider = user.app_metadata?.provider === 'google' ? 'google'
                   : user.app_metadata?.provider === 'apple' ? 'apple'
                   : 'email';

    const pRes = await rest(`profiles?id=eq.${user.id}`, {
      method: 'PATCH',
      headers: { ...jsonHeaders, Prefer: 'return=representation' },
      body: JSON.stringify({
        ...(purchaseEmail ? { purchase_email: purchaseEmail } : {}),
        auth_provider: provider,
        claimed_order_num: orderNum,
      }),
    });
    const profile = (await pRes.json().catch(() => []))?.[0] || null;
    // The order link is the part that must not be lost, and it is already
    // written by here. A failed profile write is worth saying out loud rather
    // than failing the whole claim over: without it the account still owns what
    // it bought, it is just harder to find from the purchase email.
    if (!pRes.ok) console.error('[claim-order] profile update failed:', pRes.status);

    return json({
      ok: true,
      claimed: true,
      orderNum,
      // True when the profile row does not exist yet, which is the normal state
      // during setup: the client creates it and the claim is re-run.
      profileMissing: !profile,
      purchaseEmail,
      provider,
    });
  } catch (e) {
    console.error('[claim-order] failed:', e);
    return json({ ok: false, error: 'claim unavailable' }, 500);
  }
}
