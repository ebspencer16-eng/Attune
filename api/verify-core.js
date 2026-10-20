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
import { emailOrNull, ownsCoreFor } from './_lib/owns-core.js';

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) return json({ error: 'not configured' }, 500);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'bad request' }, 400); }

  /* Shape only. A real check is the lookup, and rejecting an address here for
     looking unusual would turn a typo into "you do not own this". */
  const email = emailOrNull(body?.email);
  if (!email) return json({ error: 'enter an email address' }, 400);

  try {
    const read = await ownsCoreFor({ supabaseUrl, serviceKey, email });
    if (!read.ok) {
      /* A failed read is not "no". Saying no here would refuse a sale to
         somebody who has paid, which is the expensive direction to be wrong
         in. The page asks them to try again. */
      console.error('[verify-core]', read.error);
      return json({ error: 'could not check that right now' }, 503);
    }
    return json({ ownsCore: read.ownsCore });
  } catch (e) {
    return json({ error: safeError('verify-core', e, 'could not check that right now') }, 500);
  }

}
