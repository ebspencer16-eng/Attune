// Generate 5 .docx documents for LMFT review of Exercise 02.
//
// Outputs (all .docx in /mnt/user-data/outputs/):
//   ex2-flow-core.docx          — full Core variant flow
//   ex2-flow-anniversary.docx   — full Anniversary variant flow
//   ex2-flow-revisiting.docx    — full Revisiting variant flow
//   ex2-variant-comparison.docx — side-by-side of all three
//   lmft-context.docx           — context + review questions for the LMFT
//
// Source of truth: scripts/_expectations_variants.mjs

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageBreak,
} from '/home/claude/.npm-global/lib/node_modules/docx/dist/index.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import {
  RESPONSIBILITY_CATEGORIES,
  RESPONSIBILITY_FRAMING,
  RESPONSIBILITY_OPTIONS,
  CHILDHOOD_QUESTION,
  LIFE_QUESTIONS,
  VARIANTS,
} from './_expectations_variants.mjs';

const OUT_DIR = '/mnt/user-data/outputs';
mkdirSync(OUT_DIR, { recursive: true });

// ── Shared style helpers ────────────────────────────────────────────────────
const INK = '0E0B07';
const MUTED = '8C7A68';
const BLUE = '1B5FE8';
const PURPLE = '9B5DE5';
const ORANGE = 'E8673A';
const STONE = 'E8DDD0';

const COMMON_STYLES = {
  default: { document: { run: { font: 'Calibri', size: 22 } } }, // 11pt
  paragraphStyles: [
    { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { size: 36, bold: true, font: 'Calibri', color: INK },
      paragraph: { spacing: { before: 400, after: 240 }, outlineLevel: 0 } },
    { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { size: 28, bold: true, font: 'Calibri', color: INK },
      paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 1 } },
    { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { size: 24, bold: true, font: 'Calibri', color: BLUE },
      paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
  ],
};

const PAGE = {
  size: { width: 12240, height: 15840 }, // US Letter
  margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
};

const NUMBERING = {
  config: [
    { reference: 'bullets',
      levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    { reference: 'numbers',
      levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  ],
};

// Helpers
const p = (text, opts = {}) => new Paragraph({
  children: [new TextRun({ text, color: opts.color, bold: opts.bold, italics: opts.italic, size: opts.size })],
  spacing: { after: opts.after || 80 },
  ...opts.paragraph,
});
const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text })] });
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text })] });
const h3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text })] });
const bullet = (text) => new Paragraph({
  numbering: { reference: 'bullets', level: 0 },
  children: [new TextRun({ text })],
  spacing: { after: 60 },
});
const eyebrow = (text, color = ORANGE) => new Paragraph({
  children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 16, color, characterSpacing: 50 })],
  spacing: { before: 160, after: 80 },
});
const rule = () => new Paragraph({
  children: [],
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: STONE, space: 1 } },
  spacing: { before: 80, after: 200 },
});

// Table cell helper
const cell = (text, opts = {}) => new TableCell({
  width: { size: opts.width, type: WidthType.DXA },
  shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
  margins: { top: 100, bottom: 100, left: 140, right: 140 },
  borders: {
    top:    { style: BorderStyle.SINGLE, size: 4, color: STONE },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: STONE },
    left:   { style: BorderStyle.SINGLE, size: 4, color: STONE },
    right:  { style: BorderStyle.SINGLE, size: 4, color: STONE },
  },
  children: (Array.isArray(text) ? text : [text]).map(t => {
    if (t instanceof Paragraph) return t;
    return new Paragraph({ children: [new TextRun({ text: t, bold: opts.bold, size: opts.size, color: opts.color })] });
  }),
});

// Substitute display names — the docs show concrete names for readability,
// matching how the user will see them in the app.
const U = 'Maya', P = 'David';
const subst = (s) => (s || '').replace(/\{userName\}/g, U).replace(/\{partnerName\}/g, P);

// ── DOC GENERATORS ──────────────────────────────────────────────────────────

