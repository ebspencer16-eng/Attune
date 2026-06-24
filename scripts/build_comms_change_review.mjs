// What changed — the Communication exercise change review, in the same format
// as the other results documents. Content is read live: the 23 questions, the
// listening results blurbs, and the listening workbook content all come from
// source, so this reflects what is shipped now (no more "draft, not yet in code").

import { readFileSync } from 'fs';
import { PERSONALITY_QUESTIONS } from '../api/_questions.js';
import { DIM_META as WB_META, DIM_CONTENT, GAP_BLURBS, WHEN_THIS_SHOWS_UP } from '../api/_workbook-content.js';
import {
  ORANGE, BLUE, PURPLE, GREEN, INK, MUTED, RED,
  bigSection, midSection, smallSection, prose, caption, groupLabel, tag,
  buildCover, renderDoc, evalConst, INDENT_PROSE_UNDER_SMALL, INDENT_SMALL,
} from './_review_format.mjs';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf-8');

// ── live extractions ─────────────────────────────────────────────────────────
// Results gap blurbs. Example names: Maya leans Reflective, David leans Responsive.
const SHIFTS = evalConst(app, 'SHIFTS', { loName: 'Maya', hiName: 'David' });
const LISTEN_RESULTS = SHIFTS.listening || {};
// Action protocol (title + this-week) shown when listening is a gap.
const protoM = app.match(/title:\s*"(Match presence[^"]*)",\s*body:\s*byDim\.listening\.adviceText,\s*thisWeek:\s*"([^"]*)"/);
const LISTEN_ACTION = { title: protoM?.[1] || '', thisWeek: protoM?.[2] || '' };
// Results conversation prompt.
const promptM = app.match(/listening:\s*"(When you bring something to me[^"]*)"/);
const LISTEN_PROMPT = promptM?.[1] || '';

const byId = Object.fromEntries(PERSONALITY_QUESTIONS.map(q => [q.id, q]));

// ── migration metadata (annotations describing the change, not product copy) ──
const CHANGE = {
  lv1: 'CARRIED OVER', lv2: 'CARRIED OVER', lv5: 'CARRIED OVER',
  en4: 'CARRIED OVER', en6: 'NEW',
  ex6: 'NEW', ex7: 'NEW', ex8: 'MOVED FROM APPRECIATION', ex9: 'NEW', ex10: 'NEW',
  bd1: 'CARRIED OVER', bd3: 'CARRIED OVER', bd4: 'CARRIED OVER',
  nd5: 'TEXT UPDATED', nd1: 'CARRIED OVER',
  st1: 'TEXT UPDATED', cf1: 'CARRIED OVER', cf2: 'CARRIED OVER',
  ls1: 'NEW DIMENSION',
  rp3: 'CARRIED OVER', rp2: 'CARRIED OVER', rp6: 'NEW', fb5: 'CARRIED OVER',
};
const TAGCOLOR = { 'NEW': BLUE, 'NEW DIMENSION': PURPLE, 'MOVED FROM APPRECIATION': ORANGE, 'TEXT UPDATED': MUTED, 'CARRIED OVER': 'A8A29E' };
const CHAPTERS = [
  { title: "Chapter 1: How You're Wired", ids: ['lv1', 'lv2', 'ex6', 'en4', 'ex7'] },
  { title: 'Chapter 2: How You Connect', ids: ['lv5', 'bd1', 'bd3', 'bd4', 'nd5', 'nd1'] },
  { title: 'Chapter 3: When Things Get Hard', ids: ['st1', 'cf1', 'cf2', 'ls1'] },
  { title: 'Chapter 4: Making Things Right', ids: ['rp3', 'rp2', 'rp6', 'fb5'] },
  { title: 'Chapter 5: Everyday Life Together', ids: ['en6', 'ex8', 'ex9', 'ex10'] },
];
const DIM_LABEL = { love: 'Love', expression: 'Expression', energy: 'Energy', bids: 'Bids', needs: 'Needs', stress: 'Stress', conflict: 'Conflict', listening: 'Listening', repair: 'Repair', feedback: 'Feedback' };
const GAPLABEL = { '1_1': 'Both strongly Reflective', '1_2': 'One strongly Reflective / other leans Reflective', '1_3': 'One strongly Reflective / other middle', '1_4': 'One strongly Reflective / other leans Responsive', '1_5': 'Opposite ends (widest gap)', '2_2': 'Both lean Reflective', '2_3': 'One leans Reflective / other middle', '2_4': 'One leans Reflective / other leans Responsive', '2_5': 'One leans Reflective / other strongly Responsive', '3_3': 'Both middle', '3_4': 'One middle / other leans Responsive', '3_5': 'One middle / other strongly Responsive', '4_4': 'Both lean Responsive', '4_5': 'Both Responsive (one stronger)', '5_5': 'Both strongly Responsive' };
const TYPE_ORDER = ['WW', 'XX', 'YY', 'ZZ', 'WX', 'WY', 'WZ', 'XY', 'XZ', 'YZ'];

