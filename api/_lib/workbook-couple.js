/**
 * Everything a workbook needs, from one person's id.
 *
 * ── WHY IT IS A MODULE ────────────────────────────────────────────────────
 * It was inside api/store-workbook.js, which is the endpoint that builds the
 * .docx when a couple's results open. The app's workbook page needs exactly
 * the same thing: both profiles, both sets of answers, the couple type. A
 * second copy of this assembly would be two answers to "what is in this
 * couple's workbook", and the one the reader got would depend on which surface
 * they opened it from.
 */

import { buildWorkbookPayload } from './workbook-payload.js';
import { coupleResults } from './results.js';
import { COUPLE_TYPES } from '../_couple-types.js';

/**
 * Everything the generator needs, from one person's id.
 *
 * Both profiles, both sets of answers, the couple type, and the order the file
 * belongs to. Returns null when there is not enough to build a workbook worth
 * sending: a half-answered one is worse than none, which is the rule the
 * website's trigger already applied.
 */
export async function payloadForCouple({ supabaseUrl, serviceKey, userId }) {
  const svc = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const get = async (path) => {
    const r = await fetch(`${supabaseUrl}/rest/v1/${path}`, { headers: svc });
    if (!r.ok) return null;
    return (await r.json().catch(() => []))?.[0] || null;
  };

  const cols = 'id,name,partner_profile_id,ex1_answers,ex2_answers';
  const me = await get(`profiles?id=eq.${userId}&select=${cols}`);
  if (!me?.partner_profile_id) return null;
  const them = await get(`profiles?id=eq.${me.partner_profile_id}&select=${cols}`);
  if (!them) return null;

  const has = (a) => !!a && Object.keys(a).length > 0;
  if (!has(me.ex1_answers) || !has(them.ex1_answers)) return null;
  if (!has(me.ex2_answers) || !has(them.ex2_answers)) return null;

  const results = coupleResults({
    aAnswers: me.ex1_answers, bAnswers: them.ex1_answers,
    aName: me.name, bName: them.name,
  });
  const coupleType = COUPLE_TYPES.find((t) => t.id === results?.coupleType) || null;

  // The order the file is filed under: the buyer's, which for an invitee is
  // their partner's. Whichever row carries the workbook add-on.
  const order = await get(
    `orders?or=(user_id.eq.${me.id},user_id.eq.${them.id})&addon_workbook=not.is.null`
    + '&select=order_num,workbook_url&order=created_at.desc&limit=1',
  );

  return {
    ...buildWorkbookPayload(
      me.name || 'Partner A', them.name || 'Partner B',
      me.ex1_answers, them.ex1_answers,
      me.ex2_answers, them.ex2_answers,
      coupleType,
    ),
    orderId: order?.order_num || null,
  };
}
