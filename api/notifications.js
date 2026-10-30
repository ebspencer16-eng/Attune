import { jsonBody } from './_lib/http.js';
import { userForRequest } from './_lib/verify-token.js';
/**
 * /api/notifications
 *
 *   GET                      the person's alerts, newest first, plus unread count
 *   POST { action:'read' }   mark one read, or all with { all: true }
 *
 * Reads what api/_lib/notifications.js decided to record. That module answers
 * "should this be pushed"; this one answers "what should the list show", and
 * those are different questions: a push suppressed by the rate limiter still
 * belongs in the list.
 */

/**
 * ── AND WHERE IT RUNS ─────────────────────────────────────────────────────
 * Pinned next to the database. An edge function runs near whoever is asking,
 * which is the right default when the answer is already at the edge and the
 * wrong one when every answer comes from one database somewhere else: the
 * request landed in San Francisco and each read crossed the country.
 *
 * Measured, not guessed any more. Pinning the home screen's endpoints took a
 * lookup by primary key from 200-600ms to 98ms, which is same-region speed.
 * See api/_lib/db-region.js for the one place that says where, and
 * check-edge-region.mjs, which holds every endpoint the app calls to it.
 */
export const config = { runtime: 'edge', regions: ['iad1'] };

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: HEADERS });

export default async function handler(req) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || serviceKey;
  if (!supabaseUrl || !serviceKey) return json({ ok: false, error: 'Server not configured' }, 500);

  const token = (req.headers.get('authorization') || req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ ok: false, error: 'missing auth token' }, 401);

  try {
    /**
     * ── WHO THIS IS, WITHOUT A ROUND TRIP ─────────────────────────────
     * Identity comes from the verified token, never from the request body.
     *
     * This was a fetch to Supabase asking who the token belonged to,
     * before any work started, on every request. Ellie: "My pages are
     * still taking a long time to load." Measured at 6.3s for this
     * endpoint on a cold launch against 238ms for a static file in the
     * same run, so the time was here.
     *
     * The token is a JWT signed with the project's own key and the
     * project publishes the public half, so it is checked in memory.
     * The round trip is still the fall-back for anything the local
     * check cannot decide. See api/_lib/verify-token.js.
     */
    const user = await userForRequest({ token: token, supabaseUrl, anonKey });
    if (!user?.id) return json({ ok: false, error: 'invalid auth token' }, 401);
    const me = user.id;

    const svc = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    const rest = (p, init) => fetch(`${supabaseUrl}/rest/v1/${p}`, init);

    if (req.method === 'GET') {
      // Capped at 50: a list nobody scrolls past is not worth paginating, and
      // an unbounded query on a table that only grows is how this gets slow.
      const r = await rest(
        `notifications?owner_id=eq.${me}&select=id,kind,title,body,deep_link,subject_id,read_at,created_at&order=created_at.desc&limit=50`,
        { headers: svc });
      const items = await r.json().catch(() => []);
      return json({
        ok: true,
        notifications: items,
        unread: items.filter(n => !n.read_at).length,
      });
    }

    if (req.method !== 'POST') return json({ ok: false, error: 'unsupported method' }, 405);

    const _parsed = await jsonBody(req);
    if (_parsed.error) return _parsed.error;
    const body = _parsed.body;
    if (body.action !== 'read') return json({ ok: false, error: 'unsupported action' }, 400);

    // owner_id in the filter is the authorisation: another person's
    // notification matches nothing rather than erroring in a way that confirms
    // it exists.
    const scope = body.all
      ? `notifications?owner_id=eq.${me}&read_at=is.null`
      : `notifications?owner_id=eq.${me}&id=eq.${encodeURIComponent(body.id || '')}`;
    if (!body.all && !body.id) return json({ ok: false, error: 'missing id' }, 400);

    const r = await rest(scope, {
      method: 'PATCH',
      headers: { ...svc, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ read_at: new Date().toISOString() }),
    });
    // A refused write is not "marked" (A203, check-db-down).
    if (!r.ok) return json({ ok: false, error: 'could not mark that read' }, 503);
    const rows = await r.json().catch(() => []);
    return json({ ok: true, marked: Array.isArray(rows) ? rows.length : 0 });
  } catch (e) {
    console.error('[notifications] failed:', e);
    return json({ ok: false, error: 'notifications unavailable' }, 500);
  }
}
