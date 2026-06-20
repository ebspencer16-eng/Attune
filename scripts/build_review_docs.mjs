// Content review docs — organized set, read live from source so they always
// reflect what is currently shipped.
//
// Produces four docs (the fifth, workbook content, is build_content_review.mjs):
//   1. attune_site_copy_review.docx       — marketing site copy, page by page
//   2. attune_results_content_review.docx — universal results framework
//   3. attune_results_specific_review.docx— answer-dependent results prose
//   4. attune_workbook_specific_review.docx— answer-dependent workbook prose
//
// Body size 22 (11pt) per the standing note that internal docs were too small.

import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import {
  Document, Packer, Paragraph, TextRun,
  HeadingLevel, BorderStyle, Footer, PageNumber, AlignmentType,
} from '/home/claude/.npm-global/lib/node_modules/docx/dist/index.mjs';
import { DIM_META, DIM_CONTENT, GAP_BLURBS, WHEN_THIS_SHOWS_UP, DIMS } from '../api/_workbook-content.js';

const OUT = '/mnt/user-data/outputs';
mkdirSync(OUT, { recursive: true });

const INK = '0E0B07', MUTED = '8C7A68', STONE = 'E8DDD0', ORANGE = 'C8522E', BLUE = '1B5FE8';

// ── docx helpers ──────────────────────────────────────────────────────────
const p = (text, o = {}) => new Paragraph({
  children: [new TextRun({ text: String(text), size: o.size || 22, bold: o.bold, italics: o.italics, color: o.color || INK })],
  spacing: { after: o.after ?? 90, before: o.before ?? 0 },
});
const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 120 }, children: [new TextRun({ text })] });
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 70 }, children: [new TextRun({ text })] });
const eyebrow = (text, color = ORANGE) => new Paragraph({ spacing: { before: 160, after: 40 }, children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 16, color, characterSpacing: 30 })] });
const label = (k, v) => new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: k + ': ', bold: true, size: 22, color: MUTED }), new TextRun({ text: String(v), size: 22, color: INK })] });
const rule = () => new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: STONE } }, spacing: { after: 130 } });

const buildDoc = (title, subtitle, children) => new Document({
  styles: { default: { document: { run: { font: 'Calibri' } } } },
  sections: [{
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Attune content review  ·  ', size: 16, color: MUTED }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: MUTED })] })] }) },
    children: [
      new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: title, bold: true, size: 44, color: INK })] }),
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: subtitle, italics: true, size: 22, color: MUTED })] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Read live from source on ' + new Date().toISOString().slice(0, 10) + '. Reflects current shipped copy.', size: 18, color: MUTED })] }),
      ...children,
    ],
  }],
});
const save = async (doc, name) => { const buf = await Packer.toBuffer(doc); writeFileSync(`${OUT}/${name}`, buf); console.log(`✓ ${name} (${buf.length} bytes)`); };

// ── source extraction ───────────────────────────────────────────────────────
const appSrc = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf-8');
function objLiteral(src, name) {
  const decl = new RegExp('const ' + name + '\\s*=\\s*').exec(src);
  if (!decl) throw new Error('not found: ' + name);
  let i = decl.index + decl[0].length;
  while (i < src.length && src[i] !== '{' && src[i] !== '[') i++;
  let depth = 0, inStr = false, ch = '';
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (inStr) { if (c === '\\') { j++; continue; } if (c === ch) inStr = false; }
    else { if (c === '"' || c === "'" || c === '`') { inStr = true; ch = c; } else if (c === '{' || c === '[') depth++; else if (c === '}' || c === ']') { depth--; if (depth === 0) return src.slice(i, j + 1); } }
  }
  throw new Error('unbalanced: ' + name);
}
const INDIVIDUAL_TYPES = (new Function('return ' + objLiteral(appSrc, 'INDIVIDUAL_TYPES')))();
const NEW_COUPLE_TYPES = (new Function('return ' + objLiteral(appSrc, 'NEW_COUPLE_TYPES')))();
// SHIFTS has ${loName}/${hiName} template literals — eval with readable placeholders.
const SHIFTS = (new Function('loName', 'hiName', 'return ' + objLiteral(appSrc, 'SHIFTS')))('[Partner A]', '[Partner B]');
console.log(`Loaded ${Object.keys(INDIVIDUAL_TYPES).length} individual types, ${NEW_COUPLE_TYPES.length} couple types, ${Object.keys(SHIFTS).length} shift dimensions`);

