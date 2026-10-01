// Fails the build when the product reports on a question nobody is asked.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// /api/send-feedback exists. /api/get-feedback reads what it stores. The admin
// draws a Feedback Overview page and a "Love it clicks · Footer reaction
// strip" tile from it.
//
// Nothing sent to it. The questionnaire was a component in src/App.jsx that
// had already been disconnected, and d54d7c2 deleted it as unreferenced, along
// with 990 other lines that genuinely were. The footer reaction strip went at
// some point too. So three surfaces were reporting on a question the product
// had stopped asking, and every one of them showed nothing.
//
// That is the same defect as the copy-review document showing ten action items
// the product never rendered: confidence outrunning evidence, in a place
// nobody re-reads.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// 1. At least one surface posts to /api/send-feedback. If the admin reports
//    on it, something must ask it.
// 2. The questions live in one module, and the surface that asks them reads
//    that module rather than carrying its own copy.
// 3. The question ids are unchanged. They are the keys every answer already
//    stored is filed under, and renaming one orphans the answers that came
//    before it without any error.
// 4. The card reaches it inside the app.

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { FEEDBACK_QUESTIONS } from '../api/_lib/feedback-copy.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

const problems = [];

// ── 1. Something asks ─────────────────────────────────────────────────────
const senders = [];
for (const dir of ['src', 'public', 'attune-app/src']) {
  (function walk(d) {
    for (const f of readdirSync(join(ROOT, d))) {
      const rel = join(d, f);
      if (statSync(join(ROOT, rel)).isDirectory()) {
        if (/node_modules|\.expo|ios|android/.test(rel)) continue;
        walk(rel);
        continue;
      }
      if (!/\.(js|jsx|ts|tsx|html)$/.test(f)) continue;
      const src = read(rel);
      if (/send-feedback/.test(src) && /source: 'app_experience'|source: 'footer_quick'|sendFeedback\(/.test(src)) {
        senders.push(rel);
      }
    }
  })(dir);
}
if (!senders.length) {
  problems.push(
    'nothing in any surface sends feedback, and three places report on it:\n'
    + '      /api/get-feedback, the admin Feedback Overview, and its "Love it clicks" tile.\n'
    + '      A dashboard for a question nobody is asked shows nothing, forever.');
}

// ── 2. One copy of the questions ──────────────────────────────────────────
const screen = (() => { try { return read('attune-app/src/components/feedback.tsx'); } catch { return ''; } })();
if (screen && !/form\.questions\.map/.test(screen)) {
  problems.push('the app\'s feedback screen does not draw the questions the server sends, so it asks its own set.');
}
for (const q of FEEDBACK_QUESTIONS) {
  if (!screen.includes('form.questions')) break;
  if (!q.label || q.label.length < 5) problems.push(`${q.id} has no readable label.`);
}

// ── 3. The ids are the ones already stored ────────────────────────────────
//
// Frozen deliberately. /api/send-feedback files answers under these keys and
// /api/get-feedback reads them back; a rename loses every answer collected
// before it, silently, because nothing joins the two.
const STORED_IDS = ['q_clear', 'q_accurate', 'q_useful', 'q_conv', 'q_stage', 'q_source', 'q_open'];
const ids = FEEDBACK_QUESTIONS.map((q) => q.id);
for (const id of STORED_IDS) {
  if (ids.includes(id)) continue;
  problems.push(
    `the question id ${id} is gone from api/_lib/feedback-copy.js.\n`
    + '      Answers already stored are filed under it, and nothing joins the old\n'
    + '      name to a new one. Keep the id and change the label.');
}

// ── 3b. Every id the admin charts is one something still collects ─────────
//
// ── THE BUG THIS CAME FROM, WHICH WAS MINE ────────────────────────────────
// Ellie asked for the dashboard's Home to be four quick tiles and two action
// prompts and nothing else. The prompt I removed to do that was the only
// trigger for PostResultsSurvey, so that survey became unreachable and five
// ids stopped being collected: rating, convo, nps, expectation, testimonial.
// The admin's Feedback page charts all five. It would have gone on drawing
// empty charts about questions nobody was being asked, which is word for word
// the failure the top of this file describes.
//
// Part 1 passed throughout, because /feedback still posts. It asks a different
// set of ids, and "something sends feedback" cannot tell two sets apart. So the
// check is per id, from the admin's side: what does the page chart, and does
// anything still ask it.
//
// The admin's ids are read out of its own source rather than listed here, for
// the reason part 3 gives about the stored ids: a list typed in a gate goes
// stale the first time a chart is added, and goes stale silently.
{
  const admin = read('public/admin.html');
  const app = read('src/App.jsx');

  /* What the admin reads off a feedback row. `r.nps`, `row.rating`,
     `f['convo']` are the three ways it does it. */
  const charted = new Set();
  for (const m of admin.matchAll(/\b(?:r|row|f|d|fb|resp|x)\.([a-z_]{3,20})\b/g)) charted.add(m[1]);
  for (const m of admin.matchAll(/\b(?:r|row|f|d|fb|resp|x)\[['"]([a-z_]{3,20})['"]\]/g)) charted.add(m[1]);

  /* Only the ones that are actually feedback answers. Everything else the
     admin reads off a row is a column, not a question. */
  const FEEDBACK_IDS = ['rating', 'convo', 'nps', 'expectation', 'testimonial', 'improve'];
  const watched = FEEDBACK_IDS.filter((id) => charted.has(id));
  if (!watched.length) {
    problems.push('the admin charts none of the post-results survey ids. Refusing to pass:'
      + ' a gate that has lost its subject must never report success.');
  }

  /**
   * Asked by something a person can reach.
   *
   * Being present in the file is not enough: PostResultsSurvey sat in
   * src/App.jsx, fully written, while nothing rendered it. So the component
   * that asks them has to be rendered somewhere as well as defined.
   */
  const asksThem = (() => {
    const def = /function PostResultsSurvey\b/.test(app);
    const rendered = /<PostResultsSurvey\b/.test(app);
    return { def, rendered };
  })();

  if (watched.length && !asksThem.def) {
    problems.push(`the admin charts ${watched.join(', ')} and nothing in src/App.jsx defines`
      + ' PostResultsSurvey, which is what asks them. Either the survey moved, in which case'
      + ' point this gate at where it went, or those charts are about a question the product'
      + ' no longer asks.');
  } else if (watched.length && !asksThem.rendered) {
    problems.push(`the admin charts ${watched.join(', ')} and PostResultsSurvey is defined but`
      + ' never rendered, so nothing asks them.\n'
      + '      A component that exists and is not drawn is the same as a deleted one, except\n'
      + '      that reading the file says otherwise. This is how five charts came to be about\n'
      + '      questions nobody was being asked.');
  }
}

// ── 4. The card reaches it in the app ─────────────────────────────────────
const nextAction = read('api/_lib/next-action.js')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|\s)\/\/[^\n]*/g, ' ');
if (!/deepLink === '\/feedback'/.test(nextAction)) {
  problems.push('the feedback card has no target inside the app, so it opens the website.');
}
if (!/target\.feedback/.test(read('attune-app/src/app/index.tsx'))) {
  problems.push('the app ignores the feedback flag on a card target, so the card lands on home and stops.');
}

if (problems.length) {
  console.error('[check-feedback-reachable] the product reports on a question nobody is asked:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(
  `[check-feedback-reachable] ${FEEDBACK_QUESTIONS.length} questions in one module, `
  + `asked by ${senders.length} surface${senders.length === 1 ? '' : 's'}, ids unchanged.`);
