/**
 * POST /api/push-token
 *
 * The app, on launch: "this device can be reached at this token, and here is
 * what the person said when we asked."
 *
 * ── WHAT IT STORES ────────────────────────────────────────────────────────
 * One row per device in push_tokens, and three facts on the profile: whether
 * they said yes, when they were asked, and that the app was opened just now.
 *
 * The last one is not analytics. It is what the rule "do not push something
 * the home screen is already showing them" reads, and it is stamped here
 * rather than in /api/home because /api/home is polled and a write on a polled
 * path is a different problem. See check-poll-writes.
 *
 * ── THREE ANSWERS, NOT TWO ────────────────────────────────────────────────
 * `optIn` may be true, false, or absent. Absent means the app is registering a
 * device without re-answering the question, which is every launch after the
 * first: it must not overwrite a decision with a default. Null in the column
 * means nobody has been asked yet, and that is the state the app needs in
 * order to know whether to ask.
 *
 * ── TURNING IT OFF ────────────────────────────────────────────────────────
 * `optIn: false` records the no AND forgets the device's token. Keeping a token
 * for somebody who has said no is keeping the ability to interrupt them, and
 * the only safe version of a no is one where the address is gone.
 *
 * Body: { token?: string, platform?: 'ios'|'android', optIn?: boolean }
 * Auth: Bearer session token. The profile comes from the token, never the body.
 */

import { createClient } from '@supabase/supabase-js';

import { jsonBody } from './_lib/http.js';

export const config = { runtime: 'edge' };

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: HEADERS });

/** Expo's own shape. Anything else is not a push address. */
const EXPO_TOKEN = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;

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
  const body = _parsed.body || {};

  const pushToken = typeof body.token === 'string' ? body.token.trim() : '';
  if (pushToken && !EXPO_TOKEN.test(pushToken)) {
    return json(400, { ok: false, error: 'Not a push token' });
  }
  const platform = body.platform === 'android' ? 'android' : body.platform === 'ios' ? 'ios' : null;
  const optIn = typeof body.optIn === 'boolean' ? body.optIn : null;

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: who, error: whoErr } = await admin.auth.getUser(token);
  const profileId = who?.user?.id;
  if (whoErr || !profileId) return json(401, { ok: false, error: 'Invalid auth token' });

  const svc = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const rest = (path, init = {}) => fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: { ...svc, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });

  /* The profile first, because consent is the thing that gates everything and
     it must be recorded even if the device half fails. */
  const patch = { app_last_opened_at: new Date().toISOString() };
  if (optIn !== null) {
    patch.push_opt_in = optIn;
    patch.push_asked_at = new Date().toISOString();
  }
  const profRes = await rest(`profiles?id=eq.${profileId}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  });
  /**
   * A 404 or a column that is not there means migration 078 has not been run.
   * Say which, because "it did not work" after a release is a question about
   * the migration nine times out of ten.
   */
  if (!profRes.ok) {
    const detail = await profRes.text().catch(() => '');
    const missing = /push_opt_in|app_last_opened_at|does not exist/.test(detail);
    return json(missing ? 503 : 500, {
      ok: false,
      error: missing ? 'Push storage is not set up yet (migration 078)' : 'Could not record',
    });
  }

  if (optIn === false) {
    /* Forget every device of theirs, not only the one that asked. A person who
       turns notifications off on their phone has not consented on their iPad. */
    await rest(`push_tokens?profile_id=eq.${profileId}`, {
      method: 'DELETE', headers: { Prefer: 'return=minimal' },
    }).catch(() => {});
    return json(200, { ok: true, optIn: false, devices: 0 });
  }

  if (!pushToken) return json(200, { ok: true, optIn, devices: null });

  /* Upsert on the token, which is the key: the OS can hand the same token to a
     different install later, and the last writer owns it. */
  const tokRes = await rest('push_tokens', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      token: pushToken,
      profile_id: profileId,
      platform,
      last_seen_at: new Date().toISOString(),
    }),
  });
  if (!tokRes.ok) {
    const detail = await tokRes.text().catch(() => '');
    const missing = /push_tokens|does not exist/.test(detail);
    return json(missing ? 503 : 500, {
      ok: false,
      error: missing ? 'Push storage is not set up yet (migration 078)' : 'Could not store the device',
    });
  }

  return json(200, { ok: true, optIn, stored: true });
}
