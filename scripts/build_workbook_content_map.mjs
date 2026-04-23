// A simple reference doc: every section of the workbook, and where the
// content comes from. Grouped by source category so the reader can see
// at a glance what's universal, what's couple-specific, and what's
// calculated from their exercise responses.

import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType,
  Footer, PageNumber,
} from 'docx';

const ORANGE = 'E8673A', BLUE = '1B5FE8', PURPLE = '9B5DE5', GREEN = '10B981';
const INK = '0E0B07', MUTED = '8C7A68', STONE = 'E8DDD0';
const W = 9360;

const run = (t, o = {}) => new TextRun({ text: String(t ?? ''), font: 'Arial', ...o });
const sp = (n = 1) => Array.from({ length: n }, () => new Paragraph({ children: [new TextRun('')], spacing: { after: 80 } }));
const pb = () => new Paragraph({ children: [new TextRun({ break: 1 })], pageBreakBefore: true });
const noBrd = { style: BorderStyle.NONE };
const noBrds = { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd, insideHorizontal: noBrd, insideVertical: noBrd };

// ─── Source-type tokens ─────────────────────────────────────────────────
// Each row in the table gets one of these to answer "where does it come from?"
const SOURCE_COLORS = {
  'Exercise responses': ORANGE,     // calculated from their answers
  'Couple-type-specific': PURPLE,   // one of 10 versions
  'Universal': GREEN,               // same for every couple
  'Their names':  BLUE,             // filled in from user/partner names
  'Calculated':   '8B5CF6',         // derived from their scores (gaps, alignment, etc)
  'User-written': MUTED,            // they write it themselves (workbook pages)
};

// Section header with accent color rule
function sectionHeader(title, subtitle, color) {
  return [
    pb(),
    new Paragraph({ spacing: { before: 120, after: 80 },
      children: [run(title, { size: 36, bold: true, color })] }),
    new Paragraph({ spacing: { after: 200 },
      children: [run(subtitle, { size: 17, italics: true, color: MUTED })] }),
    new Paragraph({ spacing: { before: 0, after: 240 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color, space: 4 } },
      children: [new TextRun('')] }),
  ];
}

// The main three-column table: What's on the page | Source | Notes
function contentRow(what, source, notes) {
  const sourceColor = SOURCE_COLORS[source] || MUTED;
  return new TableRow({ children: [
    new TableCell({
      borders: noBrds, width: { size: 3400, type: WidthType.DXA },
      margins: { top: 140, bottom: 140, left: 0, right: 200 },
      verticalAlign: 'top',
      children: [new Paragraph({ spacing: { after: 0, line: 280, lineRule: 'atLeast' },
        children: [run(what, { size: 18, color: INK })] })],
    }),
    new TableCell({
      borders: noBrds, width: { size: 2000, type: WidthType.DXA },
      margins: { top: 140, bottom: 140, left: 0, right: 200 },
      verticalAlign: 'top',
      children: [new Paragraph({ spacing: { after: 0 },
        children: [
          new TextRun({ text: '●  ', font: 'Arial', size: 20, color: sourceColor }),
          run(source, { size: 16, bold: true, color: sourceColor }),
        ] })],
    }),
    new TableCell({
      borders: noBrds, width: { size: W - 3400 - 2000, type: WidthType.DXA },
      margins: { top: 140, bottom: 140, left: 0, right: 0 },
      verticalAlign: 'top',
      children: [new Paragraph({ spacing: { after: 0, line: 280, lineRule: 'atLeast' },
        children: [run(notes, { size: 15, italics: true, color: MUTED })] })],
    }),
  ]});
}

