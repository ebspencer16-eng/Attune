// Generates a .docx review document organized by content layer:
//   1. Workbook-level content (DIM_META, DIM_CONTENT, EXP_DOMAINS)
//   2. Couple-type-level content (the 10 NEW_COUPLE_TYPES from src/App.jsx)
//
// This is for Ellie to read through and edit the copy. The workbook
// generator uses this exact content when producing personalized workbooks.

import { writeFileSync, readFileSync } from 'fs';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  HeightRule, LevelFormat, PageBreak, Footer, PageNumber,
} from 'docx';
import { DIM_META, DIM_CONTENT, EXP_DOMAINS, DIMS } from '../api/_workbook-content.js';

// Parse the NEW_COUPLE_TYPES array out of src/App.jsx. It's a plain JS
// array literal — we evaluate it in a sandboxed wrapper.
const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf-8');
const m = appSource.match(/const NEW_COUPLE_TYPES = (\[[\s\S]+?\n\];)/);
if (!m) throw new Error('Could not locate NEW_COUPLE_TYPES in App.jsx');
// Evaluate in a bare context. This is internal tooling, not user input.
const NEW_COUPLE_TYPES = eval(m[1]);

// ─── Style tokens ─────────────────────────────────────────────────────────────
const ORANGE = 'E8673A';
const BLUE   = '1B5FE8';
const PURPLE = '9B5DE5';
const GREEN  = '10B981';
const INK    = '0E0B07';
const MUTED  = '8C7A68';
const STONE  = 'E8DDD0';
const WARM   = 'FFF8F0';
const W = 9360;

const run = (text, opts = {}) => new TextRun({
  text: String(text || ''), font: 'Arial',
  size: opts.size || 22,
  bold: !!opts.bold,
  italics: !!opts.italics,
  color: opts.color || INK,
  allCaps: !!opts.allCaps,
  characterSpacing: opts.tracking || 0,
});

const para = (text, opts = {}) => new Paragraph({
  alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
  spacing: { before: opts.before ?? 0, after: opts.after ?? 160 },
  children: [run(text, opts)],
});

const pb = () => new Paragraph({ children: [new PageBreak()], spacing: { after: 0 } });
const sp = () => new Paragraph({ children: [new TextRun('')], spacing: { after: 0 } });
const sps = n => Array.from({ length: n }, sp);
const hr = (color, thick) => new Paragraph({
  border: { bottom: { style: BorderStyle.SINGLE, size: thick || 4, color: color || STONE, space: 6 } },
  spacing: { before: 100, after: 200 }, children: [new TextRun('')],
});
const eyebrow = (text, color) => new Paragraph({
  spacing: { after: 120 },
  children: [run(text, { size: 18, bold: true, color: color || ORANGE, allCaps: true, tracking: 100 })],
});
const noBrds = { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } };
const brd = { style: BorderStyle.SINGLE, size: 1, color: STONE };
const allBrds = { top: brd, bottom: brd, left: brd, right: brd };

const tc = (text, width, opts = {}) => new TableCell({
  borders: opts.noBorder ? noBrds : allBrds,
  width: { size: width, type: WidthType.DXA },
  shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
  margins: { top: 140, bottom: 140, left: 200, right: 200 },
  children: Array.isArray(text) ? text : [new Paragraph({ spacing: { after: 0 }, children: [run(text, { size: opts.size || 20, bold: !!opts.bold, italics: !!opts.italics, color: opts.color || INK })] })],
});

// Labeled block: an editable copy card with a colored label bar on the
// left and the content on the right. Makes the structure easy to scan.
const editCard = (label, content, color) => {
  const c = color || ORANGE;
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [2400, W - 2400],
    rows: [new TableRow({ children: [
      new TableCell({
        borders: { ...noBrds },
        width: { size: 2400, type: WidthType.DXA },
        shading: { fill: c, type: ShadingType.CLEAR },
        margins: { top: 180, bottom: 180, left: 260, right: 180 },
        children: [new Paragraph({ spacing: { after: 0 }, children: [run(label, { size: 14, bold: true, color: 'FFFFFF', allCaps: true, tracking: 60 })] })],
      }),
      new TableCell({
        borders: { ...noBrds },
        width: { size: W - 2400, type: WidthType.DXA },
        shading: { fill: WARM, type: ShadingType.CLEAR },
        margins: { top: 180, bottom: 180, left: 280, right: 280 },
        children: Array.isArray(content) ? content : [new Paragraph({ spacing: { after: 0 }, children: [run(content, { size: 22 })] })],
      }),
    ]})],
  });
};

