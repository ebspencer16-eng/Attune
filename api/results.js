/**
 * GET /api/results
 *
 * The couple's derived results, computed on the server from the answers of
 * record. Authenticated with the caller's Supabase access token.
 *
 * WHY: the native app must not reimplement scoring. If the ten dimensions, the
 * axis weights, the visibility blend and the flipped questions exist in both
 * JavaScript and Swift, they drift, and the drift is invisible until someone
 * notices two products disagreeing about a couple's type. The app asks this
 * endpoint what the results are and renders the answer.
 *
 * It is also the fix for the pattern that has caused most of this month's
 * bugs: the client treating its own cache as the source of truth. This reads
 * profiles, not localStorage.
 *
 * Returns:
 *   200 { ok, ready: true,  results }     both partners have finished
 *   200 { ok, ready: false, reason, self } waiting on someone
 *   401 not signed in or a bad token
 */

export const config = { runtime: 'edge' };

import { coupleResults, personResults } from './_lib/results.js';

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });

export default async function handler(req) {
  if (req.method !== 'GET') return json({ ok: false, error: 'GET only' }, 405);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || serviceKey;
  if (!supabaseUrl || !serviceKey) {
    console.error('[results] missing env');
    return json({ ok: false, error: 'Server not configured' }, 500);
  }

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!accessToken) return json({ ok: false, error: 'missing auth token' }, 401);

  try {
    // Identity comes from the verified token, never from the request body.
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) return json({ ok: false, error: 'invalid auth token' }, 401);
    const user = await userRes.json().catch(() => null);
    if (!user?.id) return json({ ok: false, error: 'invalid auth token' }, 401);

    const svc = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    const cols = 'id,name,ex1_answers,partner_profile_id';
    const meRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=${cols}`, { headers: svc });
    const me = (await meRes.json().catch(() => []))?.[0];
    if (!me) return json({ ok: false, error: 'profile not found' }, 404);

    const mine = me.ex1_answers && Object.keys(me.ex1_answers).length ? me.ex1_answers : null;

    // No partner linked yet: report self-report scoring rather than nothing, so
    // the app can show an interim read while waiting.
    if (!me.partner_profile_id) {
      return json({
        ok: true, ready: false, reason: 'no_partner_linked',
        self: mine ? personResults(mine, null) : null,
      });
    }

    const partRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${me.partner_profile_id}&select=${cols}`, { headers: svc });
    const partner = (await partRes.json().catch(() => []))?.[0];
    const theirs = partner?.ex1_answers && Object.keys(partner.ex1_answers).length ? partner.ex1_answers : null;

    if (!mine || !theirs) {
      return json({
        ok: true, ready: false,
        reason: !mine && !theirs ? 'neither_complete' : (!mine ? 'you_incomplete' : 'partner_incomplete'),
        // Whoever has answered still gets their own read.
        self: mine ? personResults(mine, null) : null,
        partnerName: partner?.name || null,
      });
    }

    const results = coupleResults({
      aAnswers: mine, bAnswers: theirs, aName: me.name || null, bName: partner.name || null,
    });

    return json({ ok: true, ready: true, results });
  } catch (e) {
    console.error('[results] failed:', e);
    return json({ ok: false, error: 'results unavailable' }, 500);
  }
}
