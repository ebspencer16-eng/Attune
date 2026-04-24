// Build two review docs from App.jsx copy:
//   1. intro_outro_copy.docx — all intro/outro text across the 5 exercises
//   2. edge_case_copy.docx   — partner-waiting, auth errors, save states, etc.
//
// Text sizing follows the budget doc convention (body 22 / 11pt), since
// Ellie flagged the earlier internal docs as too small.
//
// Source line numbers are listed per-string so she can find each one in
// src/App.jsx. Strings are quoted exactly as they appear in the code.

import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType,
  Footer, PageNumber, VerticalAlign,
} from 'docx';

// ── Tokens ────────────────────────────────────────────────────────────────
const INK = '0E0B07', MUTED = '8C7A68', STONE = 'E8DDD0';
const ORANGE = 'E8673A', BLUE = '1B5FE8', PURPLE = '9B5DE5', GREEN = '10B981', GOLD = 'F59E0B', ROSE = 'D9537C';

const run = (t, o = {}) => new TextRun({ text: String(t ?? ''), font: 'Arial', ...o });
const sp  = (n = 1) => Array.from({ length: n }, () => new Paragraph({ children: [new TextRun('')], spacing: { after: 100 } }));
const pb  = () => new Paragraph({ children: [new TextRun({ break: 1 })], pageBreakBefore: true });
const CONTENT_W = 9360;

// ── Shared primitives ─────────────────────────────────────────────────────
const body = (text, opts = {}) => new Paragraph({
  spacing: { after: opts.after ?? 140, line: 340, lineRule: 'atLeast' },
  indent: opts.indent ? { left: opts.indent } : undefined,
  alignment: opts.center ? AlignmentType.CENTER : undefined,
  children: [run(text, { size: opts.size ?? 22, color: opts.color ?? INK, bold: opts.bold, italics: opts.italics })],
});

const eyebrow = (text, color) => new Paragraph({
  spacing: { before: 160, after: 100 },
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
  new Paragraph({ spacing: { after: 240 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color, space: 4 } },
    children: [new TextRun('')] }),
];

// Copy-entry card: a quoted string with metadata (where, when, source).
// `text` is the exact copy shown to users. `where`/`when`/`source` are
// review metadata. Variables like {partnerName} are preserved verbatim.
function copyCard({ where, when, text, source, notes, color = ORANGE }) {
  const border = { style: BorderStyle.SINGLE, size: 6, color, space: 8 };

  const blocks = [];

  // Where shown
  blocks.push(new Paragraph({
    spacing: { before: 0, after: 60 },
    children: [run(where, { size: 20, bold: true, color: INK })],
  }));

  // When shown (conditions)
  if (when) {
    blocks.push(new Paragraph({
      spacing: { after: 140 },
      children: [run(when, { size: 16, italics: true, color: MUTED })],
    }));
  }

  // The copy itself — indented, tinted block-quote with a left accent border
  const textLines = Array.isArray(text) ? text : [text];
  textLines.forEach((line, i) => {
    blocks.push(new Paragraph({
      spacing: { before: i === 0 ? 100 : 100, after: 100, line: 360, lineRule: 'atLeast' },
      shading: { fill: 'FAF7F1', type: ShadingType.CLEAR },
      indent: { left: 320, right: 240 },
      border: { left: { style: BorderStyle.SINGLE, size: 18, color, space: 16 } },
      children: [run(line, { size: 22, color: INK })],
    }));
  });

  // Source file + line
  if (source) {
    blocks.push(new Paragraph({
      spacing: { before: 100, after: 40 },
      children: [
        run('Source: ', { size: 16, color: MUTED }),
        run(source, { size: 16, color: MUTED, font: 'Courier New' }),
      ],
    }));
  }

  // Notes
  if (notes) {
    blocks.push(new Paragraph({
      spacing: { before: 60, after: 100 },
      children: [run('⚠ ' + notes, { size: 18, italics: true, color: 'C8402A' })],
    }));
  }

  // Separator
  blocks.push(new Paragraph({
    spacing: { before: 80, after: 240 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: STONE, space: 4 } },
    children: [new TextRun('')],
  }));

  return blocks;
}

// Draft-copy card — same shape as copyCard but clearly labeled DRAFT, and
// uses a green accent border to visually distinguish proposed new copy
// from the quoted "this is what exists today" blocks elsewhere in the doc.
//
//   gap:   short description of what is missing today
//   draft: the proposed text (string or array of strings)
//   where: where the copy would appear if shipped
//   when:  when it would trigger
//   notes: implementation/tone notes (optional)
function draftCard({ gap, draft, where, when, notes }) {
  const color = GREEN;
  const blocks = [];

  // DRAFT eyebrow
  blocks.push(new Paragraph({
    spacing: { before: 0, after: 80 },
    children: [run('DRAFT — proposed copy', { size: 14, bold: true, color, allCaps: true, characterSpacing: 80 })],
  }));

  // Gap description (what's missing today)
  blocks.push(new Paragraph({
    spacing: { after: 60 },
    children: [run('Gap: ' + gap, { size: 20, bold: true, color: INK })],
  }));

  // Where + when
  if (where) {
    blocks.push(new Paragraph({
      spacing: { after: 40 },
      children: [run('Would appear: ' + where, { size: 18, italics: true, color: MUTED })],
    }));
  }
  if (when) {
    blocks.push(new Paragraph({
      spacing: { after: 100 },
      children: [run('Would trigger: ' + when, { size: 18, italics: true, color: MUTED })],
    }));
  }

  // The draft copy in a tinted box with green accent
  const draftLines = Array.isArray(draft) ? draft : [draft];
  draftLines.forEach((line, i) => {
    blocks.push(new Paragraph({
      spacing: { before: i === 0 ? 100 : 100, after: 100, line: 360, lineRule: 'atLeast' },
      shading: { fill: 'F0FDF9', type: ShadingType.CLEAR },
      indent: { left: 320, right: 240 },
      border: { left: { style: BorderStyle.SINGLE, size: 18, color, space: 16 } },
      children: [run(line, { size: 22, color: INK })],
    }));
  });

  // Notes
  if (notes) {
    blocks.push(new Paragraph({
      spacing: { before: 80, after: 100 },
      children: [run('Note: ' + notes, { size: 18, italics: true, color: MUTED })],
    }));
  }

  // Separator
  blocks.push(new Paragraph({
    spacing: { before: 80, after: 240 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: STONE, space: 4 } },
    children: [new TextRun('')],
  }));

  return blocks;
}

