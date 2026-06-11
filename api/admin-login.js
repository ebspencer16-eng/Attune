/**
 * /api/admin-login
 *
 * POST { email, password } → verifies admin credentials server-side and
 * returns the admin API token on success.
 *
 * Replaces the manual ?s=ADMIN_SECRET URL flow: the admin page calls this at
 * sign-in, stores the returned token, and every data endpoint uses it. The
 * password gate becomes the only thing the admin ever types.
 *
 * Verification: sha256(email) and sha256(password) compared against
 * ADMIN_EMAIL_HASH / ADMIN_PASSWORD_HASH env vars, falling back to the same
 * constants the page itself ships. Server-side comparison is strictly
 * stronger than the page-only check it supplements.
 */

export const config = { runtime: 'edge' };

// Fallbacks mirror the constants in public/admin.html.
const EMAIL_HASH = process.env.ADMIN_EMAIL_HASH
  || '761c28fe9802521c2cb3dac1150d1603263cff76501934488936216bcd09e5e7';
const PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH
  || '2add3de7e0e78e353d5973686114f3e198ae4982eda80a3f4bfb4d515e3f05e5';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return json({ error: 'Admin endpoint not configured' }, 503);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid request' }, 400); }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) return json({ error: 'Missing credentials' }, 400);

  const [eHash, pHash] = await Promise.all([sha256(email), sha256(password)]);

  if (eHash !== EMAIL_HASH || pHash !== PASSWORD_HASH) {
    // Flat 600ms delay takes the speed out of brute-force attempts.
    await new Promise(r => setTimeout(r, 600));
    return json({ error: 'Invalid credentials' }, 403);
  }

  return json({ ok: true, token: adminSecret });
}
