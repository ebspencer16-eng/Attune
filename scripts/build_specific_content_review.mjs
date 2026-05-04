// Specific content review — all non-universal content in one place.
//
// Structure:
//   1.  Couple type names + taglines         (1.1 WW … 1.10 YZ)
//   2.  Dimension gap & close analysis        (2.1 energy … 2.10 feedback)
//   3.  "What this might look like" prose     (3.1 energy … 3.10 feedback; per-type)
//   4.  Six Moments Library                   (4.1 hard_workday … 4.6 external_stress)
//   5.  Conversation prompts                  (5.1 … 5.5)
//   6.  Reference Card phrase per type        (6.1 WW … 6.10 YZ)
//   7.  Part epigraph options                 (7.1 Part 1 … 7.4 Part 4)

import { writeFileSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, BorderStyle,
  Footer, PageNumber,
} from 'docx';

const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf-8');
const m = appSource.match(/const NEW_COUPLE_TYPES = (\[[\s\S]+?\n\]);/);
if (!m) throw new Error("Can't find NEW_COUPLE_TYPES in App.jsx");
const NEW_COUPLE_TYPES = (new Function('return ' + m[1]))();
console.log(`Loaded ${NEW_COUPLE_TYPES.length} couple types`);

const contentSource = readFileSync(new URL('../api/_workbook-content.js', import.meta.url), 'utf-8');

function evalExport(source, name) {
  const startRe = new RegExp('export\\s+const\\s+' + name + '\\s*=\\s*');
  const startMatch = source.match(startRe);
  if (!startMatch) throw new Error(`Can't find ${name} in _workbook-content.js`);
  const startIdx = startMatch.index + startMatch[0].length;
  const rest = source.slice(startIdx);
  const firstChar = rest[0];
  const openChar = firstChar;
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
    if (c === openChar) depth++;
    else if (c === closeChar) { depth--; if (depth === 0) { end = i; break; } }
    i++;
  }
  if (end === -1) throw new Error(`Can't find end of ${name}`);
  return (new Function('return ' + rest.slice(0, end + 1)))();
}

const DIM_META = evalExport(contentSource, 'DIM_META');
const DIM_CONTENT = evalExport(contentSource, 'DIM_CONTENT');
const DIMS = evalExport(contentSource, 'DIMS');
const WHEN_THIS_SHOWS_UP = evalExport(contentSource, 'WHEN_THIS_SHOWS_UP');

import { SCENE_DRAFTS, PROMPT_DRAFTS } from './_shared_drafts.mjs';

const MOMENTS_SRC = [
  { n: 1, key: 'hard_workday',      title: 'After a hard workday' },
  { n: 2, key: 'quiet_worry',       title: "When they're worried but haven't said it" },
  { n: 3, key: 'during_conflict',   title: 'During a disagreement' },
  { n: 4, key: 'after_conflict',    title: 'After a disagreement' },
  { n: 5, key: 'wanting_closeness', title: 'When they want to feel close' },
  { n: 6, key: 'external_stress',   title: 'When stress is coming from outside the relationship' },
];
const SITUATIONS_SRC = [
  { n: 1, title: 'At dinner on a quiet night' },
  { n: 2, title: 'After a hard week' },
  { n: 3, title: "When one of you is off but won't say why" },
  { n: 4, title: 'Before a difficult conversation' },
  { n: 5, title: "When you're tired of talking about logistics" },
];

// 4 Parts × 3 candidates each. Target: max 1 original per Part, the
// other two are real published quotes with attribution. Themes matched
// to each Part's subject matter.
const EPIGRAPHS = {
  1: [ // Part 1: A closer look at the dimensions that matter — noticing, understanding differences
    { quote: "It is not our differences that divide us. It is our inability to recognize, accept, and celebrate those differences.",
      author: 'Audre Lorde' },
    { quote: "Everything that irritates us about others can lead us to an understanding of ourselves.",
      author: 'Carl Jung' },
    { quote: "The smallest gaps, named clearly, tend to close. The biggest ones, left unspoken, tend to widen.",
      author: 'Original' },
  ],
  2: [ // Part 2: Working Knowledge — knowing another person, practical intimacy
    { quote: "For one human being to love another: that is perhaps the most difficult of all our tasks; the work for which all other work is but preparation.",
      author: 'Rainer Maria Rilke, Letters to a Young Poet' },
    { quote: "What do we live for, if it is not to make life less difficult for each other?",
      author: 'George Eliot, Middlemarch' },
    { quote: "Knowing someone is a practice, not a state. You can stop at any time, and it happens.",
      author: 'Original' },
  ],
  3: [ // Part 3: Workbook — practice, systems, daily commitment
    { quote: "You do not rise to the level of your goals. You fall to the level of your systems.",
      author: 'James Clear, Atomic Habits' },
    { quote: "How we spend our days is, of course, how we spend our lives.",
      author: 'Annie Dillard, The Writing Life' },
    { quote: "You cannot change what you will not name. You cannot keep what you will not notice.",
      author: 'Original' },
  ],
  4: [ // Part 4: Conversation Library — language, speaking, asking
    { quote: "The single biggest problem in communication is the illusion that it has taken place.",
      author: 'George Bernard Shaw' },
    { quote: "Anything that's human is mentionable, and anything that is mentionable can be more manageable.",
      author: 'Fred Rogers' },
    { quote: "The right sentence at the right moment is worth more than a hundred conversations held too late.",
      author: 'Original' },
  ],
};

