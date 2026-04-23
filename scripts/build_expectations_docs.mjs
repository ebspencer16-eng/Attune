// Build all 4 expectations docs in one pass:
//   1. expectations_flow_core.pdf
//   2. expectations_flow_anniversary.pdf
//   3. expectations_flow_revisiting.pdf
//   4. expectations_variant_comparison.pdf (landscape 4-col table)

import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, PageOrientation,
  Footer, PageNumber, VerticalAlign,
} from 'docx';

import {
  RESPONSIBILITY_CATEGORIES, RESPONSIBILITY_FRAMING,
  RESPONSIBILITY_OPTIONS, CAREER_OPTIONS, CHILDHOOD_QUESTION,
  LIFE_QUESTIONS, VARIANTS, PENDING_NOTE,
} from './_expectations_variants.mjs';

// ── Design tokens ────────────────────────────────────────────────────────
const ORANGE = 'E8673A', BLUE = '1B5FE8', PURPLE = '9B5DE5', GREEN = '10B981';
const INK = '0E0B07', MUTED = '8C7A68', STONE = 'E8DDD0';

// Color coding for the comparison doc
const IDENT_BG = 'F0FDF9';  // pale green — identical across variants
const DIFF_BG  = 'FFF7ED';  // pale orange — differs between variants

const run = (t, o = {}) => new TextRun({ text: String(t ?? ''), font: 'Arial', ...o });
const sp  = (n = 1) => Array.from({ length: n }, () => new Paragraph({ children: [new TextRun('')], spacing: { after: 80 } }));
const pb  = () => new Paragraph({ children: [new TextRun({ break: 1 })], pageBreakBefore: true });

// ═══════════════════════════════════════════════════════════════════════════
// FLOW DOC BUILDER (per variant)
// ═══════════════════════════════════════════════════════════════════════════

