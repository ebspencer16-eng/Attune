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

    // Find Partner A by invite code (also pull name for the email body)
    const { data: partnerA, error: findErr } = await sb
      .from('profiles')
      .select('id, partner_profile_id, name, pkg, pronouns, partner_email')
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

    // Resolve Partner A's full entitlement so Partner B inherits the same
    // experience. Package is copied onto Partner B's profile below; add-ons
    // live on Partner A's order and are returned for the client to apply.
    let inherited = { pkg: partnerA.pkg || 'core', partnerPronouns: partnerA.pronouns || '', addonReflection: false, addonBudget: false, addonLmft: false, addonWorkbook: '', addonIntimacy: false };
    try {
      const { data: aOrder } = await sb.from('orders')
        .select('addon_reflection, addon_budget, addon_lmft, addon_workbook, addon_intimacy')
        .eq('user_id', partnerA.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (aOrder) {
        inherited.addonReflection = !!aOrder.addon_reflection;
        inherited.addonBudget     = !!aOrder.addon_budget;
        inherited.addonLmft       = !!aOrder.addon_lmft;
        inherited.addonIntimacy   = !!aOrder.addon_intimacy;
        inherited.addonWorkbook   = aOrder.addon_workbook || '';
      }
    } catch (e) { console.warn('[partner-sync] addon inherit lookup failed:', e); }

    // Link both sides, mark Partner A's partner_joined, and flag Partner B
    // as joined-via-invite for lightweight UX differentiation.
    const [linkAResult, linkBResult] = await Promise.all([
      sb.from('profiles').update({ partner_profile_id: bId, partner_joined: true }).eq('id', partnerA.id),
      sb.from('profiles').update({ partner_profile_id: partnerA.id, joined_via_invite: true, pkg: inherited.pkg }).eq('id', bId),
    ]);

    if (linkAResult.error || linkBResult.error) {
      const msg = linkAResult.error?.message || linkBResult.error?.message;
      return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: CORS });
    }

    // Best-effort: persist Partner A's add-on flags on Partner B's profile so
    // they survive a cross-device reload (add-ons otherwise live only on the
    // buyer's order). Safe before migration 016 has run: a missing-column error
    // is logged and ignored, and never blocks the link.
    const { error: addonErr } = await sb.from('profiles').update({
      addon_reflection: inherited.addonReflection,
      addon_budget:     inherited.addonBudget,
      addon_lmft:       inherited.addonLmft,
      addon_intimacy:   inherited.addonIntimacy,
      addon_workbook:   inherited.addonWorkbook,
    }).eq('id', bId);
    if (addonErr) console.warn('[partner-sync] add-on persist skipped (migration 016 not run yet?):', addonErr.message);

    // Exchange pronouns so each partner's profile knows the other's. Each
    // person's own `pronouns` is the source of truth; copy it onto the other's
    // `partner_pronouns`. The dashboard and results copy read this to refer to
    // the partner correctly ("when Sarah finishes hers"). Guard on a non-empty
    // source so we never blank out a value entered during setup. Best-effort:
    // a failure here never blocks the link.
    try {
      const { data: bProfile } = await sb.from('profiles').select('pronouns').eq('id', bId).maybeSingle();
      const aPronouns = (partnerA.pronouns || '').trim();
      const bPronouns = (bProfile?.pronouns || '').trim();
      const pronounUpdates = [];
      if (aPronouns) pronounUpdates.push(sb.from('profiles').update({ partner_pronouns: aPronouns }).eq('id', bId));
      if (bPronouns) pronounUpdates.push(sb.from('profiles').update({ partner_pronouns: bPronouns }).eq('id', partnerA.id));
      if (pronounUpdates.length) {
        const pres = await Promise.all(pronounUpdates);
        const pErr = pres.find(r => r.error);
        if (pErr) console.warn('[partner-sync] pronoun exchange skipped:', pErr.error.message);
      }
    } catch (e) { console.warn('[partner-sync] pronoun exchange failed:', e); }

    // Notify Partner A that Partner B just signed up (Issue 4.9).
    // Previously this fired when Partner B FINISHED their exercises, which
    // didn't match the email body ("X just created their account").
    // Best-effort — failure here doesn't fail the link operation.
    try {
      // Partner A's email lives in auth.users, not profiles. Use the admin API.
      const { data: authA } = await sb.auth.admin.getUserById(partnerA.id);
      const partnerAEmail = authA?.user?.email;
      const partnerAName  = partnerA.name || authA?.user?.user_metadata?.name || 'there';

      // Partner B's name comes from auth.users (set during sign-up).
      const { data: authB } = await sb.auth.admin.getUserById(bId);
      const partnerBName = authB?.user?.user_metadata?.name || 'Your partner';

      // Respect Partner A's email_opt_in preference
      const { data: partnerAProfile } = await sb.from('profiles')
        .select('email_opt_in').eq('id', partnerA.id).maybeSingle();
      const optedOut = partnerAProfile && partnerAProfile.email_opt_in === false;

      if (partnerAEmail && !optedOut) {
        // Fire-and-forget. We don't await on the response — link should
        // return promptly so the client can navigate.
        const siteUrl = process.env.SITE_URL || 'https://attune-relationships.com';
        fetch(`${siteUrl}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'partner_joined_notification',
            userId: partnerA.id,
            toEmail: partnerAEmail,
            toName: partnerAName,
            partnerName: partnerBName,
            portalUrl: `${siteUrl}/app`,
          }),
        }).catch(e => console.warn('[partner-sync] notify partner_joined failed:', e));
      }
    } catch (e) {
      console.warn('[partner-sync] partner_joined notification setup failed:', e);
    }

    // The invite email was delivered to the address Partner A entered. If
    // Partner B signed up with that same address, following the invite link
    // already demonstrates control of that inbox, so confirm the email now.
    // This gives Partner B an authenticated session immediately and removes
    // the unauthenticated-exercise window that made saves fragile.
    let emailConfirmed = false;
    try {
      const { data: bAuth } = await sb.auth.admin.getUserById(bId);
      const bEmail = (bAuth?.user?.email || '').trim().toLowerCase();
      const invitedEmail = (partnerA.partner_email || '').trim().toLowerCase();
      if (bAuth?.user?.email_confirmed_at) {
        emailConfirmed = true;
      } else if (bEmail && invitedEmail && bEmail === invitedEmail) {
        const { error: confErr } = await sb.auth.admin.updateUserById(bId, { email_confirm: true });
        if (confErr) console.warn('[partner-sync] auto-confirm failed:', confErr.message);
        else emailConfirmed = true;
      }
    } catch (e) { console.warn('[partner-sync] auto-confirm skipped:', e); }

    return new Response(JSON.stringify({ ok: true, partnerAId: partnerA.id, inherited, emailConfirmed }), { status: 200, headers: CORS });
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
        .select('name, pronouns, ex1_answers, ex2_answers, ex3_answers, ex3_completed, relationship_status, joined_via_invite, intimacy_data')
        .eq('id', pid)
        .maybeSingle();

      if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: CORS });
      if (!data)  return new Response(JSON.stringify({ ok: true, found: false }), { status: 200, headers: CORS });

      // Inherit the buyer's order addons so the invitee's device can rebuild
      // the couple-level order (workbook readiness, reflection, budget, lmft)
      // on every poll. The invitee never placed the order, so without this
      // they never see the workbook and lose order state across logout/login.
      let inherited = { addonReflection: false, addonBudget: false, addonLmft: false, addonWorkbook: '', addonIntimacy: false, workbookStatus: null };
      try {
        const { data: aOrder } = await sb
          .from('orders')
          .select('addon_reflection, addon_budget, addon_lmft, addon_workbook, addon_intimacy, workbook_status')
          .eq('user_id', pid)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (aOrder) {
          inherited.addonReflection = !!aOrder.addon_reflection;
          inherited.addonBudget     = !!aOrder.addon_budget;
          inherited.addonLmft       = !!aOrder.addon_lmft;
          inherited.addonIntimacy   = !!aOrder.addon_intimacy;
          inherited.addonWorkbook   = aOrder.addon_workbook || '';
          inherited.workbookStatus  = aOrder.workbook_status || null;
        }
      } catch (e) { console.warn('[partner-sync] Mode B addon inherit failed:', e); }

      return new Response(JSON.stringify({ ok: true, found: true, profile: data, inherited }), { status: 200, headers: CORS });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Missing inviteCode or partnerProfileId' }), { status: 400, headers: CORS });
  }

  return new Response('Method not allowed', { status: 405 });
}
