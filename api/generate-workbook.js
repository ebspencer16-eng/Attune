/**
 * /api/generate-workbook
 *
 * Generates a personalized Attune relationship workbook as a .docx file.
 * Accepts POST with couple data; returns binary .docx for download.
 *
 * Runtime: Node.js (not Edge — docx package requires Node.js APIs)
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageBreak, LevelFormat,
  Header, Footer, PageNumber, TableOfContents, StyleLevel, HeightRule,
  TabStopType, TabStopPosition, LeaderType, Tab,
} from 'docx';
import { DIM_META, DIM_CONTENT, EXP_DOMAINS, DIMS } from './_workbook-content.js';

export const config = { runtime: 'nodejs' };

// ─── Colour palette ───────────────────────────────────────────────────────────
const ORANGE = 'E8673A';
const BLUE   = '1B5FE8';
const INK    = '0E0B07';
const MUTED  = '8C7A68';
const STONE  = 'E8DDD0';
const GREEN  = '10B981';
const PURPLE = '9B5DE5';

// ─── Layout ───────────────────────────────────────────────────────────────────
const W = 9360;
const PAGE = {
  size: { width: 12240, height: 15840 },
  margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
};

// ─── Doc primitives ───────────────────────────────────────────────────────────
const NUMBERING = {
  config: [
    { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2014',
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } }, run: { font: 'Arial' } } }] },
    { reference: 'nums', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.',
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } }, run: { font: 'Arial' } } }] },
  ],
};
const STYLES = {
  default: { document: { run: { font: 'Arial', size: 22 } } },
  paragraphStyles: [
    { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { size: 52, bold: true, font: 'Arial', color: INK }, paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
    { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { size: 32, bold: true, font: 'Arial', color: INK }, paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 1 } },
    { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { size: 24, bold: true, font: 'Arial', color: ORANGE }, paragraph: { spacing: { before: 280, after: 100 }, outlineLevel: 2 } },
  ],
};

const pb  = () => new Paragraph({ children: [new PageBreak()], spacing: { after: 0 } });
const sp  = () => new Paragraph({ children: [new TextRun('')], spacing: { after: 0 } });
const sps = n => Array.from({ length: n }, sp);
const run = (text, opts = {}) => new TextRun({ text: String(text || ''), font: 'Arial', ...opts });

const para = (text, opts = {}) => new Paragraph({
  alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
  spacing: { after: opts.after ?? 160, before: opts.before ?? 0 },
  children: [run(text, { size: opts.size || 22, bold: !!opts.bold, italics: !!opts.italics,
    color: opts.color || INK, allCaps: !!opts.allCaps, characterSpacing: opts.tracking || 0 })]
});

const eyebrow = (text, color) => new Paragraph({
  spacing: { after: 100 },
  children: [run(text, { size: 16, bold: true, color: color || ORANGE, allCaps: true, characterSpacing: 40 })]
});

const bullet = (text, color) => new Paragraph({
  numbering: { reference: 'bullets', level: 0 }, spacing: { after: 100 },
  children: [run(text, { size: 22, color: color || INK })]
});

const numItem = (text, opts = {}) => new Paragraph({
  numbering: { reference: 'nums', level: 0 }, spacing: { after: 120 },
  children: [run(text, { size: opts.size || 22, bold: !!opts.bold, color: opts.color || INK })]
});

const checkItem = (text) => new Paragraph({
  numbering: { reference: 'bullets', level: 0 }, spacing: { after: 120 },
  children: [run('\u2610  ' + String(text || ''), { size: 22 })]
});

const hr = (color, thick) => new Paragraph({
  border: { bottom: { style: BorderStyle.SINGLE, size: thick || 4, color: color || STONE, space: 6 } },
  spacing: { before: 100, after: 200 }, children: [new TextRun('')]
});

// A gradient bar built from adjacent colored cells. docx doesn't support
// true CSS gradients, but stepping through many small cells produces a
// visually convincing gradient strip that we use as section dividers and
// as accent elements on the cover page.
function hexToRgb(h) {
  return [parseInt(h.slice(0,2), 16), parseInt(h.slice(2,4), 16), parseInt(h.slice(4,6), 16)];
}
function rgbToHex([r,g,b]) {
  return [r,g,b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2,'0').toUpperCase()).join('');
}
function gradientColors(from, to, segments) {
  // Optional mid-point for richer gradients. Pass `from` and `to` as arrays
  // of hex strings to get a multi-stop gradient; a single stop on each end
  // works as a 2-color gradient.
  const stops = [].concat(from).concat(to).map(hexToRgb);
  const out = [];
  for (let i = 0; i < segments; i++) {
    const t = segments === 1 ? 0 : i / (segments - 1);
    const pos = t * (stops.length - 1);
    const idx = Math.min(stops.length - 2, Math.floor(pos));
    const local = pos - idx;
    const [r1,g1,b1] = stops[idx], [r2,g2,b2] = stops[idx + 1];
    out.push(rgbToHex([r1 + (r2-r1)*local, g1 + (g2-g1)*local, b1 + (b2-b1)*local]));
  }
  return out;
}
// gradientBar: renders a thin horizontal gradient strip.
// fromHex / toHex can each be a single hex string or an array of stops.
function gradientBar(fromHex, toHex, opts = {}) {
  const segments = opts.segments || 30;
  const height   = opts.height   || 120;   // twips; ~6pt at default
  const width    = opts.width    || W;
  const cellWidth = Math.floor(width / segments);
  const colors = gradientColors(fromHex, toHex, segments);
  // Zero-width borders on every cell edge so adjacent cells render flush.
  // Also zero cell margins so the fill covers the entire cell area.
  const flushBorders = {
    top:    { style: BorderStyle.NIL },
    bottom: { style: BorderStyle.NIL },
    left:   { style: BorderStyle.NIL },
    right:  { style: BorderStyle.NIL },
  };
  return new Table({
    width: { size: width, type: WidthType.DXA },
    alignment: AlignmentType.CENTER,
    columnWidths: Array(segments).fill(cellWidth),
    borders: {
      ...flushBorders,
      insideHorizontal: { style: BorderStyle.NIL },
      insideVertical:   { style: BorderStyle.NIL },
    },
    rows: [new TableRow({
      height: { value: height, rule: HeightRule.EXACT },
      children: colors.map(c => new TableCell({
        borders: flushBorders,
        width: { size: cellWidth, type: WidthType.DXA },
        shading: { fill: c, type: ShadingType.CLEAR },
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        children: [new Paragraph({ spacing: { before: 0, after: 0, line: 120, lineRule: 'exact' }, children: [run('', { size: 2 })] })],
      })),
    })],
  });
}
// A paragraph wrapper that pads the gradient bar so it doesn't butt up
// against other content.
const gradRule = (fromHex, toHex, opts = {}) => [
  new Paragraph({ spacing: { before: opts.before ?? 80, after: 0 }, children: [run('', { size: 1 })] }),
  gradientBar(fromHex, toHex, opts),
  new Paragraph({ spacing: { before: 0, after: opts.after ?? 160 }, children: [run('', { size: 1 })] }),
];

// ─── Borders ──────────────────────────────────────────────────────────────────
const brd = { style: BorderStyle.SINGLE, size: 1, color: STONE };
const allBrds = { top: brd, bottom: brd, left: brd, right: brd };
const noBrds  = { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } };

// ─── Table cell helpers ───────────────────────────────────────────────────────
const tc = (text, width, opts = {}) => new TableCell({
  borders: opts.noBorder ? noBrds : allBrds,
  width: { size: width, type: WidthType.DXA },
  shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
  margins: { top: 100, bottom: 100, left: 160, right: 160 },
  children: [new Paragraph({ spacing: { after: 0 }, children: [run(text, { size: opts.size || 20, bold: !!opts.bold, italics: !!opts.italics, color: opts.color || INK })] })]
});
const hc = (text, width, fill) => new TableCell({
  borders: allBrds, width: { size: width, type: WidthType.DXA },
  shading: { fill: fill || BLUE, type: ShadingType.CLEAR },
  margins: { top: 100, bottom: 100, left: 160, right: 160 },
  children: [new Paragraph({ spacing: { after: 0 }, children: [run(text, { size: 20, bold: true, color: 'FFFFFF' })] })]
});

// Accent box: left colour bar + shaded body
const accentBox = (label, text, fill, accent) => {
  const a = accent || ORANGE, f = fill || 'FFF8F0';
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [160, W - 160],
    rows: [new TableRow({ children: [
      new TableCell({ borders: noBrds, width: { size: 160, type: WidthType.DXA },
        shading: { fill: a, type: ShadingType.CLEAR }, margins: { top: 0, bottom: 0, left: 0, right: 0 },
        children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun(' ')] })] }),
      new TableCell({ borders: noBrds, width: { size: W - 160, type: WidthType.DXA },
        shading: { fill: f, type: ShadingType.CLEAR }, margins: { top: 200, bottom: 200, left: 280, right: 280 },
        children: [
          ...(label ? [new Paragraph({ spacing: { after: 80 }, children: [run(label, { size: 16, bold: true, color: a, allCaps: true, characterSpacing: 40 })] })] : []),
          new Paragraph({ spacing: { after: 0 }, children: [run(text, { size: 22 })] }),
        ] }),
    ]})]
  });
};

// Accent box variant that accepts arbitrary paragraph children on the right
// side (instead of a single text string). Used for checklists, score bars,
// multi-paragraph story blocks, etc.
const accentBoxRich = (label, children, fill, accent) => {
  const a = accent || ORANGE, f = fill || 'FFF8F0';
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [160, W - 160],
    rows: [new TableRow({ children: [
      new TableCell({ borders: noBrds, width: { size: 160, type: WidthType.DXA },
        shading: { fill: a, type: ShadingType.CLEAR }, margins: { top: 0, bottom: 0, left: 0, right: 0 },
        children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun(' ')] })] }),
      new TableCell({ borders: noBrds, width: { size: W - 160, type: WidthType.DXA },
        shading: { fill: f, type: ShadingType.CLEAR }, margins: { top: 200, bottom: 200, left: 280, right: 280 },
        children: [
          ...(label ? [new Paragraph({ spacing: { after: 120 }, children: [run(label, { size: 16, bold: true, color: a, allCaps: true, characterSpacing: 40 })] })] : []),
          ...children,
        ] }),
    ]})]
  });
};

// Epigraph — a centered italic quote with attribution, placed at the start
// of each Part to set tone before the content begins. One per part.
const epigraph = (quote, author) => [
  sp(),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
    children: [run(`"${quote}"`, { size: 22, italics: true, color: MUTED })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 },
    children: [run(`— ${author}`, { size: 16, color: MUTED })] }),
];

// Check-item — an unchecked box followed by editable content. Used for
// action items (Try this week), longitudinal prompts (revisit in 30 days).
const checkAction = (text, opts = {}) => new Paragraph({
  spacing: { after: opts.after ?? 160 },
  indent: { left: 240 },
  children: [
    run('\u2610   ', { size: 26 }),
    run(text, { size: 22, color: opts.color || INK, italics: !!opts.italics }),
  ],
});

// Horizontal score bar — renders a visual bar showing a single person's
// position on a dimension, with left/right axis labels. Used in the
// Patterns section where we compare two scores on the same dimension.
function scoreBarRow(label, score, leftAxis, rightAxis, color) {
  const clamped = Math.max(1, Math.min(5, score));
  // 5 segments; filled up to the rounded score
  const filled = Math.round(clamped);
  const fillColor = color || ORANGE;

  const segments = [];
  for (let i = 1; i <= 5; i++) {
    segments.push(new TableCell({
      borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } },
      width: { size: 440, type: WidthType.DXA },
      shading: { fill: i <= filled ? fillColor : 'EAE3D6', type: ShadingType.CLEAR },
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      children: [new Paragraph({ spacing: { after: 0, line: 120, lineRule: 'exact' }, children: [run('', { size: 2 })] })],
    }));
  }

  // Row: [label 1600] [leftAxis 1400] [bar 2200] [rightAxis 1400] [score 800]
  return new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: [1600, 1400, 2200, 1400, 800],
    borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL }, insideHorizontal: { style: BorderStyle.NIL }, insideVertical: { style: BorderStyle.NIL } },
    rows: [new TableRow({
      height: { value: 440, rule: HeightRule.ATLEAST },
      children: [
        new TableCell({ borders: noBrds, width: { size: 1600, type: WidthType.DXA }, margins: { top: 120, bottom: 120, left: 0, right: 120 },
          children: [new Paragraph({ spacing: { after: 0 }, children: [run(label, { size: 20, bold: true })] })] }),
        new TableCell({ borders: noBrds, width: { size: 1400, type: WidthType.DXA }, margins: { top: 120, bottom: 120, left: 80, right: 80 },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 0 }, children: [run(leftAxis, { size: 16, color: MUTED, italics: true })] })] }),
        // Bar itself: inner 5-segment table
        new TableCell({ borders: noBrds, width: { size: 2200, type: WidthType.DXA }, margins: { top: 160, bottom: 160, left: 40, right: 40 },
          children: [new Table({
            width: { size: 2200, type: WidthType.DXA },
            columnWidths: [440, 440, 440, 440, 440],
            borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL }, insideHorizontal: { style: BorderStyle.NIL }, insideVertical: { style: BorderStyle.NIL } },
            rows: [new TableRow({ height: { value: 140, rule: HeightRule.EXACT }, children: segments })],
          })] }),
        new TableCell({ borders: noBrds, width: { size: 1400, type: WidthType.DXA }, margins: { top: 120, bottom: 120, left: 80, right: 80 },
          children: [new Paragraph({ spacing: { after: 0 }, children: [run(rightAxis, { size: 16, color: MUTED, italics: true })] })] }),
        new TableCell({ borders: noBrds, width: { size: 800, type: WidthType.DXA }, margins: { top: 120, bottom: 120, left: 80, right: 0 },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 0 }, children: [run(clamped.toFixed(1) + ' / 5', { size: 18, bold: true, color: fillColor })] })] }),
      ],
    })],
  });
}

// PLACEHOLDER marker — used to clearly distinguish structure from
// final content while the template is under review.
const PH = (text) => `[PLACEHOLDER — ${text}]`;

// ─── Personalization helpers ──────────────────────────────────────────────────
function fill(template, u, p) {
  return String(template || '')
    .replace(/\{U\} and \{P\}/g, `${u} and ${p}`)
    .replace(/\{U\}/g, u)
    .replace(/\{P\}/g, p);
}

// Map a raw exercise answer value to a readable label. Handles three cases:
//   1. Full-text answer (what the current app stores, e.g. "Split equally")
//      → returned as-is
//   2. Stray letter codes from legacy data ("a", "b", "c")
//      → mapped to partner-relative labels using the current couple's names
//   3. null / empty → "—"
function answerLabel(rawValue, userName, partnerName) {
  if (rawValue === null || rawValue === undefined) return '—';
  const s = String(rawValue).trim();
  if (!s) return '—';
  // Legacy single-letter codes. In older datasets these meant "self / partner
  // / both-equally" for responsibility-style questions.
  if (s.length === 1) {
    const map = {
      a: userName,
      b: partnerName,
      c: 'Both equally',
    };
    return map[s.toLowerCase()] || s;
  }
  return s;
}

function gapLabel(gap) {
  if (gap < 0.8) return 'Closely matched';
  if (gap < 1.5) return 'Minor difference';
  if (gap < 2.5) return 'Worth exploring';
  return 'Significant gap';
}

function gapColour(gap) {
  if (gap < 0.8) return GREEN;
  if (gap < 1.5) return BLUE;
  if (gap < 2.5) return ORANGE;
  return 'E53E3E';
}

// Score bar using Unicode blocks — 5 segments
function scoreBar(score, color) {
  const rounded = Math.round(Math.max(1, Math.min(5, score)));
  return '\u2588'.repeat(rounded) + '\u2591'.repeat(5 - rounded);
}

// ─── SECTION BUILDERS ─────────────────────────────────────────────────────────

// Table of contents. Detailed, hierarchical (parts + subsections), with
// page numbers. Page numbers are approximated at generation time based on
// the content going into this specific copy: the snapshot & insights
// sections vary in length by couple (filtered to only gap-dimensions for
// Part 2). Numbers may be off by a page in dense sections; that's a
// reasonable trade given the alternative is leaving them blank.
function estimatePageOffsets({ s1, s2, expGaps, priorities, gapThreshold = 1.0 }) {
  // Dimensions shown in Part 2 (gap ≥ threshold)
  const gapDims = DIMS.filter(d => Math.abs((s1[d] || 3) - (s2[d] || 3)) >= gapThreshold);
  const visibleDomains = DOMAIN_ORDER.map(dom => ({
    title: dom.title,
    visibleDims: dom.dims.filter(d => gapDims.includes(d)),
  })).filter(dom => dom.visibleDims.length > 0);
  const unalignedExp = expGaps.filter(g => !g.aligned).length;

  // Page-number estimates, calibrated against the reference sample. Will
  // drift by ±1 on denser couples (more expectation gaps / longer content).
  // Cover p1, TOC p2, Intro p3.
  const introPage = 3;
  // Intro + snapshot now share a no-cover flow: after intro (p3) and an
  // intro callout spill (~p4), snapshot begins.
  let p = 3;
  p += 1;                                     // intro callouts spill to p4
  const snapshotPage = p + 1;                 // snapshot tables start here
  p += 1;                                     // snapshot on p5 (single page now)

  // Part 1 — Insights
  p += 1;                                     // Part 1 cover
  p += 1;                                     // epigraph
  const insightsPage = p + 1;  p += 1;        // Part 1 intro description page
  const domainPages = visibleDomains.map(dom => {
    const page = p + 1;
    p += Math.max(1, dom.visibleDims.length);
    return { title: dom.title, page };
  });
  const expPage = p + 1;
  p += Math.max(1, Math.ceil(unalignedExp / 3));

  // Part 2 — Working Knowledge
  p += 1;                                     // Part 2 cover
  p += 1;                                     // epigraph
  const workingKnowledgePage = p + 1;
  const sameType = coupleTypeIsSame();
  p += sameType ? 4 : 7;

  // Part 3 — Priorities
  p += 1;                                     // Part 3 cover
  p += 1;                                     // epigraph
  const prioritiesPage = p + 1;
  p += Math.max(1, Math.ceil(priorities.length / 1.5));
  p += 1;                                     // 30-day check-in page

  // Part 4 — Conversation Library
  p += 1;                                     // Part 4 cover
  p += 1;                                     // epigraph
  const conversationPage = p + 1;
  p += 4;                                     // 5 situations ~ 2-3 pages + structured guide

  // Part 5 — Over Time
  p += 1;                                     // Part 5 cover
  p += 1;                                     // epigraph
  const overTimePage = p + 1;
  p += 1;                                     // single page: year-1 letter

  // Part 6 — Reference Card
  p += 1;                                     // Part 6 cover
  const referencePage = p + 1;

  return { introPage, snapshotPage, insightsPage, domainPages, expPage,
           workingKnowledgePage,
           prioritiesPage, conversationPage, overTimePage,
           referencePage, visibleDomains };
}

// Quick helper used inside estimator. In a future pass we can thread the
// actual coupleType into estimatePageOffsets; for now default to cross-type.
function coupleTypeIsSame() { return false; }

function buildTOC(offsets, priorities, u, p, coupleType) {
  // TOC rows rendered as 2-column tables: label cell (left) + page-number
  // cell (right). This is more robust than tab-stop leaders, which render
  // inconsistently across Word / Pages / Google Docs / online previewers.
  // The "dashed line between" is drawn as a bottom border on the label cell,
  // which every renderer supports cleanly.
  const PAGE_COL = 700;            // fixed width for page-number column
  const LABEL_COL = W - PAGE_COL;  // rest for label + dashes

  function tocRow({ label, labelBold = false, labelColor = INK, labelSize = 22,
                    pageNum, indent = 0, italic = false, before = 60, after = 60 }) {
    // Dashed bottom border on the label cell creates the leader line;
    // positioned at the text baseline via cell bottom margin so it
    // visually sits between the text and the page number.
    const dashedBottom = { bottom: { style: BorderStyle.DASHED, size: 6, color: STONE, space: 1 } };
    const noOtherBorders = {
      top:    { style: BorderStyle.NONE },
      left:   { style: BorderStyle.NONE },
      right:  { style: BorderStyle.NONE },
    };
    return new Table({
      width: { size: W, type: WidthType.DXA },
      columnWidths: [LABEL_COL, PAGE_COL],
      borders: {
        top:    { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left:   { style: BorderStyle.NONE },
        right:  { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical:   { style: BorderStyle.NONE },
      },
      rows: [new TableRow({
        children: [
          // Label cell — dashed bottom border provides the leader line
          new TableCell({
            borders: { ...noOtherBorders, ...dashedBottom },
            width: { size: LABEL_COL, type: WidthType.DXA },
            margins: { top: before, bottom: 30, left: indent, right: 160 },
            children: [new Paragraph({
              spacing: { after: 0 },
              children: [run(label, { size: labelSize, bold: labelBold, italics: italic, color: labelColor })],
            })],
          }),
          // Page number cell — right-aligned, no border
          new TableCell({
            borders: { ...noOtherBorders, ...dashedBottom },
            width: { size: PAGE_COL, type: WidthType.DXA },
            margins: { top: before, bottom: 30, left: 80, right: 0 },
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { after: 0 },
              children: [run(pageNum != null ? String(pageNum) : '', { size: labelSize, bold: labelBold, color: MUTED })],
            })],
          }),
        ],
      })],
    });
  }

  // Section header row (Part label) — no page number, visually separates groups
  function tocSection({ partEyebrow, title, pageNum, color }) {
    return [
      new Paragraph({
        spacing: { before: 240, after: 40 },
        children: [run(partEyebrow, { size: 14, bold: true, color: color || ORANGE, allCaps: true, characterSpacing: 60 })],
      }),
      tocRow({ label: title, labelBold: true, labelSize: 24, pageNum, after: 80 }),
    ];
  }

  const rows = [];

  // Introduction (now includes snapshot as subsections)
  rows.push(tocRow({ label: 'Introduction', labelBold: true, pageNum: offsets.introPage, after: 80 }));
  rows.push(tocRow({ label: 'Snapshot: communication dimensions', pageNum: offsets.snapshotPage, indent: 280, labelSize: 20, labelColor: MUTED }));
  rows.push(tocRow({ label: 'Snapshot: expectations alignment',   pageNum: offsets.snapshotPage, indent: 280, labelSize: 20, labelColor: MUTED, after: 180 }));

  // Part 1 — Insights (was Part 2)
  rows.push(...tocSection({ partEyebrow: 'PART 1', title: 'Exercise by Exercise Insights', pageNum: offsets.insightsPage, color: BLUE }));
  offsets.domainPages.forEach(dp => {
    rows.push(tocRow({ label: dp.title, pageNum: dp.page, indent: 280, labelSize: 20, labelColor: MUTED }));
  });
  rows.push(tocRow({ label: "The Life You're Building",  pageNum: offsets.expPage, indent: 280, labelSize: 20, labelColor: MUTED }));

  // Part 2 — Working Knowledge (was Part 3)
  rows.push(...tocSection({ partEyebrow: 'PART 2', title: 'Working Knowledge', pageNum: offsets.workingKnowledgePage, color: PURPLE }));
  {
    const [typeU, typeP] = partnerTypes(coupleType || {});
    const sameType = typeU === typeP;
    const firstPage = offsets.workingKnowledgePage;

    if (sameType) {
      const momentsPage1 = firstPage + 1;
      const momentsPage2 = firstPage + 2;
      MOMENTS.forEach((m, i) => {
        rows.push(tocRow({
          label: `${i + 1}. ${m.title}`,
          pageNum: i < 3 ? momentsPage1 : momentsPage2,
          indent: 280, labelSize: 20, labelColor: MUTED,
        }));
      });
    } else {
      rows.push(tocRow({
        label: `What ${p} should know about ${u}`,
        pageNum: firstPage + 1,
        indent: 280, labelSize: 20, labelColor: MUTED, italic: true,
      }));
      MOMENTS.forEach((m, i) => {
        rows.push(tocRow({
          label: `${i + 1}. ${m.title}`,
          pageNum: i < 3 ? firstPage + 1 : firstPage + 2,
          indent: 560, labelSize: 18, labelColor: MUTED,
        }));
      });
      rows.push(tocRow({
        label: `What ${u} should know about ${p}`,
        pageNum: firstPage + 4,
        indent: 280, labelSize: 20, labelColor: MUTED, italic: true,
      }));
      MOMENTS.forEach((m, i) => {
        rows.push(tocRow({
          label: `${i + 1}. ${m.title}`,
          pageNum: i < 3 ? firstPage + 4 : firstPage + 5,
          indent: 560, labelSize: 18, labelColor: MUTED,
        }));
      });
    }
  }

  // Part 3 — Priorities (was Part 5)
  rows.push(...tocSection({ partEyebrow: 'PART 3', title: 'Your 3 Priorities', pageNum: offsets.prioritiesPage, color: ORANGE }));
  priorities.forEach((dim, i) => {
    const meta = DIM_META[dim];
    rows.push(tocRow({
      label: `Priority ${i + 1} — ${meta?.label || dim}`,
      pageNum: offsets.prioritiesPage + Math.floor(i / 2),
      indent: 280, labelSize: 20, labelColor: MUTED,
    }));
  });
  rows.push(tocRow({ label: '30-day check-in', pageNum: offsets.prioritiesPage + 2, indent: 280, labelSize: 20, labelColor: MUTED, italic: true }));

  // Part 4 — Conversation Library (was Part 6)
  rows.push(...tocSection({ partEyebrow: 'PART 4', title: 'Conversation Library', pageNum: offsets.conversationPage, color: PURPLE }));
  rows.push(tocRow({ label: 'Five situations, three prompts each', pageNum: offsets.conversationPage, indent: 280, labelSize: 20, labelColor: MUTED }));
  rows.push(tocRow({ label: 'A structured first conversation', pageNum: offsets.conversationPage + 2, indent: 280, labelSize: 20, labelColor: MUTED }));

  // Part 5 — Over Time (was Part 7)
  rows.push(...tocSection({ partEyebrow: 'PART 5', title: 'Over Time', pageNum: offsets.overTimePage, color: GREEN }));
  rows.push(tocRow({ label: 'A letter to a year ago', pageNum: offsets.overTimePage, indent: 280, labelSize: 20, labelColor: MUTED }));

  // Part 6 — Reference Card (was Part 8)
  rows.push(...tocSection({ partEyebrow: 'PART 6', title: 'Reference Card', pageNum: offsets.referencePage, color: GREEN }));

  return [
    pb(),
    ...sps(1),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
      children: [run('CONTENTS', { size: 22, bold: true, color: INK, allCaps: true, characterSpacing: 40 })] }),
    // Gradient rule instead of a solid line
    ...gradRule(ORANGE, [PURPLE, BLUE], { segments: 30, height: 50, before: 0, after: 320 }),
    ...rows,
  ];
}

// Full-page section cover, used as a visual divider between Parts. Intentionally
// minimal — content sits in the lower third of the page, top two-thirds are
// intentionally empty. The blank space is the feature: when readers flip-thumb
// through the workbook, the cover pages stand out as negative space and let
// them navigate to sections by sight.
function buildPartCover(num, title, subtitle, accentColor) {
  const color = accentColor || ORANGE;
  // Each part gets its own gradient — a short run from the accent color to
  // a darker shade of itself for a subtle signature.
  const accentDeep = {
    [ORANGE]: ['D4502D', '9E3618'],
    [BLUE]:   ['1844B8', '0E2880'],
    [PURPLE]: ['7B3FC4', '4E1F85'],
    [GREEN]:  ['0E8C63', '075B40'],
  }[color] || ['555555', '333333'];

  return [
    pb(),
    // Push content into the lower third of the page
    ...sps(14),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
      children: [run(`PART ${num}`, { size: 22, bold: true, color: color, allCaps: true, characterSpacing: 80 })] }),
    // Gradient rule in the part's accent color
    ...gradRule(color, accentDeep, { segments: 30, height: 60, before: 0, after: 200, width: W / 2 }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [run(title, { size: 48, bold: true, color: INK })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
      children: [run(subtitle, { size: 22, italics: true, color: MUTED })] }),
  ];
}

function buildCover(u, p, coupleType) {
  // A three-stop gradient that matches Attune's brand palette: warm orange
  // → plum → deep blue. Two-color orange→blue interpolates through muddy
  // gray, so we route it through plum for a cleaner transition.
  const BRAND_GRAD_FROM = [ORANGE];
  const BRAND_GRAD_TO   = [PURPLE, BLUE];

  return [
    // Top gradient bar
    ...sps(1),
    gradientBar(BRAND_GRAD_FROM, BRAND_GRAD_TO, { segments: 40, height: 180 }),
    ...sps(6),

    // Eyebrow
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
      children: [run('ATTUNE', { size: 22, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }),

    // Large title
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
      children: [run('Relationship Workbook', { size: 72, bold: true, color: INK })] }),

    // Tagline
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [run('Built from your answers.', { size: 26, italics: true, color: MUTED })] }),

    ...sps(6),

    // Prepared for + full names
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
      children: [run('PREPARED FOR', { size: 15, color: MUTED, allCaps: true, characterSpacing: 60, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
      children: [run(`${u} & ${p}`, { size: 40, bold: true, color: INK })] }),

    // Couple type (if present)
    ...(coupleType ? [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
        children: [run(coupleType.name, { size: 24, italics: true, color: ORANGE })] }),
    ] : []),

    // Bottom gradient bar + URL
    ...sps(10),
    gradientBar(BRAND_GRAD_TO.slice().reverse(), BRAND_GRAD_FROM, { segments: 40, height: 80 }),
    ...sps(1),
    para('attune-relationships.com', { center: true, color: MUTED, size: 18 }),
  ];
}

function buildIntro(u, p) {
  return [
    pb(),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run('Introduction')] }),
    para(`This workbook was built from ${u} and ${p}'s actual exercise answers.`, { size: 22, color: MUTED, after: 120 }),
    para(`Every insight, gap level, and weekly practice was selected because it reflects your specific combination of scores. The snapshot below summarizes where the two of you are aligned and where the gaps are. The rest of the workbook explores what to do about it.`,
      { size: 22, after: 200 }),

    accentBox('A note on the scores',
      `Neither end of any dimension is better. The gap between your scores is the thing worth understanding. A large gap means more translation is required between the two of you — and more to gain from explicit conversation.`,
      'FFF3E0', ORANGE),
    sp(),
    accentBox('How to read this together',
      `Both of you should read independently before discussing. Your reflections will be most honest when you\'re not reading over each other\'s shoulders. Everything here applies equally to both of you.`,
      'F0F9FF', BLUE),
  ];
}

function buildSnapshot(u, p, scores, partnerScores, coupleType, expGaps) {
  const dimRows = DIMS.map(d => {
    const meta = DIM_META[d];
    const s1 = (scores[d] || 3).toFixed(1);
    const s2 = (partnerScores[d] || 3).toFixed(1);
    const gap = Math.abs((scores[d] || 3) - (partnerScores[d] || 3));
    const label = gapLabel(gap);
    const color = gapColour(gap);
    return new TableRow({ children: [
      tc(meta.label, 2800, { size: 18 }),
      tc(s1 + ' / 5', 1000, { color: ORANGE, size: 18 }),
      tc(s2 + ' / 5', 1000, { color: ORANGE, size: 18 }),
      tc(gap.toFixed(1), 700, { color: color, bold: true, size: 18 }),
      tc(label, 1800, { color: color, size: 18 }),
      tc(scoreBar(Number(s1)) + ' / ' + scoreBar(Number(s2)), 2060, { size: 16, color: MUTED }),
    ]});
  });

  const expRows = expGaps.map(eg => new TableRow({ children: [
    tc(eg.label, 2800, { size: 18 }),
    tc(answerLabel(eg.yourAnswer, u, p), 2400, { size: 18 }),
    tc(answerLabel(eg.partnerAnswer, u, p), 2400, { size: 18 }),
    tc(eg.aligned ? '\u2713 Aligned' : '\u25CF Gap', 1760, { color: eg.aligned ? GREEN : ORANGE, bold: true, size: 18 }),
  ]}));

  // Compact snapshot: renders on a single page after the intro.
  // Couple type appears as a single inline line (name + tagline), not a
  // detailed table. The detailed couple-type narrative lives in Part 2
  // onwards where there's room to unpack it properly.
  const coupleTypeLine = coupleType ? [
    sp(),
    new Paragraph({
      spacing: { after: 80 },
      border: { left: { style: BorderStyle.SINGLE, size: 24, color: coupleType.color?.replace('#','') || GREEN, space: 12 } },
      children: [
        run('YOUR COUPLE TYPE  ', { size: 14, bold: true, color: MUTED, allCaps: true, characterSpacing: 60 }),
        run(coupleType.name, { size: 22, bold: true, color: coupleType.color?.replace('#','') || GREEN }),
      ],
    }),
    ...(coupleType.tagline ? [new Paragraph({
      spacing: { after: 240 },
      border: { left: { style: BorderStyle.SINGLE, size: 24, color: coupleType.color?.replace('#','') || GREEN, space: 12 } },
      children: [run(coupleType.tagline, { size: 18, italics: true, color: MUTED })],
    })] : []),
  ] : [];

  return [
    pb(),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run('Your Snapshot', { color: ORANGE })] }),
    para(`Where ${u} and ${p} are aligned — and where the gaps are.`, { size: 20, color: MUTED, after: 200 }),

    ...coupleTypeLine,

    eyebrow('Communication dimensions', ORANGE),
    new Table({
      width: { size: W, type: WidthType.DXA }, columnWidths: [2800, 1000, 1000, 700, 1800, 2060],
      rows: [
        new TableRow({ children: [hc('Dimension', 2800, INK), hc(`${u}`, 1000, ORANGE), hc(`${p}`, 1000, ORANGE), hc('Gap', 700, ORANGE), hc('Alignment', 1800, ORANGE), hc('Score bars', 2060, INK)] }),
        ...dimRows,
      ]
    }),
    sp(),
    eyebrow('Expectations alignment', BLUE),
    new Table({
      width: { size: W, type: WidthType.DXA }, columnWidths: [2800, 2400, 2400, 1760],
      rows: [
        new TableRow({ children: [hc('Area', 2800, INK), hc(u, 2400, BLUE), hc(p, 2400, BLUE), hc('Result', 1760, INK)] }),
        ...expRows,
      ]
    }),
    sp(),
  ];
}

function buildOneDimension(dim, u, p, score1, score2) {
  const meta   = DIM_META[dim];
  const content = DIM_CONTENT[dim];
  const gap    = Math.abs(score1 - score2);
  const isClose = gap < 1.5;
  const color  = meta.color || ORANGE;

  // Personalise text
  const mainText = fill(isClose ? content.closeText : content.gapText, u, p);
  const thisWeek = fill(content.thisWeek, u, p);

  const result = [];
  result.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [run(meta.label, { color })] }));

  // Score banner
  result.push(new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [2600, 1700, 1700, 1700, 1560],
    rows: [new TableRow({ children: [
      hc(meta.label, 2600, color),
      hc(`${u}: ${score1.toFixed(1)} / 5`, 1700, '555555'),
      hc(`${p}: ${score2.toFixed(1)} / 5`, 1700, '555555'),
      hc(`Gap: ${gap.toFixed(1)}`, 1700, gapColour(gap)),
      hc(gapLabel(gap), 1560, gapColour(gap)),
    ]})]
  }));
  result.push(sp());

  // Score bar visual
  result.push(new Paragraph({
    spacing: { after: 80 },
    children: [
      run(meta.left + '  ', { size: 18, color: MUTED }),
      run(scoreBar(score1) + ' ' + u, { size: 18, color: ORANGE }),
      run('   ', { size: 18 }),
      run(scoreBar(score2) + ' ' + p, { size: 18, color: BLUE }),
      run('  ' + meta.right, { size: 18, color: MUTED }),
    ]
  }));
  result.push(sp());

  // What this means — only the relevant gap level text
  result.push(eyebrow(`What this means for ${u} and ${p}`, color));
  result.push(accentBox(null, mainText, isClose ? 'F0FDF9' : 'FFF8F0', isClose ? GREEN : ORANGE));
  result.push(sp());

  // Reflection prompts
  result.push(eyebrow('Reflection prompts', color));
  content.prompts.forEach(pr => result.push(checkItem(fill(pr, u, p))));
  result.push(sp());

  // Try this week
  result.push(accentBox('Try this week', thisWeek, 'F0F9FF', color));
  result.push(sp());

  // Referenceable "When this shows up" callout — turns each dimension page
  // from explanation into a reference users can flip back to during a
  // specific moment. Placeholder copy; final content will be in
  // _workbook-content.js as a per-dimension "whenThisShowsUp" field.
  result.push(accentBox(
    'When this shows up',
    PH(`specific, referenceable guidance for ${meta.label.toLowerCase()} — one short paragraph telling ${u} and ${p} what to do the next time this dimension creates friction in a real moment`),
    'FFFDF5', MUTED));
  result.push(sp());

  // Notes space
  result.push(new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W],
    rows: [
      new TableRow({ children: [tc(`Notes for ${meta.label}:`, W, { bold: true, fill: 'FAFAF8', color: MUTED, size: 18 })] }),
      new TableRow({ children: [tc('\n\n\n', W)] }),
    ]
  }));
  result.push(sp());
  result.push(hr(STONE, 2));

  return result;
}

// Domain group headers
const DOMAIN_ORDER = [
  { title: 'Your Inner Worlds',          color: PURPLE, dims: ['energy','expression','closeness'] },
  { title: 'How You Connect Day to Day', color: ORANGE, dims: ['love','needs','bids'] },
  { title: 'When Things Get Hard',       color: BLUE,   dims: ['conflict','stress','repair','feedback'] },
];

function buildInsights(u, p, scores, partnerScores) {
  // Compute per-dimension gaps. Part 2 only covers dimensions where the gap
  // is meaningful — aligned dimensions don't need guidance, and including
  // them would dilute the focus.
  const GAP_THRESHOLD = 1.0;  // below this, the partners are already close
  const gapsByDim = {};
  DIMS.forEach(d => {
    gapsByDim[d] = Math.abs((scores[d] || 3) - (partnerScores[d] || 3));
  });

  // For each domain group, keep only the dimensions that have a real gap.
  // If a domain has no gap dimensions at all, skip the whole group.
  const domainsToShow = DOMAIN_ORDER
    .map(domain => ({
      ...domain,
      dims: domain.dims.filter(d => gapsByDim[d] >= GAP_THRESHOLD),
    }))
    .filter(domain => domain.dims.length > 0);

  const result = [
    pb(),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run('Part 1 \u2014 Exercise by Exercise Insights')] }),
    para(`Each communication dimension where ${u} and ${p} showed a meaningful gap is explored in depth here. Dimensions where you're already closely aligned aren't covered — no guidance is needed where you're in sync.`,
      { size: 24, color: MUTED }),
    sp(),
  ];

  if (domainsToShow.length === 0) {
    result.push(sp());
    result.push(accentBox(
      'A rare finding',
      `${u} and ${p}'s answers are aligned across every communication dimension. Skip ahead to Part 3 — the priorities there are drawn from the smaller gaps and from dimensions with the highest downstream influence.`,
      'F0FDF9', GREEN));
    return result;
  }

  domainsToShow.forEach(domain => {
    result.push(pb());
    result.push(hr(domain.color, 12));
    result.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run(domain.title, { color: domain.color })] }));
    result.push(sp());
    domain.dims.forEach(dim => {
      result.push(...buildOneDimension(dim, u, p, scores[dim] || 3, partnerScores[dim] || 3));
    });
  });

  // Expectations domains
  result.push(pb());
  result.push(hr(GREEN, 12));
  result.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run('The Life You\'re Building', { color: GREEN })] }));
  result.push(sp());

  return result;
}

function buildExpDomains(u, p, expGaps) {
  const result = [];
  expGaps.forEach(eg => {
    const domain = EXP_DOMAINS.find(d => d.key === eg.key);
    if (!domain) return;
    const isClose = eg.aligned;
    const mainText = fill(isClose ? domain.closeText : domain.gapText, u, p);

    result.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [run(domain.label, { color: GREEN })] }));

    // Answer comparison
    result.push(new Table({
      width: { size: W, type: WidthType.DXA }, columnWidths: [2200, 2800, 2800, 1560],
      rows: [new TableRow({ children: [
        hc(domain.label, 2200, GREEN),
        hc(`${u}: ${answerLabel(eg.yourAnswer, u, p)}`, 2800, '555555'),
        hc(`${p}: ${answerLabel(eg.partnerAnswer, u, p)}`, 2800, '555555'),
        hc(eg.aligned ? '\u2713 Aligned' : 'Gap', 1560, eg.aligned ? GREEN : ORANGE),
      ]})]
    }));
    result.push(sp());

    result.push(eyebrow(`What this means for ${u} and ${p}`, GREEN));
    result.push(accentBox(null, mainText, isClose ? 'F0FDF9' : 'F0FFF8', isClose ? GREEN : ORANGE));
    result.push(sp());
    result.push(accentBox('Try this week', fill(domain.thisWeek, u, p), 'F0F9FF', GREEN));
    result.push(sp());
    result.push(hr(STONE, 2));
  });
  return result;
}

function buildPriorities(u, p, scores, partnerScores, priorities) {
  return [
    pb(),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run('Part 3 \u2014 Your 3 Priorities')] }),
    para(`Where ${u} and ${p} have the most to gain — identified from your actual scores.`, { size: 24, color: MUTED }),
    sp(),
    para('These three dimensions showed the largest gaps in your results, or have the highest downstream influence based on your specific combination. Start here.'),
    sp(),

    ...priorities.flatMap((dim, i) => {
      const meta    = DIM_META[dim];
      const content = DIM_CONTENT[dim];
      const s1 = scores[dim] || 3, s2 = partnerScores[dim] || 3;
      const gap = Math.abs(s1 - s2);
      const thisWeek = fill(content.thisWeek, u, p);
      const gapText  = fill(content.gapText, u, p);

      return [
        hr(ORANGE, 6),
        para(`Priority ${i + 1} \u2014 ${meta.label}`, { bold: true, size: 28, color: ORANGE }),
        new Table({
          width: { size: W, type: WidthType.DXA }, columnWidths: [2600, 6760],
          rows: [
            new TableRow({ children: [tc('Dimension', 2600, { bold: true, fill: 'FFF8F0' }), tc(meta.label, 6760)] }),
            new TableRow({ children: [tc('Scores', 2600, { bold: true, fill: 'FFF8F0' }), tc(`${u}: ${s1.toFixed(1)} / 5   ·   ${p}: ${s2.toFixed(1)} / 5   ·   Gap: ${gap.toFixed(1)}  (${gapLabel(gap)})`, 6760)] }),
            new TableRow({ children: [tc('What this means', 2600, { bold: true, fill: 'FFF8F0' }), tc(gapText, 6760, { color: '444444' })] }),
            new TableRow({ children: [tc('Try this week', 2600, { bold: true, fill: 'FFF8F0' }), tc(thisWeek, 6760, { italics: true })] }),
            new TableRow({ children: [tc('Our commitment', 2600, { bold: true, fill: 'FFF8F0' }), tc('Write what you\'re each committing to here:\n\n\n', 6760)] }),
            new TableRow({ children: [tc('Check-in date', 2600, { bold: true, fill: 'FFF8F0' }), tc('We\'ll revisit this on: _____________________', 6760)] }),
          ]
        }),
        ...sps(2),
      ];
    }),
  ];
}

function buildConversationGuide(u, p, priorities) {
  const p1 = DIM_META[priorities[0]]?.label || '';
  const p2 = DIM_META[priorities[1]]?.label || '';
  const p3 = DIM_META[priorities[2]]?.label || '';

  return [
    pb(),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run('Conversation Guide')] }),
    para(`A structured first conversation for ${u} and ${p}. Use this together — with or without a therapist. Budget 60\u201390 minutes.`, { size: 24, color: MUTED }),
    sp(),
    accentBox('Before you start', `Find a time when neither of you is depleted, rushed, or already charged. Put phones away. Have water. This isn't a fight — it's a structured conversation about things that matter. The goal is understanding, not resolution. You don't need to solve everything today.`, 'F0F9FF', BLUE),
    sp(),

    hr(ORANGE, 8),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run('Phase 1 \u2014 Opening   (10 min)', { color: ORANGE })] }),
    para('Each person answers these two questions out loud. Don\'t respond to each other yet — just listen.'),
    sp(),
    numItem('What\'s one thing you were curious or nervous about going into these exercises?'),
    numItem(`What do you most want to understand better about ${u === 'you' ? 'your partner' : p} after doing this?`),
    sp(),

    hr(BLUE, 8),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run('Phase 2 \u2014 What Resonated   (15 min)', { color: BLUE })] }),
    para('Look at your Snapshot together. Each person takes a turn:'),
    sp(),
    numItem('What result surprised you most — about yourself or about your partner?'),
    numItem('What result felt most accurate to your experience of this relationship?'),
    numItem('Is there anything in the results you disagree with or want to push back on?'),
    sp(),
    accentBox('Note', 'Resist the urge to explain or correct. The goal is hearing how each person experienced the process — not arriving at the right interpretation.', 'FFF3E0', ORANGE),
    sp(),

    hr(GREEN, 8),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run('Phase 3 \u2014 Your 3 Priorities   (20 min)', { color: GREEN })] }),
    para(`Walk through ${p1}, ${p2}, and ${p3} from Part 3. For each one:`),
    sp(),
    numItem('Read the dimension description aloud.'),
    numItem('Each person describes their experience of this dimension — a recent moment where it showed up.'),
    numItem('Together, name one thing you want to do differently. Be specific. Write it in Part 3.'),
    sp(),
    accentBox('Keep it small', 'Don\'t try to solve everything. Pick one action per priority that\'s small enough to actually do this week. Small and specific beats ambitious and vague.', 'F0F9FF', BLUE),
    sp(),

    hr(PURPLE, 8),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run('Phase 4 \u2014 What\'s Going Well   (10 min)', { color: PURPLE })] }),
    para('This phase is deliberate. It\'s easy to spend all the time on gaps.'),
    sp(),
    numItem('Name three specific things that have worked well in this relationship — things you want to protect.'),
    numItem('Each person names something their partner does that they haven\'t said thank you for specifically.'),
    numItem('Name one thing about how your partner is wired that you genuinely appreciate — something the results helped you see.'),
    sp(),

    hr(MUTED, 8),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run('Phase 5 \u2014 Closing & Next Steps   (5 min)', { color: MUTED })] }),
    numItem(`State your three priorities and the one action each of you is committing to this week.`),
    numItem('Set a date — within two weeks — to briefly check in on how those actions landed.'),
    numItem('Decide together: will you work through Part 2 on your own, together, or with a facilitator?'),
    sp(),
    hr(STONE),
    sp(),
    para('After the conversation — write briefly:', { bold: true }),
    sp(),
    new Table({
      width: { size: W, type: WidthType.DXA }, columnWidths: [W],
      rows: [
        new TableRow({ children: [tc('One thing I want to remember from this conversation:', W, { bold: true, fill: 'FFFDF9' })] }),
        new TableRow({ children: [tc('\n\n\n', W)] }),
        new TableRow({ children: [tc('One thing I want to do differently starting now:', W, { bold: true, fill: 'FFFDF9' })] }),
        new TableRow({ children: [tc('\n\n\n', W)] }),
        new TableRow({ children: [tc('One thing I appreciate about my partner that I said out loud today:', W, { bold: true, fill: 'FFFDF9' })] }),
        new TableRow({ children: [tc('\n\n\n', W)] }),
      ]
    }),
  ];
}

function buildReferenceCard(u, p, coupleType, priorities) {
  const thickBrd = color => ({ style: BorderStyle.THICK, size: 24, color: color || INK });
  const sideBrd = { style: BorderStyle.SINGLE, size: 4, color: STONE };

  const typeName = coupleType?.name || '_________________';
  const typeNote = coupleType ? fill(String(coupleType.tagline || ''), u, p) : '';

  const priorityNames = priorities.slice(0, 3).map(d => DIM_META[d]?.label || '');

  return [
    pb(),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run('Part 6 \u2014 Reference Card')] }),
    para('Print on cardstock and cut along the dotted line. Put it on your fridge.', { color: MUTED }),
    sp(),
    para('\u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 CUT HERE \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7', { color: MUTED, italics: true, size: 16 }),
    sp(),

    // The card
    new Table({
      width: { size: W, type: WidthType.DXA }, columnWidths: [W],
      rows: [
        // Header
        new TableRow({ children: [new TableCell({
          borders: { top: thickBrd(INK), bottom: { style: BorderStyle.NONE }, left: thickBrd(INK), right: thickBrd(INK) },
          shading: { fill: INK, type: ShadingType.CLEAR }, margins: { top: 260, bottom: 220, left: 400, right: 400 },
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [run('ATTUNE', { size: 17, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [run(`${u} & ${p}`, { size: 30, bold: true, color: 'FFFFFF' })] }),
          ]
        })] }),

        // Three-column body
        new TableRow({ children: [new TableCell({
          borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: thickBrd(INK), right: thickBrd(INK) },
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          children: [new Table({
            width: { size: W, type: WidthType.DXA }, columnWidths: [2960, 2960, 3440],
            rows: [new TableRow({ children: [
              // Column 1: Couple type
              new TableCell({
                borders: { ...noBrds, right: sideBrd },
                width: { size: 2960, type: WidthType.DXA },
                shading: { fill: 'F5F4F0', type: ShadingType.CLEAR },
                margins: { top: 280, bottom: 280, left: 320, right: 240 },
                children: [
                  new Paragraph({ spacing: { after: 100 }, children: [run('YOUR COUPLE TYPE', { size: 13, bold: true, color: ORANGE, allCaps: true, characterSpacing: 40 })] }),
                  new Paragraph({ spacing: { after: 80 }, children: [run(typeName, { size: 22, bold: true, color: INK })] }),
                  new Paragraph({ spacing: { after: 0 }, children: [run(typeNote, { size: 17, italics: true, color: MUTED })] }),
                ],
              }),
              // Column 2: Priorities
              new TableCell({
                borders: { ...noBrds, right: sideBrd },
                width: { size: 2960, type: WidthType.DXA },
                margins: { top: 280, bottom: 280, left: 260, right: 240 },
                children: [
                  new Paragraph({ spacing: { after: 120 }, children: [run('OUR 3 PRIORITIES', { size: 13, bold: true, color: BLUE, allCaps: true, characterSpacing: 40 })] }),
                  ...priorityNames.flatMap((name, i) => [
                    new Paragraph({ spacing: { after: 40 }, children: [run(`${i+1}.  ${name}`, { size: 18, bold: true, color: INK })] }),
                    new Paragraph({ spacing: { after: 160 }, children: [run('    This week: ______________', { size: 15, italics: true, color: MUTED })] }),
                  ]),
                ],
              }),
              // Column 3: Phrases
              new TableCell({
                borders: noBrds,
                width: { size: 3440, type: WidthType.DXA },
                shading: { fill: 'F5F4F0', type: ShadingType.CLEAR },
                margins: { top: 280, bottom: 280, left: 260, right: 320 },
                children: [
                  new Paragraph({ spacing: { after: 120 }, children: [run('PHRASES TO TRY', { size: 13, bold: true, color: GREEN, allCaps: true, characterSpacing: 40 })] }),
                  ...[
                    '"I need space \u2014 back by ___."',
                    '"I need to talk this through now."',
                    '"Fix it, or just be here?"',
                    '"What would help me most is ___."',
                    '"Are we actually okay?"',
                    '"I noticed that \u2014 it matters."',
                  ].map(phrase => new Paragraph({ spacing: { after: 100 }, children: [run(phrase, { size: 17, italics: true, color: '333333' })] })),
                ],
              }),
            ]})]
          })]
        })] }),

        // Footer
        new TableRow({ children: [new TableCell({
          borders: { top: { style: BorderStyle.NONE }, bottom: thickBrd(INK), left: thickBrd(INK), right: thickBrd(INK) },
          shading: { fill: INK, type: ShadingType.CLEAR }, margins: { top: 160, bottom: 160, left: 400, right: 400 },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [run('attune-relationships.com  \u00b7  Come back to this. Build the habit.', { size: 16, color: '888888' })] })]
        })] }),
      ]
    }),

    sp(),
    para('\u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 CUT HERE \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7', { color: MUTED, italics: true, size: 16 }),
  ];
}

// ─── Working Knowledge (Part 3) ──────────────────────────────────────────────
// For each partner, one page with six recurring "moments" and specific
// guidance for the other partner on what to do in each. Cross-type couples
// get two pages (one per partner). Same-type couples get one combined page.

const MOMENTS = [
  { key: 'hard_workday',     title: 'After a hard workday' },
  { key: 'quiet_worry',      title: "When they're worried but haven't said it" },
  { key: 'during_conflict',  title: 'During a disagreement' },
  { key: 'after_conflict',   title: 'After a disagreement' },
  { key: 'wanting_closeness', title: 'When they want to feel close' },
  { key: 'external_stress',  title: 'When stress is coming from outside the relationship' },
];

// Derive each partner's individual type letter from the couple type id
// (e.g. 'WX' → ['W', 'X'], 'WW' → ['W', 'W']).
function partnerTypes(coupleType) {
  if (!coupleType?.id || coupleType.id.length !== 2) return ['—', '—'];
  return [coupleType.id[0], coupleType.id[1]];
}

function buildMomentCard(moment, subjectName, otherName, typeLetter) {
  // Each moment renders as a titled block with five short labeled sections:
  // THE MOMENT, WHAT'S HAPPENING, WHAT NOT TO DO, WHAT WORKS, PHRASE THAT LANDS.
  // Content is placeholder for now — final copy will come from a scene
  // library keyed to (moment × individualType).
  const rowLabel = (label, color) => new Paragraph({
    spacing: { before: 100, after: 60 },
    children: [run(label, { size: 14, bold: true, color: color || ORANGE, allCaps: true, characterSpacing: 50 })],
  });
  const rowBody = (text, opts = {}) => new Paragraph({
    spacing: { after: 120 },
    children: [run(text, { size: 20, color: opts.color || INK, italics: !!opts.italics })],
  });

  return [
    // Moment title bar
    new Table({
      width: { size: W, type: WidthType.DXA }, columnWidths: [600, W - 600],
      rows: [new TableRow({ children: [
        new TableCell({ borders: noBrds, width: { size: 600, type: WidthType.DXA },
          shading: { fill: PURPLE, type: ShadingType.CLEAR }, margins: { top: 120, bottom: 120, left: 160, right: 0 },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [run(moment.number || '', { size: 24, bold: true, color: 'FFFFFF' })] })] }),
        new TableCell({ borders: noBrds, width: { size: W - 600, type: WidthType.DXA },
          shading: { fill: 'F7F3FC', type: ShadingType.CLEAR }, margins: { top: 120, bottom: 120, left: 240, right: 200 },
          children: [new Paragraph({ spacing: { after: 0 }, children: [run(moment.title, { size: 24, bold: true, color: INK })] })] }),
      ]})],
    }),
    sp(),

    rowLabel('THE MOMENT', MUTED),
    rowBody(PH(`1 sentence: concrete setup for "${moment.title.toLowerCase()}" — e.g. "${subjectName} comes home after a tough day and goes quiet."`)),

    rowLabel(`WHAT'S HAPPENING FOR ${subjectName.toUpperCase()}`, PURPLE),
    rowBody(PH(`2–3 sentences keyed to Type ${typeLetter}: what's actually going on inside ${subjectName}, why the surface behavior looks the way it does, grounded in their specific communication style.`)),

    rowLabel('WHAT NOT TO DO', 'C8402A'),
    rowBody(PH(`1 sentence: the natural but wrong move for ${otherName} to make in this moment.`)),

    rowLabel('WHAT WORKS', GREEN),
    rowBody(PH(`1–2 sentences: the specific action ${otherName} should take instead.`)),

    rowLabel('PHRASE THAT LANDS', BLUE),
    rowBody(PH(`literal line for ${otherName} to say to ${subjectName} in this moment`), { italics: true, color: BLUE }),

    hr(STONE, 2),
  ];
}

function buildWorkingKnowledge(u, p, coupleType) {
  const [typeU, typeP] = partnerTypes(coupleType);
  const sameType = typeU === typeP;

  const introPage = [
    pb(),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run('Part 2 \u2014 Working Knowledge')] }),
    para(
      sameType
        ? `${u} and ${p} share the same communication type (${typeU}). That means the six moments below apply to both of you — use this page as a mutual reference.`
        : `Two pages. One is the working knowledge ${p} needs about ${u}. The other is what ${u} needs about ${p}. Read your own first, then read your partner's aloud together.`,
      { size: 22, color: MUTED, after: 200 }),
    accentBox(
      'How to use this section',
      `Six moments that come up again and again in every long-term relationship. Each one gives you specific guidance for what to do, what not to do, and a phrase that actually lands. When a hard moment shows up in real life, flip to the moment that matches. The goal is not to memorize it — it's to have the language ready before you need it.`,
      'FFF8F0', ORANGE),
  ];

  if (sameType) {
    return [
      ...introPage,
      pb(),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run(`Six Moments · Type ${typeU}`, { color: PURPLE })] }),
      para(PH(`1 sentence framing these moments for a same-type couple — both ${u} and ${p} are Type ${typeU}, so the dynamic here is about what both of you need to know about how your shared type shows up.`),
        { size: 20, color: MUTED, after: 240 }),
      ...MOMENTS.flatMap((m, i) => buildMomentCard({ ...m, number: `${i + 1}` }, `${u} & ${p}`, 'each other', typeU)),
    ];
  }

  // Cross-type: one page for each partner
  return [
    ...introPage,

    pb(),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run(`What ${p} should know about ${u}`, { color: PURPLE })] }),
    para(`Six moments where ${u} (Type ${typeU}) benefits from ${p} responding in a specific way. Not generic relationship advice — situational guidance keyed to how ${u} is actually wired.`,
      { size: 20, color: MUTED, after: 240 }),
    ...MOMENTS.flatMap((m, i) => buildMomentCard({ ...m, number: `${i + 1}` }, u, p, typeU)),

    pb(),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run(`What ${u} should know about ${p}`, { color: PURPLE })] }),
    para(`Same structure, mirrored. Six moments where ${p} (Type ${typeP}) benefits from ${u} responding in a specific way.`,
      { size: 20, color: MUTED, after: 240 }),
    ...MOMENTS.flatMap((m, i) => buildMomentCard({ ...m, number: `${i + 1}` }, p, u, typeP)),
  ];
}

// ─── 30-day check-in (embedded at end of Priorities) ────────────────────────
function buildPriorityCheckIn(u, p, priorities) {
  return [
    pb(),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run('Check in on these priorities — 30 days from now', { color: ORANGE })] }),
    para(`Come back to this page in about a month. For each of your three priorities, answer the questions honestly. Write in the workbook — that's what it's for.`,
      { size: 22, color: MUTED, after: 240 }),

    ...priorities.flatMap((dim, i) => {
      const meta = DIM_META[dim];
      return [
        new Paragraph({ spacing: { before: 200, after: 80 }, children: [run(`Priority ${i + 1} — ${meta.label}`, { size: 24, bold: true, color: ORANGE })] }),
        new Table({
          width: { size: W, type: WidthType.DXA }, columnWidths: [W],
          rows: [
            new TableRow({ children: [tc('What changed (if anything) over the last 30 days?', W, { bold: true, fill: 'FAFAF8', color: MUTED, size: 18 })] }),
            new TableRow({ children: [tc('\n\n', W)] }),
            new TableRow({ children: [tc(`Did the weekly practice we committed to actually happen? What got in the way?`, W, { bold: true, fill: 'FAFAF8', color: MUTED, size: 18 })] }),
            new TableRow({ children: [tc('\n\n', W)] }),
            new TableRow({ children: [tc('One small thing to try differently in the next 30 days:', W, { bold: true, fill: 'FAFAF8', color: MUTED, size: 18 })] }),
            new TableRow({ children: [tc('\n\n', W)] }),
          ]
        }),
      ];
    }),
  ];
}

// ─── Conversation Library (Part 6) ───────────────────────────────────────────
// Situational conversation starters — 8 situations every couple faces,
// each with 3 prompts personalized to this couple's type. Final prompts
// will be pulled from a reviewed master library (~40-60 prompts total,
// tagged by situation and couple type).

const SITUATIONS = [
  { key: 'quiet_night',    title: 'At dinner on a quiet night',             blurb: 'Low-stakes depth.' },
  { key: 'after_hard_week', title: 'After a hard week',                     blurb: 'Mutual care.' },
  { key: 'one_is_off',     title: "When one of you is off but won't say why", blurb: 'Gentle excavation.' },
  { key: 'before_hard',    title: 'Before a difficult conversation',        blurb: 'Setting it up.' },
  { key: 'tired_of_logistics', title: "When you're tired of talking about logistics", blurb: 'Romance restoration.' },
];

function buildConversationLibrary(u, p, coupleType, priorities) {
  const typeName = coupleType?.name || 'your couple type';

  // Each situation gets 3 curated prompts — content placeholder, final
  // selection comes from master library tagged by couple type.
  const situationBlock = (s) => [
    new Paragraph({ spacing: { before: 280, after: 60 }, children: [run(s.title, { size: 24, bold: true, color: INK })] }),
    new Paragraph({ spacing: { after: 160 }, children: [run(s.blurb, { size: 18, italics: true, color: MUTED })] }),
    ...[1, 2, 3].map(n => new Paragraph({
      spacing: { after: 120 },
      indent: { left: 280 },
      children: [
        run('• ', { size: 22, color: BLUE, bold: true }),
        run(PH(`prompt ${n} curated for ${typeName}, matched to "${s.title.toLowerCase()}"`), { size: 22, italics: true, color: INK }),
      ],
    })),
    hr(STONE, 2),
  ];

  // The structured first conversation (old Part 4 content) gets folded
  // into this part as a separate block at the end — it does a similar job
  // but is more scaffolded.
  const structuredIntro = [
    pb(),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run('A structured first conversation', { color: PURPLE })] }),
    para(`If you want a guided path through your three priorities together, this is it. Roughly 60 minutes.`,
      { size: 22, color: MUTED, after: 200 }),

    accentBox('Ground rules before you start',
      `Both of you take turns. No interrupting. When one of you is talking, the other's job is to understand — not to respond, prepare a counter, or fix anything. You can use the reference card at the back as a prompt.`,
      'F7F3FC', PURPLE),
    sp(),

    ...priorities.map((dim, i) => {
      const meta = DIM_META[dim];
      return new Paragraph({ spacing: { before: 240, after: 80 },
        children: [run(`Phase ${i + 1} — ${meta.label} (20 min)`, { size: 22, bold: true, color: ORANGE })] });
    }).flatMap(p => [p,
      para(PH(`3–4 guiding questions for this phase, tailored to the specific dimension.`), { size: 20, color: MUTED, after: 160 }),
      hr(STONE, 2),
    ]),
  ];

  return [
    pb(),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run('Part 4 \u2014 Conversation Library')] }),
    para(`Five situations every couple faces, with three prompts each — chosen to match ${typeName}. Flip to the situation you're in. Pick one. The prompt does the work.`,
      { size: 22, color: MUTED, after: 200 }),
    accentBox('How this works',
      `The five situations are the same for every couple. The prompts inside each one are picked based on what couples like yours tend to need in that moment.`,
      'F0F9FF', BLUE),

    ...SITUATIONS.flatMap(situationBlock),

    ...structuredIntro,
  ];
}

// ─── Over Time (Part 6) ──────────────────────────────────────────────────────
// A single dedicated page: write to the version of yourselves who opened
// this workbook a year ago. The 30-day check-in lives embedded in Priorities;
// users who want to retake the exercise can do so on the site any time.

function buildOverTime(u, p, priorities) {
  return [
    pb(),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run('Part 5 \u2014 Over Time', { color: GREEN })] }),
    para(`The workbook is built to be opened more than once.`,
      { size: 22, color: MUTED, after: 120 }),
    para(`You've already got a 30-day check-in in Part 4. The page below is the longer return: a year from now, write to the version of yourselves who opened this workbook today.`,
      { size: 22, after: 240 }),

    accentBox('Before you write',
      `Take a minute before answering. Think about what was different a year ago. What did you wish you'd known? What had been stuck that isn't anymore? What's still stuck?`,
      'F7F3FC', PURPLE),
    sp(),

    accentBox('The prompt',
      `Dear ${u} and ${p} from a year ago — what do you need us to know?`,
      'FFF8F0', ORANGE),
    sp(),

    new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [W],
      rows: [new TableRow({ children: [tc('\n\n\n\n\n\n\n\n\n\n\n\n', W, { fill: 'FAFAF8' })] })] }),
  ];
}

// ─── Gap ranking — find top 3 priorities ─────────────────────────────────────
function rankPriorities(scores, partnerScores) {
  // High-influence dims get a weight bonus even at moderate gap
  const influence = { conflict: 1.4, repair: 1.3, needs: 1.3, stress: 1.2, bids: 1.1 };
  const ranked = DIMS
    .map(d => {
      const gap = Math.abs((scores[d] || 3) - (partnerScores[d] || 3));
      const weight = influence[d] || 1.0;
      return { dim: d, score: gap * weight };
    })
    .sort((a, b) => b.score - a.score);
  return ranked.slice(0, 3).map(r => r.dim);
}

// ─── HTTP handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const {
    userName     = 'Partner A',
    partnerName  = 'Partner B',
    scores       = {},     // { energy: 2.1, expression: 3.8, ... }
    partnerScores = {},
    coupleType   = null,   // { name, tagline, description, nuance, color }
    expGaps      = [],     // [{ key, label, yourAnswer, partnerAnswer, aligned }]
  } = body;

  const u = userName.trim() || 'Partner A';
  const p = partnerName.trim() || 'Partner B';

  // Normalise scores (ensure all dims have a value)
  const s1 = {}, s2 = {};
  DIMS.forEach(d => { s1[d] = Number(scores[d]) || 3; s2[d] = Number(partnerScores[d]) || 3; });

  // Auto-pick priorities
  const priorities = rankPriorities(s1, s2);

  // Compute approximate page offsets so the TOC can show real page numbers.
  const offsets = estimatePageOffsets({ s1, s2, expGaps, priorities });

  // Build document
  const children = [
    ...buildCover(u, p, coupleType),
    ...buildTOC(offsets, priorities, u, p, coupleType),

    // Introduction now includes the Snapshot directly — it's the reference
    // the rest of the workbook is built on, not a separate "part."
    ...buildIntro(u, p),
    ...buildSnapshot(u, p, s1, s2, coupleType, expGaps),

    ...buildPartCover(1, 'Exercise by Exercise Insights',
      `Only the dimensions where the two of you showed a meaningful gap.`, BLUE),
    ...epigraph(
      PH('opening quote for Part 1'),
      PH('Attribution')),
    ...buildInsights(u, p, s1, s2),
    ...buildExpDomains(u, p, expGaps),

    ...buildPartCover(2, 'Working Knowledge',
      `Six moments with each other. Specific language for each.`, PURPLE),
    ...epigraph(
      PH('opening quote for Part 2 — something about knowing another person'),
      PH('Attribution')),
    ...buildWorkingKnowledge(u, p, coupleType),

    ...buildPartCover(3, 'Your 3 Priorities',
      `Where the leverage is highest. Start here.`, ORANGE),
    ...epigraph(
      PH('opening quote for Part 3 — something about focus, leverage, or choosing'),
      PH('Attribution')),
    ...buildPriorities(u, p, s1, s2, priorities),
    ...buildPriorityCheckIn(u, p, priorities),

    ...buildPartCover(4, 'Conversation Library',
      `Words for the situations you'll actually find yourselves in.`, PURPLE),
    ...epigraph(
      PH('opening quote for Part 4 — something about language or talking'),
      PH('Attribution')),
    ...buildConversationLibrary(u, p, coupleType, priorities),

    ...buildPartCover(5, 'Over Time',
      `This workbook is built to be opened more than once.`, GREEN),
    ...epigraph(
      PH('opening quote for Part 5 — something about time, return, or practice'),
      PH('Attribution')),
    ...buildOverTime(u, p, priorities),

    ...buildPartCover(6, 'Reference Card',
      `A half-page summary. Keep it somewhere you'll see it.`, GREEN),
    ...buildReferenceCard(u, p, coupleType, priorities),
  ];

  // Footer with page numbers and a light brand line. Page numbers are
  // generated as a Word field — readers see them live in Word/Pages.
  const docFooter = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: STONE, space: 8 } },
        spacing: { before: 120, after: 0 },
        children: [
          run(`${u} & ${p}   ·   Attune Relationship Workbook   ·   `, { size: 16, color: MUTED }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: INK.substring(0), font: 'Arial', bold: true }),
          run(' / ', { size: 16, color: MUTED }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: MUTED, font: 'Arial' }),
        ],
      }),
    ],
  });

  const doc = new Document({
    numbering: NUMBERING,
    styles: STYLES,
    features: { updateFields: true },
    sections: [{
      properties: { page: PAGE },
      footers: { default: docFooter },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const filename = `Attune_Workbook_${u.replace(/\s+/g,'_')}_and_${p.replace(/\s+/g,'_')}.docx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.status(200).send(buffer);
}
