/**
 * Does the account behind this email already own the two core exercises?
 *
 * ── WHY IT IS A MODULE AND NOT JUST AN ENDPOINT ───────────────────────────
 * Two callers need the same answer, and they must not get it two ways.
 *
 * /api/verify-core asks it so the checkout page can tell somebody, before they
 * put a card in, whether the thing in their cart is something they can use.
 * That is a courtesy and it runs in a browser, which means it can be skipped:
 * anybody can post straight to the payment endpoint.
 *
 * So api/create-payment-intent asks the same question again, server side, and
 * refuses the order if the answer is no. The page's version is for the person;
 * this one is the rule. A guard that only exists in the browser is a guard
 * that is not there.
 *
 * ── WHAT COUNTS AS OWNING IT ──────────────────────────────────────────────
 * `hasGrant` from computeEntitlements, which is true when a real order sits
 * behind the account and true for a comp account. That function is this
 * codebase's one answer to "what does this account own" and this file does not
 * write a second one.
 *
 * Three ways to own it, and all three count:
 *
 *   an order under this email, which covers a buyer who never made an account;
 *   an account whose own orders carry a package;
 *   an invited partner, whose entitlements come from the person who paid, so
 *     the half of a couple who never bought anything is not turned away.
 *
 * ── AND WHAT A FAILURE MEANS ──────────────────────────────────────────────
 * `ok: false`, never `ownsCore: false`. A database read that did not happen is
 * not evidence that somebody has bought nothing, and the expensive direction
 * to be wrong in is refusing a sale to a customer who has paid. Callers are
 * expected to say "could not check" rather than "no".
 */

import { ORDER_SELECT, computeEntitlements, entitlementsFor } from './entitlements.js';

/* What somebody who already owns a package is told when they try to buy
   another for themselves (A215). One sentence, sent by both callers: the
   payment endpoint's 409 and /api/verify-core, which the checkout page asks
   as the email is typed. Placeholder words of mine, listed under A215 in
   TASKS.md for Ellie. */
export const ALREADY_OWNS = 'This email already has an Attune account. You can add exercises or tools to it instead.';

/** The same shape of read the rest of api/ uses against PostgREST. */
async function restGet(url, key, path) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return { error: `${res.status}` };
  return { data: await res.json().catch(() => null) };
}

/**
 * The address, lowercased, or null when it is not one.
 *
 * Shape only: a typo must not read as "you do not own this".
 *
 * Named away from the `*Email` ending on purpose. check-email-preview scans
 * api/ for `export function <name>Email(` and counts every match as an email
 * the preview page must render, so `looksLikeEmail` made a validator look like
 * a fourteenth builder against a catalogue of thirteen and failed the build.
 * The scan is right to match on the name; the name was the thing that lied.
 */
export function emailOrNull(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!email || email.length > 254) return null;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null;
}

/**
 * ── WHY NOT `ownsCoreByEmail` ─────────────────────────────────────────────
 * It was called that, and a name ending in Email means something specific
 * here: check-email-preview scans api/ for `export function <name>Email(` and
 * treats every match as an email the preview page has to be able to render.
 * This counted as a fourteenth builder against a catalogue of thirteen and
 * failed the build, which is the scan doing its job on a name that lied to it.
 *
 * @returns {Promise<{ok: true, ownsCore: boolean} | {ok: false, error: string}>}
 */
export async function ownsCoreFor({ supabaseUrl, serviceKey, email }) {
  const addr = emailOrNull(email);
  if (!addr) return { ok: false, error: 'not an email address' };
  if (!supabaseUrl || !serviceKey) return { ok: false, error: 'not configured' };

  /* Orders first, because somebody can buy a package and not make an account
     for a week, and telling that person they do not own what they paid for is
     the worst version of this. */
  const direct = await restGet(
    supabaseUrl, serviceKey,
    `orders?buyer_email=eq.${encodeURIComponent(addr)}&select=${ORDER_SELECT}`,
  );
  if (direct.error) return { ok: false, error: `orders read failed: ${direct.error}` };
  if (computeEntitlements(direct.data || [], null).hasGrant) return { ok: true, ownsCore: true };

  /* Then the account, which is what catches a comp and an invited partner
     whose own address never appears on an order. */
  const prof = await restGet(
    supabaseUrl, serviceKey,
    `profiles?email=eq.${encodeURIComponent(addr)}&select=id&limit=1`,
  );
  if (prof.error) return { ok: false, error: `profile read failed: ${prof.error}` };
  const id = Array.isArray(prof.data) && prof.data[0]?.id;
  if (!id) return { ok: true, ownsCore: false };

  const read = await entitlementsFor({ supabaseUrl, serviceKey, userId: id, email: addr });
  if (!read.ok) return { ok: false, error: read.error };
  return { ok: true, ownsCore: !!read.entitlements.hasGrant };
}

/**
 * Is this a cart with no package in it?
 *
 * The thing that makes an order need the check above. Written here beside the
 * check so the two cannot part company: a cart shape that stops counting as
 * standalone would silently stop being verified.
 *
 * An item with no package key and at least one add-on is a standalone
 * purchase. An item with neither is nothing at all, and the caller refuses it
 * for a different reason.
 */
export function isStandaloneCart(items) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return false;
  return list.every((it) => !it.pkgKey);
}