function variantHeader(v) {
  return [
    new Paragraph({
      children: [new TextRun({ text: 'ATTUNE · EXERCISE 02 · EXPECTATIONS', bold: true, size: 16, color: MUTED, characterSpacing: 50 })],
      spacing: { after: 80 },
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: `${v.label} variant` })],
    }),
    new Paragraph({
      children: [new TextRun({ text: v.framingNote, italics: true, color: MUTED })],
      spacing: { after: 240 },
    }),
  ];
}

function variantMeta(v, hasResp, hasChildhood, hasLife) {
  return [
    eyebrow('Variant metadata', BLUE),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [2640, 6720],
      rows: [
        ['Audience',     v.audience],
        ['Packages',     v.packages],
        ['Entry point',  v.entryPoint],
        ['Flag in code', v.flag],
        ['Sections',     [
          hasLife ? '✓ Life & Values questions (20 questions)' : '',
          hasChildhood ? '✓ Childhood home structure' : '',
          hasResp ? '✓ Responsibility allocation (25 items, 5 categories)' : '',
        ].filter(Boolean).join('\n')],
      ].map(([k, val]) => new TableRow({
        children: [
          cell(k, { width: 2640, fill: 'FBF8F3', bold: true, size: 20 }),
          cell(val.split('\n').map(line => new Paragraph({ children: [new TextRun({ text: line, size: 20 })] })), { width: 6720 }),
        ],
      })),
    }),
    new Paragraph({ children: [], spacing: { after: 240 } }),
  ];
}

function lifeQuestionsSection(variantKey) {
  const grouped = {};
  LIFE_QUESTIONS.forEach(q => {
    if (!grouped[q.category]) grouped[q.category] = [];
    grouped[q.category].push(q);
  });

  const out = [
    h2('Part 1 — Life & Values'),
    new Paragraph({
      children: [new TextRun({ text: '20 questions across 6 categories. Each shows a bold topic and a softer framing phrase. The framing phrase is the only thing that changes between variants.', italics: true, color: MUTED, size: 20 })],
      spacing: { after: 200 },
    }),
  ];

  Object.entries(grouped).forEach(([cat, qs]) => {
    out.push(h3(cat));
    qs.forEach((q, i) => {
      const topic = subst(q.topic);
      const framing = q[variantKey];
      out.push(new Paragraph({
        children: [
          new TextRun({ text: `Q${LIFE_QUESTIONS.indexOf(q) + 1}. `, bold: true, size: 22, color: INK }),
          new TextRun({ text: topic, bold: true, size: 22, color: INK }),
          new TextRun({ text: ` — ${framing}`, size: 22, color: MUTED, italics: true }),
        ],
        spacing: { before: 120, after: 60 },
      }));
      // Options as a single line for compactness
      out.push(new Paragraph({
        children: [
          new TextRun({ text: 'Options: ', bold: true, size: 18, color: MUTED }),
          new TextRun({ text: q.options.join(' · '), size: 18, color: MUTED }),
        ],
        spacing: { after: 80 },
        indent: { left: 360 },
      }));
    });
  });

  return out;
}

function childhoodSection() {
  return [
    new Paragraph({ children: [new PageBreak()] }),
    h2('Part 1.5 — Childhood home structure'),
    new Paragraph({
      children: [new TextRun({ text: 'Single question. Shown only in the Core variant. Determines the column labels used in Part 2 ("Mom", "Dad", "Both", or the structure the partner indicated).', italics: true, color: MUTED, size: 20 })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: CHILDHOOD_QUESTION.text, bold: true, size: 22 })],
      spacing: { before: 120, after: 100 },
    }),
    ...CHILDHOOD_QUESTION.options.map(opt => bullet(opt)),
  ];
}

