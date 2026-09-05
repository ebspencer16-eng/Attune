/**
 * /api/notes
 *
 * Notes, annotations, folders and tags. One endpoint with an action, rather
 * than five routes, because they share auth, the couple lookup, and the rules
 * about what a partner may see.
 *
 * ACTIONS
 *   GET  ?action=list          own notes plus notes shared with you
 *   GET  ?action=tags          your tags, seeded on first call
 *   POST { action: 'create' }  a note or annotation
 *   POST { action: 'update' }  edit your own; a shared note stays editable only by its author
 *   POST { action: 'delete' }  your own only
 *   POST { action: 'share' }   flip visibility
 *
 * RULES THAT MATTER
 *   - You may read your own notes and notes your partner shared with you. There
 *     is no third state and no way to read anyone else's.
 *   - Only the author edits or deletes. A shared note is readable by the
 *     partner, not writable: co-editing is a different feature with different
 *     conflict handling, and pretending otherwise loses someone's words.
 *   - Anchors are validated on write. A bad anchor is invisible until someone
 *     opens the note months later and it points at nothing.
 *   - Identity comes from the verified token, never from the request body.
 */

export const config = { runtime: 'edge' };

import { isValidAnchor, standardTags } from './_lib/tags.js';

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: HEADERS });

/** Canonical couple key, so both partners compute the same string. */
const coupleKeyOf = (a, b) => [a, b].sort().join(':');

