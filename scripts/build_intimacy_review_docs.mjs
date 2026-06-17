// Build two intimacy review docs:
//   1. attune_intimacy_questions_review.docx — every question in a table,
//      premarital and married framing side by side, all options listed.
//   2. attune_intimacy_results_review.docx   — the per-dimension results
//      interpretation prose (intro + gap-state copy + conversation prompt).
//
// Both for Ellie + Carolina to redline. Body 22 (11pt). Sources read live.
// Output: /mnt/user-data/outputs/

import { writeFileSync, mkdirSync } from 'node:fs';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, BorderStyle, WidthType, ShadingType, Footer, PageNumber, AlignmentType,
} from '/home/claude/.npm-global/lib/node_modules/docx/dist/index.mjs';

import { INTIMACY_QUESTIONS, INTIMACY_DIMENSIONS } from '../api/_intimacy-questions.js';
import { INTIMACY_RESULTS_PROSE } from '../api/_intimacy-results-prose.js';

const OUT = '/mnt/user-data/outputs';
mkdirSync(OUT, { recursive: true });

const ROSE = 'B5546E', INK = '0E0B07', MUTED = '8C7A68', STONE = 'E8DDD0';

const p = (text, o = {}) => new Paragraph({
  children: [new TextRun({ text, size: o.size || 22, bold: o.bold, italics: o.italics, color: o.color || INK })],
  spacing: { after: o.after ?? 80, before: o.before ?? 0 }, indent: o.indent ? { left: o.indent } : undefined,
});
const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 }, children: [new TextRun({ text })] });
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 }, children: [new TextRun({ text })] });
const eyebrow = (text, color = ROSE) => new Paragraph({ spacing: { before: 140, after: 40 }, children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 16, color, characterSpacing: 30 })] });
const rule = () => new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: STONE } }, spacing: { after: 120 } });

const cell = (runs, o = {}) => new TableCell({
  width: { size: o.width, type: WidthType.DXA },
  shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR } : undefined,
  margins: { top: 80, bottom: 80, left: 120, right: 120 },
  borders: { top: { style: BorderStyle.SINGLE, size: 4, color: STONE }, bottom: { style: BorderStyle.SINGLE, size: 4, color: STONE }, left: { style: BorderStyle.SINGLE, size: 4, color: STONE }, right: { style: BorderStyle.SINGLE, size: 4, color: STONE } },
  children: (Array.isArray(runs) ? runs : [runs]).map(t => t instanceof Paragraph ? t : new Paragraph({ children: [new TextRun({ text: String(t), size: 20 })] })),
});

const footer = () => new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ['Page ', PageNumber.CURRENT], size: 16, color: MUTED })] })] });
const mkDoc = (children) => new Document({
  styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  sections: [{ properties: { page: { margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } }, footers: { default: footer() }, children }],
});

// ════════════════════════════════════════════════════════════════════
// DOC 1 — QUESTIONS TABLE (both variants side by side)
// ════════════════════════════════════════════════════════════════════
const qc = [];
qc.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'ATTUNE · INTIMACY EXPECTATIONS · QUESTIONS', bold: true, size: 18, color: ROSE, characterSpacing: 40 })] }));
qc.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: 'Question Review — Both Versions' })] }));
qc.push(p('SCAFFOLD COPY pending review. 18 questions across 6 dimensions. Premarital and already-married framing shown side by side. Every question is required; "Prefer not to say" is the comfort option. Question ids are stable, so wording edits will not disturb saved answers.', { italics: true, color: MUTED, after: 120 }));
qc.push(p('Entry branch question (whoever starts first sets the version for both): "Are you and [partner] regularly physically intimate?" Yes shows the married version, No shows the premarital version.', { italics: true, color: MUTED, after: 160 }));

