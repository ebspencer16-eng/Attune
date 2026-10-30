import { jsonBody } from './_lib/http.js';
/**
 * POST /api/join-waitlist
 *
 * Captures a pre-launch waitlist signup from the site popup.
 * Body: { email, name?, source? }
 * Stores in Supabase `waitlist` (dedupes on email). Server-side service-role
 * write, so no anon RLS policy is required.
 */
/**
 * ── AND WHERE IT RUNS ─────────────────────────────────────────────────────
 * Pinned next to the database. An edge function runs near whoever is asking,
 * which is the wrong default when every answer comes from one database
 * somewhere else: a request that landed in San Francisco spent two crossings
 * of the country on a lookup by id. See api/_lib/db-region.js for the
 * measurement, and check-edge-region.mjs, which holds every one of these to
 * the one constant that says where.
 */
export const config = { runtime: 'edge', regions: ['iad1'] };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  const _parsed = await jsonBody(req);
  if (_parsed.error) return _parsed.error;
  body = _parsed.body;

  const email = String(body.email ?? '').toLowerCase().trim();
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

  /**
   * ── A FAILED SAVE IS SAID, NOT HIDDEN ─────────────────────────────────
   * This used to soft-fail: a refused insert was logged and the person was
   * told "You're on the list." Ellie, A201b, asked for the failure to be
   * said instead, in her words, which live in public/home.html. So anything
   * short of a stored row, including no database configured, answers 503
   * and nothing below runs.
   */
  const unsaved = () => new Response(JSON.stringify({ error: 'not saved' }), {
    status: 503, headers: { 'Content-Type': 'application/json' },
  });
  if (!supabaseUrl || !serviceKey) return unsaved();
  {
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
        return unsaved();
      }
    } catch (e) {
      console.warn('[waitlist] insert error:', e);
      return unsaved();
    }
  }

  // Also add to a Resend segment so the launch email can go out in one click.
  // Resend renamed "audiences" to "segments"; contacts are global now. One call
  // creates the global contact and attaches the segment. Gated on
  // RESEND_SEGMENT_ID (set it in Vercel once the segment exists). Soft-fails:
  // the row above is the record, and the person is on the list without this.
  const resendKey = process.env.RESEND_API_KEY;
  const segmentId = process.env.RESEND_SEGMENT_ID || process.env.RESEND_AUDIENCE_ID;
  if (resendKey && segmentId) {
    try {
      const r = await fetch('https://api.resend.com/contacts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, unsubscribed: false,
          ...(name ? { first_name: name } : {}),
          segments: [{ id: segmentId }],
        }),
      });
      if (!r.ok) {
        // Contact likely already exists — attach it to the segment by email.
        await fetch(`https://api.resend.com/contacts/${encodeURIComponent(email)}/segments/${segmentId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}` },
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('[waitlist] resend segment add failed:', e);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
}