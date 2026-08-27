// Prose approval doc — every piece of copy written or changed in the recent
// sessions that Ellie has not signed off on, in one place.
//
// Reads live from source wherever the copy lives in code, so approving an edit
// means changing the source and regenerating rather than reconciling two copies.

import { readFileSync } from 'fs';
import { DIM_META, DIM_CONTENT, GAP_BLURBS, WHEN_THIS_SHOWS_UP, DIMS } from '../api/_workbook-content.js';
import { PERSONALITY_QUESTIONS, PARTNER_VIEW_TEXT } from '../api/_questions.js';
import {
  ORANGE, BLUE, PURPLE, GREEN, INK, MUTED, RED,
  bigSection, midSection, smallSection, prose, caption, groupLabel, tag,
  buildCover, renderDoc, evalConst, INDENT_PROSE_UNDER_SMALL,
} from './_review_format.mjs';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

// Domain prose lives in the PersonalityResults domainGroups literal.
const domainGroups = evalConst(app, 'domainGroups');
const DIM_ACTION_ITEMS = evalConst(app, 'DIM_ACTION_ITEMS');
const DOMAIN_ALIGNED = evalConst(app, 'DOMAIN_ALIGNED');
const REFLECTION_ACTION_TITLES = evalConst(app, 'REFLECTION_ACTION_TITLES');

// The reassurance shift prose, pulled straight out of getDimShift's SHIFTS map.
// Rendered with sample names so the {loName}/{hiName} slots read as real copy.
const reassuranceShifts = (() => {
  const i = app.indexOf('    reassurance: {', app.indexOf('const SHIFTS = {'));
  const j = app.indexOf('\n    },', i);
  return [...app.slice(i, j).matchAll(/'(\d_\d)':\s*`([^`]*)`/g)]
    .map(m => [m[1], m[2].replace(/\$\{loName\}/g, 'Maya').replace(/\$\{hiName\}/g, 'David')]);
})();
const ALIGNED_ADVICE = evalConst(app, 'ALIGNED_ADVICE');
const BAND = { 1: 'strongly Voiced', 2: 'leans Voiced', 3: 'flexible', 4: 'leans Assumed', 5: 'strongly Assumed' };

// The bids gap prose, pulled from the per-cell block so the doc shows exactly
// what ships rather than a paraphrase.
const bidsBlock = (() => {
  const i = app.indexOf("    bids: {", app.indexOf('RESPONDING TO BIDS'));
  const j = app.indexOf('\n    },', i);
  const raw = app.slice(i, j);
  return [...raw.matchAll(/'(\d_\d)':\s*`([^`]*)`/g)].map(m => [m[1], m[2]]);
})();

const TYPE_LABELS = {
  WW: 'Two Initiators', XX: 'Two Anchors', YY: 'Two Feelers', ZZ: 'Two Protectors',
  WX: 'Initiator + Anchor', WY: 'Initiator + Feeler', WZ: 'Initiator + Protector',
  XY: 'Anchor + Feeler', XZ: 'Anchor + Protector', YZ: 'Feeler + Protector',
};
const TYPE_ORDER = ['WW', 'XX', 'YY', 'ZZ', 'WX', 'WY', 'WZ', 'XY', 'XZ', 'YZ'];

// Sample names, assigned by position in the type code so same-letter pairs
// (WY, XZ) do not resolve both slots to one person.
const fill = (s, code = '') => String(s ?? '')
  .replace(/\{U\}/g, 'Maya').replace(/\{P\}/g, 'David')
  .replace(/\[([WXYZ]) partner name\]/g, (_, c) => (code[1] === c && code[0] !== c ? 'David' : 'Maya'));

const cover = buildCover({
  title: 'Prose to approve',
  subtitle: 'Everything written or changed recently that has not been signed off.',
  howToUse: 'Mark up directly. Sections 1 to 4 are new or rewritten copy. Section 5 is copy that is now inconsistent with a label change and needs a decision. Section 6 lists the label and count changes already shipped, for confirmation rather than editing.',
  indexRows: [
    ['1.', 'Reassurance', 'new dimension, all copy'],
    ['2.', 'Domain page prose', '3 comms detail pages'],
    ['3.', 'Expectations glance', 'conversations to have'],
    ['4.', 'Exercise and site copy', 'counts and descriptions'],
    ['5.', 'Bids prose', 'still uses the old pole words'],
    ['6.', 'Labels already changed', 'confirm or revert'],
    ['7.', 'Action plan items', '10 dimensions + 3 aligned states'],
    ['8.', 'Reflection action titles', 'rewritten as instructions'],
    ['9.', 'Reassurance guidance', '15 score pairings, new'],
    ['10.', 'Reassurance when aligned', 'keep-in-mind line, new'],
  ],
});