// ── Design tokens ────────────────────────────────────────────────────────
const ORANGE = 'E8673A', BLUE = '1B5FE8', PURPLE = '9B5DE5', GREEN = '10B981';
const INK = '0E0B07', MUTED = '8C7A68', STONE = 'E8DDD0';

const run = (t, o = {}) => new TextRun({ text: String(t ?? ''), font: 'Arial', ...o });
const sp = (n = 1) => Array.from({ length: n }, () => new Paragraph({ children: [new TextRun('')], spacing: { after: 80 } }));
const pb = () => new Paragraph({ children: [new TextRun({ break: 1 })], pageBreakBefore: true });

// Indentation ladder for clear visual hierarchy
const INDENT_MID = 0;
const INDENT_SMALL = 400;
const INDENT_PROSE_UNDER_MID = 400;
const INDENT_PROSE_UNDER_SMALL = 800;

function bigSection(num, title, subtitle, color) {
  return [
    pb(),
    new Paragraph({ spacing: { before: 120, after: 40 },
      children: [run(`SECTION ${num}`, { size: 14, bold: true, color, characterSpacing: 80 })] }),
    new Paragraph({ spacing: { after: 120 },
      children: [run(title, { size: 36, bold: true, color: INK })] }),
    new Paragraph({ spacing: { after: 260 },
      children: [run(subtitle, { size: 16, italics: true, color: MUTED })] }),
    new Paragraph({ spacing: { before: 0, after: 240 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color, space: 4 } },
      children: [new TextRun('')] }),
  ];
}

function midSection(number, title, color, opts = {}) {
  const extras = opts.extras;
  const children = [
    run(number + '   ', { size: 18, bold: true, color, characterSpacing: 40 }),
    run(title, { size: 18, bold: true, color: INK }),
  ];
  if (extras) {
    children.push(run('   ·   ', { size: 14, color: STONE }));
    children.push(run(extras, { size: 14, italics: true, color: MUTED }));
  }
  return new Paragraph({
    spacing: { before: opts.before ?? 360, after: 120 },
    indent: { left: INDENT_MID },
    keepNext: true,
    children,
  });
}

function smallSection(number, title, color, opts = {}) {
  const children = [
    run(number + '   ', { size: 13, bold: true, color, characterSpacing: 30 }),
  ];
  if (title) children.push(run(title, { size: 13, bold: true, color: INK }));
  if (opts.inline) {
    if (title) children.push(run('   ', { size: 13 }));
    children.push(run(opts.inline, { size: 13, color: INK, italics: opts.italicInline }));
  }
  return new Paragraph({
    spacing: { before: opts.before ?? 260, after: opts.after ?? 100, line: 280, lineRule: 'atLeast' },
    indent: { left: INDENT_SMALL },
    keepNext: !opts.inline,
    children,
  });
}

function prose(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 0, after: opts.after ?? 120, line: 300, lineRule: 'atLeast' },
    indent: { left: opts.indent ?? INDENT_PROSE_UNDER_MID },
    children: [run(text, {
      size: opts.size ?? 14,
      color: opts.color ?? INK,
      italics: opts.italics,
    })],
  });
}

function caption(text, color = MUTED, indent = INDENT_MID) {
  return new Paragraph({
    spacing: { before: 0, after: 80 },
    indent: { left: indent },
    children: [run(text, { size: 11, italics: true, color })],
  });
}

