/**
 * GET /api/cron-new-articles  (Vercel cron, daily)
 *
 * Emails everyone on the In Practice list when a new article goes up, with
 * its link (A204a). Ellie: "build an automatic email that goes out to anyone
 * who put their email in that list and sends a notification that there's a
 * new article along with the article link".
 *
 * ── WHAT COUNTS AS NEW ────────────────────────────────────────────────────
 * An article in api/_in-practice.js, which is what /practice lists and where
 * the signup sits, that has no row in article_announcements. Posts published
 * from the admin are not included: they are read in the app and have no page
 * on the website for an email to link to.
 *
 * The first run finds no announcements at all and records every article that
 * exists then, sending nothing, so the list is not sent thirteen emails for
 * articles that were already up when they signed up.
 *
 * ── ONCE EACH ─────────────────────────────────────────────────────────────
 * The announcement row is the claim, written before any email (the pattern
 * check-send-claimed-first holds the other crons to). A second run, or two at
 * once, cannot announce the same article twice. If the list cannot be read,
 * the claim is given back so tomorrow tries again. A send that fails costs
 * that one person that one email, never a repeat for everybody else.
 *
 * Every failed read answers 500, so an outage shows as a failed run in
 * Vercel's cron log rather than as "nothing new" (check-db-down).
 */
export const config = { runtime: 'edge', regions: ['iad1'] };

import { IN_PRACTICE } from './_in-practice.js';
import { SITE_URL } from './_lib/site.js';
import { brandedEmail, _esc } from './_lib/branded-email.js';
import { restAll } from './_lib/page-all.js';

/**
 * The email, in the catalogue's shape so /email-preview renders it.
 *
 * Placeholder words of mine, listed for Ellie under A204a in TASKS.md: the
 * subject, the line above the title, and the button. The title and the
 * one-line summary are the article's own.
 */
export const ARTICLE_EMAILS = {
  new_article: ({ title, excerpt, url, unsubscribeHref }) => ({
    subject: `New on In Practice: ${title}`,
    html: brandedEmail({
      preheader: _esc(excerpt || title),
      title: _esc(title),
      subtitle: 'A new article is up on In Practice.',
      bodyHtml: excerpt
        ? `<p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:15px;color:#5C4A38;line-height:1.75;margin:0">${_esc(excerpt)}</p>`
        : '',
      ctaLabel: 'Read it',
      ctaUrl: url,
      unsubscribeHref,
    }),
  }),
};

/** Where a subscriber's unsubscribe link goes. */
export const articleUnsubscribeUrl = (token) => `${SITE_URL}/api/unsubscribe?articles=${encodeURIComponent(token)}`;

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });

export default async function handler(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response('Cron not configured', { status: 500 });
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (auth !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL || 'hello@attune-relationships.com';
  if (!url || !key || !resendKey) return json({ ok: false, error: 'missing env vars' }, 500);
  const H = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  const done = await restAll(url, key, 'article_announcements?select=slug&order=slug');
  if (done.error) return json({ ok: false, stage: 'announcements', error: done.error }, 500);

  if (!done.rows.length) {
    const r = await fetch(`${url}/rest/v1/article_announcements?on_conflict=slug`, {
      method: 'POST', headers: { ...H, Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify(IN_PRACTICE.map((a) => ({ slug: a.slug, sent: 0 }))),
    });
    if (!r.ok) return json({ ok: false, stage: 'baseline', status: r.status }, 500);
    return json({ ok: true, baseline: IN_PRACTICE.length, sent: 0 });
  }

  const known = new Set(done.rows.map((r) => r.slug));
  const fresh = IN_PRACTICE.filter((a) => !known.has(a.slug));
  if (!fresh.length) return json({ ok: true, announced: 0, sent: 0 });

  const report = [];
  for (const article of fresh) {
    // The claim. One row back means this run announces it.
    const claim = await fetch(`${url}/rest/v1/article_announcements`, {
      method: 'POST', headers: { ...H, Prefer: 'return=representation' },
      body: JSON.stringify({ slug: article.slug, sent: 0 }),
    });
    if (!claim.ok) { report.push({ slug: article.slug, skipped: claim.status === 409 ? 'already announced' : `claim ${claim.status}` }); continue; }

    const people = await restAll(url, key, 'article_subscribers?unsubscribed_at=is.null&select=email,token&order=created_at');
    if (people.error) {
      await fetch(`${url}/rest/v1/article_announcements?slug=eq.${encodeURIComponent(article.slug)}`, { method: 'DELETE', headers: H }).catch(() => null);
      return json({ ok: false, stage: 'subscribers', error: people.error, report }, 500);
    }

    let sent = 0, failed = 0;
    for (const p of people.rows) {
      const mail = ARTICLE_EMAILS.new_article({
        title: article.title, excerpt: article.excerpt,
        url: `${SITE_URL}${article.path}`, unsubscribeHref: articleUnsubscribeUrl(p.token),
      });
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `Attune <${from}>`, to: [p.email], ...mail }),
      }).catch(() => null);
      if (r?.ok) sent++; else failed++;
    }
    await fetch(`${url}/rest/v1/article_announcements?slug=eq.${encodeURIComponent(article.slug)}`, {
      method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ sent }),
    }).catch(() => null);
    report.push({ slug: article.slug, sent, failed });
  }
  return json({ ok: true, announced: report.filter((r) => r.sent != null).length, report });
}
