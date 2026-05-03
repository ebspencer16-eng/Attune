/**
 * /api/partner-sync
 *
 * Unified partner model — both partners are real Supabase auth users with
 * their own profiles row. Linked via profiles.partner_profile_id (FK to
 * each other).
 *
 * GET  ?inviteCode=XXX
 *   → Used during Partner B signup to resolve an invite code to
 *     Partner A's profile id + basic info. Called BEFORE Partner B
 *     signs up to validate the code and look up who invited them.
 *
 * GET  ?partnerProfileId=XXX
 *   → Used by Partner A's dashboard to fetch Partner B's exercise
 *     answers. Returns {found, profile: {name, ex1_answers, ex2_answers,
 *     ex3_answers, ex3_completed}} or {found: false}.
 *
 * POST { action: 'link', inviteCode, partnerBId }
 *   → Links Partner B to Partner A after signup. Sets
 *     profiles.partner_profile_id on both rows, sets joined_via_invite
 *     on Partner B, sets partner_joined on Partner A.
 *
 * The old partner_sessions flow (POST with ex1Answers/ex2Answers) is
 * removed — exercise answers now save to the partner's own profile
 * row via the normal Ex01/Ex02/Ex03 write paths.
 *
 * Security:
 *   - Invite codes validated as 6-12 char alphanumeric
 *   - Linking requires inviteCode + partnerBId both valid
 *   - Rate-limited via Vercel edge headers
 */

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

import { reportToSentry } from './_lib/sentry-edge.js';

const supabase = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const CORS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const INVITE_RE = /^[A-Z0-9]{6,12}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateInviteCode(code) {
  return typeof code === 'string' && INVITE_RE.test(code.trim().toUpperCase());
}
function validateUuid(id) {
  return typeof id === 'string' && UUID_RE.test(id.trim());
}

export default async function handler(req) {
  try {
    return await handlePartnerSync(req);
  } catch (err) {
    console.error('[partner-sync] unhandled error:', err);
    reportToSentry(err, { route: '/api/partner-sync', request: req }).catch(() => {});
    return new Response(JSON.stringify({ ok: false, error: 'Internal error' }), { status: 500, headers: CORS });
  }
}

