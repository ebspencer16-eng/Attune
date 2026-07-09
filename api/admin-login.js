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
 * Verification: sha256(email) and sha256(password) compared against the
 * ADMIN_EMAIL_HASH / ADMIN_PASSWORD_HASH env vars. There is deliberately NO
 * fallback: the previous fallback used the very hashes that public/admin.html
 * shipped to every visitor, so anyone could download the page, crack an
 * unsalted SHA-256 offline, and exchange the result here for ADMIN_SECRET —
 * which unlocks the whole customer database.
 *
 * Because SHA-256 is fast and unsalted, the admin password must be long and
 * random. Treat it as a token, not a memorable password.
 */

export const config = { runtime: 'edge' };

const EMAIL_HASH = process.env.ADMIN_EMAIL_HASH;
const PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

// Constant-time string compare: a plain === leaks how many leading characters
// matched, which is enough to reconstruct a hash byte by byte.
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

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
  // Fail closed on every missing secret. Without the credential hashes there is
  // nothing to verify against, and a fallback would recreate the hole above.
  if (!adminSecret || !EMAIL_HASH || !PASSWORD_HASH) {
    console.error('[admin-login] missing ADMIN_SECRET / ADMIN_EMAIL_HASH / ADMIN_PASSWORD_HASH');
    return json({ error: 'Admin endpoint not configured' }, 503);
  }

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid request' }, 400); }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) return json({ error: 'Missing credentials' }, 400);

  const [eHash, pHash] = await Promise.all([sha256(email), sha256(password)]);

  const emailOk = timingSafeEqual(eHash, EMAIL_HASH);
  const passOk = timingSafeEqual(pHash, PASSWORD_HASH);
  if (!emailOk || !passOk) {
    // Flat delay takes the speed out of online brute-force attempts. The single
    // generic error avoids telling an attacker which field was wrong.
    await new Promise(r => setTimeout(r, 600));
    return json({ error: 'Invalid credentials' }, 403);
  }

  return json({ ok: true, token: adminSecret });
}
