// Build the Shared Budget Tool internal records doc.
// Parses BUDGET_CATEGORIES + POOLING_MODELS from src/App.jsx (source of
// truth) and renders a portrait docx describing the full tool.
//
// Text sizing: body is 22 (11pt) throughout — noticeably larger than the
// 12pt-or-smaller body used in earlier internal docs. Section headers
// 26-36. Eyebrows 16.

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType,
  Footer, PageNumber,
} from 'docx';

// ── Extract the two arrays from App.jsx via bracket-count eval ───────────
function extractArray(src, name) {
  const m = src.match(new RegExp('const ' + name + ' = \\['));
  if (!m) throw new Error(name + ' not found');
  let i = m.index + ('const ' + name + ' = ').length;
  let depth = 0, inStr = false, strCh = null, esc = false;
  const start = i;
  while (i < src.length) {
    const ch = src[i];
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
  return eval(src.slice(start, i));
}

const appSrc = readFileSync('/home/claude/unison/src/App.jsx', 'utf8');
const BUDGET_CATEGORIES = extractArray(appSrc, 'BUDGET_CATEGORIES');
const POOLING_MODELS    = extractArray(appSrc, 'POOLING_MODELS');

// ── Tokens ───────────────────────────────────────────────────────────────
const INK = '0E0B07', MUTED = '8C7A68', STONE = 'E8DDD0';
const BLUE = '1B5FE8', GREEN = '10B981', ORANGE = 'E8673A', PURPLE = '9B5DE5', GOLD = 'F59E0B';

const run = (t, o = {}) => new TextRun({ text: String(t ?? ''), font: 'Arial', ...o });
const sp  = (n = 1) => Array.from({ length: n }, () => new Paragraph({ children: [new TextRun('')], spacing: { after: 120 } }));
const pb  = () => new Paragraph({ children: [new TextRun({ break: 1 })], pageBreakBefore: true });

const CONTENT_W = 9360;

// Typography — larger than previous internal docs per Ellie's feedback.
//   body       = 22 (11pt)
//   bodyBold   = 22 bold
//   bodyMuted  = 22 grey italic
//   sub        = 20 grey  (used sparingly — captions only)
//   eyebrow    = 16 uppercase bold
//   secTitle   = 32 bold
//   bigTitle   = 44 bold
const body = (text, opts = {}) => new Paragraph({
  spacing: { after: opts.after ?? 160, line: 360, lineRule: 'atLeast' },
  indent: opts.indent ? { left: opts.indent } : undefined,
  alignment: opts.center ? AlignmentType.CENTER : undefined,
  children: [run(text, { size: 22, color: opts.color ?? INK, bold: opts.bold, italics: opts.italics })],
});

const eyebrow = (text, color = ORANGE) => new Paragraph({
  spacing: { before: 160, after: 120 },
  children: [run(text, { size: 16, bold: true, color, allCaps: true, characterSpacing: 80 })],
});

const secHead = (num, title, subtitle, color) => [
  pb(),
  new Paragraph({ spacing: { before: 120, after: 80 },
    children: [run('SECTION ' + num, { size: 16, bold: true, color, characterSpacing: 80 })] }),
  new Paragraph({ spacing: { after: 120 },
    children: [run(title, { size: 32, bold: true, color: INK })] }),
  new Paragraph({ spacing: { after: 200 },
    children: [run(subtitle, { size: 22, italics: true, color: MUTED })] }),
  new Paragraph({ spacing: { after: 280 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color, space: 4 } },
    children: [new TextRun('')] }),
];

const itemBullet = (text, color = MUTED) => new Paragraph({
  spacing: { after: 80, line: 340, lineRule: 'atLeast' },
  indent: { left: 520, hanging: 360 },
  children: [
    run('•  ', { size: 22, color }),
    run(text, { size: 22, color: INK }),
  ],
});

// ── Cover ────────────────────────────────────────────────────────────────
const totalItems = BUDGET_CATEGORIES.reduce((s, c) => s + c.items.length, 0);

