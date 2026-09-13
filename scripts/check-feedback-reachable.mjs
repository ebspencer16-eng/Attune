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
