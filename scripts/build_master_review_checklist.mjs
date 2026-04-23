// Master review checklist — everything from the pre-launch checklist with
// two checkbox columns (Carolina + Ellie). Same three sections:
//
//   1. Documents
//   2. Functionality
//   3. Account items
//
// Items marked preChecked: 'E' ship with Ellie's box already filled, for
// things confirmed in prior sessions that don't need re-checking.

import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType,
  Footer, PageNumber,
} from 'docx';

const ORANGE = 'E8673A', BLUE = '1B5FE8', GREEN = '10B981';
const INK = '0E0B07', MUTED = '8C7A68', STONE = 'E8DDD0';
const W = 9360;
const CHECK_W = 1100;                   // each of the two checkbox columns
const ITEM_W = W - (CHECK_W * 2);       // remaining for item text

const run = (t, o = {}) => new TextRun({ text: String(t ?? ''), font: 'Arial', ...o });
const sp = (n = 1) => Array.from({ length: n }, () => new Paragraph({ children: [new TextRun('')], spacing: { after: 80 } }));
const pb = () => new Paragraph({ children: [new TextRun({ break: 1 })], pageBreakBefore: true });
const noBrd = { style: BorderStyle.NONE };
const noBrds = { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd, insideHorizontal: noBrd, insideVertical: noBrd };

// Section header: big colored title + thin colored rule under + subtitle
function sectionHeader(title, subtitle, color) {
  return [
    pb(),
    new Paragraph({ spacing: { before: 120, after: 80 },
      children: [run(title, { size: 44, bold: true, color })] }),
    new Paragraph({ spacing: { after: 240 },
      children: [run(subtitle, { size: 20, italics: true, color: MUTED })] }),
    new Paragraph({ spacing: { before: 0, after: 320 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color, space: 4 } },
      children: [new TextRun('')] }),
  ];
}

function subsectionHeader(title, color) {
  return new Paragraph({ spacing: { before: 320, after: 160 },
    children: [run(title, { size: 26, bold: true, color })] });
}

// Column header showing CAROLINA / ELLIE above each group.
function columnHeader() {
  return new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: [ITEM_W, CHECK_W, CHECK_W],
    borders: {
      top: noBrd,
      bottom: { style: BorderStyle.SINGLE, size: 6, color: STONE },
      left: noBrd, right: noBrd,
      insideHorizontal: noBrd, insideVertical: noBrd,
    },
    rows: [new TableRow({ children: [
      new TableCell({
        borders: noBrds, width: { size: ITEM_W, type: WidthType.DXA },
        margins: { top: 80, bottom: 100, left: 0, right: 0 },
        children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun('')] })],
      }),
      new TableCell({
        borders: noBrds, width: { size: CHECK_W, type: WidthType.DXA },
        margins: { top: 80, bottom: 100, left: 0, right: 0 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
          children: [run('CAROLINA', { size: 12, bold: true, color: ORANGE, characterSpacing: 40 })] })],
      }),
      new TableCell({
        borders: noBrds, width: { size: CHECK_W, type: WidthType.DXA },
        margins: { top: 80, bottom: 100, left: 0, right: 0 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
          children: [run('ELLIE', { size: 12, bold: true, color: BLUE, characterSpacing: 40 })] })],
      }),
    ]})],
  });
}

// Checklist row: item + optional notes | Carolina checkbox | Ellie checkbox
// preChecked can be 'C', 'E', 'CE', or null — pre-fills those boxes.
function checklistRow({ item, notes = null, preChecked = null }) {
  const cCheck = (preChecked || '').includes('C');
  const eCheck = (preChecked || '').includes('E');

  const checkboxCell = (checked, color) => new TableCell({
    borders: noBrds,
    width: { size: CHECK_W, type: WidthType.DXA },
    margins: { top: 140, bottom: 140, left: 0, right: 0 },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
      children: [run(checked ? '\u2611' : '\u2610', { size: 30, color: checked ? color : STONE })] })],
  });

  return new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: [ITEM_W, CHECK_W, CHECK_W],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: STONE },
      bottom: noBrd, left: noBrd, right: noBrd,
      insideHorizontal: noBrd, insideVertical: noBrd,
    },
    rows: [new TableRow({ children: [
      new TableCell({
        borders: noBrds, width: { size: ITEM_W, type: WidthType.DXA },
        margins: { top: 140, bottom: 140, left: 0, right: 200 },
        children: [
          new Paragraph({ spacing: { after: notes ? 80 : 0, line: 300, lineRule: 'atLeast' },
            children: [run(item, { size: 20, color: INK })] }),
          ...(notes ? [new Paragraph({ spacing: { after: 0, line: 280, lineRule: 'atLeast' },
            children: [run(notes, { size: 16, italics: true, color: MUTED })] })] : []),
        ],
      }),
      checkboxCell(cCheck, ORANGE),
      checkboxCell(eCheck, BLUE),
    ]})],
  });
}

