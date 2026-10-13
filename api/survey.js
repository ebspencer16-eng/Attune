/**
 * GET  /api/survey   the questions this person should see, and their answers
 * POST /api/survey   save what they have written so far
 *
 * ── ONE SURVEY, THREE PLACES TO ANSWER IT ─────────────────────────────────
 * The end of the results on the website, the Settings screen in the app, and
 * /feedback for somebody arriving from an email. All three ask this endpoint
 * rather than carrying a copy of the questions, which is how three different
 * surveys came to exist in the first place.
 *
 * ── PARTIAL ANSWERS ARE THE POINT ─────────────────────────────────────────
 * Ellie: "Collect incomplete responses." So every POST is an upsert of
 * whatever has been written so far, and `completed_at` is set only when the
 * surface says they reached the end. A person who answers three questions and
 * closes the tab has told us three things, and the old survey threw all three
 * away.
 *
 * ── WHAT IS NOT STORED ────────────────────────────────────────────────────
 * No name and no email. The row carries a profile id so a half-finished survey
 * can be resumed and so both halves of a couple can be read together, and
 * nothing in the admin ever shows either. A quotation we publish carries no
 * name at all; the sentence that says so is in api/_lib/survey.js.
 *
 * Auth: a Bearer token where there is one. Without it the survey still answers
 * with the questions, because somebody following a link from an email has no
 * session, and their answers are stored with no respondent.
 */

import { createClient } from '@supabase/supabase-js';

import { jsonBody } from './_lib/http.js';
import { EXERCISES } from './_exercises.js';
import { capabilitiesFor, OWNERSHIP_COLUMNS } from './_lib/ownership.js';
import { doneFromProfile } from './_lib/results-gate.js';
import { EXERCISE_COLUMNS } from './_exercises.js';
import {
  SURVEY_COPY, SURVEY_QUESTIONS, SURVEY_VERSION, TESTIMONIAL_NOTICE,
  hasAnswer, rankOptionsFor, visibleQuestions,
} from './_lib/survey.js';

export const config = { runtime: 'edge' };

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: HEADERS });

/** Everything a surface needs to draw the survey, for this person. */
function form(rankOptions, answers = {}, finished = false) {
  return {
    ok: true,
    /* Whether they have already reached the end, so a surface does not ask a
       second time on a second device. The website read a profile column for
       this; the row the answers are in is the thing that knows. */
    finished,
    version: SURVEY_VERSION,
    copy: SURVEY_COPY,
    notice: TESTIMONIAL_NOTICE,
    /* Every question, with the ranking's options filled in, plus which of them
       are showing right now. A surface draws `visible`; `questions` is there so
       it can re-evaluate without a round trip as answers change. */
    questions: SURVEY_QUESTIONS.map((q) => (q.kind === 'rank' ? { ...q, options: rankOptions } : q)),
    visible: visibleQuestions(answers, rankOptions).map((q) => q.id),
    rankOptions,
    answers,
  };
}

export default async function handler(req) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE;
  if (!supabaseUrl || !serviceKey) return json(500, { ok: false, error: 'Server not configured' });

  const auth = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  /* Who is asking, if anybody. A survey reached from an email has no session
     and still gets the questions. */
  let me = null;
  if (token) {
    const { data: who } = await admin.auth.getUser(token);
    me = who?.user?.id || null;
  }

  /* What this person can be asked to rank, from their own row. Without a
     session it falls back to the two everybody has, because a list built from
     nothing would be a list of everything. */
  let rankOptions = rankOptionsFor({ done: {}, caps: {}, exercises: EXERCISES });
  let profile = null;
  if (me) {
    const cols = ['id', 'partner_profile_id', ...OWNERSHIP_COLUMNS, ...EXERCISE_COLUMNS].join(',');
    const { data } = await admin.from('profiles').select(cols).eq('id', me).maybeSingle();
    profile = data || null;
    if (profile) {
      const { caps, ...owns } = capabilitiesFor(profile);
      rankOptions = rankOptionsFor({
        done: doneFromProfile(profile),
        caps: { ...caps, ...owns },
        exercises: EXERCISES,
      });
    }
  }

  // ── What they have written so far ────────────────────────────────────────
  if (req.method === 'GET') {
    let answers = {};
    let finished = false;
    if (me) {
      const { data } = await admin.from('survey_responses')
        .select('answers, completed_at').eq('respondent_id', me).maybeSingle();
      answers = data?.answers || {};
      finished = !!data?.completed_at;
    }
    return json(200, form(rankOptions, answers, finished));
  }

  if (req.method !== 'POST') return json(405, { ok: false, error: 'GET or POST only' });

  const _parsed = await jsonBody(req);
  if (_parsed.error) return _parsed.error;
  const body = _parsed.body || {};
  const answers = body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers)
    ? body.answers : null;
  if (!answers || !hasAnswer(answers)) {
    /* An empty submission is a page loading, not an answer. */
    return json(400, { ok: false, error: 'Nothing to record.' });
  }

  /* Only ids this survey asks about, and nothing that is not a string, a
     number or a list of strings. The body is the one thing a caller controls. */
  const known = new Set(SURVEY_QUESTIONS.map((q) => q.id));
  const clean = {};
  for (const [k, v] of Object.entries(answers)) {
    if (!known.has(k)) continue;
    if (typeof v === 'number' || typeof v === 'boolean') clean[k] = v;
    else if (typeof v === 'string') clean[k] = v.slice(0, 4000);
    else if (Array.isArray(v)) clean[k] = v.filter((x) => typeof x === 'string').slice(0, 20).map((x) => x.slice(0, 200));
  }
  if (!hasAnswer(clean)) return json(400, { ok: false, error: 'Nothing to record.' });

  const coupleId = profile
    ? (profile.partner_profile_id ? [profile.id, profile.partner_profile_id].sort().join(':') : profile.id)
    : null;
  const source = ['results', 'app', 'link'].includes(body.source) ? body.source : 'link';
  const now = new Date().toISOString();
  const row = {
    respondent_id: me,
    couple_id: coupleId,
    answers: clean,
    version: SURVEY_VERSION,
    source,
    updated_at: now,
    ...(body.done === true ? { completed_at: now } : {}),
  };

  try {
    if (me) {
      /* One row per person, so the half-finished one is the one that gets
         finished. onConflict names the unique index migration 079 creates. */
      const { error } = await admin.from('survey_responses')
        .upsert(row, { onConflict: 'respondent_id' });
      if (error) throw error;
    } else {
      const { error } = await admin.from('survey_responses').insert(row);
      if (error) throw error;
    }
  } catch (e) {
    const missing = /survey_responses|does not exist|schema cache/i.test(String(e?.message || ''));
    return json(missing ? 503 : 500, {
      ok: false,
      error: missing ? 'Survey storage is not set up yet (migration 079)' : 'Could not save',
    });
  }

  return json(200, { ok: true, saved: Object.keys(clean).length, done: body.done === true });
}
