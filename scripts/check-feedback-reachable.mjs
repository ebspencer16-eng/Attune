#!/usr/bin/env node
/**
 * The product must not report on a question nobody is asked.
 *
 * ── WHAT HAPPENED ──────────────────────────────────────────────────────────
 * /api/send-feedback existed, /api/get-feedback read what it stored, and the
 * admin drew a Feedback Overview page and a "Love it clicks · Footer reaction
 * strip" tile from it. Nothing sent to any of it: the questionnaire had been
 * deleted from the website as unreferenced and the footer strip had gone too.
 * Three surfaces reporting on a question the product had stopped asking, each
 * showing nothing, for months.
 *
 * ── WHAT IT CHECKS NOW ─────────────────────────────────────────────────────
 * The questionnaire and the strip are both retired, at Ellie's word: "B45.
 * Approved, delete them." So the rule is kept pointed at what is left.
 *
 * 1. The admin reads no retired source. A table or a row type that nothing
 *    writes any more is a tile that will show zero for ever.
 * 2. The survey, which is the one instrument now, is written by the endpoint
 *    the admin page reads, and asked by the surfaces check-survey holds.
 *
 * A gate that has lost its subject must not report success, so this one was
 * repointed rather than deleted: the failure it was written for is the kind
 * that comes back.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(join(ROOT, f), 'utf8');
const problems = [];

/** Comments are prose about the code, and this file's subject lives in them. */
const codeOnly = (src) => src
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:"'/])\/\/[^\n]*/g, '$1 ');

// ── 1. Nothing in the admin reads a source nothing writes ─────────────────
const RETIRED = [
  ['feedback_submissions', 'the experience questionnaire and the footer reaction strip, both retired'],
  ['app_experience', 'the experience questionnaire\'s row type'],
  ['footer_quick', 'the footer reaction strip\'s row type'],
  ['beta_survey', 'the 26-question beta survey, deleted by migration 079'],
  ['send-feedback', 'the endpoint both retired instruments posted to'],
  ['get-feedback', 'the endpoint that read them back'],
];
{
  const admin = codeOnly(read('public/admin.html'));
  for (const [needle, what] of RETIRED) {
    if (admin.includes(needle)) {
      problems.push(`public/admin.html reads "${needle}" (${what}). Nothing writes it, so whatever`
        + ' draws from it will show nothing for ever.');
    }
  }
}

// ── 2. And neither does anything under api/ ───────────────────────────────
{
  const files = [];
  (function walk(d) {
    for (const f of readdirSync(join(ROOT, d))) {
      const rel = join(d, f);
      if (statSync(join(ROOT, rel)).isDirectory()) { walk(rel); continue; }
      if (rel.endsWith('.js')) files.push(rel);
    }
  })('api');
  /* Deleting somebody's old rows is not reporting on them. A person who
     answered the questionnaire before it was retired still has rows in that
     table, and account deletion has to reach them. */
  const DELETERS = new Set(['api/delete-account.js']);
  for (const rel of files) {
    if (DELETERS.has(rel)) continue;
    const src = codeOnly(read(rel));
    for (const [needle, what] of RETIRED) {
      if (needle.includes('-')) continue;           // endpoint names, covered above
      if (src.includes(needle)) {
        problems.push(`${rel} reads or writes "${needle}" (${what}), which nothing else touches.`);
      }
    }
  }
}

// ── 3. The one instrument is asked and read ───────────────────────────────
{
  const surveyEndpoint = codeOnly(read('api/survey.js'));
  if (!/from\('survey_responses'\)/.test(surveyEndpoint) || !/upsert|insert/.test(surveyEndpoint)) {
    problems.push('api/survey.js no longer writes survey_responses. Refusing to pass: a gate that'
      + ' has lost its subject must never report success.');
  }
  const adminSurvey = codeOnly(read('api/admin-survey.js'));
  if (!/from\('survey_responses'\)/.test(adminSurvey)) {
    problems.push('api/admin-survey.js no longer reads survey_responses, so the admin reports on'
      + ' something other than what the survey writes.');
  }
  const admin = codeOnly(read('public/admin.html'));
  if (!/admin-survey/.test(admin)) {
    problems.push('the admin no longer reads /api/admin-survey, so nothing reports the survey.');
  }
}

if (problems.length) {
  console.error('[check-feedback-reachable] the product reports on a question nobody is asked:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('A tile over a source nothing writes shows zero for ever, and zero reads as a');
  console.error('finding. If an instrument is retired, what reported on it goes with it.');
  process.exit(1);
}

console.log(`[check-feedback-reachable] ${RETIRED.length} retired sources, none of them read by the`
  + ' admin or by api/; the survey is written where the admin reads it.');