const children = [...cover];

// ── 1 ────────────────────────────────────────────────────────────────────────
children.push(...bigSection('1', 'Reassurance', 'A new dimension. None of this has had a clinical pass. Poles: Voiced and Assumed.', PURPLE));
children.push(midSection('1.1', 'The two questions', PURPLE));
PERSONALITY_QUESTIONS.filter(q => q.dimension === 'reassurance').forEach((q, i) => {
  children.push(smallSection(`1.1.${i + 1}`, 'About you', PURPLE));
  children.push(prose(q.text, { indent: INDENT_PROSE_UNDER_SMALL }));
  children.push(prose(`A.  ${q.a}`, { indent: INDENT_PROSE_UNDER_SMALL, size: 13 }));
  children.push(prose(`B.  ${q.b}`, { indent: INDENT_PROSE_UNDER_SMALL, size: 13 }));
  const pv = PARTNER_VIEW_TEXT[q.id];
  if (!pv) return;
  children.push(groupLabel('About your partner', MUTED, 'Part 2 wording'));
  children.push(prose(pv.text, { indent: INDENT_PROSE_UNDER_SMALL }));
  children.push(prose(`A.  ${pv.a}`, { indent: INDENT_PROSE_UNDER_SMALL, size: 13 }));
  children.push(prose(`B.  ${pv.b}`, { indent: INDENT_PROSE_UNDER_SMALL, size: 13 }));
});

const rc = DIM_CONTENT.reassurance;
children.push(midSection('1.2', 'What this measures', PURPLE));
children.push(prose(rc.measures));
children.push(midSection('1.3', 'When you are close', PURPLE));
children.push(prose(fill(rc.closeText)));
children.push(midSection('1.4', 'When there is a gap', PURPLE));
children.push(prose(fill(rc.gapText)));
children.push(midSection('1.5', 'Reflection prompts', PURPLE));
rc.prompts.forEach((t, i) => children.push(smallSection(`1.5.${i + 1}`, '', PURPLE, { inline: t })));
children.push(midSection('1.6', 'Try this week', PURPLE));
children.push(prose(rc.thisWeek));
children.push(midSection('1.7', 'Gap blurbs', PURPLE));
[['Aligned', 'aligned'], ['Small gap', 'some_gap'], ['Notable gap', 'notable_gap']].forEach(([label, key], i) => {
  children.push(smallSection(`1.7.${i + 1}`, label, PURPLE));
  children.push(prose(GAP_BLURBS.reassurance[key], { indent: INDENT_PROSE_UNDER_SMALL }));
});
children.push(midSection('1.8', 'When this shows up, per couple type', PURPLE));
TYPE_ORDER.forEach((code, i) => {
  children.push(smallSection(`1.8.${i + 1}`, `${code}  ·  ${TYPE_LABELS[code]}`, PURPLE));
  children.push(prose(fill(WHEN_THIS_SHOWS_UP.reassurance[code], code), { indent: INDENT_PROSE_UNDER_SMALL }));
});

// ── 2 ────────────────────────────────────────────────────────────────────────
children.push(...bigSection('2', 'Domain page prose', 'The comms detail pages are now three grouped pages. Each opens with one of these. Drafted from the handoff notes, never reviewed.', ORANGE));
domainGroups.forEach((g, i) => {
  children.push(midSection(`2.${i + 1}`, g.label, ORANGE, { extras: g.dims.join(', ') }));
  children.push(prose(g.prose));
});

