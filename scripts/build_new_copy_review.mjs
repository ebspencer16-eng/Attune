// Build a review .docx for the NEW customer-facing copy added recently:
//   1. Same-type Communication Profile pages (4 versions: W/X/Y/Z)
//   2. Intimacy Expectations add-on questions (18 Qs x premarital/married)
//
// For Ellie + Carolina to redline before launch. Body size 22 (11pt) per the
// earlier flag that internal docs were too small. Sources are read straight
// from the live code so this always reflects what's shipped.
//
// Output: /mnt/user-data/outputs/attune_new_copy_review.docx

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle,
  Footer, PageNumber, AlignmentType,
} from '/home/claude/.npm-global/lib/node_modules/docx/dist/index.mjs';

import { INTIMACY_QUESTIONS, INTIMACY_DIMENSIONS } from '../api/_intimacy-questions.js';

const OUT = '/mnt/user-data/outputs';
mkdirSync(OUT, { recursive: true });

const ROSE = 'B5546E';
const INK = '0E0B07';
const MUTED = '8C7A68';

// ── Extract SAME_TYPE_PROFILE from App.jsx (it's a const, not exported) ──
const appSrc = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf-8');
const stMatch = appSrc.match(/const SAME_TYPE_PROFILE = (\{[\s\S]+?\n\});/);
if (!stMatch) throw new Error("Can't find SAME_TYPE_PROFILE in App.jsx");
const SAME_TYPE_PROFILE = (new Function('return ' + stMatch[1]))();
// Individual type names for headings
const itMatch = appSrc.match(/const INDIVIDUAL_TYPES = (\{[\s\S]+?\n\});/);
const INDIVIDUAL_TYPES = itMatch ? (new Function('return ' + itMatch[1]))() : {};

// ── docx helpers ──
const p = (text, opts = {}) => new Paragraph({
  children: [new TextRun({ text, size: opts.size || 22, bold: opts.bold, italics: opts.italics, color: opts.color || INK })],
  spacing: { after: opts.after ?? 80, before: opts.before ?? 0 },
  indent: opts.indent ? { left: opts.indent } : undefined,
});
const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 }, children: [new TextRun({ text })] });
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 }, children: [new TextRun({ text })] });
const eyebrow = (text, color = ROSE) => new Paragraph({
  spacing: { before: 160, after: 40 },
  children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 16, color, characterSpacing: 30 })],
});
const rule = () => new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E8DDD0' } }, spacing: { after: 120 } });
const bullet = (text, opts = {}) => new Paragraph({
  bullet: { level: opts.level || 0 },
  children: [new TextRun({ text, size: opts.size || 22, color: opts.color || INK, bold: opts.bold })],
  spacing: { after: 40 },
});

const children = [];

// ── Title ──
children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'ATTUNE · NEW COPY REVIEW', bold: true, size: 18, color: ROSE, characterSpacing: 40 })] }));
children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: 'Same-Type Profiles + Intimacy Expectations' })] }));
children.push(p('Two new customer-facing copy areas for review. Mark anything to change. The question ids are stable, so wording edits will not disturb saved answers.', { italics: true, color: MUTED, after: 200 }));

// ════════════════════════════════════════════════════════════════════
// SECTION 1 — SAME-TYPE COMMUNICATION PROFILES
// ════════════════════════════════════════════════════════════════════
children.push(h1('1. Same-Type Communication Profiles'));
children.push(p('Shown when both partners share the same individual type. Replaces the two near-identical individual profile pages with one combined page. Four versions, one per type.', { color: MUTED, after: 160 }));

const TYPE_ORDER = ['W', 'X', 'Y', 'Z'];
TYPE_ORDER.forEach((code, i) => {
  const prof = SAME_TYPE_PROFILE[code];
  if (!prof) return;
  const name = INDIVIDUAL_TYPES[code]?.name || code;
  children.push(h2(`1.${i + 1}  Both ${name} (${code}/${code})`));
  children.push(eyebrow('Opening line'));
  children.push(p(prof.hook));
  children.push(eyebrow('What you share'));
  children.push(p(prof.shared));
  children.push(eyebrow('Where it can get tricky'));
  children.push(p(prof.tricky));
  children.push(rule());
});

// ════════════════════════════════════════════════════════════════════
// SECTION 2 — INTIMACY EXPECTATIONS QUESTIONS
// ════════════════════════════════════════════════════════════════════
children.push(new Paragraph({ pageBreakBefore: true, children: [] }));
children.push(h1('2. Intimacy Expectations — Add-On Questions'));
children.push(p('SCAFFOLD COPY — pending Carolina review. 18 questions across 6 dimensions. Each question shows both variant framings (premarital / already-married) and every answer option. Every question is required; "Prefer not to say" is the comfort option.', { italics: true, color: MUTED, after: 80 }));
children.push(p('Entry framing (shown before the questions):', { bold: true, after: 40 }));
children.push(p('Physical intimacy is one of the biggest things couples assume they are aligned on, and one of the least talked about. This is a private set of questions about what you each expect. You answer on your own. Neither of you sees the other\'s answers until you have both finished. There are no right answers, and no answer here is better than another. This is an expectations tool, not therapy.', { italics: true, indent: 360, after: 160 }));

INTIMACY_DIMENSIONS.forEach((dim, di) => {
  children.push(h2(`2.${di + 1}  ${dim.label}`));
  const qs = INTIMACY_QUESTIONS.filter(q => q.dimension === dim.id);
  qs.forEach((q, qi) => {
    children.push(p(`${dim.label} — Q${qi + 1}: ${q.topic}`, { bold: true, before: 120, after: 40 }));
    children.push(new Paragraph({
      spacing: { after: 30 }, indent: { left: 360 },
      children: [
        new TextRun({ text: 'Premarital: ', bold: true, size: 20, color: ROSE }),
        new TextRun({ text: q.premarital, size: 20, color: INK }),
      ],
    }));
    children.push(new Paragraph({
      spacing: { after: 50 }, indent: { left: 360 },
      children: [
        new TextRun({ text: 'Married: ', bold: true, size: 20, color: ROSE }),
        new TextRun({ text: q.married, size: 20, color: INK }),
      ],
    }));
    const kindNote = q.kind === 'multi' ? (q.maxSelect ? `select up to ${q.maxSelect}` : 'select all that apply') : (q.kind === 'selfref' ? 'self-referential (both picking the same side = a gap)' : 'single choice');
    children.push(p(`Options (${kindNote}):`, { size: 18, color: MUTED, indent: 360, after: 20 }));
    q.options.forEach(o => children.push(bullet(o.label, { size: 20, level: 0 })));
  });
  children.push(rule());
});

// ── Render ──
const doc = new Document({
  styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  sections: [{
    properties: { page: { margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ['Page ', PageNumber.CURRENT], size: 16, color: MUTED })] })] }) },
    children,
  }],
});

const buf = await Packer.toBuffer(doc);
const out = `${OUT}/attune_new_copy_review.docx`;
writeFileSync(out, buf);
console.log(`Wrote ${out} (${buf.length} bytes)`);
