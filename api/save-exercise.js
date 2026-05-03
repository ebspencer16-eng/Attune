/**
 * POST /api/save-exercise
 *
 * Service-role endpoint for saving exercise data. Two auth modes:
 *
 *   1. Bearer token mode: Authorization: Bearer <session token>
 *      Used by the standard authenticated client. The token is verified
 *      via supabase.auth.getUser(); the user's id from the token is what
 *      gets written, regardless of any userId in the body.
 *
 *   2. Pending-confirm mode: no Bearer token, body includes userId + email
 *      Used during the gap between auth.signUp() and email confirmation,
 *      when the client has the user's id but no session token yet. The
 *      endpoint looks up the user in auth.users, verifies the email
 *      matches, and verifies email_confirmed_at IS NULL (i.e. genuinely
 *      in the pending-confirm state). After confirmation, only Bearer
 *      mode is accepted.
 *
 * Why this exists (Issue 4.8 from audit):
 *   The original flow had localStorage as the only fallback during
 *   pending-confirm. If the user signed up on phone, completed exercises,
 *   then opened the email-confirm link on laptop, their answers were
 *   stuck on the phone with no way to recover.
 *
 * Also addresses Issue 3.5 (mid-exercise progress not synced cross-device)
 * via the `progress` flag — the endpoint accepts and stores partial answers
 * to profiles.ex{N}_progress so partially-completed exercises survive
 * device switches.
 *
 * Body shape:
 *   {
 *     userId: string,         // required, UUID
 *     email?: string,         // required for pending-confirm mode
 *     exercise: 'ex1' | 'ex2' | 'ex3',
 *     answers: object,        // jsonb payload
 *     progress?: boolean,     // true = save to ex{N}_progress, false/omit = save final
 *     completedAt?: string,   // ISO timestamp, only when progress is false
 *   }
 *
 * Response:
 *   200 { ok: true, mode: 'bearer' | 'pending-confirm' }
 *   401 { error: 'Authentication failed' }
 *   400 { error: '...' }
 *   500 { error: '...' }
 */

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_EXERCISES = new Set(['ex1', 'ex2', 'ex3']);
const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };

const err = (status, message) => new Response(JSON.stringify({ ok: false, error: message }), { status, headers: HEADERS });
const ok  = (extra)           => new Response(JSON.stringify({ ok: true, ...extra }),         { status: 200, headers: HEADERS });

export default async function handler(req) {
  if (req.method !== 'POST') return err(405, 'Method not allowed');

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY
                   || process.env.SUPABASE_SERVICE_ROLE
                   || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return err(500, 'Server not configured');

  let body;
  try { body = await req.json(); }
  catch { return err(400, 'Invalid JSON'); }

  const { userId, exercise, answers, progress, completedAt } = body || {};
  const email = (body?.email || '').toLowerCase().trim();

  if (!userId || !UUID_RE.test(userId)) return err(400, 'Invalid userId');
  if (!exercise || !VALID_EXERCISES.has(exercise)) return err(400, 'Invalid exercise');
  if (!answers || typeof answers !== 'object') return err(400, 'Missing answers');

  const admin = createClient(supabaseUrl, serviceKey);

  // ── Auth path 1: Bearer token ────────────────────────────────────────────
  // If the caller passed a session token, verify it and use the user id
  // from the token (NOT from the body — never trust client-supplied IDs
  // when a token is present).
  const authHeader = req.headers.get('authorization') || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  let resolvedUserId = null;
  let mode = null;

  if (accessToken) {
    const { data: userData, error: userErr } = await admin.auth.getUser(accessToken);
    if (userErr || !userData?.user) return err(401, 'Invalid or expired token');
    resolvedUserId = userData.user.id;
    mode = 'bearer';
    // If the body's userId mismatches the token's user, that's a client
    // bug. Reject rather than silently fixing.
    if (userId !== resolvedUserId) {
      return err(403, 'userId does not match auth token');
    }
  } else {
    // ── Auth path 2: Pending-confirm mode ──────────────────────────────────
    // No token — caller is in the gap between signup and email confirmation.
    // Verify the user exists in auth.users, the email matches, AND email is
    // NOT yet confirmed. After confirmation, the client must use Bearer mode.
    if (!email) return err(401, 'email required when no Bearer token');

    const { data: authUser, error: lookupErr } = await admin.auth.admin.getUserById(userId);
    if (lookupErr || !authUser?.user) return err(401, 'User not found');

    const u = authUser.user;
    if ((u.email || '').toLowerCase() !== email) return err(401, 'email mismatch');

    if (u.email_confirmed_at) {
      // Email is already confirmed — pending-confirm mode is no longer valid.
      // The client should sign in and use Bearer mode instead.
      return err(401, 'Email already confirmed; use Bearer auth');
    }

    resolvedUserId = userId;
    mode = 'pending-confirm';
  }

  // ── Write the exercise data ──────────────────────────────────────────────
  // Mid-exercise progress goes to ex{N}_progress (jsonb columns added by
  // earlier migrations). Final completion goes to ex{N}_answers + sets the
  // ex{N}_completed flag and ex{N}_completed_at timestamp.
  const isProgress = !!progress;
  const updates = {};

  if (isProgress) {
    updates[`${exercise}_progress`] = answers;
  } else {
    updates[`${exercise}_answers`] = answers;
    updates[`${exercise}_completed`] = true;
    updates[`${exercise}_completed_at`] = completedAt || new Date().toISOString();
    // Clear the progress slot now that the exercise is complete
    updates[`${exercise}_progress`] = null;
  }

  const { error: updateErr } = await admin
    .from('profiles')
    .update(updates)
    .eq('id', resolvedUserId);

  if (updateErr) {
    // If profiles row doesn't exist yet (rare — pending-confirm user who
    // skipped /api/create-profile), surface it clearly.
    console.error('[save-exercise] update error:', updateErr);
    return err(500, updateErr.message);
  }

  return ok({ mode });
}
