/**
 * Has this account, or the couple it belongs to, bought anything?
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie, 29 October: "Mya just let me know that she went through the app, but
 * she never placed an order. The app let her make an account and access the
 * platform without a purchase... It is very important that users cannot just
 * make an account in the app, it messed up Rebecca and Abram's experience and
 * account linking."
 *
 * The app has no sign-up form, and that was taken to mean it could not make an
 * account. It can: "Continue with Google" and "Continue with Apple" go through
 * Supabase's /authorize, which creates an auth user for any address it has not
 * seen. The app then found no profile, drew its own profile setup, and
 * /api/create-profile wrote one with pkg core, which is a free core account.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * Allowed in when any of these is true, and nothing else:
 *   - the account has an order, by its id or by its email (a guest checkout
 *     writes buyer_email before any account exists), or is a comp account;
 *   - its partner does, by the couple link;
 *   - it joined, or is joining, on the invite code of somebody who does.
 * "Has an order" is computeEntitlements' hasGrant, through entitlementsFor,
 * which is the one answer this codebase has to "what does this account own".
 * A profile's own pkg of core is not a purchase: it is what create-profile
 * wrote for everybody with no order, and it carries no order number.
 *
 * ── UNKNOWN IS NOT NO ─────────────────────────────────────────────────────
 * A read that fails answers { ok: false }, and every caller lets the person in
 * on that. Refusing a paying customer because a request timed out is the worse
 * of the two mistakes, and the next load asks again.
 */
import { entitlementsFor } from './entitlements.js';

const get = async (supabaseUrl, serviceKey, path) => {
  try {
    const r = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!r.ok) return { error: `HTTP ${r.status}` };
    return { data: await r.json() };
  } catch (e) {
    return { error: String(e?.message || e) };
  }
};

/** One profile's own purchase, from its orders and comp flag. */
async function ownsByProfile({ supabaseUrl, serviceKey, userId, email }) {
  const r = await entitlementsFor({ supabaseUrl, serviceKey, userId, email });
  if (!r.ok) return r.error === 'profile not found' ? { ok: true, owns: false, missing: true } : { ok: false, error: r.error };
  const e = r.entitlements || {};
  return { ok: true, owns: !!(e.hasGrant || e.comp), profile: r.profile };
}

/** The profile an invite code belongs to: the inviter, never the reader. */
async function inviterFor({ supabaseUrl, serviceKey, code, notId }) {
  if (!code) return { ok: true, id: null };
  const r = await get(supabaseUrl, serviceKey,
    `profiles?invite_code=eq.${encodeURIComponent(code)}&select=id,email,joined_via_invite&limit=5`);
  if (r.error) return { ok: false, error: r.error };
  const rows = (r.data || []).filter((p) => p.id !== notId);
  /* The buyer is the one who did not join on it. Two rows share a code only
     when a partner joined on it, and the partner carries joined_via_invite. */
  const inviter = rows.find((p) => !p.joined_via_invite) || rows[0] || null;
  return { ok: true, id: inviter?.id || null, email: inviter?.email || null };
}

/**
 * @returns {Promise<{ ok: true, owns: boolean, via?: string } | { ok: false, error: string }>}
 */
export async function purchaseStatus({ supabaseUrl, serviceKey, userId, email, inviteCode = null }) {
  if (!supabaseUrl || !serviceKey || !userId) return { ok: false, error: 'not configured' };

  const own = await ownsByProfile({ supabaseUrl, serviceKey, userId, email });
  if (!own.ok) return own;
  if (own.owns) return { ok: true, owns: true, via: 'own' };

  if (own.missing) {
    /* No profile yet, so entitlementsFor had nothing to start from. The
       orders are asked directly: somebody who bought as a guest and is
       making their account now has orders and no profile. */
    const reads = [get(supabaseUrl, serviceKey, `orders?user_id=eq.${encodeURIComponent(userId)}&select=order_num&limit=1`)];
    const em = String(email || '').trim().toLowerCase();
    if (em) reads.push(get(supabaseUrl, serviceKey, `orders?buyer_email=eq.${encodeURIComponent(em)}&select=order_num&limit=1`));
    const results = await Promise.all(reads);
    if (results.some((x) => x.error)) return { ok: false, error: 'orders read failed' };
    if (results.some((x) => (x.data || []).length)) return { ok: true, owns: true, via: 'own' };
  }

  const profile = own.profile || null;

  /* The partner, by the couple link. A couple share one purchase and only one
     of them is the buyer. */
  if (profile?.partner_profile_id) {
    const p = await ownsByProfile({ supabaseUrl, serviceKey, userId: profile.partner_profile_id, email: null });
    if (!p.ok) return p;
    if (p.owns) return { ok: true, owns: true, via: 'partner' };
  }

  /* The inviter, by the code: one being joined now, or the one this profile
     joined on before the link was made. */
  const code = inviteCode || (profile?.joined_via_invite ? profile.invite_code : null);
  if (code) {
    const inv = await inviterFor({ supabaseUrl, serviceKey, code, notId: userId });
    if (!inv.ok) return inv;
    if (inv.id) {
      const p = await ownsByProfile({ supabaseUrl, serviceKey, userId: inv.id, email: inv.email });
      if (!p.ok) return p;
      if (p.owns) return { ok: true, owns: true, via: 'invite' };
    }
  }

  return { ok: true, owns: false };
}

/**
 * What the app says to somebody signed in with no purchase.
 *
 * A placeholder of mine, flagged to Ellie for her words (A191): the first line
 * is hers already, the sign-in screen's "Get started" link.
 */
export const NO_PURCHASE_COPY = {
  title: 'No Attune package on this account yet',
  body: 'Attune starts with a package, bought on our website. Use the same email you signed in with here, and this account opens as soon as the order is through.',
  getStarted: 'Get started',
  invited: 'Were you invited by your partner? Enter the invite code they sent you.',
  signOut: 'Sign out',
  retry: 'I just bought one',
};
