// Results specific content review — content unique to the post-unlock results
// experience (UnifiedResults). Same format as the specific content review.
// Per the agreed scope (option C): this catalogs ONLY results-unique content;
// shared type-specific content points to the workbook specific content review.
// Pulled live from src/App.jsx where the content is cleanly bounded. Dynamic,
// answer-generated content is described with its framing copy and a source note.

import { readFileSync } from 'fs';
import {
  ORANGE, PURPLE, GREEN, BLUE, INK, MUTED, RED,
  bigSection, midSection, smallSection, prose, caption, groupLabel, tag,
  buildCover, renderDoc, matchBrace, INDENT_PROSE_UNDER_SMALL,
} from './_review_format.mjs';

const src = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf-8');

// Render pronoun / name template vars to readable placeholders.
const ph = (s) => String(s ?? '')
  .replace(/\$\{name\}/g, '[partner]')
  .replace(/\$\{Sub\}/g, '[They]').replace(/\$\{sub\}/g, '[they]')
  .replace(/\$\{pos\}/g, '[their]').replace(/\$\{U\}/g, '[Partner A]').replace(/\$\{P\}/g, '[Partner B]')
  .replace(/\$\{[^}]*\}/g, '[…]');

// ── Individual profiles (blurbFor): 4 type codes × 4 variants ────────────────
function backticks(block) {
  const out = []; let i = 0;
  while (i < block.length) {
    if (block[i] === '`') {
      let s = ''; i++;
      while (i < block.length && block[i] !== '`') { if (block[i] === '\\') { s += block[i + 1]; i += 2; continue; } s += block[i++]; }
      out.push(s); i++;
    } else i++;
  }
  return out;
}
const blurbsStart = src.indexOf('const blurbs = {', src.indexOf('const blurbFor ='));
const blurbsBlock = src.slice(blurbsStart, matchBrace(src, src.indexOf('{', blurbsStart)) + 1);
const allBlurbs = backticks(blurbsBlock); // 16 in order: W×4, X×4, Y×4, Z×4
const PROFILE_TYPES = [
  ['W', 'The Initiator', ['strong engage', 'near center (engage)', 'near center (open)', 'balanced']],
  ['X', 'The Anchor', ['strong engage', 'near center (engage)', 'near center (open)', 'balanced']],
  ['Y', 'The Feeler', ['strong withdraw', 'near center (engage)', 'near center (open)', 'balanced']],
  ['Z', 'The Protector', ['strong withdraw', 'near center (engage)', 'near center (open)', 'balanced']],
];

