// Shared layout for the results-style review docs, lifted verbatim from
// build_specific_content_review.mjs so every results review reads identically:
// cover + numbered sections (big / mid / small) + prose, page-numbered footer,
// PDF render. New content docs import these instead of redefining the format.

import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
import {
  Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, Footer, PageNumber,
} from 'docx';

export const ORANGE = 'E8673A', BLUE = '1B5FE8', PURPLE = '9B5DE5', GREEN = '10B981';
export const INK = '0E0B07', MUTED = '8C7A68', STONE = 'E8DDD0', RED = 'C8402A';

export const run = (t, o = {}) => new TextRun({ text: String(t ?? ''), font: 'Arial', ...o });
export const sp = (n = 1) => Array.from({ length: n }, () => new Paragraph({ children: [new TextRun('')], spacing: { after: 80 } }));
export const pb = () => new Paragraph({ children: [new TextRun({ break: 1 })], pageBreakBefore: true });

export const INDENT_MID = 0;
export const INDENT_SMALL = 400;
export const INDENT_PROSE_UNDER_MID = 400;
export const INDENT_PROSE_UNDER_SMALL = 800;

export function bigSection(num, title, subtitle, color) {
  return [
    pb(),
    new Paragraph({ spacing: { before: 120, after: 40 }, children: [run(`SECTION ${num}`, { size: 14, bold: true, color, characterSpacing: 80 })] }),
    new Paragraph({ spacing: { after: 120 }, children: [run(title, { size: 36, bold: true, color: INK })] }),
    new Paragraph({ spacing: { after: 260 }, children: [run(subtitle, { size: 16, italics: true, color: MUTED })] }),
    new Paragraph({ spacing: { before: 0, after: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color, space: 4 } }, children: [new TextRun('')] }),
  ];
}

export function midSection(number, title, color, opts = {}) {
  const children = [
    run(number + '   ', { size: 18, bold: true, color, characterSpacing: 40 }),
    run(title, { size: 18, bold: true, color: INK }),
  ];
  if (opts.extras) {
    children.push(run('   ·   ', { size: 14, color: STONE }));
    children.push(run(opts.extras, { size: 14, italics: true, color: MUTED }));
  }
  return new Paragraph({ spacing: { before: opts.before ?? 360, after: 120 }, indent: { left: INDENT_MID }, keepNext: true, children });
}

export function smallSection(number, title, color, opts = {}) {
  const children = [run(number + '   ', { size: 13, bold: true, color, characterSpacing: 30 })];
  if (title) children.push(run(title, { size: 13, bold: true, color: INK }));
  if (opts.inline) {
    if (title) children.push(run('   ', { size: 13 }));
    children.push(run(opts.inline, { size: 13, color: INK, italics: opts.italicInline }));
  }
  return new Paragraph({ spacing: { before: opts.before ?? 260, after: opts.after ?? 100, line: 280, lineRule: 'atLeast' }, indent: { left: INDENT_SMALL }, keepNext: !opts.inline, children });
}

export function prose(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 0, after: opts.after ?? 120, line: 300, lineRule: 'atLeast' },
    indent: { left: opts.indent ?? INDENT_PROSE_UNDER_MID },
    children: [run(text, { size: opts.size ?? 14, color: opts.color ?? INK, italics: opts.italics })],
  });
}

export function caption(text, color = MUTED, indent = INDENT_MID) {
  return new Paragraph({ spacing: { before: 0, after: 80 }, indent: { left: indent }, children: [run(text, { size: 11, italics: true, color })] });
}

// Sub-heading inside a mid-section group (matches Section 2's group labels).
export function groupLabel(text, color, note) {
  const kids = [run(text + '   ', { size: 12, bold: true, color, allCaps: true, characterSpacing: 60 })];
  if (note) kids.push(run('· ' + note, { size: 11, italics: true, color: MUTED }));
  return new Paragraph({ spacing: { before: 240, after: 80 }, indent: { left: INDENT_SMALL }, children: kids });
}

// Tag/label line above a prose block (e.g. "WHAT NOT TO DO"), like the moments.
export function tag(text, color, indent = INDENT_PROSE_UNDER_SMALL) {
  return new Paragraph({ spacing: { before: 0, after: 50 }, indent: { left: indent }, children: [run(text, { size: 10, bold: true, color, allCaps: true, characterSpacing: 40 })] });
}

export function buildCover({ title, subtitle, howToUse, indexRows }) {
  const out = [
    ...sp(3),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [run('ATTUNE', { size: 22, bold: true, color: ORANGE, allCaps: true, characterSpacing: 120 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [run(title, { size: 42, bold: true, color: INK })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 360 }, children: [run(subtitle, { size: 17, italics: true, color: MUTED })] }),
  ];
  if (howToUse) {
    out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 160 }, children: [run('How to use this', { size: 13, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }));
    out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 320 }, children: [run(howToUse, { size: 15, italics: true, color: MUTED })] }));
  }
  if (indexRows && indexRows.length) {
    out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 140 }, children: [run('Index', { size: 13, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }));
    for (const [num, t, info] of indexRows) {
      out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [
        run(num + '   ', { size: 13, bold: true, color: ORANGE }),
        run(t + '   ', { size: 14, color: INK }),
        ...(info ? [run(info, { size: 12, italics: true, color: MUTED })] : []),
      ] }));
    }
  }
  return out;
}

// Comment- and string-aware brace matcher. `open` is the index of the first
// { or [. Returns the index of the matching closer, or -1.
export function matchBrace(s, open) {
  let depth = 0, inStr = false, ch = '';
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (c === '\\') { i++; continue; } if (c === ch) inStr = false; continue; }
    if (c === '/' && s[i + 1] === '/') { i = s.indexOf('\n', i); if (i < 0) return -1; continue; }
    if (c === '/' && s[i + 1] === '*') { i = s.indexOf('*/', i + 2) + 1; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = true; ch = c; continue; }
    if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

// Extract `const NAME = <literal>` from source and eval it. Optional template
// vars (e.g. loName/hiName) are passed in so backtick strings resolve.
export function evalConst(src, name, vars = {}) {
  const d = new RegExp('const ' + name + '\\s*=\\s*').exec(src);
  if (!d) throw new Error('not found: ' + name);
  let i = d.index + d[0].length;
  while (src[i] !== '{' && src[i] !== '[') i++;
  const literal = src.slice(i, matchBrace(src, i) + 1);
  const keys = Object.keys(vars);
  return (new Function(...keys, 'return ' + literal))(...keys.map(k => vars[k]));
}

export async function renderDoc({ footerLabel, children, outPath }) {
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
    sections: [{
      properties: { page: { margin: { top: 960, right: 960, bottom: 960, left: 960 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: STONE, space: 8 } }, spacing: { before: 120, after: 0 },
        children: [
          run(footerLabel + '   ·   ', { size: 13, color: MUTED }),
          new TextRun({ children: [PageNumber.CURRENT], size: 13, color: INK, font: 'Arial' }),
          run(' / ', { size: 13, color: MUTED }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 13, color: MUTED, font: 'Arial' }),
        ] })] }) },
      children,
    }],
  });
  const buf = await Packer.toBuffer(doc);
  writeFileSync(outPath, buf);
  try {
    execSync('libreoffice --headless --convert-to pdf --outdir ' + outPath.replace(/\/[^/]+$/, '') + ' ' + outPath, { stdio: 'pipe' });
    console.log(`✓ ${outPath} (${buf.length} bytes) + PDF`);
  } catch {
    console.log(`✓ ${outPath} (${buf.length} bytes)  [PDF skipped]`);
  }
}
