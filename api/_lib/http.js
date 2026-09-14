/**
 * CORS and error responses, in one place.
 *
 * ── CORS ──────────────────────────────────────────────────────────────────
 * Six endpoints answered `Access-Control-Allow-Origin: *`. Four of them are
 * admin endpoints behind ADMIN_SECRET, which is what actually stops a stranger
 * reading the data, so the wildcard was not by itself an exposure. It was
 * still wrong in a way worth closing: with `*` any page on the internet can
 * read a response from those origins if it ever obtains a token, and the
 * browser stops being a second line of defence.
 *
 * The allowlist reflects the origin, rather than echoing whatever was asked
 * for, so an unknown origin gets no CORS header at all and the browser refuses
 * the read. `Vary: Origin` is required with a reflected value or a cache will
 * serve one site's allowance to another.
 *
 * The iOS app is unaffected. CORS is a browser mechanism; a native fetch sends
 * no Origin and applies no policy.
 *
 * ── ERRORS ────────────────────────────────────────────────────────────────
 * Roughly thirty places returned the raw exception or PostgREST message to the
 * caller. Those strings name tables, columns, constraints and sometimes the
 * failing value, which is a free map of the schema and, on a constraint
 * violation, can quote back another row's data.
 *
 * The detail goes to the server log, where it is still there to debug with.
 * The caller gets a stable, generic sentence and the same response shape, so
 * the admin dashboard keeps rendering what it always rendered.
 */

const ALLOWED_ORIGINS = new Set([
  'https://attune-relationships.com',
  'https://www.attune-relationships.com',
]);

/**
 * Whether to allow an origin.
 *
 * Localhost is allowed only when not running in production, so a developer can
 * work against a local page without that permission ever shipping.
 */
function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (process.env.VERCEL_ENV !== 'production') {
    try {
      const { hostname } = new URL(origin);
      if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    } catch { return false; }
  }
  return false;
}

/**
 * Response headers for a request, with CORS only when the origin is ours.
 *
 * `req` is optional so a caller with no request in hand still gets the
 * non-CORS security headers rather than nothing.
 */
export function corsHeaders(req, extra = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    ...extra,
  };
  const origin = req?.headers?.get?.('origin') || '';
  if (isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }
  return headers;
}

/** A preflight response, for endpoints a browser sends OPTIONS to. */
export function preflight(req) {
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(req),
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Log the real failure, return a sentence that gives nothing away.
 *
 * `where` names the endpoint so the log line is findable. `fallback` is the
 * sentence the caller sees, and should say what failed in product terms
 * without naming anything from the database.
 */
export function safeError(where, e, fallback = 'Something went wrong on our end.') {
  const detail = e && (e.message || e.error?.message) ? (e.message || e.error.message) : String(e);
  console.error(`[${where}]`, detail, e?.stack || '');
  return fallback;
}

/**
 * The JSON body, as an object, or the Response to send instead.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * `JSON.parse('null')` is null, and `JSON.parse('"hello"')` is a string, and
 * both are valid JSON. Almost every handler here did
 *
 *     let body; try { body = await req.json(); } catch { 400 }
 *     const { thing } = body;
 *
 * which throws on either. A sweep of every endpoint with seven malformed
 * bodies found twenty answering 500 to a body of `null` alone: account-signup,
 * create-profile, send-email, send-order-email, notes, notifications, posts,
 * privacy-choices, claim-order, track-type, update-profile and more. Some
 * threw before reaching their own auth check.
 *
 * A 500 where a 400 belongs is not a hole, but it is noise in the logs that a
 * real failure then hides inside, which is a thing that has already happened
 * here twice.
 *
 * ── HOW TO USE IT ─────────────────────────────────────────────────────────
 *     const parsed = await jsonBody(req);
 *     if (parsed.error) return parsed.error;
 *     const body = parsed.body;
 *
 * `body` is always a plain object. Arrays, strings, numbers, null and
 * unparseable input all come back as a 400 with a sentence.
 */
export async function jsonBody(req, { headers } = {}) {
  const reply = (msg) => new Response(JSON.stringify({ ok: false, error: msg }), {
    status: 400, headers: { 'Content-Type': 'application/json', ...(headers || {}) },
  });
  let parsed;
  try { parsed = await req.json(); }
  catch { return { error: reply('Invalid JSON.') }; }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { error: reply('Expected a JSON object.') };
  }
  return { body: parsed };
}