function checklistGroup(title, items, accentColor) {
  return [
    subsectionHeader(title, accentColor),
    columnHeader(),
    ...items.map(item => checklistRow(item)),
    // Bottom rule to close the group
    new Paragraph({ spacing: { before: 0, after: 0 },
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: STONE, space: 0 } },
      children: [new TextRun('')] }),
  ];
}

// ─── Content ──────────────────────────────────────────────────────────────

const coverPage = [
  ...sp(3),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [run('ATTUNE', { size: 24, bold: true, color: ORANGE, allCaps: true, characterSpacing: 140 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [run('Master review checklist', { size: 48, bold: true, color: INK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
    children: [run('Everything that needs to be reviewed before launch.', { size: 20, italics: true, color: MUTED })] }),

  // Column legend
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 120 },
    children: [run('How this works', { size: 14, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [run('Each item has two checkboxes — one for Carolina, one for Ellie. If an item only needs one of us to review, the other person leaves theirs blank.',
      { size: 17, italics: true, color: MUTED })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
    children: [run('A few items shipped already-checked for Ellie — these are things confirmed in earlier sessions (Stripe webhook, Resend domain, Vercel env vars).',
      { size: 15, italics: true, color: MUTED })] }),

  // Three-section summary
  new Table({
    width: { size: W, type: WidthType.DXA },
    alignment: AlignmentType.CENTER,
    columnWidths: [Math.floor(W / 3), Math.floor(W / 3), Math.floor(W / 3)],
    borders: noBrds,
    rows: [new TableRow({ children: [ORANGE, BLUE, GREEN].map((c, i) => {
      const [num, label] = [['01', 'Documents'], ['02', 'Functionality'], ['03', 'Account items']][i];
      return new TableCell({
        borders: {
          top: { style: BorderStyle.SINGLE, size: 8, color: c },
          bottom: noBrd, left: noBrd, right: noBrd,
        },
        width: { size: Math.floor(W / 3), type: WidthType.DXA },
        margins: { top: 200, bottom: 200, left: 80, right: 80 },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
            children: [run(num, { size: 14, bold: true, color: c, characterSpacing: 40 })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
            children: [run(label, { size: 20, bold: true, color: INK })] }),
        ],
      });
    }) })],
  }),
];

// ── Section 1: Documents ─────────────────────────────────────────────────
const section1 = [
  ...sectionHeader('01 · Documents', 'Copy, content flows, templates, and methodology.', ORANGE),

  ...checklistGroup('Exercise flows', [
    { item: 'Final copy review on Communication exercise — all 12 dimensions, all questions, all response options' },
    { item: 'Final copy review on Expectations exercise — all 7 domains, childhood context framing, response options',
      notes: 'Carolina already did a first pass' },
    { item: 'Exercise intro/outro copy — what does each exercise accomplish, why it matters, what to expect' },
    { item: 'Ordering/flow logic — does exercise 1 come before exercise 2? Required vs optional?' },
    { item: "Edge-case copy — partner hasn't completed yet, session timeout, resume-later states" },
  ], ORANGE),

  ...checklistGroup('Results flow', [
    { item: 'Snapshot page — final copy + layout for both partners shown side-by-side' },
    { item: 'Couple type reveal page — all 10 types, tagline quality review' },
    { item: 'Per-dimension detail pages — one per comms dimension, final copy + visualization' },
    { item: 'Per-expectation detail pages — one per unaligned domain, final copy + visualization' },
    { item: 'Working Knowledge section — "what you should know about each other" for all 10 couple types × 6 moments' },
    { item: 'Conversation Library — 5 structured situations with prompts' },
  ], ORANGE),

  ...checklistGroup('Workbooks (per couple type)', [
    { item: 'WW — The ignition · workbook copy review' },
    { item: 'XX — The collaboration · workbook copy review' },
    { item: 'YY — The safe space · workbook copy review' },
    { item: 'ZZ — The depth · workbook copy review' },
    { item: 'WX — The jumpstart · workbook copy review' },
    { item: 'WY — The orbit · workbook copy review' },
    { item: 'WZ — The opening · workbook copy review' },
    { item: 'XY — The translators · workbook copy review' },
    { item: 'XZ — The stethoscope · workbook copy review' },
    { item: 'YZ — The sanctuary · workbook copy review' },
  ], ORANGE),

  ...checklistGroup('Emails & notifications', [
    { item: 'Welcome email — first-time purchaser' },
    { item: 'Partner invite email — "Jordan wants you to do this exercise with them"' },
    { item: 'Password reset / magic link emails' },
    { item: 'Order confirmation with receipt + shipping info' },
    { item: 'Physical shipment notification — tracking + ETA' },
    { item: 'Workbook ready email — when both exercises complete' },
    { item: 'Beta survey invite — sent after both complete' },
    { item: '6-month follow-up email — longitudinal check-in' },
    { item: 'Resend domain verified (attune-relationships.com)',
      notes: 'confirmed in earlier session', preChecked: 'E' },
  ], ORANGE),

  ...checklistGroup('Marketing + legal pages', [
    { item: 'Homepage — hero, how it works 1-2-3, testimonials, FAQ' },
    { item: 'Offerings page — all 4 packages, add-ons, clear pricing' },
    { item: 'Our Purpose page — hero + methodology',
      notes: 'Hero compressed to 2 lines this session so the navy block matches other pages' },
    { item: 'Methodology page — what the research says, why we ask these questions' },
    { item: 'FAQ — all common questions answered' },
    { item: 'Terms of service + Privacy policy — reviewed by counsel if possible' },
    { item: 'Refund policy — clearly stated' },
  ], ORANGE),

  ...checklistGroup('Physical deliverables', [
    { item: 'Workbook printing — vendor chosen, test print ordered, quality approved',
      notes: 'Madovar / Packlane / Arka evaluated in sourcing spreadsheet' },
    { item: 'Box design finalized — dimensions, material, branding' },
    { item: 'QR printout cards — linking to digital results' },
    { item: 'Ring tray (Anniversary / Premium add-on)',
      notes: 'now optional per earlier session' },
    { item: 'Insert card copy — "welcome to Attune" note in physical shipments' },
  ], ORANGE),
];

// ── Section 2: Functionality ─────────────────────────────────────────────
const section2 = [
  ...sectionHeader('02 · Functionality', 'Code, integrations, and end-to-end flows that need to work.', BLUE),

  ...checklistGroup('Checkout + payments', [
    { item: 'Stripe checkout for all 4 packages × digital/physical combinations' },
    { item: 'Apple Pay / Google Pay captures shipping address correctly',
      notes: 'fixed earlier session', preChecked: 'E' },
    { item: 'Stripe webhook → Supabase orders table end-to-end test' },
    { item: 'Add-ons (LMFT $150, Relationship Reflection $40, Budget $20) price correctly at checkout' },
    { item: 'Beta codes (BETA-CORE, BETA-NEWLYWED, BETA-ANNIVERSARY, BETA-PREMIUM) work at checkout' },
    { item: 'Gift-note field works and propagates to admin + physical shipment' },
  ], BLUE),

  ...checklistGroup('Authentication + accounts', [
    { item: 'Sign-up flow works — email + password, or magic link' },
    { item: 'Password reset flow works end-to-end' },
    { item: 'Partner invite flow — one partner invites the other, both link to same couple' },
    { item: 'Session persistence — user comes back days later, still logged in' },
    { item: 'Account deletion path — user can delete their data' },
  ], BLUE),

  ...checklistGroup('Exercises + results', [
    { item: 'Communication exercise — save progress, resume later, handle browser refresh' },
    { item: 'Expectations exercise — save progress, resume later, handle browser refresh' },
    { item: 'Results generation — triggers when BOTH partners finish' },
    { item: 'Couple type calculation — verified against test payloads for all 10 types' },
    { item: 'Results page renders correctly on desktop + mobile for all 10 couple types' },
    { item: 'Dimension detail pages + expectation detail pages render correctly' },
    { item: 'QR code on physical shipment links to the right results page' },
  ], BLUE),

  ...checklistGroup('Workbook generation + fulfillment', [
    { item: 'Workbook auto-generation fires when both exercises complete' },
    { item: 'Workbook PDF renders correctly — walkthrough all 10 variants' },
    { item: 'Workbook stored in Supabase Storage with correct access policies' },
    { item: 'Digital workbook: download link appears in portal' },
    { item: 'Physical workbook: admin fulfillment page shows pending orders correctly' },
    { item: 'Physical workbook: card_status transitions (pending → packed → shipped) work' },
    { item: 'Print-and-ship partner (if external) receives order data in usable format' },
  ], BLUE),

  ...checklistGroup('Admin dashboard', [
    { item: 'Admin login works — credential is correct, session persists' },
    { item: 'Overview KPIs populated (orders, revenue, completion rate, AOV)' },
    { item: 'Orders page: filter by date, package, status works' },
    { item: 'Fulfillment page: shipping controls work (mark packed, mark shipped)' },
    { item: 'Demographics page: all charts render with real data' },
    { item: 'Types Analytics page: all 10 couple types distribution accurate',
      notes: 'dummy fallback wired up this session so the layout reads even before real data' },
    { item: 'Feedback page: beta survey responses flow through' },
    { item: 'Beta codes page: usage tracked accurately, can toggle active/inactive',
      notes: 'dummy fallback wired up this session' },
    { item: 'LMFT requests page: displays incoming requests, status tracking works',
      notes: 'dummy fallback wired up this session' },
    { item: 'CSV export works across Orders, Responses, Types' },
  ], BLUE),

  ...checklistGroup('Portal (buyer-facing)', [
    { item: 'Dashboard shows current status (exercises pending, workbook ready, etc)' },
    { item: 'Workbook tile: locked → generating → ready states all work' },
    { item: "Partner status visible — did they finish, are they stuck somewhere?" },
    { item: 'Settings: edit profile, change password, manage notifications' },
  ], BLUE),

  ...checklistGroup('Couple portrait (if shipping)', [
    { item: 'Integration with external portrait platform decided' },
    { item: 'Data handoff works — couple info → portrait generator' },
    { item: 'Portrait appears in portal when ready' },
  ], BLUE),

  ...checklistGroup('Mobile + cross-browser', [
    { item: 'Full flow tested on iOS Safari (latest)' },
    { item: 'Full flow tested on Android Chrome' },
    { item: 'Desktop: Chrome, Safari, Firefox tested' },
    { item: 'Responsive layout holds at common breakpoints (375, 768, 1024, 1440)' },
  ], BLUE),
];

// ── Section 3: Account items ─────────────────────────────────────────────
const section3 = [
  ...sectionHeader('03 · Account items',
    'Account-level actions, API keys, vendors, and providers. Most are Ellie-only — Carolina can skip her column on anything that doesn\'t need her eyes.',
    GREEN),

  ...checklistGroup('Infrastructure providers', [
    { item: 'Stripe account in live mode (not test) with correct business info' },
    { item: 'Stripe webhook endpoint pointed to production URL',
      notes: 'confirmed in earlier session', preChecked: 'E' },
    { item: 'Resend email provider in production, domain verified',
      notes: 'confirmed in earlier session', preChecked: 'E' },
    { item: 'Supabase project on the appropriate plan for expected volume' },
    { item: 'Supabase backups scheduled and tested for restore' },
    { item: 'Vercel env vars all set for production',
      notes: 'confirmed in earlier session', preChecked: 'E' },
    { item: 'Domain DNS pointing correctly (attune-relationships.com)' },
    { item: 'SSL certificate valid and auto-renewing' },
  ], GREEN),

  ...checklistGroup('Physical fulfillment', [
    { item: 'Print vendor selected — contract signed, pricing locked',
      notes: 'Madovar / Packlane / Arka evaluated in sourcing spreadsheet' },
    { item: 'First print run ordered and quality-checked' },
    { item: 'Shipping provider integration (ShipStation, EasyPost, or direct)' },
    { item: 'Packaging materials ordered (boxes, inserts, ring trays if applicable)' },
  ], GREEN),

  ...checklistGroup('Legal / business', [
    { item: 'LLC or business entity formed, EIN obtained' },
    { item: 'Business bank account set up and linked to Stripe' },
    { item: 'Sales tax registration (if applicable in home state)' },
    { item: 'Terms of service + Privacy policy reviewed by counsel' },
    { item: 'General liability insurance if selling physical goods' },
  ], GREEN),

  ...checklistGroup('Marketing + launch', [
    { item: 'Social handles claimed (Instagram, TikTok, Threads)' },
    { item: 'Launch-week content plan ready (posts, stories, reels)' },
    { item: 'Press list / PR contacts identified if pursuing coverage' },
    { item: 'Referral incentive decided — how do early couples refer friends' },
    { item: 'Google Analytics or Plausible installed for tracking' },
  ], GREEN),

  ...checklistGroup('Post-launch monitoring', [
    { item: 'Error tracking (Sentry or similar) wired into production' },
    { item: 'Uptime monitoring set up (BetterUptime, UptimeRobot)' },
    { item: 'On-call policy — who responds if something breaks on a Sunday night' },
    { item: 'Customer support email monitored with a reasonable SLA' },
    { item: 'Refund policy process tested — Stripe refund flow end-to-end' },
  ], GREEN),
];

// ─── Assemble document ─────────────────────────────────────────────────────

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
            run('Attune · Master Review Checklist   ·   ', { size: 14, color: MUTED }),
            new TextRun({ children: [PageNumber.CURRENT], size: 14, color: INK, font: 'Arial' }),
            run(' / ', { size: 14, color: MUTED }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: MUTED, font: 'Arial' }),
          ] })],
      }),
    },
    children: [...coverPage, ...section1, ...section2, ...section3],
  }],
});

const buf = await Packer.toBuffer(doc);
const outPath = '/tmp/attune_master_review_checklist.docx';
writeFileSync(outPath, buf);
execSync('libreoffice --headless --convert-to pdf --outdir /tmp ' + outPath, { stdio: 'pipe' });
console.log(`✓ Master review checklist: ${outPath} (${buf.length} bytes)`);
