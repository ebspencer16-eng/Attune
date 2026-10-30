/**
 * POST /api/create-profile
 *
 * Creates or updates a profile row using the service role key, bypassing
 * RLS. Needed because when email confirmation is ON in Supabase, auth.signUp
 * returns the user but no session. The client can't directly insert into
 * profiles (the profiles_self_insert RLS policy requires auth.uid() = id,
 * which is null without a session). This endpoint handles that case.
 *
 * Security:
 *   - Validates the userId is a UUID
 *   - Verifies a profile doesn't already exist for that ID (so this can't
 *     be used to overwrite arbitrary profiles)
 *   - Uses upsert with merge so re-running is safe (e.g. retry on 5xx)
 */

import { createClient } from '@supabase/supabase-js';
import { isOAuthProvider } from './_lib/auth-providers.js';
import { ABOUT_YOU, PROFILE_SETUP_COPY } from './_lib/profile-setup-copy.js';
import { recordConsent } from './_lib/consent.js';
import { PKG_CAPS } from './_lib/entitlements.js';

/**
 * ── AND WHERE IT RUNS ─────────────────────────────────────────────────────
 * Pinned next to the database, like every other endpoint the app calls. An
 * edge function runs near whoever is asking, which is the wrong default when
 * every answer comes from one database somewhere else. See
 * api/_lib/db-region.js for the measurement, and check-edge-region.mjs, which
 * is what noticed this one was not.
 */
export const config = { runtime: 'edge', regions: ['iad1'] };

import { safeError, jsonBody } from './_lib/http.js';
import { newInviteCode, needsInviteCode } from './_lib/invite-code.js';
import { purchaseStatus, NO_PURCHASE_COPY } from './_lib/purchase-gate.js';

/**
 * The signed-in caller, from a token, or null. The app always sends one; the
 * website never does, because it calls this before it has a session.
 */
