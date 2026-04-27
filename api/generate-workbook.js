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
  TabStopType, TabStopPosition, LeaderType, Tab, VerticalAlign,
} from 'docx';
import { DIM_META, DIM_CONTENT, EXP_DOMAINS, DIMS, WHEN_THIS_SHOWS_UP } from './_workbook-content.js';

export const config = { runtime: 'nodejs' };

// ─── Colour palette ───────────────────────────────────────────────────────────
const ORANGE = 'E8673A';
const BLUE   = '1B5FE8';
const INK    = '0E0B07';
const MUTED  = '8C7A68';
const STONE  = 'E8DDD0';
const GREEN  = '10B981';
const PURPLE = '9B5DE5';
const NAVY   = '2D2250';   // Attune brand navy — used in portal UI and Reference Card

// ─── Layout ───────────────────────────────────────────────────────────────────
const W = 9360;
const PAGE = {
  size: { width: 12240, height: 15840 },
  // Tighter vertical margins so dim pages can fit a full analysis + two
  // write-in sections without overflowing. Horizontal margins stay at 1"
  // for comfortable line length on the hero's right column.
  margin: { top: 720, right: 1440, bottom: 720, left: 1440 },
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
  spacing: { after: 120 },
  indent: { left: 280 },
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
const noBrd = { style: BorderStyle.NONE };
const noBrds  = { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd };

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
// Lined-paper write-in: N horizontal dotted lines, no outer border, no
// fill. Renders as a borderless table where each row has a dotted
// bottom border — more reliable than paragraphs-with-borders because
// LibreOffice collapses empty paragraphs.
function ruledWriteIn(numLines = 5, opts = {}) {
  const color      = opts.color      || 'C8BEB0';
  const lineHeight = opts.lineHeight || 340;
  const width      = opts.width      || W;
  return new Table({
    width: { size: width, type: WidthType.DXA }, columnWidths: [width],
    borders: {
      top: noBrd, bottom: noBrd, left: noBrd, right: noBrd,
      insideHorizontal: noBrd, insideVertical: noBrd,
    },
    rows: Array.from({ length: numLines }, () => new TableRow({
      height: { value: lineHeight, rule: HeightRule.EXACT },
      cantSplit: false,
      children: [new TableCell({
        borders: {
          top:    noBrd,
          bottom: { style: BorderStyle.DOTTED, size: 4, color, space: 0 },
          left:   noBrd,
          right:  noBrd,
        },
        width: { size: width, type: WidthType.DXA },
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        children: [new Paragraph({ spacing: { after: 0, line: 120, lineRule: 'exact' }, children: [new TextRun('')] })],
      })],
    })),
  });
}

// Labeled ruled write-in: small-caps colored label + optional italic hint
// + lined-paper writing area. Replaces labeledWriteIn / softWriteIn
// wherever we want the "notebook" feel instead of a dashed-border box.
function labeledRuled(label, color, numLines, opts = {}) {
  return [
    new Paragraph({ spacing: { before: opts.beforeLabel ?? 200, after: 80 },
      children: [run(label, { size: 13, bold: true, color, allCaps: true, characterSpacing: 60 })] }),
    ...(opts.hint ? [new Paragraph({ spacing: { after: 100 },
      children: [run(opts.hint, { size: 13, italics: true, color: MUTED })] })] : []),
    ruledWriteIn(numLines, opts),
  ];
}

// Soft editorial card: colored thin left rule + cream-pale fill + content.
// Much less boxy than the previous filled-rectangle-with-stripe treatment.
// The fill color is kept very close to white (cream tones) so the card
// reads as a gentle emphasis rather than a hard container.
const accentBox = (label, text, fill, accent) => {
  const a = accent || ORANGE;
  // Nudge fills toward cream/off-white so they read as softer cards.
  // Any provided fill is respected but very pale is preferred.
  const f = fill || 'FBF8F2';
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W],
    borders: { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd, insideHorizontal: noBrd, insideVertical: noBrd },
    rows: [new TableRow({ children: [
      new TableCell({
        borders: { top: noBrd, bottom: noBrd, right: noBrd,
          left: { style: BorderStyle.SINGLE, size: 16, color: a, space: 6 } },
        width: { size: W, type: WidthType.DXA },
        shading: { fill: f, type: ShadingType.CLEAR },
        margins: { top: 160, bottom: 160, left: 240, right: 240 },
        children: [
          ...(label ? [new Paragraph({ spacing: { after: 60 }, children: [run(label, { size: 14, bold: true, color: a, allCaps: true, characterSpacing: 60 })] })] : []),
          new Paragraph({ spacing: { after: 0 }, children: [run(text, { size: 20, color: INK })] }),
        ] }),
    ]})]
  });
};

// Soft editorial card variant that accepts arbitrary paragraph children.
const accentBoxRich = (label, children, fill, accent) => {
  const a = accent || ORANGE;
  const f = fill || 'FBF8F2';
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W],
    borders: { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd, insideHorizontal: noBrd, insideVertical: noBrd },
    rows: [new TableRow({ children: [
      new TableCell({
        borders: { top: noBrd, bottom: noBrd, right: noBrd,
          left: { style: BorderStyle.SINGLE, size: 16, color: a, space: 6 } },
        width: { size: W, type: WidthType.DXA },
        shading: { fill: f, type: ShadingType.CLEAR },
        margins: { top: 160, bottom: 160, left: 240, right: 240 },
        children: [
          ...(label ? [new Paragraph({ spacing: { after: 100 }, children: [run(label, { size: 14, bold: true, color: a, allCaps: true, characterSpacing: 60 })] })] : []),
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

// Soft write-in: ghost fill + dashed border all 4 sides. Used wherever
// people should actually write. Replaces the old "bottom-rule only" look
// that reads as word-doc form field.
//    heightTwips: minimum height of the writable area (1000 ≈ 2 lines)
//    ghostFill:   pale background — defaults to cream-white
//    borderColor: dashed border color — defaults to stone
function softWriteIn(heightTwips, ghostFill = 'FDFCF8', borderColor = 'D9CEBE') {
  const dashed = { style: BorderStyle.DASHED, size: 6, color: borderColor };
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W],
    borders: { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd, insideHorizontal: noBrd, insideVertical: noBrd },
    rows: [new TableRow({
      height: { value: heightTwips, rule: HeightRule.ATLEAST },
      children: [new TableCell({
        borders: { top: dashed, bottom: dashed, left: dashed, right: dashed },
        width: { size: W, type: WidthType.DXA },
        shading: { fill: ghostFill, type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 200, right: 200 },
        children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun('')] })],
      })],
    })],
  });
}

// Labeled write-in: small-caps colored label + ghost/dashed write-in below.
function labeledWriteIn(label, color, heightTwips, opts = {}) {
  return [
    new Paragraph({ spacing: { before: 160, after: 80 },
      children: [run(label, { size: 13, bold: true, color, allCaps: true, characterSpacing: 60 })] }),
    ...(opts.hint ? [new Paragraph({ spacing: { after: 60 },
      children: [run(opts.hint, { size: 13, italics: true, color: MUTED })] })] : []),
    softWriteIn(heightTwips, opts.ghostFill, opts.borderColor),
  ];
}