// ── COVER ────────────────────────────────────────────────────────────────
const coverPage = [
  ...sp(3),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [run('ATTUNE', { size: 22, bold: true, color: ORANGE, allCaps: true, characterSpacing: 120 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [run('Specific content review', { size: 42, bold: true, color: INK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 360 },
    children: [run('Every non-universal piece of content, numbered for reference.',
      { size: 17, italics: true, color: MUTED })] }),

  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 160 },
    children: [run('How to use this', { size: 13, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 320 },
    children: [run('Six sections, each for one content type. Every piece is numbered (e.g. 2.1.5 = Section 2 / dim 1 / couple type 5). The workbook content review doc references these numbers.',
      { size: 15, italics: true, color: MUTED })] }),

  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 140 },
    children: [run('Index', { size: 13, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }),

  ...[
    ['1.', 'Couple type names & taglines',             '10 types'],
    ['2.', '"What this means" analysis per type',      '10 dimensions × 10 couple types = 100 blocks'],
    ['3.', 'Six Moments Library',                      '6 moments × 4 individual types = 24 scenes'],
    ['4.', 'Conversation prompts',                     '5 situations × 5 prompts = 25 prompts'],
    ['5.', 'Reference Card phrase per couple type',    '10 phrases (one per type)'],
    ['6.', 'Part epigraph options',                    '4 Parts × 3 candidates'],
  ].map(([num, title, info]) => new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [
      run(num + '   ', { size: 13, bold: true, color: ORANGE }),
      run(title + '   ', { size: 14, color: INK }),
      run(',' + info, { size: 12, italics: true, color: MUTED }),
    ],
  })),
];

// ── SECTION 1 ────────────────────────────────────────────────────────────
const section1 = [
  ...bigSection(1, 'Couple type names & taglines',
    'Name renders on Cover, Snapshot, Part 1 intro, Reference Card, and the results site. Tagline renders in all those places except the Snapshot.', ORANGE),

  ...NEW_COUPLE_TYPES.flatMap((ct, i) => [
    midSection(`1.${i + 1}`, `${ct.id}, ${ct.name}`, ORANGE, {
      extras: `${ct.id[0] === ct.id[1] ? 'same-type' : 'cross-type'}   ·   ${ct.color}`,
    }),
    prose(`Tagline: "${ct.tagline}"`, { italics: true }),
  ]),
];

// ── SECTION 2 ────────────────────────────────────────────────────────────
// "What this means for your relationship" — the grey italic prose in the
// right column of each dimension's hero. Couple-type-specific; all 10
// dimensions × 10 couple types. Dim pages only render when gap >= 1.5.
const section2 = [
  ...bigSection(2, '"What this means for your relationship", per couple type',
    'Grey italic text in the hero\'s right column on each dimension page. Couple-type-specific; 10 dimensions × 10 types = 100 blocks. Present-tense, second-person, 2-3 sentences. (Dim pages only render when the couple\'s gap on that dimension is ≥1.5, so there is no separate "close" text.)', PURPLE),

  ...DIMS.flatMap((dimKey, i) => {
    const meta = DIM_META[dimKey] || {};
    const typeBlock = WHEN_THIS_SHOWS_UP[dimKey] || {};
    const hasAllTypes = NEW_COUPLE_TYPES.every(ct => typeBlock[ct.id]);

    const out = [
      midSection(`2.${i + 1}`, `${meta.label || dimKey}`, PURPLE, {
        extras: `${meta.left} / ${meta.right}`,
      }),
      caption(hasAllTypes
        ? '✓ All 10 couple types drafted.'
        : `PLACEHOLDER: needs per-type prose for remaining ${NEW_COUPLE_TYPES.length - 1}.`,
        hasAllTypes ? GREEN : 'C8402A',
        INDENT_MID),
    ];

    NEW_COUPLE_TYPES.forEach((ct, j) => {
      const text = typeBlock[ct.id];
      out.push(smallSection(`2.${i + 1}.${j + 1}`, `${ct.id}, ${ct.name}`, PURPLE, { before: 200 }));
      if (text) {
        out.push(prose(text, { indent: INDENT_PROSE_UNDER_SMALL }));
      } else {
        out.push(prose(typeBlock.WW || '(no content)', { italics: true, color: MUTED, indent: INDENT_PROSE_UNDER_SMALL }));
      }
    });
    return out;
  }),
];

// ── SECTION 4 ────────────────────────────────────────────────────────────
const INDIVIDUAL_TYPES = [
  { letter: 'W', label: 'Open + Engages quickly' },
  { letter: 'X', label: 'Guarded + Engages quickly' },
  { letter: 'Y', label: 'Open + Needs space' },
  { letter: 'Z', label: 'Guarded + Needs space' },
];