function buildFlowDoc(variantKey) {
  const variant = VARIANTS[variantKey];
  // Portrait US Letter, 1" margins, content width = 12240 - 2×1440 = 9360 DXA
  const CONTENT_W = 9360;

  const variantColor = variant.color;

  // ── Primitives ────────────────────────────────────────────────────────
  const prose = (text, opts = {}) => new Paragraph({
    spacing: { after: opts.after ?? 120, line: 300, lineRule: 'atLeast' },
    indent: opts.indent ? { left: opts.indent } : undefined,
    alignment: opts.center ? AlignmentType.CENTER : undefined,
    children: [run(text, { size: opts.size ?? 22, color: opts.color ?? INK, italics: opts.italics, bold: opts.bold })],
  });

  const eyebrow = (text, color = variantColor) => new Paragraph({
    spacing: { before: 100, after: 100 },
    children: [run(text, { size: 14, bold: true, color, allCaps: true, characterSpacing: 80 })],
  });

  const sectionHeader = (num, title, subtitle) => [
    new Paragraph({ spacing: { before: 360, after: 60 },
      children: [run(`SECTION ${num}`, { size: 13, bold: true, color: variantColor, characterSpacing: 80 })] }),
    new Paragraph({ spacing: { after: 80 },
      children: [run(title, { size: 26, bold: true, color: INK })] }),
    new Paragraph({ spacing: { after: 200 },
      children: [run(subtitle, { size: 14, italics: true, color: MUTED })] }),
    new Paragraph({ spacing: { after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: variantColor, space: 4 } },
      children: [new TextRun('')] }),
  ];

  // Responsibility table (one per category)
  const respTable = (category) => {
    const border = { style: BorderStyle.SINGLE, size: 4, color: 'D9CDBA' };
    const borders = { top: border, bottom: border, left: border, right: border };
    const w1 = 500, w2 = CONTENT_W - w1;
    const rows = category.items.map((item, i) => new TableRow({ cantSplit: false, children: [
      new TableCell({ borders, width: { size: w1, type: WidthType.DXA },
        shading: { fill: 'FAF7F1', type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 100, right: 80 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER,
          children: [run(String(i + 1), { size: 13, bold: true, color: MUTED })] })] }),
      new TableCell({ borders, width: { size: w2, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 140, right: 120 },
        children: [new Paragraph({ children: [run(item, { size: 14, color: INK })] })] }),
    ]}));
    return new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [w1, w2],
      borders: { top: border, bottom: border, left: border, right: border,
                 insideHorizontal: border, insideVertical: border },
      rows,
    });
  };

  // Life & Values table (one per category)
  const lqTable = (categoryLabel, questions) => {
    const border = { style: BorderStyle.SINGLE, size: 4, color: 'D9CDBA' };
    const borders = { top: border, bottom: border, left: border, right: border };
    const w1 = 500, w2 = 3600, w3 = CONTENT_W - w1 - w2;
    const headerRow = new TableRow({ tableHeader: true, cantSplit: false, children: [
      new TableCell({ borders, width: { size: w1, type: WidthType.DXA },
        shading: { fill: 'EDE6D8', type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 100, right: 80 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER,
          children: [run('#', { size: 11, bold: true, color: INK, allCaps: true, characterSpacing: 40 })] })] }),
      new TableCell({ borders, width: { size: w2, type: WidthType.DXA },
        shading: { fill: 'EDE6D8', type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 140, right: 120 },
        children: [new Paragraph({ children: [run('Question', { size: 11, bold: true, color: INK, allCaps: true, characterSpacing: 40 })] })] }),
      new TableCell({ borders, width: { size: w3, type: WidthType.DXA },
        shading: { fill: 'EDE6D8', type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 140, right: 120 },
        children: [new Paragraph({ children: [run('Answer options', { size: 11, bold: true, color: INK, allCaps: true, characterSpacing: 40 })] })] }),
    ]});
    const rows = questions.map((q, i) => {
      // The full question text: Topic — expanding phrase
      const expandingPhrase = q[variantKey];
      return new TableRow({ cantSplit: false, children: [
        new TableCell({ borders, width: { size: w1, type: WidthType.DXA },
          shading: { fill: 'FAF7F1', type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 100, right: 80 },
          children: [new Paragraph({ alignment: AlignmentType.CENTER,
            children: [run(String(i + 1), { size: 13, bold: true, color: MUTED })] })] }),
        new TableCell({ borders, width: { size: w2, type: WidthType.DXA },
          margins: { top: 100, bottom: 100, left: 140, right: 120 },
          children: [new Paragraph({ spacing: { line: 280, lineRule: 'atLeast' },
            children: [
              run(q.topic, { size: 13, bold: true, color: INK }),
              run(' — ' + expandingPhrase, { size: 13, color: INK }),
            ] })] }),
        new TableCell({ borders, width: { size: w3, type: WidthType.DXA },
          margins: { top: 100, bottom: 100, left: 140, right: 120 },
          children: [new Paragraph({ spacing: { line: 280, lineRule: 'atLeast' },
            children: [run(q.options.join(' · '), { size: 11, color: MUTED, italics: true })] })] }),
      ]});
    });
    return new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [w1, w2, w3],
      borders: { top: border, bottom: border, left: border, right: border,
                 insideHorizontal: border, insideVertical: border },
      rows: [headerRow, ...rows],
    });
  };

  // ── Cover ────────────────────────────────────────────────────────────
  const cover = [
    ...sp(2),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [run('ATTUNE', { size: 22, bold: true, color: ORANGE, allCaps: true, characterSpacing: 120 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [run('Expectations Exercise — ' + variant.label, { size: 36, bold: true, color: INK })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 },
      children: [run(variant.framingNote, { size: 16, italics: true, color: MUTED })] }),

    ...sp(1),

    // At-a-glance metadata
    (() => {
      const border = { style: BorderStyle.SINGLE, size: 4, color: 'D9CDBA' };
      const borders = { top: border, bottom: border, left: border, right: border };
      const w1 = 2400, w2 = CONTENT_W - w1;
      const rows = [
        ['Variant flag', variant.flag],
        ['Audience', variant.audience],
        ['Package(s)', variant.packages],
        ['Entry point', variant.entryPoint],
        ['Part 1', 'Responsibilities — 20 items across 4 categories'],
        ['Part 2', 'Life & Values — 17 questions across 6 categories'],
      ].map(([k, v]) => new TableRow({ cantSplit: false, children: [
        new TableCell({ borders, width: { size: w1, type: WidthType.DXA },
          shading: { fill: 'EDE6D8', type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 140, right: 120 },
          children: [new Paragraph({ children: [run(k, { size: 12, bold: true, color: INK, allCaps: true, characterSpacing: 40 })] })] }),
        new TableCell({ borders, width: { size: w2, type: WidthType.DXA },
          margins: { top: 100, bottom: 100, left: 140, right: 120 },
          children: [new Paragraph({ children: [run(v, { size: 13, color: INK })] })] }),
      ]}));
      return new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [w1, w2],
        borders: { top: border, bottom: border, left: border, right: border,
                   insideHorizontal: border, insideVertical: border },
        rows,
      });
    })(),
  ];

  // ── Entry flow ────────────────────────────────────────────────────────
  const entryFlow = [
    ...sectionHeader(1, 'Entry flow',
      'How users enter, move through, and complete this variant.'),

    ...[
      ['Step 1', 'Profile dashboard', variant.entryPoint],
      ['Step 2', 'Childhood structure question', 'Context question before responsibilities'],
      ['Step 3', 'Part 1 — Responsibilities', '20 items across 4 categories'],
      ['Step 4', 'Part 2 — Life & Values', '17 questions across 6 categories'],
      ['Step 5', 'Waiting for partner screen', 'Until both partners complete'],
      ['Unlock', 'Results available', 'Both partners submitted'],
    ].map(([step, label, note]) => new Paragraph({
      spacing: { after: 80 },
      indent: { left: 400, hanging: 400 },
      children: [
        run(step + '   ', { size: 12, bold: true, color: variantColor, allCaps: true, characterSpacing: 60 }),
        run(label, { size: 14, bold: true, color: INK }),
        run('   ' + note, { size: 13, italics: true, color: MUTED }),
      ],
    })),
  ];

  // ── Childhood question ───────────────────────────────────────────────
  const childhood = [
    ...sectionHeader(2, 'Childhood structure question',
      'Asked before Part 1. Contextualises how each partner experienced household responsibilities growing up.'),
    prose('"' + CHILDHOOD_QUESTION.text + '"', { bold: true }),
    ...CHILDHOOD_QUESTION.options.map(opt => new Paragraph({
      spacing: { after: 60 },
      indent: { left: 400 },
      children: [run('•  ', { size: 13, color: MUTED }), run(opt, { size: 13, color: INK })],
    })),
  ];

  // ── Responsibilities ──────────────────────────────────────────────────
  const responsibilities = [
    ...sectionHeader(3, 'Part 1 — Responsibilities',
      '20 items across 4 categories. Each partner answers independently.'),

    prose('Framing question:', { bold: true, after: 80 }),
    prose('"' + RESPONSIBILITY_FRAMING[variantKey] + '"',
      { italics: true, color: MUTED, indent: 400, after: 240 }),

    prose('Answer options for Household, Financial, and Emotional Labor items:', { bold: true, after: 40 }),
    prose(RESPONSIBILITY_OPTIONS, { italics: true, color: MUTED, indent: 400, after: 120 }),
    prose('Answer options for Career & Work items:', { bold: true, after: 40 }),
    prose(CAREER_OPTIONS, { italics: true, color: MUTED, indent: 400, after: 240 }),

    ...RESPONSIBILITY_CATEGORIES.flatMap(cat => [
      eyebrow(cat.label + '  (' + cat.items.length + ' items)'),
      respTable(cat),
      ...sp(1),
    ]),
  ];

  // ── Life & Values ─────────────────────────────────────────────────────
  const lqByCategory = {};
  LIFE_QUESTIONS.forEach(q => {
    if (!lqByCategory[q.category]) lqByCategory[q.category] = [];
    lqByCategory[q.category].push(q);
  });
  const lqCategoryOrder = ['Family', 'Lifestyle', 'Values', 'Money', 'Conflict', 'Connection'];

  const lifeValues = [
    ...sectionHeader(4, 'Part 2 — Life & Values',
      '17 questions across 6 categories. Each question has a topic (bold) and a variant-specific expanding phrase.'),

    ...lqCategoryOrder.flatMap(catLabel => {
      const questions = lqByCategory[catLabel] || [];
      return [
        eyebrow(catLabel + '  (' + questions.length + ' questions)'),
        lqTable(catLabel, questions),
        ...sp(1),
      ];
    }),
  ];

  // ── Pending note (only on Revisiting) ─────────────────────────────────
  const pendingSection = variantKey === 'revisiting' ? [
    ...sectionHeader(5, 'Pending — Results experience',
      'Work still needed before this variant ships.'),
    new Paragraph({ spacing: { before: 0, after: 140 },
      shading: { fill: 'FFF7ED', type: ShadingType.CLEAR },
      border: { left: { style: BorderStyle.SINGLE, size: 24, color: 'C8402A', space: 12 } },
      indent: { left: 300 },
      children: [run(PENDING_NOTE, { size: 13, color: INK })] }),
  ] : [];

  // ── Assemble ──────────────────────────────────────────────────────────
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1080, right: 1440, bottom: 1080, left: 1440 },
        },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({ alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: STONE, space: 8 } },
            spacing: { before: 120, after: 0 },
            children: [
              run('Attune · Expectations ' + variant.label + '   ·   ', { size: 13, color: MUTED }),
              new TextRun({ children: [PageNumber.CURRENT], size: 13, color: INK, font: 'Arial' }),
              run(' / ', { size: 13, color: MUTED }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 13, color: MUTED, font: 'Arial' }),
            ] })],
        }),
      },
      children: [
        ...cover,
        ...entryFlow,
        ...childhood,
        ...responsibilities,
        ...lifeValues,
        ...pendingSection,
      ],
    }],
  });

  return doc;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPARISON DOC (landscape)