// Soft outlined card: thin colored border (all 4 sides) + ghost fill.
// Used for containing visual groupings — e.g., a focus-area block that
// wraps multiple labeled write-ins.
function softCard(accentColor, children, opts = {}) {
  const ghostFill = opts.ghostFill || 'FDFCF8';
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W],
    borders: { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd, insideHorizontal: noBrd, insideVertical: noBrd },
    rows: [new TableRow({ children: [new TableCell({
      borders: {
        top:    { style: BorderStyle.SINGLE, size: 6, color: accentColor },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: accentColor },
        left:   { style: BorderStyle.SINGLE, size: 6, color: accentColor },
        right:  { style: BorderStyle.SINGLE, size: 6, color: accentColor },
      },
      width: { size: W, type: WidthType.DXA },
      shading: { fill: ghostFill, type: ShadingType.CLEAR },
      margins: { top: 240, bottom: 240, left: 320, right: 320 },
      children,
    })]})],
  });
}

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

// Turn "the W" / "the X" style type-references into partner name markers.
// Couple-type content is written with shorthand like "the W wants to debrief
// the weekend and the X is done talking" — but Ellie wants these replaced
// with actual partner names so the workbook reads personally, not clinically.
// Mapping: first letter of coupleType.id → {U}, second letter → {P}.
// After substitution, fill() replaces {U}/{P} with real names as usual.
// Case-insensitive on "the" so we catch sentence-start "The W" too.
function personalizeTypeRefs(template, coupleType) {
  if (!coupleType?.id || coupleType.id.length !== 2) return String(template || '');
  const [firstLetter, secondLetter] = [coupleType.id[0], coupleType.id[1]];
  let result = String(template || '');
  // Match `the X` with word boundaries so we don't replace inside words.
  // Replace with the appropriate marker, dropping the "the" (since the
  // replacement is a proper name).
  result = result.replace(new RegExp(`\\bthe ${firstLetter}\\b`, 'g'), '{U}');
  result = result.replace(new RegExp(`\\bThe ${firstLetter}\\b`, 'g'), '{U}');
  if (firstLetter !== secondLetter) {
    result = result.replace(new RegExp(`\\bthe ${secondLetter}\\b`, 'g'), '{P}');
    result = result.replace(new RegExp(`\\bThe ${secondLetter}\\b`, 'g'), '{P}');
  }
  return result;
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
  const gapDims = DIMS.filter(d => Math.abs((s1[d] || 3) - (s2[d] || 3)) >= gapThreshold);
  const visibleDomains = DOMAIN_ORDER.map(dom => ({
    title: dom.title,
    visibleDims: dom.dims.filter(d => gapDims.includes(d)),
  })).filter(dom => dom.visibleDims.length > 0);
  const unalignedExp = expGaps.filter(g => !g.aligned).length;
  const totalGapDims = visibleDomains.reduce((n, d) => n + d.visibleDims.length, 0);

  // Pre-parts: Cover p1, TOC pp2-3, Intro p4, snapshot p5.
  const introPage = 4;
  const snapshotPage = 5;
  let p = 5;

  // Part 1 — Deeper dive.
  p += 1;                                      // Part 1 cover (epigraph inline)
  const insightsPage = p + 1;                  // Part 1 intro page ("Practical help...")
  p += 1;                                      // intro page
  const commsPage = p + 1;                     // first dim page
  p += Math.max(1, totalGapDims);              // one page per dim
  const expPage = p + 1;
  p += Math.max(1, Math.ceil(unalignedExp / 3));

  // Part 2 — Working Knowledge
  p += 1;                                      // Part 2 cover
  const workingKnowledgePage = p + 1;
  const sameType = coupleTypeIsSame();
  p += sameType ? 2 : 6;

  // Part 3 — Workbook. 5 content pages: Preparation + 3 focus areas + 30-day check-in.
  p += 1;                                      // Part 3 cover
  const prioritiesPage = p + 1;
  p += 5;

  // Part 4 — Conversation Library (~3 pages)
  p += 1;                                      // Part 4 cover
  const conversationPage = p + 1;
  p += 3;

  // Part 5 — Reference Card (smaller card, single page)
  p += 1;                                      // Part 5 cover
  const referencePage = p + 1;

  return { introPage, snapshotPage, insightsPage, commsPage, expPage,
           domainPages: [], // kept for backward-compat; unused in new TOC
           workingKnowledgePage,
           prioritiesPage, conversationPage,
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
                    pageNum, indent = 0, italic = false, before = 60, after = 60, noLeader = false }) {
    // Dashed bottom border on the label cell creates the leader line;
    // positioned at the text baseline via cell bottom margin so it
    // visually sits between the text and the page number. When noLeader
    // is true the bottom border is omitted — used on the last row of
    // each section group so the group ends cleanly.
    const dashedBottom = noLeader
      ? { bottom: { style: BorderStyle.NONE } }
      : { bottom: { style: BorderStyle.DASHED, size: 6, color: STONE, space: 1 } };
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

  // Introduction with a single Snapshot subsection
  rows.push(tocRow({ label: 'Introduction', labelBold: true, pageNum: offsets.introPage, after: 80 }));
  rows.push(tocRow({ label: 'Your snapshot', pageNum: offsets.snapshotPage, indent: 280, labelSize: 20, labelColor: MUTED, after: 180, noLeader: true }));

  // Part 1 — A closer look at the dimensions that matter.
  // Subentries point to the two logical halves of Part 1.
  rows.push(...tocSection({ partEyebrow: 'PART 1', title: 'A closer look at the dimensions that matter', pageNum: offsets.insightsPage, color: BLUE }));
  rows.push(tocRow({ label: 'Communication', pageNum: offsets.commsPage, indent: 280, labelSize: 20, labelColor: MUTED }));
  rows.push(tocRow({ label: 'Expectations',  pageNum: offsets.expPage,  indent: 280, labelSize: 20, labelColor: MUTED, noLeader: true }));

  // Part 2 — Working Knowledge
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
          noLeader: i === MOMENTS.length - 1,
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
          noLeader: i === MOMENTS.length - 1,
        }));
      });
    }
  }

  // Part 3 — Workbook (guided journaling, user picks their own focus)
  rows.push(...tocSection({ partEyebrow: 'PART 3', title: 'Workbook', pageNum: offsets.prioritiesPage, color: ORANGE }));
  rows.push(tocRow({ label: 'Preparing together', pageNum: offsets.prioritiesPage,     indent: 280, labelSize: 20, labelColor: MUTED }));
  rows.push(tocRow({ label: 'Focus area 1',       pageNum: offsets.prioritiesPage + 1, indent: 280, labelSize: 20, labelColor: MUTED }));
  rows.push(tocRow({ label: 'Focus area 2',       pageNum: offsets.prioritiesPage + 2, indent: 280, labelSize: 20, labelColor: MUTED }));
  rows.push(tocRow({ label: 'Focus area 3',       pageNum: offsets.prioritiesPage + 3, indent: 280, labelSize: 20, labelColor: MUTED }));
  rows.push(tocRow({ label: '30-day check-in',    pageNum: offsets.prioritiesPage + 4, indent: 280, labelSize: 20, labelColor: MUTED, italic: true, noLeader: true }));

  // Part 4 — Conversation Library
  rows.push(...tocSection({ partEyebrow: 'PART 4', title: 'Conversation Library', pageNum: offsets.conversationPage, color: PURPLE }));
  SITUATIONS.forEach((s, i) => {
    rows.push(tocRow({
      label: `${i + 1}. ${s.title}`,
      pageNum: offsets.conversationPage + Math.floor(i / 3),
      indent: 280, labelSize: 20, labelColor: MUTED,
    }));
  });
  rows.push(tocRow({ label: 'A structured first conversation', pageNum: offsets.conversationPage + 2, indent: 280, labelSize: 20, labelColor: MUTED, italic: true, noLeader: true }));

  // Part 5 — Reference Card
  rows.push(...tocSection({ partEyebrow: 'PART 5', title: 'Reference Card', pageNum: offsets.referencePage, color: GREEN }));

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
      children: [run('ATTUNE', { size: 22, bold: true, color: ORANGE, allCaps: true })] }),

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
      tc(gap.toFixed(1), 900, { color: color, bold: true, size: 18 }),
      tc(label, 1800, { color: color, size: 18 }),
      tc(scoreBar(Number(s1)) + ' / ' + scoreBar(Number(s2)), 1860, { size: 16, color: MUTED }),
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
      width: { size: W, type: WidthType.DXA }, columnWidths: [2800, 1000, 1000, 900, 1800, 1860],
      rows: [
        new TableRow({ children: [hc('Dimension', 2800, INK), hc(`${u}`, 1000, ORANGE), hc(`${p}`, 1000, ORANGE), hc('Gap', 900, ORANGE), hc('Alignment', 1800, ORANGE), hc('Score bars', 1860, INK)] }),
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

// Dimension hero: a 2-column editorial block at the top of every dimension
// page. Left side has the big dimension label, axis summary, and a gap
// status badge. Right side has two stacked score bars — one per partner —
// using the scoreBarRow infrastructure. Replaces the previous data-table +
// plain-text-bar combo, which read like a word-doc form.
function buildDimensionHero(meta, u, p, score1, score2, accentColor, gapAnalysisText) {
  const gap = Math.abs(score1 - score2);
  const color = accentColor || meta.color || ORANGE;
  const gColor = gapColour(gap);
  const gLabel = gapLabel(gap);

  // Centered title + gap eyebrow. More breathing room below the eyebrow
  // so it doesn't crowd the hero columns.
  const titleBlock = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 100 },
      children: [run(meta.label, { size: 52, bold: true, color })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 520 },
      children: [
        run('GAP ', { size: 16, bold: true, color: MUTED, allCaps: true }),
        run(`${gap.toFixed(1)}  ·  `, { size: 18, bold: true, color: gColor }),
        run(gLabel, { size: 16, bold: true, color: gColor, allCaps: true }),
      ] }),
  ];

  // Two-column hero: spectrum bars (left) + analysis text (right)
  const LEFT_W = 4800, RIGHT_W = W - LEFT_W;
  const barsInnerW = LEFT_W - 160;

  // Spectrum bar rendered as a line of characters rather than a shaded
  // table row. This lets the score dot naturally be MUCH larger than the
  // thin grey line it sits on, since both are just glyphs in the same
  // paragraph — the dot's font size dictates its visual size, and the
  // line's font size dictates its thickness, independently.
  //
  // Characters:
  //   ─ (U+2500 BOX DRAWINGS LIGHT HORIZONTAL) — the line segments
  //   ● (U+25CF BLACK CIRCLE) — the score dot
  //
  // The dashes tile horizontally with no gap, so a row of them reads as
  // a single continuous line. Font sizes: dashes at 14 (thin line), dot
  // at 48 (large circle).
  const BAR_CHARS = 46;  // total chars at size 12 (6pt dashes) fills barsInnerW
  const DASH = '\u2500';
  const DOT = '\u25CF';
  const LINE_COLOR = 'C8BEB0';  // warm neutral grey

  const spectrumBar = (partnerLabel, score, dotColor) => {
    const clamped = Math.max(1, Math.min(5, score));
    const dotIdx = Math.round(((clamped - 1) / 4) * (BAR_CHARS - 1));
    const leftDashes  = DASH.repeat(dotIdx);
    const rightDashes = DASH.repeat(BAR_CHARS - 1 - dotIdx);

    return [
      new Paragraph({ spacing: { before: 80, after: 20 },
        children: [
          run(partnerLabel, { size: 18, bold: true, color: INK }),
          run('   ', { size: 16 }),
          run(clamped.toFixed(1) + ' / 5', { size: 16, bold: true, color: dotColor }),
        ] }),
      // Bar: left dashes + dot + right dashes in one paragraph so they
      // share a baseline. Dashes at size 12 (6pt) tile into a thin
      // continuous line. Dot at size 48 is much bigger than the line.
      //
      // `position: -10` shifts the dot DOWN by 5pt from the baseline so
      // its visual center aligns with the dash midline (the `─` box-drawing
      // char sits at ~x-height, not baseline; without this, the dot
      // appears to float above the line rather than sit through it).
      new Paragraph({
        spacing: { after: 40, line: 240, lineRule: 'exact' },
        children: [
          run(leftDashes,  { size: 12, color: LINE_COLOR }),
          run(DOT,         { size: 48, color: dotColor, position: -10 }),
          run(rightDashes, { size: 12, color: LINE_COLOR }),
        ],
      }),
    ];
  };

  // Axis labels — "1 — INWARD" at far left, "5 — OUTWARD" at far right.
  // Numbers anchor the scale at its numeric endpoints; label words
  // describe what each end means. No arrow/line between — the bars
  // below already provide the continuous-spectrum visual.
  const axisHeader = new Table({
    width: { size: barsInnerW, type: WidthType.DXA }, columnWidths: [barsInnerW / 2, barsInnerW / 2],
    borders: { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd, insideHorizontal: noBrd, insideVertical: noBrd },
    rows: [new TableRow({ children: [
      new TableCell({ borders: noBrds, width: { size: barsInnerW / 2, type: WidthType.DXA }, margins: { top: 0, bottom: 80, left: 0, right: 0 },
        children: [new Paragraph({ spacing: { after: 0 },
          children: [
            run('1  ', { size: 13, bold: true, color: MUTED, characterSpacing: 30 }),
            run(meta.left, { size: 13, color: MUTED, italics: true, allCaps: true, characterSpacing: 30 }),
          ] })] }),
      new TableCell({ borders: noBrds, width: { size: barsInnerW / 2, type: WidthType.DXA }, margins: { top: 0, bottom: 80, left: 0, right: 0 },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 0 },
          children: [
            run(meta.right, { size: 13, color: MUTED, italics: true, allCaps: true, characterSpacing: 30 }),
            run('  5', { size: 13, bold: true, color: MUTED, characterSpacing: 30 }),
          ] })] }),
    ]})],
  });

  // Column titles — eyebrows at the top of each column. Bumped to size 18
  // (9pt) to match the bold section headers further down the page. Titles
  // have matching after-spacing so content below aligns on both sides.
  const leftTitle = new Paragraph({ spacing: { after: 140 },
    children: [run('Your scores', { size: 18, bold: true, color, allCaps: true, characterSpacing: 60 })] });
  const rightTitle = new Paragraph({ spacing: { after: 140 },
    children: [run('What this means', { size: 18, bold: true, color, allCaps: true, characterSpacing: 60 })] });

  const twoColHero = new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [LEFT_W, RIGHT_W],
    borders: { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd, insideHorizontal: noBrd, insideVertical: noBrd },
    rows: [new TableRow({ children: [
      // LEFT: column title + axis labels + spectrum bars (top-aligned by default)
      new TableCell({ borders: noBrds, width: { size: LEFT_W, type: WidthType.DXA }, margins: { top: 0, bottom: 0, left: 0, right: 240 },
        children: [
          leftTitle,
          axisHeader,
          ...spectrumBar(u, score1, ORANGE),
          ...spectrumBar(p, score2, BLUE),
        ] }),
      // RIGHT: column title + analysis prose, top-aligned. Italic grey
      // body — italic returns so the analysis reads as interpretive text
      // distinct from the sections below.
      new TableCell({ borders: noBrds, width: { size: RIGHT_W, type: WidthType.DXA },
        margins: { top: 0, bottom: 0, left: 240, right: 0 },
        children: [
          rightTitle,
          new Paragraph({ spacing: { after: 0, line: 340, lineRule: 'atLeast' },
            children: [run(gapAnalysisText || '', { size: 22, italics: true, color: MUTED })] }),
        ] }),
    ]})],
  });

  return [...titleBlock, twoColHero];
}

