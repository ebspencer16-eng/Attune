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
import { userForRequest } from './_lib/verify-token.js';
import { phases, withTiming } from './_lib/server-timing.js';
/* The one string that names a couple; the sort used to be written out below. */
import { coupleKeyOf } from './_lib/couple-key.js';

/**
 * ── AND WHERE IT RUNS ─────────────────────────────────────────────────────
 * Ellie: "Keep trying to speed things up."
 *
 * An edge function runs near whoever is asking, which is the right default
 * when the answer is already at the edge. It is the wrong default when every
 * answer has to come from one database somewhere else: the request lands in
 * San Francisco, measured, and then each read crosses the country and back.
 * A lookup by primary key measured 200 to 600ms, which is most of what is
 * left of the wait and far more than the query itself can account for.
 *
 * `regions` pins it. The customer's own hop gets longer by a few tens of
 * milliseconds and the two database hops get much shorter, which is the right
 * trade when there are more of the second kind than the first.
 *
 * iad1 is the guess, because it is where Supabase puts a project by default.
 * It IS a guess: the region is not visible from outside, so this is an
 * experiment with a measurement either side of it rather than a fact. If the
 * numbers get worse it comes straight back out, and the Server-Timing header
 * is what says which.
 */
export const config = { runtime: 'edge', regions: ['iad1'] };

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
/**
 * ── AND IT SAYS HOW LONG IT TOOK ──────────────────────────────────────────
 * One of the three endpoints the app calls the moment it opens. See
 * api/_lib/server-timing.js for why they all report now.
 *
 * Note the argument order: status first here, body second, which is this
 * file's own convention and not worth changing for the sake of matching the
 * others.
 */
const json = (status, body, timing = null) => new Response(JSON.stringify(body), {
  status,
  headers: withTiming(HEADERS, timing),
});

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
  /* See api/_lib/server-timing.js, and the note above `json`. */
  const t = phases();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE;
  /* The public key, for the token check's fall-back path. */
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || serviceKey;
  if (!supabaseUrl || !serviceKey) return json(500, { ok: false, error: 'Server not configured' });

  const auth = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  /* Who is asking, if anybody. A survey reached from an email has no session
     and still gets the questions. */
  let me = null;
  if (token) {
    /**
     * ── CHECKED HERE, NOT OVER THE NETWORK ────────────────────────────
     * This was `admin.auth.getUser(token)`, which is a round trip to
     * Supabase before anything else happens, on one of the three requests
     * the app makes the instant it opens. The token is signed and the
     * project publishes the key; see api/_lib/verify-token.js, which falls
     * back to asking the server for anything it cannot decide.
     */
    const who = await t.mark('auth', () => userForRequest({ token, supabaseUrl, anonKey }));
    me = who?.id || null;
  }

  /* What this person can be asked to rank, from their own row. Without a
     session it falls back to the two everybody has, because a list built from
     nothing would be a list of everything. */
  let rankOptions = rankOptionsFor({ done: {}, caps: {}, exercises: EXERCISES });
  let profile = null;
  if (me) {
    const cols = ['id', 'partner_profile_id', ...OWNERSHIP_COLUMNS, ...EXERCISE_COLUMNS].join(',');
    const { data } = await t.mark('profile', () => admin.from('profiles').select(cols).eq('id', me).maybeSingle());
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
      const { data, error } = await t.mark('answers', () => admin.from('survey_responses')
        .select('answers, completed_at').eq('respondent_id', me).maybeSingle());
      /* A failed read is not an empty survey. The form opened blank, and the
         save replaces the stored answers with what the form sends, so the
         first autosave after a failed read wrote one answer over everything
         they had given. Every client already handles a refusal: the app
         offers a retry, the website hides the card, the feedback page says
         to refresh. Found by sweep-masquerading-defaults (A170). */
      if (error) return json(503, { ok: false, error: 'Could not read your answers. Try again in a moment.' }, t.header());
      answers = data?.answers || {};
      finished = !!data?.completed_at;
    }
    return json(200, form(rankOptions, answers, finished), t.header());
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

  /**
   * Which couple this answer belongs to.
   *
   * The sort was written out here, which made it the fifth copy of the one
   * string that names a couple: see api/_lib/couple-key.js, whose header says
   * the third is what made it worth naming.
   *
   * The fallback is this endpoint's own and is kept: a respondent with nobody
   * linked is filed under their own id rather than null, so their answer is
   * still attributable to somebody. Worth knowing when reading that column,
   * because it therefore holds two shapes, `a:b` and a bare id, and anything
   * comparing it to a couple key will match the pairs and silently never
   * match the solos.
   */
  const coupleId = profile
    ? (profile.partner_profile_id ? coupleKeyOf(profile.id, profile.partner_profile_id) : profile.id)
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

  /**
   * Reaching the end stops the home card asking again.
   *
   * `feedback_given_at` has existed since migration 050 and nothing has ever
   * written it, so the two cards that ask for feedback have been asking for
   * ever: the condition they are gated on could never become true. The
   * questionnaire that was supposed to set it is retired; the survey is what
   * the cards open now, so the survey is what records it.
   */
  if (me && body.done === true) {
    try {
      await admin.from('profiles').update({ feedback_given_at: now }).eq('id', me);
    } catch (e) { /* the answers are stored; the card asking twice is the lesser loss */ }
  }

  return json(200, { ok: true, saved: Object.keys(clean).length, done: body.done === true });
}