const bulletProse = (t) => prose('•  ' + t, { indent: INDENT_SMALL, after: 60 });

// ── cover ─────────────────────────────────────────────────────────────────────
const cover = buildCover({
  title: 'What changed',
  subtitle: 'The Communication exercise change review: 28 questions to 23, closeness to listening.',
  howToUse: 'The question set, listening results, and listening workbook content are read live from the code, so this reflects what is shipped now. The summary, change tags, retired list, and marketing checklist describe the migration itself.',
  indexRows: [
    ['1.', 'Summary of changes', ''],
    ['2.', 'The new question set', `${PERSONALITY_QUESTIONS.length} questions, by chapter`],
    ['3.', 'Listening results content', `${Object.keys(LISTEN_RESULTS).length} gap blurbs + action + prompt`],
    ['4.', 'Listening workbook content', 'now live'],
    ['5.', 'Marketing copy', 'migration checklist'],
    ['6.', 'Retired: closeness', ''],
  ],
});

// ── SECTION 1 — summary ─────────────────────────────────────────────────────
const section1 = [
  ...bigSection(1, 'Summary of changes',
    'What moved when the Communication exercise was restructured. Still 10 dimensions.', ORANGE),
  bulletProse('Question count: 28 down to 23.'),
  bulletProse('The conflict timing question (the one that asked whether you bring things up or wait) is removed. Conflict now has two questions.'),
  bulletProse('The daily-closeness question reorders its options so the together pole reads first. Scoring is unchanged: its value is flipped so love stays oriented the same way.'),
  bulletProse('Closeness and Independence is retired as a dimension. Its shared-vs-independent idea now lives as one Energy question (social calendars).'),
  bulletProse('Listening is the one new dimension. Poles: Reflective (sit with it) and Responsive (respond, ask, reflect back). Neither is framed as better.'),
  bulletProse('Appreciation is folded into Expression. It is about how you voice feelings, so it sits with the other expression questions.'),
  bulletProse('One Expression question (feel most understood) is stored with its poles ordered so it scores consistently with the other expression items.'),
  bulletProse('Question counts per dimension are now uneven: expression 5; love, bids, repair 3; energy, needs, conflict 2; stress, feedback, listening 1. Averaging keeps the type math sound.'),
];

// ── SECTION 2 — the 23 questions (live) ─────────────────────────────────────
const section2 = [
  ...bigSection(2, 'The new question set',
    'Read live from the exercise. The tag on each shows what changed. A is the left pole, B the right.', PURPLE),
  ...CHAPTERS.flatMap((ch, ci) => {
    const out = [midSection(`2.${ci + 1}`, ch.title, PURPLE)];
    ch.ids.forEach((id, qi) => {
      const q = byId[id]; if (!q) return;
      const t = CHANGE[id] || '';
      out.push(smallSection(`2.${ci + 1}.${qi + 1}`, DIM_LABEL[q.dimension] || q.dimension, PURPLE, { before: 200, inline: q.text }));
      if (t) out.push(tag(t, TAGCOLOR[t] || MUTED, INDENT_PROSE_UNDER_SMALL));
      out.push(prose(`A.  ${q.a}`, { indent: INDENT_PROSE_UNDER_SMALL, after: 30 }));
      out.push(prose(`B.  ${q.b}`, { indent: INDENT_PROSE_UNDER_SMALL }));
    });
    return out;
  }),
];

// ── SECTION 3 — listening results content (live) ────────────────────────────
const section3 = [
  ...bigSection(3, 'Listening results content',
    'Live in the results experience now. The live copy uses each partner\u2019s real name. Shown here with example names Maya (leans Reflective) and David (leans Responsive).', GREEN),
  midSection('3.1', 'Per-gap interpretation', GREEN, { extras: `${WB_META.listening.label} · ${WB_META.listening.left} / ${WB_META.listening.right}` }),
  caption('Shown on the dimension page, by how far apart the two partners scored.'),
  ...Object.entries(LISTEN_RESULTS).flatMap(([k, text], i) => [
    smallSection(`3.1.${i + 1}`, GAPLABEL[k] || k, GREEN, { before: 180 }),
    prose(text, { indent: INDENT_PROSE_UNDER_SMALL }),
  ]),
  midSection('3.2', 'Action plan', GREEN, { extras: 'shown when listening is a gap' }),
  ...(LISTEN_ACTION.title ? [smallSection('3.2.1', 'Title', GREEN, { before: 160, inline: LISTEN_ACTION.title })] : []),
  ...(LISTEN_ACTION.thisWeek ? [smallSection('3.2.2', 'Try this week', GREEN, { before: 120 }), prose(LISTEN_ACTION.thisWeek, { indent: INDENT_PROSE_UNDER_SMALL })] : []),
  midSection('3.3', 'Conversation prompt', GREEN),
  prose(LISTEN_PROMPT, { italics: true }),
  midSection('3.4', 'Style-code axis', GREEN),
  prose('The 6-letter style code reads Listening (Responsive / Reflective) where it used to read Closeness (Close-seeking / Autonomous).'),
];