const HEAD = [
  cell([new Paragraph({ children: [new TextRun({ text: 'Topic', bold: true, size: 18, color: 'FFFFFF' })] })], { width: 1800, fill: ROSE }),
  cell([new Paragraph({ children: [new TextRun({ text: 'Premarital framing', bold: true, size: 18, color: 'FFFFFF' })] })], { width: 2600, fill: ROSE }),
  cell([new Paragraph({ children: [new TextRun({ text: 'Married framing', bold: true, size: 18, color: 'FFFFFF' })] })], { width: 2600, fill: ROSE }),
  cell([new Paragraph({ children: [new TextRun({ text: 'Options', bold: true, size: 18, color: 'FFFFFF' })] })], { width: 2360, fill: ROSE }),
];

INTIMACY_DIMENSIONS.forEach((dim, di) => {
  qc.push(h2(`${di + 1}. ${dim.label}`));
  const qs = INTIMACY_QUESTIONS.filter(q => q.dimension === dim.id);
  const rows = [new TableRow({ tableHeader: true, children: HEAD })];
  qs.forEach(q => {
    const kind = q.kind === 'multi' ? (q.maxSelect ? `(multi, up to ${q.maxSelect})` : '(multi-select)') : (q.kind === 'selfref' ? '(self-referential)' : '');
    const optRuns = q.options.map((o, i) => new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '• ' + o.label, size: 18 })] }));
    if (kind) optRuns.unshift(new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: kind, size: 16, italics: true, color: MUTED })] }));
    rows.push(new TableRow({ children: [
      cell([new Paragraph({ children: [new TextRun({ text: q.topic, bold: true, size: 20 })] })], { width: 1800 }),
      cell([new Paragraph({ children: [new TextRun({ text: q.premarital, size: 20 })] })], { width: 2600 }),
      cell([new Paragraph({ children: [new TextRun({ text: q.married, size: 20 })] })], { width: 2600 }),
      cell(optRuns, { width: 2360 }),
    ] }));
  });
  qc.push(new Table({ width: { size: 9360, type: WidthType.DXA }, rows }));
});

writeFileSync(`${OUT}/attune_intimacy_questions_review.docx`, await Packer.toBuffer(mkDoc(qc)));
console.log(`Wrote ${OUT}/attune_intimacy_questions_review.docx`);

// ════════════════════════════════════════════════════════════════════
// DOC 2 — RESULTS PROSE
// ════════════════════════════════════════════════════════════════════
const rc = [];
rc.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'ATTUNE · INTIMACY EXPECTATIONS · RESULTS PROSE', bold: true, size: 18, color: ROSE, characterSpacing: 40 })] }));
rc.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: 'Results Prose Review' })] }));
rc.push(p('SCAFFOLD COPY pending review. This is the interpretation copy shown in the intimacy results section, per dimension. Each dimension shows one of the gap-state versions (aligned / worth discussing / different) based on how close the partners\' answers are, plus the conversation prompt. {U} and {P} are replaced with the two names. No end of any dimension is framed as better. Once approved, this feeds the results section and the specific-content review doc.', { italics: true, color: MUTED, after: 160 }));

INTIMACY_DIMENSIONS.forEach((dim, di) => {
  const pr = INTIMACY_RESULTS_PROSE[dim.id];
  if (!pr) return;
  rc.push(h1(`${di + 1}. ${dim.label}`));
  rc.push(p(pr.intro, { italics: true, color: MUTED, after: 100 }));
  rc.push(eyebrow('If aligned')); rc.push(p(pr.aligned));
  rc.push(eyebrow('If worth discussing')); rc.push(p(pr.discuss));
  rc.push(eyebrow('If different')); rc.push(p(pr.different));
  rc.push(eyebrow('If left unspoken (both prefer not to say)')); rc.push(p(pr.unspoken));
  rc.push(eyebrow('Conversation prompt (action plan)', '1B5FE8')); rc.push(p(pr.prompt));
  rc.push(rule());
});

writeFileSync(`${OUT}/attune_intimacy_results_review.docx`, await Packer.toBuffer(mkDoc(rc)));
console.log(`Wrote ${OUT}/attune_intimacy_results_review.docx`);
