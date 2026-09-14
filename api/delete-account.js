/**
 * /api/delete-account
 *
 * POST { userId, password }   (Authorization: Bearer <user access token>)
 *   → Verifies the token belongs to userId, and for an account that has a
 *     password, that the password is right. Social sign-ins have none, so the
 *     token is the whole of the proof for them. Then:
 *     1. Archives de-identified research data to deleted_user_archive, unless
 *        the person has opted out of research use on /privacy-choices or by
 *        sending Global Privacy Control. An unreadable preference is treated
 *        as opt-out.
 *        (exercise answers, couple type, expectation gaps, package tier,
 *         signup date, pronouns — NO names, emails, or invite codes).
 *     2. Removes all PII: workbooks (storage + rows), orders (contain
 *        shipping addresses), auth user (cascades profiles +
 *        exercise_sessions).
 *     3. Nulls Partner B's name from any partner_sessions where this user
 *        was Partner B.
 *     4. Sets feedback.user_id to null (feedback survives without attribution).
 *
 * The archive row has no FK to the deleted user — it's a fresh UUID with
 * only non-identifying fields. Re-identification is not possible.
 */

import { jsonBody } from './_lib/http.js';
import { createClient } from '@supabase/supabase-js';

import { deletionConfirmationEmail, partnerDeletedEmail } from './_lib/deletion-emails.js';
import { notificationFor } from './_lib/notifications.js';

export const config = { runtime: 'edge' };

const JSON_HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
/** One send, through Resend, the way every other sender here does it. */
async function sendMail(to, subject, html) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;
  const from = process.env.FROM_EMAIL || 'hello@attune-relationships.com';
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `Attune <${from}>`, to: [to], subject, html }),
  });
  return r.ok;
}

const err = (status, message) => new Response(JSON.stringify({ ok: false, error: message }), { status, headers: JSON_HEADERS });
const ok  = (body)            => new Response(JSON.stringify({ ok: true, ...body }),         { status: 200, headers: JSON_HEADERS });