export default async function handler(req) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || serviceKey;
  if (!supabaseUrl || !serviceKey) return json({ ok: false, error: 'Server not configured' }, 500);

  const token = (req.headers.get('authorization') || req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ ok: false, error: 'missing auth token' }, 401);

  try {
    const uRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    });
    if (!uRes.ok) return json({ ok: false, error: 'invalid auth token' }, 401);
    const user = await uRes.json().catch(() => null);
    if (!user?.id) return json({ ok: false, error: 'invalid auth token' }, 401);
    const me = user.id;

    const svc = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    const jsonHeaders = { ...svc, 'Content-Type': 'application/json' };
    const rest = (path, init) => fetch(`${supabaseUrl}/rest/v1/${path}`, init);

    // Partner, for the couple key and for reading what they shared.
    const pRes = await rest(`profiles?id=eq.${me}&select=partner_profile_id,pkg,addon_intimacy`, { headers: svc });
    const profile = (await pRes.json().catch(() => []))?.[0] || {};
    const partnerId = profile.partner_profile_id || null;
    const coupleKey = partnerId ? coupleKeyOf(me, partnerId) : null;

    const url = new URL(req.url);
    // Read the body exactly once. Reading it, then cloning to read again, gives
    // an empty object on the second read because the stream is already
    // consumed, and every field silently arrives undefined.
    const body = req.method === 'GET' ? {} : await req.json().catch(() => ({}));
    const action = req.method === 'GET'
      ? (url.searchParams.get('action') || 'list')
      : body.action;

    // ── Read ───────────────────────────────────────────────────────────────
    if (req.method === 'GET' && action === 'list') {
      const mineRes = await rest(`notes?owner_id=eq.${me}&select=*&order=updated_at.desc`, { headers: svc });
      const mine = await mineRes.json().catch(() => []);

      let shared = [];
      if (coupleKey) {
        const sRes = await rest(
          `notes?couple_key=eq.${encodeURIComponent(coupleKey)}&visibility=eq.shared&owner_id=neq.${me}&select=*&order=updated_at.desc`,
          { headers: svc });
        shared = await sRes.json().catch(() => []);
      }
      // Annotations separated out, because the app lists them by what they are
      // attached to rather than chronologically.
      return json({
        ok: true,
        notes: mine.filter(n => !n.anchor_type),
        annotations: mine.filter(n => n.anchor_type),
        sharedWithMe: shared,
      });
    }

    if (req.method === 'GET' && action === 'tags') {
      const tRes = await rest(`tags?owner_id=eq.${me}&select=*&order=created_at.asc`, { headers: svc });
      let tags = await tRes.json().catch(() => []);

      // Seed on first use rather than at signup, so a person who never opens
      // Notes never gets rows, and the seed always reflects current dimensions.
      if (!tags.length) {
        const ownsIntimacy = profile.pkg === 'premium' || !!profile.addon_intimacy;
        const rows = standardTags({ ownsIntimacy }).map(t => ({
          owner_id: me, name: t.name, color: t.color, standard_key: t.standard_key,
        }));
        await rest('tags', {
          method: 'POST',
          headers: { ...jsonHeaders, Prefer: 'return=minimal,resolution=ignore-duplicates' },
          body: JSON.stringify(rows),
        });
        const again = await rest(`tags?owner_id=eq.${me}&select=*&order=created_at.asc`, { headers: svc });
        tags = await again.json().catch(() => []);
      }
      return json({ ok: true, tags });
    }

    if (req.method !== 'POST') return json({ ok: false, error: 'unsupported action' }, 400);

    // ── Write ──────────────────────────────────────────────────────────────
    if (action === 'create') {
      const { anchorType = null, anchorKey = null } = body;
      if (!isValidAnchor(anchorType, anchorKey)) {
        return json({ ok: false, error: 'invalid anchor' }, 400);
      }
      const shared = body.visibility === 'shared';
      if (shared && !coupleKey) {
        // Sharing with nobody is a silent no-op that looks like success.
        return json({ ok: false, error: 'no partner linked to share with' }, 400);
      }
      const row = {
        owner_id: me,
        folder_id: body.folderId || null,
        visibility: shared ? 'shared' : 'private',
        couple_key: shared ? coupleKey : null,
        title: body.title || null,
        body: body.body || '',
        anchor_type: anchorType,
        anchor_key: anchorKey,
        anchor_context: body.anchorContext || null,
        anchor_version: body.anchorVersion ?? null,
      };
      const r = await rest('notes', {
        method: 'POST', headers: { ...jsonHeaders, Prefer: 'return=representation' },
        body: JSON.stringify(row),
      });
      if (!r.ok) return json({ ok: false, error: 'create failed' }, 500);
      const created = (await r.json().catch(() => []))?.[0] || null;

      if (created && Array.isArray(body.tagIds) && body.tagIds.length) {
        await rest('note_tags', {
          method: 'POST', headers: { ...jsonHeaders, Prefer: 'return=minimal,resolution=ignore-duplicates' },
          body: JSON.stringify(body.tagIds.map(t => ({ note_id: created.id, tag_id: t }))),
        });
      }
      return json({ ok: true, note: created });
    }

    if (action === 'update' || action === 'share' || action === 'delete') {
      if (!body.id) return json({ ok: false, error: 'missing id' }, 400);
      // owner_id in the filter is the authorisation: another person's note
      // simply matches nothing rather than erroring in a way that confirms it
      // exists.
      const scope = `notes?id=eq.${body.id}&owner_id=eq.${me}`;

      if (action === 'delete') {
        const r = await rest(scope, { method: 'DELETE', headers: { ...svc, Prefer: 'return=representation' } });
        const gone = await r.json().catch(() => []);
        return json({ ok: true, deleted: gone.length });
      }

      const patch = { updated_at: new Date().toISOString() };
      if (action === 'share') {
        const shared = body.visibility === 'shared';
        if (shared && !coupleKey) return json({ ok: false, error: 'no partner linked to share with' }, 400);
        patch.visibility = shared ? 'shared' : 'private';
        patch.couple_key = shared ? coupleKey : null;
      } else {
        if (body.title !== undefined) patch.title = body.title;
        if (body.body !== undefined) patch.body = body.body;
        if (body.folderId !== undefined) patch.folder_id = body.folderId || null;
      }
      const r = await rest(scope, {
        method: 'PATCH', headers: { ...jsonHeaders, Prefer: 'return=representation' },
        body: JSON.stringify(patch),
      });
      const rows = await r.json().catch(() => []);
      if (!rows.length) return json({ ok: false, error: 'not found' }, 404);
      return json({ ok: true, note: rows[0] });
    }

    return json({ ok: false, error: 'unsupported action' }, 400);
  } catch (e) {
    console.error('[notes] failed:', e);
    return json({ ok: false, error: 'notes unavailable' }, 500);
  }
}