// ─── Build the review doc ────────────────────────────────────────────────────

function buildCover() {
  return [
    ...sps(6),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
      children: [run('ATTUNE', { size: 22, bold: true, color: ORANGE, allCaps: true, tracking: 180 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [run('Workbook Content — Review Doc', { size: 54, bold: true, color: INK })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
      children: [run('Everything that gets plugged into the personalized workbook template, in one place.', { size: 22, italics: true, color: MUTED })] }),
    hr(STONE, 10),
    ...sps(2),
    para('There are two layers here:', { after: 120 }),
    para('1. Dimension and expectations content — the copy for each of the 10 communication dimensions and 7 expectations areas. This is the same for every couple; only the partner names are substituted via {U} (user) and {P} (partner). Lives in api/_workbook-content.js.',
      { size: 20, color: MUTED, after: 140 }),
    para('2. Couple-type content — the 10 couple type narratives (4 same-type pairings + 6 cross pairings). This is how the couple-type section gets personalized to each pair. Lives in src/App.jsx (NEW_COUPLE_TYPES).',
      { size: 20, color: MUTED, after: 200 }),
    para('To edit: make edits in this .docx with tracked changes or comments. I\'ll reconcile them back into the source files.',
      { size: 20, italics: true, color: ORANGE }),
  ];
}

function buildDimSection(dim) {
  const meta = DIM_META[dim];
  const content = DIM_CONTENT[dim];
  return [
    pb(),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run(meta.label, { color: meta.color })] }),
    para(`Axis: ${meta.left} ← → ${meta.right}`, { size: 18, color: MUTED, after: 240 }),

    editCard('WHAT THIS MEASURES', content.measures, meta.color),
    sp(),
    editCard('IF CLOSELY ALIGNED', content.closeText, GREEN),
    sp(),
    editCard('IF THERE\'S A GAP', content.gapText, ORANGE),
    sp(),
    editCard('REFLECTION PROMPTS',
      content.prompts.map(q => new Paragraph({
        spacing: { after: 100 },
        children: [run('•  ' + q, { size: 22 })],
      })),
      PURPLE),
    sp(),
    editCard('TRY THIS WEEK', content.thisWeek, BLUE),
  ];
}

function buildExpSection(domain) {
  return [
    pb(),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run(domain.label, { color: GREEN })] }),
    para(`Axis: ${domain.left} ← → ${domain.right}`, { size: 18, color: MUTED, after: 240 }),

    editCard('IF CLOSELY ALIGNED', domain.closeText, GREEN),
    sp(),
    editCard('IF THERE\'S A GAP', domain.gapText, ORANGE),
    sp(),
    editCard('TRY THIS WEEK', domain.thisWeek, BLUE),
  ];
}

