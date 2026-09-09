/**
 * GET /api/featured-testimonials
 * Public. Returns the post-results survey testimonials an admin has marked
 * `featured`, for the homepage. Only consented testimonial text + first name.
 */
export const config = { runtime: 'edge' };

import { corsHeaders, safeError } from './_lib/http.js';

// No Access-Control-Allow-Origin.
//
// This answered `*`. The homepage fetches it with a relative URL from the same
// origin, so CORS never applied to the only caller it has; the wildcard was
// permission granted to the whole internet for nothing in return. The data is
// public either way, which is why this was harmless rather than a hole.
// Emitting no header is stricter than an allowlist: a cross-origin read is
// refused by the browser outright. corsHeaders takes a request when an
// endpoint genuinely needs to answer another origin.
function json(o) {
  return new Response(JSON.stringify(o), {
    headers: corsHeaders(undefined, { 'Cache-Control': 'public, max-age=300' }),
  });
}

export default async function handler() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) return json([]);
  try {
    const r = await fetch(
      `${url}/rest/v1/feedback_submissions?type=in.(post_results,beta_survey)&featured=eq.true&select=text,submitted_at&order=submitted_at.desc&limit=12`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const rows = await r.json();
    const out = [];
    for (const row of (Array.isArray(rows) ? rows : [])) {
      let p = {}; try { p = typeof row.text === 'string' ? JSON.parse(row.text) : row.text; } catch {}
      const a = (p && p.answers) || {};
      // post_results stores under answers.testimonial; beta_survey stores flat on the payload.
      const t = String((a.testimonial != null ? a.testimonial : (p && p.testimonial)) || '').trim();
      if (!t) continue;
      const name = String((p && (p.userName || p.consentFirstName)) || '').trim() || 'A verified couple';
      out.push({ text: '“' + t + '”', name, detail: 'Verified Attune couple' });
    }
    return json(out);
  } catch (e) { return json([]); }
}