// ── 3 ────────────────────────────────────────────────────────────────────────
children.push(...bigSection('3', 'Expectations, results at a glance', 'A new block on the expectations overview. Mine, unreviewed.', GREEN));
children.push(midSection('3.1', 'Section heading', GREEN));
children.push(prose('Conversations to have'));
children.push(caption('Shown above three cards, one per category, ordered by widest gap.', MUTED, INDENT_PROSE_UNDER_SMALL));
children.push(midSection('3.2', 'Card shape', GREEN));
children.push(prose('Category name, then the first topic in that category verbatim, then a count line.'));
children.push(tag('Count line', GREEN, INDENT_PROSE_UNDER_SMALL));
children.push(prose('3 more topics in this area.', { indent: INDENT_PROSE_UNDER_SMALL, italics: true }));
children.push(midSection('3.3', 'Section index label', GREEN));
children.push(prose('Detailed results  ·  6 categories, item by item'));
children.push(caption('Was "Detailed category pages". The comms equivalent reads "Detailed results · Three pages, grouped by where it shows up".', MUTED, INDENT_PROSE_UNDER_SMALL));

// ── 4 ────────────────────────────────────────────────────────────────────────
children.push(...bigSection('4', 'Exercise and site copy', 'Changed because the exercise is now two parts of the same 27 questions.', BLUE));
children.push(midSection('4.1', 'Part 2 intro screen', BLUE, { extras: 'already live' }));
children.push(prose('Now, the same questions about your partner.'));
children.push(prose('You just answered these about yourself. This time, answer the same set the way you think your partner would. It shows each of you where your reads of each other line up, and where they do not. There are no right answers.'));
children.push(midSection('4.2', 'Question count, everywhere it appears', BLUE));
children.push(prose(`Was 28. Now ${PERSONALITY_QUESTIONS.length * 2}, described as "${PERSONALITY_QUESTIONS.length * 2} questions in two parts". Appears on how-it-works, offerings, and four places on start.`));
children.push(midSection('4.3', 'How it works page', BLUE));
children.push(prose(`54 questions in two parts. Part 1 is about you. Part 2 is the same questions about your partner. Each person answers independently.`));
children.push(midSection('4.4', 'Offerings, exercise description', BLUE));
children.push(prose('Communication, conflict, repair, emotional intimacy, and reassurance across 10 dimensions.'));
children.push(caption('Was "Communication, conflict, repair, love languages, and stress patterns across 10 dimensions." Stress is gone as a dimension.', MUTED, INDENT_PROSE_UNDER_SMALL));
children.push(midSection('4.5', 'Timing estimate', RED, { extras: 'needs a decision' }));
children.push(prose('Offerings still says ~10 min next to 54 questions. The count doubled and the estimate did not. I did not invent a new number.'));

// ── 5 ────────────────────────────────────────────────────────────────────────
children.push(...bigSection('5', 'Bids prose', 'The Bids poles changed from Reserved/Attuned to Subtle/Expressive, because "attuned" frames one end as the better one. The per-cell prose underneath still uses the old words, and still reads as a verdict.', RED));
children.push(caption('Left column is the score pair (your score _ their score). This is what prints on the results page.', MUTED));
bidsBlock.forEach(([cell, text], i) => {
  children.push(smallSection(`5.${i + 1}`, cell.replace('_', ' and '), RED));
  children.push(prose(fill(text).replace(/\$\{loName\}/g, 'Maya').replace(/\$\{hiName\}/g, 'David'), { indent: INDENT_PROSE_UNDER_SMALL }));
});

// ── 6 ────────────────────────────────────────────────────────────────────────
children.push(...bigSection('6', 'Labels already changed', 'Shipped. Listed for confirmation, not editing. Say the word and any of these reverts.', MUTED));
children.push(midSection('6.1', 'Dimension names', MUTED));
[['How Love Lands', 'Emotional Intimacy'], ['How You Ask for Needs', 'Communicating Needs'],
 ['How You Repair', 'Repairing'], ['How You Listen', 'Listening'],
 ['Communication Under Stress', 'removed, folded into Conflict Style'], ['—', 'Reassurance, new']]
  .forEach(([was, now], i) => children.push(smallSection(`6.1.${i + 1}`, '', MUTED, { inline: `${was}   ->   ${now}` })));
