// LMFT context doc — the single document a clinical reviewer needs to
// evaluate Attune's workbook and exercises for clinical safety, framing,
// and use as a couples assessment tool.
//
// Sections:
//   1. What Attune is (and isn't)
//   2. The 10 communication dimensions
//   3. The 6 expectation domains
//   4. The 10 couple types
//   5. How workbook content is generated
//   6. What we want flagged

import { writeFileSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
  Footer, PageNumber,
} from 'docx';

// ── Source data ──────────────────────────────────────────────────────────
const contentSource = readFileSync(new URL('../api/_workbook-content.js', import.meta.url), 'utf-8');
const appSource     = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf-8');
const builderSource = readFileSync(new URL('./build_workbook.py', import.meta.url), 'utf-8');

function evalExport(source, name) {
  const startRe = new RegExp('export\\s+const\\s+' + name + '\\s*=\\s*');
  const startMatch = source.match(startRe);
  if (!startMatch) throw new Error(`Can't find ${name} in source`);
  const startIdx = startMatch.index + startMatch[0].length;
  const rest = source.slice(startIdx);
  const firstChar = rest[0];
  const closeChar = firstChar === '{' ? '}' : ']';
  let depth = 0, i = 0, inStr = false, strCh = '', end = -1;
  while (i < rest.length) {
    const c = rest[i];
    if (inStr) {
      if (c === '\\' && i + 1 < rest.length) { i += 2; continue; }
      if (c === strCh) inStr = false;
      i++; continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = true; strCh = c; i++; continue; }
    if (c === firstChar) depth++;
    else if (c === closeChar) { depth--; if (depth === 0) { end = i; break; } }
    i++;
  }
  if (end === -1) throw new Error(`Can't find end of ${name}`);
  return (new Function('return ' + rest.slice(0, end + 1)))();
}

const m = appSource.match(/const NEW_COUPLE_TYPES = (\[[\s\S]+?\n\]);/);
const NEW_COUPLE_TYPES = (new Function('return ' + m[1]))();
const DIM_META    = evalExport(contentSource, 'DIM_META');
const DIM_CONTENT = evalExport(contentSource, 'DIM_CONTENT');
const DIMS        = evalExport(contentSource, 'DIMS');

// ── Design tokens ────────────────────────────────────────────────────────
const ORANGE = 'E8673A', BLUE = '1B5FE8', PURPLE = '9B5DE5', GREEN = '10B981', PLUM = '6B2C5A';
const INK = '0E0B07', MUTED = '8C7A68', SLATE = '5A4D3F', STONE = 'E8DDD0';
const WARM_BG = 'FAF7F1';

const run = (t, o = {}) => new TextRun({ text: String(t ?? ''), font: 'Arial', ...o });
const sp  = (n = 1) => Array.from({ length: n }, () => new Paragraph({ children: [new TextRun('')], spacing: { after: 80 } }));
const pb  = () => new Paragraph({ children: [new TextRun({ break: 1 })], pageBreakBefore: true });

const prose = (text, opts = {}) => new Paragraph({
  spacing: { after: opts.after ?? 120, line: 300, lineRule: 'atLeast' },
  indent: opts.indent ? { left: opts.indent } : undefined,
  children: [run(text, { size: opts.size ?? 22, color: opts.color ?? INK, italics: opts.italics, bold: opts.bold })],
});

const eyebrow = (text, color = ORANGE) => new Paragraph({
  spacing: { before: 100, after: 80 },
  children: [run(text, { size: 14, bold: true, color, allCaps: true, characterSpacing: 80 })],
});

const sectionHeader = (num, title, subtitle, color) => [
  pb(),
  new Paragraph({ spacing: { before: 120, after: 60 },
    children: [run(`SECTION ${num}`, { size: 14, bold: true, color, characterSpacing: 80 })] }),
  new Paragraph({ spacing: { after: 80 },
    children: [run(title, { size: 32, bold: true, color: INK })] }),
  new Paragraph({ spacing: { after: 240 },
    children: [run(subtitle, { size: 16, italics: true, color: MUTED })] }),
  new Paragraph({ spacing: { after: 240 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color, space: 4 } },
    children: [new TextRun('')] }),
];

