#!/usr/bin/env node
/**
 * One survey, asked of everybody, and a half-finished one is still an answer.
 *
 * ── WHAT IT REPLACED ───────────────────────────────────────────────────────
 * Three surveys. A 26-question beta survey on /feedback with four rating grids
 * in it, a six-question modal over the results, and a seven-question card at
 * the end of What Comes Next. Three question sets, three stores, and no way to
 * compare an answer from one with an answer from another.
 *
 * Ellie: "Please use this as the regular survey for everyone at the end of
 * their experience, not just beta users." And: "Collect incomplete responses."
 *
 * ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
 * 1. The question set is one set, with the shape each surface expects, and the
 *    two conditional questions appear exactly when they should.
 * 2. The ranking is built from what the couple actually did. Asking somebody
 *    to rank an exercise they never bought is asking them to invent an
 *    opinion, and the list is the one thing here that is per person.
 * 3. A partial answer is stored. This is run, not read: the endpoint is called
 *    with one answer and the row it writes is inspected.
 * 4. Nothing identifying is stored or returned. There is no name field and no
 *    consent checkbox, because what we publish carries no name; that promise
 *    is only true if the admin's own page cannot see who wrote something.
 * 5. Three surfaces ask it, all three from the endpoint, and none of them
 *    carries a question of its own. A second component with its own questions
 *    is how there came to be three surveys.
 * 6. Which questions are showing has one answer on all three. The website
 *    imports the rule; the app and the static page cannot, so each one's own
 *    matcher is lifted out, run, and compared against the server's over a
 *    sweep of answers either side of every threshold.
 */

import { readFileSync } from 'node:fs';

import { transform } from 'esbuild';

import { EXERCISES } from '../api/_exercises.js';
import {
  SURVEY_QUESTIONS, SURVEY_VERSION, TEXT_QUESTIONS, TESTIMONIAL_NOTICE,
  hasAnswer, rankOptionsFor, shouldShow, visibleQuestions,
} from '../api/_lib/survey.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(`${ROOT}${f}`, 'utf8');
const problems = [];

// ── 1. The question set ───────────────────────────────────────────────────
{
  const KINDS = new Set(['stars', 'choice', 'text', 'rank', 'scale', 'nps']);
  const ids = new Set();
  for (const q of SURVEY_QUESTIONS) {
    if (!q.id || ids.has(q.id)) problems.push(`a question has a missing or repeated id: ${q.id}`);
    ids.add(q.id);
    if (!KINDS.has(q.kind)) problems.push(`${q.id} is a "${q.kind}", which no surface knows how to draw.`);
    if (!q.label || q.label.length < 8) problems.push(`${q.id} has no readable label.`);
    if (q.kind === 'choice' && !(q.options || []).length) problems.push(`${q.id} is a choice with no options.`);
    if (q.kind === 'scale' && !(q.scale || []).length) problems.push(`${q.id} is a scale with no labels.`);
  }
  if (!SURVEY_VERSION) problems.push('the survey has no version, so two sets of answers cannot be told apart.');

  /* The conditionals, either side of their condition. */
  const none = visibleQuestions({}, ['a', 'b']).map((q) => q.id);
  for (const id of ['convo_what', 'accuracy_off']) {
    if (none.includes(id)) problems.push(`${id} is asked of everybody; it is meant to follow an answer.`);
  }
  const talked = visibleQuestions({ convo: 'Yes, and we talked about something new' }, []).map((q) => q.id);
  if (!talked.includes('convo_what')) {
    problems.push('somebody who says the conversation happened is never asked what it was about,'
      + ' which is the one question whose answers are worth reading.');
  }
  const quiet = visibleQuestions({ convo: 'No' }, []).map((q) => q.id);
  if (quiet.includes('convo_what')) problems.push('somebody who says there was no conversation is asked what it was about.');

  /* The accuracy follow-up is for the lower half of the scale, and the scale
     is stored one-based. Either side of the line, by one. */
  for (const [score, want] of [[3, true], [4, false], [1, true], [5, false]]) {
    const shown = visibleQuestions({ accuracy: score }, []).map((q) => q.id).includes('accuracy_off');
    if (shown !== want) {
      problems.push(`an accuracy of ${score} ${shown ? 'is' : 'is not'} asked what was off, and should`
        + ` ${want ? 'be' : 'not be'}. Three or less is the lower half of a five point scale.`);
    }
  }
}