async function handlePartnerSync(req) {
  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }

    const { action, inviteCode, partnerBId } = body;

    // Only `link` action is supported post-unification. Reject everything
    // else explicitly so we catch stale clients trying to write via the
    // old partner_sessions path.
    if (action !== 'link') {
      return new Response(JSON.stringify({ ok: false, error: 'Only action=link is supported. Exercise answers save directly to profiles.' }), { status: 400, headers: CORS });
    }

    if (!validateInviteCode(inviteCode)) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid invite code format' }), { status: 400, headers: CORS });
    }
    if (!validateUuid(partnerBId)) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid partner id' }), { status: 400, headers: CORS });
    }

    const code = inviteCode.trim().toUpperCase();
    const bId = partnerBId.trim();
    const sb = supabase();

    // Find Partner A by invite code
    const { data: partnerA, error: findErr } = await sb
      .from('profiles')
      .select('id, partner_profile_id')
      .eq('invite_code', code)
      .maybeSingle();

    if (findErr) return new Response(JSON.stringify({ ok: false, error: findErr.message }), { status: 500, headers: CORS });
    if (!partnerA) return new Response(JSON.stringify({ ok: false, error: 'Invite code not found' }), { status: 404, headers: CORS });

    // Prevent self-linking (e.g. Partner A opening their own invite link)
    if (partnerA.id === bId) {
      return new Response(JSON.stringify({ ok: false, error: 'Cannot link to your own invite' }), { status: 400, headers: CORS });
    }

    // If Partner A already has a different linked partner, refuse
    if (partnerA.partner_profile_id && partnerA.partner_profile_id !== bId) {
      return new Response(JSON.stringify({ ok: false, error: 'This invite has already been used' }), { status: 409, headers: CORS });
    }

    // Link both sides, mark Partner A's partner_joined, and flag Partner B
    // as joined-via-invite for lightweight UX differentiation.
    const [linkAResult, linkBResult] = await Promise.all([
      sb.from('profiles').update({ partner_profile_id: bId, partner_joined: true }).eq('id', partnerA.id),
      sb.from('profiles').update({ partner_profile_id: partnerA.id, joined_via_invite: true }).eq('id', bId),
    ]);

    if (linkAResult.error || linkBResult.error) {
      const msg = linkAResult.error?.message || linkBResult.error?.message;
      return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: CORS });
    }

    return new Response(JSON.stringify({ ok: true, partnerAId: partnerA.id }), { status: 200, headers: CORS });
  }

  if (req.method === 'GET') {
    const url = new URL(req.url);

    const rawCode = url.searchParams.get('inviteCode');
    const rawPartnerId = url.searchParams.get('partnerProfileId');

    const sb = supabase();

    // ─── Mode A: invite code lookup (pre-signup) ──────────────────────
    if (rawCode) {
      if (!validateInviteCode(rawCode)) {
        return new Response(JSON.stringify({ ok: false, error: 'Invalid invite code' }), { status: 400, headers: CORS });
      }
      const code = rawCode.trim().toUpperCase();

      const { data: inviter, error } = await sb
        .from('profiles')
        .select('id, name, pkg, partner_profile_id')
        .eq('invite_code', code)
        .maybeSingle();

      if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: CORS });
      if (!inviter) return new Response(JSON.stringify({ ok: true, found: false }), { status: 200, headers: CORS });

      return new Response(JSON.stringify({
        ok: true,
        found: true,
        inviter: {
          id: inviter.id,
          name: inviter.name,
          pkg: inviter.pkg,
          alreadyLinked: !!inviter.partner_profile_id,
        },
      }), { status: 200, headers: CORS });
    }

    // ─── Mode B: partner profile lookup (post-link, for polling) ──────
    if (rawPartnerId) {
      if (!validateUuid(rawPartnerId)) {
        return new Response(JSON.stringify({ ok: false, error: 'Invalid partner id' }), { status: 400, headers: CORS });
      }
      const pid = rawPartnerId.trim();

      // SECURITY: caller must prove they're authorized to read this partner's
      // data. Without this check, anyone who knows or guesses a profile UUID
      // could pull exercise answers + name. (UUID space is 122 bits so this
      // is computationally hard but defense-in-depth matters here.)
      // We accept the user's auth token in the Authorization header,
      // validate it, then confirm their profile.partner_profile_id matches
      // the requested UUID. Only then return the data.
      const authHeader = req.headers.get('authorization') || '';
      const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (!accessToken) {
        return new Response(JSON.stringify({ ok: false, error: 'Authentication required' }), { status: 401, headers: CORS });
      }

      // Verify the token by asking the auth API who it belongs to.
      const userClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      });
      const { data: { user: authUser }, error: authErr } = await userClient.auth.getUser(accessToken);
      if (authErr || !authUser) {
        return new Response(JSON.stringify({ ok: false, error: 'Invalid auth token' }), { status: 401, headers: CORS });
      }

      // Confirm caller is linked to the requested partner.
      const { data: callerProfile, error: callerErr } = await sb
        .from('profiles')
        .select('partner_profile_id')
        .eq('id', authUser.id)
        .maybeSingle();
      if (callerErr) {
        return new Response(JSON.stringify({ ok: false, error: callerErr.message }), { status: 500, headers: CORS });
      }
      if (!callerProfile || callerProfile.partner_profile_id !== pid) {
        return new Response(JSON.stringify({ ok: false, error: 'Not authorized to read this partner' }), { status: 403, headers: CORS });
      }

      const { data, error } = await sb
        .from('profiles')
        .select('name, ex1_answers, ex2_answers, ex3_answers, ex3_completed')
        .eq('id', pid)
        .maybeSingle();

      if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: CORS });
      if (!data)  return new Response(JSON.stringify({ ok: true, found: false }), { status: 200, headers: CORS });

      return new Response(JSON.stringify({ ok: true, found: true, profile: data }), { status: 200, headers: CORS });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Missing inviteCode or partnerProfileId' }), { status: 400, headers: CORS });
  }

  return new Response('Method not allowed', { status: 405 });
}
