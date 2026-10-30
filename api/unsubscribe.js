/**
 * GET  /api/unsubscribe?token=XXX     a page asking, with one button
 * POST /api/unsubscribe?token=XXX     the unsubscribe itself
 *
 * Unsubscribe a user from Attune emails.
 * Token is the user's Supabase user ID (base64-encoded to obscure it).
 * `?articles=<token>` is the In Practice list instead (A204a).
 *
 * ── WHY OPENING THE LINK DOES NOT DO IT ───────────────────────────────────
 * It did. Mail security scanners (Outlook's Safe Links, Mimecast and the
 * rest) open every link in an email before the person sees it, so anybody
 * whose mail passes through one was being unsubscribed by a machine, and
 * stopped getting check-ins without ever choosing to (A205, from a sweep of
 * every link in every email). A scanner opens; it does not press buttons.
 *
 * POST is also what the List-Unsubscribe-Post header promises, so the
 * Unsubscribe button Gmail and Apple Mail draw at the top of the message
 * lands here directly (api/_lib/email-footer.js listUnsubscribeHeaders).
 *
 * A failure answers 503, not a 200 page saying sorry: unknown is not no, and
 * a mail app's one-click request reads only the status.
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
import { SITE_URL } from './_lib/site.js';

export default async function handler(req) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  const html = (msg, success = true, status = success ? 200 : 503) => new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Unsubscribe — Attune</title>
<style>body{font-family:'Helvetica Neue',Arial,sans-serif;background:#F3EDE6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{background:#FFFDF9;border-radius:20px;padding:2.5rem 2rem;max-width:420px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}
h2{font-size:1.25rem;color:#0E0B07;margin:0 0 .75rem}p{font-size:.9rem;color:#8C7A68;line-height:1.7;margin:0 0 1.25rem}
a{display:inline-block;padding:.65rem 1.5rem;border-radius:10px;background:${success?'#059669':'#E8673A'};color:white;text-decoration:none;font-size:.82rem;font-weight:700}</style>
</head><body><div class="card"><h2>${success?'You\'re unsubscribed.':'Something went wrong.'}</h2>
<p>${msg}</p><a href="${SITE_URL}/home">Back to Attune</a></div></body></html>`,
    { status, headers: { 'Content-Type': 'text/html' } }
  );

  /* The question. Placeholder words of mine, listed for Ellie under A205d.
     The form posts back to this same address, token and all. */
  if (req.method !== 'POST') {
    const self = (url.pathname + url.search).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const what = url.searchParams.get('articles') ? 'emails about new In Practice articles' : 'emails from Attune';
    return new Response(
      `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Unsubscribe — Attune</title>
<style>body{font-family:'Helvetica Neue',Arial,sans-serif;background:#F3EDE6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{background:#FFFDF9;border-radius:20px;padding:2.5rem 2rem;max-width:420px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}
h2{font-size:1.25rem;color:#0E0B07;margin:0 0 .75rem}p{font-size:.9rem;color:#8C7A68;line-height:1.7;margin:0 0 1.25rem}
button{padding:.65rem 1.5rem;border:0;border-radius:10px;background:#E8673A;color:white;font-size:.82rem;font-weight:700;cursor:pointer}</style>
</head><body><div class="card"><h2>Unsubscribe?</h2>
<p>You will stop getting ${what}.</p>
<form method="post" action="${self}"><button type="submit">Unsubscribe</button></form></div></body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' } },
    );
  }

  /**
   * The In Practice list (A204a). Nobody on it has an account, so its link
   * carries the row's own random token rather than an account id. The line
   * after it is a placeholder of mine, listed for Ellie under A204a.
   */
  const articles = url.searchParams.get('articles');
  if (articles) {
    if (!/^[0-9a-f-]{36}$/i.test(articles)) {
      return html("This unsubscribe link is invalid or has expired. Reply to any Attune email to unsubscribe manually.", false, 400);
    }
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    const r = supabaseUrl && serviceKey ? await fetch(
      `${supabaseUrl}/rest/v1/article_subscribers?token=eq.${encodeURIComponent(articles)}`,
      {
        method: 'PATCH',
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ unsubscribed_at: new Date().toISOString() }),
      },
    ).catch(() => null) : null;
    if (!r?.ok) return html("Something went wrong. Reply to any Attune email and we'll remove you manually.", false);
    return html("You will not get emails about new In Practice articles any more.", true);
  }

  if (!token) return html("No unsubscribe token found. If you'd like to unsubscribe, reply to any Attune email and we'll remove you manually.", false, 400);

  let userId;
  try {
    userId = atob(token);
    if (!userId || userId.length < 10) throw new Error('invalid');
  } catch {
    return html("This unsubscribe link is invalid or has expired. Reply to any Attune email to unsubscribe manually.", false, 400);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    // Dev mode
    console.log('[unsubscribe] would opt-out user:', userId);
    return html("You've been removed from Attune emails. Your account and results are not affected.", true);
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ email_opt_in: false }),
    });
    if (!res.ok) throw new Error(`Supabase returned ${res.status}`);
    return html("You've been removed from Attune emails. Your account and results are not affected.", true);
  } catch (e) {
    console.error('[unsubscribe] error:', e);
    return html("Something went wrong. Reply to any Attune email and we'll remove you manually.", false);
  }
}