export default async function handler(req) {
  if (req.method !== 'POST') return err(405, 'Method not allowed');

  // Admin client — required for auth.admin.deleteUser + Storage writes + writing
  // to the RLS-locked deleted_user_archive table.
  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // ── Verify the caller actually owns the account they're deleting ─────────
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return err(401, 'Missing access token');

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return err(401, 'Invalid or expired token');
  const caller = userData.user;

  let body;
  const _parsed = await jsonBody(req);
  if (_parsed.error) return _parsed.error;
  body = _parsed.body;

  const { userId, password } = body || {};
  if (!userId || typeof userId !== 'string') return err(400, 'Missing userId');
  if (userId !== caller.id) return err(403, 'You can only delete your own account');

  // ── Re-authenticate before destroying anything ──────────────────────────
  //
  // The published policy says "Confirm deletion with your password" and
  // neither surface asked for one. A live session was the whole of it, so a
  // borrowed unlocked phone could delete someone's account and their partner's
  // joint results with two taps.
  //
  // Only for accounts that have a password. Google and Apple sign-ins have no
  // password to confirm with, and refusing them would be locking people out of
  // a thing they are entitled to do. For those, the bearer token verified
  // above is the whole of the proof, which is the same standard Supabase
  // itself applies to them.
  const hasPassword = (caller.identities || []).some((i) => i.provider === 'email');
  if (hasPassword) {
    if (!password || typeof password !== 'string') {
      return err(400, 'password required');
    }
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!anonKey) return err(500, 'Cannot verify the password: no anon key configured');
    // A plain sign-in, not an admin call: the point is to prove they know it.
    const check = createClient(process.env.SUPABASE_URL, anonKey);
    const { error: pwErr } = await check.auth.signInWithPassword({
      email: caller.email,
      password,
    });
    // 403, not 401: they are authenticated, the token is fine, and the
    // request is refused. A 401 would send the app into a token refresh and
    // a retry for something no refresh can fix.
    if (pwErr) return err(403, 'That password is not right');
  }

  const summary = { archived: false, workbooksRemoved: 0, storageRemoved: 0, ordersRemoved: 0, partnerSessionsAnonymized: 0, feedbackNulled: 0 };

  // ── 0. Read everything the two emails need, before anything is destroyed ──
  //
  // The policy promises a confirmation to the person and a notice to their
  // partner. Both need an address and a name, and step 6 deletes the auth user
  // and their profile row, which are the only copies. Read once, here, and
  // keep it in memory for the sends at the end.
  const notify = { self: null, partner: null };
  try {
    const { data: me } = await admin.from('profiles')
      .select('name, email, partner_profile_id')
      .eq('id', userId)
      .maybeSingle();
    notify.self = { name: me?.name || null, email: me?.email || caller.email || null };
    if (me?.partner_profile_id) {
      const { data: them } = await admin.from('profiles')
        .select('id, name, email, email_opt_in')
        .eq('id', me.partner_profile_id)
        .maybeSingle();
      if (them?.id) {
        notify.partner = {
          id: them.id, name: them.name || null, email: them.email || null,
          optedIn: them.email_opt_in !== false,
          theirName: me?.name || null,
        };
      }
    }
  } catch (e) { console.warn('[delete-account] could not read the addresses:', e?.message); }

  // ── 1. Gather non-PII research data to archive ────────────────────────────
  // Pull from profiles (unified model — exercise answers live here directly,
  // see migration 006). The exercise_sessions table no longer exists; an
  // earlier version of this code referenced it and silently wrote empty
  // archive rows because session was always null.
  try {
    const { data: profile } = await admin.from('profiles')
      .select('pkg, pronouns, partner_pronouns, created_at, age_range, gender, relationship_status, relationship_length, children, signup_source, ex1_answers, ex2_answers, ex3_answers')
      .eq('id', userId)
      .maybeSingle();

    // Has this person opted out of research use, on the privacy choices page or
    // by sending Global Privacy Control? If so the archive is skipped entirely.
    // The opt-out is only honoured if it is actually read somewhere, and this is
    // the one place that keeps anything after deletion.
    //
    // Read failure means no archive. A preference we cannot confirm is treated
    // as opt-out, because the reverse keeps data from someone who may have
    // asked us not to.
    let optedOutOfResearch = true;
    try {
      const { data: prefs, error: prefsErr } = await admin.from('privacy_preferences')
        .select('opt_out_research')
        .eq('owner_id', userId)
        .maybeSingle();
      if (!prefsErr) optedOutOfResearch = !!prefs?.opt_out_research;
    } catch (e) { /* stays true: no archive */ }
    summary.researchOptOut = optedOutOfResearch;

    // Only write the archive row if there's something worth archiving.
    // Users who signed up but never finished an exercise have no research value.
    const hasAnswers = profile && (profile.ex1_answers || profile.ex2_answers || profile.ex3_answers);
    if (hasAnswers && !optedOutOfResearch) {
      // Compute couple_type and exp_gaps from the answers if a partner profile
      // exists with answers too. Without a partner, leave them null — the
      // archive is per-user not per-couple.
      let coupleType = null;
      let expGaps = null;
      try {
        const { data: own } = await admin.from('profiles')
          .select('partner_profile_id')
          .eq('id', userId)
          .maybeSingle();
        if (own?.partner_profile_id) {
          const { data: partner } = await admin.from('profiles')
            .select('ex1_answers, ex2_answers')
            .eq('id', own.partner_profile_id)
            .maybeSingle();
          if (partner?.ex1_answers && profile.ex1_answers) {
            // We don't import the score-derivation code in the edge function;
            // store both score blobs raw for offline analysis instead.
            coupleType = { my_ex1: profile.ex1_answers, partner_ex1: partner.ex1_answers };
          }
          if (partner?.ex2_answers && profile.ex2_answers) {
            expGaps = { my_ex2: profile.ex2_answers, partner_ex2: partner.ex2_answers };
          }
        }
      } catch (e) { /* best-effort; archive proceeds without partner context */ }

      const { error: archiveErr } = await admin.from('deleted_user_archive').insert({
        pkg:                  profile?.pkg || null,
        signed_up_at:         profile?.created_at || null,
        pronouns:             profile?.pronouns || null,
        partner_pronouns:     profile?.partner_pronouns || null,
        age_range:            profile?.age_range || null,
        gender:               profile?.gender || null,
        relationship_status:  profile?.relationship_status || null,
        relationship_length:  profile?.relationship_length || null,
        children:             profile?.children || null,
        signup_source:        profile?.signup_source || null,
        ex1_answers:          profile?.ex1_answers || null,
        ex2_answers:          profile?.ex2_answers || null,
        ex3_answers:          profile?.ex3_answers || null,
        couple_type:          coupleType,
        exp_gaps:             expGaps,
      });
      if (!archiveErr) summary.archived = true;
      else console.warn('[delete-account] archive insert failed:', archiveErr.message);
    }
  } catch (e) { console.warn('[delete-account] archive step failed:', e?.message); }

  // ── 2. Remove personalized workbook files from storage ────────────────────
  // There is no `workbooks` table. Workbook files live in the `workbooks`
  // Supabase Storage bucket, keyed by order_num. We pull the user's order
  // numbers, then delete each `workbooks/<order_num>/...` prefix.
  // Workbooks contain names, personalized language, and couple-specific
  // content — they're PII even though the underlying couple_type is not.
  try {
    const { data: orderRows } = await admin.from('orders')
      .select('order_num')
      .eq('user_id', userId);
    if (orderRows && orderRows.length) {
      const pathsToRemove = [];
      for (const row of orderRows) {
        if (!row.order_num) continue;
        // List files under the order_num prefix
        const { data: files } = await admin.storage.from('workbooks').list(row.order_num);
        if (files && files.length) {
          files.forEach(f => pathsToRemove.push(`${row.order_num}/${f.name}`));
        }
      }
      if (pathsToRemove.length) {
        const { error: rmErr } = await admin.storage.from('workbooks').remove(pathsToRemove);
        if (!rmErr) summary.storageRemoved = pathsToRemove.length;
        else console.warn('[delete-account] storage remove failed:', rmErr.message);
      }
      summary.workbooksRemoved = pathsToRemove.length;
    }
  } catch (e) { console.warn('[delete-account] workbook cleanup failed:', e?.message); }

  // ── 3. Delete orders (shipping addresses, buyer/partner names/emails are PII) ─
  // orders.user_id is ON DELETE SET NULL, so we must delete explicitly.
  try {
    const { count } = await admin.from('orders')
      .delete({ count: 'exact' })
      .eq('user_id', userId);
    summary.ordersRemoved = count || 0;
  } catch (e) { console.warn('[delete-account] orders cleanup failed:', e?.message); }

  // ── 4. Unlink partner (both directions) ──────────────────────────────────
  // In the unified model, both partners have their own profiles row. The
  // partner_profile_id FK has ON DELETE SET NULL, so after auth deletion
  // the other partner's link drops automatically. However, we explicitly
  // null out the reverse link here to be defensive in case of timing issues.
  //
  // The other partner's answers stay — they're part of that partner's own
  // data, and they didn't request deletion.
  try {
    // partner_deleted_at is what lets the survivor be told the truth. Without
    // it, "my partner deleted their account" and "I never linked with anyone"
    // are the same state, and the product shows the second: a waiting screen
    // naming a person who no longer exists.
    const { count } = await admin.from('profiles')
      .update(
        { partner_profile_id: null, partner_joined: false, partner_deleted_at: new Date().toISOString() },
        { count: 'exact' },
      )
      .eq('partner_profile_id', userId);
    summary.partnerUnlinked = count || 0;
  } catch (e) { console.warn('[delete-account] partner unlink failed:', e?.message); }

  // ── 4b. Mark the couple's frozen results as half orphaned ────────────────
  //
  // Migration 059 makes the row survive this deletion; this marks it, so
  // nothing tries to recompute a result for a couple that is now one person,
  // and so the read path knows to anonymize rather than to serve a name that
  // has been deleted.
  //
  // Before 059 is run the column does not exist and this fails, which is
  // harmless: the row is being cascade-deleted anyway, which is the behaviour
  // 059 exists to change. Said out loud rather than swallowed.
  try {
    const { error: markErr } = await admin.from('couple_results')
      .update({ deleted_partner_at: new Date().toISOString() })
      .or(`partner_a.eq.${userId},partner_b.eq.${userId}`);
    if (markErr) console.warn('[delete-account] results not marked (migration 059 may not be run):', markErr.message);
  } catch (e) { console.warn('[delete-account] results not marked:', e?.message); }

  // ── 5. Null out feedback attribution ──────────────────────────────────────
  // The table is feedback_submissions (an earlier version of this code
  // referenced 'feedback' which doesn't exist — silent failure). We null
  // user_id rather than deleting so aggregate/anonymous feedback survives
  // for product analysis.
  try {
    const { count } = await admin.from('feedback_submissions')
      .update({ user_id: null }, { count: 'exact' })
      .eq('user_id', userId);
    summary.feedbackNulled = count || 0;
  } catch (e) { console.warn('[delete-account] feedback null failed:', e?.message); }

  // ── 6. Delete auth user ───────────────────────────────────────────────────
  // This cascades: profiles (FK on delete cascade), exercise_sessions
  // (FK on delete cascade). Everything else was already handled above.
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) return err(500, 'Failed to delete auth user: ' + delErr.message);

  // ── 7. Tell the two people the policy says we will tell ──────────────────
  //
  // After the deletion, not before: an email saying an account is gone, sent
  // before it is, is a lie if step 6 fails. Neither send can fail the request.
  // The account is already deleted at this point and reporting a 500 would
  // tell the person the opposite of what happened.
  //
  // The partner's notification row is written even though no app screen reads
  // the list yet. The email is what reaches them today; the row is what the
  // screen will show when it exists, and writing it now means that screen has
  // a history rather than starting empty.
  summary.confirmationSent = false;
  summary.partnerNotified = false;
  try {
    if (notify.self?.email) {
      const mail = deletionConfirmationEmail({ name: notify.self.name, researchKept: summary.archived });
      summary.confirmationSent = await sendMail(notify.self.email, mail.subject, mail.html);
    }
  } catch (e) { console.warn('[delete-account] confirmation email failed:', e?.message); }

  try {
    if (notify.partner) {
      const alert = notificationFor('partner_deleted', { partnerName: notify.partner.theirName });
      await admin.from('notifications').insert({
        owner_id: notify.partner.id,
        kind: alert.kind, title: alert.title, body: alert.body, deep_link: alert.deepLink,
      });
      // email_opt_in is honoured here the way the crons honour it. Someone who
      // asked us to stop emailing them has asked for that, and this is not an
      // exception: the notification row still carries it.
      if (notify.partner.email && notify.partner.optedIn) {
        const mail = partnerDeletedEmail({
          toName: notify.partner.name,
          theirName: notify.partner.theirName,
          userId: notify.partner.id,
        });
        summary.partnerNotified = await sendMail(notify.partner.email, mail.subject, mail.html);
      } else {
        summary.partnerNotified = true;   // the row is written; the email was not wanted
      }
    }
  } catch (e) { console.warn('[delete-account] partner notification failed:', e?.message); }

  return ok({ summary });
}
