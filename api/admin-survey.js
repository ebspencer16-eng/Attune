/**
 * GET  /api/admin-survey   every response, with the codes on its open answers
 * POST /api/admin-survey   add or remove a code on one open answer
 *
 * ── WHAT THE CODING IS FOR ────────────────────────────────────────────────
 * Ellie: "build a tool to postcode open entry responses and quantify for
 * visuals." Four of the survey's questions are free text, and free text is the
 * part nobody reads twice. Coding is reading them once, on purpose, and
 * writing down what each one is ABOUT, so the hundredth answer can be a bar on
 * a chart rather than another paragraph.
 *
 * The codes are free text rather than a fixed list, because the list cannot be
 * guessed before the answers exist. The chart counts whatever has been used.
 *
 * ── WHAT IT NEVER RETURNS ─────────────────────────────────────────────────
 * Any way to tell who wrote something. The respondent id stays on the row and
 * never leaves this endpoint: the admin gets the answers, the codes, and the
 * demographic fields it slices by, and nothing that names a person. A survey
 * that promises anonymity has to be anonymous on the screen somebody reads it
 * on, not only in the sentence under the questions.
 */

import { createClient } from '@supabase/supabase-js';

import { jsonBody } from './_lib/http.js';
import { checkAdminAuth } from './_lib/admin-auth.js';
import { corsHeaders, safeError } from './_lib/http.js';
import { SURVEY_QUESTIONS, SURVEY_VERSION, TEXT_QUESTIONS } from './_lib/survey.js';
import { TESTIMONIAL_THEMES } from './_lib/testimonial-themes.js';
import { codesFor } from './_lib/reflection-codes.js';

/* The label is what the admin draws, and the id is what the matcher returns. */
const THEME_LABEL = Object.fromEntries(TESTIMONIAL_THEMES.map((t) => [t.id, t.label]));
import { demoOwners, selectProfiles } from './_lib/demo-accounts.js';

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

const json = (status, body, req) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', ...(req ? corsHeaders(req) : {}) },
});

