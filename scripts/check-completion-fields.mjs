#!/usr/bin/env node
/**
 * Finishing an exercise writes the same fields whichever surface you finished on.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * There are two writers. /api/save-exercise, which the app and the website's RLS
 * fallback both use, and saveExerciseWithRetakeSnapshot in src/App.jsx, which is
 * the website's ordinary path. A completion through one has to leave the row in
 * the same state as a completion through the other, or the same person's
 * exercise means different things depending on where they finished it.
 *
 * ── WHAT WENT WRONG THREE WAYS ────────────────────────────────────────────
 * ex{N}_completed and ex{N}_completed_at were written by the endpoint on every
 * completion and by the website for Relationship Reflection only. That was
 * already costing something before anyone noticed: the beta digest counted
 * completions from those flags and had to be taught to fall back to the answers,
 * which is a workaround for two writers disagreeing rather than a fix.
 *
 * ex3_version, which records which version of the questions an answer set was
 * given under, was written only by the website. Every Reflection finished in the
 * app left it null. Nothing reads it yet, which is exactly why the gap was
 * invisible, and it cannot be recovered afterwards. Ellie wants retake comparison
 * in phase two, and comparing two answer sets across a change to the questions is
 * wrong without it.
 *
 * ex{N}_progress was cleared by the endpoint and left behind by the website, so a
 * value in that column meant "someone is part-way through this" or "someone
 * finished this here" depending on which surface they used.
 *
 * ── HOW IT DECIDES ────────────────────────────────────────────────────────
 * The endpoint's completion branch is executed, against a stubbed network, and
 * the fields it sends are read off the request. The website's patch cannot be
 * executed, because src/App.jsx is JSX, so its field set is lifted out of the
 * object literal by name. Both are then compared as sets.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The values. The two write different timestamps by construction, and the retake
 * snapshot columns are the website's alone: it reads the previous answers before
 * overwriting, and the endpoint does not, which is a real difference and a
 * deliberate one. Those are named below rather than compared.
 *
 * Not the record-shaped exercises. Physical Intimacy and Conflict Patterns keep
 * everything in one column including their own completedAt, so there are no flag
 * columns to disagree about. check-progress-not-destructive covers that pair.
 */

import { readFileSync } from 'node:fs';
import { EXERCISES } from '../api/_exercises.js';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

/** The flat exercises, which are the ones with separate flag columns. */
const flat = EXERCISES.filter((e) => e.shape !== 'record');

/**
 * Columns the website writes and the endpoint does not, on purpose.
 *
 * The retake snapshot is the website's: it reads the previous answers before
 * overwriting so a couple can be shown one step back. The endpoint is the
 * fallback path, used when RLS blocked the direct write, and a snapshot there
 * would need a second read it cannot make cheaply.
 */
const WEBSITE_ONLY = new Set(['ex1_answers_prior', 'ex2_answers_prior', 'ex3_answers_prior',
  'ex1_prior_completed_at', 'ex2_prior_completed_at', 'ex3_prior_completed_at']);

// ── The endpoint, run ───────────────────────────────────────────────────────
process.env.SUPABASE_URL = 'https://stub.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'stub-service-key';
process.env.SUPABASE_ANON_KEY = 'stub-anon-key';

const USER = '11111111-1111-4111-8111-111111111111';
const sent = {};

globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  const j = (v, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'Content-Type': 'application/json' } });
  if (u.includes('/auth/v1/user')) return j({ id: USER });
  if (u.includes('/rest/v1/profiles') && (init.method || 'GET').toUpperCase() === 'PATCH') {
    try { Object.assign(sent, JSON.parse(init.body || '{}')); } catch { /* not ours */ }
    return j([{ id: USER }]);
  }
  return j([]);
};

const { default: handler } = await import('../api/save-exercise.js');