async function callerFor(req, supabaseUrl, serviceKey) {
  const bearer = (req.headers.get('authorization') || req.headers.get('Authorization') || '')
    .replace(/^Bearer\s+/i, '').trim();
  if (!bearer) return { bearer: '' };
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || serviceKey;
  const uRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${bearer}` },
  });
  if (!uRes.ok) return { bearer, invalid: true };
  const who = await uRes.json().catch(() => null);
  if (!who?.id) return { bearer, invalid: true };
  return { bearer, id: who.id, email: (who.email || '').toLowerCase() || null };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CORS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };

export default async function handler(req) {
  /**
   * The screen's own words, for the app.
   *
   * The app reaches profile setup exactly when /api/home has answered 404, so
   * it has no payload to carry them on. Four field labels and a sentence
   * about why names are asked for; nothing here is anyone's data.
   */
  if (req.method === 'GET') {
    // aboutYou rides along so the app can ask the five demographic questions
    // the website's signup asks. Nothing here is a secret: it is field labels.
    /* And, for a signed-in caller, whether this account may set up at all
       (A191). Asked before the form is drawn, so nobody fills in a profile
       to be refused at the end of it. `null` when it could not be checked,
       which the app treats as yes. */
    let purchase = null;
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    if (supabaseUrl && serviceKey) {
      try {
        const who = await callerFor(req, supabaseUrl, serviceKey);
        if (who.id) {
          const st = await purchaseStatus({ supabaseUrl, serviceKey, userId: who.id, email: who.email });
          if (st.ok) purchase = { owns: st.owns, email: who.email, copy: NO_PURCHASE_COPY };
        }
      } catch { /* unknown: leave it null */ }
    }
    return new Response(JSON.stringify({ ok: true, copy: PROFILE_SETUP_COPY, aboutYou: ABOUT_YOU, purchase }), { status: 200, headers: CORS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Server not configured' }), { status: 500, headers: CORS });
  }

  let body;
  const _parsed = await jsonBody(req);
  if (_parsed.error) return _parsed.error;
  body = _parsed.body;

  /**
   * ── WHOSE PROFILE ───────────────────────────────────────────────────────
   * The id comes from the body, because this endpoint exists for the one
   * moment when there is no session to take it from: with email confirmation
   * on, auth.signUp returns a user and no session, and RLS will not let the
   * client insert its own row.
   *
   * The app is not in that moment. It arrives signed in, having been told it
   * has no profile, so it sends a token and the id is taken from that
   * instead. A caller who can prove who they are does not get to say.
   *
   * The existing-row check below is what keeps the unauthenticated path safe
   * either way: this can create a profile that is missing, never change one
   * that is there.
   */
  const caller = await callerFor(req, supabaseUrl, serviceKey);
  const bearer = caller.bearer;

  let userId = (body || {}).userId;
  if (bearer) {
    if (caller.invalid) {
      return new Response(JSON.stringify({ error: 'invalid auth token' }), { status: 401, headers: CORS });
    }
    userId = caller.id;
  }

  if (!userId || !UUID_RE.test(userId)) {
    return new Response(JSON.stringify({ error: 'Invalid userId' }), { status: 400, headers: CORS });
  }

  // Build the upsert payload from validated fields only
  const profile = {
    id: userId,
    name:                 typeof body.name === 'string'             ? body.name.slice(0, 100)             : '',
    pronouns:             typeof body.pronouns === 'string'         ? body.pronouns.slice(0, 30)          : '',
    partner_name:         typeof body.partnerName === 'string'      ? body.partnerName.slice(0, 100)      : '',
    partner_pronouns:     typeof body.partnerPronouns === 'string'  ? body.partnerPronouns.slice(0, 30)   : '',
    partner_email:        typeof body.partnerEmail === 'string'     ? body.partnerEmail.slice(0, 200).toLowerCase() : '',
    email_opt_in:         body.emailOptIn !== false,
    /**
     * The code this couple is found by.
     *
     * Taken from the body when the client sent one, which is the website
     * building the invite URL in the same breath. Minted below when it did
     * not, because a first partner with no code can never invite anybody.
     *
     * Never the code a second partner is JOINING on. invite_code is unique
     * (migration 022), so storing the buyer's code on the invitee failed the
     * insert, and /api/partner-sync finds the buyer by that code expecting
     * one row. The app's invite step sent it, so every partner who joined in
     * the app was told "Could not create your profile" (A193). The website
     * sends an empty code for an invitee and always has; this makes the
     * endpoint say so rather than the caller. The code still reaches the
     * purchase check below and the link, which is a separate call.
     */
    invite_code:          (!body.joinedViaInvite && typeof body.inviteCode === 'string' && body.inviteCode.trim()) ? body.inviteCode.slice(0, 32) : null,
    partner_joined:       false,
    // pkg is NOT taken from the body. See the block below: it is derived from
    // a real order, and defaults to core.
    age_range:            typeof body.ageRange === 'string'           ? body.ageRange.slice(0, 30)        : null,
    gender:               typeof body.gender === 'string'             ? body.gender.slice(0, 30)          : null,
    relationship_status:  typeof body.relationshipStatus === 'string' ? body.relationshipStatus.slice(0, 50) : null,
    relationship_length:  typeof body.relationshipLength === 'string' ? body.relationshipLength.slice(0, 30) : null,
    children:             typeof body.children === 'string'           ? body.children.slice(0, 50)        : null,
    signup_source:        typeof body.signupSource === 'string'       ? body.signupSource.slice(0, 50)    : null,
    joined_via_invite:    !!body.joinedViaInvite,
  };

  /**
   * ── A FIRST PARTNER ALWAYS LEAVES HERE WITH A CODE ──────────────────────
   * Asked of the row rather than of the body, so the one rule covers a client
   * that sent nothing, a client that sent an empty string, and a client that
   * has not been written yet.
   *
   * The second partner is exempt and that is the point of the exemption:
   * joining on somebody's invite means the couple already has a code, and a
   * second one would make "which code is this couple" a question with two
   * answers.
   *
   * Uniqueness is a column constraint, so a collision is a failed insert
   * rather than two couples sharing a key. At eight characters from a
   * 32-letter alphabet that is a thousand-billion-to-one, and retrying once
   * costs nothing against never retrying and losing a profile.
   */
  if (needsInviteCode(profile)) profile.invite_code = newInviteCode();

  const admin = createClient(supabaseUrl, serviceKey);

  // Resolve the auth email server-side and store it on the profile.
  // cron-checkin selects profiles.email daily; without this the check-in
  // emails have no recipient. Server-side lookup beats trusting the client
  // payload and covers every create-profile call site at once.
  let authEmail = null;
  try {
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    if (authUser?.user?.email) {
      authEmail = authUser.user.email.toLowerCase();
      profile.email = authEmail;
    }
    // How this person signs in, recorded from the verified auth user rather
    // than from the request. Support cannot answer "why can't I get in" without
    // knowing whether an account has a password at all, and an Apple account
    // whose address is a relay looks like a stranger from every other angle.
    const p = authUser?.user?.app_metadata?.provider;
    profile.auth_provider = isOAuthProvider(p) ? p : 'email';
  } catch { /* non-fatal: backfillable from auth.users */ }

  /**
   * The package, from a paid order rather than from the request.
   *
   * ── WHY ───────────────────────────────────────────────────────────────
   * This endpoint takes no authentication, by design: with email confirmation
   * on, the client has a user id and no session when it needs to write the
   * profile. It used to accept `pkg` from the body, allowlisted to the four
   * package names, which includes premium.
   *
   * profiles.pkg is a grant source. api/_lib/entitlements.js folds it in
   * alongside real orders, and grant-only merging never takes a grant away, so
   * whatever was written here was permanent. The website passed the value
   * straight through from the URL, so signing up at ?pkg=premium granted
   * premium. No payment, no order row, no admin action.
   *
   * So the value is derived. An order is matched by user id, and by the email
   * on the auth record, because a guest checkout writes buyer_email before any
   * user id exists. The best package across those orders wins, ranked by
   * PKG_CAPS rather than by a list written here.
   *
   * With no order this is core, which grants nothing. That is the correct
   * answer for someone who has not paid, and it is self-correcting for someone
   * who has: /api/claim-order links the order moments later and
   * /api/recompute-entitlements grants from it on the next load.
   *
   * A package the client asked for is an intent, not an entitlement, and this
   * endpoint no longer records it at all.
   */
  try {
    const filters = [`user_id=eq.${encodeURIComponent(userId)}`];
    if (authEmail) filters.push(`buyer_email=eq.${encodeURIComponent(authEmail)}`);

    const found = [];
    for (const filter of filters) {
      const r = await fetch(`${supabaseUrl}/rest/v1/orders?${filter}&select=pkg_key`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      });
      if (r.ok) found.push(...(await r.json().catch(() => [])));
    }

    let best = 'core';
    let bestRank = -1;
    for (const row of found) {
      const key = row?.pkg_key || 'core';
      const rank = PKG_CAPS[key]?.rank ?? -1;
      if (rank > bestRank) { bestRank = rank; best = key; }
    }
    profile.pkg = best;
  } catch (e) {
    // A failed lookup must not grant. core is the safe answer, and the
    // entitlements engine will grant from the order on the next load.
    console.error('[create-profile] order lookup failed, defaulting to core:', e);
    profile.pkg = 'core';
  }

  // Check if a profile already exists for this user. If yes, this is a no-op
  // (don't overwrite richer existing data with potentially-stale payload).
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (existing) {
    /* The id goes back with the answer. The app has no Supabase client and
       therefore no way to know its own user id, and joining an invite needs
       one: /api/partner-sync links a specific profile. It is the caller's own
       id, derived from the token they just sent, so this tells them nothing
       they did not already prove. */
    return new Response(JSON.stringify({ ok: true, existed: true, userId }), { status: 200, headers: CORS });
  }

  /**
   * ── NO PURCHASE, NO PROFILE: THE APP'S PATH ─────────────────────────────
   * Ellie (A191): "Please go fix this so that you cannot sign in or create an
   * account on the app without first purchasing a package."
   *
   * The app always signs in first and sends its token; the website never
   * does, because it calls this the moment after auth.signUp, before it has a
   * session, and only after a checkout or on an invite link. So the token path
   * is the app, and it is refused here unless the account, or the buyer whose
   * invite code it is joining on, has bought something. See
   * api/_lib/purchase-gate.js. A check that could not finish lets it through:
   * /api/home asks again on every load.
   */
  if (bearer) {
    const st = await purchaseStatus({
      supabaseUrl, serviceKey, userId,
      email: authEmail || caller.email,
      inviteCode: body.joinedViaInvite && typeof body.inviteCode === 'string' ? body.inviteCode.trim().toUpperCase().slice(0, 32) : null, // codes are stored upper case; partner-sync does the same
    });
    if (st.ok && !st.owns) {
      return new Response(JSON.stringify({ ok: false, reason: 'no_purchase', copy: NO_PURCHASE_COPY }), { status: 403, headers: CORS });
    }
  }

  let { error } = await admin.from('profiles').insert(profile);
  /**
   * ── ONE RETRY, AND ONLY FOR A TAKEN CODE ────────────────────────────────
   * `profiles.invite_code` is unique, so two couples can never share one: a
   * collision is a failed insert rather than a silent merge. 23505 is Postgres
   * for "unique violation", and the only unique column this row can collide on
   * besides its own id, which is the signed-in user and cannot be a surprise.
   *
   * At eight characters from a 32-letter alphabet a collision is about a
   * thousand billion to one, so this will almost certainly never run. It is
   * here because the alternative is losing somebody's profile to a dice roll,
   * and because a comment promising a retry with no retry under it is worse
   * than no comment.
   *
   * Once, not in a loop. If a second random code also collides, something is
   * wrong that retrying will not fix, and the honest answer is the error.
   */
  if (error?.code === '23505' && !body.inviteCode && needsInviteCode({ ...profile, invite_code: null })) {
    profile.invite_code = newInviteCode();
    ({ error } = await admin.from('profiles').insert(profile));
  }
  if (error) {
    console.error('[create-profile] insert error:', error);
    return new Response(JSON.stringify({ error: safeError('create-profile', error, 'Could not create your profile.') }), { status: 500, headers: CORS });
  }

  // ── The consent event ───────────────────────────────────────────────────
  //
  // Creating an account is the second moment the product treats as agreement,
  // and for a partner who joins by invite it is the only one: they never
  // bought anything. The retention policy promises a timestamped record of it,
  // kept for seven years, and nothing recorded one.
  //
  // After the insert, so a profile that failed to save records no agreement.
  // Best-effort: a consent row that cannot be written must not stop somebody
  // setting up an account they have paid for.
  await recordConsent({ email: authEmail, userId, source: 'account_creation' });

  /* The code that was actually stored, so a caller builds its invite link from
     what is in the row rather than from what it hoped it sent. Null for the
     second partner, who joins on the first one's. */
  return new Response(JSON.stringify({ ok: true, created: true, userId, inviteCode: profile.invite_code || null }), { status: 200, headers: CORS });
}