function buildOneDimension(dim, u, p, score1, score2, coupleType) {
  const meta    = DIM_META[dim];
  const content = DIM_CONTENT[dim];
  const color   = meta.color || ORANGE;

  const thisWeek = fill(content.thisWeek, u, p);

  // Main analysis text — couple-type-specific prose keyed to the dim
  // and the couple's type id. This renders in the hero's right column
  // as "What this means for your relationship." Falls back to WW if
  // the specific type's entry hasn't been written yet.
  // (Gap pages only render for gap >= 1.5, so we don't need the close
  // text branch anymore — closeText remains in _workbook-content.js for
  // reference but is no longer rendered.)
  const ctId = coupleType?.id || 'WW';
  const whenLookup = WHEN_THIS_SHOWS_UP[dim] || {};
  const rawMainText = whenLookup[ctId] || whenLookup.WW || '';
  const mainText = fill(personalizeTypeRefs(rawMainText, coupleType), u, p);

  // Standard section header — 18pt bold uppercase (was 15pt), tight
  // (not tracked), tighter spacing between header and its content.
  // Optionally accepts a leading icon that hangs into the left margin.
  const HANG_INDENT = 420;
  const standardEyebrow = (text, opts = {}) => {
    const headerColor = opts.color || color;
    if (opts.icon) {
      return new Paragraph({
        spacing: { before: opts.before ?? 380, after: opts.after ?? 140 },
        indent: { left: HANG_INDENT, hanging: HANG_INDENT },
        children: [
          run(opts.icon + '  ', { size: 18, bold: true, color: headerColor }),
          run(text, { size: 18, bold: true, color: headerColor, allCaps: true }),
        ],
      });
    }
    return new Paragraph({
      spacing: { before: opts.before ?? 380, after: opts.after ?? 140 },
      children: [run(text, { size: 18, bold: true, color: headerColor, allCaps: true })],
    });
  };

  // Unified body paragraph — 11pt (size 22). All three main sections
  // (what this might look like / reflection prompts / try this week) use
  // the same size so the page reads as one continuous document.
  const body = (text, opts = {}) => new Paragraph({
    spacing: { after: opts.after ?? 120, line: 320, lineRule: 'atLeast' },
    indent: opts.indent ? { left: opts.indent } : undefined,
    children: [run(text, { size: 22, color: INK })],
  });

  // Colored box for "Try this week" content — transparent-feeling tinted
  // background via a light version of the accent color + a thick left rule.
  const tryThisWeekBox = (text) => {
    const tint = color === ORANGE ? 'FFF3EB'
               : color === BLUE   ? 'EEF2FC'
               : color === PURPLE ? 'F3EEFB'
               : color === GREEN  ? 'E8F7F0'
               : 'FFF3EB';

    return new Table({
      width: { size: W, type: WidthType.DXA }, columnWidths: [W],
      borders: noBrds,
      rows: [new TableRow({ children: [new TableCell({
        borders: {
          top: noBrd, bottom: noBrd, right: noBrd,
          left: { style: BorderStyle.SINGLE, size: 24, color, space: 8 },
        },
        width: { size: W, type: WidthType.DXA },
        shading: { fill: tint, type: ShadingType.CLEAR },
        margins: { top: 140, bottom: 140, left: 260, right: 260 },
        children: [new Paragraph({
          spacing: { after: 0, line: 320, lineRule: 'atLeast' },
          children: [run(text, { size: 22, color: INK })],
        })],
      })]})],
    });
  };

  // Reflection prompt — matches the unified 11pt body size.
  const reflectionPrompt = (text) => new Paragraph({
    spacing: { after: 120, line: 320, lineRule: 'atLeast' },
    indent: { left: 320, hanging: 320 },
    children: [
      run('\u2610  ', { size: 22, color: INK }),
      run(String(text || ''), { size: 22, color: INK }),
    ],
  });

  const result = [pb()];

  // 1. Hero: title + gap eyebrow + two-column (spectrum / analysis)
  result.push(...buildDimensionHero(meta, u, p, score1, score2, color, mainText));

  // 2. Thin horizontal rule separating hero from practical help.
  //    Tight `before` so the rule sits close under the hero; reflection
  //    prompts follow with the standard section spacing.
  result.push(new Paragraph({
    spacing: { before: 120, after: 0 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: STONE, space: 4 } },
    children: [new TextRun('')],
  }));

  // 3. Reflection prompts — 3 items at 11pt
  result.push(standardEyebrow('Reflection prompts'));
  content.prompts.slice(0, 3).forEach(pr => result.push(reflectionPrompt(fill(pr, u, p))));

  // 4. Try this week — colored tinted box so it visually stands out
  result.push(standardEyebrow('Try this week', { icon: '★' }));
  result.push(tryThisWeekBox(thisWeek));

  // 5. What we want to try — 4 ruled lines for the specific commitment
  result.push(standardEyebrow('What we want to try'));
  result.push(new Paragraph({ spacing: { after: 100 },
    children: [run(`e.g., "we'll share one thing we'd normally hold back, every Sunday evening."`,
      { size: 14, italics: true, color: MUTED })] }));
  result.push(ruledWriteIn(4, { lineHeight: 400 }));

  // 6. Our notes — 5 ruled lines for free-form notes. Slightly tighter
  //    `before` since the preceding ruled write-in provides natural
  //    visual separation already.
  result.push(standardEyebrow('Our notes', { before: 280 }));
  result.push(ruledWriteIn(5, { lineHeight: 400 }));

  return result;
}

