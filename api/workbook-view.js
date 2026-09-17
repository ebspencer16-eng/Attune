/**
 * What the workbook page needs to draw itself, for this couple.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * Ellie: "This does not look like the workbook we render on the site. Please
 * use the exact same pdf builder."
 *
 * She was right, and the thing I had built was the mistake this codebase is
 * organised against: a second renderer. The website's workbook is
 * public/workbook-render.html, a designed page the site hands a payload to and
 * prints, and it has been there the whole time. This endpoint hands the app the
 * same payload, so the app opens the same page.
 *
 * ── WHAT IT DOES NOT DO ───────────────────────────────────────────────────
 * It does not render or store anything. The page does the drawing and the
 * phone does the printing, which is what makes this the same workbook rather
 * than a second one that looks similar for a while.
 */

export const config = { runtime: 'edge' };

import { payloadForCouple } from './_lib/workbook-couple.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

export default async function handler(req) {
  if (req.method !== 'GET') return json({ ok: false, error: 'GET only' }, 405);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || serviceKey;
  if (!supabaseUrl || !serviceKey) return json({ ok: false, error: 'Server not configured' }, 500);

  const token = (req.headers.get('authorization') || req.headers.get('Authorization') || '')
    .replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ ok: false, error: 'missing auth token' }, 401);

  try {
    const uRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    });
    if (!uRes.ok) return json({ ok: false, error: 'invalid auth token' }, 401);
    const user = await uRes.json().catch(() => null);
    if (!user?.id) return json({ ok: false, error: 'invalid auth token' }, 401);

    const built = await payloadForCouple({ supabaseUrl, serviceKey, userId: user.id });
    if (!built) {
      // Not enough answered yet. The tile says what is happening; this is not
      // an error and should not be drawn as one.
      return json({ ok: false, notReady: true, error: 'the workbook needs both of you to have finished' }, 409);
    }

    /**
     * The page's own parameter names, which are short because they travel in
     * a URL. The website builds this object in src/App.jsx from the same
     * payload; keeping the two in step is what check-workbook-view.mjs is for.
     */
    return json({
      ok: true,
      data: {
        p1: built.userName,
        p2: built.partnerName,
        ct: built.coupleType?.name || '',
        ctTagline: built.coupleType?.tagline || '',
        ctColor: built.coupleType?.color || '#E8673A',
        scores: built.scores,
        partnerScores: built.partnerScores,
        expGaps: built.expGaps,
      },
    });
  } catch (e) {
    console.error('[workbook-view]', e?.message);
    return json({ ok: false, error: 'could not build the workbook view' }, 500);
  }
}