// Decision-needed card — flags a gap where a product decision has to come
// before copy can be drafted. Used for things like "change partner" or
// "retake Exercise 01" where the question isn't what it should say, it's
// whether the feature should exist at all.
function decisionCard({ gap, decision, notes }) {
  const color = ORANGE;
  const blocks = [];

  blocks.push(new Paragraph({
    spacing: { before: 0, after: 80 },
    children: [run('NEEDS PRODUCT DECISION', { size: 14, bold: true, color, allCaps: true, characterSpacing: 80 })],
  }));
  blocks.push(new Paragraph({
    spacing: { after: 60 },
    children: [run('Gap: ' + gap, { size: 20, bold: true, color: INK })],
  }));
  blocks.push(new Paragraph({
    spacing: { after: 100 },
    children: [run(decision, { size: 20, color: INK, italics: true })],
  }));
  if (notes) {
    blocks.push(new Paragraph({
      spacing: { before: 40, after: 100 },
      children: [run('Note: ' + notes, { size: 18, italics: true, color: MUTED })],
    }));
  }
  blocks.push(new Paragraph({
    spacing: { before: 80, after: 240 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: STONE, space: 4 } },
    children: [new TextRun('')],
  }));
  return blocks;
}

// ═════════════════════════════════════════════════════════════════════════
// DOC 1 — INTRO/OUTRO COPY
// ═════════════════════════════════════════════════════════════════════════

