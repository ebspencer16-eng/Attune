// Build the Starting Out Checklist internal-records doc.
// Parses CHECKLIST_AREAS from src/App.jsx (source of truth) and renders
// as a portrait docx with one section per area, items with descriptions
// and links, color-coded by section.

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType,
  Footer, PageNumber, ExternalHyperlink,
} from 'docx';

// ── Extract CHECKLIST_AREAS from App.jsx ─────────────────────────────────
// The array is a JS literal — we locate it, capture the matching brackets
// by counting, then eval with a tiny wrapper to pull it out. Safer than
// regex because the strings contain quotes + escapes.
const appSrc = readFileSync('/home/claude/unison/src/App.jsx', 'utf8');
const startMatch = appSrc.match(/const CHECKLIST_AREAS = \[/);
if (!startMatch) throw new Error('CHECKLIST_AREAS not found');
const arrStart = startMatch.index + 'const CHECKLIST_AREAS = '.length;

// Walk characters, counting [] depth while respecting string/template boundaries.
let depth = 0, i = arrStart, inStr = false, strCh = null, esc = false;
while (i < appSrc.length) {
  const ch = appSrc[i];
  if (esc) { esc = false; i++; continue; }
  if (inStr) {
    if (ch === '\\') esc = true;
    else if (ch === strCh) inStr = false;
  } else {
    if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strCh = ch; }
    else if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) { i++; break; } }
  }
  i++;
}
const literal = appSrc.slice(arrStart, i);
const CHECKLIST_AREAS = eval(literal);

// ── Design tokens ────────────────────────────────────────────────────────
const INK = '0E0B07', MUTED = '8C7A68', STONE = 'E8DDD0';
const ORANGE = 'E8673A';

const run = (t, o = {}) => new TextRun({ text: String(t ?? ''), font: 'Arial', ...o });
const sp  = (n = 1) => Array.from({ length: n }, () => new Paragraph({ children: [new TextRun('')], spacing: { after: 80 } }));
const pb  = () => new Paragraph({ children: [new TextRun({ break: 1 })], pageBreakBefore: true });

const CONTENT_W = 9360;

// ── Cover ────────────────────────────────────────────────────────────────
const totalItems = CHECKLIST_AREAS.reduce((s, a) => s + a.items.length, 0);

const cover = [
  ...sp(2),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
    children: [run('ATTUNE', { size: 22, bold: true, color: ORANGE, allCaps: true, characterSpacing: 120 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [run('Starting Out Checklist', { size: 40, bold: true, color: INK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [run('Internal records — full content', { size: 15, italics: true, color: MUTED })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 },
    children: [run(`${CHECKLIST_AREAS.length} sections · ${totalItems} items`, { size: 13, color: MUTED })] }),

  // Summary of sections
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 120 },
    children: [run('Section order', { size: 12, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }),

  ...CHECKLIST_AREAS.map((area, i) => new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [
      run(`${i + 1}.  `, { size: 13, color: MUTED }),
      run(area.label, { size: 15, bold: true, color: area.color.replace('#', '') }),
      run(`   (${area.items.length} items)`, { size: 12, italics: true, color: MUTED }),
    ],
  })),

  ...sp(2),

  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240, after: 60 },
    children: [run('Notes', { size: 11, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [run('Each item has a text label, a descriptive note shown when users tap the disclosure arrow, and any relevant external links.',
      { size: 12, italics: true, color: MUTED })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [run('Source of truth: src/App.jsx → CHECKLIST_AREAS. This doc is generated from that array.',
      { size: 12, italics: true, color: MUTED })] }),
];

// ── Section renderer ─────────────────────────────────────────────────────
function renderSection(area, idx) {
  const color = area.color.replace('#', '');

  const header = [
    pb(),
    new Paragraph({ spacing: { before: 120, after: 40 },
      children: [run(`SECTION ${idx + 1}`, { size: 13, bold: true, color, characterSpacing: 80 })] }),
    new Paragraph({ spacing: { after: 80 },
      children: [
        run(area.icon + '  ', { size: 28 }),
        run(area.label, { size: 28, bold: true, color: INK }),
      ] }),
    new Paragraph({ spacing: { after: 120 },
      children: [run(`${area.items.length} items`, { size: 13, italics: true, color: MUTED })] }),
    new Paragraph({ spacing: { after: 240 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color, space: 4 } },
      children: [new TextRun('')] }),
  ];

  const items = area.items.flatMap((item, i) => {
    const blocks = [];

    // Item heading
    blocks.push(new Paragraph({
      spacing: { before: 200, after: 80 },
      indent: { left: 480, hanging: 480 },
      children: [
        run(`${idx + 1}.${i + 1}   `, { size: 13, bold: true, color, characterSpacing: 40 }),
        run(item.text, { size: 15, bold: true, color: INK }),
      ],
    }));

    // Description
    if (item.description) {
      blocks.push(new Paragraph({
        spacing: { after: 80, line: 300, lineRule: 'atLeast' },
        indent: { left: 480 },
        children: [run(item.description, { size: 13, color: INK })],
      }));
    }

    // Links
    if (item.links && item.links.length) {
      const linkChildren = [];
      item.links.forEach((link, li) => {
        if (li > 0) linkChildren.push(run('   ·   ', { size: 11, color: MUTED }));
        // External links only. Internal links (/portal) are noted in text.
        if (link.url.startsWith('http')) {
          linkChildren.push(new ExternalHyperlink({
            link: link.url,
            children: [
              new TextRun({ text: link.label + ' ↗', font: 'Arial', size: 11,
                color, style: 'Hyperlink', underline: { type: 'single', color } }),
            ],
          }));
        } else {
          linkChildren.push(run(link.label + ' (' + link.url + ')',
            { size: 11, color, italics: true }));
        }
      });
      blocks.push(new Paragraph({
        spacing: { after: 60, line: 280, lineRule: 'atLeast' },
        indent: { left: 480 },
        children: linkChildren,
      }));
    }

    // Thin separator
    blocks.push(new Paragraph({
      spacing: { before: 40, after: 0 },
      indent: { left: 480 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: STONE, space: 2 } },
      children: [new TextRun('')],
    }));

    return blocks;
  });

  return [...header, ...items];
}

// ── Assemble ────────────────────────────────────────────────────────────
const sections = CHECKLIST_AREAS.flatMap((area, i) => renderSection(area, i));

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
            run('Attune · Starting Out Checklist (internal)   ·   ', { size: 13, color: MUTED }),
            new TextRun({ children: [PageNumber.CURRENT], size: 13, color: INK, font: 'Arial' }),
            run(' / ', { size: 13, color: MUTED }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 13, color: MUTED, font: 'Arial' }),
          ] })],
      }),
    },
    children: [...cover, ...sections],
  }],
});

const buf = await Packer.toBuffer(doc);
const outPath = '/tmp/newlywed_checklist_internal.docx';
writeFileSync(outPath, buf);
execSync('libreoffice --headless --convert-to pdf --outdir /tmp ' + outPath, { stdio: 'pipe' });
console.log(`✓ Newlywed checklist (internal): ${outPath} (${buf.length} bytes)`);
