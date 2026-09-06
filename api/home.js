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
import { EXERCISES, EXERCISE_COLUMNS, CORE_EXERCISES, isExerciseDone } from './_exercises.js';
import { CATALOGUE } from './_catalogue.js';

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
      // Answer columns come from the registry. Selecting them by hand is how a
      // new exercise ends up read as never started: the column is simply not in
      // the select, so it arrives undefined and nothing errors.
      ...EXERCISE_COLUMNS,
      'addon_reflection', 'addon_budget', 'addon_checklist', 'addon_intimacy',
      'addon_conflict', 'addon_workbook',
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
    // Premium bundles Conflict Patterns, not Physical Intimacy. This endpoint
    // still had the old rule, so a premium buyer was told they owned intimacy
    // and never told they owned conflict.
    const ownsIntimacy = !!me.addon_intimacy;
    const ownsConflict = pkg === 'premium' || !!me.addon_conflict;
    const ownsBudget = pkg === 'premium' || pkg === 'newlywed' || !!me.addon_budget;
    const ownsChecklist = pkg === 'newlywed' || !!me.addon_checklist;
    const ownsWorkbook = pkg === 'premium' || !!me.addon_workbook;

    // Per-exercise progress, built from the registry rather than listed here.
    // This block used to name all five by hand, which is the exact shape of the
    // bug api/_exercises.js exists to prevent: add an exercise, update four of
    // the five places that enumerate them, and the missed one fails silently.
    //
    // The capability names are the registry's own (`capability: 'hasIntimacy'`),
    // so ownership is a lookup rather than another branch per exercise.
    const caps = {
      hasAnniversary: ownsReflection,
      hasIntimacy: ownsIntimacy,
      hasConflict: ownsConflict,
    };
    // Completion comes from isExerciseDone, which knows the two shapes apart.
    // This block previously tested `has(me.intimacy_data?.answers)`, marking a
    // record-shaped exercise complete as soon as it had any answers rather than
    // when completedAt was set: done the moment someone opened it.
    const exercises = Object.fromEntries(EXERCISES.map((e) => [
      e.key,
      {
        key: e.key,
        label: e.label,
        order: e.order,
        owned: !e.capability || !!caps[e.capability],
        mine: isExerciseDone(e, me[e.column]),
        theirs: isExerciseDone(e, partner?.[e.column]),
      },
    ]));

    // A flat list of what this person owns, for surfaces that ask "what do
    // they have" rather than "how far through are they". Derived here so the
    // app never works it out for itself.
    const owned = [
      ownsReflection && 'reflection',
      ownsIntimacy && 'intimacy',
      ownsConflict && 'conflict',
      ownsBudget && 'budget',
      ownsChecklist && 'checklist',
      ownsWorkbook && 'workbook',
    ].filter(Boolean);
    // Results need both partners through the exercises every package includes.
    // Named ex1 and ex2 by hand before, which would have silently kept results
    // open if a third core exercise were ever added.
    const resultsReady = CORE_EXERCISES.every(
      (e) => exercises[e.key].mine && exercises[e.key].theirs);

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
      owned,
      // What exists to buy, so the app renders the server's catalogue rather
      // than a copy that goes stale the moment an add-on is added or repriced.
      catalogue: CATALOGUE,
      // Per-exercise progress, so the Insights tab can show what is left
      // before results exist rather than a locked empty screen. Computed here
      // already; it was simply never returned.
      exercises,
      // Tab badges: what each tab should show as outstanding.
      badges: {
        toolbox: EXERCISES.filter(e => exercises[e.key].owned && !exercises[e.key].mine).length
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
