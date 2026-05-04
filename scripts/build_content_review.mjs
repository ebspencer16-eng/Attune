// Workbook content review — the authoritative map of what's in the workbook.
//
// Columns:
//   1. What's on the page
//   2. Description
//   3. Where it comes from (source category)
//   4. Content — inline text for universal items, or "varies, see X.Y"
//      for items that appear in the specific content review doc.
//
// Landscape to give the Content column room to breathe.

import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType,
  Footer, PageNumber, PageOrientation,
} from 'docx';

const ORANGE = 'E8673A', BLUE = '1B5FE8', PURPLE = '9B5DE5', GREEN = '10B981';
const INK = '0E0B07', MUTED = '8C7A68', STONE = 'E8DDD0';

// Landscape US Letter: 11 × 8.5 in. Usable after 720-twip side margins: 14400.
const W = 14400;

const run = (t, o = {}) => new TextRun({ text: String(t ?? ''), font: 'Arial', ...o });
const sp = (n = 1) => Array.from({ length: n }, () => new Paragraph({ children: [new TextRun('')], spacing: { after: 80 } }));
const pb = () => new Paragraph({ children: [new TextRun({ break: 1 })], pageBreakBefore: true });
const noBrd = { style: BorderStyle.NONE };
const noBrds = { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd, insideHorizontal: noBrd, insideVertical: noBrd };

const SOURCE_COLORS = {
  'Exercise responses':   ORANGE,
  'Couple-type-specific': PURPLE,
  'Universal':            GREEN,
  'Their names':          BLUE,
  'Calculated':           '8B5CF6',
  'User-written':         MUTED,
};

const COL_WHAT = 2800;
const COL_DESC = 3200;
const COL_SRC  = 1900;
const COL_CONTENT = W - COL_WHAT - COL_DESC - COL_SRC;

function sectionHeader(title, subtitle, color) {
  return [
    pb(),
    new Paragraph({ spacing: { before: 120, after: 80 },
      children: [run(title, { size: 32, bold: true, color })] }),
    new Paragraph({ spacing: { after: 200 },
      children: [run(subtitle, { size: 15, italics: true, color: MUTED })] }),
    new Paragraph({ spacing: { before: 0, after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color, space: 4 } },
      children: [new TextRun('')] }),
  ];
}

function tableHeader() {
  const mk = (label, width) => new TableCell({
    borders: { top: noBrd, bottom: { style: BorderStyle.SINGLE, size: 8, color: INK },
               left: noBrd, right: noBrd },
    width: { size: width, type: WidthType.DXA },
    margins: { top: 80, bottom: 100, left: 0, right: 160 },
    children: [new Paragraph({ spacing: { after: 0 },
      children: [run(label, { size: 11, bold: true, color: INK, allCaps: true, characterSpacing: 60 })] })],
  });
  return new TableRow({ children: [
    mk("What's on the page", COL_WHAT),
    mk('Description',         COL_DESC),
    mk('Where it comes from', COL_SRC),
    mk('Content',             COL_CONTENT),
  ]});
}

function contentRow(what, description, source, content) {
  const sourceColor = SOURCE_COLORS[source] || MUTED;
  const textCell = (text, width, rightPad, opts = {}) => new TableCell({
    borders: noBrds, width: { size: width, type: WidthType.DXA },
    margins: { top: 140, bottom: 140, left: 0, right: rightPad ?? 160 },
    verticalAlign: 'top',
    children: [new Paragraph({ spacing: { after: 0, line: 280, lineRule: 'atLeast' },
      children: [run(text, {
        size: opts.size ?? 14,
        color: opts.color ?? INK,
        italics: opts.italics,
        bold: opts.bold,
      })] })],
  });

  const sourceCell = new TableCell({
    borders: noBrds, width: { size: COL_SRC, type: WidthType.DXA },
    margins: { top: 140, bottom: 140, left: 0, right: 160 },
    verticalAlign: 'top',
    children: [new Paragraph({ spacing: { after: 0 },
      children: [
        new TextRun({ text: '●  ', font: 'Arial', size: 18, color: sourceColor }),
        run(source, { size: 12, bold: true, color: sourceColor }),
      ] })],
  });

  // Reference pointer (varies, see X.Y) gets italic purple treatment
  const isReference = /^varies,|^see /i.test(content);
  const contentCell = textCell(content, COL_CONTENT, 0, {
    size: 12,
    italics: isReference,
    color: isReference ? PURPLE : INK,
  });

  return new TableRow({ children: [
    textCell(what, COL_WHAT, 160),
    textCell(description, COL_DESC, 160, { italics: true, color: MUTED, size: 12 }),
    sourceCell,
    contentCell,
  ]});
}

