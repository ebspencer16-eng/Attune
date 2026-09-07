/**
 * /api/privacy-choices
 *
 * Reads and records a person's privacy choices, and honours the Global Privacy
 * Control browser signal server-side.
 *
 *   GET   → { ok, optOutResearch, gpc, gpcSeenAt, source }
 *   POST  { optOutResearch: boolean } → the same shape, after saving
 *
 * ── GPC ───────────────────────────────────────────────────────────────────
 * A browser that sends Sec-GPC: 1 is making a request under state privacy law,
 * not a suggestion. It is read here, on the server, on every call. Reading it
 * only in the page would mean a signal that stops working the moment someone
 * has JavaScript off, which is the opposite of the point.
 *
 * GPC can turn the opt-out on. It never turns it off: a browser that stops
 * sending the header is not a person withdrawing a choice they made, and
 * quietly opting someone back in because they changed browsers would be the
 * worst possible reading of the signal. Turning it off is done on the page.
 *
 * ── What the choice controls ──────────────────────────────────────────────
 * Attune runs no advertising or analytics trackers, so there is nothing here
 * about sale or sharing of personal information: none happens. The one real
 * choice is research use, read by api/delete-account.js before it keeps a
 * de-identified copy of someone's answers.
 *
 * Identity comes from the verified token, never from the request body.
 */

export const config = { runtime: 'edge' };

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: HEADERS });

/** Is this request carrying the Global Privacy Control signal? */
export function hasGpc(req) {
  // Sec-GPC is the header browsers and extensions send. The legacy DNT header
  // is deliberately not treated as GPC: it is ambiguous, widely sent by
  // default, and is not what the statutes point at.
  return (req.headers.get('sec-gpc') || req.headers.get('Sec-GPC') || '').trim() === '1';
}

export default async function handler(req) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || serviceKey;
  if (!supabaseUrl || !serviceKey) return json({ ok: false, error: 'Server not configured' }, 500);

  const gpc = hasGpc(req);

  const token = (req.headers.get('authorization') || req.headers.get('Authorization') || '')
    .replace(/^Bearer\s+/i, '').trim();

  // Signed out is not an error. The page is readable by anyone, and it should
  // still be able to say whether the browser is sending GPC. There is simply
  // no row to attach the choice to until someone signs in.
  if (!token) {
    return json({ ok: true, signedIn: false, gpc, optOutResearch: gpc, gpcSeenAt: null, source: gpc ? 'gpc' : null });
  }

  try {
    const uRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    });
    if (!uRes.ok) return json({ ok: false, error: 'invalid auth token' }, 401);
    const user = await uRes.json().catch(() => null);
    if (!user?.id) return json({ ok: false, error: 'invalid auth token' }, 401);
    const me = user.id;

    const svc = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    const jsonHeaders = { ...svc, 'Content-Type': 'application/json' };
    const rest = (path, init) => fetch(`${supabaseUrl}/rest/v1/${path}`, init);

    const readRow = async () => {
      const r = await rest(`privacy_preferences?owner_id=eq.${me}&select=*`, { headers: svc });
      return (await r.json().catch(() => []))?.[0] || null;
    };

    const upsert = async (patch) => {
      const r = await rest('privacy_preferences', {
        method: 'POST',
        headers: { ...jsonHeaders, Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ owner_id: me, updated_at: new Date().toISOString(), ...patch }),
      });
      return (await r.json().catch(() => []))?.[0] || null;
    };

    let row = await readRow();

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      if (typeof body.optOutResearch !== 'boolean') {
        return json({ ok: false, error: 'optOutResearch must be true or false' }, 400);
      }
      // A person on the page can turn the opt-out off even while their browser
      // sends GPC. The page is the more specific, more deliberate statement,
      // and refusing it would leave someone unable to change their own mind.
      row = await upsert({
        opt_out_research: body.optOutResearch,
        source: 'page',
        ...(gpc ? { gpc_seen_at: new Date().toISOString() } : {}),
      });
    } else if (gpc && !row?.opt_out_research) {
      // Honouring the signal: recorded the first time it is seen, and on any
      // later request where the stored choice does not already reflect it.
      row = await upsert({
        opt_out_research: true,
        source: 'gpc',
        gpc_seen_at: new Date().toISOString(),
      });
    } else if (gpc) {
      row = await upsert({ gpc_seen_at: new Date().toISOString() });
    }

    return json({
      ok: true,
      signedIn: true,
      gpc,
      optOutResearch: !!row?.opt_out_research,
      gpcSeenAt: row?.gpc_seen_at || null,
      source: row?.source || null,
    });
  } catch (e) {
    console.error('[privacy-choices] failed:', e);
    return json({ ok: false, error: 'privacy choices unavailable' }, 500);
  }
}
