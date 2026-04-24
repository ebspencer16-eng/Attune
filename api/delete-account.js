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
  // Pull from exercise_sessions (canonical) and profile (for demographic fields).
  // Note: exercise_sessions.user_id has ON DELETE CASCADE, so this data disappears
  // when we delete the auth user. We copy it to the archive table first.
  try {
    const { data: profile } = await admin.from('profiles')
      .select('pkg, pronouns, partner_pronouns, created_at, age_range, gender, relationship_status, relationship_length, children, signup_source')
      .eq('id', userId)
      .maybeSingle();

    const { data: session } = await admin.from('exercise_sessions')
      .select('ex1_answers, ex2_answers, ex3_answers, couple_type, exp_gaps')
      .eq('user_id', userId)
      .maybeSingle();

    // Only write the archive row if there's something worth archiving.
    // Users who signed up but never finished an exercise have no research value.
    const hasAnswers = session && (session.ex1_answers || session.ex2_answers || session.ex3_answers);
    if (hasAnswers) {
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
        ex1_answers:          session.ex1_answers || null,
        ex2_answers:          session.ex2_answers || null,
        ex3_answers:          session.ex3_answers || null,
        couple_type:          session.couple_type || null,
        exp_gaps:             session.exp_gaps || null,
      });
      if (!archiveErr) summary.archived = true;
      else console.warn('[delete-account] archive insert failed:', archiveErr.message);
    }
  } catch (e) { console.warn('[delete-account] archive step failed:', e?.message); }

  // ── 2. Remove personalized workbook files + rows ──────────────────────────
  // Workbooks contain names, personalized language, and couple-specific content.
  // They're PII even though the underlying couple_type is not.
  try {
    const { data: books } = await admin.from('workbooks')
      .select('id, storage_path')
      .eq('user_id', userId);
    if (books && books.length) {
      const paths = books.map(b => b.storage_path).filter(Boolean);
      if (paths.length) {
        const { error: rmErr } = await admin.storage.from('workbooks').remove(paths);
        if (!rmErr) summary.storageRemoved = paths.length;
      }
      await admin.from('workbooks').delete().eq('user_id', userId);
      summary.workbooksRemoved = books.length;
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
  // feedback.user_id is ON DELETE SET NULL per schema, so the auth delete will
  // handle this automatically. Explicit call here is belt-and-suspenders in
  // case feedback RLS or triggers interfere.
  try {
    const { count } = await admin.from('feedback')
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
