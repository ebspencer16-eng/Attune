// Reassurance review — the new Reassurance dimension copy, for clinical review.
// Reassurance replaced Communication Under Stress in the communication exercise
// (stress folded into Conflict Style). Every other dimension's workbook copy has
// been through review; this one has not. Reads live from the content files, so
// once edits land in the source this doc regenerates to match.

import { PERSONALITY_QUESTIONS, PARTNER_VIEW_TEXT } from '../api/_questions.js';
import { DIM_META, DIM_CONTENT, GAP_BLURBS, WHEN_THIS_SHOWS_UP, DIM_AXIS } from '../api/_workbook-content.js';
import { AXIS_CONFIG } from '../api/_type-engine.js';
import {
  ORANGE, PURPLE, BLUE, INK, MUTED,
  bigSection, midSection, smallSection, prose, caption, groupLabel,
  buildCover, renderDoc, INDENT_PROSE_UNDER_SMALL,
} from './_review_format.mjs';

const DIM = 'reassurance';
const meta = DIM_META[DIM];
const content = DIM_CONTENT[DIM];
const blurbs = GAP_BLURBS[DIM];
const showsUp = WHEN_THIS_SHOWS_UP[DIM];
const qs = PERSONALITY_QUESTIONS.filter(q => q.dimension === DIM);

// Sample names so the {U} / {P} and [X partner name] slots read as real copy.
// Names are assigned by POSITION in the couple-type code, not by letter, so
// same-letter pairs (XZ, WY) don't resolve both slots to the same person.
const fill = (s, code = '') => String(s ?? '')
  .replace(/\{U\}/g, 'Maya').replace(/\{P\}/g, 'David')
  .replace(/\[([WXYZ]) partner name\]/g, (_, c) => (code[1] === c && code[0] !== c ? 'David' : 'Maya'));

const TYPE_LABELS = {
  WW: 'Two Initiators', XX: 'Two Anchors', YY: 'Two Feelers', ZZ: 'Two Protectors',
  WX: 'Initiator + Anchor', WY: 'Initiator + Feeler', WZ: 'Initiator + Protector',
  XY: 'Anchor + Feeler', XZ: 'Anchor + Protector', YZ: 'Feeler + Protector',
};
const TYPE_ORDER = ['WW', 'XX', 'YY', 'ZZ', 'WX', 'WY', 'WZ', 'XY', 'XZ', 'YZ'];

const cover = buildCover({
  title: 'Reassurance',
  subtitle: 'New dimension copy, first draft. Everything here needs a clinical pass.',
  howToUse: 'Reassurance replaced Communication Under Stress. Stress folded into Conflict Style, so its copy retired with it. This is every piece of customer-facing Reassurance copy in one place. Mark up directly. Numbered for reference (e.g. 3.2 = the small-gap blurb).',
  indexRows: [
    ['1.', 'What the dimension is', 'poles, scoring, the two questions'],
    ['2.', 'Workbook page copy', 'what it measures, aligned, gap, prompts, this week'],
    ['3.', 'Gap blurbs', 'three tiers'],
    ['4.', 'When this shows up', `${TYPE_ORDER.length} couple types`],
  ],
});

const children = [...cover];

// ── 1 ────────────────────────────────────────────────────────────────────────
children.push(...bigSection('1', 'What the dimension is', 'The poles, how it scores, and the questions it comes from.', PURPLE));

children.push(midSection('1.1', 'Poles', PURPLE));
children.push(prose(`${meta.left} on the left, ${meta.right} on the right. Neither end is the better one to be. ${meta.left}: hearing where you stand is what keeps you close. ${meta.right}: security is the baseline and does not need confirming.`));

children.push(midSection('1.2', 'How it scores', PURPLE));
const cfg = AXIS_CONFIG[DIM];
children.push(prose(`Feeds the ${cfg.axis === 'open' ? 'Open / Guarded' : 'Engage / Withdraw'} axis at weight ${cfg.weight}. ${DIM_AXIS[DIM].openWhen === 'low' ? meta.left : meta.right} is the open end, so the score is read by spectrum rather than raw value.`));
children.push(caption('Read live from AXIS_CONFIG. If the weight changes, this line changes with it.', MUTED, INDENT_PROSE_UNDER_SMALL));

children.push(midSection('1.3', 'The questions', PURPLE, { extras: `${qs.length} in the exercise, each asked twice` }));
qs.forEach((q, i) => {
  children.push(smallSection(`1.3.${i + 1}`, 'About you', PURPLE));
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

// ── 2 ────────────────────────────────────────────────────────────────────────
children.push(...bigSection('2', 'Workbook page copy', 'What prints on the Reassurance page of the personalized workbook.', ORANGE));

children.push(midSection('2.1', 'What this measures', ORANGE));
children.push(prose(content.measures));

children.push(midSection('2.2', 'When the two of you are close', ORANGE, { extras: 'scores near each other' }));
children.push(prose(fill(content.closeText)));

children.push(midSection('2.3', 'When there is a gap', ORANGE, { extras: 'scores far apart' }));
children.push(prose(fill(content.gapText)));

children.push(midSection('2.4', 'Reflection prompts', ORANGE));
content.prompts.forEach((p, i) => {
  children.push(smallSection(`2.4.${i + 1}`, '', ORANGE, { inline: p }));
});

children.push(midSection('2.5', 'Try this week', ORANGE));
children.push(prose(content.thisWeek));

// ── 3 ────────────────────────────────────────────────────────────────────────
children.push(...bigSection('3', 'Gap blurbs', 'The one-liner on the snapshot page, picked by how far apart the two scores are.', BLUE));
[['3.1', 'Aligned', 'aligned'], ['3.2', 'Small gap', 'some_gap'], ['3.3', 'Notable gap', 'notable_gap']]
  .forEach(([num, label, key]) => {
    children.push(midSection(num, label, BLUE));
    children.push(prose(blurbs[key]));
  });

// ── 4 ────────────────────────────────────────────────────────────────────────
children.push(...bigSection('4', 'When this shows up', 'Per couple type, on the workbook dimension page. Names below are samples.', PURPLE));
TYPE_ORDER.forEach((code, i) => {
  children.push(midSection(`4.${i + 1}`, `${code}  ·  ${TYPE_LABELS[code]}`, PURPLE, { before: 300 }));
  children.push(prose(fill(showsUp[code], code)));
});

const out = (process.env.ATTUNE_DOC_OUT || '/mnt/user-data/outputs') + '/attune_reassurance_review.docx';
await renderDoc({ footerLabel: 'Attune · Reassurance review · first draft', children, outPath: out });