// ── 2. The ranking is this couple's ───────────────────────────────────────
{
  const all = rankOptionsFor({
    done: Object.fromEntries(EXERCISES.map((e) => [e.key, true])),
    caps: { hasAnniversary: 1, hasIntimacy: 1, hasConflict: 1, ownsWorkbook: 1, ownsBudget: 1, ownsChecklist: 1 },
    exercises: EXERCISES,
  });
  const core = rankOptionsFor({ done: { ex1: true, ex2: true }, caps: {}, exercises: EXERCISES });
  if (all.length <= core.length) {
    problems.push('a couple who did everything is offered no more to rank than a couple who did the'
      + ' core two, so the list is not built from what they actually have.');
  }
  for (const list of [all, core]) {
    if (!list.includes('Highlights') || !list.includes('Couple type') || !list.includes('Action plans')) {
      problems.push('the three everybody has are not in the list Ellie named: highlights, couple type, action plans.');
    }
    if (new Set(list).size !== list.length) problems.push('the ranking offers the same option twice.');
  }
  const unfinished = rankOptionsFor({ done: { ex1: true, ex2: false }, caps: {}, exercises: EXERCISES });
  if (unfinished.some((o) => /Expectations/.test(o))) {
    problems.push('an exercise this person never finished is in their ranking.');
  }
  const unowned = rankOptionsFor({ done: { conflict: true }, caps: {}, exercises: EXERCISES });
  if (unowned.some((o) => /Conflict/.test(o))) {
    problems.push('an exercise this couple does not own is in their ranking.');
  }
}

// ── 3. A partial answer is stored ─────────────────────────────────────────
{
  process.env.SUPABASE_URL = 'https://stub.invalid';
  process.env.SUPABASE_SERVICE_KEY = 'stub-key';
  const { default: handler } = await import('../api/survey.js');

  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    calls.push({ u, method: opts.method || 'GET', body: opts.body });
    if (u.includes('/auth/v1/user')) return new Response('{"id":"person-1"}', { status: 200 });
    if (u.includes('/rest/v1/profiles')) return new Response('[]', { status: 200 });
    return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  /* One star and nothing else: the most partial answer there is. */
  const res = await handler(new Request('https://x.invalid/api/survey', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer t' },
    body: JSON.stringify({ answers: { rating: 4 }, source: 'results' }),
  }));
  const wrote = calls.filter((c) => /survey_responses/.test(c.u) && c.method !== 'GET');
  if (res.status >= 400) {
    problems.push(`one answer and nothing else was refused with ${res.status}. "Collect incomplete`
      + ' responses" means the first answer is already worth keeping.');
  }
  if (!wrote.length) problems.push('a partial answer reached no store at all.');
  else {
    const body = JSON.parse(wrote[0].body || '{}');
    const row = Array.isArray(body) ? body[0] : body;
    if (row.completed_at) {
      problems.push('a partial answer is written as finished, so the response rate counts people'
        + ' who stopped after one question.');
    }
    if (!row.answers || row.answers.rating !== 4) problems.push('the answer did not reach the row.');
  }

  /* An empty submission is a page loading, not an answer. */
  const empty = await handler(new Request('https://x.invalid/api/survey', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers: {} }),
  }));
  if (empty.status < 400) problems.push('an empty submission is stored, so every page load is a response.');

  /* And only ids this survey asks about. */
  calls.length = 0;
  await handler(new Request('https://x.invalid/api/survey', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers: { rating: 5, email: 'someone@example.com', note: 'x' } }),
  }));
  const second = calls.filter((c) => /survey_responses/.test(c.u) && c.method !== 'GET');
  if (second.length) {
    const row = JSON.parse(second[0].body || '{}');
    const answers = (Array.isArray(row) ? row[0] : row).answers || {};
    for (const k of Object.keys(answers)) {
      if (!SURVEY_QUESTIONS.some((q) => q.id === k)) {
        problems.push(`the endpoint stored "${k}", which is not a question it asks. A body is the one`
          + ' thing a caller controls.');
      }
    }
  }
  globalThis.fetch = realFetch;
}

