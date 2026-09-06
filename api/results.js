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

import { DIM_META } from './_workbook-content.js';
import { personResults } from './_lib/results.js';
import { getOrComputeResults } from './_lib/results-store.js';

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });

/**
 * Attach customer-facing dimension names to a results payload.
 *
 * Non-destructive and tolerant of a payload that predates rankedGaps entirely,
 * because these rows were written by older versions of this engine and a read
 * path that assumes the current shape will throw on the oldest couples.
 */
function withLabels(results) {
  if (!results || !Array.isArray(results.rankedGaps)) return results;
  return {
    ...results,
    rankedGaps: results.rankedGaps.map(g => ({
      ...g,
      label: g.label || DIM_META[g.dim]?.label || g.dim,
    })),
  };
}

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

    // Results are frozen. A stored row is served back whatever engine version
    // it was computed under, so changing the weights, the questions or the
    // prose never changes what an existing couple sees. Only a retake
    // recomputes, and the previous row is archived first so notes written
    // against it still resolve.
    const table = `${supabaseUrl}/rest/v1/couple_results`;
    const db = {
      read: async (a, b) => {
        const r = await fetch(`${table}?partner_a=eq.${a}&partner_b=eq.${b}&select=*`, { headers: svc });
        if (!r.ok) return null;
        return (await r.json().catch(() => []))?.[0] || null;
      },
      archive: async (row) => {
        await fetch(`${supabaseUrl}/rest/v1/couple_results_history`, {
          method: 'POST',
          headers: { ...svc, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({
            partner_a: row.partner_a, partner_b: row.partner_b,
            version: row.version, couple_type: row.couple_type,
            results: row.results, answers_hash: row.answers_hash,
            content_version: row.content_version ?? null,
            frozen_at: row.frozen_at || row.computed_at || new Date().toISOString(),
          }),
        });
      },
      write: async (row) => {
        const r = await fetch(`${table}?on_conflict=partner_a,partner_b`, {
          method: 'POST',
          headers: { ...svc, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(row),
        });
        if (!r.ok) throw new Error(`upsert ${r.status}`);
      },
    };

    const { results, cached, reason, frozenAt, computedUnderVersion, contentVersion, stale } = await getOrComputeResults({
      db,
      aId: me.id, bId: partner.id,
      aAnswers: mine, bAnswers: theirs,
      aName: me.name || null, bName: partner.name || null,
    });
    if (!results) return json({ ok: true, ready: false, reason: 'neither_complete' });

    return json({
      ok: true, ready: true, cached, recomputed: reason,
      // Labels are applied on the way out, not baked into the stored blob.
      //
      // Results are frozen: once a couple's row exists it is served back as it
      // was written, which is the whole point of freezing them. So adding a
      // display label at compute time reaches new couples only, and every
      // existing couple keeps reading raw dimension keys forever.
      //
      // Scores are frozen. Names for things are not, and should follow the
      // current copy rather than whatever was current the day the couple
      // finished.
      results: withLabels(results),
      // frozenAt is when these results were fixed. computedUnderVersion is the
      // engine that produced them, which may be older than the current one:
      // that is the point, not a problem.
      frozenAt: frozenAt || null,
      computedUnderVersion: computedUnderVersion ?? null,
      // Which copy to render this couple's results from. The client must honour
      // this rather than using whatever the current copy library says.
      contentVersion: contentVersion ?? null,
      olderEngine: !!stale,
    });
  } catch (e) {
    console.error('[results] failed:', e);
    return json({ ok: false, error: 'results unavailable' }, 500);
  }
}
