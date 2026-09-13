/**
 * GET /api/region
 *
 * Which privacy rule applies to the person asking, and nothing else.
 *
 *   { country: 'DE', consentRequired: true }
 *
 * ── WHY AN ENDPOINT ───────────────────────────────────────────────────────
 * The static pages are HTML with no build step and no server, so they cannot
 * read a request header. Vercel puts the country on every request as
 * x-vercel-ip-country, and this is the only way to hand it to a page that has
 * to decide between a consent gate and a notice.
 *
 * ── WHAT IT DOES NOT DO ───────────────────────────────────────────────────
 * It stores nothing, logs nothing, and sets no cookie. The country is read off
 * the request and thrown away with it. The retention policy says we keep a
 * country on a consent record, and this is not that: this is the two letters
 * that decide which banner someone sees.
 *
 * It also does not trust the answer for anything that matters. Somebody who
 * spoofs a country gets the other banner, which is not a thing worth
 * defending against: both banners lead to the same product.
 */

import { consentRequired } from './_lib/consent-region.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const country = req.headers.get('x-vercel-ip-country')
    || req.headers.get('X-Vercel-IP-Country')
    || '';

  return new Response(
    JSON.stringify({ country: country || null, consentRequired: consentRequired(country) }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Per-visitor and cheap. Cached at the edge it would hand one
        // visitor's country to the next.
        'Cache-Control': 'private, no-store',
      },
    },
  );
}
