/**
 * GET /api/email-preview — every email Attune sends, rendered by the code that
 * sends it.
 *
 * ?list          the emails, with subject, recipient and where each is sent from
 * ?type=<key>    that email as HTML
 *
 * No auth: it sends nothing, reads nothing and takes no input beyond a key of
 * the catalogue. What it returns is marketing copy already on its way to
 * customers.
 *
 * The page at /email-preview used to hold six hand-written mock-ups while the
 * product sent nineteen emails from five modules. Five real emails had no
 * preview, one previewed an email that had been retired, and the wording shown
 * was a second draft of the wording that shipped.
 */

import { EMAIL_CATALOGUE, CATALOGUE_KEYS, renderEmail } from './_lib/email-catalogue.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });

  const params = new URL(req.url).searchParams;
  const want = params.get('type');

  if (!want) {
    const list = CATALOGUE_KEYS.map((k) => {
      const r = renderEmail(k);
      return { type: k, subject: r.subject, to: r.to, from: r.from, sentFrom: r.sentFrom };
    });
    return new Response(JSON.stringify(list), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!Object.prototype.hasOwnProperty.call(EMAIL_CATALOGUE, want)) {
    return new Response(`Unknown email: ${want}`, { status: 404 });
  }

  return new Response(renderEmail(want).html, {
    status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