// ═══════════════════════════════════════════════════════════════════════════

function buildComparisonDoc() {
  // Landscape US Letter: pass portrait dims; docx-js swaps them internally.
  const CONTENT_W = 13680;

  const variantColors = [BLUE, PURPLE, ORANGE];

  const prose = (text, opts = {}) => new Paragraph({
    spacing: { after: opts.after ?? 120, line: 300, lineRule: 'atLeast' },
    alignment: opts.center ? AlignmentType.CENTER : undefined,
    children: [run(text, { size: opts.size ?? 14, color: opts.color ?? INK, italics: opts.italics, bold: opts.bold })],
  });

  const bigHeader = (title, subtitle, color = BLUE) => [
    pb(),
    new Paragraph({ spacing: { before: 120, after: 60 },
      children: [run(title, { size: 32, bold: true, color: INK })] }),
    new Paragraph({ spacing: { after: 200 },
      children: [run(subtitle, { size: 14, italics: true, color: MUTED })] }),
    new Paragraph({ spacing: { after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color, space: 4 } },
      children: [new TextRun('')] }),
  ];

  // 4-column comparison table: Label · Core · Anniversary · Revisiting
  // Color-codes rows: green if identical across variants, orange if different.
  const comparisonTable = (rows, opts = {}) => {
    const labelW = opts.labelW || 2400;
    const cellW = Math.floor((CONTENT_W - labelW) / 3);
    const colWidths = [labelW, cellW, cellW, cellW];

    const border = { style: BorderStyle.SINGLE, size: 4, color: 'D9CDBA' };
    const borders = { top: border, bottom: border, left: border, right: border };

    const headerCells = [
      new TableCell({ borders, width: { size: labelW, type: WidthType.DXA },
        shading: { fill: 'EDE6D8', type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 160, right: 120 },
        children: [new Paragraph({ children: [run(opts.labelHeader || '', { size: 12, bold: true, color: INK, allCaps: true, characterSpacing: 40 })] })] }),
      ...['Core', 'Anniversary', 'Revisiting'].map((label, i) => new TableCell({
        borders, width: { size: cellW, type: WidthType.DXA },
        shading: { fill: 'EDE6D8', type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 140, right: 140 },
        children: [new Paragraph({ children: [run(label, { size: 12, bold: true, color: variantColors[i], allCaps: true, characterSpacing: 40 })] })],
      })),
    ];

    const dataRows = rows.map(row => {
      const [label, core, anniv, revis] = row;
      const allSame = core === anniv && anniv === revis;
      const bg = allSame ? IDENT_BG : DIFF_BG;

      return new TableRow({ cantSplit: false, children: [
        new TableCell({ borders, width: { size: labelW, type: WidthType.DXA },
          shading: { fill: 'FAF7F1', type: ShadingType.CLEAR },
          verticalAlign: VerticalAlign.TOP,
          margins: { top: 120, bottom: 120, left: 160, right: 120 },
          children: [new Paragraph({ spacing: { line: 280, lineRule: 'atLeast' },
            children: [run(label, { size: 11, bold: true, color: INK })] })] }),
        ...[core, anniv, revis].map(text => new TableCell({
          borders, width: { size: cellW, type: WidthType.DXA },
          shading: { fill: bg, type: ShadingType.CLEAR },
          verticalAlign: VerticalAlign.TOP,
          margins: { top: 120, bottom: 120, left: 140, right: 140 },
          children: [new Paragraph({ spacing: { line: 280, lineRule: 'atLeast' },
            children: [run(text, { size: 11, color: INK })] })],
        })),
      ]});
    });

    return new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: colWidths,
      borders: { top: border, bottom: border, left: border, right: border,
                 insideHorizontal: border, insideVertical: border },
      rows: [new TableRow({ tableHeader: true, cantSplit: false, children: headerCells }), ...dataRows],
    });
  };

  // ── Cover ──────────────────────────────────────────────────────────────
  const cover = [
    ...sp(2),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [run('ATTUNE', { size: 22, bold: true, color: ORANGE, allCaps: true, characterSpacing: 120 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [run('Expectations Exercise — variant comparison', { size: 32, bold: true, color: INK })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 220 },
      children: [run('Side-by-side view of all 3 variants: Core · Anniversary · Revisiting.',
        { size: 15, italics: true, color: MUTED })] }),

    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 },
      children: [run('Reading this doc', { size: 11, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
      children: [run('Pale green rows are IDENTICAL across all 3 variants — skim these.', { size: 12, color: INK })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [run('Pale orange rows DIFFER between variants — review these.', { size: 12, color: INK })] }),

    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 120 },
      children: [run('The 3 variants at a glance', { size: 11, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }),

    comparisonTable([
      ['Flag',
        VARIANTS.core.flag, VARIANTS.anniversary.flag, VARIANTS.revisiting.flag],
      ['Audience',
        VARIANTS.core.audience, VARIANTS.anniversary.audience, VARIANTS.revisiting.audience],
      ['Package(s)',
        VARIANTS.core.packages, VARIANTS.anniversary.packages, VARIANTS.revisiting.packages],
      ['Entry point',
        VARIANTS.core.entryPoint, VARIANTS.anniversary.entryPoint, VARIANTS.revisiting.entryPoint],
      ['Framing',
        VARIANTS.core.framingNote, VARIANTS.anniversary.framingNote, VARIANTS.revisiting.framingNote],
      ['Childhood question',
        'Same text, same options', 'Same text, same options', 'Same text, same options'],
      ['Part 1 — Responsibilities items',
        '20 items in 4 categories', '20 items in 4 categories', '20 items in 4 categories'],
      ['Part 2 — Life & Values questions',
        '17 questions in 6 categories', '17 questions in 6 categories', '17 questions in 6 categories'],
    ], { labelHeader: 'Attribute' }),
  ];

  // ── Part 1: Entry flow comparison ──────────────────────────────────────
  const entryFlow = [
    ...bigHeader('Part 1 · Entry flow',
      'How users enter and move through each variant.', BLUE),

    comparisonTable([
      ['Step 1: Profile dashboard',
        VARIANTS.core.entryPoint, VARIANTS.anniversary.entryPoint, VARIANTS.revisiting.entryPoint],
      ['Step 2: Childhood question',
        'Context question before responsibilities',
        'Context question before responsibilities',
        'Context question before responsibilities'],
      ['Step 3: Responsibilities framing',
        '"' + RESPONSIBILITY_FRAMING.core + '"',
        '"' + RESPONSIBILITY_FRAMING.anniversary + '"',
        '"' + RESPONSIBILITY_FRAMING.revisiting + '"'],
      ['Step 4: Life & Values framing',
        VARIANTS.core.framingNote, VARIANTS.anniversary.framingNote, VARIANTS.revisiting.framingNote],
      ['Step 5: Waiting for partner',
        'Until both submit', 'Until both submit', 'Until both submit'],
      ['Unlock: Results',
        'Standard first-time results',
        'Standard results (Anniversary context)',
        'Comparison-to-prior-results — PENDING'],
    ], { labelHeader: 'Flow step' }),
  ];

  // ── Part 2: Responsibilities comparison ────────────────────────────────
  const responsibilities = [
    ...bigHeader('Part 2 · Responsibilities items',
      'All 20 items are IDENTICAL across variants. Only the framing question differs.', GREEN),

    prose('Framing question (this is what differs):', { bold: true }),
    comparisonTable([
      ['Framing',
        '"' + RESPONSIBILITY_FRAMING.core + '"',
        '"' + RESPONSIBILITY_FRAMING.anniversary + '"',
        '"' + RESPONSIBILITY_FRAMING.revisiting + '"'],
      ['Household items',
        RESPONSIBILITY_CATEGORIES[0].items.length + ' items',
        RESPONSIBILITY_CATEGORIES[0].items.length + ' items',
        RESPONSIBILITY_CATEGORIES[0].items.length + ' items'],
      ['Financial items',
        RESPONSIBILITY_CATEGORIES[1].items.length + ' items',
        RESPONSIBILITY_CATEGORIES[1].items.length + ' items',
        RESPONSIBILITY_CATEGORIES[1].items.length + ' items'],
      ['Career & Work items',
        RESPONSIBILITY_CATEGORIES[2].items.length + ' items',
        RESPONSIBILITY_CATEGORIES[2].items.length + ' items',
        RESPONSIBILITY_CATEGORIES[2].items.length + ' items'],
      ['Emotional Labor items',
        RESPONSIBILITY_CATEGORIES[3].items.length + ' items',
        RESPONSIBILITY_CATEGORIES[3].items.length + ' items',
        RESPONSIBILITY_CATEGORIES[3].items.length + ' items'],
      ['Answer options (Household/Financial/Emotional)',
        RESPONSIBILITY_OPTIONS, RESPONSIBILITY_OPTIONS, RESPONSIBILITY_OPTIONS],
      ['Answer options (Career)',
        CAREER_OPTIONS, CAREER_OPTIONS, CAREER_OPTIONS],
    ], { labelHeader: 'Aspect' }),

    ...sp(1),
    prose('Full item list (identical across all 3 variants):', { bold: true }),
    ...RESPONSIBILITY_CATEGORIES.flatMap(cat => [
      new Paragraph({ spacing: { before: 120, after: 60 },
        children: [run(cat.label.toUpperCase() + '  ·  ' + cat.items.length + ' items',
          { size: 11, bold: true, color: GREEN, characterSpacing: 60 })] }),
      ...cat.items.map((item, i) => new Paragraph({
        spacing: { after: 40 },
        indent: { left: 400 },
        children: [
          run(String(i + 1) + '.  ', { size: 11, color: MUTED }),
          run(item, { size: 12, color: INK }),
        ],
      })),
    ]),
  ];

  // ── Part 3: Life & Values comparison (the main event) ──────────────────
  const lvRows = LIFE_QUESTIONS.map(q => [
    q.topic + '  (' + q.id + ')',
    q.core,
    q.anniversary,
    q.revisiting,
  ]);

  const lifeValues = [
    ...bigHeader('Part 3 · Life & Values questions — expanding phrases',
      'All 17 question IDs are identical across variants. Topics (bold lead-in) are identical. The expanding phrase after the em-dash is the tone-adjusted part that differs per variant.',
      PURPLE),

    prose('How to read this section: each row shows the same question (by ID) with its topic on the left, then the variant-specific expanding phrase in each of the 3 columns. Every row is orange because every expanding phrase differs by design.',
      { italics: true, color: MUTED }),
    ...sp(1),

    comparisonTable(lvRows, { labelHeader: 'Topic', labelW: 3200 }),
  ];

  // ── Part 4: Life & Values answer options (identical) ───────────────────
  const answerOptions = [
    ...bigHeader('Part 4 · Life & Values answer options',
      'IDENTICAL across all 3 variants. Listed here once as reference — no variant-by-variant comparison needed.',
      GREEN),

    (() => {
      const border = { style: BorderStyle.SINGLE, size: 4, color: 'D9CDBA' };
      const borders = { top: border, bottom: border, left: border, right: border };
      const w1 = 2200, w2 = 3000, w3 = CONTENT_W - w1 - w2;
      const rows = [
        new TableRow({ tableHeader: true, cantSplit: false, children: [
          new TableCell({ borders, width: { size: w1, type: WidthType.DXA },
            shading: { fill: 'EDE6D8', type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 140, right: 120 },
            children: [new Paragraph({ children: [run('Question ID', { size: 12, bold: true, color: INK, allCaps: true, characterSpacing: 40 })] })] }),
          new TableCell({ borders, width: { size: w2, type: WidthType.DXA },
            shading: { fill: 'EDE6D8', type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 140, right: 120 },
            children: [new Paragraph({ children: [run('Topic', { size: 12, bold: true, color: INK, allCaps: true, characterSpacing: 40 })] })] }),
          new TableCell({ borders, width: { size: w3, type: WidthType.DXA },
            shading: { fill: 'EDE6D8', type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 140, right: 120 },
            children: [new Paragraph({ children: [run('Answer options', { size: 12, bold: true, color: INK, allCaps: true, characterSpacing: 40 })] })] }),
        ]}),
        ...LIFE_QUESTIONS.map(q => new TableRow({ cantSplit: false, children: [
          new TableCell({ borders, width: { size: w1, type: WidthType.DXA },
            shading: { fill: 'FAF7F1', type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 140, right: 120 },
            children: [new Paragraph({ children: [run(q.id, { size: 11, bold: true, color: INK })] })] }),
          new TableCell({ borders, width: { size: w2, type: WidthType.DXA },
            margins: { top: 100, bottom: 100, left: 140, right: 120 },
            children: [new Paragraph({ children: [run(q.topic, { size: 12, color: INK })] })] }),
          new TableCell({ borders, width: { size: w3, type: WidthType.DXA },
            shading: { fill: IDENT_BG, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 140, right: 120 },
            children: [new Paragraph({ children: [run(q.options.join(' · '), { size: 11, color: INK })] })] }),
        ]})),
      ];
      return new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [w1, w2, w3],
        borders: { top: border, bottom: border, left: border, right: border,
                   insideHorizontal: border, insideVertical: border },
        rows,
      });
    })(),
  ];

  // ── Part 5: Summary ────────────────────────────────────────────────────
  const summary = [
    ...bigHeader('Part 5 · Summary — what to review',
      'The short list of things worth confirming.', ORANGE),

    new Paragraph({ spacing: { after: 120 },
      children: [run('1. Life & Values expanding phrases', { size: 15, bold: true, color: 'C8402A' })] }),
    prose('All 17 topics have variant-specific expanding phrases drafted in Part 3 above. Review each row — does the Anniversary phrasing feel right for a couple who\'s already living this, and does the Revisiting phrasing feel right for a couple checking in on where they are now?'),
    ...sp(1),

    new Paragraph({ spacing: { after: 120 },
      children: [run('2. Responsibilities framing', { size: 15, bold: true, color: 'C8402A' })] }),
    prose('Each variant has its own lead-in question. Does each framing feel right for its audience?'),
    ...sp(1),

    new Paragraph({ spacing: { after: 120 },
      children: [run('3. Answer options', { size: 15, bold: true, color: INK })] }),
    prose('Answer options are identical across variants by design (so results comparisons work across retakes). Part 4 above lists them — worth a once-over.'),
    ...sp(1),

    new Paragraph({ spacing: { after: 120 },
      children: [run('4. Revisiting results experience — PENDING', { size: 15, bold: true, color: 'C8402A' })] }),
    new Paragraph({ spacing: { before: 0, after: 0 },
      shading: { fill: 'FFF7ED', type: ShadingType.CLEAR },
      border: { left: { style: BorderStyle.SINGLE, size: 24, color: 'C8402A', space: 12 } },
      indent: { left: 300 },
      children: [run(PENDING_NOTE, { size: 13, color: INK })] }),
  ];

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840, orientation: PageOrientation.LANDSCAPE },
          margin: { top: 960, right: 1080, bottom: 960, left: 1080 },
        },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({ alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: STONE, space: 8 } },
            spacing: { before: 120, after: 0 },
            children: [
              run('Attune · Expectations variant comparison   ·   ', { size: 13, color: MUTED }),
              new TextRun({ children: [PageNumber.CURRENT], size: 13, color: INK, font: 'Arial' }),
              run(' / ', { size: 13, color: MUTED }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 13, color: MUTED, font: 'Arial' }),
            ] })],
        }),
      },
      children: [
        ...cover,
        ...entryFlow,
        ...responsibilities,
        ...lifeValues,
        ...answerOptions,
        ...summary,
      ],
    }],
  });

  return doc;
}

// ═══════════════════════════════════════════════════════════════════════════
// Build all 4 docs
// ═══════════════════════════════════════════════════════════════════════════

async function buildAndSave(doc, filename) {
  const buf = await Packer.toBuffer(doc);
  const docxPath = '/tmp/' + filename + '.docx';
  writeFileSync(docxPath, buf);
  execSync('libreoffice --headless --convert-to pdf --outdir /tmp ' + docxPath, { stdio: 'pipe' });
  console.log(`✓ ${filename} — ${buf.length} bytes`);
}

await buildAndSave(buildFlowDoc('core'), 'expectations_flow_core');
await buildAndSave(buildFlowDoc('anniversary'), 'expectations_flow_anniversary');
await buildAndSave(buildFlowDoc('revisiting'), 'expectations_flow_revisiting');
await buildAndSave(buildComparisonDoc(), 'expectations_variant_comparison');

console.log('\nDone. 4 docs built in /tmp/.');