const subhead = (text, color = INK) => new Paragraph({
  spacing: { before: 240, after: 80 },
  children: [run(text, { size: 20, bold: true, color })],
  keepNext: true,
});

const callout = (label, body, color = ORANGE) => {
  const border = { style: BorderStyle.SINGLE, size: 6, color };
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: { top: border, bottom: border, left: { style: BorderStyle.SINGLE, size: 24, color }, right: border },
      shading: { fill: WARM_BG, type: ShadingType.CLEAR },
      margins: { top: 160, bottom: 160, left: 240, right: 240 },
      children: [
        new Paragraph({ spacing: { after: 60 },
          children: [run(label, { size: 12, bold: true, color, allCaps: true, characterSpacing: 60 })] }),
        new Paragraph({
          spacing: { after: 0, line: 280, lineRule: 'atLeast' },
          children: [run(body, { size: 20, color: INK, italics: true })],
        }),
      ],
    })] })],
  });
};

// Two-column key/value box for dim or domain summaries
const kvTable = (rows, color) => {
  const border = { style: BorderStyle.SINGLE, size: 4, color: 'D9CDBA' };
  const borders = { top: border, bottom: border, left: border, right: border };
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 6960],
    rows: rows.map(([k, v]) => new TableRow({ children: [
      new TableCell({ borders, width: { size: 2400, type: WidthType.DXA },
        shading: { fill: WARM_BG, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 160, right: 160 },
        children: [new Paragraph({ children: [run(k, { size: 12, bold: true, color, allCaps: true, characterSpacing: 40 })] })],
      }),
      new TableCell({ borders, width: { size: 6960, type: WidthType.DXA },
        margins: { top: 100, bottom: 100, left: 160, right: 160 },
        children: [new Paragraph({ children: [run(v, { size: 20, color: INK })] })],
      }),
    ] })),
  });
};

// ── Cover ─────────────────────────────────────────────────────────────────
const cover = [
  ...sp(3),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [run('ATTUNE', { size: 22, bold: true, color: ORANGE, allCaps: true, characterSpacing: 120 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [run('Clinical context', { size: 42, bold: true, color: INK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 360 },
    children: [run('Reference document for the LMFT review of Attune\'s couples assessment platform.',
      { size: 17, italics: true, color: MUTED })] }),

  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 80 },
    children: [run('What this document is', { size: 13, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 280 },
    children: [run('Everything a clinical reviewer needs to evaluate the assessment, the workbook, and the framing without reading the codebase.',
      { size: 14, italics: true, color: MUTED })] }),

  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 100 },
    children: [run('Sections', { size: 13, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }),

  ...[
    ['1.', 'What Attune is, and what it is not', 'Product framing, positioning, scope of clinical risk'],
    ['2.', 'The 10 communication dimensions', 'What each measures, axis poles, neutral framing'],
    ['3.', 'The 6 expectation domains', 'Universal row labels, alignment-state prose'],
    ['4.', 'The 10 couple types', 'Names, taglines, descriptive vs diagnostic framing'],
    ['5.', 'How workbook content is generated', 'Gap blurb + type blurb model, name substitution'],
    ['6.', 'What we want flagged', 'Specific clinical questions for the review'],
  ].map(([num, title, info]) => new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [
      run(num + '   ', { size: 13, bold: true, color: ORANGE }),
      run(title + '   ', { size: 14, color: INK }),
      run(', ' + info, { size: 12, italics: true, color: MUTED }),
    ],
  })),
];

