// Question-weight proposal, for Ellie and Carolina to review.
//
// Today every question inside a dimension counts equally: reassurance is
// (rs1 + rs3) / 2. That simplification is why so many scores land on whole
// numbers and why answering 2 and 4 is indistinguishable from answering 3 and 3.
//
// The proposal is to weight questions by how much each one tells you about the
// dimension, the same principle the axes already use one level up (conflict
// carries 0.55 of Engage/Withdraw, listening 0.10, because they are not equally
// load-bearing).
//
// The weights below are a DRAFT for Carolina to accept or change. The reasoning
// column is the part that matters: if a weight cannot be justified there, it
// should be 50/50 or split evenly rather than nudged for effect.
//
// Weights within a dimension must sum to 1.00. The script refuses to build
// otherwise, so a hand edit cannot silently break the scoring.

import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle } from 'docx';
import { writeFileSync, mkdirSync } from 'fs';
import { DIM_KEYS, AXIS_CONFIG, PARTNER_VIEW_BLEND } from '../api/_type-engine.js';
import { PERSONALITY_QUESTIONS } from '../api/_questions.js';
import { DIM_META } from '../api/_workbook-content.js';

const INK = '0E0B07', MUTED = '8C7A68', ORANGE = 'E8673A', BLUE = '1B5FE8', STONE = 'E8DDD0';

// ── THE PROPOSAL ────────────────────────────────────────────────────────────
// weight: share of the dimension score. why: the case for it, in one line.
const PROPOSAL = {
  energy: {
    en6: { weight: 0.60, why: 'A standing orientation to shared versus separate life. Broader and more stable than a single situational instinct.' },
    en4: { weight: 0.40, why: 'One specific moment. Real, but a person can answer it either way depending on the day.' },
  },
  expression: {
    ex6: { weight: 0.45, why: 'The core of the dimension: whether feeling reaches the other person before it is resolved.' },
    ex8: { weight: 0.35, why: 'Whether appreciation gets said out loud. Observable and habitual.' },
    ex7: { weight: 0.20, why: 'About being understood rather than about expressing. Arguably closer to listening, so it carries least.' },
  },
  reassurance: {
    rs1: { weight: 0.65, why: 'Asks the dimension directly: do you need where you stand said, or take it as given.' },
    rs3: { weight: 0.35, why: 'About how you want to be responded to when upset. Related, but partly a listening question.' },
  },
  love: {
    lv1: { weight: 0.40, why: 'What lands for you is the anchor of the dimension.' },
    lv2: { weight: 0.35, why: 'What you give. Usually consistent with what you want, and diagnostic when it is not.' },
    lv5: { weight: 0.25, why: 'Day-to-day closeness. Overlaps with bids and with energy.' },
  },
  needs: {
    nd5: { weight: 0.60, why: 'Whether you can name a need at all. The dimension in one question.' },
    nd1: { weight: 0.40, why: 'A specific scenario. Strongly coloured by expectations of the partner as well as by your own directness.' },
  },
  bids: {
    bd3: { weight: 0.40, why: 'Whether you initiate. The behaviour the dimension is named for.' },
    bd1: { weight: 0.35, why: 'How much small moments matter to you. Motivation behind the behaviour.' },
    bd4: { weight: 0.25, why: 'What happens when a bid misses. Important, but a consequence rather than the tendency.' },
  },
  listening: {
    ls1: { weight: 0.70, why: 'Directly about how you listen when it matters. The dimension proper.' },
    ls3: { weight: 0.30, why: 'Comfort with silence. Indicative, but also a temperament question.' },
  },
  conflict: {
    cf1: { weight: 0.35, why: 'Engage now or need space. The defining split of the dimension.' },
    cf2: { weight: 0.30, why: 'What you need mid-conflict. Closest thing to a behavioural read under pressure.' },
    st1: { weight: 0.20, why: 'Pull inward or lean in during a hard stretch. Broader than conflict specifically.' },
    cf3: { weight: 0.15, why: 'Whether small things get raised. A threshold question more than a style one.' },
  },
  repair: {
    rp3: { weight: 0.40, why: 'How fast you need repair. The clearest divider between repair styles.' },
    rp2: { weight: 0.35, why: 'What counts as repaired for you. Determines whether repair actually lands.' },
    rp6: { weight: 0.25, why: 'Who moves first. Situational, and often decided by whoever is less upset.' },
  },
  feedback: {
    fb5: { weight: 0.55, why: 'How you receive it. The half of the dimension that shapes whether feedback works at all.' },
    fb2: { weight: 0.45, why: 'How you give it. Nearly as diagnostic, and more visible to the partner.' },
  },
};

// ── Build ───────────────────────────────────────────────────────────────────
const DIM_ORDER = ['energy', 'expression', 'reassurance', 'love', 'needs', 'bids', 'listening', 'conflict', 'repair', 'feedback'];

for (const [dim, qs] of Object.entries(PROPOSAL)) {
  const sum = Object.values(qs).reduce((a, q) => a + q.weight, 0);
  if (Math.abs(sum - 1) > 1e-9) throw new Error(`${dim} weights sum to ${sum.toFixed(2)}, must be 1.00`);
  const listed = Object.keys(qs).sort().join(',');
  const actual = [...DIM_KEYS[dim]].sort().join(',');
  if (listed !== actual) throw new Error(`${dim} lists ${listed}, dimension has ${actual}`);
}

