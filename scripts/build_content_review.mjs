// Generates a comprehensive .docx review document covering every piece of
// content that plugs into the personalized workbook template.
//
// Seven content areas, in the order they appear in the workbook:
//   1. Epigraphs — one quote per Part (5 total)
//   2. Dimensions — 10 communication dimensions (measures, close/gap text,
//      prompts, weekly exercise, and the new "when this shows up" callout)
//   3. Expectations — 7 expectations domains (close/gap text + weekly exercise)
//   4. Couple Types — 10 couple type narratives (description, nuance,
//      strengths, sticking points, patterns, tips, famous duos)
//   5. Six Moments Library — 24 scene cards (6 moments × 4 individual types)
//   6. Conversation Starters — ~25 prompts tagged by situation and couple type
//   7. Dimension "When This Shows Up" — 10 paragraphs, one per dimension
//
// For each content item, this doc renders a colored label card with the
// content. Ellie reviews via tracked changes or comments; edits are
// reconciled back into the appropriate source files afterward.

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
const noBrds = { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } };

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

const emptyCard = (label, hint, color) => {
  return editCard(label,
    [new Paragraph({ spacing: { after: 0 },
      children: [run(`[ TO WRITE ] ${hint}`, { size: 20, italics: true, color: MUTED })] })],
    color || ORANGE);
};