function responsibilitiesSection(variantKey, includeChildhood) {
  const framing = RESPONSIBILITY_FRAMING[variantKey];
  const partLabel = variantKey === 'core' ? 'Part 2 — Responsibility allocation' : 'Part 2 — Responsibility allocation';

  const out = [
    new Paragraph({ children: [new PageBreak()] }),
    h2(partLabel),
    new Paragraph({
      children: [new TextRun({ text: framing, italics: true, color: MUTED, size: 22 })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Standard answer options: ', bold: true, size: 20, color: MUTED }),
        new TextRun({ text: RESPONSIBILITY_OPTIONS, size: 20, color: MUTED }),
      ],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: '"Both of us" selections prompt a follow-up: Genuinely 50/50 · Usually one, sometimes the other · vice versa. Required to continue.', italics: true, color: MUTED, size: 18 })],
      spacing: { after: 200 },
    }),
  ];

  if (includeChildhood) {
    out.push(new Paragraph({
      children: [new TextRun({ text: 'In the Core variant, the user answers each item TWICE: once for who they grew up seeing handle it (using the childhood structure column labels), and once for who they expect to handle it in their own life going forward.', italics: true, color: MUTED, size: 18 })],
      border: { left: { style: BorderStyle.SINGLE, size: 12, color: BLUE, space: 8 } },
      indent: { left: 240 },
      spacing: { after: 240 },
    }));
  }

  RESPONSIBILITY_CATEGORIES.forEach(cat => {
    out.push(h3(`${cat.label} (${cat.items.length} items)`));
    cat.items.forEach(item => {
      out.push(bullet(subst(item)));
    });
  });

  return out;
}

function buildVariantDoc(variantKey) {
  const v = VARIANTS[variantKey];
  const hasLife = true;
  const hasChildhood = variantKey === 'core';
  const hasResp = variantKey === 'core' || variantKey === 'anniversary';

  const children = [
    ...variantHeader(v),
    ...variantMeta(v, hasResp, hasChildhood, hasLife),
    rule(),
    h2('Flow'),
    ...(variantKey === 'core' ? [
      bullet('Intro screen'),
      bullet('Part 1 — Life & Values questions (20 questions)'),
      bullet('Part 1.5 — Childhood home structure (1 question)'),
      bullet('Part 2 — Responsibility allocation (25 items, answered twice: childhood + future)'),
      bullet('Done screen'),
    ] : variantKey === 'anniversary' ? [
      bullet('Intro screen'),
      bullet('Part 1 — Life & Values questions (20 questions)'),
      bullet('Part 2 — Responsibility allocation (25 items, present-tense, answered once)'),
      bullet('Done screen'),
    ] : [
      bullet('Intro screen'),
      bullet('Part 1 — Life & Values questions (20 questions)'),
      bullet('Done screen'),
      new Paragraph({
        children: [new TextRun({ text: 'No responsibility section. No childhood section. Roughly 10 minutes to complete vs ~15 minutes for the other two variants.', italics: true, color: MUTED, size: 20 })],
        spacing: { before: 120, after: 120 },
      }),
    ]),
    new Paragraph({ children: [new PageBreak()] }),
    ...lifeQuestionsSection(variantKey),
  ];

  if (hasChildhood) children.push(...childhoodSection());
  if (hasResp) children.push(...responsibilitiesSection(variantKey, hasChildhood));

  return new Document({
    styles: COMMON_STYLES,
    numbering: NUMBERING,
    sections: [{ properties: { page: PAGE }, children }],
  });
}

