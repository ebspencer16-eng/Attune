// Concise content review doc for the Attune workbook.
//
// Covers five areas of copy that plug into the personalized workbook:
//   1. Epigraphs     — 12 draft candidates across 4 parts (pick or overwrite)
//   2. Dimensions    — existing copy for 10 communication dimensions, plus
//                      the NEW "when this shows up" slot that needs writing
//   3. Expectations  — existing copy for 7 life-expectations domains
//   4. Six Moments   — overview + 6 moment titles + 5-block structure
//   5. Conversation  — 5 situations + prompt format
//
// Couple types live in couple_types_review.docx (one page per type).

import { writeFileSync } from 'fs';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, Footer, PageNumber,
} from 'docx';
import { DIM_META, DIM_CONTENT, EXP_DOMAINS, DIMS } from '../api/_workbook-content.js';

const ORANGE = 'E8673A', BLUE = '1B5FE8', PURPLE = '9B5DE5', GREEN = '10B981';
const INK = '0E0B07', MUTED = '8C7A68', STONE = 'E8DDD0';
const W = 9360;

const run = (t, o = {}) => new TextRun({ text: String(t ?? ''), font: 'Arial', ...o });
const para = (t, o = {}) => new Paragraph({ spacing: { after: o.after ?? 120, before: o.before ?? 0 }, alignment: o.align,
  indent: o.indent,
  children: [run(t, { size: o.size ?? 20, color: o.color ?? INK, bold: o.bold, italics: o.italics })] });
const sp = (after = 80) => new Paragraph({ spacing: { after }, children: [new TextRun('')] });
const pb = () => new Paragraph({ children: [new TextRun({ break: 1 })], pageBreakBefore: true });
const noBrd = { style: BorderStyle.NONE };
const noBrds = { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd, insideHorizontal: noBrd, insideVertical: noBrd };

function sectionHeader(n, title, subtitle, color) {
  return [
    pb(),
    new Paragraph({ spacing: { before: 0, after: 60 },
      children: [
        run(`SECTION ${n}`, { size: 14, bold: true, color, allCaps: true, characterSpacing: 80 }),
        run('   of 5', { size: 12, color: MUTED }),
      ] }),
    new Paragraph({ spacing: { after: 60 },
      children: [run(title, { size: 30, bold: true, color: INK })] }),
    new Paragraph({ spacing: { after: 220 },
      children: [run(subtitle, { size: 16, italics: true, color: MUTED })] }),
  ];
}

function labeledBlock(label, body, color, opts = {}) {
  return new Paragraph({ spacing: { after: opts.after ?? 100, before: opts.before ?? 0 },
    children: [
      run(`${label}  `, { size: 11, bold: true, color, allCaps: true, characterSpacing: 60 }),
      run(body, { size: 14, color: opts.color ?? INK, italics: opts.italics }),
    ],
  });
}

function toWriteBlock(instructions, color = BLUE) {
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W],
    borders: noBrds,
    rows: [new TableRow({ children: [new TableCell({
      borders: { top: noBrd, bottom: noBrd, left: { style: BorderStyle.SINGLE, size: 16, color, space: 8 }, right: noBrd },
      width: { size: W, type: WidthType.DXA },
      shading: { fill: 'F5F8FE', type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 200, right: 200 },
      children: [new Paragraph({ spacing: { after: 0 },
        children: [
          run('TO WRITE   ', { size: 11, bold: true, color, allCaps: true, characterSpacing: 80 }),
          run(instructions, { size: 13, color: INK, italics: true }),
        ],
      })],
    })]})],
  });
}

