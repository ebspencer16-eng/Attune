/**
 * POST /api/exercise-completed
 *
 * "I have just finished an exercise, and I saved it myself."
 *
 * ── WHY THIS ENDPOINT EXISTS ──────────────────────────────────────────────
 * The app finishes an exercise through /api/save-exercise, which does three
 * things: stores the answers, tells the partner if that was the last one
 * outstanding, and starts the workbook. The website does not go through it.
 * It writes the answers straight to Supabase with the signed-in user's own
 * session, and only falls back to that endpoint when RLS blocks the write.
 *
 * So for every couple who finished on the website, the partner was never told
 * and the workbook was built only if the buyer happened to be the one
 * finishing, in the browser holding their order. Ellie: "make sure workbook
 * begins generating once results are complete."
 *
 * This is the website saying "done" after its own write. It takes no answers
 * and writes none: everything it does is decided by reading the profile rows
 * that are already stored, through api/_lib/completion.js, which is the same
 * function /api/save-exercise calls. One trigger, two ways of finishing.
 *
 * Body: { exercise: 'ex1' | 'ex2' | 'ex3' | 'intimacy' | 'conflict' }
 * Auth: Bearer session token. The id comes from the token and nowhere else.
 */

import { createClient } from '@supabase/supabase-js';

import { jsonBody } from './_lib/http.js';
import { EXERCISES } from './_exercises.js';
import { announceCompletion } from './_lib/completion.js';

export const config = { runtime: 'edge' };

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: HEADERS });

export default async function handler(req) {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY
                   || process.env.SUPABASE_SERVICE_ROLE
                   || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return json(500, { ok: false, error: 'Server not configured' });

  const auth = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return json(401, { ok: false, error: 'Authentication required' });

  const _parsed = await jsonBody(req);
  if (_parsed.error) return _parsed.error;
  const exercise = String(_parsed.body?.exercise || '');
  if (!EXERCISES.some((e) => e.key === exercise)) {
    return json(400, { ok: false, error: 'Unknown exercise' });
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  /* Whose completion this is. From the token, never from the body: the body
     is the one thing a caller controls. */
  const { data: who, error: whoErr } = await admin.auth.getUser(token);
  const userId = who?.user?.id;
  if (whoErr || !userId) return json(401, { ok: false, error: 'Invalid auth token' });

  /* Nothing here fails the caller. The answers are already saved; this is the
     courtesy on the side of that, exactly as it is in /api/save-exercise. */
  try {
    await announceCompletion({ admin, userId, exerciseKey: exercise });
  } catch (e) {
    console.warn('[exercise-completed] completion follow-up failed:', e?.message);
    return json(200, { ok: true, followedUp: false });
  }
  return json(200, { ok: true, followedUp: true });
}