// ── Communication action plan: per-dimension protocols (title + this week) ────
const PROTO_RE = /protocols\.push\(\{\s*title:\s*"([^"]*)",\s*body:\s*byDim\.(\w+)\.adviceText,\s*thisWeek:\s*"([^"]*)"/g;
const protocols = [...src.matchAll(PROTO_RE)].map(m => ({ title: m[1], dim: m[2], thisWeek: m[3] }));

// ── Couple Map axis copy (live regex) ────────────────────────────────────────
const axisGrab = (q) => (src.match(new RegExp('"(' + q + '[^"]*)"'))?.[1]) || '';
const AXIS = {
  engage: { q: axisGrab('How you respond when something is hard'), a: axisGrab('Engage: moves toward'), b: axisGrab('Withdraw: needs space') },
  open: { q: axisGrab('How freely you express'), a: axisGrab('Open: partner usually knows'), b: axisGrab('Guarded: processes internally') },
};

console.log(`profiles=${allBlurbs.length}, protocols=${protocols.length}, axis=${!!AXIS.engage.q}`);

// ── cover ─────────────────────────────────────────────────────────────────────
const cover = buildCover({
  title: 'Results specific content review',
  subtitle: 'Content unique to the post-unlock results experience, numbered for reference.',
  howToUse: 'This catalogs only content that lives in the results experience and nowhere else. Shared type-specific content (couple type names, gap blurbs, dimension type blurbs) is in the workbook specific content review; the results content review points to it by number. Live copy uses real names and pronouns; brackets are placeholders. Some sections are generated from each couple\u2019s answers; those note their framing copy and source.',
  indexRows: [
    ['1.', 'Highlights', 'card framing + CTA (cards generated)'],
    ['2.', 'Full Summary', 'three joint-overview cards'],
    ['3.', 'Couple Map', 'two axis descriptions + placement'],
    ['4.', 'Individual profiles', `${allBlurbs.length} blurbs (4 types × 4 placements)`],
    ['5.', 'Communication action plan', `${protocols.length} protocols`],
    ['6.', 'Expectations results', 'overview + action plan framing'],
    ['7.', 'Relationship Reflection results', 'see reflection results review'],
    ['8.', 'What Comes Next', 'closing CTAs'],
  ],
});

// ── SECTION 1 — Highlights ──────────────────────────────────────────────────
const section1 = [
  ...bigSection(1, 'Highlights',
    'The swipe-through shown first on entry, before the full results. Cards are generated from both exercises\u2019 answers. The framing is fixed; the card bodies are not.', ORANGE),
  midSection('1.1', 'Framing', ORANGE),
  prose('A set of swipeable cards drawn from the Communication and Expectations results (and Intimacy when owned). Each card is downloadable.'),
  smallSection('1.1.1', 'Click-through CTA', ORANGE, { before: 160, inline: 'View Full Results', italicInline: true }),
  caption('Card bodies are generated per couple. Source: ResultsHighlights in src/App.jsx.'),
];

// ── SECTION 2 — Full Summary (Joint Overview) ───────────────────────────────
const section2 = [
  ...bigSection(2, 'Full Summary',
    'The first section after the highlights click-through. Three cards, each linking into its section.', PURPLE),
  midSection('2.1', 'Cards', PURPLE, { extras: 'Communication · Expectations · Reflection (if owned)' }),
  prose('Each card gives a short read on that exercise and a CTA into the section. The Reflection card shows only for Anniversary or Premium.'),
  caption('Card copy is generated from the couple\u2019s results. Source: JointOverview in src/App.jsx.'),
];

// ── SECTION 3 — Couple Map ──────────────────────────────────────────────────
const section3 = [
  ...bigSection(3, 'Couple Map',
    'The 2×2 grid with both partners plotted. Two axes, each with a question and a label for each end. Per-partner placement copy is generated.', GREEN),
  midSection('3.1', 'Engage / Withdraw axis', GREEN),
  prose(AXIS.engage.q, { italics: true }),
  prose(`Engage end: ${AXIS.engage.a.replace(/^Engage:\s*/, '')}`),
  prose(`Withdraw end: ${AXIS.engage.b.replace(/^Withdraw:\s*/, '')}`),
  midSection('3.2', 'Open / Guarded axis', GREEN),
  prose(AXIS.open.q, { italics: true }),
  prose(`Open end: ${AXIS.open.a.replace(/^Open:\s*/, '')}`),
  prose(`Guarded end: ${AXIS.open.b.replace(/^Guarded:\s*/, '')}`),
  midSection('3.3', 'Placement callout', GREEN),
  prose('A callout speaks to where each partner sits on the map. Generated per couple from each partner\u2019s coordinates.'),
];

// ── SECTION 4 — Individual profiles ─────────────────────────────────────────
const section4 = [
  ...bigSection(4, 'Individual profiles',
    'On the couple map section. One profile per partner. The blurb varies by the partner\u2019s type and how far toward an end they sit. Four placements per type.', BLUE),
  ...PROFILE_TYPES.flatMap(([code, name, variants], ti) => {
    const out = [midSection(`4.${ti + 1}`, `${code}, ${name}`, BLUE)];
    variants.forEach((v, vi) => {
      const idx = ti * 4 + vi;
      out.push(smallSection(`4.${ti + 1}.${vi + 1}`, v, BLUE, { before: 180 }));
      out.push(prose(ph(allBlurbs[idx] || '(not found)'), { indent: INDENT_PROSE_UNDER_SMALL }));
    });
    return out;
  }),
];

// ── SECTION 5 — Communication action plan ───────────────────────────────────
const DIMN = { love: 'Love', expression: 'Expression', energy: 'Energy', bids: 'Bids', needs: 'Needs', stress: 'Stress', conflict: 'Conflict', listening: 'Listening', repair: 'Repair', feedback: 'Feedback' };
const section5 = [
  ...bigSection(5, 'Communication action plan',
    'On the Communication section. One protocol appears for each dimension flagged as a gap or a note. Title and this-week step are fixed; the body pulls that dimension\u2019s advice text.', 'C2410C'),
  ...protocols.flatMap((p, i) => [
    midSection(`5.${i + 1}`, p.title, 'C2410C', { extras: DIMN[p.dim] || p.dim }),
    smallSection(`5.${i + 1}.1`, 'Try this week', 'C2410C', { before: 140 }),
    prose(p.thisWeek, { indent: INDENT_PROSE_UNDER_SMALL }),
  ]),
];

// ── SECTION 6 — Expectations results ────────────────────────────────────────
const section6 = [
  ...bigSection(6, 'Expectations results',
    'The Expectations section framing. The per-category content and conversation starters live in the expectations content; this catalogs the results-side framing and action plan.', 'F59E0B'),
  midSection('6.1', 'Section pages', 'F59E0B', { extras: 'Overview · Common Ground · Conversations Worth Having · The Life You\u2019re Building · Action Plan' }),
  prose('Overview shows an alignment read across mapped expectations. Common Ground surfaces where the two agree. Conversations Worth Having surfaces where they differ. Action Plan lists top misalignments with couple-type context.'),
  midSection('6.2', 'Fully-aligned state', 'F59E0B'),
  prose('When the two align on every mapped expectation, the overview reads: “[Partner A] and [Partner B] are aligned on every expectation mapped.”', { italics: true }),
  caption('Per-category copy and starters: see the expectations content. Couple-type action-plan context is generated.'),
];

// ── SECTION 7 — Relationship Reflection results ─────────────────────────────
const section7 = [
  ...bigSection(7, 'Relationship Reflection results',
    'Shown for Anniversary and Premium. Overview, Insights, Side by Side, and Action Plan. The insight prompts and triggers are cataloged in the reflection results review.', '9B5DE5'),
  midSection('7.1', 'Section pages', '9B5DE5', { extras: 'Overview · Insights · Side by Side · Action Plan' }),
  prose('Overview shows the feel score, an appreciation reveal, and strength/explore counts. Insights shows the prompt cards. Side by Side shows both answers with synthesis tags (resonance, complement, worth discussing). Action Plan lists the explore items.'),
  caption('Full prompt copy and what triggers each: see the Relationship Reflection results review, Sections 2 and 3.'),
];

// ── SECTION 8 — What Comes Next ──────────────────────────────────────────────
const section8 = [
  ...bigSection(8, 'What Comes Next',
    'The closing section. Pulls the action plans together and points to next steps.', INK),
  midSection('8.1', 'Framing', INK),
  prose('Heading: “What comes next.” Subhead: “What to do with all of this.” It surfaces the action plans, an upgrade prompt where applicable, and links to share, download the workbook, and book an LMFT session.'),
  caption('Links shown depend on what the couple owns. Source: the what-comes-next section in src/App.jsx.'),
];

await renderDoc({
  footerLabel: 'Attune · Results specific content review',
  outPath: '/mnt/user-data/outputs/attune_results_specific_content_review.docx',
  children: [...cover, ...section1, ...section2, ...section3, ...section4, ...section5, ...section6, ...section7, ...section8],
});