function buildComparisonDoc() {
  const children = [
    new Paragraph({
      children: [new TextRun({ text: 'ATTUNE · EXERCISE 02 · EXPECTATIONS', bold: true, size: 16, color: MUTED, characterSpacing: 50 })],
      spacing: { after: 80 },
    }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: 'Variant comparison' })] }),
    new Paragraph({
      children: [new TextRun({ text: 'Three variants of Exercise 02 share the same skeleton: a Life & Values section (always shown) and a Responsibilities section (shown in two of three variants). The variants differ only in framing language and which sections appear. The questions and answer options themselves are identical across variants.', size: 22 })],
      spacing: { after: 240 },
    }),

    h2('Structure at a glance'),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [2340, 2340, 2340, 2340],
      rows: [
        new TableRow({
          children: [
            cell('', { width: 2340, fill: 'FBF8F3' }),
            cell('Core', { width: 2340, fill: 'FBF8F3', bold: true, color: BLUE }),
            cell('Anniversary', { width: 2340, fill: 'FBF8F3', bold: true, color: PURPLE }),
            cell('Revisiting', { width: 2340, fill: 'FBF8F3', bold: true, color: ORANGE }),
          ],
        }),
        ...[
          ['Life & Values (20 Qs)', '✓', '✓', '✓'],
          ['Childhood structure',   '✓', '—', '—'],
          ['Responsibilities (25)', '✓ (future)', '✓ (present)', '—'],
          ['Estimated time',        '~15 min', '~15 min', '~10 min'],
          ['Tense',                 'Future-facing',          'Present-tense',       'Reflective present'],
          ['Audience',              'New / dating / engaged', 'Married / settled',   'Returning users'],
        ].map(row => new TableRow({
          children: row.map((c, i) => cell(c, { width: 2340, bold: i === 0, size: 20 })),
        })),
      ],
    }),
    new Paragraph({ children: [], spacing: { after: 240 } }),

    h2('Framing differences'),
    p('Each Life & Values question has the same topic across all three variants but a different framing phrase. The phrase shifts the question from a forward-looking imagined future (Core) to a present-tense observation (Anniversary) to a reflective check-in (Revisiting).', { italic: true, color: MUTED, after: 200 }),

    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [2340, 2340, 2340, 2340],
      rows: [
        new TableRow({
          children: [
            cell('Question topic', { width: 2340, fill: 'FBF8F3', bold: true, size: 20 }),
            cell('Core', { width: 2340, fill: 'FBF8F3', bold: true, color: BLUE, size: 20 }),
            cell('Anniversary', { width: 2340, fill: 'FBF8F3', bold: true, color: PURPLE, size: 20 }),
            cell('Revisiting', { width: 2340, fill: 'FBF8F3', bold: true, color: ORANGE, size: 20 }),
          ],
        }),
        ...LIFE_QUESTIONS.map(q => new TableRow({
          children: [
            cell(subst(q.topic), { width: 2340, bold: true, size: 18 }),
            cell(q.core, { width: 2340, size: 18 }),
            cell(q.anniversary, { width: 2340, size: 18 }),
            cell(q.revisiting, { width: 2340, size: 18 }),
          ],
        })),
      ],
    }),
    new Paragraph({ children: [], spacing: { after: 240 } }),

    h2('Responsibility framing differences'),
    p('Identical 25 items, three different framing prompts.', { italic: true, color: MUTED, after: 200 }),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [2340, 7020],
      rows: [
        ['Core',        RESPONSIBILITY_FRAMING.core],
        ['Anniversary', RESPONSIBILITY_FRAMING.anniversary],
        ['Revisiting',  RESPONSIBILITY_FRAMING.revisiting + '  (not currently shown — Revisiting variant skips this section)'],
      ].map(([label, framing]) => new TableRow({
        children: [
          cell(label, { width: 2340, fill: 'FBF8F3', bold: true, color: label === 'Core' ? BLUE : label === 'Anniversary' ? PURPLE : ORANGE }),
          cell(framing, { width: 7020, size: 20 }),
        ],
      })),
    }),
    new Paragraph({ children: [], spacing: { after: 240 } }),

    h2('Open items'),
    bullet('Revisiting variant currently uses the same results experience as Core. A dedicated retake comparison view (showing what shifted between the two completions) is on the pre-launch checklist.'),
    bullet('Same-type couple Working Knowledge content (MOMENTS_SHARED_X / Y / Z) is currently stubbed to the W variant for any pairing other than W+W. Drafted Y and Z individual variants are also pending LMFT review.'),
  ];

  return new Document({
    styles: COMMON_STYLES,
    numbering: NUMBERING,
    sections: [{ properties: { page: PAGE }, children }],
  });
}

