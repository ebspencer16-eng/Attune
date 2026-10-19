/**
 * /api/orders
 *
 * POST { action: 'create', order }  → create a new order record
 * GET  ?userId=XXX                  → fetch orders for a user
 * PATCH { orderId, updates }        → update order status (workbook, shipping, etc.)
 */

import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth } from './_lib/admin-auth.js';

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

import { safeError, jsonBody } from './_lib/http.js';

const sb = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function orderNum() {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const rand = Math.random().toString(36).substring(2,6).toUpperCase();
  return `ATT-${date}-${rand}`;
}

export default async function handler(req) {
  const headers = { 'Content-Type': 'application/json' };

  // Admin secret gate (fail-closed). This endpoint runs as service role
  // and can read/write any order. Only admin.html uses it (fulfillment
  // status updates). Without this, anyone could write fake orders, mutate
  // any order by id, or pull all orders for any UUID.
  const _auth = checkAdminAuth(req);
  if (!_auth.ok) return new Response(_auth.body, { status: _auth.status, headers });
  const url = new URL(req.url);

  if (req.method === 'POST') {
    let body;
    const _parsed = await jsonBody(req);
    if (_parsed.error) return _parsed.error;
    body = _parsed.body;

    const { action, order } = body;

    if (action === 'create') {
      const num = orderNum();
      const { data, error } = await sb()
        .from('orders')
        .insert({
          order_num:        num,
          user_id:          order.userId || null,
          buyer_name:       order.buyerName,
          buyer_email:      order.buyerEmail,
          partner1_name:    order.partner1Name || order.partnerName || null,
          partner2_name:    order.partner2Name || null,
          partner_email:    order.partnerEmail || null,
          pkg_key:          order.pkgKey,
          pkg_name:         order.pkgName,
          is_gift:          order.isGift || false,
          is_physical:      order.isPhysical || false,
          total:            order.total,
          addon_workbook:   order.addonWorkbook || null,
          addon_reflection: order.addonReflection || false,
          addon_budget:     order.addonBudget || false,
          /* All six, not the three this listed. Nothing calls this branch
             today, which is exactly why it was missing half the add-ons: an
             order written through it would have granted the package and three
             of its six extras, and the person who paid would have had no way
             to tell which. */
          addon_checklist:  order.addonChecklist || false,
          addon_intimacy:   order.addonIntimacy || false,
          addon_conflict:   order.addonConflict || false,
          gift_note:        order.giftNote || null,
          workbook_status:  'pending',
          card_status:      'pending',
          stripe_payment_intent_id: order.stripePaymentIntentId || null,
          stripe_session_id: order.stripeSessionId || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[orders] create error:', error);
        return new Response(JSON.stringify({ ok: false, error: safeError('orders.create', error, 'Could not create the order.') }), { status: 500, headers });
      }

      return new Response(JSON.stringify({ ok: true, order: data, orderNum: num }), { status: 200, headers });
    }

    if (action === 'update') {
      const { orderId, updates } = body;
      const { error } = await sb()
        .from('orders')
        .update(updates)
        .eq('id', orderId);

      if (error) return new Response(JSON.stringify({ ok: false, error: safeError('orders.update', error, 'Could not update the order.') }), { status: 500, headers });
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Unknown action' }), { status: 400, headers });
  }

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    if (!userId) return new Response(JSON.stringify({ ok: false, error: 'userId required' }), { status: 400, headers });

    const { data, error } = await sb()
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return new Response(JSON.stringify({ ok: false, error: safeError('orders', error, 'Could not load orders.') }), { status: 500, headers });
    return new Response(JSON.stringify({ ok: true, orders: data }), { status: 200, headers });
  }

  return new Response('Method not allowed', { status: 405 });
}
