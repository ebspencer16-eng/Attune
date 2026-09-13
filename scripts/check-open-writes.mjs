#!/usr/bin/env node
/**
 * An endpoint that writes without auth has to refuse an empty submission.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * /api/send-feedback and /api/submit-beta-survey take a POST from anyone, on
 * purpose: feedback from someone who is not signed in is still feedback, and
 * the beta survey is filled in on a static page with no session. Both write.
 * So both have to tell a submission from an empty one, and refuse the empty
 * one with a 400.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * `curl -X POST -d '{}'` at either of them answered 200. submit-beta-survey
 * stored a feedback_submissions row and emailed the admin; send-feedback wrote
 * a KV record. Nothing rate-limits either, nothing checks an origin, and both
 * feed the admin screens: Feedback Overview, Beta Feedback and Survey Explorer
 * all count these rows. Anyone who found the URL could have moved the numbers
 * Ellie reads, and the first sign of it would have been a survey count that
 * did not match the people.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * By calling the handlers, not by reading them. Each gets an empty body, a
 * body of nothing but metadata, and then the real shape each sender posts.
 * The first two must be refused and the third must not. Running the code is
 * the point: a guard that is present but placed after the write would read
 * fine and still fail here.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Not rate limiting, and not authenticity. A determined sender can still post
 * a body with an answer in it as often as it likes; what this refuses is the
 * empty one, which is the shape a scanner or a bored visitor produces.
 *
 * Not every open endpoint. It names these two because these two write on an
 * unauthenticated POST. Any third one belongs in this list.
 */

import { SITE_URL } from '../api/_lib/site.js';

const fails = [];

/**
 * Every write these handlers make goes out through fetch, so fetch is replaced
 * by a counter and the env is filled with values that get them as far as
 * trying. That is what lets a refusal be checked for silence as well as for a
 * 400: a guard sitting below the write would still answer 400 and would still
 * have written, and the call count is what tells those apart.
 */
const calls = [];
globalThis.fetch = async (url) => {
  calls.push(String(url));
  return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
};
Object.assign(process.env, {
  RESEND_API_KEY: 'test-not-a-real-key',
  SUPABASE_URL: 'https://example.invalid',
  SUPABASE_SERVICE_KEY: 'test-not-a-real-key',
  KV_REST_API_URL: 'https://example.invalid',
  KV_REST_API_TOKEN: 'test-not-a-real-key',
});

/** The handlers log what they would have sent. Not this tool's output. */
const realLog = console.log;
console.log = () => {};

const post = (path, body) => new Request(`${SITE_URL}${path}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: SITE_URL },
  body: JSON.stringify(body),
});

const CASES = [
  {
    path: '/api/send-feedback',
    module: '../api/send-feedback.js',
    refuse: [
      ['an empty body', {}],
      ['a source and nothing else', { source: 'app_experience' }],
      ['an empty answers object', { source: 'app_experience', questionAnswers: {} }],
      ['a message of spaces', { source: 'app_experience', message: '   ' }],
    ],
    accept: [
      // what attune-app/src/api/client.ts sendFeedback posts
      ['the app experience form', { source: 'app_experience', rating: 3, questionAnswers: { q_overall: 3 }, message: 'It helped.' }],
      // a rating with no words is still a rating
      ['a rating alone', { source: 'app_experience', rating: 0 }],
      // what the website's footer widget posted when it existed
      ['a footer message', { source: 'footer_quick', message: 'The map is lovely.', page: '/results' }],
    ],
  },
  {
    path: '/api/submit-beta-survey',
    module: '../api/submit-beta-survey.js',
    refuse: [
      ['an empty body', {}],
      ['metadata and no answers', { surveyType: 'post_results', respondentId: 'x', userName: 'A', completed: true }],
      ['an empty answers object', { surveyType: 'post_results', answers: {} }],
      ['the static page\'s constants alone', { submitted: new Date().toISOString(), survey_version: 'beta_v5' }],
    ],
    accept: [
      // what src/App.jsx sends from the dashboard survey
      ['the dashboard survey', { surveyType: 'post_results', respondentId: 'x', userName: 'A', answers: { q1: 4 }, completed: true }],
      // what public/feedback.html sends, flat rather than nested
      ['the static survey page', { submitted: new Date().toISOString(), survey_version: 'beta_v5', commsOverall: 4, nps: 9 }],
      // the incomplete capture, which is one answer and a completed:false
      ['a part-finished survey', { surveyType: 'post_results', answers: { q1: 2 }, completed: false }],
    ],
  },
];

for (const c of CASES) {
  const { default: handler } = await import(c.module);
  for (const [name, body] of c.refuse) {
    calls.length = 0;
    const res = await handler(post(c.path, body));
    if (res.status !== 400) {
      fails.push(`${c.path} answered ${res.status} to ${name}. It has to refuse that with a 400, because it writes.`);
    }
    if (calls.length) {
      fails.push(`${c.path} refused ${name} and still made ${calls.length} outbound call(s), first ${calls[0]}. The guard is below the write.`);
    }
  }
  for (const [name, body] of c.accept) {
    const res = await handler(post(c.path, body));
    if (res.status === 400) {
      fails.push(`${c.path} refused ${name}, which is a shape one of its own senders posts.`);
    }
  }
}

console.log = realLog;

if (fails.length) {
  console.error('[check-open-writes] an endpoint that writes without auth got this wrong:\n');
  for (const f of fails) console.error('  ' + f);
  process.exit(1);
}

const n = CASES.reduce((a, c) => a + c.refuse.length + c.accept.length, 0);
console.log(`[check-open-writes] ${CASES.length} unauthenticated write endpoints, ${n} bodies: every empty one refused, every real one taken.`);