const dimName = (d) => (DIM_META[d]?.label || d);
const dimPoles = (d) => DIM_META[d] ? `${DIM_META[d].left} ↔ ${DIM_META[d].right}` : '';

// ════════════════════════════════════════════════════════════════════════════
// DOC 1 — SITE COPY
// ════════════════════════════════════════════════════════════════════════════
function decode(s) {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;|&apos;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—')
    .replace(/&hellip;/g, '…').replace(/\s+/g, ' ').trim();
}
const SITE_PAGES = [
  ['home.html', 'Home'], ['purpose.html', 'Purpose'], ['how-it-works.html', 'How It Works'],
  ['offerings.html', 'Offerings / Pricing'], ['couple-types.html', 'Couple Types'], ['faq.html', 'FAQ'],
  ['resources.html', 'Resources'], ['practice.html', 'Practice'], ['start.html', 'Start'],
  ['reviews.html', 'Reviews'], ['welcome.html', 'Welcome'], ['gift-cards.html', 'Gift Cards'],
  ['wedding-registry.html', 'Wedding Registry'], ['contact.html', 'Contact'],
];
async function buildSiteCopy() {
  const kids = [];
  for (const [file, name] of SITE_PAGES) {
    let html;
    try { html = readFileSync(new URL('../public/' + file, import.meta.url), 'utf-8'); } catch { continue; }
    html = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
    const matches = [...html.matchAll(/<(h1|h2|h3|p)\b[^>]*>([\s\S]*?)<\/\1>/gi)];
    const blocks = [];
    for (const m of matches) {
      const tag = m[1].toLowerCase(); const txt = decode(m[2]);
      if (txt.length < 2) continue;
      if (/^(©|\d{4}|terms|privacy|all rights)/i.test(txt) && tag === 'p') continue;
      blocks.push({ tag, txt });
    }
    if (!blocks.length) continue;
    kids.push(h1(name), p(file, { color: MUTED, size: 18, after: 120 }));
    for (const b of blocks) {
      if (b.tag === 'h1' || b.tag === 'h2') kids.push(p(b.txt, { bold: true, size: 26, before: 100 }));
      else if (b.tag === 'h3') kids.push(p(b.txt, { bold: true, size: 22, before: 60 }));
      else kids.push(p(b.txt));
    }
    kids.push(rule());
  }
  await save(buildDoc('Site Copy', 'Customer-facing marketing copy, page by page', kids), 'attune_site_copy_review.docx');
}

// ════════════════════════════════════════════════════════════════════════════
// DOC 2 — RESULTS CONTENT (universal framework)
// ════════════════════════════════════════════════════════════════════════════
async function buildResultsContent() {
  const kids = [];
  kids.push(h1('The four individual types'), p('Each person resolves to one of four types. These descriptions are the same for everyone of that type.', { italics: true, color: MUTED }));
  for (const code of ['W', 'X', 'Y', 'Z']) {
    const t = INDIVIDUAL_TYPES[code]; if (!t) continue;
    kids.push(h2(`${code} — ${t.name}`));
    kids.push(label('Axes', `${t.axis1} + ${t.axis2}`));
    if (t.typeDesc) kids.push(p(t.typeDesc));
    kids.push(p('', { after: 40 }));
  }
  kids.push(rule());
  kids.push(h1('The ten dimensions'), p('The communication exercise maps these ten dimensions. Each is a continuum; neither end is better than the other.', { italics: true, color: MUTED }));
  for (const d of DIMS) {
    kids.push(h2(dimName(d)));
    kids.push(label('Spectrum', dimPoles(d)));
    if (DIM_CONTENT[d]?.measures) kids.push(p(DIM_CONTENT[d].measures));
  }
  await save(buildDoc('Results Content', 'The universal results framework: the four types and ten dimensions everyone sees', kids), 'attune_results_content_review.docx');
}

