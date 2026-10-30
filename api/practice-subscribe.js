/**
 * POST /api/practice-subscribe  { email }
 *
 * Puts an address on the In Practice list, for the email that announces a
 * new article (A204a; the sender is api/cron-new-articles.js).
 *
 * The signup on /practice used to save nothing at all and say "Thanks, you're
 * on the list." So this answers 200 only when the row is stored, and the page
 * says so only then. Signing up again after unsubscribing clears the stamp,
 * because a second signup is a fresh yes.
 *
 * Lower case, as every stored address is since migration 102.
 */
export const config = { runtime: 'edge', regions: ['iad1'] };

import { jsonBody } from './_lib/http.js';
import { emailOrNull } from './_lib/owns-core.js';

const HEADERS = { 'Content-Type': 'application/json' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });

export default async function handler(req) {
  if (req.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405);
  const parsed = await jsonBody(req);
  if (parsed.error) return parsed.error;
  const email = emailOrNull(parsed.body?.email);
  if (!email) return json({ ok: false, error: 'enter an email address' }, 400);

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) return json({ ok: false, error: 'not saved' }, 503);

  const res = await fetch(`${url}/rest/v1/article_subscribers?on_conflict=email`, {
    method: 'POST',
    headers: {
      apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({ email, unsubscribed_at: null }),
  }).catch(() => null);
  if (!res?.ok) {
    console.warn('[practice-subscribe] not saved:', res?.status);
    return json({ ok: false, error: 'not saved' }, 503);
  }
  return json({ ok: true });
}
