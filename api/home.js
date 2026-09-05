/**
 * GET /api/home
 *
 * Everything the app's landing screen needs, in one call: the greeting, the
 * primary action, up to three secondary ones, and the tab badges.
 *
 * One call on purpose. The landing screen is the first thing a person sees when
 * they open the app, often on a poor connection, and stitching it together from
 * four requests is how you get a screen that pops in piece by piece.
 *
 * The decision of WHAT to prompt lives in api/_lib/next-action.js, which is
 * pure and tested. This endpoint's only job is to gather the state that engine
 * needs and hand back what it returns.
 *
 * Returns 200 { ok, greeting, primary, secondary, badges, state } or 401.
 */

export const config = { runtime: 'edge' };

import { nextActions, greeting } from './_lib/next-action.js';

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });
const has = (o) => !!(o && Object.keys(o).length);

export default async function handler(req) {
  if (req.method !== 'GET') return json({ ok: false, error: 'GET only' }, 405);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || serviceKey;
  if (!supabaseUrl || !serviceKey) return json({ ok: false, error: 'Server not configured' }, 500);

  const token = (req.headers.get('authorization') || req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ ok: false, error: 'missing auth token' }, 401);

  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    });
    if (!userRes.ok) return json({ ok: false, error: 'invalid auth token' }, 401);
    const user = await userRes.json().catch(() => null);
    if (!user?.id) return json({ ok: false, error: 'invalid auth token' }, 401);

    const svc = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    const cols = [
      'id', 'name', 'pronouns', 'partner_profile_id', 'pkg',
      'ex1_answers', 'ex2_answers', 'ex3_answers', 'intimacy_data',
      'addon_reflection', 'addon_budget', 'addon_checklist', 'addon_intimacy',
      'budget_data', 'checklist_data', 'profile_setup_complete',
      'results_last_opened_at', 'partner_nudged_at', 'feedback_given_at',
    ].join(',');

    const meRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=${cols}`, { headers: svc });
    const me = (await meRes.json().catch(() => []))?.[0];
    if (!me) return json({ ok: false, error: 'profile not found' }, 404);

    let partner = null;
    if (me.partner_profile_id) {
      const pRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${me.partner_profile_id}&select=${cols}`, { headers: svc });
      partner = (await pRes.json().catch(() => []))?.[0] || null;
    }

    // What the couple owns. Premium bundles reflection and intimacy; add-ons
    // grant them on other packages. Exercises 1 and 2 are in every package.
    const pkg = me.pkg || 'core';
    const ownsReflection = pkg === 'premium' || pkg === 'anniversary' || !!me.addon_reflection;
    const ownsIntimacy = pkg === 'premium' || !!me.addon_intimacy;

    const exercises = {
      ex1: { owned: true, mine: has(me.ex1_answers), theirs: has(partner?.ex1_answers) },
      ex2: { owned: true, mine: has(me.ex2_answers), theirs: has(partner?.ex2_answers) },
      ex3: { owned: ownsReflection, mine: has(me.ex3_answers), theirs: has(partner?.ex3_answers) },
      intimacy: { owned: ownsIntimacy, mine: has(me.intimacy_data?.answers), theirs: has(partner?.intimacy_data?.answers) },
    };
    const resultsReady = exercises.ex1.mine && exercises.ex1.theirs && exercises.ex2.mine && exercises.ex2.theirs;

    // The revisit anchor: the couple's widest gap, read from the stored results
    // rather than recomputed, since this endpoint should stay cheap.
    let topGapDimensionLabel = null, coupleType = null;
    if (resultsReady && me.partner_profile_id) {
      const [a, b] = [me.id, me.partner_profile_id].sort();
      const rRes = await fetch(
        `${supabaseUrl}/rest/v1/couple_results?partner_a=eq.${a}&partner_b=eq.${b}&select=couple_type,results`,
        { headers: svc });
      const row = (await rRes.json().catch(() => []))?.[0];
      coupleType = row?.couple_type || null;
      const top = row?.results?.rankedGaps?.[0]?.dim;
      if (top) topGapDimensionLabel = top;
    }

    // Newest published post, and whether they have read it. Drives the
    // "new in In Practice" card, and the badge below.
    let inPractice = {};
    try {
      const nowIso = new Date().toISOString();
      const [pRes, rRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/posts?published_at=not.is.null&published_at=lte.${nowIso}&select=id,title,published_at&order=published_at.desc&limit=1`, { headers: svc }),
        fetch(`${supabaseUrl}/rest/v1/post_reads?owner_id=eq.${me.id}&select=post_id,read_at&order=read_at.desc&limit=1`, { headers: svc }),
      ]);
      const latest = (await pRes.json().catch(() => []))?.[0];
      const lastRead = (await rRes.json().catch(() => []))?.[0];
      if (latest) {
        inPractice = {
          latestId: latest.id,
          latestTitle: latest.title,
          latestPublishedAt: latest.published_at,
          lastReadAt: lastRead?.read_at || null,
        };
      }
    } catch { /* no posts table yet, or a read failure: the card just never raises */ }

    const state = {
      now: new Date().toISOString(),
      firstName: (me.name || '').trim().split(/\s+/)[0] || null,
      partnerName: (partner?.name || '').trim().split(/\s+/)[0] || null,
      profileComplete: !!me.profile_setup_complete,
      exercises,
      resultsReady,
      resultsLastOpenedAt: me.results_last_opened_at || null,
      resources: {
        budget: { owned: pkg === 'premium' || pkg === 'newlywed' || !!me.addon_budget,
                  started: has(me.budget_data), complete: !!me.budget_data?.completedAt },
        checklist: { owned: pkg === 'newlywed' || !!me.addon_checklist,
                     started: has(me.checklist_data), complete: !!me.checklist_data?.completedAt },
      },
      inPractice,
      partnerNudgedAt: me.partner_nudged_at || null,
      opens30d: 0,
      feedbackGivenAt: me.feedback_given_at || null,
      topGapDimensionLabel,
    };

    const { primary, secondary } = nextActions(state);

    return json({
      ok: true,
      greeting: greeting({ now: state.now, firstName: state.firstName, returning: !!me.results_last_opened_at }),
      primary,
      secondary,
      // Tab badges: what each tab should show as outstanding.
      badges: {
        toolbox: ['ex1', 'ex2', 'ex3', 'intimacy'].filter(k => exercises[k].owned && !exercises[k].mine).length
               + (state.resources.budget.owned && !state.resources.budget.complete ? 1 : 0)
               + (state.resources.checklist.owned && !state.resources.checklist.complete ? 1 : 0),
        insights: resultsReady && !me.results_last_opened_at ? 1 : 0,
        practice: (inPractice.latestId && (!inPractice.lastReadAt
          || new Date(inPractice.lastReadAt) < new Date(inPractice.latestPublishedAt))) ? 1 : 0,
        notes: 0,
      },
      state: { resultsReady, coupleType, partnerLinked: !!me.partner_profile_id },
    });
  } catch (e) {
    console.error('[home] failed:', e);
    return json({ ok: false, error: 'home unavailable' }, 500);
  }
}