// ════════════════════════════════════════════════════════════════════════════
// DOC 3 — RESULTS SPECIFIC (answer-dependent)
// ════════════════════════════════════════════════════════════════════════════
async function buildResultsSpecific() {
  const kids = [];
  kids.push(h1('1. Couple types'), p('One of ten pairings, shown based on both partners\u2019 types.', { italics: true, color: MUTED }));
  NEW_COUPLE_TYPES.forEach((ct, i) => {
    kids.push(h2(`1.${i + 1}  ${ct.name}  (${ct.typeA}${ct.typeB})`));
    if (ct.tagline) kids.push(p(ct.tagline, { italics: true }));
    if (ct.description) kids.push(p(ct.description));
    if (ct.nuance) { kids.push(eyebrow('Nuance')); kids.push(p(ct.nuance)); }
    const listOf = (arr, name) => { if (Array.isArray(arr) && arr.length) { kids.push(eyebrow(name)); arr.forEach(x => kids.push(p('• ' + (typeof x === 'string' ? x : (x.title ? x.title + ': ' + (x.body || '') : JSON.stringify(x)))))); } };
    listOf(ct.strengths, 'Strengths');
    listOf(ct.stickingPoints, 'Sticking points');
    listOf(ct.patterns, 'Patterns');
    listOf(ct.tips, 'Tips');
    kids.push(rule());
  });
  kids.push(h1('2. Per-dimension shift notes'), p('Advice keyed to where each partner sits on a dimension. [Partner A] is the lower-scoring partner, [Partner B] the higher.', { italics: true, color: MUTED }));
  for (const d of Object.keys(SHIFTS)) {
    kids.push(h2(dimName(d)));
    const block = SHIFTS[d];
    for (const k of Object.keys(block)) {
      kids.push(label(k.replace('_', ' vs '), ''));
      kids.push(p(block[k], { after: 70 }));
    }
  }
  await save(buildDoc('Results — Specific Content', 'Answer-dependent results prose: the ten couple types and per-dimension shift notes', kids), 'attune_results_specific_review.docx');
}

// ════════════════════════════════════════════════════════════════════════════
// DOC 5 — WORKBOOK SPECIFIC (answer-dependent)
// ════════════════════════════════════════════════════════════════════════════
const TYPE_LABELS = { WW: 'WW', XX: 'XX', YY: 'YY', ZZ: 'ZZ', WX: 'WX', WY: 'WY', WZ: 'WZ', XY: 'XY', XZ: 'XZ', YZ: 'YZ' };
async function buildWorkbookSpecific() {
  const kids = [];
  kids.push(p('For each dimension: the gap blurbs that vary by how far apart the partners scored, and the couple-type note shown for that pairing. {U}/{P} resolve to the partners\u2019 names; [W partner name] etc. resolve by type.', { italics: true, color: MUTED, after: 160 }));
  for (const d of DIMS) {
    kids.push(h1(dimName(d)));
    kids.push(label('Spectrum', dimPoles(d)));
    const c = DIM_CONTENT[d] || {};
    if (c.closeText) { kids.push(eyebrow('When aligned (close text)')); kids.push(p(c.closeText)); }
    if (c.gapText) { kids.push(eyebrow('When there is a gap (gap text)')); kids.push(p(c.gapText)); }
    const gb = GAP_BLURBS[d] || {};
    kids.push(eyebrow('Gap blurbs (by distance)'));
    for (const k of ['aligned', 'some_gap', 'notable_gap']) if (gb[k]) kids.push(p(`${k}: ${gb[k]}`, { after: 70 }));
    const wt = WHEN_THIS_SHOWS_UP[d] || {};
    kids.push(eyebrow('When this shows up (per couple type)'));
    for (const k of Object.keys(TYPE_LABELS)) if (wt[k]) kids.push(p(`${k}: ${wt[k]}`, { after: 70 }));
    kids.push(rule());
  }
  await save(buildDoc('Workbook — Specific Content', 'Answer-dependent workbook prose: gap blurbs and per-couple-type notes for each dimension', kids), 'attune_workbook_specific_review.docx');
}

await buildSiteCopy();
await buildResultsContent();
await buildResultsSpecific();
await buildWorkbookSpecific();
console.log('done');
