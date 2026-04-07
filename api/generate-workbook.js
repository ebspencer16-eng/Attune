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
  children: [run(text, { size: 16, bold: true, color: color || ORANGE, allCaps: true, characterSpacing: 160 })]
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
          ...(label ? [new Paragraph({ spacing: { after: 80 }, children: [run(label, { size: 16, bold: true, color: a, allCaps: true, characterSpacing: 160 })] })] : []),
          new Paragraph({ spacing: { after: 0 }, children: [run(text, { size: 22 })] }),
        ] }),
    ]})]
  });
};

// ─── Personalization helpers ──────────────────────────────────────────────────
function fill(template, u, p) {
  return String(template || '')
    .replace(/\{U\} and \{P\}/g, `${u} and ${p}`)
    .replace(/\{U\}/g, u)
    .replace(/\{P\}/g, p);
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

function buildCover(u, p, coupleType) {
  return [
    ...sps(4),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [run('ATTUNE', { size: 24, bold: true, color: ORANGE, allCaps: true, characterSpacing: 400 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [run('Relationship Workbook', { size: 72, bold: true, color: INK })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
      children: [run('Built from your answers.', { size: 28, italics: true, color: MUTED })] }),
    ...sps(1),
    hr(STONE, 10),
    ...sps(2),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [run('Prepared for', { size: 22, color: MUTED })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [run(`${u} & ${p}`, { size: 48, bold: true, color: INK })] }),
    ...(coupleType ? [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
        children: [run(coupleType.name, { size: 24, italics: true, color: ORANGE })] }),
    ] : []),
    ...sps(5),
    para('attune-relationships.com', { center: true, color: MUTED, size: 18 }),
  ];
}

