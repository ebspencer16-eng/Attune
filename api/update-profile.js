/**
 * GET  /api/update-profile   what the editable fields say now
 * POST /api/update-profile   change some of them
 *
 * Both with Authorization: Bearer <user access token>.
 *
 * Edits the parts of a profile a person owns. The app's only way to change
 * them: the website writes to profiles directly through row-level security,
 * and the app has no Supabase client and should not have one.
 *
 * ── WHY IT EXISTS ─────────────────────────────────────────────────────────
 * "Finish setting up your profile" was a card on the app's home screen that
 * opened the website, because Settings could not edit a name or pronouns.
 * Ellie: "Everything should run in the app. Ideally, a user purchases online
 * then downloads the app and only uses the app from that point."
 *
 * ── WHAT IT WILL NOT CHANGE ───────────────────────────────────────────────
 * The id, the email, the package, the entitlements, the partner link, the
 * answers, and anything that decides what somebody owns. The whitelist below
 * is the whole of what this endpoint can touch; a field that is not on it
 * cannot be written by sending it.
 *
 * partner_email is deliberately absent. Changing it means re-inviting somebody
 * and unlinking a couple, which is not an edit to a profile and should not
 * happen by way of one.
 */

import { ABOUT_YOU } from './_lib/profile-setup-copy.js';

export const config = { runtime: 'edge' };

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: HEADERS });

/**
 * What may be written, and how long each may be.
 *
 * The five demographic fields come from ABOUT_YOU rather than being listed
 * again, so a question added to profile setup is editable the same day. Their
 * column names are the snake_case of the key, which is the rule
 * api/create-profile.js already follows.
 */
const snake = (k) => k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
const EDITABLE = {
  name: { column: 'name', max: 100 },
  pronouns: { column: 'pronouns', max: 30 },
  partnerName: { column: 'partner_name', max: 100 },
  partnerPronouns: { column: 'partner_pronouns', max: 30 },
  ...Object.fromEntries(ABOUT_YOU.fields.map((f) => [f.key, { column: snake(f.key), max: 50 }])),
};

export default async function handler(req) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_ROLE;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceKey || !anonKey) return json({ ok: false, error: 'Server not configured' }, 500);

  const token = (req.headers.get('authorization') || req.headers.get('Authorization') || '')
    .replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ ok: false, error: 'missing auth token' }, 401);

  // Whose profile, from the token and only from the token.
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) return json({ ok: false, error: 'invalid auth token' }, 401);
  const user = await userRes.json().catch(() => null);
  if (!user?.id) return json({ ok: false, error: 'invalid auth token' }, 401);

  // ── GET: what the editable fields say now ───────────────────────────────
  //
  // The screen that edits them has to show them, and /api/home carries only
  // first names. Same whitelist, so a field that cannot be written cannot be
  // read here either, and the two can never describe different sets.
  if (req.method === 'GET') {
    const cols = ['id', ...Object.values(EDITABLE).map((r) => r.column)].join(',');
    const r = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=${cols}`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    if (!r.ok) return json({ ok: false, error: 'Could not read that.' }, 500);
    const row = (await r.json().catch(() => []))?.[0];
    if (!row) return json({ ok: false, error: 'profile not found' }, 404);
    return json({
      ok: true,
      profile: Object.fromEntries(
        Object.entries(EDITABLE).map(([key, rule]) => [key, row[rule.column] ?? null]),
      ),
      // The questions themselves, so the screen draws the same five the signup
      // does rather than a second copy of them.
      aboutYou: ABOUT_YOU,
    });
  }

  let body;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

  const patch = {};
  for (const [key, rule] of Object.entries(EDITABLE)) {
    if (!(key in body)) continue;
    const raw = body[key];
    if (raw === null || raw === '') { patch[rule.column] = null; continue; }
    if (typeof raw !== 'string') continue;
    patch[rule.column] = raw.trim().slice(0, rule.max);
  }

  // A name is the one thing that cannot be emptied: results address people by
  // it throughout, and a blank there reads as a rendering fault.
  if ('name' in patch && !patch.name) delete patch.name;

  if (!Object.keys(patch).length) return json({ ok: false, error: 'nothing to update' }, 400);

  const res = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(patch),
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('[update-profile] patch failed:', res.status, detail.slice(0, 200));
    return json({ ok: false, error: 'Could not save that.' }, 500);
  }

  const row = (await res.json().catch(() => []))?.[0] || null;
  return json({
    ok: true,
    // Only what was asked to change, echoed back, so a screen can trust what it
    // shows without another round trip.
    updated: Object.fromEntries(Object.keys(patch).map((c) => [c, row ? row[c] : null])),
  });
}
