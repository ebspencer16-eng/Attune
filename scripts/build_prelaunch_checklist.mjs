// Master pre-launch checklist — a single document that covers everything
// that needs to happen before Attune goes live. Three sections:
//
//   1. Documents — copy, flows, templates, methodology
//   2. Functionality — code, integrations, admin, end-to-end
//   3. Account / action items — API keys, vendors, providers
//
// Each item has: status (empty checkbox), short description, owner, notes.

import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType,
  Footer, PageNumber, HeightRule,
} from 'docx';

const ORANGE = 'E8673A', BLUE = '1B5FE8', GREEN = '10B981', PURPLE = '9B5DE5';
const INK = '0E0B07', MUTED = '8C7A68', STONE = 'E8DDD0', NAVY = '2D2250';
const W = 9360;

const run = (t, o = {}) => new TextRun({ text: String(t ?? ''), font: 'Arial', ...o });
const para = (t, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 140 }, alignment: o.align,
  indent: o.indent,
  children: [run(t, { size: o.size ?? 22, color: o.color ?? INK, bold: o.bold, italics: o.italics })],
});
const sp = (n = 1) => Array.from({ length: n }, () => new Paragraph({ children: [new TextRun('')], spacing: { after: 80 } }));
const pb = () => new Paragraph({ children: [new TextRun({ break: 1 })], pageBreakBefore: true });
const noBrd = { style: BorderStyle.NONE };
const noBrds = { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd, insideHorizontal: noBrd, insideVertical: noBrd };

// Section header: big colored title + thin colored rule under + optional subtitle
function sectionHeader(title, subtitle, color) {
  return [
    pb(),
    new Paragraph({ spacing: { before: 120, after: 80 },
      children: [run(title, { size: 44, bold: true, color })] }),
    ...(subtitle ? [new Paragraph({ spacing: { after: 240 },
      children: [run(subtitle, { size: 20, italics: true, color: MUTED })] })] : []),
    new Paragraph({ spacing: { before: 0, after: 320 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color, space: 4 } },
      children: [new TextRun('')] }),
  ];
}

// Subsection header: medium size, no rule
function subsectionHeader(title, color) {
  return new Paragraph({ spacing: { before: 320, after: 200 },
    children: [run(title, { size: 26, bold: true, color })] });
}

// Single checklist row: empty checkbox + item text + optional owner pill + optional notes
function checklistRow({ item, owner = null, notes = null, accentColor = STONE }) {
  const pillBg = owner === 'Ellie' ? 'FFF4EC' : (owner ? 'F0F8FF' : null);
  const pillFg = owner === 'Ellie' ? 'B45309' : (owner ? '1E40AF' : MUTED);

  const cells = [
    // Checkbox cell (fixed narrow width)
    new TableCell({
      borders: noBrds,
      width: { size: 500, type: WidthType.DXA },
      margins: { top: 120, bottom: 120, left: 0, right: 0 },
      verticalAlign: 'top',
      children: [new Paragraph({ spacing: { after: 0 },
        children: [run('\u2610', { size: 32, color: accentColor })] })],
    }),
    // Main content cell (item + optional notes)
    new TableCell({
      borders: noBrds,
      width: { size: W - 500 - (owner ? 1400 : 0), type: WidthType.DXA },
      margins: { top: 120, bottom: 120, left: 80, right: 120 },
      verticalAlign: 'top',
      children: [
        new Paragraph({ spacing: { after: notes ? 80 : 0, line: 300, lineRule: 'atLeast' },
          children: [run(item, { size: 21, color: INK })] }),
        ...(notes ? [new Paragraph({ spacing: { after: 0, line: 280, lineRule: 'atLeast' },
          children: [run(notes, { size: 17, italics: true, color: MUTED })] })] : []),
      ],
    }),
  ];

  // Owner pill cell (if owner)
  if (owner) {
    cells.push(new TableCell({
      borders: noBrds,
      width: { size: 1400, type: WidthType.DXA },
      margins: { top: 120, bottom: 120, left: 60, right: 0 },
      verticalAlign: 'top',
      children: [new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 0 },
        children: [new TextRun({
          text: ` ${owner.toUpperCase()} `, font: 'Arial',
          size: 14, bold: true, color: pillFg,
          shading: { fill: pillBg, type: ShadingType.CLEAR },
        })] })],
    }));
  }

  return new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: owner ? [500, W - 500 - 1400, 1400] : [500, W - 500],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: STONE },
      bottom: noBrd, left: noBrd, right: noBrd,
      insideHorizontal: noBrd, insideVertical: noBrd,
    },
    rows: [new TableRow({ children: cells })],
  });
}

