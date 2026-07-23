/**
 * GET /api/featured-testimonials
 * Public. Returns the post-results survey testimonials an admin has marked
 * `featured`, for the homepage. Only consented testimonial text + first name.
 */
export const config = { runtime: 'edge' };

function json(o) {
  return new Response(JSON.stringify(o), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*' },
  });
}

export default async function handler() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) return json([]);
  try {
    const r = await fetch(
      `${url}/rest/v1/feedback_submissions?type=eq.post_results&featured=eq.true&select=text,submitted_at&order=submitted_at.desc&limit=12`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const rows = await r.json();
    const out = [];
    for (const row of (Array.isArray(rows) ? rows : [])) {
      let p = {}; try { p = typeof row.text === 'string' ? JSON.parse(row.text) : row.text; } catch {}
      const a = (p && p.answers) || {};
      const t = String(a.testimonial || '').trim();
      if (!t) continue;
      const name = String((p && p.userName) || '').trim() || 'A verified couple';
      out.push({ text: '“' + t + '”', name, detail: 'Verified Attune couple' });
    }
    return json(out);
  } catch (e) { return json([]); }
}
