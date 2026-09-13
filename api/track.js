/**
 * POST /api/track
 *
 * One engagement event. The whole of the collection side of the Engagement
 * tab.
 *
 *   { kind: 'visit' | 'page_time', key: string, ms?: number, surface?: 'site' | 'app' }
 *
 * ── WHAT IT REFUSES ───────────────────────────────────────────────────────
 * Anything that would make a row identify a person. It reads no cookie, no
 * session id, no referrer and no user agent, and it writes none of those. The
 * only thing it takes from the request beyond the body is the country, two
 * letters, from the edge.
 *
 * The signed-in surfaces send a bearer token and the row carries the profile
 * id, because "how long does an exercise take" is only answerable per person.
 * The marketing pages send nothing and the row is anonymous.
 *
 * ── CONSENT ───────────────────────────────────────────────────────────────
 * Enforced on the client, where the answer lives, and again here: a request
 * from a country that requires consent, without the header that says it was
 * given, is dropped. Two places on purpose. The client rule can be bypassed by
 * anyone who wants to; the server rule cannot, and it is the one that decides
 * what is stored.
 *
 * ── WHY IT ALWAYS ANSWERS 204 ─────────────────────────────────────────────
 * A beacon has nobody to tell. sendBeacon ignores the response, and a page
 * unloading cannot act on an error. Answering anything else would only add a
 * body nobody reads. Failures are logged server side.
 */

import { consentRequired } from './_lib/consent-region.js';

export const config = { runtime: 'edge' };

const KINDS = new Set(['visit', 'page_time']);
const MAX_MS = 2 * 60 * 60 * 1000;   // two hours; longer is a tab left open
const noContent = () => new Response(null, { status: 204 });

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try { body = await req.json(); } catch { return noContent(); }

  const kind = String(body?.kind || '');
  if (!KINDS.has(kind)) return noContent();

  // A path or an exercise key. Truncated rather than rejected: a long one is a
  // mistake, not an attack, and dropping the event loses the measure.
  const key = String(body?.key || '').slice(0, 120).trim();
  if (!key) return noContent();

  let ms = null;
  if (kind !== 'visit') {
    const n = Number(body?.ms);
    if (!Number.isFinite(n) || n < 0) return noContent();
    // Clamped, not dropped. A tab left open overnight is a real session that
    // tells us nothing, and letting it through would move every average.
    ms = Math.min(Math.round(n), MAX_MS);
  }

  // Which software this came from. 'site' covers the marketing pages and the
  // portal; 'app' is iOS. A fact about the software, not the person: everybody
  // on the app sends the same value, so it identifies nobody and the privacy
  // paragraph is unaffected.
  const surface = body?.surface === 'app' ? 'app' : body?.surface === 'site' ? 'site' : null;

  const country = req.headers.get('x-vercel-ip-country')
    || req.headers.get('X-Vercel-IP-Country')
    || null;

  // The second half of the consent rule.
  //
  // Read from a header or a query parameter, because sendBeacon cannot set a
  // header and a beacon is the only thing that survives a page closing. The
  // value is not a credential and nothing is trusted to it: it says which
  // answer the browser holds, and the country decides whether an answer was
  // needed at all.
  let consent = req.headers.get('x-attune-consent') || '';
  if (!consent) {
    try { consent = new URL(req.url).searchParams.get('c') || ''; } catch { /* no url */ }
  }
  if (consentRequired(country) && consent !== 'granted') {
    return noContent();
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !serviceKey) return noContent();

  // Who, only where the surface is signed in and only from the token. Never
  // from the body: a client that can name the id it writes is a client that
  // can name somebody else's.
  let ownerId = null;
  const token = (req.headers.get('authorization') || req.headers.get('Authorization') || '')
    .replace(/^Bearer\s+/i, '').trim();
  if (token) {
    try {
      const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      const r = await fetch(`${url}/auth/v1/user`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
      });
      if (r.ok) ownerId = (await r.json().catch(() => null))?.id || null;
    } catch { /* anonymous is a fine answer */ }
  }

  try {
    const res = await fetch(`${url}/rest/v1/page_events`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ kind, key, ms, surface, owner_id: ownerId, country }),
    });
    if (!res.ok) {
      console.warn(`[track] not recorded (${res.status}). Migration 060 may not have been run.`);
    }
  } catch (e) {
    console.warn('[track] not recorded:', e?.message);
  }

  return noContent();
}