// Domain group headers for communication dimensions. These match the 3
// categories used in the comms exercise on the website, so the workbook
// feels like a direct extension of what the couple just did.
const DOMAIN_ORDER = [
  { title: 'Your Inner Worlds',    color: PURPLE, dims: ['energy','expression','closeness'] },
  { title: 'How You Connect',      color: ORANGE, dims: ['love','needs','bids'] },
  { title: 'When Things Get Hard', color: BLUE,   dims: ['conflict','stress','repair','feedback'] },
];

// Expectations groupings that match the 5 categories used in the
// expectations exercise: Household / Financial / Career & Work / Emotional
// Labor / Life & Values. The workbook's existing 7 content domains (in
// EXP_DOMAINS) are mapped into these 5 exercise categories for display.
const EXP_CATEGORIES = [
  { id: 'household', title: 'Household',       color: ORANGE, domainKeys: ['household'] },
  { id: 'financial', title: 'Financial',       color: BLUE,   domainKeys: ['financial'] },
  { id: 'career',    title: 'Career & Work',   color: PURPLE, domainKeys: ['career'] },
  { id: 'emotional', title: 'Emotional Labor', color: GREEN,  domainKeys: ['emotional'] },
  { id: 'life',      title: 'Life & Values',   color: PURPLE, domainKeys: ['children', 'lifestyle', 'values'] },
];

