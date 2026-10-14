/**
 * POST /api/daily-push — when, if ever, to send the insight and the word.
 *
 * ── WHAT ELLIE ASKED FOR ──────────────────────────────────────────────────
 * "Notifications settings should offer a once-a-day notification that sends
 * you the insight of the day at a time you select (default should be 7:30am),
 * same for word of the day."
 *
 * Two independent settings, each either off or a time. The default is the time
 * the picker opens on, not a default to receiving anything: nobody is signed
 * up by this existing.
 *
 * ── WHY THE OFFSET IS WRITTEN HERE ────────────────────────────────────────
 * A cron has to know when somebody's 7:30 is. The device knows, and tells us
 * on every /api/home call, in the query string. Writing it there would be a
 * write on a read path that runs on every app open, which is what
 * check-poll-writes exists to stop.
 *
 * So it is written at the one moment it matters and the one moment the person
 * is deliberately acting: when they set a time. A reader who flies to Tokyo
 * and never opens Settings keeps getting 7:30 Pacific, which is wrong and is
 * the better failure: the alternative is a write on every open.
 *
 * ── WHAT IT NEVER DOES ────────────────────────────────────────────────────
 * It does not turn push on. api/push-token.js owns `push_opt_in` and the
 * system prompt behind it; a time set here with permission refused sends
 * nothing, which api/_lib/push.js already enforces for every kind.
 */

import { createClient } from '@supabase/supabase-js';

import { safeError } from './_lib/http.js';

export const config = { runtime: 'edge' };

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });

/** The two things that can be scheduled, and the column each one lives in. */
export const DAILY_KINDS = {
  insight: 'daily_insight_at',
  word: 'daily_word_at',
};

/**
 * The time the picker opens on. Ellie: "default should be 7:30am".
 *
 * Exported because the app shows it before anything is stored, and a default
 * written in two places is two defaults.
 */
export const DAILY_DEFAULT_AT = '07:30';

/** A 24-hour clock reading, which is the only thing the cron can match. */
const CLOCK = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

/** The same shape migration 083 puts on the column, checked before the write. */
export function validAt(v) {
  return v === null || (typeof v === 'string' && CLOCK.test(v));
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405);

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY
           || process.env.SUPABASE_SERVICE_ROLE_KEY
           || process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) return json({ ok: false, error: 'Server not configured' }, 500);

  const token = (req.headers.get('authorization') || req.headers.get('Authorization') || '')
    .replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ ok: false, error: 'missing auth token' }, 401);

  /* `JSON.parse('null')` succeeds and gives null, and null.kind throws a 500
     where a 400 belongs. check-body-parsing posts exactly that. */
  let body = {};
  try { body = (await req.json()) || {}; } catch { /* an empty body is a bad request below */ }
  if (typeof body !== 'object' || Array.isArray(body)) body = {};

  const kind = String(body.kind || '');
  if (!DAILY_KINDS[kind]) {
    return json({ ok: false, error: 'kind must be insight or word' }, 400);
  }
  /* Null is a real value here: it is how somebody turns it off. */
  const at = body.at === null || body.at === undefined ? null : String(body.at);
  if (!validAt(at)) {
    return json({ ok: false, error: 'at must be HH:MM on a 24 hour clock, or null' }, 400);
  }

  const admin = createClient(url, key);

  /* Whose row this is, from their own token rather than from the body. */
  const { data: who, error: whoErr } = await admin.auth.getUser(token);
  if (whoErr || !who?.user?.id) return json({ ok: false, error: 'not signed in' }, 401);

  const patch = { [DAILY_KINDS[kind]]: at };

  /**
   * The offset, clamped the way api/home.js clamps the one in its query
   * string. Fourteen hours either side covers every real zone; a junk value
   * would put a person's 7:30 in the middle of somebody else's night.
   */
  const raw = Number(body.tzOffsetMinutes);
  if (Number.isFinite(raw) && Math.abs(raw) <= 900) patch.tz_offset_minutes = Math.round(raw);

  try {
    const { error } = await admin.from('profiles').update(patch).eq('id', who.user.id);
    if (error) throw error;
  } catch (e) {
    const missing = /daily_insight_at|daily_word_at|tz_offset_minutes/.test(String(e?.message || ''));
    return json({
      ok: false,
      error: missing
        ? 'Daily notification settings are not set up yet (migration 083)'
        : safeError('daily-push', e, 'Could not save that.'),
    }, missing ? 503 : 500);
  }

  return json({ ok: true, kind, at });
}