function buildIntroOutroDoc() {
  // ── Cover ──────────────────────────────────────────────────────────────
  const cover = [
    ...sp(1),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [run('ATTUNE', { size: 22, bold: true, color: ORANGE, allCaps: true, characterSpacing: 120 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
      children: [run('Intro & outro copy', { size: 44, bold: true, color: INK })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [run('All opening + closing text across every exercise and add-on', { size: 22, italics: true, color: MUTED })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 360 },
      children: [run('For joint review', { size: 20, color: MUTED })] }),

    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 140 },
      children: [run('Covered here', { size: 16, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }),

    ...[
      ['Section 1', 'Communication Exercise (Exercise 01)',   'Intro, outro, navigation copy', BLUE],
      ['Section 2', 'Expectations Exercise (Exercise 02)',    'Core, Anniversary, and Revisiting variants', PURPLE],
      ['Section 3', 'Relationship Reflection (Exercise 03)',  'Also known as Anniversary exercise',         GREEN],
      ['Section 4', 'Starting Out Checklist',                 'Inline intro, no outro',  GOLD],
      ['Section 5', 'Shared Budget Tool',                     'Intro philosophy, reveal headers', ROSE],
      ['Section 6', 'Gaps + suggested drafts',               'Proposed copy for places where text is missing', ORANGE],
    ].map(([step, title, desc, color]) => new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        run(step + '   ', { size: 18, bold: true, color, characterSpacing: 60 }),
        run(title + '   ', { size: 22, bold: true, color: INK }),
        run('— ' + desc, { size: 20, italics: true, color: MUTED }),
      ],
    })),

    ...sp(2),

    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240, after: 60 },
      children: [run('How to read this doc', { size: 16, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }),
    body('Each copy entry shows the exact text users see, labeled with where it appears and when. Source line references point to src/App.jsx. Variables like {partnerName} and {userName} are kept as-is so you can see what gets substituted at runtime.',
      { center: true, italics: true, color: MUTED }),
  ];

  // ── Section 1: Communication Exercise ──────────────────────────────────
  const commsSection = [
    ...secHead(1, 'Communication Exercise (Exercise 01)',
      '30 forced-choice A/B personality questions. Users go straight into questions — there is no dedicated intro screen when Partner A launches the exercise from their dashboard.', BLUE),

    eyebrow('Intro copy', BLUE),
    ...copyCard({
      where: 'Partner A — no dedicated intro screen',
      when: 'When the logged-in user clicks "Exercise 1" from their dashboard, the exercise starts directly at Question 1 of 30. There is no intro page, description, or "Begin" button in the Partner A flow.',
      text: '(No intro copy exists for Partner A.)',
      source: 'src/App.jsx:10442 — Exercise01Flow rendered inline without wrapper',
      notes: 'Compare to the Expectations exercise, which does have a dedicated intro phase. Worth deciding whether Exercise 01 should have one too.',
      color: BLUE,
    }),

    ...copyCard({
      where: 'Partner B — combined intro for both exercises',
      when: 'Shown to Partner B when they first open their invite link, before they start either exercise. This is the only intro screen for Exercise 01 that users see.',
      text: [
        'Header eyebrow: "Your exercises — {account.name} & {account.partnerName}"',
        'Title: "Two exercises. Your answers are yours alone."',
        'Body: "Exercise 01 covers how you communicate and connect. Exercise 02 maps your expectations. Both take about 15 minutes. Answer honestly — your partner won\'t see your individual answers."',
        'Exercise 01 card label: "Communication — 30 questions · 10 dimensions"',
        'Exercise 02 card label: "Expectations — Responsibilities & life"',
      ],
      source: 'src/App.jsx:8560-8576 — PartnerBExerciseFlow intro step',
      color: BLUE,
    }),

    eyebrow('Navigation copy', BLUE),
    ...copyCard({
      where: 'Inside the exercise — question navigation',
      when: 'Shown on every question page during the exercise.',
      text: [
        'Progress label: "Question {idx + 1} of {total}"',
        'Scale labels: "Strongly A" / "Mostly A" / "In the middle" / "Mostly B" / "Strongly B"',
        'Back button: "← Back" (hidden on Q1)',
        'Next button: "Next →"',
        'On the final question, Next becomes: "Complete Exercise →"',
      ],
      source: 'src/App.jsx:2092-2168 — Exercise01Flow scale + nav',
      color: BLUE,
    }),

    eyebrow('Outro copy', BLUE),
    ...copyCard({
      where: 'Completion screen after submitting',
      when: 'Shown immediately after the user completes Exercise 01, before they return to the dashboard or see results.',
      text: [
        'Title: "Exercise 1 Complete."',
        'Eyebrow: "Your communication profile is mapped"',
        'Body (partner not done): "When {partnerName} finishes, you\'ll unlock your couple type and learn what that means for the two of you."',
        'Body (both done): "Both exercises complete. Your results are ready."',
        'Button (partner not done): "Back to Dashboard →"',
        'Button (both done): "See Your Results →"',
      ],
      source: 'src/App.jsx:10400-10413',
      color: BLUE,
    }),

    ...copyCard({
      where: 'Partner B completion — "your exercises are done" (waiting state)',
      when: 'Shown when Partner B has completed both Exercise 01 and 02 but Partner A has not finished yet.',
      text: [
        'Eyebrow: "Your exercises are done"',
        'Title: "Waiting for {partnerAName}."',
        'Body: "Your answers have been saved. Results will unlock as soon as {partnerAName} finishes their exercises. You\'ll both see everything at the same time."',
      ],
      source: 'src/App.jsx:8656-8663',
      notes: 'This is shown after BOTH exercises are complete on the Partner B side, not after Exercise 01 alone. Partner B has no intermediate completion screen between Exercise 01 and Exercise 02.',
      color: BLUE,
    }),
  ];

  // ── Section 2: Expectations Exercise ───────────────────────────────────
  const expectSection = [
    ...secHead(2, 'Expectations Exercise (Exercise 02)',
      'Responsibilities + Life & Values questions. Three variants: Core (new couples), Anniversary (married), Revisiting (retake).', PURPLE),

    eyebrow('Intro — Core variant', PURPLE),
    ...copyCard({
      where: 'Dedicated intro phase at the start of Exercise 02',
      when: 'Shown when isAnniversary = false AND isRevisited = false (default Core flow for new couples).',
      text: [
        'Eyebrow: "Exercise 02 . What You Expect"',
        'Title: "All frustrations in a relationship trace back to an unmet expectation."',
        'Body: "Two parts. First, life and values questions — children, finances, where you live, how you handle conflict and repair. Then, who you expect to handle what across household, financial, career, and emotional responsibilities. You\'ll also share who did each of these in your childhood home, which helps explain why you each carry the expectations you do."',
        'Follow-up: "Sometimes expectations go unmet because they were never said. Sometimes they were said but heard differently. Either way, seeing them side by side is the point. Answer for yourself — you\'ll see your answers alongside your partner\'s only after you\'ve both finished."',
        'Duration line: "~15 minutes · 2 parts"',
        'Button: "Start →"',
      ],
      source: 'src/App.jsx:126-157 — ExpectationsExercise intro phase',
      color: PURPLE,
    }),

    eyebrow('Intro — Anniversary variant', PURPLE),
    ...copyCard({
      where: 'Dedicated intro phase, Anniversary wording',
      when: 'Shown when isAnniversary = true (Anniversary Collection package).',
      text: [
        'Title (same): "All frustrations in a relationship trace back to an unmet expectation."',
        'Body: "Two parts. First, how you each feel about the things that shape your shared life, family, values, money, conflict, connection. Then, who has each been quietly assuming handles what."',
        'Follow-up: "Answer honestly, not how you think you should feel, but how you actually do. You\'ll see your answers alongside your partner\'s only after you\'ve both finished."',
        'Duration line: "~15 minutes · 2 parts"',
      ],
      source: 'src/App.jsx:126-157 — ExpectationsExercise intro phase, isAnniversary branch',
      color: PURPLE,
    }),

    eyebrow('Intro — Revisiting variant', PURPLE),
    ...copyCard({
      where: 'Dedicated intro phase, Revisiting wording',
      when: 'Shown when isRevisited = true (returning user retaking).',
      text: [
        'Title (same): "All frustrations in a relationship trace back to an unmet expectation."',
        'Body: "One part, no responsibilities section this time. Just the life and values questions, revisited. See what\'s shifted, what\'s stayed the same, and what that means for where you are now."',
        'Follow-up: "There\'s no right direction for things to shift. Answer honestly, not how you think you should feel, but how you actually do. You\'ll see both sets of answers together once you\'ve both finished."',
        'Duration line: "~10 minutes · life questions only"',
      ],
      source: 'src/App.jsx:126-157 — ExpectationsExercise intro phase, isRevisited branch',
      color: PURPLE,
    }),

    eyebrow('Childhood setup screen', PURPLE),
    ...copyCard({
      where: 'Between Life & Values and Responsibilities sections',
      when: 'Shown on Core and Anniversary variants (skipped on Revisiting).',
      text: [
        'Eyebrow: "Exercise 02 · Before we start"',
        'Title: "Who were the primary adults in your home growing up?"',
        'Body: "This shapes how you answer the next section, and helps us give you more meaningful context in your results."',
      ],
      source: 'src/App.jsx:160-181 — ExpectationsExercise childhood-setup phase',
      color: PURPLE,
    }),

    eyebrow('Navigation copy', PURPLE),
    ...copyCard({
      where: 'Throughout the exercise',
      when: 'Shown on every question page in Part 1 and Part 2.',
      text: [
        'Progress label: "Your Expectations, Part 1 of 2" or "Part 2 of 2"',
        'Back button: "← Back" (returns to intro if on first question)',
        'Next button: "Next →"',
        'On the final question: "All done →" (note: button text is "All done →" regardless of variant)',
      ],
      source: 'src/App.jsx:442-475',
      color: PURPLE,
    }),

    eyebrow('Outro copy', PURPLE),
    ...copyCard({
      where: 'Completion screen after submitting Exercise 02',
      when: 'Shown after all Life & Values + Responsibilities questions are answered.',
      text: [
        'Title: "Exercise 2 Complete."',
        'Eyebrow: "Your expectations are recorded"',
        'Body (first line): "That took honesty. Most couples never have these conversations until they have to."',
        'Body (second line, partner not done): "When {partnerName} finishes both exercises, you\'ll unlock your couple type and learn what that means for the two of you."',
        'Body (second line, both done): "Both exercises complete. Your results are ready."',
      ],
      source: 'src/App.jsx:10461-10464',
      color: PURPLE,
    }),
  ];

  // ── Section 3: Relationship Reflection ──────────────────────────────────
  const reflectSection = [
    ...secHead(3, 'Relationship Reflection (Exercise 03)',
      'Same component as the Anniversary exercise. Rebranded as "Relationship Reflection" when sold as a standalone add-on to non-Anniversary packages.', GREEN),

    eyebrow('Intro copy', GREEN),
    ...copyCard({
      where: 'No dedicated intro screen',
      when: 'Clicking "Exercise 3" or "Relationship Reflection" from the dashboard drops the user directly into Question 1.',
      text: '(No intro copy exists.)',
      source: 'src/App.jsx:3901-3946 — AnniversaryExercise starts at step 0 immediately',
      notes: 'Same gap as Exercise 01. If intro screens get added for these, they should match the Expectations intro format.',
      color: GREEN,
    }),

    eyebrow('Progress copy', GREEN),
    ...copyCard({
      where: 'Throughout the exercise',
      when: 'Shown at the top of every question.',
      text: [
        'Eyebrow: "Exercise 03 · Our Relationship Story"',
        'Category eyebrow: "{q.category}" (varies by question: "How We\'re Doing", "Looking Forward", etc.)',
        'Back button: "← Back" (returns to dashboard if on first question)',
        'Next button: "Next →"',
      ],
      source: 'src/App.jsx:3939-3946',
      color: GREEN,
    }),

    eyebrow('Outro copy', GREEN),
    ...copyCard({
      where: 'Inline completion screen inside the exercise component',
      when: 'Shown briefly after the last question is answered, before the user is returned to the dashboard.',
      text: [
        'Title: "Reflection Complete."',
        'Body: "Your answers are saved. When {partnerName} completes theirs, you\'ll see a side-by-side view of your shared story."',
        'Button: "View My Results →"',
      ],
      source: 'src/App.jsx:3923-3931 — AnniversaryExercise inline outro',
      color: GREEN,
    }),

    ...copyCard({
      where: 'Dashboard-level completion screen (when ex3Answers already exists)',
      when: 'Shown when the user returns to the "Exercise 3" view after having previously completed it.',
      text: [
        'Title: "Reflection Complete."',
        'Eyebrow: "Your relationship story is captured"',
        'Button 1: "Retake"  (clears ex3 state and starts over)',
        'Button 2: "See Your Results →"',
      ],
      source: 'src/App.jsx:10544-10552',
      color: GREEN,
    }),
  ];

  // ── Section 4: Starting Out Checklist ──────────────────────────────────
  const checklistSection = [
    ...secHead(4, 'Starting Out Checklist',
      'Single-screen checklist. The intro is an inline paragraph at the top of the page, not a separate screen.', GOLD),

    eyebrow('Intro copy', GOLD),
    ...copyCard({
      where: 'Top of the checklist page',
      when: 'Always visible above the checklist when the user opens it.',
      text: [
        'Eyebrow: "Starting Out Collection"',
        'Title: "Starting Out Checklist"',
        'Body: "The real-world logistics of merging your lives. Tap the arrow next to each item for a bit more context. Check things off as you go, no rush, just a clear picture of what\'s done and what\'s next."',
        'Progress meter: "{checkedCount}/{totalItems} complete"',
      ],
      source: 'src/App.jsx:4282-4286',
      color: GOLD,
    }),

    eyebrow('Section headers', GOLD),
    ...copyCard({
      where: 'Above each of the 6 sections on the page',
      when: 'Static section labels.',
      text: [
        '1. Name Change — "{n}/{total} complete"',
        '2. Merging Finances — "{n}/{total} complete"',
        '3. Insurance & Benefits — "{n}/{total} complete"',
        '4. Estate Basics — "{n}/{total} complete"',
        '5. Taxes — "{n}/{total} complete"',
        '6. Household Setup — "{n}/{total} complete"',
        'When a section is fully done, an additional "✓ Done" label appears.',
      ],
      source: 'src/App.jsx:4297-4302',
      color: GOLD,
    }),

    eyebrow('Outro copy', GOLD),
    ...copyCard({
      where: 'No dedicated outro',
      when: 'The checklist has no completion celebration screen. When all items are checked, nothing in the UI changes beyond the progress meter showing 100% and each section showing "✓ Done".',
      text: '(No outro copy exists.)',
      source: 'src/App.jsx:4272-4330',
      notes: 'Consider whether a "You\'re all set" celebration is worth adding. Low priority — most couples complete this over weeks, so celebrating 100% would be unusual.',
      color: GOLD,
    }),
  ];

  // ── Section 5: Shared Budget Tool ───────────────────────────────────────
  const budgetSection = [
    ...secHead(5, 'Shared Budget Tool',
      'Inline intro + reveal (appears automatically when enough data is entered). No intro or outro screen.', ROSE),

    eyebrow('Intro copy', ROSE),
    ...copyCard({
      where: 'Top of the budget tool page',
      when: 'Always visible when the user opens the tool.',
      text: [
        'Eyebrow: "Attune Premium"',
        'Title: "Shared Budget Tool"',
        'Body: "Build your real shared budget together. Your numbers stay yours — Attune is a calculator, not a financial advisor."',
        'Secondary note: "Both of you can access and edit this from your dashboard. Use Save changes to sync across devices."',
      ],
      source: 'src/App.jsx:4568-4573',
      color: ROSE,
    }),

    eyebrow('Step labels', ROSE),
    ...copyCard({
      where: 'Section headers as user scrolls',
      when: 'Static step labels shown above each input section.',
      text: [
        'Step 1 · "Start with where you stand" — "Each of you enters your post-tax monthly take-home. Then pick the model that matches how you want to handle shared expenses."',
        'Step 2 · "Essentials" — "The things you pay every month to keep life running. Include regular savings and retirement contributions here."',
        'Step 3 · "Discretionary" — "Everything else. Personal spending at the bottom is split per partner — your walking-around money."',
        'Step 4 · "Savings goals" — "Add a goal and Attune will show the monthly contribution needed. Compare it against your surplus above to see what\'s realistic."',
      ],
      source: 'src/App.jsx:4610-4720',
      color: ROSE,
    }),

    eyebrow('Reveal (outro-equivalent) copy', ROSE),
    ...copyCard({
      where: 'Appears at the bottom of the page when income > 0 AND at least one expense > 0',
      when: 'Auto-appears; no button to trigger.',
      text: [
        'Eyebrow: "The picture"',
        'Title: "What your budget shows"',
        'Block 1 header: "What your budget does"',
        'Block 2 header: "What you each said"',
        'Block 2 caption: "From your Expectations Exercise answers."',
        'Block 3 header: "How the money moves"',
        'Under fully separate: "You chose fully separate. Each of you tracks your own contribution independently — no shared split is calculated."',
        'Under fully combined: "You chose fully combined. Combined pool of {total} covers {shared} in shared expenses and savings, leaving {surplus} unallocated from the pool."',
      ],
      source: 'src/App.jsx:4780-4900',
      color: ROSE,
    }),
  ];

  // ── Section 6: Gaps + suggested drafts ─────────────────────────────────
  const gapsSection = [
    ...secHead(6, 'Gaps + suggested copy drafts',
      'Places where intro or outro copy is missing, with draft text proposed for each.', ORANGE),

    body('Each entry below flags a copy gap and proposes draft text. Drafts follow the Attune tone rules: short declarative sentences, no hedging, confident but not threatening. Green-bordered blocks are proposed new copy, not currently shipped.',
      { italics: true, color: MUTED, after: 240 }),

    ...draftCard({
      gap: 'Exercise 01 has no dedicated intro screen for Partner A',
      where: 'New phase before Question 1 in the Exercise 01 flow, matching the Expectations intro format',
      when: 'When a logged-in user clicks "Exercise 1" from their dashboard and ex1Answers is null',
      draft: [
        'Eyebrow: "Exercise 01 · How You Communicate"',
        'Title: "The way you communicate shapes everything else."',
        'Body: "Thirty questions. Each asks you to choose between two ways of doing the same thing. Answer for how you actually are, not how you think you should be."',
        'Follow-up (block-quoted): "Your answers map your communication style across ten dimensions. You\'ll see where you and {partnerName} line up, and where you don\'t."',
        'Duration line: "~10 minutes · 30 questions"',
        'Button: "Start →"',
      ],
      notes: 'Structure mirrors the Expectations intro: hook title, concrete description, follow-up explaining why this matters, duration, button.',
    }),

    ...draftCard({
      gap: 'Exercise 03 / Relationship Reflection has no dedicated intro screen',
      where: 'New phase before Question 1 in the AnniversaryExercise component',
      when: 'When a user opens Exercise 3 and ex3Answers is null',
      draft: [
        'Eyebrow: "Exercise 03 · Our Relationship Story"',
        'Title: "The moments that make a relationship are worth naming."',
        'Body: "A mix of scale questions, short reflections, and a few rankings. Nothing to study for. Just answer."',
        'Follow-up (block-quoted): "When {partnerName} finishes theirs, you\'ll see where your stories overlap and where you each saw something the other didn\'t."',
        'Duration line: "~10 minutes"',
        'Button: "Start →"',
      ],
      notes: 'The "Our Relationship Story" eyebrow matches the progress label already shown inside the exercise, so the user has continuity moving from intro to questions.',
    }),

    ...decisionCard({
      gap: 'Starting Out Checklist has no completion celebration',
      decision: 'Decide whether completing the checklist should trigger a celebration screen, and whether that celebration should appear immediately on the final check or on next dashboard visit.',
      notes: 'Low priority. Completing the full checklist typically takes weeks or months. A celebration at 100% could feel nice but could also feel anticlimactic if the user completes the last item days after the second-to-last.',
    }),

    ...decisionCard({
      gap: 'Budget Tool has no outro',
      decision: 'By current design, the reveal block at the bottom of the page is the closest thing to an outro. No summary screen after saving. Decide whether a distinct post-save experience is needed.',
      notes: 'Users iterate on the budget over time, so a one-time "you\'re done" message may not fit. Current design assumes users return to edit.',
    }),
  ];

  return new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
    sections: [{
      properties: { page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1440, bottom: 1080, left: 1440 },
      } },
      footers: {
        default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: STONE, space: 8 } },
          spacing: { before: 120, after: 0 },
          children: [
            run('Attune · Intro & outro copy   ·   ', { size: 16, color: MUTED }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: INK, font: 'Arial' }),
            run(' / ', { size: 16, color: MUTED }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: MUTED, font: 'Arial' }),
          ] })] }),
      },
      children: [...cover, ...commsSection, ...expectSection, ...reflectSection,
                 ...checklistSection, ...budgetSection, ...gapsSection],
    }],
  });
}