function sectionTable(rows) {
  return new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: [COL_WHAT, COL_DESC, COL_SRC, COL_CONTENT],
    borders: {
      top: noBrd, bottom: noBrd, left: noBrd, right: noBrd,
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: STONE },
      insideVertical: noBrd,
    },
    rows: [tableHeader(), ...rows.map(r => contentRow(r.what, r.desc, r.source, r.content))],
  });
}

// ── Cover + legend ───────────────────────────────────────────────────────
const coverPage = [
  ...sp(3),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [run('ATTUNE', { size: 22, bold: true, color: ORANGE, allCaps: true, characterSpacing: 120 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [run('Workbook content review', { size: 44, bold: true, color: INK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 320 },
    children: [run('Every section of the workbook. What\'s on each page, where the content comes from, and the content itself.',
      { size: 17, italics: true, color: MUTED })] }),

  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 160 },
    children: [run('Source categories', { size: 13, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }),

  new Table({
    width: { size: 9000, type: WidthType.DXA },
    alignment: AlignmentType.CENTER,
    columnWidths: [2400, 6600],
    borders: { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd,
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: STONE }, insideVertical: noBrd },
    rows: [
      ['Exercise responses',   ORANGE, 'Their specific answers from the communication + expectations exercises. Changes per couple.'],
      ['Couple-type-specific', PURPLE, 'One of 10 versions, depending on which couple type they were assigned.'],
      ['Universal',            GREEN,  'Same for every couple. Written once, appears in every workbook.'],
      ['Their names',          BLUE,   'Filled in wherever the copy says {U} or {P}, e.g. "Jordan and Alex."'],
      ['Calculated',           '8B5CF6', 'Derived from their scores: gap sizes, gap labels, which dimensions to show.'],
      ['User-written',         MUTED,  'Blank writing space for them to fill in themselves (notebook-paper ruled lines).'],
    ].map(([label, color, desc]) => new TableRow({ children: [
      new TableCell({ borders: noBrds, width: { size: 2400, type: WidthType.DXA },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [new Paragraph({ spacing: { after: 0 },
          children: [
            new TextRun({ text: '●  ', font: 'Arial', size: 20, color }),
            run(label, { size: 15, bold: true, color }),
          ] })] }),
      new TableCell({ borders: noBrds, width: { size: 6600, type: WidthType.DXA },
        margins: { top: 100, bottom: 100, left: 0, right: 120 },
        children: [new Paragraph({ spacing: { after: 0, line: 280, lineRule: 'atLeast' },
          children: [run(desc, { size: 13, italics: true, color: MUTED })] })] }),
    ]})),
  }),

  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 320, after: 120 },
    children: [run('The Content column', { size: 13, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [run('Universal content is shown inline.', { size: 14, color: INK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [run('Non-universal content: references like "varies, see 3.1", look up that section in the Specific Content Review doc.',
      { size: 14, italics: true, color: PURPLE })] }),

  // Callout: epigraphs need to be picked
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 320, after: 140 },
    children: [run('Action needed: pick 4 epigraphs', { size: 13, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
    children: [run('Each of the 4 main Parts (1–4) opens with an epigraph. The Specific Content Review doc has 3 candidates per Part in Section 6. Pick one from each, or write your own. Marked in this doc as "varies, pick one from 6.X".',
      { size: 13, italics: true, color: MUTED })] }),
];

// ── Intro pages ──────────────────────────────────────────────────────────
const introSection = [
  ...sectionHeader('Introduction pages', 'Cover, TOC, Intro, Snapshot, the opening of the workbook.', ORANGE),
  sectionTable([
    { what: 'Cover page',
      desc: 'Names sit below "A workbook for". Couple type name appears as subhead.',
      source: 'Their names',
      content: '"{U} & {P}", couple type name below (varies, see 1.1–1.10 in Specific Content Review).' },
    { what: 'Table of contents',
      desc: 'Hierarchical TOC with page numbers and part labels.',
      source: 'Calculated',
      content: 'Structure is fixed; page numbers vary based on how many dimensions and expectations had gaps.' },
    { what: 'Introduction text',
      desc: 'Frames the workbook and how to read it together.',
      source: 'Universal',
      content: '"This workbook was built from {U} and {P}\'s actual exercise answers. Every insight, gap level, and weekly practice was selected because it reflects your specific combination of scores. The snapshot below summarizes where the two of you are aligned and where the gaps are. The rest of the workbook explores what to do about it."' },
    { what: 'Your Snapshot, dimension scores',
      desc: "Each partner's score across all 12 comms dimensions with gap label.",
      source: 'Exercise responses',
      content: 'Row per dimension: label · {U} score · {P} score · gap · gap label. All 12 dims shown.' },
    { what: 'Your Snapshot, expectations alignment',
      desc: "Each partner's answer on the 7 expectation domains with aligned/gap flag.",
      source: 'Exercise responses',
      content: 'Row per domain: label · {U} answer · {P} answer · aligned or gap.' },
    { what: 'Your Snapshot, couple type line',
      desc: 'Type name and tagline for one of the 10 types.',
      source: 'Couple-type-specific',
      content: 'Name + tagline, varies, see 1.1–1.10.' },
  ]),
];

// ── Part 1 ───────────────────────────────────────────────────────────────
const part1Section = [
  ...sectionHeader('Part 1 · A closer look at the dimensions that matter',
    'The bulk of the book. One page per dimension where they had a gap, plus expectations.', BLUE),
  sectionTable([
    { what: 'Part 1 cover page',
      desc: 'Part opener with opening quote/epigraph.',
      source: 'Couple-type-specific',
      content: 'Epigraph: varies, pick one from 6.1 (3 candidates). Remainder is universal.' },
    { what: 'Part 1 intro page ("Practical help…")',
      desc: 'Framing for what Part 1 contains, with couple type tagline.',
      source: 'Couple-type-specific',
      content: '"{U} & {P}" eyebrow + "Practical help, built from your answers." + couple type tagline (varies, see 1.1–1.10).' },
    { what: 'Dimension page, title + gap eyebrow',
      desc: 'Big centered dimension title + small gap eyebrow below it.',
      source: 'Calculated',
      content: '10 possible dimensions (Energy, Emotional Expression, How You Ask for Needs, Responding to Bids, Conflict Style, How You Repair, Closeness & Independence, How Love Lands, Communication Under Stress, Giving & Receiving Feedback). Gap eyebrow: "GAP X.X · [label]" where label is derived from gap size.' },
    { what: 'Dimension page, "Your scores" column (left side of hero)',
      desc: 'Spectrum with axis endpoints and a dot per partner showing their 1–5 score.',
      source: 'Exercise responses',
      content: 'Axis labels show numeric endpoints: "1 [LEFT LABEL]" on far left, "[RIGHT LABEL] 5" on far right. Below, two rows, one per partner, with a thin grey line and a colored dot at the score position. Axis pairs per dim: Energy (Inward/Outward) · Emotional Expression (Guarded/Expressive) · Needs (Direct/Indirect) · Bids (Reserved/Attuned) · Conflict (Engage quickly/Needs space first) · Repair (Formal-verbal/Informal-warmth) · Closeness (Autonomous/Close-seeking) · Love (Words/Actions & Presence) · Stress (Withdraw/Seek connection) · Feedback (Guarded/Open).' },
    { what: 'Dimension page, "What this means" column (right side of hero)',
      desc: 'Italic grey analysis of what this gap means for this specific couple type.',
      source: 'Couple-type-specific',
      content: 'Varies by couple type. See 2.1–2.10 in Specific Content Review (10 dims × 10 types = 100 blocks drafted). Prose uses partner names by substitution, e.g. "the W" and "the X" in the draft become "Jordan" and "Alex" at render time.' },
    { what: 'Dimension page, gap label',
      desc: 'Short label like "Worth exploring" in the gap eyebrow.',
      source: 'Calculated',
      content: 'Derived from gap size: <0.8 Close alignment · 0.8–1.4 Minor gap · 1.5–2.4 Worth exploring · ≥2.5 Significant gap. Dim pages only render when gap ≥ 1.5, so "Close alignment" and "Minor gap" labels never appear in practice.' },
    { what: 'Dimension page, reflection prompts (3)',
      desc: 'Three open-ended questions specific to this dimension.',
      source: 'Universal',
      content: 'Same 3 prompts per dimension. Example (Energy): "After a big social event, what does each of you need in the next 24 hours?" / "When does one of you feel most energized, and when does the other feel most depleted?" / "Is your current daily rhythm giving each person the kind of recovery they need?"' },
    { what: 'Dimension page, "Try this week" (in a colored box)',
      desc: 'One specific practice for this dimension, rendered in a tinted colored box with the dim\'s accent color.',
      source: 'Universal',
      content: 'One per dimension, same for every couple. Example (Energy): "Pick one upcoming situation likely to produce different energy states, a party, a family visit, a busy week. Before it happens, name what you\'ll each need afterward. Then check in."' },
    { what: 'Dimension page, "What we want to try" write-in',
      desc: 'Blank ruled lines for the commitment they want to try.',
      source: 'User-written',
      content: 'Label "What we want to try" + italic hint (e.g., "we\'ll share one thing we\'d normally hold back, every Sunday evening.") + 4 ruled notebook-paper lines.' },
    { what: 'Dimension page, "Our notes" write-in',
      desc: 'Additional blank ruled lines for free-form notes.',
      source: 'User-written',
      content: 'Label "Our notes" + 5 ruled notebook-paper lines.' },
    { what: 'Expectations, section header',
      desc: 'Opening for the expectations half of Part 1.',
      source: 'Their names',
      content: '"Expectations. Where {U} and {P} have different ideas about the life you\'re building."' },
    { what: 'Expectations, domain responses',
      desc: "Each partner's answer, shown side by side.",
      source: 'Exercise responses',
      content: 'Two columns per domain. 7 domains possible: Household, Financial, Career, Family / Kids, Lifestyle, Sex & Affection, Faith & Values.' },
    { what: 'Expectations, gap analysis',
      desc: 'Grey italic text explaining the pattern for this domain.',
      source: 'Universal',
      content: 'One version per domain, shown when the couple has a gap. Full text in /api/_workbook-content.js → EXP_DOMAINS[].gapText.' },
    { what: 'Expectations, "Try this week"',
      desc: 'One specific practice per expectation domain.',
      source: 'Universal',
      content: 'Same for every couple per domain.' },
  ]),
];

// ── Part 2 ───────────────────────────────────────────────────────────────
const part2Section = [
  ...sectionHeader('Part 2 · Working Knowledge',
    "Six recurring moments with guidance keyed to each partner's individual type.", PURPLE),
  sectionTable([
    { what: 'Part 2 cover page',
      desc: 'Part opener with epigraph.',
      source: 'Couple-type-specific',
      content: 'Epigraph: varies, pick one from 6.2 (3 candidates). Remainder is universal.' },
    { what: 'Partner page header',
      desc: 'Cross-type couples get two pages (one per subject partner); same-type get one.',
      source: 'Their names',
      content: '"What {Partner} should know about {You}"' },
    { what: 'The 6 moments (titles + blurbs)',
      desc: 'Same 6 moments in every workbook.',
      source: 'Universal',
      content: '1. After a hard workday · 2. When they\'re worried but haven\'t said it · 3. During a disagreement · 4. After a disagreement · 5. When they want to feel close · 6. When stress is coming from outside the relationship.' },
    { what: 'Each moment, "What\'s happening for them"',
      desc: '2-3 sentences. What\'s going on inside the subject partner.',
      source: 'Couple-type-specific',
      content: 'Varies, see 3.1–3.6 (each has W/X/Y/Z versions).' },
    { what: 'Each moment, "What NOT to do"',
      desc: 'One sentence. The natural but wrong move.',
      source: 'Couple-type-specific',
      content: 'Varies, see 3.1–3.6.' },
    { what: 'Each moment, "What works"',
      desc: '1-2 sentences. The specific action that lands.',
      source: 'Couple-type-specific',
      content: 'Varies, see 3.1–3.6.' },
    { what: 'Each moment, "Phrase that lands"',
      desc: 'A literal line the other partner can say.',
      source: 'Couple-type-specific',
      content: 'Varies, see 3.1–3.6.' },
  ]),
];

// ── Part 3 ───────────────────────────────────────────────────────────────
const part3Section = [
  ...sectionHeader('Part 3 · Workbook',
    'Guided journaling pages where they write their own focus areas.', ORANGE),
  sectionTable([
    { what: 'Part 3 cover page',
      desc: 'Part opener with epigraph.',
      source: 'Couple-type-specific',
      content: 'Epigraph: varies, pick one from 6.3 (3 candidates). Remainder is universal.' },
    { what: '"Preparing together", 3 prompts',
      desc: 'Reflection questions before picking focus areas.',
      source: 'Universal',
      content: '1. "What\'s the thing you want to say but haven\'t said yet?" · 2. "What\'s been sitting with you most from this workbook?" · 3. "If one thing changed in how you two talk, what would you want it to be?" (each with an italic example hint)' },
    { what: '"Preparing together", answer space',
      desc: 'Blank ruled lines for their answers.',
      source: 'User-written',
      content: '5 ruled lines per prompt.' },
    { what: 'Focus area pages (3 pages)',
      desc: 'One page per focus area. Labels + blank ruled write-ins.',
      source: 'Universal',
      content: 'Labels: "FOCUS AREA N" · "What we\'re focusing on" (with hint, 2 ruled lines) · "Why this matters to us" (4 ruled lines) · "What {U} will do" / "What {P} will do" (two columns, 5 ruled lines each) · "Timeline and check-in" (5 ruled lines). Structure universal; content written by the couple.' },
    { what: 'Focus area pages, ruled write-ins',
      desc: 'Every labeled section has blank ruled lines below.',
      source: 'User-written',
      content: 'Couple writes their own focus area, reasons, tasks, timeline.' },
    { what: '30-day check-in page',
      desc: 'Three prompts revisited after 30 days.',
      source: 'Universal',
      content: '1. "What changed (if anything) over the last 30 days?" · 2. "Did the focus areas we wrote down actually get attention? What got in the way?" · 3. "One small thing to try differently in the next 30 days."' },
    { what: '30-day check-in, answer space',
      desc: 'Blank ruled lines for their answers.',
      source: 'User-written',
      content: '6 ruled lines per prompt.' },
  ]),
];

// ── Part 4 ───────────────────────────────────────────────────────────────
const part4Section = [
  ...sectionHeader('Part 4 · Conversation Library',
    'Conversation starters for five common situations.', PURPLE),
  sectionTable([
    { what: 'Part 4 cover page',
      desc: 'Part opener with epigraph.',
      source: 'Couple-type-specific',
      content: 'Epigraph: varies, pick one from 6.4 (3 candidates). Remainder is universal.' },
    { what: 'The 5 situations (titles + blurbs)',
      desc: 'Same 5 situations in every workbook.',
      source: 'Universal',
      content: '1. At dinner on a quiet night · 2. After a hard week · 3. When one of you is off but won\'t say why · 4. Before a difficult conversation · 5. When you\'re tired of talking about logistics.' },
    { what: 'Prompts shown per situation',
      desc: 'Master list of 25 prompts (5 per situation), tagged by couple type fit. Workbook shows 5 prompts per situation.',
      source: 'Couple-type-specific',
      content: 'Varies, see 4.1–4.5 (each has 5 prompts with "Best for" tags).' },
    { what: '"A structured first conversation"',
      desc: 'A longer guided conversation framework at the end of Part 4.',
      source: 'Universal',
      content: 'Same for every couple. Currently placeholder in the workbook, final framework content pending.' },
  ]),
];

// ── Part 5 ───────────────────────────────────────────────────────────────
const part5Section = [
  ...sectionHeader('Part 5 · Reference Card',
    'A small card they can print and keep somewhere visible.', GREEN),
  sectionTable([
    { what: 'Card layout + design',
      desc: 'Small navy card, centered on page, three tiles side by side.',
      source: 'Universal',
      content: '~5.5" × 3.5" with orange→purple gradient strip at top. Same layout in every workbook.' },
    { what: 'Left tile, names + couple type',
      desc: 'Names prominent, couple type name + tagline below.',
      source: 'Their names',
      content: '"{U} & {P}" + couple type name + tagline (varies, see 1.1–1.10 for type-specific content).' },
    { what: 'Center tile, "Phrase that lands"',
      desc: 'One short phrase for this specific couple type.',
      source: 'Couple-type-specific',
      content: 'Varies, see 5.1–5.10 (first tip\'s phraseTry per couple type).' },
    { what: 'Right tile, "Goal for this week"',
      desc: 'Blank notebook-paper lines for them to write their own goal.',
      source: 'User-written',
      content: '4 ruled notebook-paper lines under the "Goal for this week" label.' },
    { what: 'Card footer',
      desc: 'Small URL under the tiles.',
      source: 'Universal',
      content: 'ATTUNE · REFERENCE CARD header and attune-relationships.com footer. "Print on cardstock. Cut out and keep it somewhere you\'ll see it." note.' },
  ]),
];

// ── Assemble ─────────────────────────────────────────────────────────────
const doc = new Document({
  styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
  sections: [{
    properties: { page: {
      margin: { top: 720, right: 720, bottom: 720, left: 720 },
      size: { orientation: PageOrientation.LANDSCAPE, width: 12240, height: 15840 },
    } },
    footers: {
      default: new Footer({
        children: [new Paragraph({ alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: STONE, space: 8 } },
          spacing: { before: 120, after: 0 },
          children: [
            run('Attune · Workbook content review   ·   ', { size: 13, color: MUTED }),
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
    ],
  }],
});

const buf = await Packer.toBuffer(doc);
const outPath = '/tmp/workbook_content_review.docx';
writeFileSync(outPath, buf);
execSync('libreoffice --headless --convert-to pdf --outdir /tmp ' + outPath, { stdio: 'pipe' });
console.log(`✓ Workbook content review: ${outPath} (${buf.length} bytes)`);