const endpointFields = {};
for (const e of flat) {
  for (const k of Object.keys(sent)) delete sent[k];
  const res = await handler(new Request('https://www.attune-relationships.com/api/save-exercise', {
    method: 'POST',
    headers: { Authorization: 'Bearer stub-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: USER, exercise: e.key, answers: { q1: 3 } }),
  }));
  const payload = await res.json().catch(() => ({}));
  if (!payload.ok) {
    fails.push(`/api/save-exercise refused a completion of ${e.key}: ${payload.error}.`
      + ' This gate cannot compare what it never wrote.');
    continue;
  }
  endpointFields[e.key] = new Set(Object.keys(sent));
}

if (Object.keys(endpointFields).length !== flat.length) {
  console.error('[check-completion-fields] the endpoint did not complete every flat'
    + ' exercise, so there is nothing to compare against. Refusing to pass.');
  for (const f of fails) console.error(`  ✗ ${f}`);
  process.exit(1);
}

// ── The website, read ───────────────────────────────────────────────────────
const app = readFileSync(`${ROOT}src/App.jsx`, 'utf8');
const at = app.indexOf('const patch = {');
if (at < 0) {
  console.error('[check-completion-fields] cannot find the website\'s completion'
    + ' patch in src/App.jsx. Refusing to pass: a gate that has lost its subject'
    + ' must never report success.');
  process.exit(1);
}
const literal = app.slice(at, app.indexOf('};', at) + 2);

/**
 * The website builds its column names with a template, because one function
 * serves all three exercises. So the names are resolved per exercise rather than
 * matched literally: `[`ex${exerciseNum}_progress`]` is ex1_progress for ex1.
 */
const websiteFields = (key) => {
  const n = key.replace('ex', '');
  const out = new Set();
  for (const m of literal.matchAll(/\[`ex\$\{exerciseNum\}_(\w+)`\]/g)) out.add(`ex${n}_${m[1]}`);
  for (const m of literal.matchAll(/\[(col|priorCol|priorAt)\]/g)) {
    out.add({ col: `ex${n}_answers`, priorCol: `ex${n}_answers_prior`, priorAt: `ex${n}_prior_completed_at` }[m[1]]);
  }
  return out;
};

/** And what the callers add on top, which is where ex3_version lives. */
const extras = new Set();
for (const m of app.matchAll(/saveExercise(?:WithRetakeSnapshot)?\([^)]*?,\s*\{([^}]*)\}\s*\)/g)) {
  for (const k of m[1].matchAll(/(\w+):/g)) extras.add(k[1]);
}

for (const e of flat) {
  const mine = new Set([...websiteFields(e.key), ...extras].filter((f) => f && f.startsWith(e.key + '_')));
  const theirs = endpointFields[e.key];

  const missingOnWebsite = [...theirs].filter((f) => !mine.has(f));
  const missingOnEndpoint = [...mine].filter((f) => !theirs.has(f) && !WEBSITE_ONLY.has(f));

  for (const f of missingOnWebsite) {
    fails.push(`finishing ${e.label} on the website does not write ${f}, and`
      + ' finishing it in the app does. The same exercise means different things'
      + ' depending on where it was finished, and nothing errors either way.');
  }
  for (const f of missingOnEndpoint) {
    fails.push(`finishing ${e.label} on the website writes ${f} and finishing it`
      + ' through /api/save-exercise does not. The endpoint is the app\'s only'
      + ' completion path and the website\'s fallback when RLS blocks the direct'
      + ' write, so this is lost for app users and for anyone who hits that'
      + ' fallback. If it is deliberate, name it in WEBSITE_ONLY with the reason.');
  }
}

if (fails.length) {
  console.error('\n check-completion-fields: a completion means different things on'
    + ' the two surfaces.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`[check-completion-fields] ${flat.length} exercises: both writers leave the`
  + ` same columns set, including the progress slot and ${[...endpointFields.ex3].filter((f) => f.includes('version')).length ? 'ex3_version' : 'no version'}.`);
