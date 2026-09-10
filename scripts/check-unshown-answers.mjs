// Fails the build when the product collects an answer, carries it all the way
// to a surface, and then shows it to nobody.
//
// ── WHAT HAPPENED, TWICE ───────────────────────────────────────────────────
// Ellie: "Display both answers that aren't currently shown."
//
// c8 in Conflict Patterns. "The thing you do that most often helps you reset
// mid-conflict." Asked, stored, summarised, put through the partner allowlist
// so both people could see each other's, sent on every payload, and rendered
// by neither surface.
//
// a_memory in Relationship Reflection. "Something small that happened recently
// that made me smile about us." Asked, stored, paired with the partner's
// answer, and filtered out at the last step because the list of category
// headings on Side by Side had never included its category.
//
// Neither errored. Both looked exactly like a field that was being used, right
// up to the render that did not exist. Two people wrote answers to questions
// this product asked them and then never showed either of them to anybody.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// Two things, one per shape the bug took.
//
// 1. Every field the conflict partner allowlist deliberately shares is read by
//    both surfaces. That allowlist is a considered decision about what one
//    partner may see of the other, so a field on it that nothing draws is
//    either a missing render or a decision that was reversed and not written
//    down.
//
// 2. Every category with a displayable Reflection question appears in
//    STORY_CATEGORIES. A written answer with no heading to sit under is
//    invisible however complete the data is.
//
// ── WHAT IT DOES NOT CHECK ─────────────────────────────────────────────────
// Every answer in the product. A question can be legitimately collected for
// scoring and never shown: the four conflict risk items feed the pattern bars
// rather than being printed, and the scale answers in Reflection are drawn as
// positions rather than as text. This checks the two places where the data was
// explicitly prepared FOR display and then not displayed, which is where the
// waste hides.

import { readFileSync } from 'fs';
import { partnerView } from '../api/_lib/conflict-partner-view.js';
import { WROTE_ROWS } from '../api/_conflict-results-prose.js';
import { STORY_CATEGORIES } from '../api/_lib/reflection-results.js';
import { ANNIVERSARY_QUESTIONS } from '../api/_anniversary-questions.js';

const ROOT = new URL('..', import.meta.url).pathname;
const problems = [];

// ── 1. Everything the partner allowlist shares must be drawn ───────────────
//
// Built by calling partnerView with a summary whose every field is present, so
// the list is the allowlist itself rather than a copy of it. A field added
// there tomorrow is checked tomorrow.
const shared = Object.keys(partnerView({
  overall: 1, repairRanking: ['x'], openings: { start: 'A', middle: 'A', oldTopics: 'A' },
  strength: 'x', reflection: 'x', appreciation: 'x',
  patterns: [], ranked: [], flagged: [], flaggedCount: 0,
}, 'Partner'));

const SURFACES = [
  { name: 'website', file: 'src/App.jsx' },
  { name: 'app', file: 'attune-app/src/components/conflict-results.tsx' },
];

for (const { name, file } of SURFACES) {
  const src = readFileSync(ROOT + file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  // Fields reached through a registry rather than by name. WROTE_ROWS carries
  // `reflection` and `appreciation` as its keys, and the website draws them as
  // `pairing.b[q.key]`, so the literal names appear nowhere in it.
  //
  // This is the cost of the pattern the rest of the codebase argues for, and
  // the first run of this gate walked straight into it: it reported two fields
  // as undrawn that the website has always drawn. A scanner that looks for a
  // name has to resolve the indirection for that name too.
  const viaRegistry = new Set(
    src.includes('WROTE_ROWS') || src.includes('wroteRows')
      ? WROTE_ROWS.map((r) => r.key)
      : [],
  );

  for (const field of shared) {
    if (field === 'name') continue;   // the label, not an answer
    if (viaRegistry.has(field)) continue;
    // Read off anything: conflictTheirs.strength, partner?.strength, r.overall.
    if (new RegExp(`[\\w\\]\\)]\\??\\.${field}\\b`).test(src)) continue;
    problems.push(
      `the ${name} never draws .${field}, which api/_lib/conflict-partner-view.js\n`
      + '      deliberately shares between partners. Either it should be shown, or the\n'
      + '      decision to share it has been reversed and the allowlist should say so.');
  }
}

// ── 2. Every category with a shown-able question needs a heading ───────────
const displayable = ANNIVERSARY_QUESTIONS.filter((q) => q.type === 'text');
for (const q of displayable) {
  if (!q.category) {
    problems.push(`Reflection question ${q.id} has no category, so Side by Side cannot place it.`);
    continue;
  }
  if (STORY_CATEGORIES.includes(q.category)) continue;
  problems.push(
    `Reflection question ${q.id} is in category "${q.category}", which is not in\n`
    + '      STORY_CATEGORIES, so both people answer it and neither is ever shown it.\n'
    + `      "${(q.text || '').slice(0, 62)}"`);
}

if (problems.length) {
  console.error('[check-unshown-answers] an answer is collected and shown to nobody:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('Asking two people to write something and then showing it to neither is');
  console.error('worse than not asking. If a field is genuinely not for display, take it');
  console.error('off the allowlist or out of the exercise.');
  process.exit(1);
}

console.log(
  `[check-unshown-answers] ${shared.length - 1} shared conflict fields drawn by both `
  + `surfaces; all ${displayable.length} written Reflection questions have a heading.`);