// Large colored section header used to demarcate major sub-sections inside
// Part 1. Bigger and more navigable than a plain H2 — gives the reader a
// clear "I'm now in Communication / Expectations" wayfinding cue.
function bigSectionHeader(label, subtitle, color) {
  return [
    new Paragraph({ spacing: { before: 240, after: 80 },
      children: [run(label, { size: 40, bold: true, color })] }),
    ...(subtitle ? [new Paragraph({ spacing: { after: 100 },
      children: [run(subtitle, { size: 18, italics: true, color: MUTED })] })] : []),
    new Paragraph({ spacing: { before: 0, after: 240 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 16, color, space: 4 } },
      children: [new TextRun('')] }),
  ];
}

// Smaller category header within a section (e.g. "Your Inner Worlds"
// within Communication). Meant to feel like a chapter subtitle.
function categoryHeader(label, color) {
  return [
    new Paragraph({ spacing: { before: 200, after: 60 },
      children: [run(label, { size: 26, bold: true, color })] }),
    new Paragraph({ spacing: { after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color, space: 4 } },
      children: [new TextRun('')] }),
  ];
}

// Couple type intro — shown at the start of Part 1 to set context before
// the reader hits the dimension pages. Pulls from NEW_COUPLE_TYPES data
// (description, nuance, strengths/sticking/patterns). If the couple type
// object doesn't include these richer fields, falls back to a minimal
// name + description display.
// Part 1 intro — frames what's coming as practical help built from the
// couple's answers. Briefly references couple type by name/tagline. Does
// NOT dedicate a full page to couple type data (that lives in the
// Reference Card now).
function buildPartOneIntro(u, p, coupleType, domainsToShow) {
  const gapCount = (domainsToShow || []).reduce((n, d) => n + (d.dims?.length || 0), 0);
  const color = coupleType ? (coupleType.color || '#E8673A').replace('#', '') : BLUE;

  const dimsLine = gapCount > 0
    ? `The next pages walk through the ${gapCount} communication dimension${gapCount === 1 ? '' : 's'} where ${u} and ${p}'s answers diverged, followed by the expectations where you're not yet aligned.`
    : `${u} and ${p} are aligned across every communication dimension. The rest of this part covers the expectations where you're still working out the picture.`;

  return [
    pb(),
    // Opening
    new Paragraph({ spacing: { before: 120, after: 60 },
      children: [run(`${u} & ${p}`, { size: 14, bold: true, color: MUTED, allCaps: true, characterSpacing: 80 })] }),
    new Paragraph({ spacing: { after: 40 },
      children: [run('Practical help, built from your answers.', { size: 36, bold: true, color: INK })] }),
    ...(coupleType?.tagline ? [new Paragraph({ spacing: { after: 240 },
      children: [run(coupleType.tagline, { size: 18, italics: true, color: MUTED })] })] : []),
    new Paragraph({ spacing: { before: 0, after: 280 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 16, color, space: 4 } },
      children: [new TextRun('')] }),

    // Framing paragraphs — what this section is and isn't
    para(
      `This section is built specifically for you. Each page focuses on one place where your alignment showed a meaningful gap, and gives you what to do about it — what the pattern looks like, questions to sit with, one thing to try this week, and space to decide what you actually want to change.`,
      { size: 20, color: INK, after: 200 }),
    para(dimsLine, { size: 20, color: INK, after: 240 }),

    // Soft card with "how to use this section"
    accentBox('How to use this section',
      `Read each page in order or skip to the ones that feel most alive. You don't have to act on every one. The page-level commitment space is small by design — the bigger workbook lives in Part 3, where you'll decide what to focus on overall.`,
      'FBF8F2', color),
  ];
}

function buildInsights(u, p, scores, partnerScores, coupleType) {
  // Compute per-dimension gaps. Part 1 only covers dimensions where the gap
  // is meaningful — aligned dimensions don't need guidance, and including
  // them would dilute the focus.
  const GAP_THRESHOLD = 1.5;
  const gapsByDim = {};
  DIMS.forEach(d => {
    gapsByDim[d] = Math.abs((scores[d] || 3) - (partnerScores[d] || 3));
  });

  const domainsToShow = DOMAIN_ORDER
    .map(domain => ({ ...domain, dims: domain.dims.filter(d => gapsByDim[d] >= GAP_THRESHOLD) }))
    .filter(domain => domain.dims.length > 0);

  const result = [];

  // Part 1 intro page — practical framing for what's coming.
  result.push(...buildPartOneIntro(u, p, coupleType, domainsToShow));

  // If no comms gaps at all, skip to expectations directly.
  if (domainsToShow.length === 0 && coupleType) {
    result.push(pb());
    result.push(accentBox(
      'A rare finding',
      `${u} and ${p}'s answers are aligned across every communication dimension. The expectations review below is where to focus.`,
      'F0FDF9', GREEN));
    return result;
  }

  // Dim pages flow continuously. No category grouping — every dim gets
  // its own single page (buildOneDimension starts with a pagebreak).
  if (domainsToShow.length > 0) {
    domainsToShow.forEach(domain => {
      domain.dims.forEach(dim => {
        result.push(...buildOneDimension(dim, u, p, scores[dim] || 3, partnerScores[dim] || 3, coupleType));
      });
    });
  }

  return result;
}

