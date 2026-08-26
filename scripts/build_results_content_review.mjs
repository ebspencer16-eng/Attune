// Results content review — the authoritative map of the post-unlock results
// experience (UnifiedResults), section by section. Same landscape format as the
// workbook content review.
//
// Columns: What's on the page · Description · Where it comes from · Content.
// Universal content sits inline. Results-unique content points to the results
// specific content review (see RS X.Y). Shared type-specific content points to
// the workbook specific content review (see WS X.Y).

import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, Footer, PageNumber, PageOrientation,
} from 'docx';

const ORANGE = 'E8673A', BLUE = '1B5FE8', PURPLE = '9B5DE5', GREEN = '10B981';
const INK = '0E0B07', MUTED = '8C7A68', STONE = 'E8DDD0';
const W = 14400;

const run = (t, o = {}) => new TextRun({ text: String(t ?? ''), font: 'Arial', ...o });
const sp = (n = 1) => Array.from({ length: n }, () => new Paragraph({ children: [new TextRun('')], spacing: { after: 80 } }));
const pb = () => new Paragraph({ children: [new TextRun({ break: 1 })], pageBreakBefore: true });
const noBrd = { style: BorderStyle.NONE };
const noBrds = { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd, insideHorizontal: noBrd, insideVertical: noBrd };

const SOURCE_COLORS = {
  'Exercise responses': ORANGE, 'Couple-type-specific': PURPLE, 'Universal': GREEN,
  'Their names': BLUE, 'Calculated': '8B5CF6', 'User-written': MUTED,
};

const COL_WHAT = 2800, COL_DESC = 3200, COL_SRC = 1900;
const COL_CONTENT = W - COL_WHAT - COL_DESC - COL_SRC;

function sectionHeader(title, subtitle, color) {
  return [
    pb(),
    new Paragraph({ spacing: { before: 120, after: 80 }, children: [run(title, { size: 32, bold: true, color })] }),
    new Paragraph({ spacing: { after: 200 }, children: [run(subtitle, { size: 15, italics: true, color: MUTED })] }),
    new Paragraph({ spacing: { before: 0, after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color, space: 4 } }, children: [new TextRun('')] }),
  ];
}
function tableHeader() {
  const mk = (label, width) => new TableCell({
    borders: { top: noBrd, bottom: { style: BorderStyle.SINGLE, size: 8, color: INK }, left: noBrd, right: noBrd },
    width: { size: width, type: WidthType.DXA }, margins: { top: 80, bottom: 100, left: 0, right: 160 },
    children: [new Paragraph({ spacing: { after: 0 }, children: [run(label, { size: 11, bold: true, color: INK, allCaps: true, characterSpacing: 60 })] })],
  });
  return new TableRow({ children: [mk("What's on the page", COL_WHAT), mk('Description', COL_DESC), mk('Where it comes from', COL_SRC), mk('Content', COL_CONTENT)] });
}
function contentRow(what, description, source, content) {
  const sourceColor = SOURCE_COLORS[source] || MUTED;
  const textCell = (text, width, rightPad, opts = {}) => new TableCell({
    borders: noBrds, width: { size: width, type: WidthType.DXA }, margins: { top: 140, bottom: 140, left: 0, right: rightPad ?? 160 }, verticalAlign: 'top',
    children: [new Paragraph({ spacing: { after: 0, line: 280, lineRule: 'atLeast' }, children: [run(text, { size: opts.size ?? 14, color: opts.color ?? INK, italics: opts.italics, bold: opts.bold })] })],
  });
  const sourceCell = new TableCell({
    borders: noBrds, width: { size: COL_SRC, type: WidthType.DXA }, margins: { top: 140, bottom: 140, left: 0, right: 160 }, verticalAlign: 'top',
    children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: '●  ', font: 'Arial', size: 18, color: sourceColor }), run(source, { size: 12, bold: true, color: sourceColor })] })],
  });
  const isReference = /^varies,|^see /i.test(content);
  const contentCell = textCell(content, COL_CONTENT, 0, { size: 12, italics: isReference, color: isReference ? PURPLE : INK });
  return new TableRow({ children: [textCell(what, COL_WHAT, 160), textCell(description, COL_DESC, 160, { italics: true, color: MUTED, size: 12 }), sourceCell, contentCell] });
}
function sectionTable(rows) {
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [COL_WHAT, COL_DESC, COL_SRC, COL_CONTENT],
    borders: { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd, insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: STONE }, insideVertical: noBrd },
    rows: [tableHeader(), ...rows.map(r => contentRow(r.what, r.desc, r.source, r.content))],
  });
}