export default async function handler(req) {
  const _auth = checkAdminAuth(req);
  if (!_auth.ok) return new Response(_auth.error, { status: _auth.status });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE;
  if (!supabaseUrl || !serviceKey) return json(500, { ok: false, error: 'Server not configured' }, req);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // ── Writing a code ───────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const _parsed = await jsonBody(req);
    if (_parsed.error) return _parsed.error;
    const b = _parsed.body || {};
    const responseId = Number(b.responseId);
    const questionId = typeof b.questionId === 'string' ? b.questionId : '';

    /**
     * Publishing a quote on the homepage.
     *
     * Two columns on the response: which open answer was picked, and when. The
     * homepage reads nothing else, so a quote cannot reach it without somebody
     * choosing both a response and one answer on it.
     *
     * Nothing identifying is written, because there is nothing identifying to
     * write. Ellie removed the old survey's consent question on the
     * understanding that a published quote carries no name; the fine print
     * that says so is under every open question.
     */
    if (b.action === 'feature' || b.action === 'unfeature') {
      const on = b.action === 'feature';
      if (!Number.isFinite(responseId) || (on && !TEXT_QUESTIONS.includes(questionId))) {
        return json(400, { ok: false, error: 'A response and one of its open answers.' }, req);
      }
      try {
        const { error } = await admin.from('survey_responses')
          .update(on
            ? { featured_question: questionId, featured_at: new Date().toISOString() }
            : { featured_question: null, featured_at: null })
          .eq('id', responseId);
        if (error) throw error;
      } catch (e) {
        return json(500, { ok: false, error: safeError('admin-survey', e, 'Could not change the quote.') }, req);
      }
      return json(200, { ok: true, featured: on }, req);
    }

    /* ── THE MANUAL CODING PATH IS GONE ──────────────────────────────────
       It wrote a `survey_codes` row per theme per answer, from a box in the
       admin that Ellie had to type into. Themes are read from the words now,
       by the frame in _lib/testimonial-themes.js, so this endpoint has one
       thing left to write: which answer is the featured quote.

       The table is left alone rather than dropped: a migration that deletes
       somebody's typing is not a change to make on the way past, and nothing
       reads it, so it costs nothing to leave. */
    return json(400, { ok: false, error: 'Themes are read from the answer now; there is nothing to code by hand.' }, req);
  }

  // ── Reading them ─────────────────────────────────────────────────────────
  try {
    const [resQ] = await Promise.all([
      admin.from('survey_responses')
        .select('id, answers, version, source, started_at, updated_at, completed_at, couple_id, respondent_id, featured_question, featured_at')
        .order('updated_at', { ascending: false }).limit(2000),
    ]);
    if (resQ.error) throw resQ.error;

    /**
     * The demographics each answer is sliced by.
     *
     * Read from the profile and attached to the response, then the ids are
     * dropped: the admin can cut the chart by relationship length without ever
     * being handed a row that says who answered.
     */
    const ids = [...new Set((resQ.data || []).map((r) => r.respondent_id).filter(Boolean))];
    const demo = {};
    if (ids.length) {
      const { data: profs, error: profErr } = await selectProfiles(admin, (q) => q
        .select('id, age_range, pronouns, relationship_status, relationship_length, children, signup_source, pkg')
        .in('id', ids));
      /* Without this, a failed read leaves every respondent unsegmented and
         the page says so as though it were the answer. */
      if (profErr) throw profErr;
      for (const p of (profs || [])) {
        const { id, ...rest } = p;
        demo[id] = rest;
      }
    }

    /**
     * ── THE THEMES ARE READ FROM THE WORDS ────────────────────────────────
     * Ellie: "If it's for me to go in and postcode manually, remove this and
     * do it automatically with as many tags as are appropriate."
     *
     * They used to come from `survey_codes`, one row per theme per answer,
     * written by somebody clicking a box in the admin. A hundred and twenty
     * answers each needing a person to read it, and every chart downstream
     * reporting on how far that had got: "10 of 40 read and given a theme" is
     * a measure of reading, not of what anybody said.
     *
     * The frame is api/_lib/testimonial-themes.js and the matcher is the one
     * the other two frames use. As many as fit, which is her ask: a sentence
     * about money and shouting is both.
     */
    const codesBy = {};

    /* A demo's demographics being absent would hide them from the slicers and
       leave their answers in every chart, so the rows go too. */
    const { ids: demoSet, demoFilterApplied } = await demoOwners(admin);

    const responses = (resQ.data || [])
      .filter((r) => !(r.respondent_id && demoSet.has(r.respondent_id)))
      .map((r) => {
      const { respondent_id: who, ...rest } = r;
      return {
        ...rest,
        /* Who answered never leaves this file. */
        segment: demo[who] || {},
        codes: Object.fromEntries(TEXT_QUESTIONS
          .map((q) => {
            const text = (r.answers || {})[q];
            if (typeof text !== 'string' || !text.trim()) return [q, []];
            return [q, codesFor(text, TESTIMONIAL_THEMES).map((id) => THEME_LABEL[id] || id)];
          })
          .filter(([, v]) => v.length)),
      };
    });

    return json(200, {
      ok: true,
      version: SURVEY_VERSION,
      /* False until migration 082 has run, and the page says so when it is. */
      demoFilterApplied,
      questions: SURVEY_QUESTIONS,
      textQuestions: TEXT_QUESTIONS,
      responses,
      counts: {
        all: responses.length,
        finished: responses.filter((r) => r.completed_at).length,
      },
    }, req);
  } catch (e) {
    const missing = /survey_responses|survey_codes|does not exist|schema cache/i.test(String(e?.message || ''));
    return json(missing ? 503 : 500, {
      ok: false,
      error: missing ? 'Survey storage is not set up yet (migration 079)' : safeError('admin-survey', e, 'Could not read the survey.'),
    }, req);
  }
}