function buildExpDomains(u, p, expGaps) {
  const byKey = Object.fromEntries(expGaps.map(eg => [eg.key, eg]));
  const categoriesToShow = EXP_CATEGORIES.map(cat => {
    const unaligned = cat.domainKeys.map(k => byKey[k]).filter(Boolean).filter(eg => !eg.aligned);
    const aligned   = cat.domainKeys.map(k => byKey[k]).filter(Boolean).filter(eg => eg.aligned);
    return { ...cat, unaligned, aligned };
  }).filter(cat => cat.unaligned.length > 0);

  if (categoriesToShow.length === 0) return [];

  const result = [pb()];
  result.push(...bigSectionHeader('Expectations',
    `Where ${u} and ${p} have different ideas about the life you're building.`, GREEN));

  categoriesToShow.forEach(cat => {
    result.push(...categoryHeader(cat.title, cat.color));

    cat.unaligned.forEach(eg => {
      const domain = EXP_DOMAINS.find(d => d.key === eg.key);
      if (!domain) return;
      const mainText = fill(domain.gapText, u, p);

      // Domain label — plain bold header, no gap badge in the corner.
      result.push(new Paragraph({ spacing: { before: 200, after: 160 },
        children: [run(domain.label, { size: 22, bold: true, color: cat.color })] }));

      // Prominent two-column responses. Each partner gets their own
      // column: small-caps name label above, big italic answer below.
      // Reads as data you actually compare, not a caption.
      const answerCol = (name, answer, accent) => new TableCell({
        borders: { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd },
        width: { size: W / 2, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 0, right: 120 },
        children: [
          new Paragraph({ spacing: { after: 80 },
            children: [run(name, { size: 11, bold: true, color: accent, allCaps: true, characterSpacing: 80 })] }),
          new Paragraph({ spacing: { after: 0 },
            children: [run(answerLabel(answer, u, p), { size: 20, italics: true, color: INK })] }),
        ],
      });
      result.push(new Table({
        width: { size: W, type: WidthType.DXA }, columnWidths: [W / 2, W / 2],
        borders: { top: { style: BorderStyle.SINGLE, size: 6, color: STONE },
                   bottom: { style: BorderStyle.SINGLE, size: 6, color: STONE },
                   left: noBrd, right: noBrd, insideHorizontal: noBrd,
                   insideVertical: { style: BorderStyle.SINGLE, size: 4, color: STONE } },
        rows: [new TableRow({ children: [
          answerCol(u, eg.yourAnswer, ORANGE),
          answerCol(p, eg.partnerAnswer, BLUE),
        ]})],
      }));

      // Gap analysis — plain grey italic, no box, no fill.
      result.push(new Paragraph({ spacing: { before: 200, after: 120, line: 300, lineRule: 'atLeast' },
        children: [run(mainText, { size: 17, italics: true, color: MUTED })] }));

      // Try this week — eyebrow + plain body, no filled card.
      result.push(new Paragraph({ spacing: { before: 160, after: 80 },
        children: [run('Try this week', { size: 17, bold: true, color: BLUE, allCaps: true })] }));
      result.push(new Paragraph({ spacing: { after: 280, line: 300, lineRule: 'atLeast' },
        children: [run(fill(domain.thisWeek, u, p), { size: 17, color: INK })] }));
    });

    // Aligned domains footer
    if (cat.aligned.length > 0) {
      result.push(new Paragraph({ spacing: { before: 120, after: 220 },
        children: [
          run('Aligned: ', { size: 12, bold: true, color: GREEN, allCaps: true, characterSpacing: 60 }),
          run(cat.aligned.map(a => EXP_DOMAINS.find(d => d.key === a.key)?.label || a.label).join(', '), { size: 14, italics: true, color: MUTED }),
        ],
      }));
    }
  });

  return result;
}

