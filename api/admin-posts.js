/**
 * /api/admin-posts
 *
 * Writing, scheduling and publishing In Practice posts, so content does not
 * require SQL or a deploy.
 *
 *   GET  ?action=list              every post, drafts included
 *   GET  ?action=post&id=slug      one post, draft or not
 *   POST { action: 'save' }        create or update
 *   POST { action: 'publish' }     set published_at (now, or a future date to schedule)
 *   POST { action: 'unpublish' }   back to draft
 *   POST { action: 'delete' }      drafts only
 *
 * Admin-authenticated, the same as the other admin endpoints.
 *
 * TWO THINGS THIS ENDPOINT IS CAREFUL ABOUT
 *
 * Block ids are assigned here and never reassigned. Annotations anchor to them
 * (notes.anchor_type = 'post_block'), so a block that keeps its id keeps its
 * highlights through an edit. Editing a paragraph's text is safe; only deleting
 * a block orphans anything.
 *
 * The revision bump is deliberate rather than automatic on every save. Fixing a
 * typo should not resurface a post in everyone's feed as unread. Pass
 * substantive: true when the change is worth telling readers about.
 */

export const config = { runtime: 'nodejs' };

import { checkAdminAuth } from './_lib/admin-auth.js';

const json = (b, s = 200) => new Response(JSON.stringify(b), {
  status: s, headers: { 'Content-Type': 'application/json' },
});

/** Stable, readable, and collision-free enough for blocks within one post. */
const newBlockId = () => 'b' + Math.random().toString(36).slice(2, 10);

/**
 * Assign ids to new blocks, preserve ids on existing ones.
 *
 * Matching is by the id the client sends back. A block without one is new. This
 * is why the editor must round-trip ids rather than rebuilding the array from
 * text: dropping them would silently orphan every annotation on the post.
 */
function normaliseBlocks(incoming, existing) {
  const known = new Set((existing || []).map(b => b.id));
  return (incoming || []).map(b => {
    const id = b.id && known.has(b.id) ? b.id : newBlockId();
    return {
      id,
      type: ['paragraph', 'heading', 'quote', 'list', 'prompt'].includes(b.type) ? b.type : 'paragraph',
      text: typeof b.text === 'string' ? b.text : '',
    };
  });
}

export default async function handler(req) {
  const auth = checkAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE;
  if (!supabaseUrl || !serviceKey) return json({ ok: false, error: 'Server not configured' }, 500);

  const svc = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const jsonHeaders = { ...svc, 'Content-Type': 'application/json' };
  const rest = (p, init) => fetch(`${supabaseUrl}/rest/v1/${p}`, init);

  try {
    const url = new URL(req.url, 'https://x');
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const action = req.method === 'POST' ? body.action : (url.searchParams.get('action') || 'list');

    if (action === 'list') {
      const r = await rest('posts?select=id,title,subtitle,dimension_keys,read_minutes,published_at,revision,updated_at&order=updated_at.desc', { headers: svc });
      const posts = await r.json().catch(() => []);
      const now = Date.now();
      return json({
        ok: true,
        posts: posts.map(p => ({
          ...p,
          status: !p.published_at ? 'draft'
            : new Date(p.published_at).getTime() > now ? 'scheduled' : 'published',
        })),
      });
    }

    if (action === 'post') {
      const id = url.searchParams.get('id');
      if (!id) return json({ ok: false, error: 'missing id' }, 400);
      const r = await rest(`posts?id=eq.${encodeURIComponent(id)}&select=*`, { headers: svc });
      const post = (await r.json().catch(() => []))?.[0];
      if (!post) return json({ ok: false, error: 'not found' }, 404);
      return json({ ok: true, post });
    }

    if (req.method !== 'POST') return json({ ok: false, error: 'unsupported action' }, 400);

    if (action === 'save') {
      const id = (body.id || '').trim();
      if (!/^[a-z0-9-]{3,80}$/.test(id)) {
        return json({ ok: false, error: 'id must be a slug: lowercase letters, numbers and hyphens' }, 400);
      }
      if (!body.title) return json({ ok: false, error: 'title required' }, 400);

      const exRes = await rest(`posts?id=eq.${encodeURIComponent(id)}&select=blocks,revision,published_at`, { headers: svc });
      const existing = (await exRes.json().catch(() => []))?.[0] || null;

      const blocks = normaliseBlocks(body.blocks, existing?.blocks);
      const row = {
        id,
        title: body.title,
        subtitle: body.subtitle || null,
        blocks,
        dimension_keys: Array.isArray(body.dimensionKeys) ? body.dimensionKeys : [],
        read_minutes: body.readMinutes ?? Math.max(1, Math.round(
          blocks.reduce((n, b) => n + (b.text || '').split(/\s+/).length, 0) / 200)),
        hero_color: body.heroColor || null,
        // A published post keeps its date on save. Publishing is its own action.
        published_at: existing ? existing.published_at : null,
        // Only bump when the editor says the change is worth resurfacing.
        revision: (existing?.revision || 0) + (body.substantive ? 1 : 0) || 1,
        updated_at: new Date().toISOString(),
      };

      const r = await rest('posts?on_conflict=id', {
        method: 'POST',
        headers: { ...jsonHeaders, Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(row),
      });
      if (!r.ok) return json({ ok: false, error: 'save failed', status: r.status }, 500);
      return json({ ok: true, post: (await r.json().catch(() => []))?.[0] || null });
    }

    if (action === 'publish' || action === 'unpublish') {
      if (!body.id) return json({ ok: false, error: 'missing id' }, 400);
      // A future date schedules it; there is no separate scheduled state.
      const when = action === 'unpublish' ? null : (body.publishedAt || new Date().toISOString());
      const r = await rest(`posts?id=eq.${encodeURIComponent(body.id)}`, {
        method: 'PATCH',
        headers: { ...jsonHeaders, Prefer: 'return=representation' },
        body: JSON.stringify({ published_at: when, updated_at: new Date().toISOString() }),
      });
      const rows = await r.json().catch(() => []);
      if (!rows.length) return json({ ok: false, error: 'not found' }, 404);
      return json({ ok: true, post: rows[0] });
    }

    if (action === 'delete') {
      if (!body.id) return json({ ok: false, error: 'missing id' }, 400);
      // Drafts only. Deleting a published post orphans every annotation on it
      // and breaks any link already shared; unpublish instead.
      const r = await rest(`posts?id=eq.${encodeURIComponent(body.id)}&published_at=is.null`, {
        method: 'DELETE', headers: { ...svc, Prefer: 'return=representation' },
      });
      const gone = await r.json().catch(() => []);
      if (!gone.length) {
        return json({ ok: false, error: 'not found, or published. Unpublish before deleting.' }, 400);
      }
      return json({ ok: true, deleted: gone.length });
    }

    return json({ ok: false, error: 'unsupported action' }, 400);
  } catch (e) {
    console.error('[admin-posts] failed:', e);
    return json({ ok: false, error: 'admin-posts unavailable' }, 500);
  }
}
