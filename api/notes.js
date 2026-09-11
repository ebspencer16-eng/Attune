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
 *   POST { action: 'createTag' } a tag of your own. No standard_key: that is a
 *                              promise the name follows a list, and this one
 *                              follows a person.
 *   POST { action: 'create' }  a note or annotation
 *   POST { action: 'update' }  edit your own; a shared note stays editable only by its author
 *   POST { action: 'open' }    mark a note your PARTNER shared as seen. The one
 *                              write here that touches a row you do not own, and
 *                              the only column it can set is opened_at.
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
import { isValidAnnotation } from './_lib/annotations.js';
import { RESULTS_SECTION_LABELS } from './_lib/results-sections.js';
import { capabilitiesFor, OWNERSHIP_COLUMNS } from './_lib/ownership.js';

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: HEADERS });

/** Canonical couple key, so both partners compute the same string. */
const coupleKeyOf = (a, b) => [a, b].sort().join(':');

/** Note and tag ids are uuids. Anything else is a malformed request. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    const pRes = await rest(`profiles?id=eq.${me}&select=partner_profile_id,${OWNERSHIP_COLUMNS.join(',')}`, { headers: svc });
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
      let mine = await mineRes.json().catch(() => []);

      let shared = [];
      if (coupleKey) {
        const sRes = await rest(
          `notes?couple_key=eq.${encodeURIComponent(coupleKey)}&visibility=eq.shared&owner_id=neq.${me}&select=*&order=updated_at.desc`,
          { headers: svc });
        shared = await sRes.json().catch(() => []);
      }

      // Which tags are on which note.
      //
      // Notes came back with no tags at all, so nothing could show or change
      // them: a note could be tagged at creation and then the tags were
      // invisible forever. Read in one query over the notes already fetched
      // rather than per note.
      const allIds = [...mine, ...shared].map(n => n.id);
      const tagsByNote = {};
      if (allIds.length) {
        const inList = allIds.map(id => `"${encodeURIComponent(id)}"`).join(',');
        const ntRes = await rest(`note_tags?note_id=in.(${inList})&select=note_id,tag_id`, { headers: svc });
        for (const row of (await ntRes.json().catch(() => []))) {
          (tagsByNote[row.note_id] ||= []).push(row.tag_id);
        }
      }
      const withTags = (n) => ({ ...n, tagIds: tagsByNote[n.id] || [] });
      mine = mine.map(withTags);
      shared = shared.map(withTags);
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
        // Premium bundles Conflict Patterns, not Physical Intimacy. This line
        // said otherwise, so a premium buyer who had never bought intimacy got
        // seeded the six intimacy tags, permanently, on first opening Notes.
        const { ownsIntimacy } = capabilitiesFor(profile);
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
      return json({
        ok: true,
        tags,
        /**
         * What each results section is called.
         *
         * Sent with the tags because this is the reference data the notes
         * screen needs to turn an anchor into a heading, and it is the same
         * round trip. The app kept its own map and had no labels for the five
         * expectations conversations or the six intimacy dimensions, because
         * both are generated from the live lists and cannot be written out by
         * hand without going stale. An annotation on one of them read as a raw
         * key.
         */
        sections: RESULTS_SECTION_LABELS,
      });
    }

    if (req.method !== 'POST') return json({ ok: false, error: 'unsupported action' }, 400);

    // ── Write ──────────────────────────────────────────────────────────────
    /**
     * A tag the person makes themselves.
     *
     * ── WHY IT HAS NO standard_key ────────────────────────────────────────
     * The seeded tags carry one, `dim:conflict` and so on, which is how an
     * annotation's anchor gets a label without the app holding a copy of the
     * dimension list. A tag someone types is not any of those and must not
     * claim to be: a standard_key is a promise that the name follows a list,
     * and this name follows a person.
     *
     * ── ON DUPLICATES ─────────────────────────────────────────────────────
     * There is a unique index on (owner_id, lower(name)). Adding a tag that
     * already exists returns the existing one rather than an error, because
     * from the reader's side "I want a tag called Money" is satisfied either
     * way, and an error here would be the product arguing about bookkeeping.
     */
    if (action === 'createTag') {
      const name = String(body.name || '').trim();
      if (!name) return json({ ok: false, error: 'a tag needs a name' }, 400);
      if (name.length > 40) return json({ ok: false, error: 'that name is too long' }, 400);

      const r = await rest('tags', {
        method: 'POST',
        headers: { ...jsonHeaders, Prefer: 'return=representation,resolution=merge-duplicates' },
        body: JSON.stringify({ owner_id: me, name, color: body.color || null, standard_key: null }),
      });
      let tag = (await r.json().catch(() => []))?.[0] || null;
      if (!tag) {
        // merge-duplicates needs a matching unique constraint to resolve
        // against; the index here is on lower(name), which it cannot use. So
        // the insert can come back empty on a name that already exists, and
        // the existing row is the right answer.
        const ex = await rest(
          `tags?owner_id=eq.${me}&name=ilike.${encodeURIComponent(name)}&select=*&limit=1`,
          { headers: svc },
        );
        tag = (await ex.json().catch(() => []))?.[0] || null;
      }
      if (!tag) return json({ ok: false, error: 'create failed' }, 500);
      return json({ ok: true, tag });
    }

    if (action === 'create') {
      const { anchorType = null, anchorKey = null } = body;
      if (!isValidAnchor(anchorType, anchorKey)) {
        return json({ ok: false, error: 'invalid anchor' }, 400);
      }
      /**
       * What kind of mark this is, and what colour.
       *
       * Validated together, because they constrain each other: a plain note
       * takes no colour and a highlight cannot be drawn without one. Rejected
       * rather than coerced, so a client sending a colour this product does not
       * offer hears about it, instead of it silently becoming amber on one
       * surface and nothing on the other.
       */
      const kind = body.kind || 'note';
      const color = body.color ?? null;
      if (!isValidAnnotation(kind, color)) {
        return json({ ok: false, error: 'invalid annotation kind or colour' }, 400);
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
        kind,
        color,
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
      // Shape-checked before it goes anywhere near a URL. notes.id is a uuid,
      // so anything else is a malformed request rather than a note that does
      // not exist, and saying so is better than building a query around it.
      if (!body.id || !UUID_RE.test(String(body.id))) {
        return json({ ok: false, error: 'missing or invalid id' }, 400);
      }
      const noteId = encodeURIComponent(String(body.id));
      // owner_id in the filter is the authorisation: another person's note
      // simply matches nothing rather than erroring in a way that confirms it
      // exists.
      const scope = `notes?id=eq.${noteId}&owner_id=eq.${me}`;

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
        /**
         * Recolouring a mark, or changing your mind about whether it is a
         * highlight or an underline.
         *
         * Both must be sent together. The two constrain each other, so
         * validating one against a value read from the row would mean reading
         * the row first, and accepting one without the other would let a
         * highlight end up with no colour, which cannot be drawn.
         */
        if (body.kind !== undefined || body.color !== undefined) {
          if (body.kind === undefined) {
            return json({ ok: false, error: 'kind and color must be sent together' }, 400);
          }
          const nextColor = body.color ?? null;
          if (!isValidAnnotation(body.kind, nextColor)) {
            return json({ ok: false, error: 'invalid annotation kind or colour' }, 400);
          }
          patch.kind = body.kind;
          patch.color = nextColor;
        }
      }
      const r = await rest(scope, {
        method: 'PATCH', headers: { ...jsonHeaders, Prefer: 'return=representation' },
        body: JSON.stringify(patch),
      });
      const rows = await r.json().catch(() => []);
      if (!rows.length) return json({ ok: false, error: 'not found' }, 404);

      // Tags could only ever be set when a note was created, so there was no
      // way to add or remove one afterwards. Replaced wholesale rather than
      // diffed: the client sends the set it wants, which is what a chip picker
      // produces, and a diff would need the client to know what is already
      // there and be right about it.
      if (action === 'update' && Array.isArray(body.tagIds)) {
        await rest(`note_tags?note_id=eq.${noteId}`, { method: 'DELETE', headers: svc });
        if (body.tagIds.length) {
          await rest('note_tags', {
            method: 'POST',
            headers: { ...jsonHeaders, Prefer: 'return=minimal,resolution=ignore-duplicates' },
            body: JSON.stringify(body.tagIds.map(t => ({ note_id: body.id, tag_id: t }))),
          });
        }
      }
      return json({ ok: true, note: { ...rows[0], tagIds: body.tagIds ?? undefined } });
    }

    /**
     * Mark a note your partner shared with you as opened.
     *
     * ── WHY THIS IS ITS OWN ACTION ────────────────────────────────────────
     * Every other write on this endpoint is scoped by `owner_id=eq.me`, which
     * is what makes them safe: another person's note matches nothing. This one
     * is the exact opposite. The whole point is to write to a row somebody else
     * owns, so it cannot reuse that scope and must not be folded into `update`,
     * where a future edit would inherit the wrong filter.
     *
     * It is safe for a different reason, stated here so it stays true: the
     * filter is the couple key, the row must be shared, and the owner must NOT
     * be the caller. So the only rows reachable are ones the caller's partner
     * deliberately shared with the caller, and the only column written is a
     * timestamp saying it was seen. Nothing about the note's content can be
     * touched through this path.
     */
    if (action === 'open') {
      if (!body.id || !UUID_RE.test(String(body.id))) {
        return json({ ok: false, error: 'missing or invalid id' }, 400);
      }
      if (!coupleKey) return json({ ok: false, error: 'no partner linked' }, 400);
      const r = await rest(
        `notes?id=eq.${encodeURIComponent(String(body.id))}`
        + `&couple_key=eq.${encodeURIComponent(coupleKey)}`
        + `&visibility=eq.shared&owner_id=neq.${me}&opened_at=is.null`,
        {
          method: 'PATCH',
          headers: { ...jsonHeaders, Prefer: 'return=representation' },
          body: JSON.stringify({ opened_at: new Date().toISOString() }),
        },
      );
      const rows = await r.json().catch(() => []);
      // Nothing matched is the normal case on a second open, not a failure.
      return json({ ok: true, opened: rows.length });
    }

    return json({ ok: false, error: 'unsupported action' }, 400);
  } catch (e) {
    console.error('[notes] failed:', e);
    return json({ ok: false, error: 'notes unavailable' }, 500);
  }
}
