// Results specific content review — content unique to the post-unlock results
// experience (UnifiedResults). Same format as the specific content review.
//
// Scope (settled prior): post-unlock only, option C. This catalogs ONLY content
// unique to results. Shared type-specific content (couple type names, gap blurbs,
// dimension type blurbs) lives in the workbook specific content review; the
// results content review points to it.
//
// Live extractions: individual profiles, communication action plan, couple-map
// axes (pulled from src/App.jsx). Fixed framing copy across the other sections is
// cataloged verbatim. Dynamic slots (couple type, dimension blurbs, their own
// answers) are marked in brackets and point to their source.

import { readFileSync } from 'fs';
import {
  ORANGE, PURPLE, GREEN, BLUE, INK, MUTED, RED,
  bigSection, midSection, smallSection, prose, caption, groupLabel, tag,
  buildCover, renderDoc, matchBrace, INDENT_PROSE_UNDER_SMALL, INDENT_SMALL,
} from './_review_format.mjs';

const src = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf-8');
const ph = (s) => String(s ?? '')
  .replace(/\$\{name\}/g, '[partner]').replace(/\$\{Sub\}/g, '[They]').replace(/\$\{sub\}/g, '[they]')
  .replace(/\$\{pos\}/g, '[their]').replace(/\$\{[^}]*\}/g, '[…]');

// ── live: individual profiles (blurbFor) ─────────────────────────────────────
function backticks(block) {
  const out = []; let i = 0;
  while (i < block.length) {
    if (block[i] === '`') { let s = ''; i++; while (i < block.length && block[i] !== '`') { if (block[i] === '\\') { s += block[i + 1]; i += 2; continue; } s += block[i++]; } out.push(s); i++; }
    else i++;
  }
  return out;
}
const blurbsStart = src.indexOf('const blurbs = {', src.indexOf('const blurbFor ='));
const allBlurbs = backticks(src.slice(blurbsStart, matchBrace(src, src.indexOf('{', blurbsStart)) + 1));
const PROFILE_TYPES = [
  ['W', 'The Initiator'], ['X', 'The Anchor'], ['Y', 'The Feeler'], ['Z', 'The Protector'],
];
const PLACEMENTS = ['toward an end', 'near center (engage)', 'near center (open)', 'balanced'];