function buildCoupleType(t) {
  const out = [pb()];

  // Header block: name, tagline, color
  out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run(t.name, { color: t.color?.replace('#','') || ORANGE })] }));
  out.push(para(`ID: ${t.id}    ·    Type A: ${t.typeA}    ·    Type B: ${t.typeB}`, { size: 18, color: MUTED, after: 80 }));
  out.push(para(`"${t.tagline}"`, { size: 24, italics: true, color: INK, after: 280 }));

  // Description + nuance
  out.push(editCard('DESCRIPTION', t.description, t.color?.replace('#','') || ORANGE));
  out.push(sp());
  out.push(editCard('NUANCE / RISK', t.nuance, ORANGE));
  out.push(sp());

  // Strengths
  if (Array.isArray(t.strengths) && t.strengths.length) {
    out.push(editCard('STRENGTHS',
      t.strengths.map(s => new Paragraph({ spacing: { after: 100 }, children: [run('•  ' + s, { size: 22 })] })),
      GREEN));
    out.push(sp());
  }

  // Sticking points
  if (Array.isArray(t.stickingPoints) && t.stickingPoints.length) {
    out.push(editCard('STICKING POINTS',
      t.stickingPoints.map(s => new Paragraph({ spacing: { after: 100 }, children: [run('•  ' + s, { size: 22 })] })),
      ORANGE));
    out.push(sp());
  }

  // Patterns
  if (Array.isArray(t.patterns) && t.patterns.length) {
    out.push(editCard('PATTERNS',
      t.patterns.map(s => new Paragraph({ spacing: { after: 100 }, children: [run('•  ' + s, { size: 22 })] })),
      PURPLE));
    out.push(sp());
  }

  // Tips (each has title + body + phraseTry)
  if (Array.isArray(t.tips) && t.tips.length) {
    t.tips.forEach((tip, i) => {
      out.push(editCard(`TIP ${i + 1} — ${tip.title.toUpperCase()}`, [
        new Paragraph({ spacing: { after: 120 }, children: [run(tip.body, { size: 22 })] }),
        ...(tip.phraseTry ? [
          new Paragraph({ spacing: { before: 80, after: 0 }, children: [
            run('PHRASE TO TRY: ', { size: 16, bold: true, color: ORANGE, allCaps: true, tracking: 100 }),
          ]}),
          new Paragraph({ spacing: { after: 0 }, children: [
            run(`"${tip.phraseTry}"`, { size: 22, italics: true, color: INK }),
          ]}),
        ] : []),
      ], BLUE));
      out.push(sp());
    });
  }

  // Famous duos
  if (Array.isArray(t.famousDuos) && t.famousDuos.length) {
    out.push(editCard('FAMOUS DUOS (optional examples)',
      t.famousDuos.map(d => new Paragraph({
        spacing: { after: 120 },
        children: [
          run(d.names, { size: 22, bold: true }),
          run(`  (${d.show})`, { size: 20, italics: true, color: MUTED }),
          new TextRun({ text: '', break: 1 }),
          run(d.note, { size: 20, color: MUTED }),
        ],
      })),
      GREEN));
  }

  return out;
}

// ─── Main build ──────────────────────────────────────────────────────────────
const children = [
  ...buildCover(),

  // Part 1: Dimensions
  pb(),
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run('Part 1 — Communication Dimensions')] }),
  para('Ten dimensions. Each has a Close text (shown when the couple is within ~1.0 of each other) and a Gap text (shown when the scores diverge). The prompts and "try this week" appear on the dimension page in Part 2 of the workbook. Edit any text in the orange/blue/green blocks below.',
    { size: 22, color: MUTED, after: 240 }),
  ...DIMS.flatMap(buildDimSection),

  // Part 2: Expectations
  pb(),
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run('Part 2 — Expectations Domains')] }),
  para('Seven areas of expectations (household, financial, career, etc). Shorter than dimensions — each has a close text, a gap text, and a weekly exercise. Appears in the "Life You\'re Building" section of Part 2.',
    { size: 22, color: MUTED, after: 240 }),
  ...EXP_DOMAINS.flatMap(buildExpSection),

  // Part 3: Couple Types
  pb(),
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run('Part 3 — Couple Types')] }),
  para(`There are 10 couple types total: 4 same-type pairings (WW, XX, YY, ZZ) and 6 cross pairings (WX, WY, WZ, XY, XZ, YZ). Each has a narrative describing the dynamic, strengths, sticking points, patterns, a few tips with phrases to try, and some famous-duo examples. The couple type shows up on the cover page of the workbook and in Part 1 (the snapshot).`,
    { size: 22, color: MUTED, after: 160 }),
  para('The type letters represent underlying communication styles: W / X / Y / Z. Detail on what each letter means is in the source; the couple-type text is what readers actually see.',
    { size: 20, italics: true, color: MUTED, after: 320 }),
  ...NEW_COUPLE_TYPES.flatMap(buildCoupleType),
];

// Footer with page numbers
const docFooter = new Footer({
  children: [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: STONE, space: 8 } },
      spacing: { before: 120, after: 0 },
      children: [
        run('Attune Workbook — Content Review   ·   ', { size: 16, color: MUTED }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, color: INK, font: 'Arial', bold: true }),
        run(' / ', { size: 16, color: MUTED }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: MUTED, font: 'Arial' }),
      ],
    }),
  ],
});

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 44, bold: true, font: 'Arial', color: INK }, paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Arial', color: INK }, paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 1 } },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: docFooter },
    children,
  }],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync('/tmp/workbook_content_review.docx', buffer);
console.log(`OK — ${buffer.length} bytes`);