// ── Section 1 ─────────────────────────────────────────────────────────────
const section1 = [
  ...sectionHeader(1, 'What Attune is, and what it is not',
    'A clinical-risk frame for the rest of this document.', ORANGE),

  prose('Attune is a couples relationship assessment platform. Two people each take an exercise about how they communicate, what they expect, and what they want. The product gives them back a snapshot of where they align, where they don\'t, and what to do about it. It produces a printed workbook built from their actual answers.', { after: 160 }),

  prose('It is descriptive, not prescriptive. It names dynamics that already exist, in language each partner can use with the other. It does not diagnose, treat, or replace clinical care.', { after: 240 }),

  subhead('Where Attune sits clinically', INK),
  prose('Closer to a structured conversation tool than a clinical instrument. Couples buy and use it independently of a clinician. They can also bring it to therapy. The workbook is not a screener. The output is not a diagnosis. The voice throughout is descriptive: "you handle conflict at different speeds" rather than "one of you has a conflict avoidance pattern."', { after: 240 }),

  subhead('Where the clinical risk lives', INK),
  prose('Three places worth flagging:', { after: 120 }),
  prose('First, framing. Couples in genuine distress may use the assessment to confirm a narrative they\'ve already built ("see, we\'re mismatched") rather than open a conversation. Voice rules try to prevent this by holding both ends of every dimension as legitimate, but voice in 130 short blurbs is hard to police.', { after: 120 }),
  prose('Second, escalation. Some prompts ask couples to discuss things they have actively avoided. If the avoidance was protective, surfacing it without scaffolding can do harm. Reflection prompts are deliberately open-ended; the practice prompts are bounded.', { after: 120 }),
  prose('Third, what is missing. Attune does not screen for IPV, control patterns, or addiction. It also does not catch them and route appropriately. We rely on the introduction copy to tell people that if a conversation surfaces something bigger than the workbook can hold, that is itself useful information.', { after: 240 }),

  callout('clinical reviewer focus', 'Where do you see specific harm risks in the current voice, the prompt structure, or the assumption that two consenting partners can use this independently?', ORANGE),
];

// ── Section 2: Communication dimensions ──────────────────────────────────
const section2 = [
  ...sectionHeader(2, 'The 10 communication dimensions',
    'Each dimension is a continuum. Scores fall 1–5. Neither end is framed as better.', PURPLE),

  prose('Each dimension has two endpoints, a 1–5 self-report scale, and a partner score on the same scale. The gap between the two scores determines what the workbook says about that dimension.', { after: 160 }),

  prose('Gap thresholds:', { bold: true, after: 60 }),
  prose('· Aligned: gap < 0.8.', { after: 40 }),
  prose('· Some gap: 0.8 to 1.4.', { after: 40 }),
  prose('· Notable gap: 1.5 or more.', { after: 240 }),

  prose('All 10 dimensions render in every workbook. The callout text adapts to the gap state. Listed below in workbook order.', { after: 200, italics: true, color: MUTED }),

  ...DIMS.flatMap((dimKey, i) => {
    const meta = DIM_META[dimKey] || {};
    const c = DIM_CONTENT[dimKey] || {};
    return [
      subhead(`${String(i + 1).padStart(2, '0')}. ${meta.label || dimKey}`, PURPLE),
      kvTable([
        ['Endpoints',  `${meta.left || '?'}  ←  →  ${meta.right || '?'}`],
        ['Measures',   c.measures || '(no measures text)'],
      ], PURPLE),
      sp(1)[0],
    ];
  }),
];

// ── Section 3: Expectation domains ────────────────────────────────────────
const EXP_DOMAINS_INFO = [
  ['Visible Household Labor', 'gold',  'Day-to-day domestic work. Cooking, tidying, repairs, calendar, hosting, vacations. 7 universal rows; values pulled from the responsibility exercise.'],
  ['Emotional & Invisible Labor', 'coral', 'Mental load and relationship maintenance. 5 universal rows.'],
  ['Extended Family', 'plum', 'Maintenance work across both partners\' families. 6 name-substituted rows: visits, staying in touch, gifting, each split between user\'s family and partner\'s family.'],
  ['Money, Work & Career', 'indigo', 'Financial orientation, money management, career priority. 6 universal rows.'],
  ['Life Together', 'green', 'Bigger questions: children, where you live, social life, daily rhythm, faith, core values. 7 universal rows.'],
  ['How We Operate', 'purple', 'Conflict timing, repair style, closeness, independence. 6 universal rows.'],
];

