/**
 * Shared admin authorization for every /api/admin-* endpoint (and orders,
 * generate-card, get-feedback).
 *
 * Prefers the Authorization: Bearer <ADMIN_SECRET> header. Still accepts the
 * legacy ?secret= query param, because a couple of call sites (CSV download,
 * card image) are plain browser navigations that cannot set a header. The
 * query fallback is the one remaining place the token can appear in a URL;
 * keep those call sites to true navigations only.
 *
 * Usage:
 *   const auth = checkAdminAuth(req);
 *   if (!auth.ok) return new Response(auth.body, { status: auth.status, headers });
 */

// Constant-time compare. A plain === leaks how many leading characters matched.
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

/**
 * @returns {{ ok: true } | { ok: false, status: number, error: string, body: string }}
 */
export function checkAdminAuth(req) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return { ok: false, status: 503, error: 'Admin endpoint not configured', body: JSON.stringify({ ok: false, error: 'Admin endpoint not configured' }) };
  }

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const headerSecret = /^Bearer\s+/i.test(authHeader) ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';

  let querySecret = '';
  try { querySecret = new URL(req.url).searchParams.get('secret') || ''; } catch { /* no url */ }

  if (timingSafeEqual(headerSecret, adminSecret) || timingSafeEqual(querySecret, adminSecret)) {
    return { ok: true };
  }
  return { ok: false, status: 401, error: 'Unauthorized', body: JSON.stringify({ ok: false, error: 'Unauthorized' }) };
}
