/**
 * Find the order(s) an order number names.
 *
 * Shared by /api/claim-order, which links them to an account, and
 * /api/order-email-hint, which tells somebody which address bought them
 * (A204b). One rule, so the help page cannot find an order that claiming
 * then cannot, or the other way round.
 *
 * Answers { ok: true, orders, filter } where `filter` is the PostgREST filter
 * that selects exactly those rows (for the claim's PATCH), or { ok: false }
 * when a read failed. An empty `orders` is a real "no such order"; a failed
 * read never is.
 */
export async function findOrders({ rest, svc, orderNum }) {
  let filter = `or=(order_num.eq.${encodeURIComponent(orderNum)},order_num.like.${encodeURIComponent(orderNum + '-')}*)`;
  const oRes = await rest(`orders?${filter}&select=order_num,user_id,buyer_email`, { headers: svc });
  // A failed read is not "no such order": that answer sends a customer who
  // paid to the no-purchase screen, or tells them their order does not exist.
  if (!oRes.ok) return { ok: false };
  let orders = await oRes.json().catch(() => null);
  if (!Array.isArray(orders)) return { ok: false };

  /**
   * ── A CARD ORDER PLACED BEFORE ITS NUMBER WAS MINTED ──────────────────
   * Until A202, checkout showed a card buyer `ATT-<date>-<last four of the
   * payment id>` while the webhook stored the row under a random number, so
   * the number in their setup link matches no row (api/_lib/order-number.js).
   * For that shape only, find the order by the payment it came from: the
   * same four characters at the end of its payment id, written within a day
   * either side of that date. More than one payment matching is a guess,
   * and a guess is refused rather than made.
   */
  const legacy = !orders.length && /^ATT-(\d{4})(\d{2})(\d{2})-([A-Z0-9]{4})$/.exec(orderNum);
  if (legacy) {
    const day = Date.UTC(+legacy[1], +legacy[2] - 1, +legacy[3]);
    const from = new Date(day - 86400000).toISOString();
    const to = new Date(day + 2 * 86400000).toISOString();
    const tail = legacy[4];
    const lRes = await rest(
      `orders?or=(stripe_payment_intent_id.ilike.*${tail},stripe_payment_intent_id.ilike.*${tail}_*)`
      + `&created_at=gte.${encodeURIComponent(from)}&created_at=lt.${encodeURIComponent(to)}`
      + '&select=order_num,user_id,buyer_email,stripe_payment_intent_id',
      { headers: svc });
    if (!lRes.ok) return { ok: false };
    const found = (await lRes.json().catch(() => null)) || [];
    const payments = new Set(found.map((o) => String(o.stripe_payment_intent_id || '').replace(/_\d+$/, '')));
    if (payments.size === 1) {
      orders = found;
      filter = `order_num=in.(${found.map((o) => `"${encodeURIComponent(o.order_num)}"`).join(',')})`;
    }
  }
  return { ok: true, orders, filter };
}