function partCover(num, title, subtitle) {
  return [
    pb(),
    ...sps(4),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
      children: [run(`SECTION ${num}`, { size: 18, bold: true, color: ORANGE, allCaps: true, tracking: 100 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [run(title, { size: 40, bold: true, color: INK })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
      children: [run(subtitle, { size: 20, italics: true, color: MUTED })] }),
  ];
}

function buildCover() {
  return [
    ...sps(6),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
      children: [run('ATTUNE', { size: 22, bold: true, color: ORANGE, allCaps: true, tracking: 180 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [run('Workbook Content — Review Doc', { size: 54, bold: true, color: INK })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
      children: [run('Every piece of copy that plugs into the personalized workbook template.', { size: 22, italics: true, color: MUTED })] }),
    hr(STONE, 10),
    ...sps(2),

    para('Seven content areas to review, in the order they appear in the workbook:',
      { size: 22, after: 140 }),

    para('1.  EPIGRAPHS — one short quote at the start of each Part. Five needed.',
      { size: 20, color: MUTED, after: 100 }),
    para('2.  DIMENSIONS — the 10 communication dimensions. Already drafted; review for tone and copy tightness.',
      { size: 20, color: MUTED, after: 100 }),
    para('3.  EXPECTATIONS — 7 life-expectations domains (household, financial, etc). Already drafted.',
      { size: 20, color: MUTED, after: 100 }),
    para('4.  COUPLE TYPES — the 10 couple type narratives. Already drafted.',
      { size: 20, color: MUTED, after: 100 }),
    para('5.  SIX MOMENTS LIBRARY (new) — 24 scene cards: 6 moments × 4 individual types.',
      { size: 20, color: MUTED, after: 100 }),
    para('6.  CONVERSATION STARTERS (new) — 5 situations, curated prompts per couple type.',
      { size: 20, color: MUTED, after: 100 }),
    para('7.  DIMENSION "WHEN THIS SHOWS UP" (new) — a short reference paragraph per dimension.',
      { size: 20, color: MUTED, after: 240 }),

    para('To edit: make edits in this .docx with tracked changes or comments. I\'ll reconcile them back into the source files.',
      { size: 20, italics: true, color: ORANGE }),
  ];
}

// ─── Section 1: Epigraphs ────────────────────────────────────────────────────
const EPIGRAPH_SLOTS = [
  { part: 1, title: 'A closer look at the dimensions that matter', tone: 'reflection, observation, seeing clearly' },
  { part: 2, title: 'Working Knowledge',                            tone: 'knowing another person, long attention' },
  { part: 3, title: 'Your 3 Priorities',                            tone: 'focus, choosing, leverage' },
  { part: 4, title: 'Conversation Library',                         tone: 'words, dialogue, listening' },
];

function buildEpigraphs() {
  const out = [...partCover(1, 'Epigraphs', 'One short quote per Part. Four needed (Reference Card has no epigraph). Give me 2–3 candidates per slot.')];

  EPIGRAPH_SLOTS.forEach((slot) => {
    out.push(pb());
    out.push(new Paragraph({ heading: HeadingLevel.HEADING_2,
      children: [run(`Part ${slot.part} — ${slot.title}`, { color: ORANGE })] }));
    out.push(para(`Tone to aim for: ${slot.tone}`, { size: 18, color: MUTED, after: 240 }));

    for (let i = 1; i <= 3; i++) {
      out.push(editCard(`CANDIDATE ${i}`,
        [new Paragraph({ spacing: { after: 80 }, children: [run('[ TO WRITE ]  Quote text', { size: 22, italics: true, color: MUTED })] }),
         new Paragraph({ spacing: { after: 0 }, children: [run('[ TO WRITE ]  Attribution', { size: 18, color: MUTED })] })],
        BLUE));
      out.push(sp());
    }
  });

  return out;
}

// ─── Section 2: Dimensions ───────────────────────────────────────────────────
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

// ─── Section 3: Expectations ─────────────────────────────────────────────────
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

// ─── Section 4: Couple Types ─────────────────────────────────────────────────
function buildCoupleType(t) {
  const out = [pb()];

  out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run(t.name, { color: t.color?.replace('#','') || ORANGE })] }));
  out.push(para(`ID: ${t.id}    ·    Type A: ${t.typeA}    ·    Type B: ${t.typeB}`, { size: 18, color: MUTED, after: 80 }));
  out.push(para(`"${t.tagline}"`, { size: 24, italics: true, color: INK, after: 280 }));

  out.push(editCard('DESCRIPTION', t.description, t.color?.replace('#','') || ORANGE));
  out.push(sp());
  out.push(editCard('NUANCE / RISK', t.nuance, ORANGE));
  out.push(sp());

  if (Array.isArray(t.strengths) && t.strengths.length) {
    out.push(editCard('STRENGTHS',
      t.strengths.map(s => new Paragraph({ spacing: { after: 100 }, children: [run('•  ' + s, { size: 22 })] })),
      GREEN));
    out.push(sp());
  }

  if (Array.isArray(t.stickingPoints) && t.stickingPoints.length) {
    out.push(editCard('STICKING POINTS',
      t.stickingPoints.map(s => new Paragraph({ spacing: { after: 100 }, children: [run('•  ' + s, { size: 22 })] })),
      ORANGE));
    out.push(sp());
  }

  if (Array.isArray(t.patterns) && t.patterns.length) {
    out.push(editCard('PATTERNS',
      t.patterns.map(s => new Paragraph({ spacing: { after: 100 }, children: [run('•  ' + s, { size: 22 })] })),
      PURPLE));
    out.push(sp());
  }

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

// ─── Section 5: Six Moments Library ──────────────────────────────────────────
const MOMENTS = [
  { key: 'hard_workday',      title: 'After a hard workday' },
  { key: 'quiet_worry',       title: "When they're worried but haven't said it" },
  { key: 'during_conflict',   title: 'During a disagreement' },
  { key: 'after_conflict',    title: 'After a disagreement' },
  { key: 'wanting_closeness', title: 'When they want to feel close' },
  { key: 'external_stress',   title: 'When stress is coming from outside the relationship' },
];

const INDIVIDUAL_TYPES = [
  { letter: 'W', label: 'W — Open + Engages quickly', gist: 'expressive, seeks connection under stress, wants to talk things out' },
  { letter: 'X', label: 'X — Guarded + Engages quickly', gist: 'direct and resolution-oriented, but processes feelings internally' },
  { letter: 'Y', label: 'Y — Open + Needs space', gist: 'emotionally expressive but needs quiet to recover; warms up over time' },
  { letter: 'Z', label: 'Z — Guarded + Needs space', gist: 'reserved, withdraws to process; shares once settled' },
];

function buildMomentsLibrary() {
  const out = [...partCover(5, 'Six Moments Library',
    '24 scene cards. For each of 6 moments × 4 individual types. Each card should give the other partner situational guidance.')];

  out.push(pb());
  out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run('How the workbook uses this', { color: PURPLE })] }));
  out.push(para(
    'In Part 2, each partner gets a page titled "What [other partner] should know about [them]." The page lists all 6 moments, and for each moment, uses the content keyed to that partner\'s individual type (W, X, Y, or Z).',
    { size: 22, after: 140 }));
  out.push(para(
    'For a cross-type couple like Jordan (W) and Alex (X): Jordan\'s page uses all 6 W-moment cards. Alex\'s page uses all 6 X-moment cards. 24 cards total cover every combination.',
    { size: 22, after: 140 }));
  out.push(para(
    'Each moment card has 5 blocks: THE MOMENT (the concrete situation), WHAT\'S HAPPENING FOR [PARTNER] (their internal state), WHAT NOT TO DO, WHAT WORKS, and PHRASE THAT LANDS.',
    { size: 22, after: 0 }));

  MOMENTS.forEach((moment, mIdx) => {
    out.push(pb());
    out.push(new Paragraph({ heading: HeadingLevel.HEADING_1,
      children: [run(`Moment ${mIdx + 1} — ${moment.title}`, { color: PURPLE })] }));
    out.push(para(
      `One card per individual type below. The "subject" is the partner this moment describes; the "reader" is the other partner getting guidance.`,
      { size: 18, italics: true, color: MUTED, after: 240 }));

    INDIVIDUAL_TYPES.forEach(t => {
      out.push(pb());
      out.push(new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [run(`${moment.title}  ·  Subject type ${t.letter}`, { color: PURPLE })] }));
      out.push(para(t.label, { size: 20, bold: true, after: 60 }));
      out.push(para(t.gist, { size: 18, italics: true, color: MUTED, after: 240 }));

      out.push(emptyCard('THE MOMENT',
        `1 sentence: the concrete situation, e.g. "They come home after a tough day and go quiet." Keep it specific.`,
        MUTED));
      out.push(sp());
      out.push(emptyCard('WHAT\'S HAPPENING FOR [SUBJECT]',
        `2–3 sentences keyed to Type ${t.letter}: what's actually going on inside them in this moment. Grounded in how Type ${t.letter} is wired.`,
        PURPLE));
      out.push(sp());
      out.push(emptyCard('WHAT NOT TO DO',
        '1 sentence: the natural but wrong move the other partner tends to make.',
        'C8402A'));
      out.push(sp());
      out.push(emptyCard('WHAT WORKS',
        '1–2 sentences: the specific action the other partner should take instead.',
        GREEN));
      out.push(sp());
      out.push(emptyCard('PHRASE THAT LANDS',
        'A literal line the other partner can say — in quotation marks, short, specific.',
        BLUE));
    });
  });

  return out;
}