const txt = (t, o = {}) => new TextRun({ text: t, size: o.size || 18, bold: o.bold, italics: o.italics, color: o.color || INK });
const cell = (children, o = {}) => new TableCell({
  width: { size: o.width || 20, type: WidthType.PERCENTAGE },
  shading: o.shade ? { fill: o.shade } : undefined,
  margins: { top: 80, bottom: 80, left: 120, right: 120 },
  children: Array.isArray(children) ? children : [children],
});
const p = (runs, o = {}) => new Paragraph({ alignment: o.align, spacing: { after: o.after ?? 0 }, children: Array.isArray(runs) ? runs : [runs] });

const headerRow = new TableRow({
  tableHeader: true,
  children: [
    cell(p(txt('Dimension', { bold: true, size: 16, color: 'FFFFFF' })), { width: 16, shade: '3B2A6B' }),
    cell(p(txt('Self / partner', { bold: true, size: 16, color: 'FFFFFF' })), { width: 11, shade: '3B2A6B' }),
    cell(p(txt('Question', { bold: true, size: 16, color: 'FFFFFF' })), { width: 34, shade: '3B2A6B' }),
    cell(p(txt('Weight', { bold: true, size: 16, color: 'FFFFFF' }), { align: AlignmentType.CENTER }), { width: 9, shade: '3B2A6B' }),
    cell(p(txt('Why this weight', { bold: true, size: 16, color: 'FFFFFF' })), { width: 30, shade: '3B2A6B' }),
  ],
});

const rows = [headerRow];
for (const dim of DIM_ORDER) {
  const qs = PROPOSAL[dim];
  const ids = Object.keys(qs).sort((a, b) => qs[b].weight - qs[a].weight);
  const blend = PARTNER_VIEW_BLEND[dim];
  const shade = DIM_ORDER.indexOf(dim) % 2 ? 'FBF7F2' : undefined;
  ids.forEach((id, i) => {
    const q = PERSONALITY_QUESTIONS.find(x => x.id === id);
    rows.push(new TableRow({
      children: [
        cell(i === 0
          ? [p(txt(DIM_META[dim].label, { bold: true })),
             p(txt(`${DIM_META[dim].left} / ${DIM_META[dim].right}`, { size: 14, color: MUTED })),
             p(txt(`${AXIS_CONFIG[dim].axis === 'withdraw' ? 'Engage / Withdraw' : 'Open / Guarded'} · ${AXIS_CONFIG[dim].weight.toFixed(2)}`, { size: 14, color: MUTED }))]
          : p(txt('')), { width: 16, shade }),
        cell(i === 0
          ? [p(txt(`${blend.self.toFixed(2)} / ${blend.partner.toFixed(2)}`, { bold: true, color: BLUE })),
             p(txt(blend.self >= 0.7 ? 'internal' : blend.self >= 0.6 ? 'mixed' : 'behavioural', { size: 14, color: MUTED }))]
          : p(txt('')), { width: 11, shade }),
        cell([p(txt(q.text, { size: 17 })),
              p(txt(`A. ${q.a}`, { size: 14, color: MUTED })),
              p(txt(`B. ${q.b}`, { size: 14, color: MUTED }))], { width: 34, shade }),
        cell(p(txt(qs[id].weight.toFixed(2), { bold: true, color: ORANGE }), { align: AlignmentType.CENTER }), { width: 9, shade }),
        cell(p(txt(qs[id].why, { size: 15, color: MUTED })), { width: 30, shade }),
      ],
    }));
  });
}

const doc = new Document({
  styles: { default: { document: { run: { font: 'Calibri', size: 18, color: INK } } } },
  sections: [{
    properties: { page: { size: { orientation: 'landscape' }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
    children: [
      new Paragraph({ spacing: { after: 60 }, children: [txt('ATTUNE · METHODOLOGY REVIEW', { bold: true, size: 16, color: ORANGE })] }),
      new Paragraph({ heading: HeadingLevel.TITLE, spacing: { after: 120 }, children: [txt('Question weights within each dimension', { size: 40, bold: true })] }),
      new Paragraph({ spacing: { after: 100 }, children: [txt('Every question inside a dimension currently counts equally. This proposes weighting them by how much each one tells you about that dimension, the same way the axes already weight dimensions unequally. Weights within a dimension sum to 1.00.', { size: 18, color: MUTED })] }),
      new Paragraph({ spacing: { after: 240 }, children: [txt('Draft for review. The weight column is a starting point; the reasoning column is the thing to argue with. If a weight cannot be justified in that column, it should be even instead.', { size: 18, italics: true, color: MUTED })] }),
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows,
        borders: { top: { style: BorderStyle.SINGLE, size: 1, color: STONE }, bottom: { style: BorderStyle.SINGLE, size: 1, color: STONE },
                   left: { style: BorderStyle.SINGLE, size: 1, color: STONE }, right: { style: BorderStyle.SINGLE, size: 1, color: STONE },
                   insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: STONE }, insideVertical: { style: BorderStyle.SINGLE, size: 1, color: STONE } } }),
      new Paragraph({ spacing: { before: 240 }, children: [txt('Self / partner is the existing visibility blend and is not part of this proposal. It is shown because the two multiply: a question weighted 0.65 inside a dimension blended 0.70 / 0.30 contributes 0.65 × 0.70 of that person\u2019s own view.', { size: 16, color: MUTED })] }),
    ],
  }],
});

const OUT = process.env.ATTUNE_DOC_OUT || '/mnt/user-data/outputs';
mkdirSync(OUT, { recursive: true });
const path = `${OUT}/attune_question_weights.docx`;
writeFileSync(path, await Packer.toBuffer(doc));
console.log(`✓ ${path}`);
