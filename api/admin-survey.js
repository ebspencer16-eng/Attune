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

export const config = { runtime: 'edge' };

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

    const code = typeof b.code === 'string' ? b.code.trim().slice(0, 60) : '';
    if (!Number.isFinite(responseId) || !TEXT_QUESTIONS.includes(questionId) || !code) {
      return json(400, { ok: false, error: 'A response, an open question and a code.' }, req);
    }
    try {
      if (b.remove === true) {
        const { error } = await admin.from('survey_codes').delete()
          .eq('response_id', responseId).eq('question_id', questionId).eq('code', code);
        if (error) throw error;
      } else {
        /* Adding the same code twice is a tap rather than an intention, and
           the unique index makes that a no-op rather than a second row. */
        const { error } = await admin.from('survey_codes')
          .upsert({ response_id: responseId, question_id: questionId, code },
            { onConflict: 'response_id,question_id,code', ignoreDuplicates: true });
        if (error) throw error;
      }
    } catch (e) {
      return json(500, { ok: false, error: safeError('admin-survey', e, 'Could not save the code.') }, req);
    }
    return json(200, { ok: true }, req);
  }

  if (req.method !== 'GET') return json(405, { ok: false, error: 'GET or POST only' }, req);

  // ── Reading them ─────────────────────────────────────────────────────────
  try {
    const [resQ, codeQ] = await Promise.all([
      admin.from('survey_responses')
        .select('id, answers, version, source, started_at, updated_at, completed_at, couple_id, respondent_id, featured_question, featured_at')
        .order('updated_at', { ascending: false }).limit(2000),
      admin.from('survey_codes').select('response_id, question_id, code'),
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
      const { data: profs } = await admin.from('profiles')
        .select('id, age_range, pronouns, relationship_status, relationship_length, children, signup_source, pkg')
        .in('id', ids);
      for (const p of (profs || [])) {
        const { id, ...rest } = p;
        demo[id] = rest;
      }
    }

    const codesBy = {};
    for (const c of (codeQ.data || [])) {
      const k = `${c.response_id}:${c.question_id}`;
      (codesBy[k] = codesBy[k] || []).push(c.code);
    }

    const responses = (resQ.data || []).map((r) => {
      const { respondent_id: who, ...rest } = r;
      return {
        ...rest,
        /* Who answered never leaves this file. */
        segment: demo[who] || {},
        codes: Object.fromEntries(TEXT_QUESTIONS
          .map((q) => [q, codesBy[`${r.id}:${q}`] || []])
          .filter(([, v]) => v.length)),
      };
    });

    return json(200, {
      ok: true,
      version: SURVEY_VERSION,
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
