import { createClient } from '@supabase/supabase-js';

// Frontend client — uses anon key, subject to Row Level Security
// Env vars must be prefixed VITE_ to be exposed to the browser bundle
const url  = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.warn('[Attune] Supabase env vars not set — auth will run in localStorage-only mode.');
}

export const supabase = (url && anon)
  ? createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,  // handles magic links / password reset redirects
      },
    })
  : null;

// Returns true if Supabase is configured
export const hasSupabase = () => !!supabase;
