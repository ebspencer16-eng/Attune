// Shared Explore presets (list / save / delete). Admin-auth guarded; writes via
// the Supabase service key. Backed by table public.admin_presets (migration 036).
import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth } from './_lib/admin-auth.js';

const HEADERS = { 'Content-Type': 'application/json' };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: HEADERS });

export default async function handler(req) {
  const auth = checkAdminAuth(req);
  if (!auth.ok) return new Response(auth.body, { status: auth.status, headers: HEADERS });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) return json({ ok: false, error: 'Supabase env vars missing' }, 500);
  const db = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    if (req.method === 'GET') {
      const { data, error } = await db
        .from('admin_presets')
        .select('id,name,config,is_default,created_at')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return json({ ok: true, presets: data || [] });
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const name = (body.name || '').toString().trim().slice(0, 80);
      const config = body.config;
      if (!name || !config || typeof config !== 'object') return json({ ok: false, error: 'name and config required' }, 400);
      const { data, error } = await db
        .from('admin_presets')
        .insert({ name, config, is_default: false })
        .select('id,name,config,is_default,created_at')
        .single();
      if (error) throw error;
      return json({ ok: true, preset: data });
    }

    if (req.method === 'DELETE') {
      let id = '';
      try { id = new URL(req.url).searchParams.get('id') || ''; } catch { /* no url */ }
      if (!id) { const b = await req.json().catch(() => ({})); id = b.id || ''; }
      if (!id) return json({ ok: false, error: 'id required' }, 400);
      const { error } = await db.from('admin_presets').delete().eq('id', id);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ ok: false, error: 'method not allowed' }, 405);
  } catch (e) {
    return json({ ok: false, error: (e && e.message) || String(e) }, 500);
  }
}
