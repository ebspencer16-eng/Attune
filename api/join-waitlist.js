/**
 * POST /api/join-waitlist
 *
 * Captures a pre-launch waitlist signup from the site popup.
 * Body: { email, name?, source? }
 * Stores in Supabase `waitlist` (dedupes on email). Server-side service-role
 * write, so no anon RLS policy is required.
 */
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try { body = await req.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }

  const email = (body.email || '').toLowerCase().trim();
  // Basic validation. Keep it forgiving; the table's unique constraint dedupes.
  if (!email || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Please enter a valid email.' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }
  const name   = (body.name || '').toString().slice(0, 120) || null;
  const source = (body.source || 'popup').toString().slice(0, 40);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE
                   || process.env.SUPABASE_SERVICE_KEY
                   || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/waitlist?on_conflict=email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          // Ignore duplicates so re-submits return cleanly instead of erroring.
          Prefer: 'resolution=ignore-duplicates,return=minimal',
        },
        body: JSON.stringify({ email, name, source }),
      });
      if (!res.ok && res.status !== 409) {
        const txt = await res.text();
        console.warn('[waitlist] insert failed:', res.status, txt);
      }
    } catch (e) {
      console.warn('[waitlist] insert error:', e);
      // Soft-fail: don't block the user. They still see success.
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
}