const section3 = [
  ...bigSection(3, 'Six Moments Library',
    '6 moments × 4 individual-type versions = 24 scenes. Each scene has 4 blocks.', GREEN),

  ...MOMENTS_SRC.flatMap((moment, i) => {
    const out = [midSection(`3.${i + 1}`, `Moment ${moment.n}: ${moment.title}`, GREEN)];
    INDIVIDUAL_TYPES.forEach((t, j) => {
      const scene = SCENE_DRAFTS[t.letter]?.[moment.key];
      out.push(smallSection(`3.${i + 1}.${j + 1}`, `Type ${t.letter}, ${t.label}`, GREEN, { before: 220 }));
      if (scene) {
        const mkLabel = (label, color) => new Paragraph({
          spacing: { before: 0, after: 50 }, indent: { left: INDENT_PROSE_UNDER_SMALL },
          children: [run(label, { size: 10, bold: true, color, allCaps: true, characterSpacing: 40 })],
        });
        out.push(mkLabel("What's happening", PURPLE));
        out.push(prose(scene.happening, { after: 100, indent: INDENT_PROSE_UNDER_SMALL }));
        out.push(mkLabel('What NOT to do', 'C8402A'));
        out.push(prose(scene.notTo, { after: 100, indent: INDENT_PROSE_UNDER_SMALL }));
        out.push(mkLabel('What works', GREEN));
        out.push(prose(scene.works, { after: 100, indent: INDENT_PROSE_UNDER_SMALL }));
        out.push(mkLabel('Phrase that lands', BLUE));
        out.push(prose(scene.phrase, { italics: true, indent: INDENT_PROSE_UNDER_SMALL }));
      } else {
        out.push(prose('(scene not yet drafted)', { italics: true, color: MUTED, indent: INDENT_PROSE_UNDER_SMALL }));
      }
    });
    return out;
  }),
];

// ── SECTION 5 ────────────────────────────────────────────────────────────
const section4 = [
  ...bigSection(4, 'Conversation prompts',
    '5 situations × 5 prompts = 25 prompts. Each tagged with couple types it fits best.',
    'F59E0B'),

  ...SITUATIONS_SRC.flatMap((sit, i) => {
    const prompts = PROMPT_DRAFTS[sit.n] || [];
    const out = [midSection(`4.${i + 1}`, `Situation ${sit.n}: ${sit.title}`, 'F59E0B')];
    prompts.forEach((p, j) => {
      out.push(smallSection(`4.${i + 1}.${j + 1}`, '', 'F59E0B', {
        before: 180,
        inline: `"${p.prompt}"`,
        italicInline: true,
      }));
      out.push(new Paragraph({
        spacing: { before: 0, after: 100 },
        indent: { left: INDENT_PROSE_UNDER_SMALL },
        children: [run(`Best for: ${p.tags}`, { size: 11, italics: true, color: MUTED })],
      }));
    });
    return out;
  }),
];

// ── SECTION 6 ────────────────────────────────────────────────────────────
const section5 = [
  ...bigSection(5, 'Reference Card phrase',
    'Center tile of the Reference Card. Pulls tips[0].phraseTry for the couple type.',
    'C2410C'),

  ...NEW_COUPLE_TYPES.flatMap((ct, i) => {
    const phrase = ct.tips?.[0]?.phraseTry;
    return [
      midSection(`5.${i + 1}`, `${ct.id}, ${ct.name}`, 'C2410C', {
        extras: phrase ? `"${phrase}"` : '(no phrase drafted)',
      }),
    ];
  }),
];

// ── SECTION 7 ────────────────────────────────────────────────────────────
const section6 = [
  ...bigSection(6, 'Part epigraph options',
    'Each of the 4 main Parts opens with an epigraph, a centered italic quote + attribution. Three candidates per Part. Mark your pick or write your own.',
    INK),

  ...[1, 2, 3, 4].flatMap(partNum => {
    const titles = { 1: 'A closer look at the dimensions that matter',
                     2: 'Working Knowledge',
                     3: 'Workbook',
                     4: 'Conversation Library' };
    const out = [
      midSection(`6.${partNum}`, `Part ${partNum}: ${titles[partNum]}`, INK),
    ];
    EPIGRAPHS[partNum].forEach((epi, j) => {
      out.push(smallSection(`6.${partNum}.${j + 1}`, `Option ${['A', 'B', 'C'][j]}`, INK, { before: 200 }));
      out.push(prose(`"${epi.quote}"`, { italics: true, indent: INDENT_PROSE_UNDER_SMALL, after: 40 }));
      out.push(new Paragraph({
        spacing: { before: 0, after: 100 },
        indent: { left: INDENT_PROSE_UNDER_SMALL },
        children: [run(`,${epi.author}`, { size: 12, color: MUTED })],
      }));
    });
    return out;
  }),
];

// ─── Assemble ────────────────────────────────────────────────────────────

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
            run('Attune · Specific content review   ·   ', { size: 13, color: MUTED }),
            new TextRun({ children: [PageNumber.CURRENT], size: 13, color: INK, font: 'Arial' }),
            run(' / ', { size: 13, color: MUTED }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 13, color: MUTED, font: 'Arial' }),
          ] })],
      }),
    },
    children: [
      ...coverPage,
      ...section1, ...section2, ...section3,
      ...section4, ...section5, ...section6,
    ],
  }],
});

const buf = await Packer.toBuffer(doc);
const outPath = '/tmp/specific_content_review.docx';
writeFileSync(outPath, buf);
execSync('libreoffice --headless --convert-to pdf --outdir /tmp ' + outPath, { stdio: 'pipe' });
console.log(`✓ Specific content review: ${outPath} (${buf.length} bytes)`);
