#!/usr/bin/env node
/**
 * A mid-exercise save cannot un-finish an exercise.
 *
 * ── THE BUG IT COMES FROM ─────────────────────────────────────────────────
 * Physical Intimacy and Conflict Patterns are stored as a record rather than
 * as a bare answers object: { answers, completedAt, ... } in one column. That
 * is what makes them finished. isExerciseDone asks for completedAt and nothing
 * else.
 *
 * Every write replaces the whole record. So reopening a finished one and
 * answering a single question wrote a record with no completedAt over the top,
 * and the exercise quietly went back to unfinished, taking the couple's
 * readiness for results with it. No error, no warning, and nothing in a diff
 * to see: the destruction is in what the new record does not carry.
 *
 * Found by sweeping the write paths after Ellie asked for a look at data
 * saving. It is not reachable from the app's own navigation, because the
 * priority engine only ever points at an exercise nobody has finished, and a
 * deep link carrying ?exercise=conflict is enough.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * By calling the handler with a stubbed Supabase, twice: once against a stored
 * record that is finished, and once against one that is not. The first must
 * keep its completedAt and the second must not gain one.
 *
 * Running it is the point. The rule lives in one branch of one function, and a
 * reader can talk themselves into either behaviour by looking at it.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Not a retake, which is the couple asking for new results and is allowed to
 * replace everything: a retake finishes with completed: true and writes a new
 * completedAt of its own.
 *
 * Not the flat exercises. ex1, ex2 and ex3 keep progress in their own column
 * and cannot overwrite their answers by accident.
 */

import { EXERCISES } from '../api/_exercises.js';

const RECORD = EXERCISES.filter((e) => e.shape === 'record');
if (!RECORD.length) {
  console.error('[check-progress-not-destructive] no record-shaped exercises found;'
    + ' refusing to pass on a subject that has moved.');
  process.exit(1);
}

const ME = '11111111-1111-4111-8111-111111111111';
const WAS_DONE = '2026-01-02T03:04:05.000Z';

/**
 * Supabase, at the network layer.
 *
 * The handler builds its own client from @supabase/supabase-js and an ES
 * module's exports cannot be reassigned, so the stub goes under it rather than
 * in front of it: supabase-js speaks PostgREST over fetch, and fetch is
 * replaceable. The same arrangement check-journal-privacy uses, for the same
 * reason.
 */
let stored = null;
let written = null;

globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  const ok = (v) => new Response(JSON.stringify(v), {
    status: 200, headers: { 'content-type': 'application/json' },
  });
  if (u.includes('/auth/v1/user')) return ok({ id: ME, email: 'test@example.invalid' });
  if (u.includes('/rest/v1/profiles')) {
    if ((init.method || 'GET').toUpperCase() === 'PATCH') {
      written = JSON.parse(init.body || '{}');
      return ok([{ id: ME }]);
    }
    return ok([stored || {}]);
  }
  return ok([]);
};

Object.assign(process.env, {
  SUPABASE_URL: 'https://example.invalid',
  SUPABASE_SERVICE_KEY: 'test-not-a-real-key',
  SUPABASE_ANON_KEY: 'test-not-a-real-key',
});

const realLog = console.log;
const realErr = console.error;
console.log = () => {};
console.error = () => {};

const { SITE_URL } = await import('../api/_lib/site.js');
const handler = (await import('../api/save-exercise.js')).default;

const post = (body) => new Request(`${SITE_URL}/api/save-exercise`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: 'Bearer test-token', origin: SITE_URL },
  body: JSON.stringify(body),
});

const fails = [];

for (const ex of RECORD) {
  /* 1. A progress save against a FINISHED record keeps the completion. */
  stored = { [ex.column]: { answers: { q1: 'a' }, completedAt: WAS_DONE } };
  written = null;
  await handler(post({
    userId: ME, exercise: ex.key, progress: true,
    answers: { answers: { q1: 'a', q2: 'b' } },
  }));
  const after = written?.[ex.column];
  if (!after) {
    fails.push(`${ex.key}: a progress save wrote nothing to ${ex.column}.`);
  } else if (after.completedAt !== WAS_DONE) {
    fails.push(`${ex.key}: a progress save dropped the completion from ${ex.column}.`
      + ` It was ${WAS_DONE} and came back ${JSON.stringify(after.completedAt)}.`
      + ' The exercise is now unfinished, and so is the couple, and nothing said so.');
  }

  /* 2. And against an UNFINISHED record it must not invent one. */
  stored = { [ex.column]: { answers: { q1: 'a' } } };
  written = null;
  await handler(post({
    userId: ME, exercise: ex.key, progress: true,
    answers: { answers: { q1: 'a', q2: 'b' } },
  }));
  if (written?.[ex.column]?.completedAt) {
    fails.push(`${ex.key}: a progress save invented a completedAt on a record`
      + ' that never had one, which marks an exercise finished that nobody has'
      + ' finished and opens results on half an answer.');
  }
}

console.log = realLog;
console.error = realErr;

if (fails.length) {
  console.error('\n check-progress-not-destructive: a partial save changes what is finished.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`[check-progress-not-destructive] ${RECORD.length} record-shaped exercises;`
  + ' a mid-exercise save keeps a completion it found and invents none.');