const section3 = [
  ...sectionHeader(3, 'The 6 expectation domains',
    'Each domain has fixed universal row labels. Values come from each partner\'s actual exercise responses.', BLUE),

  prose('The expectations exercise has 25 responsibility items across 5 categories and 20 life-question topics across 6 categories. Those answers feed into 6 workbook domain pages, each showing where the partners aligned, partially aligned, or held different blueprints.', { after: 160 }),

  prose('Alignment thresholds (on a 0–100 scale derived from match credit per row):', { bold: true, after: 60 }),
  prose('· Compatible: 75 or higher.', { after: 40 }),
  prose('· Worth discussing: 40 to 74.', { after: 40 }),
  prose('· Different blueprints: under 40.', { after: 240 }),

  prose('Domain summaries below. Each domain has three alignment-state texts (one per threshold) plus a "Try this week" practice. Full text in api/_workbook-content.js / scripts/build_workbook.py EXP_DOMAINS.', { after: 200, italics: true, color: MUTED }),

  ...EXP_DOMAINS_INFO.flatMap(([label, _color, desc], i) => [
    subhead(`${String(i + 1).padStart(2, '0')}. ${label}`, BLUE),
    prose(desc, { after: 120, indent: 200 }),
  ]),

  sp(1)[0],
  callout('clinical reviewer focus',
    'The Extended Family domain is new and uses {userName} and {partnerName} placeholders so each row is name-specific. Does the row set capture the work that actually drives friction in extended-family dynamics, or are we missing common load points (e.g. caregiving for aging parents, illness response)?',
    BLUE),
];

// ── Section 4: Couple types ───────────────────────────────────────────────
const section4 = [
  ...sectionHeader(4, 'The 10 couple types',
    'Each couple is assigned one type based on both partners\' positions on two axes (engage/withdraw, open/guarded). Names are descriptive of dynamics, not personalities.', GREEN),

  prose('The 10 types are derived from 4 individual types (W, X, Y, Z) and the 10 possible pairings. 4 are same-type pairings; 6 are cross-type. Each pairing has its own name, tagline, and prose throughout the workbook.', { after: 240 }),

  ...NEW_COUPLE_TYPES.flatMap((ct, i) => [
    subhead(`${String(i + 1).padStart(2, '0')}. ${ct.id}, ${ct.name}`, GREEN),
    kvTable([
      ['Pairing',  `${ct.id[0] === ct.id[1] ? 'Same-type' : 'Cross-type'}: type ${ct.id[0]} + type ${ct.id[1]}`],
      ['Tagline',  ct.tagline || '(no tagline)'],
    ], GREEN),
    sp(1)[0],
  ]),

  callout('clinical reviewer focus',
    'Are any of the type names diagnostic-feeling, pathologizing, or likely to land badly with a couple in distress? "The Anchor" reads as a strength frame. "The Protector" might read as a defense frame. The intent is descriptive of relational style, not personal pathology, but the line is fuzzy.',
    GREEN),
];

// ── Section 5: Content generation ────────────────────────────────────────
const section5 = [
  ...sectionHeader(5, 'How workbook content is generated',
    'Two-paragraph callout model. 130 prose blurbs total.', PLUM),

  prose('Each dimension page renders a side-by-side hero. The right column contains a callout with two italic paragraphs, written in voice rules tighter than the rest of the workbook (short declarative, no em dashes, no hedging, neither end framed as better).', { after: 240 }),

  subhead('Paragraph 1, gap blurb', PLUM),
  prose('Universal across couple types. Varies only by gap state. Describes the gap mechanic itself, not who you are. 30 blurbs total: 10 dimensions × 3 states (aligned / some gap / notable gap). Source: api/_workbook-content.js → GAP_BLURBS.', { after: 160 }),

  prose('Example, the Conflict Style notable-gap blurb:', { italics: true, color: MUTED, after: 80 }),
  callout('30 gap blurbs', '"You handle conflict at very different speeds. One needs to engage now; the other needs space first. Without an agreement, conflicts compound."', PLUM),

  sp(1)[0],
  subhead('Paragraph 2, type blurb', PLUM),
  prose('Couple-type-specific. 100 blurbs total: 10 dimensions × 10 couple types. Source: api/_workbook-content.js → WHEN_THIS_SHOWS_UP. Role letters (the W, the X, etc.) are substituted with the partner\'s actual names at render time.', { after: 160 }),

  prose('Example, the Conflict Style blurb for type WX (cross-type, both engage quickly):', { italics: true, color: MUTED, after: 80 }),
  callout('100 type blurbs', '"The W wants to surface feelings in the heat; the X wants to solve the problem logically. Split it. Name the feeling first, then the thing to solve. Neither gets skipped." Rendered: "Maya wants to surface feelings in the heat; David wants to solve the problem logically..."', PLUM),

  sp(1)[0],
  subhead('Why two paragraphs', PLUM),
  prose('The earlier model had one long blurb per couple type per dimension that tried to do both jobs (describe the gap, describe what it means for this specific pairing). It made the prose dense and the same content kept repeating across pairings. Splitting them lets each layer stay short and lets the reader see "here\'s what this gap looks like in general" alongside "here\'s how it shows up specifically for couples like us."', { after: 240 }),

  callout('clinical reviewer focus',
    'The full set of 130 blurbs is in the Specific Content Review document, organized by dimension. Voice flags to check for: prescriptive language, pathologizing framing, advice that assumes a specific relationship structure or sexual orientation, and any prompts that could be used as ammunition by one partner against the other.',
    PLUM),
];

