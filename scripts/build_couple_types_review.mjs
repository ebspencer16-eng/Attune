// Generates a 10-page review doc, one page per couple type, showing
// everything that's unique to that type in the workbook: name, tagline,
// description, nuance, strengths, sticking points, patterns, tips
// (with phrases to try), and famous duos.
//
// Designed so Ellie and her partner can sit with a printed stack and
// review each type as a standalone magazine sheet.

import { writeFileSync, readFileSync } from 'fs';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  HeightRule, Footer, PageNumber,
} from 'docx';

// ── Pull NEW_COUPLE_TYPES out of App.jsx ─────────────────────────────────────
const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf-8');
const m = appSource.match(/const NEW_COUPLE_TYPES = (\[[\s\S]+?\n\]);/);
if (!m) throw new Error("Can't find NEW_COUPLE_TYPES in App.jsx");
const NEW_COUPLE_TYPES = (new Function('return ' + m[1]))();
console.log(`Loaded ${NEW_COUPLE_TYPES.length} couple types`);

// ── Design tokens ────────────────────────────────────────────────────────────
const ORANGE = 'E8673A', BLUE = '1B5FE8', PURPLE = '9B5DE5', GREEN = '10B981';
const INK = '0E0B07', MUTED = '8C7A68', STONE = 'E8DDD0';
const W = 9360;

const run = (t, o = {}) => new TextRun({ text: String(t ?? ''), font: 'Arial', ...o });
const para = (t, o = {}) => new Paragraph({ spacing: { after: o.after ?? 120, before: o.before ?? 0 }, alignment: o.align,
  children: [run(t, { size: o.size ?? 20, color: o.color ?? INK, bold: o.bold, italics: o.italics })] });
const sp = (after = 80) => new Paragraph({ spacing: { after }, children: [new TextRun('')] });
const pb = () => new Paragraph({ children: [new TextRun({ break: 1 })], pageBreakBefore: true });
const noBrd = { style: BorderStyle.NONE };
const noBrds = { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd, insideHorizontal: noBrd, insideVertical: noBrd };

// Small caps eyebrow
function eyebrow(text, color, spacing = { before: 160, after: 60 }) {
  return new Paragraph({ spacing,
    children: [run(text, { size: 13, bold: true, color, allCaps: true, characterSpacing: 60 })] });
}

// Accent top bar — wide, short colored rectangle with ID/name/tagline
function buildTypeHeader(ct) {
  const color = ct.color.replace('#', '');
  const shade = (ct.shade || '#FFF8F0').replace('#', '');

  // Wide accent bar with ID on left
  const topBar = new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W],
    borders: noBrds,
    rows: [new TableRow({
      height: { value: 120, rule: HeightRule.EXACT },
      children: [new TableCell({
        borders: { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd },
        width: { size: W, type: WidthType.DXA },
        shading: { fill: color, type: ShadingType.CLEAR },
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        children: [new Paragraph({ spacing: { after: 0, line: 120, lineRule: 'exact' }, children: [run('', { size: 2 })] })],
      })],
    })],
  });

  return [
    topBar,
    sp(120),
    // ID + type category (same-type / cross-type) on left, sample name pair on right
    new Table({
      width: { size: W, type: WidthType.DXA }, columnWidths: [W],
      borders: noBrds,
      rows: [new TableRow({
        children: [new TableCell({
          borders: noBrds,
          width: { size: W, type: WidthType.DXA },
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          children: [new Paragraph({ spacing: { after: 60 },
            children: [
              run(ct.id, { size: 22, bold: true, color, characterSpacing: 80 }),
              run('   ·   ', { size: 14, color: STONE }),
              run(ct.typeA === ct.typeB ? 'SAME TYPE' : 'CROSS TYPE', { size: 12, bold: true, color: MUTED, characterSpacing: 80 }),
            ],
          })],
        })],
      })],
    }),
    // Couple type name
    new Paragraph({ spacing: { after: 40 },
      children: [run(ct.name, { size: 36, bold: true, color: INK })] }),
    // Tagline
    new Paragraph({ spacing: { after: 200 },
      children: [run(ct.tagline, { size: 18, italics: true, color: MUTED })] }),
  ];
}

// 3-column table for strengths / sticking points / patterns
function buildThreeColumn(strengths, stickingPoints, patterns) {
  const col = (title, items, color) => new TableCell({
    borders: { top: { style: BorderStyle.SINGLE, size: 8, color }, bottom: noBrd, left: noBrd, right: noBrd },
    width: { size: Math.floor(W / 3), type: WidthType.DXA },
    margins: { top: 120, bottom: 60, left: 0, right: 120 },
    children: [
      new Paragraph({ spacing: { after: 80 },
        children: [run(title, { size: 12, bold: true, color, allCaps: true, characterSpacing: 60 })] }),
      ...items.map(t => new Paragraph({ spacing: { after: 80 }, indent: { left: 120, hanging: 120 },
        children: [run('·  ', { size: 14, color }), run(t, { size: 14, color: INK })] })),
    ],
  });

  return new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: [Math.floor(W / 3), Math.floor(W / 3), Math.floor(W / 3)],
    borders: noBrds,
    rows: [new TableRow({ children: [
      col('Strengths', strengths, GREEN),
      col('Sticking points', stickingPoints, ORANGE),
      col('Patterns', patterns, PURPLE),
    ]})],
  });
}

