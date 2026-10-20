/**
 * POST /api/verify-core  { email } -> { ownsCore: boolean }
 *
 * Does the account behind this email already own the two core exercises?
 *
 * ── WHY IT EXISTS ─────────────────────────────────────────────────────────
 * Ellie: "Users should only be able to purchase one standalone exercise if
 * they already own the core exercises. We need to incorporate this into the
 * checkout logic, maybe if they only add one exercise to their cart they
 * should have to provide their email to confirm that they already have the
 * foundational exercises before checking out? Same thing if they want to just
 * buy a resource."
 *
 * Every package starts from the two core exercises, which is what
 * public/offerings.html says on the page where they are sold. An add-on
 * exercise or a resource on its own is therefore an upgrade to something, and
 * a cart holding only those is a cart that assumes a purchase nobody has
 * checked.
 *
 * Typing an email is not on its own a confirmation of anything, because
 * anybody can type any email. What makes it a confirmation is this: the
 * server looks it up and answers from the orders.
 *
 * ── WHAT COUNTS AS OWNING IT ──────────────────────────────────────────────
 * `hasGrant` from computeEntitlements, which is true when the account has a
 * real order row behind it, and true for a comp account. That function is the
 * one answer to "what does this account own" and this does not get a second
 * one: the gathering is entitlementsFor, shared with writeEntitlements.
 *
 * An invited partner who never paid is included, because entitlementsFor
 * reads Partner A's orders for an invitee. A couple share one purchase and
 * only one of them is the buyer.
 *
 * A buyer with no profile yet is included too, by the orders-by-email read
 * below. Somebody can buy a package and not make an account for a week, and
 * telling them they do not own what they paid for would be the worst version
 * of this.
 *
 * ── WHAT IT DELIBERATELY DOES NOT DO ──────────────────────────────────────
 * It does not say whether an email has an account. An address with no account
 * and an address with an account but no package get the same answer, the same
 * shape and the same status, so this cannot be used to find out who is
 * registered. That is also why there is no third state: the only thing a
 * caller learns is the thing it needs in order to sell.
 *
 * It is not an authorisation. Somebody who knows a customer's email can pass
 * this, and that is deliberate: the alternative is making everybody sign in
 * before buying a forty dollar add-on, and the thing being protected is a
 * person buying something they cannot use, not a secret.
 */

/**
 * ── AND WHERE IT RUNS ─────────────────────────────────────────────────────
 * Pinned next to the database, like every other endpoint here. An edge
 * function runs near whoever is asking, which is the wrong default when the
 * answer comes from one database somewhere else. See api/_lib/db-region.js
 * and check-edge-region.mjs.
 */
export const config = { runtime: 'edge', regions: ['iad1'] };

import { safeError } from './_lib/http.js';
import { ORDER_SELECT, computeEntitlements, entitlementsFor } from './_lib/entitlements.js';

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });

/** The same shape of read the rest of api/ uses against PostgREST. */
async function restGet(url, key, path) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return { error: `${res.status}` };
  return { data: await res.json().catch(() => null) };
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) return json({ error: 'not configured' }, 500);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'bad request' }, 400); }

  const email = String(body?.email || '').trim().toLowerCase();
  /* Shape only. A real check is the lookup below, and rejecting an address
     here for looking unusual would turn a typo into "you do not own this". */
  if (!email || email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: 'enter an email address' }, 400);
  }

  try {
    /* ── FIRST, THE ORDERS ────────────────────────────────────────────────
       Before the profile, because a buyer who has not made an account yet has
       orders and no profile, and that person has certainly bought the core. */
    const direct = await restGet(
      supabaseUrl, serviceKey,
      `orders?buyer_email=eq.${encodeURIComponent(email)}&select=${ORDER_SELECT}`,
    );
    if (direct.error) {
      /* A failed read is not "no". Saying no here would refuse a sale to
         somebody who has paid, which is the expensive direction to be wrong
         in. The page asks them to try again. */
      console.error('[verify-core] orders read failed:', direct.error);
      return json({ error: 'could not check that right now' }, 503);
    }
    if (computeEntitlements(direct.data || [], null).hasGrant) return json({ ownsCore: true });

    /* ── THEN THE ACCOUNT ─────────────────────────────────────────────────
       Which catches a comp account, and an invited partner whose own email
       never appears on an order. entitlementsFor does that gathering. */
    const prof = await restGet(
      supabaseUrl, serviceKey,
      `profiles?email=eq.${encodeURIComponent(email)}&select=id&limit=1`,
    );
    if (prof.error) {
      console.error('[verify-core] profile read failed:', prof.error);
      return json({ error: 'could not check that right now' }, 503);
    }
    const id = Array.isArray(prof.data) && prof.data[0]?.id;
    if (!id) return json({ ownsCore: false });

    const read = await entitlementsFor({ supabaseUrl, serviceKey, userId: id, email });
    if (!read.ok) {
      console.error('[verify-core] entitlements read failed:', read.error);
      return json({ error: 'could not check that right now' }, 503);
    }
    return json({ ownsCore: !!read.entitlements.hasGrant });
  } catch (e) {
    return json({ error: safeError('verify-core', e, 'could not check that right now') }, 500);
  }
}