// ── live: communication action plan protocols ────────────────────────────────
const PROTO_RE = /protocols\.push\(\{\s*title:\s*"([^"]*)",\s*body:\s*byDim\.(\w+)\.adviceText,\s*thisWeek:\s*"([^"]*)"/g;
const protocols = [...src.matchAll(PROTO_RE)].map(m => ({ title: m[1], dim: m[2], thisWeek: m[3] }));
const DIMN = { love: 'Love', expression: 'Expression', energy: 'Energy', bids: 'Bids', needs: 'Needs', stress: 'Stress', conflict: 'Conflict', listening: 'Listening', repair: 'Repair', feedback: 'Feedback' };

// ── live: couple-map axes ────────────────────────────────────────────────────
const grab = (q) => (src.match(new RegExp('"(' + q + '[^"]*)"'))?.[1]) || '';
const AXIS = {
  eq: grab('How you respond when something is hard'), ea: grab('Engage: moves toward'), eb: grab('Withdraw: needs space'),
  oq: grab('How freely you express'), oa: grab('Open: partner usually knows'), ob: grab('Guarded: processes internally'),
};
console.log(`profiles=${allBlurbs.length}, protocols=${protocols.length}, axes=${!!AXIS.eq}`);

// ── live: couple-type near-axis prose (NEAR_AXIS_PROSE) ──────────────────────
// The object is pure data (template-literal strings, no interpolation), so we
// slice it from source and eval it. Every token in the strings is a balanced
// {...} pair, so matchBrace lands on the correct closing brace.
const _napStart = src.indexOf('const NEAR_AXIS_PROSE = {');
const _napObj = src.indexOf('{', _napStart);
const NEAR_AXIS_PROSE = eval('(' + src.slice(_napObj, matchBrace(src, _napObj) + 1) + ')');
const NAMES = {};
for (const m of src.matchAll(/id:\s*"([WXYZ]{2})",[\s\S]{0,160}?name:\s*"([^"]+)"/g)) NAMES[m[1]] = m[2];
// Render couple-type tokens readably. Suffix forms first (bare {EXP} won't match
// {EXP_sub} because it needs the brace right after, but order it safely anyway).
const tok = (s) => String(s ?? '')
  .replace(/\{(?:EXP|GRD|RCH|WDR|U|P)_sub\}/g, '[they]')
  .replace(/\{(?:EXP|GRD|RCH|WDR|U|P)_obj\}/g, '[them]')
  .replace(/\{(?:EXP|GRD|RCH|WDR|U|P)_pos\}/g, '[their]')
  .replace(/\{(?:EXP|GRD|RCH|WDR|U|P)_isC\}/g, '[they are]')
  .replace(/\{EXP\}/g, '[expressive partner]').replace(/\{GRD\}/g, '[guarded partner]')
  .replace(/\{RCH\}/g, '[reaching partner]').replace(/\{WDR\}/g, '[withdrawing partner]')
  .replace(/\{U\}/g, '[you]').replace(/\{P\}/g, '[partner]')
  .replace(/\{[^}]*\}/g, '[\u2026]');
console.log(`near-axis pairings=${Object.keys(NEAR_AXIS_PROSE).length}, names=${Object.keys(NAMES).length}`);

const lines = (arr) => arr.map(t => prose(t, { indent: INDENT_PROSE_UNDER_SMALL }));

// ════════════════════════════════════════════════════════════════════════════
const cover = buildCover({
  title: 'Results specific content review',
  subtitle: 'Every piece of content unique to the post-unlock results experience, numbered for reference.',
  howToUse: 'This catalogs only content that lives in the results experience and nowhere else. Shared type-specific content is in the workbook specific content review. Live copy uses real names and pronouns; brackets are placeholders or dynamic slots, with their source noted. Where a section is generated from each couple\u2019s answers, the fixed framing copy is cataloged and the dynamic slot is marked.',
  indexRows: [
    ['1.', 'Highlights', 'eight cards'],
    ['2.', 'Full Summary', 'cards + surfaced prompts'],
    ['3.', 'Couple Map', 'two axes + placement + share + how you see each other'],
    ['4.', 'Individual profiles', `${allBlurbs.length} blurbs`],
    ['5.', 'Communication action plan', `${protocols.length} protocols`],
    ['6.', 'Expectations results', 'overview + 5 categories + action plan'],
    ['7.', 'Relationship Reflection results', 'overview + side by side'],
    ['8.', 'What Comes Next', 'closing CTAs'],
    ['9.', 'Couple type near-axis prose', '10 pairings'],
  ],
});

// ── SECTION 1 — Highlights (8 cards) ─────────────────────────────────────────
const section1 = [
  ...bigSection(1, 'Highlights',
    'The swipe-through shown first on entry. Eight cards, drawn from both exercises (Reflection card only for Anniversary or Premium). The framing on each card is fixed; the bracketed values are filled from the couple\u2019s results.', ORANGE),

  midSection('1.1', 'Card 1: Opener', ORANGE),
  ...lines(['Eyebrow: "Your results"', '"Built from your independent answers. This is what you look like together."', 'Footer: "Tap to begin"']),

  midSection('1.2', 'Card 2: Couple type', ORANGE),
  ...lines(['Eyebrow: "Your couple type is"', 'Famous-duos label: "You\u2019re in good company"', '[Type name], [tagline], [famous duos], [description] all pull from the couple type. See workbook specific 1.x.']),

  midSection('1.3', 'Card 3: Strength', ORANGE, { extras: 'where they align most' }),
  ...lines(['Badge: "Naturally in tune"', 'Kicker: "Where you don\u2019t have to work for it"', 'Sub-card label: "For two who think alike"', '[Dimension label] + [strength text] + [advice text] pull from the top-aligned dimension.']),
  groupLabel('Fallback copy', ORANGE, 'shown if the dimension has no strength/advice text'),
  ...lines(['"You share a similar orientation here. It shows up as natural ease between you."', '"This alignment removes an entire category of slow-burn friction. Make the most of it, because this kind of alignment is rarer than it looks."']),

  midSection('1.4', 'Card 4: Growth spot', ORANGE, { extras: 'where they diverge most' }),
  ...lines(['Badge: "Worth understanding"', 'Kicker: "Where you diverge most"', '[Dimension label] + a bar showing both partners. Closing line: "Both perspectives are worth understanding."']),

  midSection('1.5', 'Card 5: By the numbers', ORANGE, { extras: 'stat cards, vary by scores' }),
  ...lines(['"Shared perception of where you are right now."', '"Day-to-day connection"', '"What you admire in each other"']),
  groupLabel('Alignment-state lines', ORANGE, 'which one shows depends on the gap'),
  ...lines([
    '"Solid common ground. The places you differ are exactly worth naming now."',
    '"That\u2019s a strong foundation. The gaps you do have are conversations, not problems."',
    '"This shows up in recurring moments. One of you naturally leans one way, the other another."',
    '"More to discuss, which is the whole point. Most couples don\u2019t surface these topics until they\u2019re harder to talk about."',
  ]),

  midSection('1.6', 'Card 6: Relationship reflection', ORANGE, { extras: 'Anniversary / Premium only' }),
  prose('Conditional card. Surfaces a reflection highlight (feel score / appreciation). Shown only when the Reflection exercise is owned and done.', { indent: INDENT_PROSE_UNDER_SMALL }),

  midSection('1.7', 'Card 7: One conversation', ORANGE),
  ...lines(['Label: "One thing to try"', '"Name it out loud when you notice it. That alone changes how it plays out."', '[A conversation prompt drawn from the couple\u2019s top difference] is the focus of the card.']),

  midSection('1.8', 'Card 8: Closer', ORANGE),
  prose('CTA into the full results: "View Full Results"', { indent: INDENT_PROSE_UNDER_SMALL }),
];

// ── SECTION 2 — Full Summary (Joint Overview) ───────────────────────────────
const section2 = [
  ...bigSection(2, 'Full Summary',
    'The first section after the highlights click-through. A read on each exercise, the pattern across both, and conversation prompts surfaced from the couple\u2019s differences.', PURPLE),
  midSection('2.1', 'Cards', PURPLE, { extras: 'Communication · Expectations · Reflection (if owned)' }),
  ...lines(['Each card gives a short read and a CTA into its section.', 'Pattern label: "Pattern across both exercises"', 'Examples: "Your conflict styles are different, and both exercises said so" · "A distinctive communication style." · "Based on where your answers differed most."', 'Workbook CTA: "Get the Workbook →"']),
  midSection('2.2', 'Surfaced conversation prompts', PURPLE, { extras: 'selected by the couple\u2019s top differences' }),
  ...lines([
    '"When something is hard between us, before we try to talk about it, what does each of us actually need first?"',
    '"After a disagreement, what does \u2018being okay again\u2019 actually feel like for you?"',
    '"Is there something you\u2019ve wanted to share with me but haven\u2019t found the right way to bring up?"',
    '"What\u2019s something I do that makes you feel really loved, that I might not realize has that effect?"',
    '"When one of us needs alone time to recharge and the other wants to connect, how do we handle that without it feeling like rejection?"',
    '"What\u2019s your ideal ratio of time together vs. time doing your own thing in a given week?"',
    '"How much certainty do you need before you feel comfortable with a plan? What does uncertainty feel like for you?"',
    '"Tell me about a time a big change went really well for you. What made it feel okay?"',
    '"Walk me through the last big decision you made. What did that feel like from the inside?"',
    '"We had different answers on \u2018[expectation]\u2019, what\u2019s the thinking behind yours? I want to understand where you\u2019re coming from."',
  ]),
];

// ── SECTION 3 — Couple Map ──────────────────────────────────────────────────
const section3 = [
  ...bigSection(3, 'Couple Map',
    'The 2×2 grid with both partners plotted. Two axes, each with a question and a label for each end. Per-partner placement copy is the individual profiles (Section 4).', GREEN),
  midSection('3.1', 'Engage / Withdraw axis', GREEN),
  prose(AXIS.eq, { italics: true, indent: INDENT_PROSE_UNDER_SMALL }),
  ...lines([`Engage end: ${AXIS.ea.replace(/^Engage:\s*/, '')}`, `Withdraw end: ${AXIS.eb.replace(/^Withdraw:\s*/, '')}`]),
  midSection('3.2', 'Open / Guarded axis', GREEN),
  prose(AXIS.oq, { italics: true, indent: INDENT_PROSE_UNDER_SMALL }),
  ...lines([`Open end: ${AXIS.oa.replace(/^Open:\s*/, '')}`, `Guarded end: ${AXIS.ob.replace(/^Guarded:\s*/, '')}`]),
  midSection('3.3', 'Per-partner placement', GREEN),
  prose('One blurb per partner, generated from type and placement. Cataloged in full in Section 4.', { indent: INDENT_PROSE_UNDER_SMALL }),
  midSection('3.4', 'Share text', GREEN),
  prose('"We\u2019re \u2018[type name]\u2019, [tagline] Find yours at attune.com"', { italics: true, indent: INDENT_PROSE_UNDER_SMALL }),
  midSection('3.5', 'How you see each other', GREEN, { extras: 'shown once partner-view answered' }),
  prose('A per-dimension comparison of each person\u2019s self-rating against how their partner sees them. One row per dimension, two dots each: white is what you said, blue is what your partner said. The column is the person being described; the dot colour is whose voice it is. Hidden until the couple has answered the partner-view questions.', { indent: INDENT_PROSE_UNDER_SMALL }),
  smallSection('3.5.1', 'Key', GREEN),
  ...lines(['white dot = what you said', 'blue dot = what [partner] said']),
  smallSection('3.5.2', 'Dimensions and poles', GREEN),
  ...lines(['Conflict: Engages quickly / Needs space first', 'Under stress: Pulls inward / Leans on you', 'Repair: Reaches out first / Waits it out', 'Expression: Holds it in / Shares openly', 'Feedback: Wants a soft approach / Wants it direct']),
  smallSection('3.5.3', 'Largest-gap callout', GREEN),
  prose('"The biggest gap between how you two see each other is [dimension]. Start there." Shown when a gap of 1 or more exists.', { italics: true, indent: INDENT_PROSE_UNDER_SMALL }),
];

// ── SECTION 4 — Individual profiles ─────────────────────────────────────────
const section4 = [
  ...bigSection(4, 'Individual profiles',
    'On the couple map section. One profile per partner. The blurb varies by type and by how far toward an end the partner sits. Four placements per type.', BLUE),
  ...PROFILE_TYPES.flatMap(([code, name], ti) => {
    const out = [midSection(`4.${ti + 1}`, `${code}, ${name}`, BLUE)];
    PLACEMENTS.forEach((v, vi) => {
      out.push(smallSection(`4.${ti + 1}.${vi + 1}`, v, BLUE, { before: 180 }));
      out.push(prose(ph(allBlurbs[ti * 4 + vi] || '(not found)'), { indent: INDENT_PROSE_UNDER_SMALL }));
    });
    return out;
  }),
];

// ── SECTION 5 — Communication action plan ───────────────────────────────────
const section5 = [
  ...bigSection(5, 'Communication action plan',
    'On the Communication section. One protocol appears for each dimension flagged as a gap or note. Title and this-week step are fixed; the body pulls that dimension\u2019s advice text.', 'C2410C'),
  ...protocols.flatMap((p, i) => [
    midSection(`5.${i + 1}`, p.title, 'C2410C', { extras: DIMN[p.dim] || p.dim }),
    smallSection(`5.${i + 1}.1`, 'Try this week', 'C2410C', { before: 140 }),
    prose(p.thisWeek, { indent: INDENT_PROSE_UNDER_SMALL }),
  ]),
];

// ── SECTION 6 — Expectations results ────────────────────────────────────────
const section6 = [
  ...bigSection(6, 'Expectations results',
    'The Expectations section. Overview, Common Ground, Conversations Worth Having, The Life You\u2019re Building, Action Plan. Per-category framing below; the couple\u2019s own answers fill the rest.', 'F59E0B'),
  midSection('6.1', 'Common Ground', 'F59E0B'),
  prose('"These are the expectations you already hold in common, no negotiation needed. This is your foundation."', { italics: true, indent: INDENT_PROSE_UNDER_SMALL }),
  midSection('6.2', 'Fully-aligned states', 'F59E0B', { extras: 'shown when they agree on everything' }),
  ...lines(['"You\u2019re aligned across every area. Review each category below."', '"Fully aligned on all expectations."', '"[Partner A] and [Partner B] are aligned on every expectation mapped."']),
  midSection('6.3', 'Category framing', 'F59E0B', { extras: 'one per expectation area' }),
  smallSection('6.3.1', 'Money and finances', 'F59E0B', { before: 160 }),
  prose('"Beneath money disagreements is usually a difference in values, not just numbers. The question worth asking: what do you each want money to make possible?"', { indent: INDENT_PROSE_UNDER_SMALL }),
  smallSection('6.3.2', 'Domestic life', 'F59E0B', { before: 140 }),
  prose('"Day-to-day domestic expectations are easy to assume rather than discuss. Getting explicit about them removes a major source of slow-build resentment."', { indent: INDENT_PROSE_UNDER_SMALL }),
  smallSection('6.3.3', 'Work and career', 'F59E0B', { before: 140 }),
  prose('"How you think about work, ambition, and sacrifice for each other\u2019s careers will evolve. These conversations lay groundwork before the hard moments arrive."', { indent: INDENT_PROSE_UNDER_SMALL }),
  smallSection('6.3.4', 'Invisible work', 'F59E0B', { before: 140 }),
  prose('"The invisible work of a relationship, tracking, anticipating, initiating, is the category most couples never name. Naming it changes how it lands."', { indent: INDENT_PROSE_UNDER_SMALL }),
  smallSection('6.3.5', 'The life you\u2019re building', 'F59E0B', { before: 140 }),
  prose('"These are the bigger-picture expectations: children, family, where you live, and how you want your life to feel. Getting aligned on these now is one of the most valuable things a couple can do."', { indent: INDENT_PROSE_UNDER_SMALL }),
  midSection('6.4', 'Action plan', 'F59E0B'),
  prose('Top misalignments with couple-type context. The misalignments are their answers; the couple-type context is generated.', { indent: INDENT_PROSE_UNDER_SMALL }),
];

// ── SECTION 7 — Relationship Reflection results ─────────────────────────────
const section7 = [
  ...bigSection(7, 'Relationship Reflection results',
    'Shown for Anniversary and Premium. Overview, Insights, Side by Side, Action Plan. The insight prompts and what triggers each are cataloged in the reflection results review.', '9B5DE5'),
  midSection('7.1', 'Overview framing', '9B5DE5'),
  ...lines(['"Strong alignment across the board."', '"You line up across the board."', 'Shows the feel score, an appreciation reveal, and strength/explore counts.']),
  midSection('7.2', 'Side by Side', '9B5DE5', { extras: 'each pair of answers gets a tag' }),
  ...lines(['Tags: "Aligned" · "Worth discussing" · "Different expectations" · "Left unspoken" · "Incomplete"', 'Sub-labels: "Based on how things are now." · "Based on what you each expect."']),
  midSection('7.3', 'Insights and Action plan', '9B5DE5'),
  prose('The prompt cards and explore items.', { indent: INDENT_PROSE_UNDER_SMALL }),
  caption('Full prompt copy and what triggers each: see the Relationship Reflection results review, Sections 2 and 3.'),
];

// ── SECTION 8 — What Comes Next ──────────────────────────────────────────────
const section8 = [
  ...bigSection(8, 'What Comes Next',
    'The closing section. Pulls the action plans together and points to next steps.', INK),
  midSection('8.1', 'Framing', INK),
  ...lines(['Heading: "What comes next"', 'Subhead: "What to do with all of this."', 'Section label: "Your action plans"']),
  midSection('8.2', 'Action plans gathered', INK),
  ...lines([
    'Communication Action Plan: "Practices drawn from your communication results"',
    'Expectations Action Plan: "Topics to work through from your expectations comparison"',
    'Reflection Action Plan: "Conversations from your relationship reflection"',
  ]),
  midSection('8.3', 'Resources and links', INK),
  ...lines([
    'Personalized workbook: "Download your personalized workbook." · "Structured activities drawn from your top gap dimensions"',
    'Expectations discussion guide: "Topics to discuss, organized by area"',
    'Conversation prompts: "Questions specific to where you and [partner] differ"',
    'Links to share, download the workbook, and book an LMFT session. An upgrade prompt shows where applicable.',
  ]),
];

// ── SECTION 9 — Couple type near-axis prose ─────────────────────────────────
const NEAR_KIND = [
  ['patternsNearEngage', 'Patterns', 'Engage/Withdraw'],
  ['stickingPointsNearEngage', 'Sticking point', 'Engage/Withdraw'],
  ['patternsNearOpen', 'Patterns', 'Open/Guarded'],
  ['stickingPointsNearOpen', 'Sticking point', 'Open/Guarded'],
];
const NEAR_COLOR = '9B5DE5';
const section9 = [
  ...bigSection(9, 'Couple type near-axis prose',
    'On the couple type page, when a partner sits within 0.6 of an axis line the default pattern or sticking-point item is replaced with a near-axis variant. Two forms: one-near (a single partner near the line) and both-near (both partners near it). Both forms are shown below. Items with no variant keep the default and are not listed. The variant fires per axis, so a couple near both lines gets both sets. Bracketed tokens fill with names and pronouns at render.', NEAR_COLOR),
];
Object.keys(NEAR_AXIS_PROSE).forEach((id, i) => {
  const np = NEAR_AXIS_PROSE[id];
  const axesPresent = [];
  if (np.patternsNearEngage || np.stickingPointsNearEngage) axesPresent.push('Engage/Withdraw');
  if (np.patternsNearOpen || np.stickingPointsNearOpen) axesPresent.push('Open/Guarded');
  section9.push(midSection(`9.${i + 1}`, `${id} \u2014 ${NAMES[id] || id}`, NEAR_COLOR, { extras: 'near ' + axesPresent.join(' + ') }));
  NEAR_KIND.forEach(([key, kind, axis]) => {
    const map = np[key];
    if (!map) return;
    Object.keys(map).map(Number).sort((a, b) => a - b).forEach((idx) => {
      const v = map[idx];
      const one = typeof v === 'string' ? v : v.one;
      const both = typeof v === 'string' ? null : v.both;
      section9.push(groupLabel(`${kind} [${idx}] \u00b7 near ${axis}`, NEAR_COLOR));
      section9.push(prose(`One near: ${tok(one)}`, { indent: INDENT_PROSE_UNDER_SMALL }));
      if (both) section9.push(prose(`Both near: ${tok(both)}`, { indent: INDENT_PROSE_UNDER_SMALL }));
    });
  });
});

await renderDoc({
  footerLabel: 'Attune · Results specific content review',
  outPath: '/mnt/user-data/outputs/attune_results_specific_content_review.docx',
  children: [...cover, ...section1, ...section2, ...section3, ...section4, ...section5, ...section6, ...section7, ...section8, ...section9],
});