// ── 4. Nothing identifying ────────────────────────────────────────────────
{
  /* Comments stripped first. This file explains at length why there is no
     consent question, and a scan for the word "consent" finds that sentence:
     the gate flagged its own subject's reasoning the first time it ran. */
  const survey = read('api/_lib/survey.js')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  /* The notice itself says the words "your name", which is the promise rather
     than a field. Everything but the notice is scanned. */
  const withoutNotice = survey.replace(/TESTIMONIAL_NOTICE[\s\S]*?;/, ' ');
  for (const word of ['consent', 'firstName', 'first name', 'your name']) {
    if (new RegExp(word, 'i').test(withoutNotice)) {
      problems.push(`the survey module mentions "${word}". Ellie removed the consent question on the`
        + ' understanding that nothing we publish carries a name; a name field puts it back.');
    }
  }
  /**
   * The fine print has to say two things, in whatever words Ellie chooses.
   *
   * It is the whole reason the survey asks no consent question: she removed
   * that question on the understanding that a published answer carries nothing
   * identifying. So the sentence has to say the responses are anonymous, and
   * it has to say they may be used publicly. Matching her exact sentence would
   * make this gate fail every time she rewrites a line that is hers to write.
   */
  if (!/anonymous|no name|without your name/i.test(TESTIMONIAL_NOTICE)) {
    problems.push('the notice under the open questions no longer says the responses are anonymous.'
      + ' That promise is the whole reason there is no consent question.');
  }
  if (!/website|publish|quote|online/i.test(TESTIMONIAL_NOTICE)) {
    problems.push('the notice under the open questions no longer says the answers may be used'
      + ' publicly, so a quotation on the homepage is taken without having said so.');
  }
  const adminApi = read('api/admin-survey.js');
  if (!/respondent_id: who, \.\.\.rest/.test(adminApi) && !/const \{ respondent_id/.test(adminApi)) {
    problems.push('api/admin-survey.js no longer strips the respondent id, so the page that reads'
      + ' these answers can tell who wrote one.');
  }
  if (/\.select\([^)]*email/.test(adminApi)) {
    problems.push('api/admin-survey.js selects an email address.');
  }
}

// ── 5. Three surfaces, one question set ───────────────────────────────────
{
  const app = read('src/App.jsx');
  if (!/function ResultsSurvey/.test(app)) {
    problems.push('nothing in src/App.jsx draws the survey. Refusing to pass: a gate that has lost'
      + ' its subject must never report success.');
  }
  if (!/<ResultsSurvey/.test(app)) problems.push('the survey is defined and never rendered.');
  if (/const POST_Qs|function ExperienceFeedback/.test(app)) {
    problems.push('one of the old surveys is back in src/App.jsx. There is one question set and it'
      + ' comes from api/_lib/survey.js.');
  }

  /**
   * Both ends of the wire, counted, on each of the three surfaces.
   *
   * This asked whether the website's component mentions /api/survey at all,
   * and a plant that pointed the GET at a dead URL passed: the POST still
   * matched. One call is a surface that saves into a void or draws questions
   * from one.
   */
  const SURFACES = [
    {
      file: 'src/App.jsx',
      what: "the website's results survey",
      get: /fetch\('\/api\/survey', \{ headers \}\)/,
      post: /fetch\('\/api\/survey', \{\s*method: 'POST'/,
    },
    {
      file: 'public/feedback.html',
      what: 'the page an emailed link opens',
      get: /fetch\('\/api\/survey', \{ headers: window\.attuneHeaders\(\) \}\)/,
      post: /fetch\('\/api\/survey', \{\s*method: 'POST'/,
    },
    {
      file: 'attune-app/src/components/survey.tsx',
      what: "the app's survey screen",
      /* The app goes through its client rather than calling fetch, so its two
         ends are fetchSurvey and saveSurvey. */
      get: /fetchSurvey\(\)/,
      post: /saveSurvey\(/,
    },
  ];
  for (const s3 of SURFACES) {
    const src = read(s3.file);
    /* Each end checked for separately, which is the whole of it. Counting
       matches of one pattern that could be either end let a plant through:
       the GET was replaced with a resolved promise and the file still had two
       saves in it, so the count stayed at two and the surface drew no
       questions at all. */
    if (!s3.get.test(src)) {
      problems.push(`${s3.what} (${s3.file}) never asks the endpoint for the questions. A surface`
        + ' with its own copy of them is how three surveys came to exist.');
    }
    if (!s3.post.test(src)) {
      problems.push(`${s3.what} (${s3.file}) never sends an answer back, so every answer given there`
        + ' is lost.');
    }
    /* And no question of its own. Every label the old surfaces carried was a
       sentence typed into the surface; the test is whether any question's own
       words appear anywhere but the module. */
    for (const q of SURVEY_QUESTIONS) {
      const words = q.label.replace(/\s+/g, ' ').slice(0, 28);
      if (src.includes(words)) {
        problems.push(`${s3.file} contains the words of the question "${q.id}". The questions live in`
          + ' api/_lib/survey.js and reach a surface through the payload.');
      }
    }
  }

  /* Saved as it is written, not only at the end, on all three. */
  if (!/save\(next\)/.test(app)) {
    problems.push('the website does not save an answer as it is given, so a half-finished survey is lost.');
  }
  if (!/saveSurvey\(\{ answers: next \}\)/.test(read('attune-app/src/components/survey.tsx'))) {
    problems.push('the app does not save an answer as it is given, so a half-finished survey is lost.');
  }
  /**
   * The ends of the 0 to 10 row.
   *
   * Ellie: "I do want the 0-10 labeled with the two poles you just listed."
   * Nought and ten mean nothing on their own, and a surface that drops the
   * labels is asking a different question from the other two.
   */
  const nps = SURVEY_QUESTIONS.find((q) => q.kind === 'nps');
  if (nps && !(nps.ends || []).length) {
    problems.push('the 0 to 10 question has no words at its ends. Ellie asked for both poles to'
      + ' be named.');
  }
  if (nps && (nps.ends || []).length) {
    for (const [file, what] of [
      ['src/App.jsx', 'the website'],
      ['public/feedback.html', 'the page an emailed link opens'],
      ['attune-app/src/components/survey.tsx', 'the app'],
    ]) {
      const src = read(file);
      /* Both ends drawn, not just the name mentioned. A first plant replaced
         the whole block's condition with `false &&` and passed a check for the
         string "q.ends", which is this file's own lesson about matching a name
         instead of what the code does with it. */
      if (!/q\.ends\[0\]/.test(src) || !/q\.ends\[1\]/.test(src)) {
        problems.push(`${what} (${file}) never draws the words at the ends of the 0 to 10 row, so`
          + ' it asks a bare scale while the other surfaces label it.');
        continue;
      }
      /* And the block is reached. A guard is checked by what it compares: a
         boolean literal beside the condition is a branch turned off, which
         leaves every string in place for any check that only asks whether
         something appears. */
      for (const line of src.split('\n')) {
        if (!/q\.ends/.test(line)) continue;
        if (/\b(false|true)\b/.test(line)) {
          problems.push(`${what} (${file}) guards the 0 to 10 labels with a constant:\n      ${line.trim()}`);
        }
      }
    }
  }

  const page = read('public/feedback.html');
  if (!/saveSoon\(\)/.test(page) || !/save\(false\)/.test(page)) {
    problems.push('public/feedback.html does not save an answer as it is given. It used to hold every'
      + ' answer in the DOM until the submit button and lose all of them if that one request failed.');
  }
  if (/submit-beta-survey/.test(page)) {
    problems.push('public/feedback.html still posts to /api/submit-beta-survey, which is the old'
      + ' 26-question store.');
  }

  /* Defined is not drawn. PostResultsSurvey sat in src/App.jsx, finished, and
     nothing rendered it, which is how five admin charts came to be about
     questions nobody was asked. */
  const appResults = read('attune-app/src/components/results.tsx');
  if (!/<Survey\b/.test(appResults) || !/from '@\/components\/survey'/.test(appResults)) {
    problems.push('nothing in the app renders the survey screen, so the app asks nobody.'
      + ' A component that exists and is not drawn is the same as a deleted one, except that'
      + ' reading the file says otherwise.');
  }
  /* There is one instrument. The app had a second, "How was your experience?",
     and I once wrote the survey into its file because that file was called
     feedback; Ellie has since retired the questionnaire outright. If a second
     feedback screen appears in the app, it is either that coming back or the
     survey being written somewhere new, and both are worth stopping. */
  const second = ['attune-app/src/components/feedback.tsx', 'api/_lib/feedback-copy.js'];
  for (const f of second) {
    try {
      readFileSync(`${ROOT}${f}`, 'utf8');
      problems.push(`${f} is back. The experience questionnaire was retired at Ellie's word and the`
        + ' survey is the one instrument; a second one is how there came to be three.');
    } catch (e) { /* absent, which is the point */ }
  }

  /**
   * The two admin pages, and what each one has to be able to do.
   *
   * Ellie: "I want 2 pages - Feedback and Testimonials." Feedback is the
   * numbers and Testimonials is the words, and the division matters: the only
   * place that can publish a quote is the page where somebody is reading it.
   *
   * None of this names a question. The pages are built from whatever
   * /api/admin-survey sends, which is why a question added to the survey gets
   * a tile without anyone editing the admin, and why this gate checks the
   * machinery rather than a list of tile titles.
   */
  /* Comments blanked first: a plant that commented out the per-tile slicer
     passed a scan that only asked whether the line appeared. A gate that reads
     a comment as code cannot tell a line from a line somebody turned off. */
  const adminRaw = read('public/admin.html');
  const admin = adminRaw
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:"'/])\/\/[^\n]*/g, '$1 ');
  if (!/admin-survey/.test(admin)) problems.push('the admin has no page for the survey.');

  for (const [id, label] of [['page-feedback', 'Feedback'], ['page-testimonials', 'Testimonials']]) {
    if (!new RegExp(`id="${id}"`).test(adminRaw)) {
      problems.push(`the admin has no ${label} page. Refusing to pass: a gate that has lost its`
        + ' subject must never report success.');
    }
    const nav = id.replace('page-', '');
    if (!new RegExp(`showPage\\('${nav}'\\)`).test(adminRaw)) {
      problems.push(`nothing in the admin's nav opens ${label}, so the page exists and cannot be`
        + ' reached.');
    }
  }

  /* One tile per question, built from the question set rather than written
     out. Ellie: "I want every tile built now even though we don't have data
     yet", which is why the tiles are drawn from the questions and not from the
     answers: a question nobody has answered still gets a tile that says so. */
  if (!/svTileSpecs\(/.test(admin) || !/for \(const q of questions\)/.test(admin)) {
    problems.push("the Feedback page no longer builds a tile per question from the question set,"
      + ' so a question added to the survey will be missing from the admin and nothing will say so.');
  }
  /* A segment slicer on every tile, and a period over the whole page. */
  if (!/svFillSlicer\(sel, periodRows\)/.test(admin)) {
    problems.push('the tiles on the Feedback page no longer carry their own segment slicer.');
  }
  if (!/id="fb-period"/.test(admin) || !/function svPeriod\(/.test(admin)) {
    problems.push('the Feedback page has no time-period slicer, or nothing applies it.');
  }

  /* The written answers: coded where they are read, and the full list of
     themes a click away from the tile that counts them. */
  for (const id of TEXT_QUESTIONS) {
    if (!/svCode\(/.test(admin)) {
      problems.push(`the admin cannot code ${id}, so the open answers can only be read one at a time.`);
      break;
    }
  }
  if (!/function svOpenThemes\(/.test(admin) || !/View full list/.test(admin)) {
    problems.push('a themes tile no longer opens the full list, so a chart of the top few is the'
      + ' only way the written answers can be seen.');
  }
  /* And the tile says what it does not know. A chart over a third of the
     answers looks exactly like a chart over all of them. */
  /**
   * Inside the tile drawer, not anywhere in the file.
   *
   * The first version of this looked for the sentence in all of admin.html and
   * passed a plant that removed it from the tile, because the dialog says the
   * same thing and one occurrence was enough. The subject is the tile, so the
   * subject is svDrawTile's body.
   */
  {
    const at = admin.indexOf('function svDrawTile(');
    if (at < 0) {
      problems.push('svDrawTile is gone from the admin, so nothing draws a tile. Refusing to pass.');
    } else {
      let depth = 0, end = -1, seen = false;
      for (let i = at; i < admin.length; i++) {
        if (admin[i] === '{') { depth++; seen = true; }
        else if (admin[i] === '}') { depth--; if (seen && depth === 0) { end = i + 1; break; } }
      }
      const body = end > 0 ? admin.slice(at, end) : '';
      const noteLine = body.split('\n').find((l) => /not read yet/.test(l)) || '';
      if (!/t\.uncoded/.test(noteLine)) {
        problems.push('a themes tile no longer says how many answers nobody has read, so a chart'
          + ' drawn over a third of them reads as the whole picture.');
      }
      const assign = body.split('\n').find((l) => /note\.textContent\s*=/.test(l)) || '';
      if (/\b(false|true)\s*\?/.test(assign)) {
        problems.push(`the themes tile's note is behind a constant:\n      ${assign.trim()}`);
      }
    }
  }

  /* Publishing a quote belongs to the page where the quote is being read. */
  const tsBlock = admin.slice(admin.indexOf('async function renderTestimonials'));
  if (!/svFeature\(/.test(tsBlock)) {
    problems.push('the Testimonials page cannot publish a quote, which is the one thing it is for.');
  }
  /* Search has to look at the themes as well as the words: that is the whole
     reason the answers are coded. */
  if (!/a\.codes\.join\(' '\)/.test(admin)) {
    problems.push("the Testimonials search no longer looks at the themes, so a search for a theme"
      + ' finds only the answers that happen to use the word.');
  }
}

// ── 6. One answer to "which questions are showing" ────────────────────────
{
  /**
   * The website imports the rule, so there is nothing to compare there.
   *
   * It did not. It filtered `form.questions` by naming convo_what and
   * accuracy_off and re-typing their conditions, which is three copies of one
   * rule across three surfaces, and a fourth conditional question would have
   * meant editing all three and finding out from a customer which one was
   * missed.
   */
  const app = read('src/App.jsx');
  if (!/shouldShow\(q, answers\)/.test(app) || !/from "\.\.\/api\/_lib\/survey\.js"/.test(app)) {
    problems.push('src/App.jsx decides which questions to show without importing shouldShow from'
      + ' api/_lib/survey.js. It can import that file, so a copy of the rule there is a copy for'
      + ' no reason.');
  }
  for (const q of SURVEY_QUESTIONS) {
    if (!q.showWhen) continue;
    if (new RegExp(`['"\`]${q.id}['"\`]`).test(app)) {
      problems.push(`src/App.jsx names the conditional question ${q.id}, which means it knows a`
        + ' condition the module is supposed to own.');
    }
  }

  /**
   * The app's matcher and the static page's, lifted and run.
   *
   * Neither can import api/_lib/survey.js: one is an Expo project, the other a
   * static file served to a browser. So each carries six lines, and the only
   * thing that keeps six lines honest is executing them. Both are extracted by
   * brace depth and throw rather than pass if the function cannot be found,
   * because a gate that has lost its subject must never report success.
   */
  const lift = (src, needle, where) => {
    const at = src.indexOf(needle);
    if (at < 0) throw new Error(`check-survey: cannot find \`${needle}\` in ${where}`);
    let depth = 0, end = -1, seen = false;
    for (let i = at; i < src.length; i++) {
      if (src[i] === '{') { depth++; seen = true; }
      else if (src[i] === '}') { depth--; if (seen && depth === 0) { end = i + 1; break; } }
    }
    if (end < 0) throw new Error(`check-survey: cannot find the end of \`${needle}\` in ${where}`);
    return src.slice(at, end);
  };

  const pageSrc = lift(read('public/feedback.html'), 'function shouldShow(q, answers)', 'public/feedback.html');
  const pageShow = new Function(`${pageSrc}; return shouldShow;`)();

  const appSrc = lift(
    read('attune-app/src/components/survey.tsx'),
    'export function shouldShow(',
    'attune-app/src/components/survey.tsx',
  );
  const { code } = await transform(appSrc.replace(/^export /, ''), { loader: 'ts' });
  const appShow = new Function(`${code}; return shouldShow;`)();

  /**
   * Answers either side of every line, by one.
   *
   * A sweep in round steps is how check-feedback-mirror passed a plant that
   * moved a threshold from 0.75 to 0.80: there was no sample point between the
   * two values. The accuracy follow-up turns at 3, so 3 and 4 are in here, and
   * so are the empty string and a missing answer, which are what a question
   * looks like before it has been answered.
   */
  const CASES = [
    {},
    { convo: 'Yes, and we talked about something new' },
    { convo: 'Yes, but nothing we had not covered' },
    { convo: 'Not yet' },
    { convo: 'No' },
    { convo: '' },
    { convo: 'yes' },                 // lower case is a different answer
    { convo: 'Maybe, yes' },          // the word in lower case is a different answer
    { convo: 'Maybe Yes' },           // contains the word and does not start with it
    { convo: 'No, Yes to the workbook' },
    { accuracy: 1 }, { accuracy: 3 }, { accuracy: 4 }, { accuracy: 5 },
    { accuracy: 0 }, { accuracy: '' }, { accuracy: '3' }, { accuracy: null },
    { convo: 'Yes, and we talked about something new', accuracy: 2 },
    { convo: 'No', accuracy: 5 },
  ];
  for (const answers of CASES) {
    for (const q of SURVEY_QUESTIONS) {
      const want = shouldShow(q, answers);
      const got = { 'public/feedback.html': pageShow(q, answers), 'the app': appShow(q, answers) };
      for (const [who, v] of Object.entries(got)) {
        if (!!v !== !!want) {
          problems.push(`${who} ${v ? 'asks' : 'hides'} ${q.id} when the server would`
            + ` ${want ? 'ask' : 'hide'} it, for ${JSON.stringify(answers)}.`);
        }
      }
    }
  }
}

if (problems.length) {
  console.error('[check-survey] the survey is not one survey:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

const conditionals = SURVEY_QUESTIONS.filter((q) => q.showWhen).length;
console.log(`[check-survey] ${SURVEY_QUESTIONS.length} questions in one module at ${SURVEY_VERSION},`
  + ` ${TEXT_QUESTIONS.length} of them open and codeable, drawn by 3 surfaces none of which carries a`
  + ` question of its own. ${conditionals} conditionals, and both surfaces that cannot import the rule`
  + ' agree with it on every question across 20 sets of answers either side of each line. A ranking'
  + ' built from what the couple actually did, a partial answer stored as partial, and nothing'
  + ' identifying in the row or on the page.');
