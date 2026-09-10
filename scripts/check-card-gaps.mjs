// Fails the build when the storycards are computed from blended scores.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// Ellie: "Our scorecard 4 says our comms styles are 100% aligned. That's
// incorrect, right?"
//
// Every dimension has two gaps. SELF is the distance between what each person
// said about themselves. BLENDED is the distance after each score is mixed
// with the partner's view of them. Blending is the right input for typing a
// couple and the wrong one for "how far apart are your answers", because
// mixing two numbers moves each toward the other: blended gaps are always the
// narrower pair.
//
// The website has always used self on these cards and says so in a comment.
// api/_lib/highlight-cards.js used `d.gap`, which is blended, so the app's
// figure was always the higher of the two and reached 100 for a couple who
// see each other accurately.
//
// The percentage was the visible half. The same sort also picks the five
// dimensions on the slider card, the two dimensions named in the call-outs,
// and the conversation that closes the reel. All four could differ between the
// two products, silently, because both were plausible numbers.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// Behaviour, not text. It builds the same couple twice, once where the two
// partners read each other perfectly and once where they do not, and asserts
// the cards do not move: if the cards were reading blended scores, the
// partner-view answers would change the percentage, and reading self they
// cannot.
//
// That is the property worth pinning. A scan for the string `d.gap` would pass
// the moment someone renamed the field.

import { highlightCards } from '../api/_lib/highlight-cards.js';
import { commAlignmentPct, CARD_ALIGNED_GAP } from '../api/_lib/comm-alignment.js';

const problems = [];
const ok = (name, cond) => { if (!cond) problems.push(name); };

/**
 * Ten dimensions where the two partners sit meaningfully apart on four of
 * them. `a` and `b` are the self scores; `gap` is deliberately set to
 * something that disagrees with them, standing in for the blended figure.
 */
const dims = [
  { key: 'energy',      label: 'Energy',      a: 1.0, b: 4.5 },
  { key: 'expression',  label: 'Expression',  a: 2.0, b: 4.2 },
  { key: 'reassurance', label: 'Reassurance', a: 1.5, b: 3.8 },
  { key: 'needs',       label: 'Needs',       a: 2.2, b: 4.0 },
  { key: 'bids',        label: 'Bids',        a: 3.0, b: 3.4 },
  { key: 'conflict',    label: 'Conflict',    a: 2.9, b: 3.1 },
  { key: 'repair',      label: 'Repair',      a: 3.2, b: 3.5 },
  { key: 'listening',   label: 'Listening',   a: 2.8, b: 3.0 },
  { key: 'love',        label: 'Love',        a: 3.1, b: 3.6 },
  { key: 'feedback',    label: 'Feedback',    a: 2.7, b: 3.2 },
].map((d) => ({ ...d, left: 'one end', right: 'the other' }));

const build = (blendedGap) => highlightCards({
  dimensions: dims.map((d) => ({ ...d, gap: blendedGap(d) })),
  coupleTypeId: 'orbit',
  names: { you: 'Ellie', them: 'Preston' },
  ex2: { mine: {}, theirs: {} },
});

// The same couple, with the blended gaps set two very different ways. If the
// cards read self, these are identical.
const asSelf = build((d) => Math.abs(d.a - d.b));
const asBlendedFlat = build(() => 0);          // everyone reads everyone perfectly
const asBlendedWide = build(() => 3.9);        // nobody does

const card = (cards, id) => cards.find((c) => c.id === id) || null;

for (const [name, other] of [['blended all-zero', asBlendedFlat], ['blended all-wide', asBlendedWide]]) {
  ok(`the alignment figure moved when only the blended gaps changed (${name})`,
    card(asSelf, 'comm-align')?.stat === card(other, 'comm-align')?.stat);

  ok(`the call-outs moved when only the blended gaps changed (${name})`,
    JSON.stringify(card(asSelf, 'comm-align')?.callouts?.map((c) => c.value))
    === JSON.stringify(card(other, 'comm-align')?.callouts?.map((c) => c.value)));

  ok(`the slider card's dimensions moved when only the blended gaps changed (${name})`,
    JSON.stringify(card(asSelf, 'comm-sliders')?.dimensions?.map((d) => d.key))
    === JSON.stringify(card(other, 'comm-sliders')?.dimensions?.map((d) => d.key)));

  ok(`the closing conversation moved when only the blended gaps changed (${name})`,
    card(asSelf, 'conversation')?.quote === card(other, 'conversation')?.quote);
}

// And that the figure is the one the shared rule gives, so the card cannot
// drift from what the website prints.
const expected = commAlignmentPct(dims.map((d) => Math.abs(d.a - d.b)));
ok(`the card's figure (${card(asSelf, 'comm-align')?.stat}) is not what `
  + `commAlignmentPct gives (${expected}%)`,
  card(asSelf, 'comm-align')?.stat === `${expected}%`);

// Six of the ten sit within a point of each other, so this fixture must not
// come out at 100: a fixture that cannot fail the original bug proves nothing.
ok('the fixture is too aligned to detect the bug it exists for',
  expected > 0 && expected < 100);

if (problems.length) {
  console.error('[check-card-gaps] the storycards are reading the wrong scores:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('These cards are built from SELF gaps, the distance between what each');
  console.error('person said about themselves. Blended gaps mix in how each partner is');
  console.error('seen, which always narrows them, and the website has never used them');
  console.error('here. See api/_lib/comm-alignment.js.');
  process.exit(1);
}

console.log(
  `[check-card-gaps] the cards are built from self gaps and ignore the blended `
  + `ones; the fixture reads ${expected}% at a threshold of ${CARD_ALIGNED_GAP}.`);
