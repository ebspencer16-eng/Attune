/**
 * /api/partner-nudge
 *
 *   POST   tell your partner you are waiting on them
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * The home screen has offered a "Send {them} a reminder" card since the card
 * engine was written. Its deepLink was '/?view=home', so tapping it landed on
 * the screen it was already on: a button that said it would send something and
 * sent nothing. profiles.partner_nudged_at was added to enforce a cooldown on
 * an action that did not exist, and the notification copy for being nudged was
 * written and never raised.
 *
 * This is the missing middle. It writes the timestamp the card reads and
 * records the alert the partner sees.
 *
 * ── WHAT IT DELIBERATELY DOES NOT DO ──────────────────────────────────────
 * It does not email. A nudge is one person asking another to finish something,
 * and an email would make it arrive as a message from Attune. The in-app alert
 * is the whole of it until someone decides otherwise.
 *
 * ── THE COOLDOWN IS NOT DECIDED HERE ──────────────────────────────────────
 * NUDGE_COOLDOWN_DAYS comes from the card engine, which greys the card out on
 * the same rule. Two numbers for one cooldown is how a card reads "you nudged
 * them recently" while the endpoint cheerfully sends another.
 */

import { jsonBody } from './_lib/http.js';
import { NUDGE_COOLDOWN_DAYS } from './_lib/next-action.js';
import { recordNotification } from './_lib/notifications.js';

export const config = { runtime: 'edge' };

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: HEADERS });
const DAY = 24 * 60 * 60 * 1000;

export default async function handler(req) {
  if (req.method !== 'POST') return json({ ok: false, error: 'unsupported method' }, 405);

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
    const me = user.id;

    // The body is read and discarded. There is nothing to send: who is nudged
    // is decided by who this person is partnered with, not by what the client
    // asks for. Parsing it anyway keeps the failure shape the same as every
    // other POST here.
    const _parsed = await jsonBody(req);
    if (_parsed.error) return _parsed.error;

    const svc = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    const rest = (p, init) => fetch(`${supabaseUrl}/rest/v1/${p}`, init);

    const pRes = await rest(`profiles?id=eq.${me}&select=id,name,partner_profile_id,partner_nudged_at`, { headers: svc });
    const profile = (await pRes.json().catch(() => []))?.[0] || null;
    if (!profile) return json({ ok: false, error: 'no profile' }, 404);
    if (!profile.partner_profile_id) return json({ ok: false, error: 'no partner linked' }, 400);

    const last = profile.partner_nudged_at ? new Date(profile.partner_nudged_at).getTime() : null;
    if (last && (Date.now() - last) < NUDGE_COOLDOWN_DAYS * DAY) {
      // Not an error. They asked for something reasonable and the answer is
      // "already done", which the card says too.
      return json({ ok: true, sent: false, reason: 'cooldown', nudgedAt: profile.partner_nudged_at });
    }

    const nudgedAt = new Date().toISOString();
    const patch = await rest(`profiles?id=eq.${me}`, {
      method: 'PATCH',
      headers: { ...svc, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ partner_nudged_at: nudgedAt }),
    });
    if (!patch.ok) return json({ ok: false, error: 'could not send' }, 500);

    // The timestamp is written first on purpose. If the alert fails, the
    // cooldown still holds, so a retry loop cannot fill someone's list. The
    // other order would let a failure here become repeated nudges there.
    const recorded = await recordNotification({
      ownerId: profile.partner_profile_id,
      kind: 'partner_nudged_you',
      subjectId: me,
      copy: { partnerName: (profile.name || '').trim().split(/\s+/)[0] || null },
    });

    return json({ ok: true, sent: true, recorded, nudgedAt });
  } catch (e) {
    console.error('[partner-nudge] failed:', e);
    return json({ ok: false, error: 'could not send' }, 500);
  }
}
