/**
 * GET /api/featured-testimonials
 *
 * Public. The survey answers an admin has picked to publish on the homepage.
 *
 * ── NO NAME, BY DESIGN ────────────────────────────────────────────────────
 * This read the old beta survey, which asked for a testimonial, asked for
 * permission to use it, and asked for a first name or initials to put under
 * it. The new survey asks none of those three.
 *
 * Ellie, on the consent question: "Do we have to ask this if we don't include
 * PII with the testimonials? Is there fine print we could have instead that
 * covers us? Wondering if we just don't use names or something."
 *
 * So the fine print under every open question is TESTIMONIAL_NOTICE in
 * api/_lib/survey.js, and what it promises is that nothing published carries a
 * name. This endpoint is where that promise is kept or broken: it selects two
 * columns and the answers, and there is no name in the row to leak.
 *
 * ── WHAT CAN BE PUBLISHED ─────────────────────────────────────────────────
 * One open answer on one response, chosen in the admin, which writes
 * `featured_question` and `featured_at`. Nothing is published by default and
 * nothing is published automatically: a survey answer reaching the homepage is
 * always somebody's decision.
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

import { corsHeaders } from './_lib/http.js';
import { TEXT_QUESTIONS } from './_lib/survey.js';

// No Access-Control-Allow-Origin.
//
// This answered `*`. The homepage fetches it with a relative URL from the same
// origin, so CORS never applied to the only caller it has; the wildcard was
// permission granted to the whole internet for nothing in return. The data is
// public either way, which is why this was harmless rather than a hole.
// Emitting no header is stricter than an allowlist: a cross-origin read is
// refused by the browser outright. corsHeaders takes a request when an
// endpoint genuinely needs to answer another origin.
/* Thirty seconds at the edge and nothing in the browser. It was five minutes
   in both, so after a quote was featured the admin said "That quote is on the
   homepage now" while visitors went on seeing the old one for up to ten. The
   edge copy is what keeps a busy homepage off the database; the browser copy
   bought nothing but staleness. */
function json(o) {
  return new Response(JSON.stringify(o), {
    headers: corsHeaders(undefined, { 'Cache-Control': 'public, max-age=0, s-maxage=30' }),
  });
}

/** What goes under a quote, in place of a name. */
const ATTRIBUTION = { name: 'A verified couple', detail: 'Verified Attune couple' };

export default async function handler() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY
           || process.env.SUPABASE_SERVICE_ROLE_KEY
           || process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) return json([]);
  try {
    const r = await fetch(
      `${url}/rest/v1/survey_responses`
      + '?featured_at=not.is.null'
      + '&select=answers,featured_question,featured_at'
      + '&order=featured_at.desc&limit=12',
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    const rows = await r.json();
    const out = [];
    for (const row of (Array.isArray(rows) ? rows : [])) {
      const qid = row && row.featured_question;
      /* Only an open answer. A star rating or a ranking is not a sentence, and
         a bug that pointed this at one would publish "4" in quotation marks. */
      if (!qid || !TEXT_QUESTIONS.includes(qid)) continue;
      const text = String(((row.answers || {})[qid]) || '').trim();
      if (!text) continue;
      out.push({ text: `“${text}”`, ...ATTRIBUTION });
    }
    return json(out);
  } catch (e) {
    /* A homepage section that cannot load its quotes draws nothing, which is
       what it already does with none. */
    return json([]);
  }
}