// Tips: compact horizontal list. Each tip: title (bold) + body + italic phrase.
function buildTips(tips, accentColor) {
  return tips.map((tip, i) => new Paragraph({ spacing: { after: 100, before: 0 },
    children: [
      run(`${i + 1}.  `, { size: 14, bold: true, color: accentColor }),
      run(tip.title, { size: 14, bold: true, color: INK }),
      run('  —  ', { size: 14, color: STONE }),
      run(tip.body, { size: 14, color: INK }),
      run('  →  ', { size: 14, color: accentColor, bold: true }),
      run(`"${tip.phraseTry}"`, { size: 14, italics: true, color: MUTED }),
    ],
  }));
}

// Famous duos at the bottom
function buildFamousDuos(duos) {
  return duos.map(d => new Paragraph({ spacing: { after: 60 },
    children: [
      run(d.names, { size: 13, bold: true, color: INK }),
      run(`  ·  ${d.show}`, { size: 12, italics: true, color: MUTED }),
      run('  —  ', { size: 12, color: STONE }),
      run(d.note, { size: 12, color: INK, italics: true }),
    ],
  }));
}

// Build a single couple-type page
function buildCoupleTypePage(ct, idx) {
  const color = ct.color.replace('#', '');

  return [
    pb(),  // Always page break — cover page is isolated, each type starts fresh
    ...buildTypeHeader(ct),

    eyebrow('What it is', color, { before: 0, after: 60 }),
    para(ct.description, { size: 15, color: INK, after: 160 }),

    eyebrow('Watch out for', ORANGE, { before: 40, after: 60 }),
    para(ct.nuance, { size: 15, color: INK, after: 180 }),

    buildThreeColumn(ct.strengths, ct.stickingPoints, ct.patterns),
    sp(160),

    eyebrow('Tips for this couple', color, { before: 40, after: 100 }),
    ...buildTips(ct.tips, color),
    sp(120),

    eyebrow('Famous duos', MUTED, { before: 0, after: 80 }),
    ...buildFamousDuos(ct.famousDuos),
  ];
}

// ── Cover page ───────────────────────────────────────────────────────────────
const coverPage = [
  sp(800),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
    children: [run('ATTUNE', { size: 20, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [run('Couple Types — Review Doc', { size: 36, bold: true, color: INK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
    children: [run('10 couple types, one page each. Everything unique to that type.', { size: 18, italics: true, color: MUTED })] }),
  sp(120),
  para('How to use this', { bold: true, size: 20, color: ORANGE, after: 120 }),
  para('Each of the next 10 pages is a standalone review sheet for one couple type. Print them or flip through them in Word — the layout is the same shape each time so it\'s easy to compare.', { size: 18, after: 120 }),
  para('Review each for:', { size: 18, bold: true, after: 100 }),
  new Paragraph({ spacing: { after: 60 }, indent: { left: 280 },
    children: [run('·  Does the name fit? Does the tagline land?', { size: 16, color: INK })] }),
  new Paragraph({ spacing: { after: 60 }, indent: { left: 280 },
    children: [run('·  Is the "what it is" description accurate and warm?', { size: 16, color: INK })] }),
  new Paragraph({ spacing: { after: 60 }, indent: { left: 280 },
    children: [run('·  Does the "watch out for" name the real risk without catastrophizing?', { size: 16, color: INK })] }),
  new Paragraph({ spacing: { after: 60 }, indent: { left: 280 },
    children: [run('·  Are the 3 strengths / 3 sticking points / 3 patterns right?', { size: 16, color: INK })] }),
  new Paragraph({ spacing: { after: 60 }, indent: { left: 280 },
    children: [run('·  Are the tips actionable and the phrases something a real person would say?', { size: 16, color: INK })] }),
  new Paragraph({ spacing: { after: 60 }, indent: { left: 280 },
    children: [run('·  Do the famous duos ring true?', { size: 16, color: INK })] }),
  sp(200),
  para('{U} and {P} are substitution markers for the partner names. Leave them in place when editing.',
    { size: 14, italics: true, color: MUTED }),
];

// ── Assemble ─────────────────────────────────────────────────────────────────
const children = [
  ...coverPage,
  ...NEW_COUPLE_TYPES.flatMap((ct, i) => buildCoupleTypePage(ct, i)),
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
            run('Attune — Couple Types Review   ·   ', { size: 13, color: MUTED }),
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
writeFileSync('/tmp/couple_types_review.docx', buf);
console.log(`✓ Couple types review: /tmp/couple_types_review.docx (${buf.length} bytes)`);
