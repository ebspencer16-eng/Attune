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
 *   beta_delete  { code }                  → remove a beta code from the table
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
import { SITE_URL } from './_lib/site.js';
import { selectProfiles } from './_lib/demo-accounts.js';

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
    /* Ellie (A208f): a bin on each row that "should delete the promo code row
       from the table, but should not revoke access from the users who used
       that code". Nothing grants from this table: what somebody owns is read
       from their order (api/_lib/entitlements.js), which keeps the code's name
       in promo_code. So deleting the row stops the code being accepted and
       takes nothing from anyone. check-promo-delete holds that. */
    if (body.action === 'beta_delete') {
      const code = String(body.code || '').slice(0, 64);
      if (!code) return json({ error: 'Missing code' }, 400);
      const { data, error } = await admin.from('beta_codes').delete().eq('code', code).select('code');
      if (error) return json({ error: safeError('admin-actions', error, 'Action failed.') }, 500);
      if (!data?.length) return json({ error: 'That code was not in the table.' }, 404);
      return json({ ok: true });
    }

    if (body.action === 'beta_toggle') {
      const code = String(body.code || '').slice(0, 64);
      if (!code) return json({ error: 'Missing code' }, 400);
      const { error } = await admin.from('beta_codes').update({ active: !!body.active }).eq('code', code);
      if (error) return json({ error: safeError('admin-actions', error, 'Action failed.') }, 500);
      return json({ ok: true });
    }

    /**
     * ── WHO IS STUCK WAITING FOR A PARTNER ──────────────────────────────
     * A partner email on the account, a code of their own, and nobody joined.
     * That is exactly the set that cannot get any further on their own.
     *
     * It answers with an id and a code and NOTHING ELSE. No name, no address.
     * The admin page carries a banner saying it holds none of those, and the
     * anonymised cube is built to keep that true; a list like this is where it
     * would quietly stop being true. The page shows a count and a button, the
     * server does the lookup, and the address never leaves here.
     *
     * The code is not an identity. It is a share token the owner puts in a
     * link, and the operator needs to see something to tell two rows apart.
     */
    if (body.action === 'waiting_partners') {
      /* Through selectProfiles, like every other admin read of this table.
         Not only so Alex and Sam stay out of the list: a demo account has a
         partner email on it, and the button beside it would send a real
         invitation to a made-up couple. */
      const { data: rows, error: wErr } = await selectProfiles(admin, (q) =>
        q.select('id, invite_code, partner_joined, partner_email, joined_via_invite'));
      if (wErr) return json({ error: safeError('admin-actions', wErr, 'Could not read who is waiting.') }, 500);
      const waiting = (rows || [])
        .filter((p) => p.partner_email && p.invite_code && !p.partner_joined && !p.joined_via_invite)
        .map((p) => ({ id: p.id, inviteCode: p.invite_code }));
      return json({ ok: true, waiting });
    }

    /**
     * ── SEND SOMEBODY THEIR PARTNER INVITE ──────────────────────────────
     * Ellie, of Rebecca: "Just send for Abram."
     *
     * The partner invite email is sent from six places in src/App.jsx and from
     * nowhere else, so a couple whose first partner set up in the app has a
     * code and no way to use it. Rebecca is the first of those; she will not
     * be the last until the app has a screen for it, which is S76.
     *
     * The URL is built here rather than on the page, because the page would be
     * guessing at a route the website owns. It is the same shape the website
     * builds: the code, who it is from, and both addresses so the invitee is
     * matched to the right couple on arrival.
     *
     * No new mail path. It posts to /api/send-email with the internal secret,
     * which is the server-to-server route that already exists and that
     * api/generate-workbook-promo.js uses. A second sender would be a second
     * copy of the from address, the retry and the dev-mode fallback.
     */
    if (body.action === 'send_partner_invite') {
      const userId = String(body.userId || '').trim();
      const code = String(body.inviteCode || '').trim().toUpperCase();
      if (!userId && !code) return json({ error: 'Need a person to send for.' }, 400);

      /* Through the gateway too, so a demo account cannot be the one this
         sends for even if its id is passed in directly. */
      const { data: rows, error: readErr } = await selectProfiles(admin, (q) => {
        const sel = q.select('id, name, partner_name, partner_email, invite_code, partner_joined');
        return userId ? sel.eq('id', userId) : sel.eq('invite_code', code);
      });
      /* Read the error. supabase-js returns it rather than throwing, so a
         `try` around this catches nothing and a broken query looks exactly
         like nobody matching. */
      if (readErr) return json({ error: safeError('admin-actions', readErr, 'Could not look that person up.') }, 500);
      const p = (rows || [])[0];
      if (!p) return json({ error: 'No account matches that.' }, 404);
      if (!p.partner_email) return json({ error: 'That account has no partner email on it, so there is nobody to send to.' }, 400);
      if (!p.invite_code) return json({ error: 'That account has no invite code. Run migration 094.' }, 400);
      if (p.partner_joined) return json({ error: 'Their partner has already joined.' }, 409);

      const site = SITE_URL.replace(/\/$/, '');
      const inviteUrl = `${site}/app?invite=${encodeURIComponent(p.invite_code)}`
        + `&from=${encodeURIComponent(p.name || '')}`
        + `&iie=${encodeURIComponent(String(p.partner_email).toLowerCase())}`;

      const res = await fetch(`${site}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-attune-internal': process.env.INTERNAL_API_SECRET || '' },
        body: JSON.stringify({
          type: 'partner_invite',
          fromName: p.name || 'Your partner',
          toEmail: p.partner_email,
          toName: p.partner_name || 'there',
          inviteUrl,
        }),
      });
      const out = await res.json().catch(() => ({}));
      /* `mock: true` is send-email with no RESEND_API_KEY, which is a real
         answer and not a sent email. Said out loud rather than reported as
         success, because "it said it sent" is how nobody chases it. */
      if (!res.ok || out.ok === false) {
        return json({ error: 'The invite could not be sent. ' + (out.error ? JSON.stringify(out.error).slice(0, 200) : 'Status ' + res.status) }, 502);
      }
      /* No address in the answer. The admin page's own banner promises "no
         names, email addresses, or personally identifiable information are
         present in any dataset shown here", and a success message naming the
         recipient would quietly make that untrue. */
      return json({ ok: true, mock: !!out.mock });
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
       * Conflict Patterns has a column since migration 106 (A208g), and every
       * half that honours a bundled add-on reads it: codeMetaFromRow, the
       * price, the tax, validate-promo and the checkout page.
       */
      if ('includes_reflection' in row) clean.includes_reflection = !!row.includes_reflection;
      if ('includes_budget' in row)     clean.includes_budget = !!row.includes_budget;
      if ('includes_checklist' in row)  clean.includes_checklist = !!row.includes_checklist;
      if ('includes_intimacy' in row)   clean.includes_intimacy = !!row.includes_intimacy;
      if ('includes_conflict' in row)   clean.includes_conflict = !!row.includes_conflict;
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