// ═════════════════════════════════════════════════════════════════════════
// DOC 2 — EDGE-CASE COPY
// ═════════════════════════════════════════════════════════════════════════

function buildEdgeCaseDoc() {
  // ── Cover ──────────────────────────────────────────────────────────────
  const cover = [
    ...sp(1),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [run('ATTUNE', { size: 22, bold: true, color: ORANGE, allCaps: true, characterSpacing: 120 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
      children: [run('Edge-case copy', { size: 44, bold: true, color: INK })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [run('Partner waiting states, auth errors, save states, account conflicts', { size: 22, italics: true, color: MUTED })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 360 },
      children: [run('For joint review', { size: 20, color: MUTED })] }),

    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 140 },
      children: [run('Covered here', { size: 16, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }),

    ...[
      ['Section 1', 'Invite + signup flow',            'Before either partner has an account',      BLUE],
      ['Section 2', 'Partner hasn\'t completed yet',    'Waiting states after one partner finishes', PURPLE],
      ['Section 3', 'Account collisions + wrong account', 'Partner B using wrong card or email',     GOLD],
      ['Section 4', 'Auth errors',                     'Login failure, signup failure, wrong password', ROSE],
      ['Section 5', 'Save + sync states',              'Budget tool save button, localStorage, Supabase sync', GREEN],
      ['Section 6', 'Privacy reassurances',            'Shown at key decision points',              ORANGE],
      ['Section 7', 'Generic fallback errors',         'Network failures and unexpected errors',    INK],
      ['Section 8', 'Gaps + suggested drafts',       'Proposed copy for edge cases without text today', ORANGE],
    ].map(([step, title, desc, color]) => new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        run(step + '   ', { size: 18, bold: true, color, characterSpacing: 60 }),
        run(title + '   ', { size: 22, bold: true, color: INK }),
        run('— ' + desc, { size: 20, italics: true, color: MUTED }),
      ],
    })),

    ...sp(2),

    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240, after: 60 },
      children: [run('How to read this doc', { size: 16, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }),
    body('Same format as the intro/outro doc: each copy entry shows the exact text users see, labeled with where it appears and when. Source line references point to src/App.jsx. Variables like {partnerName} are preserved verbatim.',
      { center: true, italics: true, color: MUTED }),
  ];

  // ── Section 1: Invite + signup ─────────────────────────────────────────
  const inviteSection = [
    ...secHead(1, 'Invite + signup flow',
      'Copy shown before either partner has an account, or while setting up the partner invitation.', BLUE),

    eyebrow('Invite partner prompt', BLUE),
    ...copyCard({
      where: 'Signup / checkout flow — inviting partner',
      when: 'Shown when a user has entered their partner\'s name (and optionally email) during signup.',
      text: [
        'With partner name: "Let\'s invite {theirName} so you can do this together."',
        'Without partner name: "Let\'s invite your partner so you can do this together."',
      ],
      source: 'src/App.jsx:1326',
      color: BLUE,
    }),

    ...copyCard({
      where: 'Post-invite confirmation',
      when: 'Shown to the primary purchaser after they\'ve entered their partner\'s email.',
      text: [
        'With email: "We\'ve sent {theirName} an invite. Create your account to get started."',
        'Without email: "Create your account to begin the exercises."',
      ],
      source: 'src/App.jsx:1437',
      color: BLUE,
    }),

    eyebrow('Onboarding checklist items', BLUE),
    ...copyCard({
      where: 'Dashboard onboarding progress (logged-in state)',
      when: 'Shown to the primary user while they still have steps to complete.',
      text: [
        '"Add your partner\'s name" (done when partnerName is set)',
        '"Invite your partner" / "Partner invited ✓"  (toggles based on partnerEmail)',
        'Generic invite button text: "Invite your partner"',
      ],
      source: 'src/App.jsx:1456-1457, 8730',
      color: BLUE,
    }),

    eyebrow('Pre-exercise reassurance (Partner B side)', BLUE),
    ...copyCard({
      where: 'Partner B — after sign-in, before exercises',
      when: 'Shown after Partner B completes their minimal account setup and is about to start exercises.',
      text: [
        '"Attune uses your names to personalize your results. Your answers are never shared with your partner individually — only as part of your joint results."',
      ],
      source: 'src/App.jsx:8490',
      color: BLUE,
    }),
  ];

  // ── Section 2: Partner hasn't completed yet ───────────────────────────
  const waitingSection = [
    ...secHead(2, 'Partner hasn\'t completed yet',
      'Waiting states shown when one partner has finished exercises and the other has not.', PURPLE),

    eyebrow('Dashboard — waiting banner', PURPLE),
    ...copyCard({
      where: 'Partner A\'s dashboard, below the exercise cards',
      when: 'Shown when the logged-in user has completed at least one exercise but results are not yet unlocked (partner hasn\'t finished).',
      text: [
        '"Waiting on {partnerName}? Share your Attune link so they can complete their side. Results unlock when both of you are done."',
      ],
      source: 'src/App.jsx:10391',
      color: PURPLE,
    }),

    eyebrow('Exercise 1 completion — waiting message', PURPLE),
    ...copyCard({
      where: 'Exercise 01 completion screen',
      when: 'Shown after Partner A finishes Exercise 01 but their partner hasn\'t yet.',
      text: [
        '"When {partnerName} finishes, you\'ll unlock your couple type and learn what that means for the two of you."',
      ],
      source: 'src/App.jsx:10406',
      color: PURPLE,
    }),

    eyebrow('Exercise 2 completion — waiting message', PURPLE),
    ...copyCard({
      where: 'Exercise 02 completion screen',
      when: 'Shown after Partner A finishes Exercise 02 but their partner hasn\'t finished both exercises.',
      text: [
        '"That took honesty. Most couples never have these conversations until they have to."',
        '"When {partnerName} finishes both exercises, you\'ll unlock your couple type and learn what that means for the two of you."',
      ],
      source: 'src/App.jsx:10463-10464',
      color: PURPLE,
    }),

    eyebrow('Partner B — waiting for Partner A', PURPLE),
    ...copyCard({
      where: 'Partner B completion screen',
      when: 'Shown when Partner B has finished all exercises but Partner A has not.',
      text: [
        'Eyebrow: "Your exercises are done"',
        'Title: "Waiting for {partnerAName}."',
        'Body: "Your answers have been saved. Results will unlock as soon as {partnerAName} finishes their exercises. You\'ll both see everything at the same time."',
        'Progress list: "{partnerBName}\'s exercises · Complete" + "{partnerAName}\'s exercises · Pending"',
      ],
      source: 'src/App.jsx:8656-8676',
      color: PURPLE,
    }),

    eyebrow('Partner B — both done', PURPLE),
    ...copyCard({
      where: 'Partner B completion screen (alternate state)',
      when: 'Shown when Partner B has finished all exercises AND Partner A has also finished.',
      text: [
        'Eyebrow: "Both exercises complete"',
        'Title: "Your results are ready."',
        'Body: "Both you and {partnerAName} have completed your exercises. Open Attune on {partnerAName}\'s device to explore your results together."',
        'Badge: "Results sync automatically when you connect your accounts"',
      ],
      source: 'src/App.jsx:8640-8652',
      color: PURPLE,
    }),

    eyebrow('Results unlocked banner', PURPLE),
    ...copyCard({
      where: 'Dashboard banner at the top',
      when: 'Shown when both partners have finished all exercises and results are unlocked.',
      text: [
        'Main: "Both exercises complete."',
        'Subtitle: "Your joint results are ready to view."',
        'Button: "View Results →"',
      ],
      source: 'src/App.jsx:10382-10385',
      color: PURPLE,
    }),
  ];

  // ── Section 3: Account collisions ──────────────────────────────────────
  const collisionSection = [
    ...secHead(3, 'Account collisions + wrong account warnings',
      'Copy shown when a user is about to take an action that could overwrite their partner\'s data or land on the wrong account.', GOLD),

    eyebrow('Already-linked QR card', GOLD),
    ...copyCard({
      where: 'Shown on QR card entry if the code is already associated with an account',
      when: 'When a user scans a QR card or enters a code that\'s already been used.',
      text: [
        '"This card was already linked to an account. If that\'s you, sign in below. If your partner set it up, you\'ll get a separate invite by email."',
      ],
      source: 'src/App.jsx:8241',
      color: GOLD,
    }),

    eyebrow('Partner B — wrong account warning', GOLD),
    ...copyCard({
      where: 'Partner B intro screen',
      when: 'Shown on the Partner B intro screen as a "before you start" warning, to prevent Partner A from accidentally submitting under Partner B\'s identity.',
      text: [
        'Heading: "Before you start"',
        'Body: "If this is {account.partnerName} checking your own partner\'s view — close this tab. Submitting here will overwrite {account.name}\'s results. Each partner uses their own account and their own link."',
      ],
      source: 'src/App.jsx:8578-8583',
      color: GOLD,
    }),

    eyebrow('Email collision during signup', GOLD),
    ...copyCard({
      where: 'Signup form error',
      when: 'Shown if Partner B tries to sign up with the same email Partner A used.',
      text: [
        '"This email is already linked to the other partner\'s account. Each partner needs their own email address."',
      ],
      source: 'src/App.jsx:7918',
      color: GOLD,
    }),
  ];

  // ── Section 4: Auth errors ─────────────────────────────────────────────
  const authSection = [
    ...secHead(4, 'Auth errors',
      'Login failures, signup failures, password errors.', ROSE),

    ...copyCard({
      where: 'Login form error',
      when: 'Shown when the user enters a wrong password.',
      text: '"Wrong password. Please try again."',
      source: 'src/App.jsx:8080',
      color: ROSE,
    }),

    ...copyCard({
      where: 'Login form — generic fallback',
      when: 'Shown when login fails for a reason other than wrong password (network, server, etc.).',
      text: '"Login failed. Please try again."',
      source: 'src/App.jsx:8185',
      color: ROSE,
    }),

    ...copyCard({
      where: 'Signup form — generic fallback',
      when: 'Shown when signup fails for an unexpected reason.',
      text: '"Something went wrong. Please try again."',
      source: 'src/App.jsx:1430, 8382',
      notes: 'Same message appears in multiple places. Specific Supabase auth errors surface their own messages via authErr.message from the SDK.',
      color: ROSE,
    }),

    ...copyCard({
      where: 'Signup — Supabase auth error pass-through',
      when: 'Shown when Supabase returns an error during signup (e.g. invalid email format, weak password).',
      text: '"{authErr.message}" (exact text comes from Supabase SDK, not from Attune)',
      source: 'src/App.jsx:7928',
      notes: 'Worth auditing what Supabase returns here to make sure the user-facing strings are reasonable. Supabase defaults are functional but not always warm.',
      color: ROSE,
    }),
  ];

  // ── Section 5: Save + sync states ──────────────────────────────────────
  const saveSection = [
    ...secHead(5, 'Save + sync states',
      'Budget tool sticky save bar states + workbook generation feedback.', GREEN),

    eyebrow('Budget tool — save button states', GREEN),
    ...copyCard({
      where: 'Budget tool sticky footer',
      when: 'Shown as the state indicator next to the Save changes button.',
      text: [
        'Idle, no changes: "All changes saved"',
        'User has edited something: "Unsaved changes"',
        'Save in flight: "Saving…"',
        'Save just completed: "✓ Saved" (shown for 2 seconds, then reverts to "All changes saved")',
      ],
      source: 'src/App.jsx:4907-4917',
      color: GREEN,
    }),

    eyebrow('Budget tool — unsaved changes indicator in summary bar', GREEN),
    ...copyCard({
      where: 'Sticky summary bar at the top of the budget tool',
      when: 'Shown as a small badge when the user has unsaved changes.',
      text: '"● Unsaved changes"',
      source: 'src/App.jsx:4652',
      color: GREEN,
    }),

    eyebrow('Workbook generation', GREEN),
    ...copyCard({
      where: 'Workbook generation error toast',
      when: 'Shown when the auto-generation of the personalized workbook fails.',
      text: '"Workbook generation failed. Please try again."',
      source: 'src/App.jsx:7018',
      color: GREEN,
    }),
  ];

  // ── Section 6: Privacy reassurances ────────────────────────────────────
  const privacySection = [
    ...secHead(6, 'Privacy reassurances',
      'Copy that explicitly tells users their data will not be shared inappropriately.', ORANGE),

    ...copyCard({
      where: 'Partner B signup card',
      when: 'Shown on the signup page when Partner B is entering their information.',
      text: '"Your answers are private until both of you are done. We\'ll never show your partner what you wrote until results unlock."',
      source: 'src/App.jsx:8263',
      color: ORANGE,
    }),

    ...copyCard({
      where: 'Before starting exercises',
      when: 'Shown before the user begins the exercise flow.',
      text: '"Attune uses your names to personalize your results. Your answers are never shared with your partner individually — only as part of your joint results."',
      source: 'src/App.jsx:8490',
      color: ORANGE,
    }),

    ...copyCard({
      where: 'Partner B intro screen body',
      when: 'Shown as part of the Partner B intro.',
      text: '"Exercise 01 covers how you communicate and connect. Exercise 02 maps your expectations. Both take about 15 minutes. Answer honestly — your partner won\'t see your individual answers."',
      source: 'src/App.jsx:8567',
      notes: 'Overlaps with the intro/outro doc, Section 1. Included here too because the key phrase — "your partner won\'t see your individual answers" — is a privacy reassurance.',
      color: ORANGE,
    }),

    ...copyCard({
      where: 'Expectations exercise intro follow-up (Core)',
      when: 'Shown in the follow-up paragraph before the user starts Exercise 02.',
      text: '"Answer for yourself — you\'ll see your answers alongside your partner\'s only after you\'ve both finished."',
      source: 'src/App.jsx:147',
      color: ORANGE,
    }),
  ];

  // ── Section 7: Generic fallback errors ─────────────────────────────────
  const errorSection = [
    ...secHead(7, 'Generic fallback errors',
      'Network failures and catch-all error messages.', INK),

    ...copyCard({
      where: 'Signup or general operation failures',
      when: 'Shown as a last-resort error when a specific cause is not identifiable.',
      text: '"Something went wrong. Please try again."',
      source: 'src/App.jsx:1430, 8382',
      notes: 'Generic — users get no information about what actually failed. Acceptable as a fallback; not acceptable as the only copy for common failure modes. Worth identifying which specific failures currently hit this fallback.',
      color: INK,
    }),
  ];

  // ── Section 8: Gaps + suggested drafts ─────────────────────────────────
  const gapsSection = [
    ...secHead(8, 'Gaps + suggested copy drafts',
      'Edge cases where copy is missing, with draft text proposed for each.', ORANGE),

    body('Each entry flags a gap and proposes draft text. Green-bordered blocks are proposed new copy. Orange "needs product decision" blocks flag gaps where a product choice has to come first.',
      { italics: true, color: MUTED, after: 240 }),

    ...draftCard({
      gap: 'Session expired, in-progress exercise detected',
      where: 'Banner at the top of the dashboard after the user re-authenticates',
      when: 'User\'s Supabase session expires mid-exercise, they re-login, land on the dashboard, and have non-null ex1Answers or ex2Answers that are partially complete',
      draft: [
        'Eyebrow: "Welcome back, {userName}"',
        'Body: "Your session expired while you were in Exercise 2. Your progress is saved."',
        'Button: "Continue Exercise 2 →"',
      ],
      notes: 'If the interrupted exercise is different (Ex1, Ex3, or Budget), substitute the correct name in body + button. Applies to any in-progress tool, not just Exercise 2.',
    }),

    ...draftCard({
      gap: 'Welcome-back when returning to an in-progress exercise (no session expiry)',
      where: 'Small toast at the top of the exercise when resumed, or inline banner above Q1',
      when: 'User opens an exercise where they have answers saved but have not yet submitted. Shows on the first render of that session',
      draft: [
        'Toast: "Picking up where you left off."',
        'Alt for inside exercise: "You\'re on question {n} of {total}."',
      ],
      notes: 'Short and unobtrusive. Auto-dismisses after 3 seconds. No button — the user just continues with whatever was on screen.',
    }),

    ...draftCard({
      gap: 'Partial completion — Exercise 01 done, Exercise 02 not started',
      where: 'Callout above the Exercise 02 card on the dashboard, or badge on the card itself',
      when: 'User has completed Exercise 01 (ex1Answers not null) but has not started Exercise 02 (ex2Answers is null)',
      draft: [
        'Callout: "Up next: Exercise 2. Your expectations, about 15 minutes."',
        'Alt (subtler): Just a small "Up next" badge on the Exercise 02 card',
      ],
      notes: 'Same pattern can apply to any partial-completion state (Ex02 done, Ex03 pending, etc). The copy is the next exercise\'s name and duration.',
    }),

    ...draftCard({
      gap: 'Partner invite reminder after several days of waiting',
      where: 'Dashboard banner below the exercise cards, replacing or escalating the current "Waiting on {partnerName}" message',
      when: 'Partner B has not signed up or started anything, and it has been 5+ days since invite was sent',
      draft: [
        'Message: "It\'s been a few days since you invited {partnerName}. Resend the invite?"',
        'Button: "Resend invite"',
      ],
      notes: 'Keep the existing "Waiting on {partnerName}" message for the first few days. This escalates only after 5+ days. Avoid language that implies the user has done something wrong.',
    }),

    ...draftCard({
      gap: 'Network / sync failure during save',
      where: 'Toast at bottom of the screen (existing toast system)',
      when: 'Supabase write fails (network error, auth issue, or server error) on any save operation',
      draft: [
        'When save fails: "Saved on this device. We\'ll sync when you\'re back online."',
        'When retry succeeds: "Synced."',
      ],
      notes: 'App already writes to localStorage first and wraps Supabase calls in try/catch, so no data is lost. This just surfaces what\'s happening. The "Synced." toast only shows if a prior failure was recovered; otherwise saves stay silent.',
    }),

    ...draftCard({
      gap: 'Storage warning when user is not logged in',
      where: 'Banner at the top of the exercise, visible from Q1 until they create an account',
      when: 'User is using Attune via QR or direct link but has not yet created an account (account?.id is null)',
      draft: [
        'Banner: "Your progress saves on this device. Create an account at the end to save it permanently."',
      ],
      notes: 'Non-alarming. Not a warning about losing data, just a statement of how storage works. Avoid language about private browsing unless we actually detect it.',
    }),

    ...decisionCard({
      gap: 'Retake for Exercise 01 or Exercise 02',
      decision: 'Decide whether Ex01 and Ex02 should support retakes. Currently only Exercise 03 has a Retake button. The Expectations Revisiting variant implies Ex02 retakes will eventually work — but the flow, results-comparison, and UI for retakes are not yet built.',
      notes: 'Before drafting copy, decide: (a) what changes on retake, (b) how prior results are preserved or replaced, (c) how the couple is notified.',
    }),

    ...decisionCard({
      gap: 'Change partner / unlink partner flow',
      decision: 'Decide whether users can change partners after initial setup. Today there is no UI for unlinking a partner, transferring to a new partner, or starting over. This is a major feature involving data, auth, and results migration.',
      notes: 'Edge case but it happens: breakup, mistaken signup, new relationship. Worth deciding whether this is supported before launch or deferred.',
    }),
  ];

  return new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
    sections: [{
      properties: { page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1440, bottom: 1080, left: 1440 },
      } },
      footers: {
        default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: STONE, space: 8 } },
          spacing: { before: 120, after: 0 },
          children: [
            run('Attune · Edge-case copy   ·   ', { size: 16, color: MUTED }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: INK, font: 'Arial' }),
            run(' / ', { size: 16, color: MUTED }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: MUTED, font: 'Arial' }),
          ] })] }),
      },
      children: [...cover, ...inviteSection, ...waitingSection, ...collisionSection,
                 ...authSection, ...saveSection, ...privacySection, ...errorSection,
                 ...gapsSection],
    }],
  });
}

// ── Build + save both ─────────────────────────────────────────────────────
async function buildAndSave(doc, filename) {
  const buf = await Packer.toBuffer(doc);
  const docxPath = '/tmp/' + filename + '.docx';
  writeFileSync(docxPath, buf);
  execSync('libreoffice --headless --convert-to pdf --outdir /tmp ' + docxPath, { stdio: 'pipe' });
  console.log(`✓ ${filename} — ${buf.length} bytes`);
}

await buildAndSave(buildIntroOutroDoc(), 'intro_outro_copy');
await buildAndSave(buildEdgeCaseDoc(), 'edge_case_copy');
console.log('\nDone. Both docs built in /tmp/.');