// A group of checklist rows under a sub-heading. Returns an array.
function checklistGroup(title, items, accentColor) {
  return [
    subsectionHeader(title, accentColor),
    ...items.map(item => checklistRow({ ...item, accentColor })),
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
    children: [run('Pre-launch checklist', { size: 52, bold: true, color: INK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
    children: [run('Everything that needs to happen before the public launch.', { size: 20, italics: true, color: MUTED })] }),

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
  ...sp(2),

  // How to use
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400, after: 120 },
    children: [run('How to use this', { size: 16, bold: true, color: ORANGE, allCaps: true, characterSpacing: 80 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 140 },
    children: [run('Check things off as you finish them. Items tagged ELLIE require Ellie specifically — account-level actions, vendor selections, API keys, provider decisions. Everything else can be done by either of us together.', { size: 17, italics: true, color: MUTED })] }),
];

// ── Section 1: Documents ─────────────────────────────────────────────────
const section1 = [
  ...sectionHeader('01 · Documents', 'Copy, content flows, templates, and methodology.', ORANGE),

  ...checklistGroup('Exercise flows', [
    { item: 'Final copy review on Communication exercise — all 12 dimensions, all questions, all response options' },
    { item: 'Final copy review on Expectations exercise — all 7 domains, childhood context framing, response options', notes: 'Carolina already did a first pass' },
    { item: 'Exercise intro/outro copy — what does each exercise accomplish, why it matters, what to expect' },
    { item: 'Ordering/flow logic — does exercise 1 come before exercise 2? Required vs optional?' },
    { item: 'Edge-case copy — partner hasn\'t completed yet, session timeout, resume-later states' },
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
    { item: 'Resend domain verified (attune-relationships.com)', notes: 'confirmed in earlier session' },
  ], ORANGE),

  ...checklistGroup('Marketing + legal pages', [
    { item: 'Homepage — hero, how it works 1-2-3, testimonials, FAQ' },
    { item: 'Offerings page — all 4 packages, add-ons, clear pricing' },
    { item: 'Our Purpose page — hero + methodology' },
    { item: 'Methodology page — what the research says, why we ask these questions' },
    { item: 'FAQ — all common questions answered' },
    { item: 'Terms of service + Privacy policy — reviewed by counsel if possible' },
    { item: 'Refund policy — clearly stated' },
  ], ORANGE),

  ...checklistGroup('Physical deliverables', [
    { item: 'Workbook printing — vendor chosen, test print ordered, quality approved', owner: 'Ellie', notes: 'Madovar / Packlane / Arka evaluated' },
    { item: 'Box design finalized — dimensions, material, branding' },
    { item: 'QR printout cards — linking to digital results' },
    { item: 'Ring tray (Anniversary / Premium add-on)', notes: 'now optional per earlier session' },
    { item: 'Insert card copy — "welcome to Attune" note in physical shipments' },
  ], ORANGE),
];

// ── Section 2: Functionality ─────────────────────────────────────────────
const section2 = [
  ...sectionHeader('02 · Functionality', 'Code, integrations, and end-to-end flows that need to work.', BLUE),

  ...checklistGroup('Checkout + payments', [
    { item: 'Stripe checkout for all 4 packages × digital/physical combinations' },
    { item: 'Apple Pay / Google Pay captures shipping address correctly', notes: 'fixed earlier session' },
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
    { item: 'Types Analytics page: all 10 couple types distribution accurate' },
    { item: 'Feedback page: beta survey responses flow through' },
    { item: 'Beta codes page: usage tracked accurately, can toggle active/inactive' },
    { item: 'LMFT requests page: displays incoming requests, status tracking works' },
    { item: 'CSV export works across Orders, Responses, Types' },
  ], BLUE),

  ...checklistGroup('Portal (buyer-facing)', [
    { item: 'Dashboard shows current status (exercises pending, workbook ready, etc)' },
    { item: 'Workbook tile: locked → generating → ready states all work' },
    { item: 'Partner status visible — did they finish, are they stuck somewhere?' },
    { item: 'Settings: edit profile, change password, manage notifications' },
  ], BLUE),

  ...checklistGroup('Couple portrait (if shipping)', [
    { item: 'Integration with external portrait platform decided', owner: 'Ellie' },
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

// ── Section 3: Account / action items ───────────────────────────────────
const section3 = [
  ...sectionHeader('03 · Account items', 'Account-level actions, API keys, vendors, and providers — anything Ellie specifically owns.', GREEN),

  ...checklistGroup('Infrastructure providers', [
    { item: 'Stripe account in live mode (not test) with correct business info', owner: 'Ellie' },
    { item: 'Stripe webhook endpoint pointed to production URL', owner: 'Ellie', notes: 'confirmed in earlier session' },
    { item: 'Resend email provider in production, domain verified', owner: 'Ellie', notes: 'confirmed in earlier session' },
    { item: 'Supabase project on the appropriate plan for expected volume', owner: 'Ellie' },
    { item: 'Supabase backups scheduled and tested for restore', owner: 'Ellie' },
    { item: 'Vercel env vars all set for production', owner: 'Ellie', notes: 'confirmed in earlier session' },
    { item: 'Domain DNS pointing correctly (attune-relationships.com)', owner: 'Ellie' },
    { item: 'SSL certificate valid and auto-renewing', owner: 'Ellie' },
  ], GREEN),

  ...checklistGroup('Physical fulfillment', [
    { item: 'Print vendor selected — contract signed, pricing locked', owner: 'Ellie', notes: 'Madovar / Packlane / Arka evaluated in sourcing spreadsheet' },
    { item: 'First print run ordered and quality-checked', owner: 'Ellie' },
    { item: 'Shipping provider integration (ShipStation, EasyPost, or direct)', owner: 'Ellie' },
    { item: 'Packaging materials ordered (boxes, inserts, ring trays if applicable)', owner: 'Ellie' },
  ], GREEN),

  ...checklistGroup('Legal / business', [
    { item: 'LLC or business entity formed, EIN obtained', owner: 'Ellie' },
    { item: 'Business bank account set up and linked to Stripe', owner: 'Ellie' },
    { item: 'Sales tax registration (if applicable in home state)', owner: 'Ellie' },
    { item: 'Terms of service + Privacy policy reviewed by counsel', owner: 'Ellie' },
    { item: 'General liability insurance if selling physical goods', owner: 'Ellie' },
  ], GREEN),

  ...checklistGroup('Marketing + launch', [
    { item: 'Social handles claimed (Instagram, TikTok, Threads)', owner: 'Ellie' },
    { item: 'Launch-week content plan ready (posts, stories, reels)', owner: 'Ellie' },
    { item: 'Press list / PR contacts identified if pursuing coverage', owner: 'Ellie' },
    { item: 'Referral incentive decided — how do early couples refer friends', owner: 'Ellie' },
    { item: 'Google Analytics or Plausible installed for tracking', owner: 'Ellie' },
  ], GREEN),

  ...checklistGroup('Post-launch monitoring', [
    { item: 'Error tracking (Sentry or similar) wired into production', owner: 'Ellie' },
    { item: 'Uptime monitoring set up (BetterUptime, UptimeRobot)', owner: 'Ellie' },
    { item: 'On-call policy — who responds if something breaks on a Sunday night', owner: 'Ellie' },
    { item: 'Customer support email monitored with a reasonable SLA', owner: 'Ellie' },
    { item: 'Refund policy process tested — Stripe refund flow end-to-end', owner: 'Ellie' },
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
            run('Attune · Pre-launch Checklist   ·   ', { size: 14, color: MUTED }),
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
const outPath = '/tmp/attune_prelaunch_checklist.docx';
writeFileSync(outPath, buf);
execSync('libreoffice --headless --convert-to pdf --outdir /tmp ' + outPath, { stdio: 'pipe' });
console.log(`✓ Pre-launch checklist: ${outPath} (${buf.length} bytes)`);