function buildLMFTContextDoc() {
  const children = [
    new Paragraph({
      children: [new TextRun({ text: 'ATTUNE · LMFT CLINICAL REVIEW', bold: true, size: 16, color: MUTED, characterSpacing: 50 })],
      spacing: { after: 80 },
    }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: 'Context and what we need from you' })] }),
    p('This document gives you the framework for reviewing Attune\'s clinical content before launch. The companion documents in this packet are the question-by-question flows for the three variants of Exercise 02 (Expectations), plus a side-by-side comparison.', { color: MUTED, italic: true, after: 240 }),

    h2('What Attune is'),
    p('Attune is a couples assessment that produces a shared, side-by-side view of where two partners actually stand on the dimensions that shape a relationship. The product is not therapy. It is a structured way to surface differences that often go unspoken until they create friction, and to give couples a vocabulary and starting point for the conversations that follow.'),
    p('Couples buy the assessment, complete two (or three) short exercises independently, and receive a joint results experience that includes:'),
    bullet('A profile across 10 communication dimensions (Energy, Expression, Needs, Bids, Conflict, Repair, Closeness, Love, Stress, Feedback)'),
    bullet('Their couple type — the dynamic produced by their pairing, drawn from a four-individual-type / ten-pairing framework'),
    bullet('A side-by-side view of where they aligned and where they diverged on expectations across six domains'),
    bullet('Conversation prompts and an action plan calibrated to their specific results'),
    bullet('Optionally: a personalized workbook PDF, a 50-minute LMFT session, and physical fulfillment'),

    h2('How the four individual types and ten pairings work'),
    p('Communication scores are condensed onto two axes:'),
    bullet('Engage / Withdraw — derived from Conflict (55%), Stress (30%), and Repair (15%) scores. Captures whether someone moves toward or away from friction.'),
    bullet('Open / Guarded — derived from Expression (45%), Feedback (30%), and Needs (25%) scores. Captures whether someone shares their inner experience readily or holds it close.'),
    p('Quadrant placement produces four individual types: W (The Initiator: engage + open), X (The Anchor: engage + guarded), Y (The Feeler: withdraw + open), Z (The Protector: withdraw + guarded). The two partners\' types combine into one of ten couple types (four same-type, six cross-type).'),
    p('All Attune-facing copy frames couple type as a description of a dynamic, never a diagnosis. Neither end of any dimension is framed as healthier or better than the other. The gap between partners is the thing the product surfaces, not the position.'),

    h2('What Exercise 02 specifically measures'),
    p('Exercise 02 is the Expectations exercise. The hypothesis behind it is that a meaningful share of long-term relationship friction comes from expectations one or both partners hold but have not made explicit. The exercise surfaces these in two parts:'),
    bullet('Life & Values — 20 questions across Family, Lifestyle, Values, Money, Conflict, and Connection. Each partner answers independently. The results experience shows both sets of answers side by side, highlighting alignments and gaps.'),
    bullet('Responsibility allocation — 25 items across Household, Financial, Career, Extended Family, and Emotional Labor. Each partner names who they expect (or, in the Anniversary variant, observe) to handle each item.'),
    p('The Core variant adds a third element: each partner first reports the household structure they grew up in (Mom + Dad, single parent, two moms, two dads, grandparents, split, other), then answers each responsibility item twice — once for who handled it in their childhood home, and once for who they expect to handle it in their own future home. This produces a generational layer in the results: where current expectations track childhood patterns, and where they diverge.'),

    h2('Three variants exist'),
    p('See the three companion documents (ex2-flow-core.docx, ex2-flow-anniversary.docx, ex2-flow-revisiting.docx) for the full question flow of each. Summary:'),
    bullet('Core — future-facing. New, dating, or engaged couples. Includes childhood section. ~15 minutes.'),
    bullet('Anniversary — present-tense. Established couples reviewing how things actually are now. No childhood section. ~15 minutes.'),
    bullet('Revisiting — reflective present. Returning users retaking the exercise to see what has shifted. Life & Values questions only. ~10 minutes.'),

    new Paragraph({ children: [new PageBreak()] }),
    h2('What we need you to review'),
    p('The questions below are the ones we most need your read on. Free-form comments anywhere in the documents are also welcome — we can address anything you flag.'),

    h3('1. Clinical accuracy and grounding'),
    p('Do the dimensions we measure (and the framing of Engage/Withdraw and Open/Guarded) reflect a sound model? Where would you tighten the model, the question wording, or the option phrasing? Any item that scans as ungrounded should be flagged.'),

    h3('2. Inclusivity'),
    p('The childhood home structure question (in the Core variant) currently includes: a mom and a dad, two moms, two dads, mostly my mom, mostly my dad, grandparents / extended family, split between two households, other. Is the option set adequate? Are any options worded in a way that could land badly?'),
    p('The Life & Values question on children includes "Not part of my future" and "Central to my future" as endpoints. Are the framing and options inclusive of people who do not want children, people who cannot have biological children, and stepfamily / blended-family contexts?'),
    p('The Extended Family questions ask separately about each partner\'s family ("Maya\'s family", "David\'s family"). The intent is to surface asymmetric expectations cleanly. Does this framing work for couples whose families of origin do not fit a two-of-origin pattern (e.g., one partner has no contact with one or both biological parents, or has multiple parental figures across blended households)?'),

    h3('3. Potentially distressing or triggering content'),
    p('Some questions could land hard for people in difficult relational or family contexts. We want to know which items you would flag for additional support framing, optional skip language, or rewording.'),
    p('Specifically:'),
    bullet('Children (lq_children) — for couples with infertility, recent loss, or unresolved disagreement.'),
    bullet('Childhood home structure — for users whose childhood involved abuse, neglect, or significant loss.'),
    bullet('Extended Family items — for users estranged from family of origin.'),
    bullet('Family vs partner conflict (lq_family_conf) — for users navigating cultural or generational pressure.'),
    bullet('Conflict and Repair questions — for users in or recently out of high-conflict or abusive dynamics.'),

    h3('4. Tone and language'),
    p('Attune\'s editorial voice is: short declarative sentences, no hedging, neither end of any dimension framed as healthier. Couple type is described as a dynamic, never as a diagnosis. Where in the exercises or results does the language drift from this — toward pathologizing, prescriptive advice, or coaching tone? Specific phrases to rewrite are most useful.'),

    h3('5. Same-type couple content (pending)'),
    p('For four of the ten couple types (W+W, X+X, Y+Y, Z+Z), the workbook and results experience render a "Working Knowledge" section with stories meant to feel relatable to couples in that pairing. Currently only the W+W version of these stories has been authored. The other three same-type variants (X+X, Y+Y, Z+Z) fall back to the W+W content as a placeholder. We will share these for review separately when written, but flag now if there is anything we should know in advance about how to write same-type content responsibly.'),

    h3('6. Anything else'),
    p('Anything you would change, soften, sharpen, remove, or add — including content not directly covered by the questions above — is welcome. Tracked changes in any of the four content documents work; comments in this document work too.'),

    new Paragraph({ children: [new PageBreak()] }),
    h2('How your review fits the release'),
    p('Your sign-off (with any required edits applied) is a release gate for the Attune product. Specifically, the items we cannot ship without your review are: the Exercise 02 question flows, the Working Knowledge content for all ten couple types, the dimension framework copy, and the workbook guidance pages.'),
    p('Turnaround: we are working toward a launch in the next several weeks. A first pass within two weeks, with iteration after, gives us the right runway.'),

    h2('What you have in this packet'),
    bullet('ex2-flow-core.docx — Core variant, full question flow.'),
    bullet('ex2-flow-anniversary.docx — Anniversary variant, full question flow.'),
    bullet('ex2-flow-revisiting.docx — Revisiting variant, full question flow.'),
    bullet('ex2-variant-comparison.docx — Side-by-side comparison of all three variants.'),
    bullet('lmft-context.docx — This document.'),

    p('Thank you. Reach out any time if anything in here needs clarifying before you start.', { after: 200 }),
  ];

  return new Document({
    styles: COMMON_STYLES,
    numbering: NUMBERING,
    sections: [{ properties: { page: PAGE }, children }],
  });
}

// ── Generate all 5 ──────────────────────────────────────────────────────────
async function writeDoc(doc, name) {
  const buf = await Packer.toBuffer(doc);
  const path = `${OUT_DIR}/${name}.docx`;
  writeFileSync(path, buf);
  console.log(`Wrote ${path} (${buf.length} bytes)`);
}

await writeDoc(buildVariantDoc('core'),         'ex2-flow-core');
await writeDoc(buildVariantDoc('anniversary'),  'ex2-flow-anniversary');
await writeDoc(buildVariantDoc('revisiting'),   'ex2-flow-revisiting');
await writeDoc(buildComparisonDoc(),            'ex2-variant-comparison');
await writeDoc(buildLMFTContextDoc(),           'lmft-context');
