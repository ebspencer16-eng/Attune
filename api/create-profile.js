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

export const config = { runtime: 'edge' };

import { safeError } from './_lib/http.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CORS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };

export default async function handler(req) {
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

  const { userId } = body || {};
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
    pkg:                  typeof body.pkg === 'string' && ['core','newlywed','anniversary','premium'].includes(body.pkg) ? body.pkg : 'core',
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
  try {
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    if (authUser?.user?.email) profile.email = authUser.user.email.toLowerCase();
    // How this person signs in, recorded from the verified auth user rather
    // than from the request. Support cannot answer "why can't I get in" without
    // knowing whether an account has a password at all, and an Apple account
    // whose address is a relay looks like a stranger from every other angle.
    const p = authUser?.user?.app_metadata?.provider;
    profile.auth_provider = isOAuthProvider(p) ? p : 'email';
  } catch { /* non-fatal: backfillable from auth.users */ }

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