// ── SECTION 4 — listening workbook content (live) ───────────────────────────
const wb = DIM_CONTENT.listening || {};
const wbGap = GAP_BLURBS.listening || {};
const wbWhen = WHEN_THIS_SHOWS_UP.listening || {};
const section4 = [
  ...bigSection(4, 'Listening workbook content',
    'Now live in the workbook content file. This filled the structures closeness used to. Read live below.', 'C2410C'),
  midSection('4.1', 'What it measures', 'C2410C'),
  prose(wb.measures || ''),
  midSection('4.2', 'When aligned', 'C2410C'),
  prose(wb.closeText || ''),
  midSection('4.3', 'When there is a gap', 'C2410C'),
  prose(wb.gapText || ''),
  midSection('4.4', 'Reflection prompts', 'C2410C'),
  ...(wb.prompts || []).map(pr => bulletProse(pr)),
  midSection('4.5', 'Try this week', 'C2410C'),
  prose(wb.thisWeek || ''),
  midSection('4.6', 'Short gap states', 'C2410C', { extras: 'row summaries' }),
  ...['aligned', 'some_gap', 'notable_gap'].flatMap(k => wbGap[k] ? [
    smallSection(`4.6.${k}`, k.replace('_', ' '), 'C2410C', { before: 160 }),
    prose(wbGap[k], { indent: INDENT_PROSE_UNDER_SMALL }),
  ] : []),
  midSection('4.7', 'How this shows up by couple type', 'C2410C'),
  ...TYPE_ORDER.flatMap((tp, i) => wbWhen[tp] ? [
    smallSection(`4.7.${i + 1}`, tp, 'C2410C', { before: 160 }),
    prose(wbWhen[tp], { indent: INDENT_PROSE_UNDER_SMALL }),
  ] : []),
];

// ── SECTION 5 — marketing copy (migration checklist) ────────────────────────
const section5 = [
  ...bigSection(5, 'Marketing copy',
    'Public pages affected by the restructure. The numeric fixes shipped with the migration. The closeness-naming spots were flagged for your call.', BLUE),
  groupLabel('Changed and shipped (numbers only)', BLUE),
  bulletProse('Offerings page exercise meta: 28 questions is now 23.'),
  bulletProse('Start / onboarding page, four spots: 28 questions is now 23.'),
  bulletProse('How It Works page: 23 questions calibrated to surface your style.'),
  bulletProse('Admin dashboard: chart subtitle now reads 10 dimensions; demo chart re-keyed from closeness to listening. Internal, not customer-facing.'),
  groupLabel('Flagged for review (named closeness at migration time)', RED),
  bulletProse('How It Works sample dimension chart row label, and the Couple Types meta description, both named closeness. Confirm these now read against the current dimensions.'),
  bulletProse('Resources page book note referenced closeness and independence. Confirm it reflects the current dimensions.'),
];

// ── SECTION 6 — retired closeness ───────────────────────────────────────────
const section6 = [
  ...bigSection(6, 'Retired: closeness',
    'Out of the exercise, results, and workbook. Listed so nothing is missed.', INK),
  bulletProse('Dimension Closeness and Independence (poles Autonomous / Close-seeking) and its single question.'),
  bulletProse('Its results gap blurbs, action plan (Design your together-apart rhythm), and conversation prompt.'),
  bulletProse('Its workbook block (measures, aligned and gap text, prompts, the 10 per-couple-type entries) and its row in the dimension table.'),
  bulletProse('The shared-vs-independent idea is preserved as the new Energy social-calendar question, so the theme is not lost.'),
];

console.log(`Live: ${PERSONALITY_QUESTIONS.length} questions, ${Object.keys(LISTEN_RESULTS).length} listening blurbs, action=${!!LISTEN_ACTION.title}, prompt=${!!LISTEN_PROMPT}`);
await renderDoc({
  footerLabel: 'Attune · Communication exercise change review',
  outPath: '/mnt/user-data/outputs/attune_comms_change_review.docx',
  children: [...cover, ...section1, ...section2, ...section3, ...section4, ...section5, ...section6],
});