// ── Section 6: What we want flagged ──────────────────────────────────────
const section6 = [
  ...sectionHeader(6, 'What we want flagged',
    'Specific clinical questions. Annotate the Specific Content Review document directly; this is the framing for that pass.', ORANGE),

  prose('In addition to general voice and clinical-risk concerns, please flag instances of:', { bold: true, after: 160 }),

  ...[
    ['Pathologizing language', 'Any blurb or prompt that names a partner\'s pattern as a deficit ("avoidant," "anxious," "reactive") rather than describing it neutrally. Voice rules try to hold both ends of each dimension as legitimate, but slipping happens.'],
    ['Diagnostic-feeling framing', 'Type names, taglines, or prose that read as a label for the person rather than the dynamic. The line between "this is how the two of you operate" and "this is who you are" is the line we are trying to hold.'],
    ['Imbalanced reciprocity', 'Any blurb where one partner is implicitly being asked to stretch more than the other. The default frame is mutual: "the W does X, the Y does Y," then both get a move.'],
    ['Assumptions about structure', 'Heteronormative defaults. Cisgender defaults. Two-parent-household defaults. Assumed monogamy. Marriage assumed over partnership. Any place the prose assumes one configuration where it does not need to.'],
    ['Risk of escalation', 'Practice prompts that could harm rather than help if used in a relationship with active control or violence. We do not screen for these dynamics; the prompts assume two consenting, regulated partners who can use the workbook in good faith.'],
    ['Things that are missing', 'Topics, dimensions, or domains a couple in clinical work would expect to see and we don\'t cover. Sex and physical intimacy are deliberately not their own dimension; physical-affection appears as one row of How We Operate. Money and career fold together. Both choices may be wrong.'],
  ].flatMap(([label, body], i) => [
    subhead(`${String(i + 1).padStart(2, '0')}. ${label}`, ORANGE),
    prose(body, { after: 240, indent: 200 }),
  ]),

  callout('how to return notes', 'The Specific Content Review document is editable docx. Mark up directly in the doc, or compile notes against the section numbers (e.g. "2.5.WX, third sentence reads as advice rather than description"). For broader concerns, write a short memo in the voice of "things I want changed" rather than "things to consider."', ORANGE),
];

// ── Assemble ─────────────────────────────────────────────────────────────
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
            run('Attune · Clinical context for LMFT review   ·   ', { size: 13, color: MUTED }),
            new TextRun({ children: [PageNumber.CURRENT], size: 13, color: INK, font: 'Arial' }),
            run(' / ', { size: 13, color: MUTED }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 13, color: MUTED, font: 'Arial' }),
          ] })],
      }),
    },
    children: [
      ...cover,
      ...section1, ...section2, ...section3,
      ...section4, ...section5, ...section6,
    ],
  }],
});

const buf = await Packer.toBuffer(doc);
const outPath = '/mnt/user-data/outputs/attune_lmft_context.docx';
writeFileSync(outPath, buf);
try {
  execSync('libreoffice --headless --convert-to pdf --outdir /mnt/user-data/outputs ' + outPath, { stdio: 'pipe' });
  console.log(`✓ LMFT context doc:         ${outPath}  (${buf.length} bytes)`);
  console.log(`✓ PDF render:               /mnt/user-data/outputs/attune_lmft_context.pdf`);
} catch (e) {
  console.log(`✓ LMFT context doc:         ${outPath}  (${buf.length} bytes)`);
  console.log(`  PDF render skipped (libreoffice unavailable).`);
}