// ─── Section 6: Conversation Starters ────────────────────────────────────────
const SITUATIONS = [
  { key: 'quiet_night',    title: 'At dinner on a quiet night',             blurb: 'Low-stakes depth.' },
  { key: 'after_hard_week', title: 'After a hard week',                     blurb: 'Mutual care.' },
  { key: 'one_is_off',     title: "When one of you is off but won't say why", blurb: 'Gentle excavation.' },
  { key: 'before_hard',    title: 'Before a difficult conversation',        blurb: 'Setting it up.' },
  { key: 'tired_of_logistics', title: "When you're tired of talking about logistics", blurb: 'Romance restoration.' },
];

function buildStartersLibrary() {
  const out = [...partCover(6, 'Conversation Starters',
    'Per-situation prompt libraries, curated by couple type. Each couple sees 3 prompts per situation, matched to their dynamic.')];

  out.push(pb());
  out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run('How this works', { color: PURPLE })] }));
  out.push(para(
    'Each of the 5 situations gets a master prompt list below. When generating a workbook for a specific couple type, we select 3 prompts from that situation\'s master list tagged for their couple type.',
    { size: 22, after: 140 }));
  out.push(para(
    'Minimum viable library: 5 situations × ~5 prompts each = 25 prompts. Each prompt tagged with the couple types it fits best. A single prompt can serve multiple couple types if it\'s broadly useful.',
    { size: 22, after: 0 }));

  SITUATIONS.forEach((s, sIdx) => {
    out.push(pb());
    out.push(new Paragraph({ heading: HeadingLevel.HEADING_1,
      children: [run(`Situation ${sIdx + 1} — ${s.title}`, { color: PURPLE })] }));
    out.push(para(s.blurb, { size: 20, italics: true, color: MUTED, after: 240 }));

    for (let i = 1; i <= 5; i++) {
      out.push(editCard(`PROMPT ${i}`, [
        new Paragraph({ spacing: { after: 100 }, children: [run('[ TO WRITE ]  The prompt', { size: 22, italics: true, color: MUTED })] }),
        new Paragraph({ spacing: { before: 80, after: 0 }, children: [
          run('BEST FOR: ', { size: 14, bold: true, color: ORANGE, allCaps: true, tracking: 100 }),
          run('[ TO TAG ]  Couple types this works for — e.g. WX, WY, XX, or ALL', { size: 18, italics: true, color: MUTED }),
        ]}),
      ], BLUE));
      out.push(sp());
    }
  });

  return out;
}

