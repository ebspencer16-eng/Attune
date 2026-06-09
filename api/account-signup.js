/**
 * /api/account-signup
 *
 * POST { email, password } → creates a Supabase auth user and triggers the
 * email-confirmation message, then returns { ok: true }.
 *
 * Used by the checkout success step (Option A): the buyer sets a password right
 * after paying, which creates their account and sends the confirmation email.
 * They must confirm before they can access the app. Profile setup (name,
 * pronouns, partner) happens after confirmation, on the dashboard.
 *
 * This calls the same public GoTrue signup endpoint the browser SDK uses, with
 * the project anon key — so checkout.html doesn't need to embed a Supabase
 * client. The confirm-email redirect points at /app (already allow-listed; the
 * app detects the `type=signup` hash to show the celebratory confirmed screen).
 */

export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!SUPABASE_URL || !ANON) return json({ error: 'Server not configured' }, 500);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid request.' }, 400); }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !email.includes('@')) return json({ error: 'Enter a valid email address.' }, 400);
  if (password.length < 6) return json({ error: 'Use at least 6 characters for your password.' }, 400);

  // Confirm-email redirect: match the requesting origin so it stays on the
  // domain the buyer is using (and stays inside the project's allow-list).
  const origin = req.headers.get('origin') || 'https://www.attune-relationships.com';
  const redirectTo = `${origin}/app`;

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup?redirect_to=${encodeURIComponent(redirectTo)}`, {
      method: 'POST',
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = (data && (data.msg || data.error_description || data.error)) || 'Could not create your account.';
      // GoTrue returns "User already registered" for an existing email. Treat
      // that as success from the buyer's perspective — they're told to check
      // their inbox either way, and we never reveal whether an account exists.
      if (/already registered|already been registered|already exists/i.test(msg)) {
        return json({ ok: true, alreadyRegistered: true });
      }
      return json({ error: msg }, 400);
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: 'Could not reach the server. Please try again.' }, 502);
  }
}