function buildIntro(u, p) {
  return [
    pb(),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run('Introduction')] }),
    para(`This workbook was built from ${u} and ${p}'s actual exercise answers.`, { size: 24, color: MUTED }),
    sp(),
    para(`The results inside come directly from what you each answered independently — before seeing each other's responses. That's what makes this document specific to the two of you. Every insight, gap level, and weekly practice in this workbook was selected because it reflects your actual combination of scores.`),
    sp(),
    para('The workbook is organized in five parts:'),
    sp(),
    numItem('Snapshot — your scores and gap levels across all 10 communication dimensions'),
    numItem('Exercise by Exercise Insights — each dimension explored in depth, with your specific scores highlighted and only the relevant gap guidance shown'),
    numItem(`Your 3 Priorities — the three dimensions where ${u} and ${p} have the most to gain, identified from your results`),
    numItem('Conversation Guide — a structured first conversation you can use together, with or without a therapist'),
    numItem('Reference Card — a half-page summary designed to go on your fridge'),
    sp(),
    hr(STONE),
    sp(),
    eyebrow('How to use this', ORANGE),
    bullet('Start with Part 3 (your priorities) to know where the leverage is highest'),
    bullet('Use Part 4 (conversation guide) for a structured first conversation'),
    bullet('Return to Part 2 (insights) as a reference when a specific dimension comes up in your life'),
    bullet('Keep Part 5 (reference card) somewhere visible'),
    sp(),
    accentBox('A note on the scores',
      `Neither end of any dimension is better. ${u}'s score of ${'\u2588'.repeat(3) + '\u2591'.repeat(2)} and ${p}'s score don't represent right or wrong — they represent how each of you is genuinely wired. The gap between scores is the thing worth understanding. A large gap means more translation is required — and more to gain from explicit conversation.`,
      'FFF3E0', ORANGE),
    sp(),
    accentBox('A note on reading this together',
      `Both of you should read this independently before discussing it. Your reflections will be most honest if you\'re not reading over each other\'s shoulders. Everything here applies equally to both of you.`,
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
      tc(meta.label, 2800),
      tc(s1 + ' / 5', 900, { color: ORANGE }),
      tc(s2 + ' / 5', 900, { color: ORANGE }),
      tc(gap.toFixed(1), 700, { color: color, bold: true }),
      tc(label, 1800, { color: color }),
      tc(scoreBar(Number(s1)) + ' / ' + scoreBar(Number(s2)), 1960, { size: 18, color: MUTED }),
    ]});
  });

  const expRows = expGaps.map(eg => new TableRow({ children: [
    tc(eg.label, 2800),
    tc(eg.yourAnswer || '—', 2400),
    tc(eg.partnerAnswer || '—', 2400),
    tc(eg.aligned ? '\u2713 Aligned' : '\u25CF Gap', 1760, { color: eg.aligned ? GREEN : ORANGE, bold: true }),
  ]}));

  return [
    pb(),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run('Part 1 \u2014 Your Snapshot')] }),
    para(`A full view of where ${u} and ${p} are aligned, and where the gaps are.`, { size: 24, color: MUTED }),
    sp(),
    eyebrow('Communication dimensions', ORANGE),
    new Table({
      width: { size: W, type: WidthType.DXA }, columnWidths: [2800, 900, 900, 700, 1800, 1960],
      rows: [
        new TableRow({ children: [hc('Dimension', 2800, INK), hc(`${u}`, 900, ORANGE), hc(`${p}`, 900, ORANGE), hc('Gap', 700, ORANGE), hc('Alignment', 1800, ORANGE), hc('Score bars', 1960, INK)] }),
        ...dimRows,
      ]
    }),
    ...sps(2),
    eyebrow('Expectations alignment', BLUE),
    new Table({
      width: { size: W, type: WidthType.DXA }, columnWidths: [2800, 2400, 2400, 1760],
      rows: [
        new TableRow({ children: [hc('Area', 2800, INK), hc(u, 2400, BLUE), hc(p, 2400, BLUE), hc('Result', 1760, INK)] }),
        ...expRows,
      ]
    }),
    ...sps(2),
    ...(coupleType ? [
      eyebrow('Your couple type', GREEN),
      new Table({
        width: { size: W, type: WidthType.DXA }, columnWidths: [2000, 7360],
        rows: [
          new TableRow({ children: [tc('Couple type', 2000, { bold: true, fill: 'F0FDF9' }), tc(coupleType.name, 7360, { bold: true, color: coupleType.color?.replace('#','') || GREEN })] }),
          new TableRow({ children: [tc('Tagline', 2000, { bold: true, fill: 'F0FDF9' }), tc(coupleType.tagline, 7360, { italics: true })] }),
          new TableRow({ children: [tc('Core dynamic', 2000, { bold: true, fill: 'F0FDF9' }), tc(fill(coupleType.description, u, p), 7360)] }),
          new TableRow({ children: [tc('Worth knowing', 2000, { bold: true, fill: 'F0FDF9' }), tc(fill(coupleType.nuance, u, p), 7360, { color: '555555', italics: true })] }),
        ]
      })
    ] : []),
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
  const result = [
    pb(),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run('Part 2 \u2014 Exercise by Exercise Insights')] }),
    para(`Each dimension, explored in depth. Only the guidance relevant to ${u} and ${p}'s specific scores is shown.`, { size: 24, color: MUTED }),
    sp(),
  ];

  DOMAIN_ORDER.forEach(domain => {
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
        hc(`${u}: ${eg.yourAnswer || 'Not answered'}`, 2800, '555555'),
        hc(`${p}: ${eg.partnerAnswer || 'Not answered'}`, 2800, '555555'),
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
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run('Part 4 \u2014 Conversation Guide')] }),
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
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run('Part 5 \u2014 Reference Card')] }),
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
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [run('ATTUNE', { size: 17, bold: true, color: ORANGE, allCaps: true, characterSpacing: 400 })] }),
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
                  new Paragraph({ spacing: { after: 100 }, children: [run('YOUR COUPLE TYPE', { size: 13, bold: true, color: ORANGE, allCaps: true, characterSpacing: 140 })] }),
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
                  new Paragraph({ spacing: { after: 120 }, children: [run('OUR 3 PRIORITIES', { size: 13, bold: true, color: BLUE, allCaps: true, characterSpacing: 140 })] }),
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
                  new Paragraph({ spacing: { after: 120 }, children: [run('PHRASES TO TRY', { size: 13, bold: true, color: GREEN, allCaps: true, characterSpacing: 140 })] }),
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

  // Build document
  const children = [
    ...buildCover(u, p, coupleType),
    ...buildIntro(u, p),
    ...buildSnapshot(u, p, s1, s2, coupleType, expGaps),
    ...buildInsights(u, p, s1, s2),
    ...buildExpDomains(u, p, expGaps),
    ...buildPriorities(u, p, s1, s2, priorities),
    ...buildConversationGuide(u, p, priorities),
    ...buildReferenceCard(u, p, coupleType, priorities),
  ];

  const doc = new Document({
    numbering: NUMBERING,
    styles: STYLES,
    sections: [{ properties: { page: PAGE }, children }],
  });

  const buffer = await Packer.toBuffer(doc);
  const filename = `Attune_Workbook_${u.replace(/\s+/g,'_')}_and_${p.replace(/\s+/g,'_')}.docx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.status(200).send(buffer);
}