function sectionTable(rows) {
  // Header row
  const headerRow = new TableRow({ children: [
    new TableCell({
      borders: { top: noBrd, bottom: { style: BorderStyle.SINGLE, size: 8, color: INK },
                 left: noBrd, right: noBrd },
      width: { size: 3400, type: WidthType.DXA },
      margins: { top: 80, bottom: 100, left: 0, right: 200 },
      children: [new Paragraph({ spacing: { after: 0 },
        children: [run("What's on the page", { size: 12, bold: true, color: INK, allCaps: true, characterSpacing: 60 })] })],
    }),
    new TableCell({
      borders: { top: noBrd, bottom: { style: BorderStyle.SINGLE, size: 8, color: INK },
                 left: noBrd, right: noBrd },
      width: { size: 2000, type: WidthType.DXA },
      margins: { top: 80, bottom: 100, left: 0, right: 200 },
      children: [new Paragraph({ spacing: { after: 0 },
        children: [run('Where it comes from', { size: 12, bold: true, color: INK, allCaps: true, characterSpacing: 60 })] })],
    }),
    new TableCell({
      borders: { top: noBrd, bottom: { style: BorderStyle.SINGLE, size: 8, color: INK },
                 left: noBrd, right: noBrd },
      width: { size: W - 3400 - 2000, type: WidthType.DXA },
      margins: { top: 80, bottom: 100, left: 0, right: 0 },
      children: [new Paragraph({ spacing: { after: 0 },
        children: [run('Notes', { size: 12, bold: true, color: INK, allCaps: true, characterSpacing: 60 })] })],
    }),
  ]});

  // Data rows with thin stone separators between
  const dataRows = rows.flatMap((r, i) => {
    const row = contentRow(r.what, r.source, r.notes);
    return [row];
  });

  return new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: [3400, 2000, W - 3400 - 2000],
    borders: {
      top: noBrd, bottom: noBrd, left: noBrd, right: noBrd,
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: STONE },
      insideVertical: noBrd,
    },
    rows: [headerRow, ...dataRows],
  });
}

// ─── CONTENT ──────────────────────────────────────────────────────────────