// Workbook section (Part 3). Formerly "Your 3 Priorities" — now a guided
// journaling experience where the user decides what to focus on rather than
// the algorithm choosing for them.
//
// Flow:
//   1. Intro: now that you've read everything, what do you want to focus on?
//   2. Reflection prompts (3 questions)
//   3. 3 focus area blocks — user-written, not pre-filled
//   4. 30-day check-in at the end
function buildWorkbook(u, p) {
  const reflectionPrompts = [
    { n: 1, q: `What's the thing you want to say but haven't said yet?`,
      hint: `e.g., "I've been feeling overwhelmed but haven't named it."` },
    { n: 2, q: `What's been sitting with you most from this workbook?`,
      hint: `e.g., "I didn't realize how differently we handle stress."` },
    { n: 3, q: `If one thing changed in how you two talk, what would you want it to be?`,
      hint: `e.g., "I want to stop defaulting to 'fine' when I'm not."` },
  ];

  // Standard eyebrow used across all Workbook pages — keeps typography
  // consistent with dim pages.
  const eyebrowOf = (label, color) => new Paragraph({
    spacing: { before: 260, after: 100 },
    children: [run(label, { size: 17, bold: true, color, allCaps: true })],
  });

  const result = [];

  // ── Page 1: Preparing together ────────────────────────────────────────
  result.push(
    pb(),
    new Paragraph({ spacing: { after: 60 },
      children: [run('Preparing together', { size: 36, bold: true, color: ORANGE })] }),
    new Paragraph({ spacing: { after: 200 },
      children: [run(`A few questions to answer together before you pick what to focus on. No right answers. Write what comes up.`,
        { size: 16, italics: true, color: MUTED })] }),
    new Paragraph({ spacing: { before: 0, after: 320 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ORANGE, space: 4 } },
      children: [new TextRun('')] }),
  );

  reflectionPrompts.forEach(({ n, q, hint }, idx) => {
    result.push(new Paragraph({ spacing: { before: idx === 0 ? 0 : 320, after: 60 },
      children: [
        run(`${n}.  `, { size: 16, bold: true, color: ORANGE }),
        run(q, { size: 18, bold: true, color: INK }),
      ] }));
    result.push(new Paragraph({ spacing: { after: 120 },
      children: [run(hint, { size: 13, italics: true, color: MUTED })] }));
    result.push(ruledWriteIn(5, { lineHeight: 420 }));
  });

  // ── Pages 2-4: one page per focus area ────────────────────────────────
  for (let i = 1; i <= 3; i++) {
    result.push(pb());
    result.push(new Paragraph({ spacing: { after: 40 },
      children: [run(`FOCUS AREA ${i}`, { size: 17, bold: true, color: BLUE, allCaps: true })] }));
    result.push(new Paragraph({ spacing: { after: 40 },
      children: [run('What we\'re focusing on', { size: 32, bold: true, color: INK })] }));
    result.push(new Paragraph({ spacing: { before: 0, after: 240 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 } },
      children: [new TextRun('')] }));

    // Single-line topic — taller line to give it visual weight
    result.push(new Paragraph({ spacing: { after: 80 },
      children: [run('the dimension, expectation area, or pattern you want to work on',
        { size: 13, italics: true, color: MUTED })] }));
    result.push(ruledWriteIn(2, { lineHeight: 460 }));

    // Why this matters
    result.push(eyebrowOf('Why this matters to us', BLUE));
    result.push(ruledWriteIn(4, { lineHeight: 420 }));

    // Two-column task lists — each partner gets their own ruled lines
    // sized to half-page width, with a narrow gutter between the two.
    const TASK_COL_W = Math.floor((W - 240) / 2);   // 240 twips gutter
    const taskCol = (name, side) => new TableCell({
      borders: { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd },
      width: { size: TASK_COL_W, type: WidthType.DXA },
      margins: { top: 0, bottom: 0,
        left:  side === 'right' ? 120 : 0,
        right: side === 'left'  ? 120 : 0 },
      children: [
        new Paragraph({ spacing: { before: 320, after: 140 },
          children: [run(`What ${name} will do`, { size: 17, bold: true, color: BLUE, allCaps: true })] }),
        ruledWriteIn(5, { lineHeight: 420, width: TASK_COL_W }),
      ],
    });
    result.push(new Table({
      width: { size: W, type: WidthType.DXA }, columnWidths: [TASK_COL_W, 240, TASK_COL_W],
      borders: { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd, insideHorizontal: noBrd, insideVertical: noBrd },
      rows: [new TableRow({ children: [
        taskCol(u, 'left'),
        new TableCell({ borders: noBrds, width: { size: 240, type: WidthType.DXA },
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun('')] })] }),
        taskCol(p, 'right'),
      ] })],
    }));

    // Timeline + check-in
    result.push(eyebrowOf('Timeline and check-in', BLUE));
    result.push(new Paragraph({ spacing: { after: 80 },
      children: [run('e.g., "small check-in every Sunday; revisit the whole thing in 30 days."', { size: 13, italics: true, color: MUTED })] }));
    result.push(ruledWriteIn(5, { lineHeight: 420 }));
  }

  return result;
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
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run('Phase 3 \u2014 Your focus areas   (20 min)', { color: GREEN })] }),
    para(`Open Part 3 — the Workbook section. Together, pick one to three things you want to focus on over the next month. For each one:`),
    sp(),
    numItem('Say it out loud. Name what you want to change and why.'),
    numItem('Each person describes a recent moment where this showed up.'),
    numItem('Write your commitment in the workbook. Be specific. Small and specific beats ambitious and vague.'),
    sp(),
    accentBox('Keep it small', `Don't try to solve everything. Pick one action per focus area that's small enough to actually do this week.`, 'F0F9FF', BLUE),
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
    numItem(`State your focus areas and the action each of you is committing to this week.`),
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
  const typeName = coupleType?.name || 'Your couple type';
  const typeTagline = coupleType ? fill(String(coupleType.tagline || ''), u, p) : '';

  // Pull a phrase specific to this couple type if available — the first
  // tip's phraseTry is the couple-type-calibrated line. Fall back to a
  // generic starter if the couple type object doesn't include tips.
  const phrase = coupleType?.tips?.[0]?.phraseTry
    ? fill(String(coupleType.tips[0].phraseTry), u, p)
    : 'What do you need from me right now?';

  // Card geometry: ~5.5" wide × ~3.5" tall, centered on the page.
  const CARD_W = 8000;
  const TILE_W = Math.floor((CARD_W - 240) / 3);   // 3 equal side-by-side tiles
  const NAVY_LIGHT = 'CFC3E8';  // soft lavender for secondary text on navy
  const NAVY_DIM   = '8F80B0';  // even softer for metadata

  // Each tile is a table cell with white fill inside the navy card.
  // Consistent padding, colored eyebrow at top, content below.
  const tileCell = (accentColor, eyebrow, bodyParagraphs) => new TableCell({
    borders: { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd },
    width: { size: TILE_W, type: WidthType.DXA },
    shading: { fill: 'FCFAF5', type: ShadingType.CLEAR },
    margins: { top: 180, bottom: 180, left: 200, right: 200 },
    children: [
      new Paragraph({ spacing: { after: 100 },
        children: [run(eyebrow, { size: 10, bold: true, color: accentColor, allCaps: true, characterSpacing: 80 })] }),
      ...bodyParagraphs,
    ],
  });

  // Left tile — names (prominent) + couple type underneath
  const leftTile = tileCell(ORANGE, 'Us', [
    new Paragraph({ spacing: { after: 120 },
      children: [run(`${u} & ${p}`, { size: 20, bold: true, color: INK })] }),
    new Paragraph({ spacing: { after: 40 },
      children: [run(typeName, { size: 13, bold: true, color: ORANGE })] }),
    ...(typeTagline ? [new Paragraph({ spacing: { after: 0 },
      children: [run(typeTagline, { size: 11, italics: true, color: MUTED })] })] : []),
  ]);

  // Center tile — one phrase that works for this couple type
  const centerTile = tileCell(PURPLE, 'Phrase that lands', [
    new Paragraph({ spacing: { after: 0, line: 260, lineRule: 'atLeast' },
      children: [run(`"${phrase}"`, { size: 15, italics: true, color: INK })] }),
  ]);

  // Right tile — "Goal for this week" with notebook-paper ruled lines
  const rightTile = new TableCell({
    borders: { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd },
    width: { size: TILE_W, type: WidthType.DXA },
    shading: { fill: 'FCFAF5', type: ShadingType.CLEAR },
    margins: { top: 180, bottom: 180, left: 200, right: 200 },
    children: [
      new Paragraph({ spacing: { after: 120 },
        children: [run('Goal for this week', { size: 10, bold: true, color: BLUE, allCaps: true })] }),
      // Ruled lines, tighter than other write-ins to fit the small tile
      ruledWriteIn(4, { lineHeight: 240, afterEach: 60, color: 'D9CEBE' }),
    ],
  });

  // The 3-column tile row
  const tileRow = new Table({
    width: { size: CARD_W - 240, type: WidthType.DXA },
    columnWidths: [TILE_W, TILE_W, TILE_W],
    alignment: AlignmentType.CENTER,
    borders: {
      top: noBrd, bottom: noBrd, left: noBrd, right: noBrd,
      insideHorizontal: noBrd,
      insideVertical: { style: BorderStyle.SINGLE, size: 6, color: NAVY },  // navy gap visible between tiles
    },
    rows: [new TableRow({ children: [leftTile, centerTile, rightTile] })],
  });

  // The navy card itself — not full page, centered, ~5.5" × ~3.5"
  const navyCard = new Table({
    width: { size: CARD_W, type: WidthType.DXA },
    columnWidths: [CARD_W],
    alignment: AlignmentType.CENTER,
    borders: { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd, insideHorizontal: noBrd, insideVertical: noBrd },
    rows: [new TableRow({ children: [new TableCell({
      borders: noBrds,
      width: { size: CARD_W, type: WidthType.DXA },
      shading: { fill: NAVY, type: ShadingType.CLEAR },
      margins: { top: 0, bottom: 200, left: 0, right: 0 },
      children: [
        // Top gradient strip
        gradientBar(ORANGE, PURPLE, { height: 100, segments: 32, width: CARD_W }),
        // Title
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 160, after: 20 },
          children: [run('ATTUNE  ·  REFERENCE CARD', { size: 10, bold: true, color: NAVY_LIGHT, allCaps: true, characterSpacing: 120 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
          children: [run('Keep this somewhere you\'ll see it.', { size: 11, italics: true, color: NAVY_DIM })] }),
        // Tile row
        tileRow,
        // Footer
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240, after: 0 },
          children: [run('attune-relationships.com', { size: 10, color: NAVY_LIGHT, allCaps: true, characterSpacing: 80 })] }),
      ],
    })]})],
  });

  return [
    pb(),
    // Breathing room above the card
    new Paragraph({ spacing: { before: 400, after: 200 }, children: [new TextRun('')] }),
    navyCard,
    // A thin guide note below the card, outside the navy area
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 0 },
      children: [run('Print on cardstock. Cut out and keep it somewhere you\'ll see it.',
        { size: 12, italics: true, color: MUTED })] }),
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
  // Editorial header: big numeral in muted weight, then title in accent color.
  // No filled square, no banner — reads like a magazine section not a form.
  const rowLabel = (label, color) => new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [run(label, { size: 16, bold: true, color: color || MUTED, allCaps: true })],
  });
  const rowBody = (text, opts = {}) => new Paragraph({
    spacing: { after: 100, line: 280, lineRule: 'atLeast' },
    children: [run(text, { size: 18, color: opts.color || INK, italics: !!opts.italics })],
  });

  return [
    // Moment header: big numeral + title on one line
    new Paragraph({ spacing: { before: 240, after: 40 },
      children: [
        run(String(moment.number || '').padStart(2, '0'), { size: 14, bold: true, color: MUTED, characterSpacing: 40 }),
        run('   ', { size: 14 }),
        run(moment.title, { size: 26, bold: true, color: INK }),
      ],
    }),
    // Thin accent rule under the moment title
    new Paragraph({ spacing: { before: 0, after: 180 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: PURPLE, space: 4 } },
      children: [new TextRun('')] }),

    rowLabel('The moment', MUTED),
    rowBody(PH(`1 sentence: concrete setup for "${moment.title.toLowerCase()}" — e.g. "${subjectName} comes home after a tough day and goes quiet."`)),

    rowLabel(`What's happening for ${subjectName}`, PURPLE),
    rowBody(PH(`2–3 sentences keyed to Type ${typeLetter}: what's actually going on inside ${subjectName}, why the surface behavior looks the way it does, grounded in their specific communication style.`)),

    rowLabel('What not to do', 'C8402A'),
    rowBody(PH(`1 sentence: the natural but wrong move for ${otherName} to make in this moment.`)),

    rowLabel('What works', GREEN),
    rowBody(PH(`1–2 sentences: the specific action ${otherName} should take instead.`)),

    rowLabel('Phrase that lands', BLUE),
    rowBody(PH(`literal line for ${otherName} to say to ${subjectName} in this moment`), { italics: true, color: BLUE }),

    // Dotted divider between moments — softer than the old stone hr
    new Paragraph({ spacing: { before: 160, after: 200 },
      border: { bottom: { style: BorderStyle.DOTTED, size: 6, color: STONE, space: 4 } },
      children: [new TextRun('')] }),
  ];
}

