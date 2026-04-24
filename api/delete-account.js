/**
 * /api/delete-account
 *
 * POST { userId }   (Authorization: Bearer <user access token>)
 *   → Verifies the token belongs to userId, then cascade-deletes everything:
 *     workbooks (storage + rows), partner_sessions (where user is Partner A or B),
 *     orders, feedback, profile, and finally the auth user itself.
 *
 * Uses SUPABASE_SERVICE_KEY so it can:
 *   - delete auth users (requires service role)
 *   - remove Storage objects in the workbooks bucket
 *
 * Foreign keys on most tables are ON DELETE CASCADE, but we run the deletes
 * explicitly so that (a) we can also clean up Storage and (b) partner_sessions
 * that reference the user only by invite_code (not FK) are handled.
 */

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

const JSON_HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const err = (status, message) => new Response(JSON.stringify({ ok: false, error: message }), { status, headers: JSON_HEADERS });
const ok  = (body)            => new Response(JSON.stringify({ ok: true, ...body }),         { status: 200, headers: JSON_HEADERS });

export default async function handler(req) {
  if (req.method !== 'POST') return err(405, 'Method not allowed');

  // Admin client (service role). Required for auth.admin.* + Storage writes
  // that bypass RLS.
  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // ── Verify the caller actually owns the account they're asking to delete ──
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

  const cleanup = { workbooksRemoved: 0, storageRemoved: 0, partnerSessionsRemoved: 0, ordersRemoved: 0, feedbackRemoved: 0 };

  // ── 1. Workbooks: fetch storage paths, then remove files + rows ────────
  // Must happen before auth.users delete because the FK is ON DELETE CASCADE;
  // we want to remove Storage objects first so we don't orphan them.
  try {
    const { data: books } = await admin.from('workbooks')
      .select('id, storage_path')
      .eq('user_id', userId);
    if (books && books.length) {
      const paths = books.map(b => b.storage_path).filter(Boolean);
      if (paths.length) {
        const { error: rmErr } = await admin.storage.from('workbooks').remove(paths);
        if (!rmErr) cleanup.storageRemoved = paths.length;
      }
      await admin.from('workbooks').delete().eq('user_id', userId);
      cleanup.workbooksRemoved = books.length;
    }
  } catch (e) { console.warn('[delete-account] workbook cleanup failed:', e?.message); }

  // ── 2. Partner sessions: user may appear as Partner A (via invite_code on
  //      their profile) or as Partner B (via partner_b_id). Clean both. ────
  try {
    const { data: profile } = await admin.from('profiles')
      .select('invite_code')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.invite_code) {
      const { count } = await admin.from('partner_sessions')
        .delete({ count: 'exact' })
        .eq('invite_code', profile.invite_code);
      cleanup.partnerSessionsRemoved += count || 0;
    }

    const { count: bCount } = await admin.from('partner_sessions')
      .delete({ count: 'exact' })
      .eq('partner_b_id', userId);
    cleanup.partnerSessionsRemoved += bCount || 0;
  } catch (e) { console.warn('[delete-account] partner_sessions cleanup failed:', e?.message); }

  // ── 3. Orders ─────────────────────────────────────────────────────────
  try {
    const { count } = await admin.from('orders')
      .delete({ count: 'exact' })
      .eq('user_id', userId);
    cleanup.ordersRemoved = count || 0;
  } catch (e) { console.warn('[delete-account] orders cleanup failed:', e?.message); }

  // ── 4. Feedback ───────────────────────────────────────────────────────
  try {
    const { count } = await admin.from('feedback')
      .delete({ count: 'exact' })
      .eq('user_id', userId);
    cleanup.feedbackRemoved = count || 0;
  } catch (e) { console.warn('[delete-account] feedback cleanup failed:', e?.message); }

  // ── 5. Profile ────────────────────────────────────────────────────────
  try { await admin.from('profiles').delete().eq('id', userId); }
  catch (e) { console.warn('[delete-account] profile cleanup failed:', e?.message); }

  // ── 6. Auth user (final step — cascades anything we missed) ───────────
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) return err(500, 'Failed to delete auth user: ' + delErr.message);

  return ok({ cleanup });
}
