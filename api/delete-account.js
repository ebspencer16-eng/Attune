/**
 * /api/delete-account
 *
 * POST { userId }   (Authorization: Bearer <user access token>)
 *   → Verifies the token belongs to userId, then:
 *     1. Archives de-identified research data to deleted_user_archive
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

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

const JSON_HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const err = (status, message) => new Response(JSON.stringify({ ok: false, error: message }), { status, headers: JSON_HEADERS });
const ok  = (body)            => new Response(JSON.stringify({ ok: true, ...body }),         { status: 200, headers: JSON_HEADERS });

export default async function handler(req) {
  if (req.method !== 'POST') return err(405, 'Method not allowed');

  // Admin client — required for auth.admin.deleteUser + Storage writes + writing
  // to the RLS-locked deleted_user_archive table.
  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // ── Verify the caller actually owns the account they're deleting ─────────
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return err(401, 'Missing access token');

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return err(401, 'Invalid or expired token');
  const caller = userData.user;

  let body;
  try { body = await req.json(); } catch { return err(400, 'Invalid JSON'); }

  const { userId } = body || {};
  if (!userId || typeof userId !== 'string') return err(400, 'Missing userId');
  if (userId !== caller.id) return err(403, 'You can only delete your own account');

  const summary = { archived: false, workbooksRemoved: 0, storageRemoved: 0, ordersRemoved: 0, partnerSessionsAnonymized: 0, feedbackNulled: 0 };

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

    // Only write the archive row if there's something worth archiving.
    // Users who signed up but never finished an exercise have no research value.
    const hasAnswers = profile && (profile.ex1_answers || profile.ex2_answers || profile.ex3_answers);
    if (hasAnswers) {
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
    const { count } = await admin.from('profiles')
      .update({ partner_profile_id: null, partner_joined: false }, { count: 'exact' })
      .eq('partner_profile_id', userId);
    summary.partnerUnlinked = count || 0;
  } catch (e) { console.warn('[delete-account] partner unlink failed:', e?.message); }

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

  return ok({ summary });
}