// ─── Section 7: Dimension "When This Shows Up" ───────────────────────────────
function buildWhenThisShowsUpLibrary() {
  const out = [...partCover(7, 'Dimension "When This Shows Up"',
    'A short reference paragraph per dimension. Rendered at the bottom of each dimension page — tells the couple what to do the next time this friction shows up in real life.')];

  out.push(pb());
  out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run('How this works', { color: PURPLE })] }));
  out.push(para(
    'At the bottom of every dimension page in Part 1, a small "When this shows up" callout gives referenceable guidance. Unlike "Try this week" (an experiment) or the close/gap text (diagnosis), this text is what the couple consults during a real moment.',
    { size: 22, after: 140 }));
  out.push(para(
    'Each paragraph should be 2–3 sentences. Concrete, actionable, no hedging. Think: "The next time ___ happens, do ___." If you can name a specific scene, even better.',
    { size: 22, after: 0 }));

  DIMS.forEach(dim => {
    const meta = DIM_META[dim];
    out.push(pb());
    out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run(meta.label, { color: meta.color })] }));
    out.push(para(`Axis: ${meta.left} ← → ${meta.right}`, { size: 18, color: MUTED, after: 240 }));
    out.push(emptyCard('WHEN THIS SHOWS UP',
      `2–3 sentences: concrete, referenceable guidance for ${meta.label.toLowerCase()}. "The next time ___, do ___." No hedging.`,
      meta.color));
  });

  return out;
}

// ─── Main build ──────────────────────────────────────────────────────────────
const children = [
  ...buildCover(),
  ...buildEpigraphs(),
  ...partCover(2, 'Dimensions',
    'The 10 communication dimensions. Already drafted; this pass is for tone, clarity, and tightness.'),
  ...DIMS.flatMap(buildDimSection),
  ...partCover(3, 'Expectations',
    'The 7 life-expectations domains. Already drafted; same tone-and-clarity pass.'),
  ...EXP_DOMAINS.flatMap(buildExpSection),
  ...partCover(4, 'Couple Types',
    'The 10 couple type narratives. 4 same-type + 6 cross-type pairings. Already drafted.'),
  ...NEW_COUPLE_TYPES.flatMap(buildCoupleType),
  ...buildMomentsLibrary(),
  ...buildStartersLibrary(),
  ...buildWhenThisShowsUpLibrary(),
];

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
