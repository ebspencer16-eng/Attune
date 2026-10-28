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
/* The anonymous couple key, so a response can be cut by anything the cube
   knows about the person who gave it. One implementation, three callers. */
import { anonCoupleId } from './_lib/couple-id.js';
import { pageAll } from './_lib/page-all.js';

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
      pageAll(() => admin.from('survey_responses')
        .select('id, answers, version, source, started_at, updated_at, completed_at, couple_id, respondent_id, featured_question, featured_at'),
        { order: ['-updated_at', 'id'] }),
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
    const coupleOf = {};
    if (ids.length) {
      /**
       * ── TWO PASSES, BECAUSE A COUPLE KEY NEEDS THE PARTNER ──────────────
       * The first read answers "who are these respondents", and the second
       * "is their linked partner somebody we can see". Both facts go into the
       * anonymous couple key, and that key is what lets the Feedback page cut
       * a response by anything at all: see the note on the page's svSlice.
       */
      const { data: profs, error: profErr } = await selectProfiles(admin, (q) => q
        .select('id, partner_profile_id, invite_code, age_range, pronouns, relationship_status, relationship_length, children, signup_source, pkg')
        .in('id', ids));
      /* Without this, a failed read leaves every respondent unsegmented and
         the page says so as though it were the answer. */
      if (profErr) throw profErr;
      const partnerIds = [...new Set((profs || []).map((p) => p.partner_profile_id).filter(Boolean))];
      const partnerSeen = new Set();
      if (partnerIds.length) {
        const { data: pp, error: ppErr } = await selectProfiles(admin, (q) => q.select('id').in('id', partnerIds));
        if (ppErr) throw ppErr;
        for (const x of (pp || [])) partnerSeen.add(x.id);
      }
      /**
       * The legacy route into a couple: an invited partner who answered
       * without ever making a profile. Nothing has written to this table
       * since invited partners got accounts of their own, so it is almost
       * always empty, and api/admin-explore.js still keys a couple on it when
       * it is not. Both ends have to agree about that or those respondents
       * fall out of every cut, which is a quiet undercount rather than a
       * visible failure, so it is read rather than assumed away.
       */
      const invited = new Set();
      {
        const { data: ps, error: psErr } = await pageAll(() => admin.from('partner_sessions')
          .select('invite_code, ex1_answers'), { order: ['invite_code'] });
        /* Thrown rather than collected: this endpoint has no "what I could
           not read" field in its reply, and a failure here is a quiet
           undercount in every cut rather than a visible gap. The handler's
           own catch answers, which is one of the three endings
           check-admin-read-errors accepts. */
        if (psErr) throw psErr;
        for (const sx of (ps || [])) { if (sx?.invite_code && sx.ex1_answers) invited.add(sx.invite_code); }
      }
      for (const p of (profs || [])) {
        const { id, partner_profile_id: pid, invite_code: ic, ...rest } = p;
        demo[id] = rest;
        coupleOf[id] = anonCoupleId({ id, partner_profile_id: pid, invite_code: ic }, {
          partnerPresent: !!(pid && partnerSeen.has(pid)),
          invitePresent: !!(ic && invited.has(ic)),
        });
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
        /**
         * Which couple, by the cube's own anonymous key, so the Feedback
         * page can cut these answers by anything a person is rather than by
         * the seven demographic columns above.
         *
         * Ellie: "comp funnel only has a couple of slicer categories - it
         * should have way more. Be thorough and fix this throughout the
         * site." Eleven tiles on that page offered seven dimensions because
         * seven is what a profile row stores; the other hundred and forty
         * cuts are derived from exercise answers, which this endpoint does
         * not read and should not start reading.
         *
         * Null for a respondent with no partner resolved, which is a couple
         * of one and is out of every cut.
         */
        couple: coupleOf[who] || null,
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