// ── Cover + legend ───────────────────────────────────────────────────────────
const coverPage = [
  ...sp(3),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [run('ATTUNE', { size: 22, bold: true, color: ORANGE, allCaps: true, characterSpacing: 120 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [run('Results content review', { size: 44, bold: true, color: INK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 320 }, children: [run('Every section of the post-unlock results experience. What\u2019s on each page, where the content comes from, and the content itself.', { size: 17, italics: true, color: MUTED })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 160 }, children: [run('Source categories', { size: 13, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }),
  new Table({
    width: { size: 9000, type: WidthType.DXA }, alignment: AlignmentType.CENTER, columnWidths: [2400, 6600],
    borders: { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd, insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: STONE }, insideVertical: noBrd },
    rows: [
      ['Exercise responses', ORANGE, 'Their specific answers from the communication + expectations exercises. Changes per couple.'],
      ['Couple-type-specific', PURPLE, 'One of 10 versions, depending on which couple type they were assigned.'],
      ['Universal', GREEN, 'Same for every couple. Written once, shows for everyone.'],
      ['Their names', BLUE, 'Filled in wherever the copy says [Partner A] or [Partner B].'],
      ['Calculated', '8B5CF6', 'Derived from their scores: gap sizes, gap labels, which sections to show.'],
      ['User-written', MUTED, 'Their own answers, shown back to them (free-text and picks).'],
    ].map(([label, color, desc]) => new TableRow({ children: [
      new TableCell({ borders: noBrds, width: { size: 2400, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 120, right: 120 }, children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: '●  ', font: 'Arial', size: 20, color }), run(label, { size: 15, bold: true, color })] })] }),
      new TableCell({ borders: noBrds, width: { size: 6600, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 0, right: 120 }, children: [new Paragraph({ spacing: { after: 0, line: 280, lineRule: 'atLeast' }, children: [run(desc, { size: 13, italics: true, color: MUTED })] })] }),
    ] })),
  }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 320, after: 120 }, children: [run('The Content column', { size: 13, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [run('Universal content sits inline. "See RS X.Y" points to the results specific content review. "See WS X.Y" points to the workbook specific content review, where shared type-specific content lives.', { size: 14, italics: true, color: MUTED })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [run('Scope: the post-unlock results experience (UnifiedResults). The pre-unlock reveal screens are not covered here.', { size: 13, italics: true, color: MUTED })] }),
];

// ── The flow ───────────────────────────────────────────────────────────────
const U = 'Universal', CT = 'Couple-type-specific', EX = 'Exercise responses', CA = 'Calculated', NM = 'Their names', UW = 'User-written';

const entry = [
  ...sectionHeader('Entry · Highlights', 'The swipe-through shown first on entry, before the full results.', ORANGE),
  sectionTable([
    { what: 'Highlight cards', desc: 'Swipeable cards drawn from both exercises (and Intimacy when owned). Each downloadable.', source: CA, content: 'see RS 1.1 (generated per couple)' },
    { what: 'Click-through CTA', desc: 'Moves from highlights into the full results.', source: U, content: '"View Full Results"' },
  ]),
];

const summary = [
  ...sectionHeader('Full Summary', 'First section after the highlights click-through. Three cards, each linking into its section.', PURPLE),
  sectionTable([
    { what: 'Communication card', desc: 'Short read on the communication results.', source: CA, content: 'see RS 2.1 (generated)' },
    { what: 'Expectations card', desc: 'Short read on the expectations results.', source: CA, content: 'see RS 2.1 (generated)' },
    { what: 'Reflection card', desc: 'Shown only for Anniversary or Premium.', source: CA, content: 'see RS 2.1 (generated)' },
    { what: 'Section CTAs', desc: 'Each card links into its section.', source: U, content: '"View [section] →"' },
  ]),
];

const coupleType = [
  ...sectionHeader('Couple Type', 'The pairing page. Hero, what it looks like, naturals, watch-fors, next steps, workbook CTA.', GREEN),
  sectionTable([
    { what: 'Type name + tagline', desc: 'The assigned pairing, one of 10.', source: CT, content: 'see WS 1.x' },
    { what: 'Hero banner', desc: 'Name, tagline, type color.', source: CT, content: 'see WS 1.x' },
    { what: 'What this looks like', desc: 'The core dynamic of the pairing.', source: CT, content: 'see WS (type description)' },
    { what: 'What comes naturally', desc: 'Two strengths of the pairing.', source: CT, content: 'see WS (type strengths)' },
    { what: 'Worth watching for', desc: 'Two watch-fors of the pairing.', source: CT, content: 'see WS (type watch-fors)' },
    { what: 'Actionable next steps', desc: 'Three tips, each with a phrase to try.', source: CT, content: 'see WS (type tips + phrases)' },
    { what: 'Workbook CTA', desc: 'Prompt to get the workbook.', source: U, content: 'Universal CTA copy' },
  ]),
];

const coupleMap = [
  ...sectionHeader('Your Couple Map', 'The 2×2 grid with both partners plotted, axis descriptions, and per-partner profiles.', BLUE),
  sectionTable([
    { what: 'Map grid', desc: 'Both partners plotted on the engage/withdraw × open/guarded grid.', source: CA, content: 'Plotted from each partner\u2019s coordinates' },
    { what: 'Engage / Withdraw axis', desc: 'Axis question + label for each end.', source: U, content: 'see RS 3.1' },
    { what: 'Open / Guarded axis', desc: 'Axis question + label for each end.', source: U, content: 'see RS 3.2' },
    { what: 'Placement callout', desc: 'Speaks to where each partner sits.', source: CA, content: 'see RS 3.3 (generated)' },
    { what: 'Individual profiles', desc: 'One per partner. Varies by type and placement.', source: CA, content: 'see RS 4.x' },
    { what: 'How you see each other', desc: 'Self-vs-partner-view comparison across five dimensions, with a largest-gap callout. Shown once the couple has answered the partner-view questions.', source: CA, content: 'see RS 3.5' },
  ]),
];

const comms = [
  ...sectionHeader('Communication', 'Expandable section: overview, 10 dimension pages, individual profiles, action plan.', '1B5FE8'),
  sectionTable([
    { what: 'Overview', desc: '10 dimensions, side-by-side bars for both partners.', source: CA, content: 'Bars from scores. Dimension labels universal.' },
    { what: 'Dimension page (×10)', desc: 'Per-dimension: bars, gap callout, type blurb.', source: CT, content: 'Gap blurbs see WS 2.x.G; type blurbs see WS 2.x' },
    { what: 'Individual profiles', desc: 'Per-partner placement blurb.', source: CA, content: 'see RS 4.x' },
    { what: 'Action plan', desc: 'One protocol per flagged dimension.', source: CA, content: 'see RS 5.x (body pulls dimension advice)' },
  ]),
];

const expectations = [
  ...sectionHeader('Expectations', 'Expandable section: overview, common ground, conversations, the life you\u2019re building, action plan.', 'F59E0B'),
  sectionTable([
    { what: 'Overview', desc: 'Alignment read across mapped expectations.', source: CA, content: 'see RS 6.1-6.3' },
    { what: 'Common Ground', desc: 'Where the two agree.', source: EX, content: 'Their matching answers. Framing see RS 6.1' },
    { what: 'Conversations Worth Having', desc: 'Where the two differ, with starters.', source: EX, content: 'Their differing answers + starters (expectations content)' },
    { what: 'The Life You\u2019re Building', desc: 'The bigger-picture life questions.', source: EX, content: 'Their life-question answers' },
    { what: 'Action plan', desc: 'Top misalignments with couple-type context.', source: CA, content: 'see RS 6.4; couple-type context generated' },
  ]),
];

const reflection = [
  ...sectionHeader('Relationship Reflection', 'Shown for Anniversary and Premium: overview, insights, side by side, action plan.', '9B5DE5'),
  sectionTable([
    { what: 'Overview', desc: 'Feel score, appreciation reveal, strength/explore counts.', source: CA, content: 'see RS 7.1' },
    { what: 'Insights', desc: 'The prompt cards.', source: CA, content: 'see Reflection results review, Sections 2 + 3' },
    { what: 'Side by Side', desc: 'Both answers with synthesis tags.', source: UW, content: 'Their answers + resonance/complement/worth-discussing tags' },
    { what: 'Action plan', desc: 'The explore items.', source: CA, content: 'see Reflection results review, Section 3' },
  ]),
];

const whatNext = [
  ...sectionHeader('What Comes Next', 'The closing section. Pulls the action plans together and points to next steps.', '0E0B07'),
  sectionTable([
    { what: 'Heading + subhead', desc: 'Closing framing.', source: U, content: '"What comes next." / "What to do with all of this."' },
    { what: 'Your action plans', desc: 'The action plans gathered in one place.', source: CA, content: 'see RS 5.x, 6.2 (generated)' },
    { what: 'Next-step links', desc: 'Share and download the workbook.', source: U, content: 'Shown by what the couple owns. see RS 8.3' },
    { what: 'Upgrade prompt', desc: 'Shown where applicable.', source: CA, content: 'Universal upsell copy, shown by ownership' },
  ]),
];

const doc = new Document({
  styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
  sections: [{
    properties: { page: { size: { orientation: PageOrientation.LANDSCAPE, width: 15840, height: 12240 }, margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: STONE, space: 8 } }, spacing: { before: 120, after: 0 },
      children: [
        run('Attune · Results content review   ·   ', { size: 13, color: MUTED }),
        new TextRun({ children: [PageNumber.CURRENT], size: 13, color: INK, font: 'Arial' }),
        run(' / ', { size: 13, color: MUTED }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 13, color: MUTED, font: 'Arial' }),
      ] })] }) },
    children: [...coverPage, ...entry, ...summary, ...coupleType, ...coupleMap, ...comms, ...expectations, ...reflection, ...whatNext],
  }],
});

const buf = await Packer.toBuffer(doc);
const outPath = '/mnt/user-data/outputs/attune_results_content_review.docx';
writeFileSync(outPath, buf);
try {
  execSync('libreoffice --headless --convert-to pdf --outdir /mnt/user-data/outputs ' + outPath, { stdio: 'pipe' });
  console.log(`✓ ${outPath} (${buf.length} bytes) + PDF`);
} catch { console.log(`✓ ${outPath} (${buf.length} bytes) [PDF skipped]`); }
