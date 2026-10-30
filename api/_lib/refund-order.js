/**
 * A refunded payment: its orders stop counting and stop granting (A204f).
 *
 * Ellie, asked what a refund in Stripe should do: "A", which was "take the
 * access away and stop counting the sale". Until this, Stripe's refund signal
 * was never asked for, so a refunded customer kept everything and the admin
 * kept counting the money.
 *
 * ── MOVED, NOT MARKED ─────────────────────────────────────────────────────
 * The order rows go from `orders` into `refunded_orders` (migration 104).
 * About twenty places read `orders` to decide what somebody owns or what the
 * admin counts, and every one of them stops seeing a moved order without
 * being touched. A `refunded` flag would have needed all twenty to remember
 * it, and the one that forgot would be the one still granting.
 *
 * Copied first, deleted second: a failure between the two leaves the order
 * where it was and answers not-ok, so Stripe retries. A retry finds the copy
 * already there (ignore-duplicates) and carries on.
 *
 * ── AND THE COPIES OF IT ──────────────────────────────────────────────────
 * Two things copy what an order grants onto a profile, where removing the
 * order cannot reach: create-profile sets `pkg` from the orders, and
 * partner-sync copies the buyer's add-ons onto the invited partner. So for
 * the buyer and anybody who joined by their invite, a column is cleared when
 * the refunded order granted it and no remaining order does. A column the
 * refunded order did not grant is left alone, which keeps a grant made by
 * hand (migration 101 is one) unless it is the same thing that was refunded.
 *
 * Then the stored entitlements are rewritten with `revokedAt`, which is what
 * tells the website to drop what it kept on a device.
 *
 * A comp account is never touched: comp grants everything without an order.
 */
import { PKG_CAPS, computeEntitlements, entitlementsFor, writeEntitlements } from './entitlements.js';
import { inBatches } from './page-all.js';

const ADDON_COLUMNS = [
  ['addon_reflection', 'addonReflection'],
  ['addon_budget', 'addonBudget'],
  ['addon_checklist', 'addonChecklist'],
  ['addon_intimacy', 'addonIntimacy'],
  ['addon_conflict', 'addonConflict'],
  ['addon_workbook', 'addonWorkbook'],
];

/**
 * What to write on a profile, given what the refunded orders granted and what
 * the remaining orders still grant. Exported so the gate can run it.
 */
export function revokedColumns(profile, refunded, remaining) {
  const patch = {};
  for (const [col, key] of ADDON_COLUMNS) {
    if (profile[col] && refunded[key] && !remaining[key]) patch[col] = col === 'addon_workbook' ? null : false;
  }
  const rank = (k) => PKG_CAPS[k]?.rank ?? 0;
  if (profile.pkg && rank(profile.pkg) > rank(remaining.pkg) && rank(refunded.pkg) >= rank(profile.pkg)) {
    patch.pkg = remaining.pkg || 'core';
  }
  return patch;
}

export async function refundOrders({ supabaseUrl, serviceKey, paymentIntentId, refundedAt }) {
  const H = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };
  const rest = (path, init = {}) => fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const pi = encodeURIComponent(paymentIntentId);
  // A multi-item order is one row per item, `${intent}_${i}`.
  const byIntent = `or=(stripe_payment_intent_id.eq.${pi},stripe_payment_intent_id.like.${pi}_*)`;
  const at = refundedAt || new Date().toISOString();

  const oRes = await rest(`orders?${byIntent}&select=*&order=order_num`);
  if (!oRes.ok) return { ok: false, stage: 'read orders', status: oRes.status };
  let rows = await oRes.json();

  if (rows.length) {
    const copy = await rest('refunded_orders?on_conflict=order_num', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify(rows.map((o) => ({
        order_num: o.order_num, user_id: o.user_id || null,
        buyer_email: o.buyer_email ? String(o.buyer_email).toLowerCase() : null,
        stripe_payment_intent_id: o.stripe_payment_intent_id || null,
        refunded_at: at, order_row: o,
      }))),
    });
    if (!copy.ok) return { ok: false, stage: 'copy', status: copy.status };
    const nums = rows.map((o) => `"${String(o.order_num).replace(/"/g, '')}"`).join(',');
    const del = await rest(`orders?order_num=in.(${encodeURIComponent(nums)})`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    if (!del.ok) return { ok: false, stage: 'delete', status: del.status };
  } else {
    // A retry after the move, or a payment that never had an order. The
    // copies say which, and the accounts still need putting right.
    const rRes = await rest(`refunded_orders?${byIntent}&select=order_row&order=order_num`);
    if (!rRes.ok) return { ok: false, stage: 'read refunded', status: rRes.status };
    rows = (await rRes.json()).map((r) => r.order_row);
    if (!rows.length) return { ok: true, moved: 0, accounts: 0 };
  }

  // Whose access came from these orders: the owner by id, the buyer by email,
  // and anybody who joined either of them by invite.
  const owners = new Set(rows.map((o) => o.user_id).filter(Boolean));
  const emails = [...new Set(rows.map((o) => (o.buyer_email || '').toLowerCase()).filter(Boolean))];
  const filters = [];
  if (owners.size) filters.push(`id.in.(${[...owners].join(',')})`);
  for (const em of emails) filters.push(`email.eq.${encodeURIComponent(em)}`);
  if (!filters.length) return { ok: true, moved: rows.length, accounts: 0 };
  const pRes = await rest(`profiles?or=(${filters.join(',')})&select=*`);
  if (!pRes.ok) return { ok: false, stage: 'read buyers', status: pRes.status };
  const people = await pRes.json();
  const buyerIds = people.map((p) => p.id);
  const invitees = await inBatches(buyerIds, async (chunk) => {
    const iRes = await rest(`profiles?partner_profile_id=in.(${chunk.join(',')})&joined_via_invite=is.true&select=*`);
    return iRes.ok ? { data: await iRes.json() } : { error: iRes.status };
  });
  if (invitees.error) return { ok: false, stage: 'read invitees', status: invitees.error };
  for (const p of invitees.data) if (!buyerIds.includes(p.id)) people.push(p);

  const refunded = computeEntitlements(rows, null);
  const failed = [];
  for (const p of people) {
    if (p.is_comp) continue;
    const left = await entitlementsFor({ supabaseUrl, serviceKey, userId: p.id, email: p.email, ordersOnly: true });
    if (!left.ok) { failed.push(`${p.id}: ${left.error}`); continue; }
    const patch = revokedColumns(p, refunded, left.entitlements);
    if (Object.keys(patch).length) {
      const u = await rest(`profiles?id=eq.${encodeURIComponent(p.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) });
      if (!u.ok) { failed.push(`${p.id}: profile ${u.status}`); continue; }
    }
    const w = await writeEntitlements({ supabaseUrl, serviceKey, userId: p.id, email: p.email, revokedAt: at });
    if (!w.ok) failed.push(`${p.id}: ${w.error}`);
  }
  if (failed.length) return { ok: false, stage: 'accounts', failed };
  return { ok: true, moved: rows.length, accounts: people.length };
}
