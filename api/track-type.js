import { jsonBody } from './_lib/http.js';
/**
 * POST /api/track-type
 *
 * Records anonymized couple and individual type data for analytics.
 * NO PII is collected or stored. The only data stored is:
 *   - coupleTypeId   — e.g. "mirror", "steady_pair"
 *   - codeA          — individual style code, e.g. "EXFC" (4 letters, no identity)
 *   - codeB          — partner style code
 *   - gapTier        — "aligned" | "compatible" | "complementary" | "distinct"
 *   - hasEx2         — bool: did both partners complete expectations exercise
 *
 * Stored in Vercel KV as counters — never as linked records.
 *
 * Required env vars (optional — gracefully no-ops if absent):
 *   KV_REST_API_URL
 *   KV_REST_API_TOKEN
 */

import { COUPLE_TYPES } from './_couple-types.js';
import { STYLE_CODE_PATTERN } from './_lib/style-codes.js';

export const config = { runtime: 'edge' };

async function kvIncr(key, url, token) {
  try {
    await fetch(`${url}/incr/${key}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (e) {
    console.warn('KV incr failed:', key, e);
  }
}

async function kvIncrBy(key, amount, url, token) {
  try {
    await fetch(`${url}/incrby/${key}/${amount}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (e) {}
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const _parsed = await jsonBody(req);
  if (_parsed.error) return _parsed.error;
  const body = _parsed.body;

  const { coupleTypeId, codeA, codeB, gapTier, hasEx2 } = body;

  // Validate — only accept known code patterns and type IDs
  /**
   * The shape of a style code, from the axes that define one.
   *
   * This was /^[EIXGFSC]{4}$/: four characters, from an alphabet containing
   * none of R, L, D, H, Q or T. The code has been six axes for a long time, so
   * every one that arrived failed this test and was SKIPPED rather than
   * refused, which is why nothing ever said so. The admin's style distribution
   * has read zero for every code since.
   */
  const validCodes = STYLE_CODE_PATTERN;
  /**
   * ── THE TYPES, FROM THE TABLE THAT DEFINES THEM ─────────────────────────
   * These twenty-five were written out here, and not one of them is a couple
   * type any more. The product types a couple as a pair of individual codes,
   * WW through ZZ, which is what api/_couple-types.js holds and what
   * src/App.jsx sends: `coupleTypeId: coupleType?.id`.
   *
   * So every real couple that finished was answered with 400 "invalid type"
   * and nothing was recorded. Verified against the live endpoint: WX, WW and
   * ZZ are all refused. The only thing this has ever counted is the fallback
   * the website used when a couple had NO type, which it sent as
   * "complementary", so the one bucket with anything in it is a legacy name
   * standing for couples the type engine could not place.
   *
   * Ellie reads the admin to find out what customers are like.
   */
  const validTypes = COUPLE_TYPES.map((t) => t.id);
  const validGapTiers = ['aligned','compatible','complementary','distinct'];

  if (!coupleTypeId || !validTypes.includes(coupleTypeId)) {
    return new Response(JSON.stringify({ ok: false, reason: 'invalid type' }), { status: 400 });
  }

  const kvUrl   = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (!kvUrl || !kvToken) {
    // Graceful no-op — no KV, no error surfaced to user
    return new Response(JSON.stringify({ ok: true, stored: false }), { status: 200 });
  }

  const ops = [];

  // Couple type counter
  ops.push(kvIncr(`attune:ct:${coupleTypeId}`, kvUrl, kvToken));
  ops.push(kvIncr('attune:ct:total', kvUrl, kvToken));

  // Individual style code counters (A and B are just "person" and "partner" — no ordering identity)
  if (codeA && validCodes.test(codeA)) {
    ops.push(kvIncr(`attune:code:${codeA}`, kvUrl, kvToken));
    ops.push(kvIncr('attune:code:total', kvUrl, kvToken));
  }
  if (codeB && validCodes.test(codeB)) {
    ops.push(kvIncr(`attune:code:${codeB}`, kvUrl, kvToken));
    ops.push(kvIncr('attune:code:total', kvUrl, kvToken));
  }

  // Axis popularity counters (extracted from codes)
  for (const code of [codeA, codeB].filter(c => c && validCodes.test(c))) {
    const [e, x, f, c] = code;
    ops.push(kvIncr(`attune:axis:energy:${e}`,     kvUrl, kvToken));
    ops.push(kvIncr(`attune:axis:expression:${x}`, kvUrl, kvToken));
    ops.push(kvIncr(`attune:axis:conflict:${f}`,   kvUrl, kvToken));
    ops.push(kvIncr(`attune:axis:listening:${c}`,  kvUrl, kvToken));
  }

  // Gap tier distribution
  if (gapTier && validGapTiers.includes(gapTier)) {
    ops.push(kvIncr(`attune:gap:${gapTier}`, kvUrl, kvToken));
  }

  // Expectations completion rate
  if (hasEx2 === true)  ops.push(kvIncr('attune:ex2:complete', kvUrl, kvToken));
  if (hasEx2 === false) ops.push(kvIncr('attune:ex2:skipped', kvUrl, kvToken));

  await Promise.all(ops);

  return new Response(JSON.stringify({ ok: true, stored: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
