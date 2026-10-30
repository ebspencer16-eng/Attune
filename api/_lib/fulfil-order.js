/**
 * What happens once an order exists: the account, the invitation, the email
 * (A206).
 *
 * Ellie (A205b): a buyer for themselves gives their email and their
 * partner's, or ticks "I will invite my partner later"; a gift buyer gives
 * one recipient's email. She chose the account being made at purchase, so:
 *
 *   for yourself   the buyer's account is made (or found), the order is
 *                  theirs, and the partner is sent an invitation that joins
 *                  on the buyer's invite code, which exists now;
 *   a gift         the recipient's account is made (or found) and the order
 *                  is theirs; they invite their own partner from the
 *                  dashboard;
 *   then           the buyer's confirmation, saying what was sent.
 *
 * Called by api/stripe-webhook.js when a payment lands and by
 * api/create-payment-intent.js for an order a promo code made free. One
 * function, so a free order and a paid one cannot be fulfilled two ways.
 *
 * ── NEVER A REASON TO FAIL A PAYMENT ──────────────────────────────────────
 * The money has moved by the time this runs. An account that could not be
 * made is reported, and the email falls back to the sign-up link that claims
 * the order by its number, which worked before any of this existed. An
 * invitation that could not be sent is not claimed as sent.
 */
import { createClient } from '@supabase/supabase-js';
import { accountFor, ensureProfile, setupUrl, partnerInviteUrl } from './purchase-accounts.js';
import { orderEmailContext } from './order-email-context.js';
import { sendOrderEmails } from './order-emails.js';
import { writeEntitlements } from './entitlements.js';
import { emailOrNull } from './owns-core.js';
import { reportToSentry } from './sentry-edge.js';
import { SITE_URL } from './site.js';

/**
 * Link one order row to its owner and record who it is for. Answers its
 * set-up token, or null. Before migration 105 the new columns are not there,
 * so a refused write is tried again with the owner alone: the order still
 * becomes theirs and the email uses a link that needs no token.
 */
async function claimRow({ supabaseUrl, serviceKey, orderNum, userId, who }) {
  const H = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  const url = `${supabaseUrl}/rest/v1/orders?order_num=eq.${encodeURIComponent(orderNum)}&select=setup_token,setup_used_at,user_id`;
  const patch = async (body) => fetch(url, { method: 'PATCH', headers: H, body: JSON.stringify(body) }).catch(() => null);
  let r = await patch({ user_id: userId, ...who });
  if (!r?.ok) r = await fetch(url.replace('&select=setup_token,setup_used_at,user_id', '&select=user_id'), { method: 'PATCH', headers: H, body: JSON.stringify({ user_id: userId }) }).catch(() => null);
  if (!r?.ok) return { ok: false };
  const row = (await r.json().catch(() => []))?.[0];
  return { ok: !!row, token: row?.setup_token && !row.setup_used_at ? row.setup_token : null };
}

export async function fulfilOrder({ supabaseUrl, serviceKey, resendKey, buyerEmail, buyerName, baseOrderNum, items, charged = null, promoCoversBase = false }) {
  const admin = supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey) : null;
  const buyer = emailOrNull(buyerEmail);
  const report = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const orderNum = items.length > 1 ? `${baseOrderNum}-${i + 1}` : baseOrderNum;
    const isGift = !!it.g;
    const owner = isGift ? emailOrNull(it.re) : buyer;
    const partner = !isGift && !it.il ? emailOrNull(it.pe) : null;
    const links = {};

    if (admin && owner && !it.ph) {
      try {
        const acct = await accountFor(admin, owner);
        if (!acct.ok) throw new Error(`account: ${acct.error}`);
        const prof = await ensureProfile(admin, {
          id: acct.id, email: owner,
          fields: isGift ? {} : { name: buyerName || it.p1 || null, partner_name: it.p2 || null, partner_email: partner },
        });
        if (!prof.ok) throw new Error(`profile: ${prof.error}`);
        const claim = await claimRow({
          supabaseUrl, serviceKey, orderNum, userId: acct.id,
          who: { partner_email: partner, recipient_email: isGift ? owner : null, invite_partner_later: !isGift && !!it.il },
        });
        if (!claim.ok) throw new Error('order not linked');
        const ent = await writeEntitlements({ supabaseUrl, serviceKey, userId: acct.id, email: owner });
        if (!ent.ok) console.warn('[fulfil-order] entitlements not written:', ent.error);

        /* A new account chooses a password through our link. One that
           already existed signs in as it always has. Before migration 105
           there is no token, and the reset page does the same job. */
        const link = acct.isNew ? (claim.token ? setupUrl(claim.token) : `${SITE_URL}/app?forgot=1`) : `${SITE_URL}/app?signin=1`;
        links.existing = !acct.isNew;
        links.partnerLinked = !!prof.linked;
        if (isGift) { links.giftUrl = link; }
        else {
          links.setupUrl = link;
          if (partner && prof.inviteCode && !prof.linked) {
            links.partnerInviteUrl = partnerInviteUrl({ inviteCode: prof.inviteCode, fromName: prof.name || buyerName || it.p1, buyerEmail: owner, partnerEmail: partner });
          }
        }
      } catch (e) {
        await reportToSentry(e, { route: 'fulfil-order', extra: { orderNum } }).catch(() => {});
      }
    }

    if (!resendKey || !buyer) { report.push({ orderNum, emailed: false }); continue; }
    const ctx = orderEmailContext({
      compact: { ...it, pe: partner || '' }, buyerName: buyerName || it.p1 || null, buyerEmail: buyer, orderNum,
      charged: items.length === 1 ? charged : null, promoCoversBase, links,
    });
    const r = await sendOrderEmails(ctx, resendKey).catch((err) => ({ failed: 1, err }));
    report.push({ orderNum, sent: r.sent || 0, failed: r.failed || 0, invited: !!r.invited });
  }
  return report;
}
