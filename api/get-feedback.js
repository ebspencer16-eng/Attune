/**
 * GET /api/get-feedback
 * Returns aggregated feedback data from Vercel KV for the admin analytics page.
 * Protected by ADMIN_SECRET env var if set.
 *
 * Query params:
 *   ?secret=xxx   — must match ADMIN_SECRET env var
 *   ?limit=100    — max entries to return (default 200)
 */

export const config = { runtime: 'edge' };

async function kvGet(key, url, token) {
  const res = await fetch(`${url}/lrange/${key}/0/-1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.result || []).map(r => {
    try { return typeof r === 'string' ? JSON.parse(r) : r; }
    catch { return null; }
  }).filter(Boolean);
}

async function kvCount(key, url, token) {
  const res = await fetch(`${url}/get/${key}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return parseInt(data.result || 0) || 0;
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  const adminSecret = process.env.ADMIN_SECRET;

  // Fail-closed: if ADMIN_SECRET isn't configured, refuse rather than
  // leaving the endpoint open (matches admin-csv).
  if (!adminSecret) {
    return new Response('Admin endpoint not configured', { status: 503 });
  }
  if (secret !== adminSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (!kvUrl || !kvToken) {
    return new Response(JSON.stringify({ error: 'KV not configured', ok: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // All couple type IDs
  const COUPLE_TYPE_IDS = [
    'mirror','steady_pair','complementary','richly_different','quiet_depth','full_room',
    'spark_ground','head_heart','both_logic','both_feeling','fast_repair','slow_repair',
    'conflict_mismatch','close_knit','independent_pair','reach_retreat','structured_life',
    'open_flow','plan_flow','open_book','quiet_reserve','express_reserve','translator',
    'expectation_aligned','expectation_gap'
  ];
  // All 16 possible 4-letter codes
  const STYLE_CODES = [];
  for (const e of ['E','I']) for (const x of ['X','G']) for (const f of ['F','S']) for (const c of ['C','A']) {
    STYLE_CODES.push(e+x+f+c);
  }

  try {
    const feedbackPromises = Promise.all([
      kvGet('attune:feedback', kvUrl, kvToken),
      kvCount('attune:count:love', kvUrl, kvToken),
      kvCount('attune:count:good', kvUrl, kvToken),
      kvCount('attune:count:suggest', kvUrl, kvToken),
      kvCount('attune:count:total', kvUrl, kvToken),
    ]);

    // Type & code counters — batched
    const typePromises = Promise.all(COUPLE_TYPE_IDS.map(id => kvCount(`attune:ct:${id}`, kvUrl, kvToken)));
    const codePromises = Promise.all(STYLE_CODES.map(code => kvCount(`attune:code:${code}`, kvUrl, kvToken)));
    const axisPromises = Promise.all([
      kvCount('attune:axis:energy:E', kvUrl, kvToken),
      kvCount('attune:axis:energy:I', kvUrl, kvToken),
      kvCount('attune:axis:expression:X', kvUrl, kvToken),
      kvCount('attune:axis:expression:G', kvUrl, kvToken),
      kvCount('attune:axis:conflict:F', kvUrl, kvToken),
      kvCount('attune:axis:conflict:S', kvUrl, kvToken),
      kvCount('attune:axis:closeness:C', kvUrl, kvToken),
      kvCount('attune:axis:closeness:A', kvUrl, kvToken),
      kvCount('attune:ct:total', kvUrl, kvToken),
      kvCount('attune:code:total', kvUrl, kvToken),
      kvCount('attune:ex2:complete', kvUrl, kvToken),
      kvCount('attune:ex2:skipped', kvUrl, kvToken),
      kvCount('attune:gap:aligned', kvUrl, kvToken),
      kvCount('attune:gap:compatible', kvUrl, kvToken),
      kvCount('attune:gap:complementary', kvUrl, kvToken),
      kvCount('attune:gap:distinct', kvUrl, kvToken),
    ]);

    const [[allFeedback, loveCount, goodCount, suggestCount, totalCount], typeCounts, codeCounts, axisCounts] =
      await Promise.all([feedbackPromises, typePromises, codePromises, axisPromises]);

    // Aggregate survey responses
    const appResponses = allFeedback.filter(f => f.source === 'app_experience');
    const footerResponses = allFeedback.filter(f => f.source === 'footer_quick');
    const suggestions = footerResponses.filter(f => f.message && f.rating === 'suggest');

    // Survey scale question aggregates
    const scaleQuestions = ['q_clear','q_accurate','q_useful','q_conv'];
    const scaleAgg = {};
    scaleQuestions.forEach(q => {
      const vals = appResponses.map(r => r.questionAnswers?.[q]).filter(v => v != null && v !== undefined);
      const counts = [0,0,0,0,0];
      vals.forEach(v => { if (v >= 0 && v <= 4) counts[v]++; });
      const avg = vals.length ? (vals.reduce((s,v) => s+v, 0) / vals.length) : null;
      scaleAgg[q] = { counts, avg: avg !== null ? Math.round(avg * 10) / 10 : null, n: vals.length };
    });

    // Overall rating distribution (app + footer combined)
    const ratingDist = { 0: 0, 1: 0, 2: 0, 3: 0 };
    allFeedback.forEach(f => {
      if (typeof f.rating === 'number' && f.rating >= 0 && f.rating <= 3) {
        ratingDist[f.rating]++;
      }
    });

    // Stage distribution
    const stageDist = {};
    appResponses.forEach(f => {
      const s = f.questionAnswers?.q_stage || f.stage;
      if (s) stageDist[s] = (stageDist[s] || 0) + 1;
    });

    // How heard distribution
    const howHeardDist = {};
    appResponses.forEach(f => {
      const h = f.questionAnswers?.q_source || f.howHeard;
      if (h) howHeardDist[h] = (howHeardDist[h] || 0) + 1;
    });

    // Package distribution
    const pkgDist = {};
    appResponses.forEach(f => {
      if (f.pkgType) pkgDist[f.pkgType] = (pkgDist[f.pkgType] || 0) + 1;
    });

    // Recent suggestions (last 20)
    const recentSuggestions = suggestions.slice(-20).reverse().map(f => ({
      message: f.message, page: f.page, ts: f.ts
    }));

    // Recent open-text responses
    const openText = appResponses
      .filter(f => f.questionAnswers?.q_open)
      .slice(-20).reverse()
      .map(f => ({ text: f.questionAnswers.q_open, rating: f.rating, ts: f.ts }));

    // Build type distribution object
    const coupleTypeDist = {};
    COUPLE_TYPE_IDS.forEach((id, i) => { if (typeCounts[i] > 0) coupleTypeDist[id] = typeCounts[i]; });

    // Build style code distribution
    const styleCodeDist = {};
    STYLE_CODES.forEach((code, i) => { if (codeCounts[i] > 0) styleCodeDist[code] = codeCounts[i]; });

    // Axis breakdown
    const axisDist = {
      energy:     { E: axisCounts[0], I: axisCounts[1] },
      expression: { X: axisCounts[2], G: axisCounts[3] },
      conflict:   { F: axisCounts[4], S: axisCounts[5] },
      closeness:  { C: axisCounts[6], A: axisCounts[7] },
    };

    // Gap tier distribution
    const gapDist = {
      aligned: axisCounts[12], compatible: axisCounts[13],
      complementary: axisCounts[14], distinct: axisCounts[15],
    };

    return new Response(JSON.stringify({
      ok: true,
      counts: {
        total: allFeedback.length,
        appExperience: appResponses.length,
        footerQuick: footerResponses.length,
        love: loveCount,
        good: goodCount,
        suggest: suggestCount,
        footerTotal: totalCount,
        typesTracked: axisCounts[8],
        codesTracked: axisCounts[9],
        ex2Complete: axisCounts[10],
        ex2Skipped: axisCounts[11],
      },
      ratingDist,
      scaleAgg,
      stageDist,
      howHeardDist,
      pkgDist,
      recentSuggestions,
      openText,
      coupleTypeDist,
      styleCodeDist,
      axisDist,
      gapDist,
      lastUpdated: new Date().toISOString(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
