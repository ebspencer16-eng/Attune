/**
 * POST /api/order-email-hint  { orderNum }
 *
 * Which email address an order was bought with, masked: the help page behind
 * "Having trouble signing in?" (A204b). Ellie: "on that page it should have a
 * box to enter order number and you're shown the email you need to use".
 *
 * ── MASKED, NOT IN FULL ───────────────────────────────────────────────────
 * Anybody can type an order number, and the older ones are short enough to
 * guess (a promo order was ATT-<date>-PR and three characters), so the full
 * address would hand a stranger a customer's email. The first letter of
 * each half and the ending, `m•••@g•••.com`, is enough for the person who
 * bought to recognise which of their addresses it was, and not enough to
 * write to. A gift recipient sees the giver's, which is the honest answer:
 * that is the address the order is under.
 *
 * The order is found by the same rule claiming uses, api/_lib/find-order.js.
 * A failed read is 503, never "no such order".
 */
import { findOrders } from './_lib/find-order.js';

export const config = { runtime: 'edge', regions: ['iad1'] };

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });
const ORDER_RE = /^ATT-[A-Za-z0-9-]{4,40}$/;

/** `maya@example.com` -> `m•••@e•••.com`. */
export function maskAddress(address) {
  const [local, domain] = String(address || '').split('@');
  if (!local || !domain) return null;
  const dot = domain.lastIndexOf('.');
  const name = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : '';
  return `${local[0]}•••@${name[0]}•••${tld}`;
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405);
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) return json({ ok: false, error: 'not configured' }, 500);

  let body;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'bad request' }, 400); }
  const orderNum = String(body?.orderNum || '').trim().toUpperCase();
  if (!ORDER_RE.test(orderNum)) return json({ ok: true, found: false });

  const svc = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const rest = (path, init) => fetch(`${supabaseUrl}/rest/v1/${path}`, init);
  const look = await findOrders({ rest, svc, orderNum }).catch(() => ({ ok: false }));
  if (!look.ok) return json({ ok: false, error: 'could not check that right now' }, 503);

  const address = look.orders.map((o) => o.buyer_email).find(Boolean);
  if (!address) return json({ ok: true, found: false });
  return json({ ok: true, found: true, hint: maskAddress(address) });
}
