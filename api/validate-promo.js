/**
 * POST /api/validate-promo
 *
 * Lightweight check used by the checkout promo field so a used / unknown /
 * expired database code shows an error at INPUT time, instead of only failing
 * when the customer clicks "Complete order".
 *
 * This mirrors the database-code checks in create-payment-intent.js (active,
 * expiry, single-use) but creates no PaymentIntent and writes nothing. The
 * purchase endpoint remains the source of truth and validates again.
 *
 * Body:   { code: string }
 * Returns (always HTTP 200):
 *   { valid: true }                          usable
 *   { valid: true, unverified: true }        couldn't reach the DB; don't block
 *   { valid: false, error: "..." }           not usable, with a reason to show
 *
 * Env:
 *   SUPABASE_URL / VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_KEY
 */

export const config = { runtime: 'edge' };

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Codes that are intentionally reusable (match create-payment-intent.js).
const REUSABLE_CODES = new Set(['BETA-CORE-1']);

export default async function handler(req) {
  if (req.method !== 'POST') return json({ valid: false, error: 'Method not allowed' }, 405);

  let body;
  try { body = await req.json(); }
  catch { return json({ valid: false, error: 'Could not read request.' }); }

  const code = (body && body.code ? String(body.code) : '').toUpperCase().trim();
  if (!code) return json({ valid: false, error: 'Enter a code.' });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY;

  // No server credentials available -> can't verify here. Don't block the
  // customer; the purchase endpoint will validate.
  if (!supabaseUrl || !supabaseServiceKey) return json({ valid: true, unverified: true });

  let row = null;
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(
      `${supabaseUrl}/rest/v1/beta_codes?code=eq.${encodeURIComponent(code)}&select=*`,
      {
        headers: { apikey: supabaseServiceKey, Authorization: `Bearer ${supabaseServiceKey}` },
        signal: ctrl.signal,
      }
    );
    clearTimeout(to);
    const rows = await r.json();
    row = Array.isArray(rows) ? rows[0] : null;
  } catch (e) {
    // Network / timeout -> don't block; purchase-time validates.
    return json({ valid: true, unverified: true });
  }

  if (!row) return json({ valid: false, error: "That code isn't valid." });
  if (row.active === false) return json({ valid: false, error: 'This code has been deactivated.' });
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return json({ valid: false, error: 'This code has expired.' });
  }
  if (!REUSABLE_CODES.has(code)) {
    const usesSoFar = row.uses_count ?? 0;
    const allowedUses = (row.max_uses != null) ? row.max_uses : 1;
    if (usesSoFar >= allowedUses) {
      return json({ valid: false, error: 'This code has already been used.' });
    }
  }

  return json({ valid: true });
}
