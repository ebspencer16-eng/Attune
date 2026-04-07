/**
 * GET /api/admin-config
 * Returns non-secret config needed by admin.html at runtime.
 * The Supabase anon key is safe to expose — it's protected by RLS.
 * The admin page itself is protected by a separate password gate.
 */
export const config = { runtime: 'edge' };

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
