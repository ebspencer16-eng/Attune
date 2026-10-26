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

import { corsHeaders, safeError, jsonBody } from './_lib/http.js';

import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth } from './_lib/admin-auth.js';

// No Access-Control-Allow-Origin.
//
// This answered `*`. The admin page fetches it with a relative URL from the
// same origin, so CORS never applied to the only caller it has; the wildcard
// was permission granted to the whole internet for nothing in return.
// Emitting no header is stricter than an allowlist: a cross-origin read is
// refused by the browser outright. corsHeaders takes a request when an
// endpoint genuinely needs to answer another origin.
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: corsHeaders(),
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
  const _parsed = await jsonBody(req);
  if (_parsed.error) return _parsed.error;
  body = _parsed.body;

  try {
    if (body.action === 'beta_toggle') {
      const code = String(body.code || '').slice(0, 64);
      if (!code) return json({ error: 'Missing code' }, 400);
      const { error } = await admin.from('beta_codes').update({ active: !!body.active }).eq('code', code);
      if (error) return json({ error: safeError('admin-actions', error, 'Action failed.') }, 500);
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
      /**
       * ── THE OTHER FOUR ADD-ONS ──────────────────────────────────────────
       * `codeMetaFromRow` in api/_lib/beta-codes.js reads all five
       * `includes_*` columns, and the checkout and the tax endpoint both act
       * on all five. This allowlist carried only the workbook, so a code built
       * here could never give away Reflection, the Budget, the Checklist or
       * Physical Intimacy, however the form was filled in: the write dropped
       * the field silently and the code shipped bundling nothing.
       *
       * Found while building the admin's own create-a-code form, which is the
       * first thing that has ever written one of these rows from a page.
       *
       * Conflict Patterns is deliberately absent, because codeMetaFromRow does
       * not read a column for it and there is none on the table. Adding the
       * field here without the half that honours it would be a control that
       * looks like it works.
       */
      if ('includes_reflection' in row) clean.includes_reflection = !!row.includes_reflection;
      if ('includes_budget' in row)     clean.includes_budget = !!row.includes_budget;
      if ('includes_checklist' in row)  clean.includes_checklist = !!row.includes_checklist;
      if ('includes_intimacy' in row)   clean.includes_intimacy = !!row.includes_intimacy;
      if ('workbook_variant' in row)  clean.workbook_variant = row.workbook_variant == null ? null : String(row.workbook_variant).slice(0, 20);
      if ('max_uses' in row)          clean.max_uses = row.max_uses == null ? null : (Number(row.max_uses) || null);
      if ('expires_at' in row)        clean.expires_at = row.expires_at || null;
      if ('note' in row)              clean.note = String(row.note || '').slice(0, 300);
      const { error } = await admin.from('beta_codes').upsert(clean, { onConflict: 'code' });
      if (error) return json({ error: safeError('admin-actions', error, 'Action failed.') }, 500);
      return json({ ok: true });
    }


    /* Featuring a quote on the homepage lives in /api/admin-survey now, next
       to the answer it publishes. The action that was here set a flag on a
       feedback_submissions row, and the only page that called it is gone with
       the survey those rows held. */

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
}
