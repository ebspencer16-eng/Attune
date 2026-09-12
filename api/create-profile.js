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
import { PROFILE_SETUP_COPY } from './_lib/profile-setup-copy.js';
import { PKG_CAPS } from './_lib/entitlements.js';

export const config = { runtime: 'edge' };

import { safeError } from './_lib/http.js';

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
    return new Response(JSON.stringify({ ok: true, copy: PROFILE_SETUP_COPY }), { status: 200, headers: CORS });
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
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS }); }

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
  const bearer = (req.headers.get('authorization') || req.headers.get('Authorization') || '')
    .replace(/^Bearer\s+/i, '').trim();

  let userId = (body || {}).userId;
  if (bearer) {
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || serviceKey;
    const uRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${bearer}` },
    });
    if (!uRes.ok) {
      return new Response(JSON.stringify({ error: 'invalid auth token' }), { status: 401, headers: CORS });
    }
    const who = await uRes.json().catch(() => null);
    if (!who?.id) {
      return new Response(JSON.stringify({ error: 'invalid auth token' }), { status: 401, headers: CORS });
    }
    userId = who.id;
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
    invite_code:          (typeof body.inviteCode === 'string' && body.inviteCode.trim()) ? body.inviteCode.slice(0, 32) : null,
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
    return new Response(JSON.stringify({ ok: true, existed: true }), { status: 200, headers: CORS });
  }

  const { error } = await admin.from('profiles').insert(profile);
  if (error) {
    console.error('[create-profile] insert error:', error);
    return new Response(JSON.stringify({ error: safeError('create-profile', error, 'Could not create your profile.') }), { status: 500, headers: CORS });
  }

  return new Response(JSON.stringify({ ok: true, created: true }), { status: 200, headers: CORS });
}