function buildWorkingKnowledge(u, p, coupleType) {
  const [typeU, typeP] = partnerTypes(coupleType);
  const sameType = typeU === typeP;

  if (sameType) {
    return [
      pb(),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run(`Six Moments · Type ${typeU}`, { color: PURPLE })] }),
      para(`${u} and ${p} share the same type (${typeU}). The six moments below apply to both of you — use this page as a mutual reference. When a hard moment shows up in real life, flip to the one that matches. The goal is to have the language ready before you need it.`,
        { size: 20, color: MUTED, after: 240 }),
      ...MOMENTS.flatMap((m, i) => buildMomentCard({ ...m, number: `${i + 1}` }, `${u} & ${p}`, 'each other', typeU)),
    ];
  }

  // Cross-type: one page for each partner
  return [
    pb(),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run(`What ${p} should know about ${u}`, { color: PURPLE })] }),
    para(`Six moments where ${u} (Type ${typeU}) benefits from ${p} responding in a specific way. Situational guidance keyed to how ${u} is actually wired.`,
      { size: 20, color: MUTED, after: 240 }),
    ...MOMENTS.flatMap((m, i) => buildMomentCard({ ...m, number: `${i + 1}` }, u, p, typeU)),

    pb(),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run(`What ${u} should know about ${p}`, { color: PURPLE })] }),
    para(`Six moments where ${p} (Type ${typeP}) benefits from ${u} responding in a specific way.`,
      { size: 20, color: MUTED, after: 240 }),
    ...MOMENTS.flatMap((m, i) => buildMomentCard({ ...m, number: `${i + 1}` }, p, u, typeP)),
  ];
}

// ─── 30-day check-in (embedded at end of Workbook section) ─────────────
function buildPriorityCheckIn(u, p, priorities) {
  const checkInPrompts = [
    { n: 1, q: `What changed (if anything) over the last 30 days?` },
    { n: 2, q: `Did the focus areas we wrote down actually get attention? What got in the way?` },
    { n: 3, q: `One small thing to try differently in the next 30 days.` },
  ];

  const result = [
    pb(),
    new Paragraph({ spacing: { after: 60 },
      children: [run('30-day check-in', { size: 36, bold: true, color: ORANGE })] }),
    new Paragraph({ spacing: { after: 200 },
      children: [run(`Come back to this page in about a month. Answer honestly. Write in the workbook — that's what it's for.`,
        { size: 16, italics: true, color: MUTED })] }),
    new Paragraph({ spacing: { before: 0, after: 320 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ORANGE, space: 4 } },
      children: [new TextRun('')] }),
  ];

  checkInPrompts.forEach(({ n, q }, idx) => {
    result.push(new Paragraph({ spacing: { before: idx === 0 ? 0 : 320, after: 120 },
      children: [
        run(`${n}.  `, { size: 16, bold: true, color: ORANGE }),
        run(q, { size: 18, bold: true, color: INK }),
      ] }));
    result.push(ruledWriteIn(6, { lineHeight: 420 }));
  });

  return result;
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
    ...[1, 2, 3, 4, 5].map(n => new Paragraph({
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
    para(`If you want a guided path through your focus areas together, this is it. Roughly 60 minutes.`,
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

    ...buildPartCover(1, 'A closer look at the dimensions that matter',
      `The dimensions where ${u} and ${p} showed a meaningful gap, unpacked.`, BLUE),
    ...epigraph(
      PH('opening quote for Part 1'),
      PH('Attribution')),
    ...buildInsights(u, p, s1, s2, coupleType),
    ...buildExpDomains(u, p, expGaps),

    ...buildPartCover(2, 'Working Knowledge',
      `Six moments with each other. Specific language for each.`, PURPLE),
    ...epigraph(
      PH('opening quote for Part 2 — something about knowing another person'),
      PH('Attribution')),
    ...buildWorkingKnowledge(u, p, coupleType),

    ...buildPartCover(3, 'Workbook',
      `Your focus areas. Your words. Your pace.`, ORANGE),
    ...epigraph(
      PH('opening quote for Part 3 — something about focus or choosing'),
      PH('Attribution')),
    ...buildWorkbook(u, p),
    ...buildPriorityCheckIn(u, p, priorities),

    ...buildPartCover(4, 'Conversation Library',
      `Words for the situations you'll actually find yourselves in.`, PURPLE),
    ...epigraph(
      PH('opening quote for Part 4 — something about language or talking'),
      PH('Attribution')),
    ...buildConversationLibrary(u, p, coupleType, priorities),

    ...buildPartCover(5, 'Reference Card',
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