const cover = [
  ...sp(1),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
    children: [run('ATTUNE', { size: 22, bold: true, color: ORANGE, allCaps: true, characterSpacing: 120 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [run('Shared Budget Tool', { size: 44, bold: true, color: INK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
    children: [run('Internal records — full flow, categories, and math', { size: 22, italics: true, color: MUTED })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 360 },
    children: [run(`${BUDGET_CATEGORIES.length} spending categories · ${totalItems} line items · ${POOLING_MODELS.length} pooling models`,
      { size: 20, color: MUTED })] }),

  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 140 },
    children: [run('Purpose', { size: 16, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }),
  body("The shared budget tool is a Premium add-on that helps couples build a realistic monthly budget together. Unlike a standalone calculator, it's designed for the conversation — the tool surfaces how money actually moves between partners under their chosen pooling model, and mirrors back the couple's stated preferences from the Expectations Exercise.", { center: true }),
  body("Attune is a calculator, not a financial advisor. The tool shows the couple's own inputs — no recommendations, no advice, no generated commentary on their choices.", { center: true, italics: true, color: MUTED }),

  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240, after: 140 },
    children: [run('Flow overview', { size: 16, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }),

  ...[
    ['Step 1', 'Orient',        'Each partner\'s post-tax income + pooling model', BLUE],
    ['Step 2', 'Essentials',    'Housing, transport, food, health, debt, regular savings', GREEN],
    ['Step 3', 'Discretionary', 'Lifestyle, giving, personal spending per partner',         ORANGE],
    ['Step 4', 'Goals',         'Target + timeline, auto-calculated monthly contribution',  GOLD],
    ['Step 5', 'The picture',   'Pure-fact reveal, no commentary',                          PURPLE],
  ].map(([step, title, desc, color]) => new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [
      run(step + '   ', { size: 18, bold: true, color, letterSpacing: 60 }),
      run(title + '   ', { size: 22, bold: true, color: INK }),
      run('— ' + desc, { size: 20, italics: true, color: MUTED }),
    ],
  })),
];

// ── Section 1: Step-by-step flow ─────────────────────────────────────────
const flowSection = [
  ...secHead(1, 'The flow, step by step',
    'What the user experiences moving through the tool.', BLUE),

  eyebrow('Step 1 · Orient', BLUE),
  body('The user is asked two things before any expense entry:'),
  itemBullet('Each partner\'s post-tax monthly take-home income'),
  itemBullet('Which pooling model they want to use for shared expenses (four options, shown in Section 3 of this doc)'),
  body('Both fields feed into the math that produces the reveal at the end. The pooling model is the key relational question — it converts a generic calculator into a couples-focused tool.'),

  eyebrow('Step 2 · Essentials', GREEN),
  body('Six categories of recurring monthly expenses. Regular savings contributions (401(k), IRA, emergency fund, joint savings) live here because they are monthly outflows, not aspirational targets. Users enter an amount per line item; category sub-totals update live at the right of each section header.'),

  eyebrow('Step 3 · Discretionary', ORANGE),
  body('Two categories (lifestyle, giving) plus a dedicated Personal Spending block. The Personal Spending block shows one row per partner — whatever each partner treats as walking-around money. These rows are intentionally separate from the shared categories so the reveal math can attribute them correctly.'),

  eyebrow('Step 4 · Savings goals', GOLD),
  body('The user adds any number of goals. Each goal captures a name, a target dollar amount, and a timeline in months. Attune divides target by months and shows the required monthly contribution next to the goal. The user sees this against their current surplus (from the sticky summary bar) and decides whether the goal is feasible.'),
  body('The tool does not recommend goal amounts, timelines, or contribution levels. It is strictly arithmetic: target ÷ months = monthly. This keeps Attune out of advisor territory.', { italics: true, color: MUTED }),

  eyebrow('Step 5 · The reveal', PURPLE),
  body('Appears automatically once income > 0 and at least one expense > 0. Three blocks of pure facts — no interpretation, no recommendations. See Section 4 of this doc for the exact calculations.'),
];

// ── Section 2: Categories + line items ───────────────────────────────────
const catSection = [
  ...secHead(2, 'Categories and line items',
    `${BUDGET_CATEGORIES.length} categories, ${totalItems} line items total.`, GREEN),

  ...BUDGET_CATEGORIES.flatMap(cat => [
    new Paragraph({
      spacing: { before: 240, after: 100 },
      children: [
        run(cat.icon + '  ', { size: 26 }),
        run(cat.label, { size: 26, bold: true, color: INK }),
        run('   · ' + (cat.group === 'essentials' ? 'Essentials' : 'Discretionary') + ' · ' + cat.items.length + ' items',
          { size: 18, italics: true, color: MUTED }),
      ],
    }),
    ...cat.items.map(item => itemBullet(item)),
  ]),

  new Paragraph({
    spacing: { before: 240, after: 100 },
    children: [
      run('👤  ', { size: 26 }),
      run('Personal spending', { size: 26, bold: true, color: INK }),
      run('   · Discretionary · 2 rows (one per partner, dynamic)',
        { size: 18, italics: true, color: MUTED }),
    ],
  }),
  body('Rendered below the Giving & Charity category. One row per partner name. These rows are excluded from shared-expense calculations — each partner\'s personal-spending amount is subtracted only from their own income in the reveal math.'),
];

// ── Section 3: Pooling models ────────────────────────────────────────────
const poolSection = [
  ...secHead(3, 'Pooling models',
    'The key relational question. Determines how shared expenses are attributed to each partner in the reveal.', PURPLE),

  ...POOLING_MODELS.flatMap(m => [
    new Paragraph({
      spacing: { before: 240, after: 100 },
      children: [run(m.label, { size: 26, bold: true, color: PURPLE })],
    }),
    body(m.desc),
    body('Math behavior:', { bold: true, after: 80 }),
    ...(m.id === 'combined' ? [
      body('No separate contributions are calculated. The reveal shows the combined pool, combined shared expenses, and combined surplus. Personal spending is deducted from the pool.', { color: MUTED }),
    ] : m.id === 'proportional' ? [
      body('Each partner contributes to shared expenses (including goal contributions) in proportion to their share of combined income:', { color: MUTED }),
      body('partner A contribution = (partner A income ÷ combined income) × total shared', { color: INK, italics: true, indent: 400 }),
      body('partner B contribution = total shared − partner A contribution', { color: INK, italics: true, indent: 400 }),
      body('Each partner\'s "leftover" = their income − their contribution − their personal spending.', { color: MUTED }),
    ] : m.id === 'fifty_fifty' ? [
      body('Each partner contributes half of total shared expenses (including goal contributions), regardless of income. Each partner\'s "leftover" = their income − half of shared − their personal spending.', { color: MUTED }),
    ] : [
      body('No shared contribution math. The reveal shows a short message noting that the couple is tracking expenses individually and does not calculate splits.', { color: MUTED }),
    ]),
  ]),
];

// ── Section 4: Reveal math ────────────────────────────────────────────────
const revealSection = [
  ...secHead(4, 'The reveal',
    'Three blocks of pure facts. Pulls from the budget inputs + each partner\'s Expectations Exercise answers.', PURPLE),

  eyebrow('Block 1 · What your budget does', PURPLE),
  body('Three headline stats plus a top-3-categories breakdown:'),
  itemBullet('Savings rate (%) — total monthly savings + goal contributions ÷ total income × 100'),
  itemBullet('Unallocated each month (dollars) — total income − all allocations; labeled "Over budget" if negative'),
  itemBullet('Toward goals monthly (dollars) — sum of target ÷ months across all goals'),
  itemBullet('Top 3 categories as share of income — each shown with percentage and dollar amount'),

  eyebrow('Block 2 · What you each said', PURPLE),
  body('Pulled verbatim from each partner\'s Expectations Exercise (Life & Values section) answers. Only three questions are echoed here:'),
  itemBullet('lq_finances — how you want to manage money (e.g. "Mostly combined")'),
  itemBullet('lq_money_lean — saving vs spending orientation (e.g. "Lean toward saving")'),
  itemBullet('lq_money_risk — financial risk tolerance (e.g. "Cautious but open")'),
  body('Each row shows the question label, then each partner\'s answer in parallel columns. No commentary — the facts stand on their own.', { italics: true, color: MUTED }),

  eyebrow('Block 3 · How the money moves', PURPLE),
  body('For pooling models that calculate splits (proportional, 50/50), shows each partner\'s:'),
  itemBullet('Contribution to shared expenses (dollars, monthly)'),
  itemBullet('Personal spending (dollars, monthly)'),
  itemBullet('Leftover (income − contribution − personal spending)'),
  body('For "fully combined," shows pool-level totals with a short plain-English summary. For "fully separate," shows a short note that no shared split is calculated.', { italics: true, color: MUTED }),
];

// ── Section 5: Save & sync ───────────────────────────────────────────────
const saveSection = [
  ...secHead(5, 'Save and sync',
    'How the budget persists across refreshes, devices, and partners.', BLUE),

  eyebrow('Save affordance', BLUE),
  body('A sticky footer shows the current save state: "All changes saved" when clean, "Unsaved changes" when the user has edited anything since the last save, "Saving…" during the write, and "✓ Saved" for two seconds after a successful write. The Save changes button is disabled unless there are unsaved changes.'),

  eyebrow('Where it writes', BLUE),
  body('Every save writes to both:'),
  itemBullet('localStorage under the key attune_budget — instant, persists across refreshes on the same device'),
  itemBullet('Supabase profiles.budget_data (jsonb column) — syncs across the user\'s devices when they log back in'),

  eyebrow('Shared access', BLUE),
  body('Both partners have the budget tool available from their own dashboard when the Premium package is active. Each partner\'s budget_data column is stored under their own profile — last-saved-by-either-partner is what shows on their respective device.'),
  body('NOTE: Cross-partner sync (partner B sees partner A\'s edits in real time) is not yet built. Today, each partner has their own independent budget state. If the couple wants to share one budget, one of them should do the data entry and share the summary with the other via screen or saved PDF.', { italics: true, color: MUTED }),

  eyebrow('⚠ Supabase migration required', ORANGE),
  body('The Supabase profiles table needs a budget_data column added before cross-device sync works. Run this one SQL statement in the Supabase SQL editor:', { bold: true }),
  new Paragraph({
    spacing: { before: 80, after: 200, line: 340, lineRule: 'atLeast' },
    shading: { fill: 'F5EFE2', type: ShadingType.CLEAR },
    indent: { left: 300, right: 300 },
    border: {
      top: { style: BorderStyle.SINGLE, size: 6, color: ORANGE, space: 12 },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: ORANGE, space: 12 },
      left: { style: BorderStyle.SINGLE, size: 12, color: ORANGE, space: 12 },
      right: { style: BorderStyle.SINGLE, size: 6, color: ORANGE, space: 12 },
    },
    children: [run('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS budget_data jsonb;',
      { size: 22, font: 'Courier New', color: INK })],
  }),
  body('Until this column exists, saves will still succeed locally (localStorage) but the Supabase write will silently fail. The app is wrapped in try/catch so this doesn\'t break anything — the only impact is that a user logging in from a second device won\'t see their saved budget.', { italics: true, color: MUTED }),
];

// ── Section 6: Source locations ──────────────────────────────────────────
const refSection = [
  ...secHead(6, 'Source locations',
    'Where the tool lives in the codebase.', ORANGE),
  itemBullet('src/App.jsx → BUDGET_CATEGORIES (line ~4370) — category + line-item data'),
  itemBullet('src/App.jsx → POOLING_MODELS (line ~4395) — the 4 pooling options with descriptions'),
  itemBullet('src/App.jsx → computeReveal() (line ~4430) — the pure-function math for the reveal block'),
  itemBullet('src/App.jsx → BudgetTool() (line ~4504) — the main component'),
  itemBullet('src/App.jsx → BudgetCategoryBlock() + BudgetReveal() + RevealStat() — sub-components'),
  body('This doc is generated by scripts/build_budget_tool_doc.mjs, which parses BUDGET_CATEGORIES and POOLING_MODELS from App.jsx as the single source of truth. Rebuild the doc whenever the data changes.', { italics: true, color: MUTED }),
];

// ── Assemble ────────────────────────────────────────────────────────────
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
            run('Attune · Shared Budget Tool (internal)   ·   ', { size: 16, color: MUTED }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: INK, font: 'Arial' }),
            run(' / ', { size: 16, color: MUTED }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: MUTED, font: 'Arial' }),
          ] })],
      }),
    },
    children: [
      ...cover,
      ...flowSection,
      ...catSection,
      ...poolSection,
      ...revealSection,
      ...saveSection,
      ...refSection,
    ],
  }],
});

const buf = await Packer.toBuffer(doc);
const outPath = '/tmp/budget_tool_internal.docx';
writeFileSync(outPath, buf);
execSync('libreoffice --headless --convert-to pdf --outdir /tmp ' + outPath, { stdio: 'pipe' });
console.log(`✓ Budget tool internal: ${outPath} (${buf.length} bytes)`);
