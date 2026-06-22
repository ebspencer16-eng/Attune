// Intimacy results review — per-dimension results copy, in the same format as
// the specific content review. Reads live from the intimacy content files.

import { INTIMACY_DIMENSIONS } from '../api/_intimacy-questions.js';
import { INTIMACY_RESULTS_PROSE } from '../api/_intimacy-results-prose.js';
import {
  ORANGE, PURPLE, GREEN, BLUE, INK, MUTED,
  bigSection, midSection, smallSection, prose, caption, groupLabel,
  buildCover, renderDoc, INDENT_PROSE_UNDER_SMALL,
} from './_review_format.mjs';

const clean = (s) => String(s ?? '').replace(/\{SKIPPER\}/g, '[the partner who skipped]');

// Result states, in the order a reader thinks about them. Label + when it fires.
const STATE_LABELS = [
  ['aligned',  'Aligned',          'scores close together'],
  ['discuss',  'Small gap',        'a little apart'],
  ['different','Notable gap',      'different rates'],
  ['unspoken', 'Unspoken',         'neither put a number to it'],
];

const cover = buildCover({
  title: 'Intimacy results',
  subtitle: 'The per-dimension results copy for the Physical Intimacy add-on.',
  howToUse: 'Six dimensions. For each, the neutral intro, the four result states (aligned, small gap, notable gap, unspoken), the one-partner-skipped variant, and the talk-about-it prompt. Numbered for reference (e.g. 2.3.different = dimension 3, notable-gap state).',
  indexRows: [
    ['1.', 'The six dimensions', `${INTIMACY_DIMENSIONS.length} dimensions, poles + intro`],
    ['2.', 'Per-dimension results copy', 'intro · 4 states · skipped · prompt'],
  ],
});

// SECTION 1 — the dimensions
const section1 = [
  ...bigSection(1, 'The six dimensions',
    'Each dimension is a continuum between two poles. Neither pole is the better one. The gap is the conversation.', ORANGE),
  ...INTIMACY_DIMENSIONS.flatMap((dim, i) => {
    const pr = INTIMACY_RESULTS_PROSE[dim.id] || {};
    const out = [midSection(`1.${i + 1}`, dim.label, ORANGE, { extras: `${dim.poles[0]} / ${dim.poles[1]}` })];
    if (pr.intro) out.push(prose(pr.intro));
    return out;
  }),
];

// SECTION 2 — per-dimension results copy
const section2 = [
  ...bigSection(2, 'Per-dimension results copy',
    'What each couple sees on the dimension result, by state. Voice: short declarative, no em dashes, no hedging, neither pole framed as better.', PURPLE),
  ...INTIMACY_DIMENSIONS.flatMap((dim, i) => {
    const pr = INTIMACY_RESULTS_PROSE[dim.id] || {};
    const out = [
      midSection(`2.${i + 1}`, dim.label, PURPLE, { extras: `${dim.poles[0]} / ${dim.poles[1]}` }),
    ];
    if (pr.intro) { out.push(caption(pr.intro)); }

    out.push(groupLabel('Result states', PURPLE, 'shown based on how far apart the two answers sit'));
    STATE_LABELS.forEach(([key, lbl, when]) => {
      if (!pr[key]) return;
      out.push(smallSection(`2.${i + 1}.${key}`, lbl, PURPLE, { before: 180, inline: when, italicInline: true }));
      out.push(prose(clean(pr[key]), { indent: INDENT_PROSE_UNDER_SMALL }));
    });

    if (pr.oneSkipped) {
      out.push(groupLabel('One partner skipped', GREEN, 'shown when only one of the two answered this dimension'));
      out.push(smallSection(`2.${i + 1}.skipped`, 'Lead', GREEN, { before: 160 }));
      out.push(prose(clean(pr.oneSkipped.lead), { indent: INDENT_PROSE_UNDER_SMALL }));
      out.push(smallSection(`2.${i + 1}.skipped-q`, 'Question to come back to', GREEN, { before: 120 }));
      out.push(prose(clean(pr.oneSkipped.question), { italics: true, indent: INDENT_PROSE_UNDER_SMALL }));
    }

    if (pr.prompt) {
      out.push(groupLabel('Talk-about-it prompt', BLUE, 'the “talk about it” card on the dimension result'));
      out.push(prose(clean(pr.prompt), { italics: true, indent: INDENT_PROSE_UNDER_SMALL }));
    }
    return out;
  }),
];

await renderDoc({
  footerLabel: 'Attune · Intimacy results review',
  outPath: '/mnt/user-data/outputs/attune_intimacy_results_review.docx',
  children: [...cover, ...section1, ...section2],
});
