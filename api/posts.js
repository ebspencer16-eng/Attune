/**
 * /api/posts
 *
 * The In Practice feed and individual posts.
 *
 *   GET ?action=feed          published posts, newest first, with read state
 *   GET ?action=post&id=slug  one post with its blocks
 *   POST { action: 'read' }   mark a post read at its current revision
 *
 * Drafts and scheduled posts are filtered server-side, not client-side. A
 * client-side filter means an unpublished draft is one request away from being
 * readable, which for a couples product could mean shipping half-written advice
 * about someone's relationship.
 */

export const config = { runtime: 'edge' };

import { POST_CATEGORIES } from './_lib/post-categories.js';
import { IN_PRACTICE, shelfFor } from './_in-practice.js';

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: HEADERS });

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
    const rest = (p, init) => fetch(`${supabaseUrl}/rest/v1/${p}`, init);
    const url = new URL(req.url);
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const action = req.method === 'POST' ? body.action : (url.searchParams.get('action') || 'feed');

    // Published means published_at is set AND in the past. Scheduling is a
    // future timestamp, so this one filter covers drafts and scheduling both.
    const nowIso = new Date().toISOString();
    const publishedFilter = `published_at=not.is.null&published_at=lte.${nowIso}`;

    if (action === 'feed') {
      const [pRes, rRes] = await Promise.all([
        rest(`posts?${publishedFilter}&select=id,title,subtitle,category,dimension_keys,read_minutes,hero_color,published_at,revision&order=published_at.desc&limit=50`, { headers: svc }),
        rest(`post_reads?owner_id=eq.${me}&select=post_id,revision,read_at`, { headers: svc }),
      ]);
      const published = await pRes.json().catch(() => []);
      const reads = await rRes.json().catch(() => []);
      const readBy = new Map(reads.map(r => [r.post_id, r]));

      /**
       * Nothing published yet, so serve the website's index.
       *
       * The six In Practice pieces are pages on the site, written as routes in
       * src/App.jsx and indexed in public/practice.html. Nothing has ever been
       * written to the posts table, so the app's In Practice shelf has always
       * said "Nothing published yet" while six pieces existed.
       *
       * The app was not missing a feature. It was reading a different source
       * from the one the content lives in. These carry `external`, so the app
       * opens them on the website rather than pretending it has a reader.
       *
       * A real published post takes precedence: this is the empty-table case
       * only. See api/_in-practice.js.
       */
      const posts = published.length ? published : IN_PRACTICE.map((a) => ({
        id: a.slug,
        title: a.title,
        subtitle: a.excerpt,
        category: shelfFor(a),
        dimension_keys: [],
        read_minutes: a.readMinutes,
        hero_color: null,
        published_at: null,
        revision: 1,
        external: `https://www.attune-relationships.com${a.path}`,
      }));

      return json({
        ok: true,
        // The shelves, so the app builds its filter row from what the server
        // knows rather than a copy of the markup on practice.html.
        categories: POST_CATEGORIES,
        posts: posts.map(p => {
          const r = readBy.get(p.id);
          return {
            ...p,
            read: !!r,
            // A substantive edit bumps revision, so a post someone read before
            // a rewrite resurfaces rather than staying silently marked read.
            revised: !!r && r.revision < p.revision,
          };
        }),
      });
    }

    if (action === 'post') {
      const id = url.searchParams.get('id');
      if (!id) return json({ ok: false, error: 'missing id' }, 400);
      // The published filter is applied here too. Knowing a slug must not be
      // enough to read a draft.
      const r = await rest(`posts?id=eq.${encodeURIComponent(id)}&${publishedFilter}&select=*`, { headers: svc });
      const post = (await r.json().catch(() => []))?.[0];
      if (!post) return json({ ok: false, error: 'not found' }, 404);
      return json({ ok: true, post });
    }

    if (req.method === 'POST' && action === 'read') {
      if (!body.id) return json({ ok: false, error: 'missing id' }, 400);
      // Record the revision read, not just the fact of reading.
      const pr = await rest(`posts?id=eq.${encodeURIComponent(body.id)}&${publishedFilter}&select=revision`, { headers: svc });
      const post = (await pr.json().catch(() => []))?.[0];
      if (!post) return json({ ok: false, error: 'not found' }, 404);

      await rest('post_reads?on_conflict=owner_id,post_id', {
        method: 'POST',
        headers: { ...svc, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ owner_id: me, post_id: body.id, revision: post.revision, read_at: new Date().toISOString() }),
      });
      return json({ ok: true, revision: post.revision });
    }

    return json({ ok: false, error: 'unsupported action' }, 400);
  } catch (e) {
    console.error('[posts] failed:', e);
    return json({ ok: false, error: 'posts unavailable' }, 500);
  }
}