// Cover + legend
const coverPage = [
  ...sp(3),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [run('ATTUNE', { size: 22, bold: true, color: ORANGE, allCaps: true, characterSpacing: 120 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [run('Workbook content map', { size: 44, bold: true, color: INK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
    children: [run("Every section of the workbook and where its content comes from.",
      { size: 18, italics: true, color: MUTED })] }),

  // Legend of source types
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 200 },
    children: [run('Source categories', { size: 13, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }),

  // Legend table — each row: dot + name + one-line description
  new Table({
    width: { size: 7200, type: WidthType.DXA },
    alignment: AlignmentType.CENTER,
    columnWidths: [2200, 5000],
    borders: {
      top: noBrd, bottom: noBrd, left: noBrd, right: noBrd,
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: STONE },
      insideVertical: noBrd,
    },
    rows: [
      ['Exercise responses', ORANGE,   "Their specific answers from the communication + expectations exercises. Changes per couple."],
      ['Couple-type-specific', PURPLE, 'One of 10 versions, depending on which couple type they were assigned.'],
      ['Universal',            GREEN,  'Same for every couple. Written once, appears in every workbook.'],
      ['Their names',          BLUE,   'Filled in wherever the copy says {U} or {P}, e.g. "Jordan and Alex."'],
      ['Calculated',           '8B5CF6', 'Derived from their scores: gap sizes, gap labels, which dimensions to show, etc.'],
      ['User-written',         MUTED,  'Blank writing space for them to fill in themselves (notebook-paper ruled lines).'],
    ].map(([label, color, desc]) => new TableRow({ children: [
      new TableCell({
        borders: noBrds, width: { size: 2200, type: WidthType.DXA },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [new Paragraph({ spacing: { after: 0 },
          children: [
            new TextRun({ text: '●  ', font: 'Arial', size: 20, color }),
            run(label, { size: 15, bold: true, color }),
          ] })],
      }),
      new TableCell({
        borders: noBrds, width: { size: 5000, type: WidthType.DXA },
        margins: { top: 100, bottom: 100, left: 0, right: 120 },
        children: [new Paragraph({ spacing: { after: 0, line: 280, lineRule: 'atLeast' },
          children: [run(desc, { size: 14, italics: true, color: MUTED })] })],
      }),
    ]})),
  }),
];

// ── Section: Intro pages ─────────────────────────────────────────────────
const introSection = [
  ...sectionHeader('Introduction pages', 'Cover, TOC, Intro, Snapshot — the opening of the workbook.', ORANGE),
  sectionTable([
    { what: 'Cover page',
      source: 'Their names',
      notes: 'Names sit below "A workbook for". Couple type name appears as subhead (one of 10).' },
    { what: 'Table of contents',
      source: 'Calculated',
      notes: 'Page numbers calculated from how many dimensions and expectations had gaps.' },
    { what: 'Introduction text',
      source: 'Universal',
      notes: 'Same for every couple. Frames the workbook and how to read it together.' },
    { what: 'Your Snapshot — dimension scores table',
      source: 'Exercise responses',
      notes: 'Each partner\'s score on all 12 communication dimensions, pulled from their exercise.' },
    { what: 'Your Snapshot — expectations alignment table',
      source: 'Exercise responses',
      notes: 'Each partner\'s answer on the 7 expectation domains, with aligned/gap flag.' },
    { what: 'Your Snapshot — couple type line',
      source: 'Couple-type-specific',
      notes: 'Shows the type name and tagline for one of the 10 types.' },
  ]),
];

// ── Section: Part 1 — Closer look at dimensions ──────────────────────────
const part1Section = [
  ...sectionHeader('Part 1 · A closer look at the dimensions that matter',
    "The bulk of the book. One page per dimension where they had a gap, plus expectations.", BLUE),
  sectionTable([
    { what: 'Part 1 cover page',
      source: 'Universal',
      notes: 'Opening quote/epigraph, same for every couple.' },
    { what: 'Part 1 intro page ("Practical help…")',
      source: 'Couple-type-specific',
      notes: 'Includes their couple type tagline. Count of dimensions changes per couple.' },
    { what: 'Dimension page — title + axis labels',
      source: 'Universal',
      notes: 'e.g., "Energy & Recharge" and "Inward / Outward" labels come from the dimension metadata.' },
    { what: 'Dimension page — score bars',
      source: 'Exercise responses',
      notes: "Each partner's actual 1-5 score on this dimension." },
    { what: 'Dimension page — gap analysis (grey italic text)',
      source: 'Couple-type-specific',
      notes: 'One of two versions per dimension: "gap" text (when scores differ >1.5) or "close" text (when <1.5). Not yet further customized by couple type — same gap text for everyone with a gap on this dimension.' },
    { what: 'Dimension page — gap label ("Worth exploring," "Significant," etc)',
      source: 'Calculated',
      notes: 'Computed from the numeric gap size between the two scores.' },
    { what: 'Dimension page — reflection prompts',
      source: 'Universal',
      notes: 'Same 3 prompts per dimension for every couple with a gap there.' },
    { what: 'Dimension page — "Try this week"',
      source: 'Universal',
      notes: 'One suggestion per dimension, same for every couple.' },
    { what: 'Dimension page — commitment write-in',
      source: 'User-written',
      notes: 'Blank ruled lines for them to write a specific change they want to try.' },
    { what: 'Expectations — section header + framing',
      source: 'Their names',
      notes: '"Where {U} and {P} have different ideas about the life you\'re building."' },
    { what: 'Expectations — domain responses (two columns)',
      source: 'Exercise responses',
      notes: "Each partner's specific answer on this domain (e.g., \"split equally\" vs \"I handle more\")." },
    { what: 'Expectations — gap analysis',
      source: 'Universal',
      notes: 'One version per expectation domain, same for every couple with a gap there.' },
    { what: 'Expectations — "Try this week"',
      source: 'Universal',
      notes: 'One suggestion per domain, same for every couple.' },
  ]),
];

// ── Section: Part 2 — Working Knowledge ──────────────────────────────────
const part2Section = [
  ...sectionHeader('Part 2 · Working Knowledge',
    'Six recurring moments, with guidance keyed to each partner\'s individual type (W/X/Y/Z).', PURPLE),
  sectionTable([
    { what: 'Part 2 cover page',
      source: 'Universal',
      notes: 'Opening epigraph, same for every couple.' },
    { what: '"What {Partner} should know about {You}" page header',
      source: 'Their names',
      notes: 'Couples with different types get two pages (one per partner). Same-type couples get one combined page.' },
    { what: 'The 6 moments (titles: "After a hard workday," "During a disagreement," etc)',
      source: 'Universal',
      notes: 'Same 6 moments in every workbook. Titles and order never change.' },
    { what: 'Each moment — "What\'s happening for them"',
      source: 'Couple-type-specific',
      notes: "Four versions written (W, X, Y, Z). The subject partner's individual letter determines which version they see." },
    { what: 'Each moment — "What NOT to do"',
      source: 'Couple-type-specific',
      notes: 'Four versions (W, X, Y, Z), keyed to the subject partner\'s type.' },
    { what: 'Each moment — "What works"',
      source: 'Couple-type-specific',
      notes: 'Four versions (W, X, Y, Z), keyed to the subject partner\'s type.' },
    { what: 'Each moment — "Phrase that lands"',
      source: 'Couple-type-specific',
      notes: 'A literal line the other partner can say. Four versions (W, X, Y, Z).' },
  ]),
];

// ── Section: Part 3 — Workbook ───────────────────────────────────────────
const part3Section = [
  ...sectionHeader('Part 3 · Workbook',
    'Guided journaling pages where they write their own focus areas.', ORANGE),
  sectionTable([
    { what: 'Part 3 cover page',
      source: 'Universal',
      notes: 'Opening epigraph, same for every couple.' },
    { what: '"Preparing together" — 3 prompts',
      source: 'Universal',
      notes: 'Same 3 prompts every couple sees.' },
    { what: '"Preparing together" — answer space',
      source: 'User-written',
      notes: 'Blank ruled lines after each prompt.' },
    { what: 'Focus area pages (3 pages, one each)',
      source: 'User-written',
      notes: 'Entirely blank. They choose what to focus on, write why it matters, what each of them will do, timeline.' },
    { what: 'Focus area page headers + labels',
      source: 'Universal',
      notes: '"What we\'re focusing on," "Why this matters to us," "What {U} will do," etc. Structure is identical for every couple; names are filled in.' },
    { what: '30-day check-in page',
      source: 'Universal',
      notes: '3 prompts, same for every couple. Ruled write-in space for their answers.' },
  ]),
];

// ── Section: Part 4 — Conversation Library ───────────────────────────────
const part4Section = [
  ...sectionHeader('Part 4 · Conversation Library',
    'Conversation starters for five common situations.', PURPLE),
  sectionTable([
    { what: 'Part 4 cover page',
      source: 'Universal',
      notes: 'Opening epigraph, same for every couple.' },
    { what: 'The 5 situations (titles: "At dinner on a quiet night," "After a hard week," etc)',
      source: 'Universal',
      notes: 'Same 5 situations in every workbook.' },
    { what: 'Prompts shown per situation',
      source: 'Couple-type-specific',
      notes: 'Master list of 25 prompts total (5 per situation), each tagged with which couple types it fits best. Each workbook shows the 3 best-fit prompts per situation based on the couple\'s type.' },
    { what: '"A structured first conversation" — the framework',
      source: 'Universal',
      notes: 'A longer guided conversation structure, same for every couple.' },
  ]),
];

// ── Section: Part 5 — Reference Card ─────────────────────────────────────
const part5Section = [
  ...sectionHeader('Part 5 · Reference Card',
    'A small card they can print and keep somewhere visible.', GREEN),
  sectionTable([
    { what: 'Card layout + design',
      source: 'Universal',
      notes: 'Same navy card with 3 side-by-side tiles in every workbook.' },
    { what: 'Left tile — names + couple type',
      source: 'Their names',
      notes: 'Their names big, couple type name below, tagline underneath.' },
    { what: 'Center tile — "Phrase that lands"',
      source: 'Couple-type-specific',
      notes: 'Pulls the first tip\'s phrase for this specific couple type (one of 10).' },
    { what: 'Right tile — "Goal for this week" lines',
      source: 'User-written',
      notes: 'Blank notebook-paper lines for them to write their own goal.' },
  ]),
];

// ─── Summary at the end ──────────────────────────────────────────────────
const summaryPage = [
  pb(),
  new Paragraph({ spacing: { before: 120, after: 80 },
    children: [run('At a glance', { size: 36, bold: true, color: INK })] }),
  new Paragraph({ spacing: { after: 240 },
    children: [run("How much of the workbook is unique per couple.",
      { size: 17, italics: true, color: MUTED })] }),
  new Paragraph({ spacing: { before: 0, after: 320 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: INK, space: 4 } },
    children: [new TextRun('')] }),

  // Simple bulleted summary
  new Paragraph({ spacing: { after: 120 },
    children: [run('How much of each workbook is unique per couple', { size: 18, bold: true, color: INK })] }),
  ...[
    { color: ORANGE, label: 'Exercise responses', desc: 'Highly specific to each couple. Drives the snapshot, all dimension scores, all expectation responses, and which dimensions get their own pages.' },
    { color: PURPLE, label: 'Couple-type-specific', desc: 'One of 10 versions per block. Drives the type name everywhere it appears, the 24 Working Knowledge scenes, the gap analysis text on dimension pages, the conversation prompts chosen, and the Reference Card phrase.' },
    { color: '8B5CF6', label: 'Calculated', desc: 'Gap labels (worth exploring, significant, etc), page numbers in TOC, which dimensions and expectations to show per couple.' },
    { color: BLUE,   label: 'Their names', desc: 'Substituted throughout — cover, section headers, prompts, and the Reference Card.' },
    { color: GREEN,  label: 'Universal', desc: "Everything else. Same across every workbook: intros, epigraphs, moment titles, situation titles, reflection prompts, and the 30-day check-in." },
    { color: MUTED,  label: 'User-written', desc: 'Blank ruled lines they fill in themselves: the commitment space on each dimension page, the 3 focus area pages, the 30-day check-in answers, and the Reference Card goal tile.' },
  ].map(({ color, label, desc }) => new Paragraph({
    spacing: { after: 160, line: 300, lineRule: 'atLeast' },
    indent: { left: 400, hanging: 400 },
    children: [
      new TextRun({ text: '●  ', font: 'Arial', size: 22, color }),
      run(label, { size: 17, bold: true, color }),
      run('  —  ', { size: 16, color: STONE }),
      run(desc, { size: 15, color: INK }),
    ],
  })),
];

// ─── Assemble ────────────────────────────────────────────────────────────

const doc = new Document({
  styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
  sections: [{
    properties: { page: { margin: { top: 960, right: 960, bottom: 960, left: 960 } } },
    footers: {
      default: new Footer({
        children: [new Paragraph({ alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: STONE, space: 8 } },
          spacing: { before: 120, after: 0 },
          children: [
            run('Attune · Workbook content map   ·   ', { size: 13, color: MUTED }),
            new TextRun({ children: [PageNumber.CURRENT], size: 13, color: INK, font: 'Arial' }),
            run(' / ', { size: 13, color: MUTED }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 13, color: MUTED, font: 'Arial' }),
          ] })],
      }),
    },
    children: [
      ...coverPage,
      ...introSection,
      ...part1Section,
      ...part2Section,
      ...part3Section,
      ...part4Section,
      ...part5Section,
      ...summaryPage,
    ],
  }],
});

const buf = await Packer.toBuffer(doc);
const outPath = '/tmp/workbook_content_map.docx';
writeFileSync(outPath, buf);
execSync('libreoffice --headless --convert-to pdf --outdir /tmp ' + outPath, { stdio: 'pipe' });
console.log(`✓ Workbook content map: ${outPath} (${buf.length} bytes)`);