// ── COVER ────────────────────────────────────────────────────────────────────
const coverPage = [
  sp(400),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
    children: [run('ATTUNE', { size: 20, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [run('Workbook Content — Review Doc', { size: 34, bold: true, color: INK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
    children: [run('Five content areas to review. No fluff.', { size: 18, italics: true, color: MUTED })] }),
  sp(120),

  para('What\'s in this doc', { bold: true, size: 20, color: ORANGE, after: 160 }),

  new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [700, 2800, W - 700 - 2800],
    borders: noBrds,
    rows: [
      ...[
        ['1', 'Epigraphs', 'Draft candidates for each of the 4 Parts. Pick or overwrite.', ORANGE],
        ['2', 'Dimensions', '10 dimensions. Existing copy + a new "when this shows up" slot.', BLUE],
        ['3', 'Expectations', '7 life-expectations domains. Existing copy.', GREEN],
        ['4', 'Six Moments Library', 'New content library. Structure + per-type matrix.', PURPLE],
        ['5', 'Conversation Starters', 'New content library. 5 situations + prompt format.', PURPLE],
      ].map(([n, title, desc, color]) => new TableRow({
        children: [
          new TableCell({ borders: noBrds, width: { size: 700, type: WidthType.DXA },
            margins: { top: 120, bottom: 80, left: 0, right: 120 },
            children: [new Paragraph({ spacing: { after: 0 },
              children: [run(n, { size: 22, bold: true, color })] })] }),
          new TableCell({ borders: noBrds, width: { size: 2800, type: WidthType.DXA },
            margins: { top: 120, bottom: 80, left: 0, right: 120 },
            children: [new Paragraph({ spacing: { after: 0 },
              children: [run(title, { size: 16, bold: true, color: INK })] })] }),
          new TableCell({ borders: noBrds, width: { size: W - 700 - 2800, type: WidthType.DXA },
            margins: { top: 120, bottom: 80, left: 120, right: 0 },
            children: [new Paragraph({ spacing: { after: 0 },
              children: [run(desc, { size: 14, color: MUTED, italics: true })] })] }),
        ],
      })),
    ],
  }),

  sp(300),

  para('How to review', { bold: true, size: 20, color: ORANGE, after: 120 }),
  para('Add comments or tracked changes directly in the .docx version. When the review is done, send it back and I\'ll reconcile edits into the source files.',
    { size: 16, after: 120 }),
  para('Couple types are in a separate doc (couple_types_review.docx) since each one gets its own page there.',
    { size: 14, italics: true, color: MUTED }),
];

// ── SECTION 1 — EPIGRAPHS ────────────────────────────────────────────────────

const EPIGRAPH_DRAFTS = [
  {
    part: 'Part 1',
    title: 'A closer look at the dimensions that matter',
    tone: 'Clarity. Seeing what was there the whole time.',
    candidates: [
      { quote: 'We don\'t see things as they are; we see them as we are.', attribution: 'Anaïs Nin' },
      { quote: 'What you see depends not only on what you look at, but also on where you look from.', attribution: 'James Deese' },
      { quote: 'The real voyage of discovery consists not in seeking new landscapes, but in having new eyes.', attribution: 'Marcel Proust' },
    ],
  },
  {
    part: 'Part 2',
    title: 'Working Knowledge',
    tone: 'Knowing another person. The practice of it.',
    candidates: [
      { quote: 'To love without knowing how to love wounds the person we love.', attribution: 'Thich Nhat Hanh' },
      { quote: 'We repeat what we don\'t repair.', attribution: 'Christine Langley-Obaugh' },
      { quote: 'The greatest gift you can give another is the purity of your attention.', attribution: 'Richard Moss' },
    ],
  },
  {
    part: 'Part 3',
    title: 'Your 3 Priorities',
    tone: 'Focus. Choosing where to put the effort.',
    candidates: [
      { quote: 'If you chase two rabbits, you will catch neither.', attribution: 'Russian proverb' },
      { quote: 'The difference between successful people and very successful people is that very successful people say no to almost everything.', attribution: 'Warren Buffett' },
      { quote: 'You can do anything, but not everything.', attribution: 'David Allen' },
    ],
  },
  {
    part: 'Part 4',
    title: 'Conversation Library',
    tone: 'Words. What they do. What to say.',
    candidates: [
      { quote: 'The single biggest problem in communication is the illusion that it has taken place.', attribution: 'George Bernard Shaw' },
      { quote: 'When the right word is found, the right word is an answer.', attribution: 'Georges Braque' },
      { quote: 'The most important thing in communication is hearing what isn\'t said.', attribution: 'Peter Drucker' },
    ],
  },
];

function epigraphSection() {
  return [
    ...sectionHeader(1, 'Epigraphs', 'Four Parts. Three drafted candidates each. Pick one per Part or replace with your own.', ORANGE),
    ...EPIGRAPH_DRAFTS.flatMap(p => [
      new Paragraph({ spacing: { before: 120, after: 40 },
        children: [
          run(p.part, { size: 11, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 }),
          run('   ·   ', { size: 11, color: STONE }),
          run(p.title, { size: 14, bold: true, color: INK }),
          run('   ·   ', { size: 11, color: STONE }),
          run(p.tone, { size: 12, italics: true, color: MUTED }),
        ] }),
      ...p.candidates.map((c, i) => new Paragraph({ spacing: { after: 60 }, indent: { left: 280, hanging: 280 },
        children: [
          run(`${i + 1}.  `, { size: 13, bold: true, color: MUTED }),
          run(`"${c.quote}"`, { size: 13, color: INK }),
          run(`  —  ${c.attribution}`, { size: 12, italics: true, color: MUTED }),
        ],
      })),
    ]),
  ];
}

// ── SECTION 2 — DIMENSIONS ───────────────────────────────────────────────────

function dimensionBlock(dimKey) {
  const meta = DIM_META[dimKey];
  const c = DIM_CONTENT[dimKey];
  const color = meta.color || BLUE;

  return [
    new Paragraph({ spacing: { before: 160, after: 40 },
      children: [
        run(meta.label, { size: 18, bold: true, color }),
        run(`     ${meta.left}  ←→  ${meta.right}`, { size: 12, italics: true, color: MUTED }),
      ] }),
    labeledBlock('Measures', c.measures, color, { after: 60 }),
    labeledBlock('If aligned', c.closeText, GREEN, { after: 60 }),
    labeledBlock('If there\'s a gap', c.gapText, ORANGE, { after: 60 }),
    new Paragraph({ spacing: { after: 60 },
      children: [
        run('Prompts  ', { size: 11, bold: true, color, allCaps: true, characterSpacing: 60 }),
        ...c.prompts.map((pr, i) => run(`${i === 0 ? '' : '  ·  '}${pr}`, { size: 13, color: INK })),
      ] }),
    labeledBlock('Try this week', c.thisWeek, BLUE, { after: 100, italics: true }),
    toWriteBlock(`"When this shows up" — 2-3 sentences of concrete, referenceable guidance for ${meta.label.toLowerCase()}. Present-tense, second-person, written as advice you'd flip to during a real moment. No hedging.`),
  ];
}

function dimensionsSection() {
  return [
    ...sectionHeader(2, 'Dimensions', 'All 10 communication dimensions. Existing copy is already drafted — review for tone and accuracy. Each dimension also needs a "when this shows up" paragraph written from scratch.', BLUE),
    ...DIMS.flatMap(d => dimensionBlock(d)),
  ];
}

// ── SECTION 3 — EXPECTATIONS ─────────────────────────────────────────────────

function expectationBlock(dom) {
  return [
    new Paragraph({ spacing: { before: 160, after: 40 },
      children: [run(dom.label, { size: 18, bold: true, color: GREEN })] }),
    labeledBlock('If aligned', dom.closeText, GREEN, { after: 60 }),
    labeledBlock('If there\'s a gap', dom.gapText, ORANGE, { after: 60 }),
    labeledBlock('Try this week', dom.thisWeek, BLUE, { after: 60, italics: true }),
  ];
}

function expectationsSection() {
  return [
    ...sectionHeader(3, 'Expectations', 'All 7 life-expectations domains. Review existing copy for tone.', GREEN),
    ...EXP_DOMAINS.flatMap(e => expectationBlock(e)),
  ];
}

// ── SECTION 4 — SIX MOMENTS LIBRARY ──────────────────────────────────────────

const MOMENTS = [
  { n: 1, title: 'After a hard workday', blurb: 'One of them comes home drained. The other wants to connect or catch up.' },
  { n: 2, title: 'When they\'re worried but haven\'t said it', blurb: 'Something\'s off. Not shared yet. The signal is showing up other ways.' },
  { n: 3, title: 'During a disagreement', blurb: 'In the moment. Tensions are up. How to stay in conversation, not escalate.' },
  { n: 4, title: 'After a disagreement', blurb: 'The heat has passed but neither knows if things are resolved yet.' },
  { n: 5, title: 'When they want to feel close', blurb: 'Low-key bid for connection — not dramatic, but it matters.' },
  { n: 6, title: 'When stress is coming from outside the relationship', blurb: 'Work, family, health. Not about them, but lands inside the partnership.' },
];

const INDIVIDUAL_TYPES = [
  { letter: 'W', label: 'Open + Engages quickly',  gist: 'emotionally expressive, wants resolution fast' },
  { letter: 'X', label: 'Guarded + Engages quickly', gist: 'direct and resolution-oriented, but processes feelings internally' },
  { letter: 'Y', label: 'Open + Needs space',       gist: 'emotionally expressive but needs quiet to recover; warms up over time' },
  { letter: 'Z', label: 'Guarded + Needs space',    gist: 'reserved, withdraws to process; shares once settled' },
];

function sixMomentsSection() {
  return [
    ...sectionHeader(4, 'Six Moments Library', 'Six universal relationship moments. For each moment, we write four versions — one per individual type (W/X/Y/Z). That\'s 24 scenes total.', PURPLE),

    para('The six moments', { bold: true, size: 16, color: PURPLE, after: 80 }),
    para('Approve the list first. These are the moments the workbook will give every couple language for. They need to feel universal — anyone should recognize them.',
      { size: 14, italics: true, color: MUTED, after: 140 }),
    ...MOMENTS.map(m => new Paragraph({ spacing: { after: 80 }, indent: { left: 280, hanging: 280 },
      children: [
        run(`${m.n}.  `, { size: 14, bold: true, color: PURPLE }),
        run(m.title, { size: 14, bold: true, color: INK }),
        run(`  —  ${m.blurb}`, { size: 13, italics: true, color: MUTED }),
      ],
    })),

    sp(200),

    para('The four individual types', { bold: true, size: 16, color: PURPLE, after: 80 }),
    para('Each moment gets written four times, keyed to the subject partner\'s type. Reference:',
      { size: 14, italics: true, color: MUTED, after: 120 }),
    ...INDIVIDUAL_TYPES.map(t => new Paragraph({ spacing: { after: 60 }, indent: { left: 280, hanging: 280 },
      children: [
        run(`${t.letter}  `, { size: 16, bold: true, color: PURPLE }),
        run(t.label, { size: 13, bold: true, color: INK }),
        run(`  —  ${t.gist}`, { size: 13, italics: true, color: MUTED }),
      ],
    })),

    sp(200),

    para('What each scene contains', { bold: true, size: 16, color: PURPLE, after: 80 }),
    para('Five short blocks per scene. Every scene follows this exact shape so readers can flip to any moment and know where to look.',
      { size: 14, italics: true, color: MUTED, after: 140 }),

    new Table({
      width: { size: W, type: WidthType.DXA }, columnWidths: [2400, W - 2400],
      borders: { top: { style: BorderStyle.SINGLE, size: 4, color: STONE }, bottom: { style: BorderStyle.SINGLE, size: 4, color: STONE }, left: noBrd, right: noBrd, insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: STONE }, insideVertical: noBrd },
      rows: [
        ['The moment',       MUTED,   '1 sentence. The concrete situation. "They come home after a tough day and go quiet."'],
        ['What\'s happening for [them]', PURPLE, '2-3 sentences keyed to the subject\'s type. What\'s actually going on inside them. Grounded in how that type is wired.'],
        ['What NOT to do',    'C8402A', '1 sentence. The natural but wrong move the other partner tends to make.'],
        ['What works',        GREEN,   '1-2 sentences. The specific action the other partner should take instead.'],
        ['Phrase that lands', BLUE,    'A literal line. Short, specific, something a real person would actually say.'],
      ].map(([label, color, desc]) => new TableRow({ children: [
        new TableCell({ borders: noBrds, width: { size: 2400, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 0, right: 120 },
          children: [new Paragraph({ spacing: { after: 0 },
            children: [run(label, { size: 12, bold: true, color, allCaps: true, characterSpacing: 60 })] })] }),
        new TableCell({ borders: noBrds, width: { size: W - 2400, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 0 },
          children: [new Paragraph({ spacing: { after: 0 },
            children: [run(desc, { size: 13, color: INK })] })] }),
      ]})),
    }),

    sp(200),

    para('What to review in this section', { bold: true, size: 16, color: PURPLE, after: 80 }),
    ...[
      'Are these the right 6 moments? Anything missing, anything to replace?',
      'Are the 4 individual-type labels and gists accurate?',
      'Does the 5-block structure work, or should a block be added/removed?',
    ].map(t => new Paragraph({ spacing: { after: 60 }, indent: { left: 280 },
      children: [run('·  ', { size: 14, color: PURPLE, bold: true }), run(t, { size: 14, color: INK })] })),

    sp(200),
    toWriteBlock('After this structure is approved, 24 scene cards get written — 6 moments × 4 individual types. Sample drafting happens in a separate working doc.', PURPLE),
  ];
}

// ── SECTION 5 — CONVERSATION STARTERS ────────────────────────────────────────

const SITUATIONS = [
  { n: 1, title: 'At dinner on a quiet night', blurb: 'Low-stakes depth. Not a fight, not a date — just present together.' },
  { n: 2, title: 'After a hard week', blurb: 'One or both are worn down. Mutual care, not problem-solving.' },
  { n: 3, title: 'When one of you is off but won\'t say why', blurb: 'Something\'s there. Gentle excavation, not interrogation.' },
  { n: 4, title: 'Before a difficult conversation', blurb: 'Setting it up. Framing first, hard content second.' },
  { n: 5, title: 'When you\'re tired of talking about logistics', blurb: 'Life has become admin. Restoring romance, not scheduling it.' },
];

function conversationSection() {
  return [
    ...sectionHeader(5, 'Conversation Starters', 'Five universal situations. Each gets a master list of prompts; three are shown per workbook, chosen for that couple\'s type.', PURPLE),

    para('The five situations', { bold: true, size: 16, color: PURPLE, after: 80 }),
    para('Approve the list first. These are moments where couples want language, not therapy.', { size: 14, italics: true, color: MUTED, after: 140 }),
    ...SITUATIONS.map(s => new Paragraph({ spacing: { after: 80 }, indent: { left: 280, hanging: 280 },
      children: [
        run(`${s.n}.  `, { size: 14, bold: true, color: PURPLE }),
        run(s.title, { size: 14, bold: true, color: INK }),
        run(`  —  ${s.blurb}`, { size: 13, italics: true, color: MUTED }),
      ],
    })),

    sp(200),

    para('What each prompt contains', { bold: true, size: 16, color: PURPLE, after: 80 }),
    para('Minimum viable library: 5 situations × ~5 prompts each = 25 prompts. Each prompt has:', { size: 14, italics: true, color: MUTED, after: 100 }),

    new Table({
      width: { size: W, type: WidthType.DXA }, columnWidths: [2400, W - 2400],
      borders: { top: { style: BorderStyle.SINGLE, size: 4, color: STONE }, bottom: { style: BorderStyle.SINGLE, size: 4, color: STONE }, left: noBrd, right: noBrd, insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: STONE }, insideVertical: noBrd },
      rows: [
        ['The prompt',         BLUE,   'One sentence. A question or invitation. Opens something, doesn\'t close it.'],
        ['Best for',           ORANGE, 'Couple type tag(s) this prompt fits — e.g. WX, WY, or ALL if universal. A single prompt can fit multiple types.'],
      ].map(([label, color, desc]) => new TableRow({ children: [
        new TableCell({ borders: noBrds, width: { size: 2400, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 0, right: 120 },
          children: [new Paragraph({ spacing: { after: 0 },
            children: [run(label, { size: 12, bold: true, color, allCaps: true, characterSpacing: 60 })] })] }),
        new TableCell({ borders: noBrds, width: { size: W - 2400, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 0 },
          children: [new Paragraph({ spacing: { after: 0 },
            children: [run(desc, { size: 13, color: INK })] })] }),
      ]})),
    }),

    sp(180),

    para('Example (for reference)', { bold: true, size: 16, color: PURPLE, after: 80 }),
    new Table({
      width: { size: W, type: WidthType.DXA }, columnWidths: [W],
      borders: noBrds,
      rows: [new TableRow({ children: [new TableCell({
        borders: { top: noBrd, bottom: noBrd, left: { style: BorderStyle.SINGLE, size: 16, color: PURPLE, space: 8 }, right: noBrd },
        width: { size: W, type: WidthType.DXA },
        shading: { fill: 'FBF7FE', type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 240, right: 200 },
        children: [
          new Paragraph({ spacing: { after: 40 },
            children: [run('Situation 1  ·  At dinner on a quiet night', { size: 12, bold: true, color: PURPLE, allCaps: true, characterSpacing: 40 })] }),
          new Paragraph({ spacing: { after: 80 },
            children: [run('"What\'s something you noticed this week that you didn\'t tell me about yet?"', { size: 14, color: INK, italics: true })] }),
          new Paragraph({ spacing: { after: 0 },
            children: [
              run('Best for:  ', { size: 11, bold: true, color: ORANGE, allCaps: true, characterSpacing: 40 }),
              run('ALL (works broadly, not type-specific)', { size: 12, color: MUTED }),
            ] }),
        ],
      })]})],
    }),

    sp(200),
    para('What to review in this section', { bold: true, size: 16, color: PURPLE, after: 80 }),
    ...[
      'Are these the right 5 situations? Anything missing, anything to replace?',
      'Does the format (prompt + "best for" tag) work?',
      'Is the example in the right register for the rest?',
    ].map(t => new Paragraph({ spacing: { after: 60 }, indent: { left: 280 },
      children: [run('·  ', { size: 14, color: PURPLE, bold: true }), run(t, { size: 14, color: INK })] })),

    sp(200),
    toWriteBlock('After the structure is approved, 25 prompts get written — 5 per situation. Each tagged with one or more couple types. Drafted in a separate working doc.', PURPLE),
  ];
}

// ── Assemble ─────────────────────────────────────────────────────────────────
const children = [
  ...coverPage,
  ...epigraphSection(),
  ...dimensionsSection(),
  ...expectationsSection(),
  ...sixMomentsSection(),
  ...conversationSection(),
];

const doc = new Document({
  styles: { default: { document: { run: { font: 'Arial', size: 20 } } } },
  sections: [{
    properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
    footers: {
      default: new Footer({
        children: [new Paragraph({ alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: STONE, space: 8 } },
          spacing: { before: 120, after: 0 },
          children: [
            run('Attune — Content Review   ·   ', { size: 13, color: MUTED }),
            new TextRun({ children: [PageNumber.CURRENT], size: 13, color: INK, font: 'Arial' }),
            run(' / ', { size: 13, color: MUTED }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 13, color: MUTED, font: 'Arial' }),
          ],
        })],
      }),
    },
    children,
  }],
});

const buf = await Packer.toBuffer(doc);
writeFileSync('/tmp/workbook_content_review.docx', buf);
console.log(`✓ Content review: /tmp/workbook_content_review.docx (${buf.length} bytes)`);
