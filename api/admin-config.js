/**
 * GET /api/admin-config
 * Returns non-secret config needed by admin.html at runtime.
 * The Supabase anon key is safe to expose — it's protected by RLS.
 * The admin page itself is protected by a separate password gate.
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

export default function handler(req) {
  const url  = process.env.VITE_SUPABASE_URL  || process.env.SUPABASE_URL  || '';
  const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  return new Response(JSON.stringify({ supabaseUrl: url, supabaseAnon: anon }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
