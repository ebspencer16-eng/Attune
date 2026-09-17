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

import { jsonBody } from './_lib/http.js';
import { SITE_URL } from './_lib/site.js';

import { POST_CATEGORIES } from './_lib/post-categories.js';
import { IN_PRACTICE, shelfFor } from './_in-practice.js';
import { IN_PRACTICE_BODIES } from './_in-practice-bodies.js';

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: HEADERS });

/**
 * The words a search can match for one post.
 *
 * Lower case and de-duplicated, because a search box is typed in lower case and
 * a term in both the title and the keywords should count once. The dimension
 * prefixes go: someone searching "conflict" means the subject, not the string
 * "dim:conflict".
 */
function searchTerms(post) {
  const parts = [
    post.title || '',
    post.subtitle || '',
    post.category || '',
    ...(post.keywords || []),
    ...(post.dimension_keys || []).map((k) => String(k).split(':').pop()),
  ];
  const words = parts.join(' ').toLowerCase().split(/[^a-z0-9']+/).filter((w) => w.length > 2);
  return [...new Set(words)].join(' ');
}

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
    let body = {};
    if (req.method === 'POST') {
      const _parsed = await jsonBody(req);
      if (_parsed.error) return _parsed.error;
      body = _parsed.body;
    }
    const action = req.method === 'POST' ? body.action : (url.searchParams.get('action') || 'feed');

    // Published means published_at is set AND in the past. Scheduling is a
    // future timestamp, so this one filter covers drafts and scheduling both.
    const nowIso = new Date().toISOString();
    const publishedFilter = `published_at=not.is.null&published_at=lte.${nowIso}`;

    if (action === 'feed') {
      const [pRes, rRes, allRes, sRes] = await Promise.all([
        rest(`posts?${publishedFilter}&select=id,title,subtitle,category,dimension_keys,keywords,read_minutes,hero_color,hero_image,published_at,revision&order=published_at.desc&limit=50`, { headers: svc }),
        rest(`post_reads?owner_id=eq.${me}&select=post_id,revision,read_at`, { headers: svc }),
        /**
         * How many people have read each piece, for the Featured sort.
         *
         * Ellie: "Featured should promote the most popular articles first (and
         * out of those should promote unread first)." Popularity is not a
         * field anyone types; it is this count. Ids only, so the row carries
         * nothing about who read what, and it is counted here rather than sent
         * as rows: the app has no business holding a list of reads.
         */
        rest('post_reads?select=post_id&limit=10000', { headers: svc }),
        // What this reader has saved. Ellie: "I want to add 'save' an article
        // to add to a reading list." saved_posts has existed since migration
        // 044 and nothing has ever written to it. Ids only: what someone saves
        // is theirs.
        rest(`saved_posts?owner_id=eq.${me}&select=post_id`, { headers: svc }),
      ]);
      const published = await pRes.json().catch(() => []);
      const reads = await rRes.json().catch(() => []);
      const readBy = new Map(reads.map(r => [r.post_id, r]));
      const savedIds = new Set((await sRes.json().catch(() => [])).map((r) => r.post_id));
      const popularity = new Map();
      for (const r of (await allRes.json().catch(() => []))) {
        popularity.set(r.post_id, (popularity.get(r.post_id) || 0) + 1);
      }

      /**
       * The shelf is both sources, not one or the other.
       *
       * The In Practice pieces are pages on the site, indexed in
       * api/_in-practice.js. Nothing had ever been written to the posts table,
       * so the app's shelf said "Nothing published yet" while a dozen pieces
       * existed, and this served the website's index when the table was empty.
       * These carry `external`, so the app opens them on the website rather
       * than pretending it has a reader for them.
       *
       * It used to be `published.length ? published : website`, which meant
       * publishing one post would drop the shelf from twelve items to one.
       * Nobody could reach that, because /api/admin-posts answered 500 to
       * every request from the day it shipped and publishing was impossible.
       * Fixing that endpoint made this reachable, so the two sources are
       * merged instead: published posts first, newest first, then every
       * website piece whose slug is not already among them.
       */
      const publishedIds = new Set(published.map((p) => p.id));
      const fromSite = IN_PRACTICE.filter((a) => !publishedIds.has(a.slug)).map((a) => ({
        id: a.slug,
        title: a.title,
        subtitle: a.excerpt,
        category: shelfFor(a),
        dimension_keys: [],
        read_minutes: a.readMinutes,
        hero_color: null,
        hero_image: null,
        keywords: [],
        saved: false,
        search: searchTerms({ title: a.title, subtitle: a.excerpt, category: shelfFor(a) }),
        published_at: null,
        revision: 1,
        /**
         * The browser is the fallback, not the destination.
         *
         * These twelve are pages on the website and the app used to hand every
         * one of them to the system browser. Their bodies are now generated
         * into api/_in-practice-bodies.js, so the app draws them itself and
         * this is only set for an article whose body did not come through,
         * which is the one case where the website is still the better answer.
         */
        external: IN_PRACTICE_BODIES[a.slug]?.blocks?.length ? null : `${SITE_URL}${a.path}`,
      }));
      const posts = [...published, ...fromSite];

      return json({
        ok: true,
        // The shelves, so the app builds its filter row from what the server
        // knows rather than a copy of the markup on practice.html.
        categories: POST_CATEGORIES,
        posts: posts.map(p => {
          const r = readBy.get(p.id);
          return {
            ...p,
            /** How many people have read it. The Featured sort's first key. */
            reads: popularity.get(p.id) || 0,
            read: !!r,
            saved: savedIds.has(p.id),
            /**
             * What a search matches on, built here rather than in the app.
             *
             * Ellie: "use key words and a tagging system to smart search for
             * relevant articles." The tagging system is dimension_keys, which
             * carries prefixes a reader would never type, so they are stripped;
             * the words she adds per post in the admin come through as they
             * are; and the shelf is in there because "conflict" should find
             * everything on that shelf whether or not a post says the word.
             */
            search: searchTerms(p),
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
      if (post) return json({ ok: true, post });

      /**
       * A website article, read in the app.
       *
       * The table takes precedence: a slug published there is the one that is
       * served, so an article that moves into the table is not shadowed by the
       * page it came from. The blocks are generated from the page itself by
       * scripts/build-in-practice-bodies.mjs, and check-in-practice-bodies.mjs
       * fails the build when the two stop matching word for word.
       *
       * The standfirst is the subtitle rather than the index's excerpt. They
       * are different sentences written for different places, and the one
       * under the title on the page is the one that belongs under the title
       * here.
       */
      const article = IN_PRACTICE.find((a) => a.slug === id);
      const body = article && IN_PRACTICE_BODIES[article.slug];
      if (!article || !body?.blocks?.length) return json({ ok: false, error: 'not found' }, 404);
      return json({
        ok: true,
        post: {
          id: article.slug,
          title: article.title,
          subtitle: body.intro || article.excerpt || null,
          category: shelfFor(article),
          dimension_keys: [],
          read_minutes: article.readMinutes,
          hero_color: null,
          published_at: null,
          revision: 1,
          blocks: body.blocks,
        },
      });
    }

    if (req.method === 'POST' && action === 'read') {
      if (!body.id) return json({ ok: false, error: 'missing id' }, 400);
      // Record the revision read, not just the fact of reading.
      const pr = await rest(`posts?id=eq.${encodeURIComponent(body.id)}&${publishedFilter}&select=revision`, { headers: svc });
      const post = (await pr.json().catch(() => []))?.[0];

      /**
       * A website article counts as read too.
       *
       * They open in the app now, so someone finishes one and the feed still
       * shows it as unread, because this checked the posts table and a website
       * piece is not in it. They are at revision 1: a page is edited in place
       * and carries no revision, so there is nothing for a reader to be behind.
       *
       * Until migration 065 runs, post_reads.post_id still references
       * posts(id) and the insert is refused. The read is reported rather than
       * assumed for exactly that reason: `recorded` says whether it landed.
       */
      const article = post ? null : IN_PRACTICE.find((a) => a.slug === body.id);
      if (!post && !article) return json({ ok: false, error: 'not found' }, 404);
      const revision = post ? post.revision : 1;

      const w = await rest('post_reads?on_conflict=owner_id,post_id', {
        method: 'POST',
        headers: { ...svc, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ owner_id: me, post_id: body.id, revision, read_at: new Date().toISOString() }),
      });
      return json({ ok: true, revision, recorded: w.ok });
    }

    /**
     * ── SAVING, AND TAKING IT BACK ────────────────────────────────────────
     * One row per reader per post, which the unique index on saved_posts
     * already enforces, so saving twice is not an error and unsaving something
     * that was never saved is not either. Both answer with the state the
     * reader should now see, so the app never has to guess.
     */
    if (req.method === 'POST' && (action === 'save' || action === 'unsave')) {
      if (!body.id) return json({ ok: false, error: 'missing id' }, 400);
      if (action === 'save') {
        const w = await rest('saved_posts?on_conflict=owner_id,post_id', {
          method: 'POST',
          headers: { ...svc, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ owner_id: me, post_id: body.id }),
        });
        if (!w.ok) return json({ ok: false, error: 'could not save that' }, 500);
        return json({ ok: true, saved: true });
      }
      const d = await rest(`saved_posts?owner_id=eq.${me}&post_id=eq.${encodeURIComponent(body.id)}`, {
        method: 'DELETE', headers: { ...svc, Prefer: 'return=minimal' },
      });
      if (!d.ok) return json({ ok: false, error: 'could not unsave that' }, 500);
      return json({ ok: true, saved: false });
    }

    return json({ ok: false, error: 'unsupported action' }, 400);
  } catch (e) {
    console.error('[posts] failed:', e);
    return json({ ok: false, error: 'posts unavailable' }, 500);
  }
}