children.push(midSection('6.2', 'Pole labels', MUTED));
[['Emotional Expression', 'Guarded / Expressive', 'Internal / External', 'Guarded collided with the axis name and with the feedback poles'],
 ['Bids for Connection', 'Reserved / Attuned', 'Subtle / Expressive', 'Attuned framed one end as better'],
 ['Conflict Style', 'Engage quickly / Needs space first', 'Engage / Withdraw', 'consistency with the app'],
 ['Repairing', 'Formal-verbal / Informal-warmth', 'Formal / Informal', 'consistency with the app'],
 ['Emotional Intimacy', 'Words / Actions & Presence', 'Words / Actions', 'consistency with the app']]
  .forEach(([dim, was, now, why], i) => {
    children.push(smallSection(`6.2.${i + 1}`, dim, MUTED));
    children.push(prose(`${was}   ->   ${now}`, { indent: INDENT_PROSE_UNDER_SMALL }));
    children.push(caption(why, MUTED, INDENT_PROSE_UNDER_SMALL));
  });
children.push(midSection('6.3', 'Current poles, all ten', MUTED));
DIMS.forEach((d, i) => children.push(smallSection(`6.3.${i + 1}`, '', MUTED,
  { inline: `${DIM_META[d].label}   ${DIM_META[d].left} / ${DIM_META[d].right}` })));

// ── 7 ────────────────────────────────────────────────────────────────────────
children.push(...bigSection('7', 'Action plan items', 'One per dimension. The results-at-a-glance plan shows the widest-gap dimension in each of the three domains, so each of these has to stand on its own. {LO} and {HI} are the partners at each end.', ORANGE));
Object.entries(DIM_ACTION_ITEMS).forEach(([dim, item], i) => {
  children.push(midSection(`7.${i + 1}`, DIM_META[dim]?.label || dim, ORANGE));
  children.push(prose(item.title, { bold: true }));
  children.push(prose(fill(item.body).replace(/\{LO\}/g, 'Maya').replace(/\{HI\}/g, 'David')));
});
children.push(midSection('7.11', 'When a domain has no gap', ORANGE, { extras: 'one per domain' }));
Object.entries(DOMAIN_ALIGNED).forEach(([dom, item], i) => {
  children.push(smallSection(`7.11.${i + 1}`, dom, ORANGE));
  children.push(prose(item.title, { indent: INDENT_PROSE_UNDER_SMALL, bold: true }));
  children.push(prose(item.body, { indent: INDENT_PROSE_UNDER_SMALL }));
});

// ── 8 ────────────────────────────────────────────────────────────────────────
children.push(...bigSection('8', 'Reflection action titles', 'The Relationship Reflection headlines describe what the answers showed. On the glance page and What Comes Next they need to be something you can do. Left is what the insight says, right is what now renders.', GREEN));
Object.entries(REFLECTION_ACTION_TITLES).forEach(([was, now], i) => {
  children.push(midSection(`8.${i + 1}`, '', GREEN, { inline: was }));
  children.push(prose('->  ' + now, { indent: INDENT_PROSE_UNDER_SMALL }));
});

// ── 9 ────────────────────────────────────────────────────────────────────────
children.push(...bigSection('9', 'Reassurance guidance', 'The One thing to try tile shows guidance written for where each partner sits on the dimension. Every other dimension already had this and was approved; Reassurance postdates that pass, so these 15 are new. Maya sits toward Voiced, David toward Assumed.', PURPLE));
reassuranceShifts.forEach(([key, text], i) => {
  const [lo, hi] = key.split('_');
  children.push(midSection(`9.${i + 1}`, `${BAND[lo]}  +  ${BAND[hi]}`, PURPLE, { extras: key.replace('_', ' and ') }));
  children.push(prose(text));
});

// ── 10 ───────────────────────────────────────────────────────────────────────
children.push(...bigSection('10', 'Reassurance when aligned', 'When both partners sit on the same end of a dimension there is no gap to close, so the tile shows a keep-in-mind line instead. Those existed for nine dimensions and were approved. These two are the new Reassurance ones, one for each end.', PURPLE));
[['Both toward Voiced', ALIGNED_ADVICE.reassurance.low], ['Both toward Assumed', ALIGNED_ADVICE.reassurance.high]]
  .forEach(([label, text], i) => {
    children.push(midSection(`10.${i + 1}`, label, PURPLE));
    children.push(prose(text));
  });

const out = (process.env.ATTUNE_DOC_OUT || '/mnt/user-data/outputs') + '/attune_prose_to_approve.docx';
await renderDoc({ footerLabel: 'Attune · Prose to approve', children, outPath: out });
