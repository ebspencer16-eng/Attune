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

/**
 * ── AND WHERE IT RUNS ─────────────────────────────────────────────────────
 * Pinned next to the database. An edge function runs near whoever is asking,
 * which is the right default when the answer is already at the edge and the
 * wrong one when every answer comes from one database somewhere else: the
 * request landed in San Francisco and each read crossed the country.
 *
 * Measured, not guessed any more. Pinning the home screen's endpoints took a
 * lookup by primary key from 200-600ms to 98ms, which is same-region speed.
 * See api/_lib/db-region.js for the one place that says where, and
 * check-edge-region.mjs, which holds every endpoint the app calls to it.
 */
export const config = { runtime: 'edge', regions: ['iad1'] };

import { jsonBody } from './_lib/http.js';
import { isValidAnchor, JOURNAL_ANCHOR, standardTags, TAG_SUGGESTIONS, TAG_PLACEHOLDER } from './_lib/tags.js';
import { isValidAnnotation } from './_lib/annotations.js';
import { RESULTS_SECTION_LABELS } from './_lib/results-sections.js';
import { recordNotification } from './_lib/notifications.js';
import { capabilitiesFor, OWNERSHIP_COLUMNS } from './_lib/ownership.js';
import { coupleKeyOf } from './_lib/couple-key.js';
import { userForRequest } from './_lib/verify-token.js';
import { restAll } from './_lib/page-all.js';

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: HEADERS });


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
    /**
     * ── WHO THIS IS, WITHOUT A ROUND TRIP ─────────────────────────────
     * Identity comes from the verified token, never from the request body.
     *
     * This was a fetch to Supabase asking who the token belonged to,
     * before any work started, on every request. Ellie: "My pages are
     * still taking a long time to load." Measured at 6.3s for this
     * endpoint on a cold launch against 238ms for a static file in the
     * same run, so the time was here.
     *
     * The token is a JWT signed with the project's own key and the
     * project publishes the public half, so it is checked in memory.
     * The round trip is still the fall-back for anything the local
     * check cannot decide. See api/_lib/verify-token.js.
     */
    const user = await userForRequest({ token: token, supabaseUrl, anonKey });
    if (!user?.id) return json({ ok: false, error: 'invalid auth token' }, 401);
    const me = user.id;

    const svc = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    const jsonHeaders = { ...svc, 'Content-Type': 'application/json' };
    const rest = (path, init) => fetch(`${supabaseUrl}/rest/v1/${path}`, init);

    // Partner, for the couple key and for reading what they shared.
    /**
     * ── THE READER'S OWN NOTES DO NOT WAIT FOR THEIR PROFILE ────────────
     * Ellie: "can we make it faster?"
     *
     * This list was auth, then the profile, then the reader's notes, then the
     * couple's shared ones, then the tags: five round trips, and the third of
     * them needed nothing the second provided. `owner_id` is the id the token
     * already gave us.
     *
     * The profile is still needed, for the couple key the shared query filters
     * on and for the ownership columns. It is simply no longer in front of
     * this.
     *
     * Started here and awaited below. `.catch` where it is created, because a
     * promise that rejects before anything is waiting on it is an unhandled
     * rejection.
     */
    /**
     * Only for the read this belongs to.
     *
     * The first version started it on every request, which put a notes query
     * in front of every save, every tag edit and every delete: faster on one
     * path and a wasted round trip on nine. The action is readable from the
     * query string before anything is parsed, which is all this needs.
     */
    /**
     * ── THE COLUMNS THE APP ACTUALLY READS ──────────────────────────────
     * Named, not `*`.
     *
     * A sweep of every query in api/ that reads a table which grows with use
     * turned this up: both notes reads asked for every column, and two of
     * them are read by nothing. `folder_id` is from a feature that was never
     * built, and `couple_key` is two user ids joined together, which has no
     * business on a phone at all: nothing in the app or the website reads it
     * and it identifies the pair.
     *
     * Seventeen per cent off every notes payload, which at two hundred notes
     * is twenty kilobytes a person stops downloading every time they open the
     * tab. The list is the app's own Note type, so a field it adds has to be
     * added here, which is the trade for not sending two it never asked for.
     */
    const NOTE_COLS = 'id,owner_id,title,body,visibility,anchor_type,anchor_key,anchor_context,anchor_version,kind,color,opened_at,created_at,updated_at';

    const url = new URL(req.url);
    /**
     * The reader's own notes, asked for before the profile read because they
     * need nothing from it.
     *
     * Only when the caller wants all of them. A caller that asked for a limit,
     * or for one tag, gets a different query inside the list branch, and firing
     * this one as well would be a full download nobody reads: the request a
     * limit exists to avoid, made anyway, in parallel.
     */
    const listing = req.method === 'GET'
      && (url.searchParams.get('action') || 'list') === 'list';
    const narrowed = !!url.searchParams.get('limit') || !!url.searchParams.get('tagId');
    /* Every row, in pages. One request stopped at the 1,000 most recently
       touched, so somebody with more saw their oldest notes vanish and their
       journal and tag counts stop growing (A170). Wrapped as a Response so
       the code below reads it the way it reads every other list; a failed
       page is a 503, which the check below refuses on. */
    const everyRow = (path) => restAll(supabaseUrl, serviceKey, path).then((r) => (r.error
      ? new Response(JSON.stringify({ message: r.error }), { status: 503 })
      : new Response(JSON.stringify(r.rows), { status: 200, headers: { 'content-type': 'application/json' } })));
    const myNotes = listing && !narrowed
      ? everyRow(`notes?owner_id=eq.${me}&select=${NOTE_COLS}&order=updated_at.desc,id`).catch(() => null)
      : null;

    const pRes = await rest(`profiles?id=eq.${me}&select=partner_profile_id,name,pronouns,${OWNERSHIP_COLUMNS.join(',')}`, { headers: svc });
    /* A failed read made the profile {}, so the partner link vanished for this
       request: their shared notes dropped out of the list as if there were
       none, and a note marked shared was refused as having nobody to share
       with. Refused instead (A170, the A167 family). */
    if (!pRes.ok) return json({ ok: false, error: 'could not read your account just now' }, 503);
    const profile = (await pRes.json().catch(() => []))?.[0] || {};
    const partnerId = profile.partner_profile_id || null;
    const coupleKey = partnerId ? coupleKeyOf(me, partnerId) : null;

    // Read the body exactly once. Reading it, then cloning to read again, gives
    // an empty object on the second read because the stream is already
    // consumed, and every field silently arrives undefined.
    let body = {};
    if (req.method !== 'GET') {
      const _parsed = await jsonBody(req);
      if (_parsed.error) return _parsed.error;
      body = _parsed.body;
    }
    const action = req.method === 'GET'
      ? (url.searchParams.get('action') || 'list')
      : body.action;

    // ── Read ───────────────────────────────────────────────────────────────
    if (req.method === 'GET' && action === 'list') {
      /**
       * ── WHAT A TILE NEEDS IS THREE ROWS AND A NUMBER ────────────────────
       * Ellie: "What if we only load the previous 3 marks in the tile on notes
       * page, and you can click to see previous 10, then same with shared
       * notes... but those click to see pages don't have to load when the user
       * initially opens their notes page. The tags list needs to load, but each
       * individual tags list with all the marks with that tag only need to load
       * when a user opens that tag list."
       *
       * So `limit` is a parameter and it is OPT IN. The default is still every
       * row, because this endpoint has a second caller: the marking layer on a
       * results page reads the anchored list to draw highlights, and a default
       * of three would have silently rubbed out every mark past the third on
       * every results page. check-annotation-source.mjs is about that list; a
       * limit applied to it would be the same bug from the other end.
       *
       * What a limited caller loses is the counts and the per-tag figures it
       * used to work out from the whole list, so those are computed here and
       * sent. They are four more queries and they cost nothing: every one of
       * them goes out with the rows rather than after them, so the depth of
       * this handler is unchanged. check-waterfalls is what says so.
       */
      const want = Number(url.searchParams.get('limit'));
      const limit = Number.isFinite(want) && want > 0 ? Math.min(Math.floor(want), 50) : null;
      /* One tag's marks, for the page behind a tag row. Nothing else changes:
         the same rows, filtered to the notes carrying that tag. */
      const onlyTag = (url.searchParams.get('tagId') || '').trim() || null;
      const narrow = !!(limit || onlyTag);

      /* A journal entry is a mark with an anchor, and it has its own screen and
         its own count. The tile does not show them, so a limit of three that
         spent itself on three diary entries would show an empty tile to someone
         with marks. Loose notes have no anchor_type at all, and `neq` does not
         match null in SQL, so both halves have to be said. */
      const notJournal = `or=(anchor_type.is.null,anchor_type.neq.${JOURNAL_ANCHOR})`;
      const cap = limit ? `&limit=${limit}` : '';
      /**
       * The total comes back with the rows.
       *
       * `count=exact` puts `0-2/212` in content-range, so the tile's number
       * costs nothing beyond the rows it was already fetching. The first
       * version asked for each count in its own HEAD request and took this
       * handler from five upstream calls to ten.
       */
      const counting = { ...svc, Prefer: 'count=exact' };
      const totalOf = (res) => {
        const range = res && res.headers.get('content-range');
        const total = range ? Number(String(range).split('/')[1]) : NaN;
        return Number.isFinite(total) ? total : null;
      };

      let tagged = null;
      if (onlyTag) {
        /* Which notes carry this tag, asked first because the rows are then
           filtered to those ids. One extra trip, and only on this path. */
        const tRes = await rest(`note_tags?tag_id=eq.${encodeURIComponent(onlyTag)}&select=note_id`, { headers: svc });
        tagged = (await tRes.json().catch(() => [])).map((r) => r.note_id);
        if (!tagged.length) {
          return json({
            ok: true, notes: [], annotations: [], sharedWithMe: [],
            counts: { marks: 0, shared: 0, unopened: 0, journal: 0 },
            tagStats: {}, journalDays: [], limited: !!limit,
          });
        }
      }
      const onlyThese = tagged ? `&id=in.(${tagged.map((id) => `"${encodeURIComponent(id)}"`).join(',')})` : '';

      /* Everything this screen needs, out at once. */
      const mineSoon = narrow
        ? rest(`notes?owner_id=eq.${me}&${notJournal}&select=${NOTE_COLS}&order=updated_at.desc${onlyThese}${cap}`, { headers: counting })
        : myNotes;
      const sharedSoon = coupleKey
        ? (narrow
          ? rest(`notes?couple_key=eq.${encodeURIComponent(coupleKey)}&visibility=eq.shared&owner_id=neq.${me}&select=${NOTE_COLS}&order=updated_at.desc${onlyThese}${cap}`,
            { headers: counting })
          : everyRow(`notes?couple_key=eq.${encodeURIComponent(coupleKey)}&visibility=eq.shared&owner_id=neq.${me}&select=${NOTE_COLS}&order=updated_at.desc,id`))
        : null;
      /**
       * Three things a limited caller cannot work out for itself, and an
       * unlimited one can.
       *
       * The screen prints how many of the partner's notes are unread, how many
       * days in a row the journal has an entry, and how many marks carry each
       * tag. All three used to be counted out of the whole list in the app,
       * which is exactly what a limit takes away.
       *
       * So they are asked for here, and only when something narrows the rows.
       * The default path is the marking layer on a results page, which holds
       * every row already and needs none of this: it stays at the five upstream
       * calls it has always made, and check-waterfalls holds both paths to
       * their own figure.
       */
      const unopenedSoon = narrow && coupleKey
        ? rest(`notes?couple_key=eq.${encodeURIComponent(coupleKey)}&visibility=eq.shared&owner_id=neq.${me}&opened_at=is.null&select=id&limit=1`,
          { headers: counting }).catch(() => null)
        : null;
      const journalSoon = narrow
        ? rest(`notes?owner_id=eq.${me}&anchor_type=eq.${JOURNAL_ANCHOR}&select=anchor_key&order=anchor_key.desc`, { headers: svc })
          .catch(() => null)
        : null;
      /**
       * How many marks carry each tag, and when the most recent was touched.
       *
       * One row per tagging rather than per note, with an inner join on notes
       * so a partner's taggings cannot be counted, and two columns rather than
       * a body. Small whatever the library grows to.
       */
      const tagStatsSoon = narrow
        ? rest(`note_tags?select=tag_id,notes!inner(owner_id,updated_at)&notes.owner_id=eq.${me}`,
          { headers: svc }).catch(() => null)
        : null;

      const mineRes = await mineSoon;
      /* A list that failed is not an empty list: it drew as somebody with no
         notes. Refused, like the profile read above (A170). */
      if (!mineRes || !mineRes.ok) return json({ ok: false, error: 'could not read your notes just now' }, 503);
      let mine = await mineRes.json().catch(() => []);
      const mineTotal = totalOf(mineRes);

      let shared = [];
      let sharedTotal = null;
      if (sharedSoon) {
        const sRes = await sharedSoon;
        if (!sRes || !sRes.ok) return json({ ok: false, error: 'could not read your partner\'s shared notes just now' }, 503);
        shared = await sRes.json().catch(() => []);
        sharedTotal = totalOf(sRes);
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

      /* The journal's days: from its own query when the rows are narrowed, and
         out of the rows themselves when they are not. One answer either way. */
      let journalDays;
      if (journalSoon) {
        const jRes = await journalSoon;
        const rows = jRes ? await jRes.json().catch(() => []) : [];
        journalDays = rows.map((r) => r.anchor_key).filter(Boolean);
      } else {
        journalDays = mine.filter((n) => n.anchor_type === JOURNAL_ANCHOR)
          .map((n) => n.anchor_key).filter(Boolean);
      }

      const tagStats = {};
      const addStat = (tagId, at) => {
        const cell = (tagStats[tagId] ||= { count: 0, latest: 0 });
        cell.count += 1;
        if (at > cell.latest) cell.latest = at;
      };
      if (tagStatsSoon) {
        const statsRes = await tagStatsSoon;
        for (const row of (statsRes ? await statsRes.json().catch(() => []) : [])) {
          addStat(row.tag_id, Date.parse(row.notes?.updated_at || '') || 0);
        }
      } else {
        for (const n of mine) {
          for (const id of n.tagIds) addStat(id, Date.parse(n.updated_at || '') || 0);
        }
      }

      let unopened = shared.filter((n) => !n.opened_at).length;
      if (unopenedSoon) {
        const uRes = await unopenedSoon;
        const total = totalOf(uRes);
        if (total !== null) unopened = total;
      }

      // Annotations separated out, because the app lists them by what they are
      // attached to rather than chronologically.
      return json({
        ok: true,
        notes: mine.filter(n => !n.anchor_type),
        annotations: mine.filter(n => n.anchor_type),
        sharedWithMe: shared,
        /**
         * What the tiles print. Sent whether or not a limit was asked for, so a
         * screen reads one number rather than sometimes a number and sometimes
         * the length of a list it happens to hold.
         */
        counts: {
          marks: mineTotal !== null ? mineTotal
            : mine.filter((n) => n.anchor_type !== JOURNAL_ANCHOR).length,
          shared: sharedTotal !== null ? sharedTotal : shared.length,
          unopened,
          journal: journalDays.length,
        },
        tagStats,
        journalDays,
        /* So a screen knows whether what it holds is everything. */
        limited: !!limit,
      });
    }

    if (req.method === 'GET' && action === 'tags') {
      const tRes = await rest(`tags?owner_id=eq.${me}&select=id,name,color,standard_key,deleted_at&order=created_at.asc`, { headers: svc });
      const tags = await tRes.json().catch(() => []);

      /**
       * Nothing is seeded any more.
       *
       * Opening Notes for the first time used to write twenty-one tags into
       * this person's list, one per dimension, expectations category and
       * intimacy dimension. Ellie: "I don't like our default tags. Just have a
       * spot for people to 'add a tag' then they see their own list."
       *
       * Those rows were doing two jobs. One was being a tag, which is the job
       * nobody asked for. The other was being the dictionary an annotation is
       * read through: a note anchored to `dim:conflict` needs something to
       * call it "Conflict Style" and give it a colour. That job is real, so
       * the list is still sent, as reference data rather than as rows, and it
       * is better for it: the label is derived from the live dimension list on
       * every request instead of being frozen into a row on the day someone
       * first opened a screen.
       */
      const { ownsIntimacy } = capabilitiesFor(profile);

      return json({
        ok: true,
        tags,
        /**
         * The product's own names for the things a note can be attached to.
         * Not the person's tags, and not written to their account.
         */
        standard: standardTags({ ownsIntimacy }),
        /**
         * The add field's placeholder, and the list it is built from. The
         * suggestions were a row of pills under the field; Ellie asked for
         * them in the field itself instead. Both are sent: the list is what
         * the placeholder is made of, and it is what anything else offering a
         * suggestion would read.
         */
        suggestions: TAG_SUGGESTIONS,
        tagPlaceholder: TAG_PLACEHOLDER,
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
    /**
     * ── A TAG HAS TWO DEATHS ──────────────────────────────────────────────
     * Ellie: a tag page has a delete with an are-you-sure, a deleted tag drops
     * to a greyed row at the foot of the list, and deleting it from there is
     * permanent and says so.
     *
     * So: 'deleteTag' puts it in the bin, and 'purgeTag' removes the row. The
     * second takes the note_tags rows with it, by the cascade on that table,
     * which is exactly what cannot be undone.
     *
     * Both need migration 066. Until it is run, the bin column does not exist
     * and PostgREST refuses the patch; that is reported rather than quietly
     * turned into a hard delete, because a delete someone believes is
     * recoverable and is not is the worst possible version of this.
     */
    if (action === 'deleteTag' || action === 'restoreTag') {
      if (!body.id || !UUID_RE.test(String(body.id))) {
        return json({ ok: false, error: 'missing or invalid id' }, 400);
      }
      const r = await rest(`tags?id=eq.${encodeURIComponent(String(body.id))}&owner_id=eq.${me}`, {
        method: 'PATCH',
        headers: { ...jsonHeaders, Prefer: 'return=representation' },
        body: JSON.stringify({ deleted_at: action === 'deleteTag' ? new Date().toISOString() : null }),
      });
      if (!r.ok) {
        const detail = await r.text().catch(() => '');
        if (/deleted_at/.test(detail)) {
          return json({ ok: false, error: 'deleting a tag needs migration 066. Run it in the SQL editor.' }, 503);
        }
        return json({ ok: false, error: 'that did not save' }, 500);
      }
      const rows = await r.json().catch(() => []);
      if (!rows.length) return json({ ok: false, error: 'not found' }, 404);
      return json({ ok: true, tag: rows[0] });
    }

    if (action === 'purgeTag') {
      if (!body.id || !UUID_RE.test(String(body.id))) {
        return json({ ok: false, error: 'missing or invalid id' }, 400);
      }
      // owner_id in the filter is the authorisation, as everywhere else here.
      const r = await rest(`tags?id=eq.${encodeURIComponent(String(body.id))}&owner_id=eq.${me}`, {
        method: 'DELETE',
        headers: { ...svc, Prefer: 'return=representation' },
      });
      const gone = await r.json().catch(() => []);
      return json({ ok: true, deleted: gone.length });
    }

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
      /**
       * A name in the bin is still taken, because the unique index does not
       * care that the tag is deleted. Typing it again means "I want that tag",
       * so it comes back rather than failing on a constraint the reader cannot
       * see. Tolerant of migration 066 not having been run: without the
       * column, nothing is ever in the bin and there is nothing to restore.
       */
      if (tag.deleted_at) {
        const back = await rest(`tags?id=eq.${tag.id}&owner_id=eq.${me}`, {
          method: 'PATCH',
          headers: { ...jsonHeaders, Prefer: 'return=representation' },
          body: JSON.stringify({ deleted_at: null }),
        });
        const rows = await back.json().catch(() => []);
        if (rows.length) tag = rows[0];
      }
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
      /**
       * ── A JOURNAL ENTRY CANNOT BE CREATED SHARED ────────────────────────
       * Ellie: "Please make sure the journal entries are saved appropriately
       * and privately."
       *
       * The app sends visibility 'private' for every entry, and that is a
       * claim about a client rather than a rule. This is the rule. The same
       * refusal sits on the share action below, so neither the way in nor the
       * way after it can make a diary readable by a partner.
       */
      if (shared && anchorType === JOURNAL_ANCHOR) {
        return json({ ok: false, error: 'a journal entry is private' }, 400);
      }
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
      /**
       * Tolerant of migration 057 not having been run yet.
       *
       * kind, color and opened_at arrive in that migration. Until it is run,
       * PostgREST rejects the whole insert for naming a column that does not
       * exist, which would break writing a plain note as well: an existing
       * feature, for every customer, because of a column only the new one
       * needs.
       *
       * So the write is attempted whole and retried without the new fields if
       * the schema has not caught up. A highlight cannot survive that retry
       * and says so; a note loses nothing, because kind 'note' with no colour
       * is exactly what a row without these columns already means.
       *
       * The same tolerance the entitlement resync keeps for is_comp and
       * migration 028. It comes out when 057 has been run everywhere.
       */
      const insert = (body_) => rest('notes', {
        method: 'POST', headers: { ...jsonHeaders, Prefer: 'return=representation' },
        body: JSON.stringify(body_),
      });
      let r = await insert(row);
      if (!r.ok) {
        const detail = await r.text().catch(() => '');
        const schemaBehind = /kind|color|opened_at/.test(detail) && /column|schema/i.test(detail);
        if (!schemaBehind) return json({ ok: false, error: 'create failed' }, 500);
        if (kind !== 'note') {
          return json({
            ok: false,
            error: 'highlights and underlines need migration 057. Run it in the SQL editor.',
          }, 503);
        }
        const { kind: _k, color: _c, ...withoutNewColumns } = row;
        r = await insert(withoutNewColumns);
        if (!r.ok) return json({ ok: false, error: 'create failed' }, 500);
      }
      const created = (await r.json().catch(() => []))?.[0] || null;

      /* The note exists by here, so a failed tag write is not a failed create.
         It is still not a success: the note would arrive in the Notes tab under
         no heading, which is where an untagged note is hardest to find again. */
      let createdTags = true;
      if (created && Array.isArray(body.tagIds) && body.tagIds.length) {
        const add = await rest('note_tags', {
          method: 'POST', headers: { ...jsonHeaders, Prefer: 'return=minimal,resolution=ignore-duplicates' },
          body: JSON.stringify(body.tagIds.map(t => ({ note_id: created.id, tag_id: t }))),
        });
        if (!add.ok) {
          createdTags = false;
          console.warn('[notes] a note was created and its tags were not:',
            (await add.text().catch(() => '')).slice(0, 200));
        }
      }
      // Created already shared, which is the other way a note reaches a
      // partner. Same rule as the share action below, so both routes into a
      // partner's list go through one writer.
      if (created && shared && partnerId) {
        await recordNotification({
          ownerId: partnerId,
          kind: 'partner_shared',
          subjectId: created.id,
          copy: {
            partnerName: (profile.name || '').trim().split(/\s+/)[0] || null,
            partnerPronouns: profile.pronouns,
            dimensionLabel: RESULTS_SECTION_LABELS[created.anchor_key] || null,
          },
        });
      }

      /* tagsSaved: false means the note is there and its tags are not. Not an
         error, because the writing is saved and that is what someone would be
         upset to lose, but the client is told rather than left to assume. */
      return json({ ok: true, note: created, tagsSaved: createdTags });
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
        /**
         * ── A JOURNAL ENTRY CANNOT BE SHARED ──────────────────────────
         * Ellie: "Please make sure the journal entries are saved
         * appropriately and privately."
         *
         * The app has no control that would share one, which is true and is
         * not a guarantee: it is the absence of a button, and a button is one
         * commit away. This is the guarantee. A diary is the most private
         * thing in this product and the rule belongs where the row is
         * written, not where it is drawn.
         *
         * Read from the row rather than from the request, so a client cannot
         * claim an entry is something else.
         */
        if (shared) {
          const look = await rest(`${scope}&select=anchor_type`, { headers: svc });
          const [row] = await look.json().catch(() => []);
          if (row?.anchor_type === JOURNAL_ANCHOR) {
            return json({ ok: false, error: 'a journal entry is private' }, 400);
          }
        }
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

      /**
       * Sharing is the one thing here the other person cannot find out about.
       * Everything else on this endpoint is someone editing their own notes.
       *
       * Only the turn from private to shared raises it, and only once a day
       * per note, which recordNotification decides from subject_id. Unsharing
       * says nothing: taking something back is not an announcement.
       */
      if (action === 'share' && patch.visibility === 'shared' && partnerId) {
        await recordNotification({
          ownerId: partnerId,
          kind: 'partner_shared',
          subjectId: rows[0].id,
          copy: {
            partnerName: (profile.name || '').trim().split(/\s+/)[0] || null,
            partnerPronouns: profile.pronouns,
            dimensionLabel: RESULTS_SECTION_LABELS[rows[0].anchor_key] || null,
          },
        });
      }

      /**
       * Tags could only ever be set when a note was created, so there was no
       * way to add or remove one afterwards. The client sends the set it wants,
       * which is what a chip picker produces, rather than a diff it would have
       * to be right about.
       *
       * ── ADD FIRST, THEN REMOVE WHAT IS LEFT OVER ──────────────────────────
       * This deleted every tag on the note and then inserted the wanted set.
       * Two requests, no transaction, and neither result looked at. So a failed
       * insert left the note with no tags at all and the endpoint answered
       * ok: true, with body.tagIds echoed back, so the app drew the tags it had
       * asked for until something reloaded. Tags are how the Notes tab is
       * organised; losing all of them silently is worse than not saving one.
       *
       * Inverted: insert the wanted set, then delete only what is not in it. A
       * failure at any point now leaves a superset, never an empty set, so the
       * worst case is a tag that should have gone and is still there. And both
       * results are checked, because an ok that is not true is the thing that
       * made this invisible.
       */
      let tagsSaved = true;
      if (action === 'update' && Array.isArray(body.tagIds)) {
        const wanted = body.tagIds.map((t) => String(t));
        if (wanted.length) {
          const add = await rest('note_tags', {
            method: 'POST',
            headers: { ...jsonHeaders, Prefer: 'return=minimal,resolution=ignore-duplicates' },
            body: JSON.stringify(wanted.map((t) => ({ note_id: rows[0].id, tag_id: t }))),
          });
          if (!add.ok) tagsSaved = false;
        }
        if (tagsSaved) {
          // Postgrest's not.in takes a parenthesised list. An empty wanted set
          // skips the filter entirely and removes them all, which is what
          // clearing every chip means.
          const keep = wanted.length
            ? `&tag_id=not.in.(${wanted.map((t) => encodeURIComponent(t)).join(',')})`
            : '';
          const drop = await rest(`note_tags?note_id=eq.${noteId}${keep}`, { method: 'DELETE', headers: svc });
          if (!drop.ok) tagsSaved = false;
        }
      }
      if (!tagsSaved) {
        return json({ ok: false, error: 'the note saved and its tags did not' }, 500);
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
