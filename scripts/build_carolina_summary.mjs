// Carolina review summary: high-level content adjustments + the new comms
// questions (pulled live from api/_questions.js). House style via _doc_style.mjs.
import { Table, TableRow, TableCell, WidthType, BorderStyle, Paragraph } from 'docx';
import { PERSONALITY_QUESTIONS } from '../api/_questions.js';
import {
  title, eyebrow, h1, body, small, bullet, spacer, saveDoc,
  run, INK, ORANGE, BLUE, MUTED, GREEN,
} from './_doc_style.mjs';

const DIM_LABEL = { conflict: 'Conflict', feedback: 'Feedback', listening: 'Listening' };

function cell(text, w, opts = {}) {
  return new TableCell({
    width: { size: w, type: WidthType.PERCENTAGE },
    margins: { top: 90, bottom: 90, left: 130, right: 130 },
    shading: opts.header ? { fill: 'F7F1E8' } : undefined,
    children: [new Paragraph({ children: [run(text, {
      size: opts.header ? 16 : 18,
      bold: opts.bold || opts.header,
      color: opts.color || (opts.header ? INK : '2A2622'),
    })] })],
  });
}

function changeTable(rows) {
  const b = { style: BorderStyle.SINGLE, size: 4, color: 'F0E9E0' };
  const head = new TableRow({ children: [
    cell('Area', 26, { header: true }),
    cell('What changed', 55, { header: true }),
    cell('Your review', 19, { header: true }),
  ]});
  const trs = rows.map(([area, change, review]) => new TableRow({ children: [
    cell(area, 26, { bold: true, color: INK }),
    cell(change, 55),
    cell(review, 19, { bold: true, color: review.startsWith('Yes') ? ORANGE : review === 'No' ? GREEN : MUTED }),
  ]}));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: b, bottom: b, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: b, insideVertical: { style: BorderStyle.NONE } },
    rows: [head, ...trs],
  });
}

const NEW_Q = ['cf3', 'fb2', 'ls2'].map(id => PERSONALITY_QUESTIONS.find(q => q.id === id)).filter(Boolean);

const CHANGES = [
  ['Individual profiles \u2014 prose', 'Each person\u2019s write-up is now built from proximity-aware fragments, so someone near an axis reads \u201Cleans\u201D or \u201Cflexible\u201D language instead of one fixed strong paragraph.', 'Yes \u2014 tone + clinical'],
  ['Communicating with each other', 'New prose driven by the gap between the two partners on each axis (aligned / small gap / large gap), so it is specific to the pairing.', 'Yes \u2014 tone + clinical'],
  ['Communication exercise', 'Added three questions so no dimension rests on a single item (conflict 2\u21923, feedback 1\u21922, listening 1\u21922). Listed in full below.', 'Yes \u2014 validity'],
  ['How Love Lands', 'Display-only fix so all three love questions read the same direction in results. No scoring change.', 'No'],
  ['Additional-insight bar', 'Now shows only how each partner reads the other; each person\u2019s view of themselves was removed and the footnote corrected.', 'Optional'],
  ['Reflection action plan', 'Tile titles are now conversation openers (\u201CLet\u2019s talk about\u2026\u201D) rather than statements.', 'Light'],
];

const children = [
  eyebrow('For Carolina \u00B7 review summary'),
  title('What we adjusted today'),
  small('A high-level pass for your review. Items marked \u201CYes\u201D want your clinical and tone read before launch. All new copy is draft.'),
  ...spacer(1),
  h1('Content changes'),
  changeTable(CHANGES),
  ...spacer(2),
  h1('New communication exercise questions'),
  body('Three questions were added so no dimension rests on a single item. Each sits on the same axis as the dimension\u2019s existing questions.'),
  ...NEW_Q.flatMap(q => [
    ...spacer(1),
    body(`${DIM_LABEL[q.dimension] || q.dimension}   \u00B7   ${q.id}`, { bold: true, color: BLUE }),
    body(q.text, { bold: true, color: INK }),
    bullet(`A.   ${q.a}`),
    bullet(`B.   ${q.b}`),
  ]),
];

await saveDoc('attune_carolina_summary', children, { title: 'Attune \u2014 Carolina review summary' });
