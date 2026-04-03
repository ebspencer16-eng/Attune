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

  let body;
  try { body = await req.json(); }
  catch { return new Response('Invalid JSON', { status: 400 }); }

  const { coupleTypeId, codeA, codeB, gapTier, hasEx2 } = body;

  // Validate — only accept known code patterns and type IDs
  const validCodes = /^[EIXGFSC]{4}$/;
  const validTypes = [
    'mirror','steady_pair','complementary','richly_different','quiet_depth','full_room',
    'spark_ground','head_heart','both_logic','both_feeling','fast_repair','slow_repair',
    'conflict_mismatch','close_knit','independent_pair','reach_retreat','structured_life',
    'open_flow','plan_flow','open_book','quiet_reserve','express_reserve','translator',
    'expectation_aligned','expectation_gap'
  ];
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
    ops.push(kvIncr(`attune:axis:closeness:${c}`,  kvUrl, kvToken));
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
