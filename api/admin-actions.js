/**
 * /api/admin-actions
 *
 * POST ?secret=ADMIN_SECRET  { action, ...params }
 *
 * Service-role writes for the admin dashboard. The admin page previously
 * wrote beta_codes through PostgREST with the anon key;
 * RLS (migration 010) blocks those writes. Same gate as the other admin
 * endpoints.
 *
 * Actions:
 *   beta_toggle  { code, active }          → set beta code active flag
 *   beta_upsert  { row }                   → insert/update a beta code (by code)
 */

export const config = { runtime: 'edge' };

import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth } from './_lib/admin-auth.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}


export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = new URL(req.url);
  const _auth = checkAdminAuth(req);
  if (!_auth.ok) return json({ error: _auth.error }, _auth.status);

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_ROLE;
  if (!SUPABASE_URL || !SUPABASE_KEY) return json({ error: 'Supabase env vars missing' }, 500);
  const admin = createClient(SUPABASE_URL, SUPABASE_KEY);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  try {
    if (body.action === 'beta_toggle') {
      const code = String(body.code || '').slice(0, 64);
      if (!code) return json({ error: 'Missing code' }, 400);
      const { error } = await admin.from('beta_codes').update({ active: !!body.active }).eq('code', code);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === 'beta_upsert') {
      const row = body.row || {};
      const code = String(row.code || '').trim().toUpperCase().slice(0, 64);
      if (!code) return json({ error: 'Missing code' }, 400);
      // Validated allow-list of writable fields; nothing else passes through.
      const clean = { code };
      if ('package_key' in row)       clean.package_key = String(row.package_key || 'core').slice(0, 30);
      if ('active' in row)            clean.active = !!row.active;
      if ('discount_mode' in row)     clean.discount_mode = ['percent', 'fixed', 'free'].includes(row.discount_mode) ? row.discount_mode : 'free';
      if ('discount_value' in row)    clean.discount_value = Number(row.discount_value) || 0;
      if ('applies_to' in row)        clean.applies_to = String(row.applies_to || '').slice(0, 60);
      if ('includes_workbook' in row) clean.includes_workbook = !!row.includes_workbook;
      if ('workbook_variant' in row)  clean.workbook_variant = row.workbook_variant == null ? null : String(row.workbook_variant).slice(0, 20);
      if ('max_uses' in row)          clean.max_uses = row.max_uses == null ? null : (Number(row.max_uses) || null);
      if ('expires_at' in row)        clean.expires_at = row.expires_at || null;
      if ('note' in row)              clean.note = String(row.note || '').slice(0, 300);
      const { error } = await admin.from('beta_codes').upsert(clean, { onConflict: 'code' });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }


    if (body.action === 'feature_testimonial') {
      const id = body.id;
      if (!id) return json({ error: 'Missing id' }, 400);
      const { error } = await admin.from('feedback_submissions').update({ featured: !!body.featured }).eq('id', id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
}
