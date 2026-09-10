// Fails the build when the server puts something on a storycard that the app
// never draws.
//
// ── WHY THIS EXISTS ────────────────────────────────────────────────────────
// Ellie has reported the storycards not matching the website four times. Each
// time it was a different card and the same shape of miss, and each time it
// was found by a person holding a phone next to a laptop.
//
// check-section-blocks.mjs already checks the reel: nine cards, a stripe, the
// progress row, the controls, the watermark. It passed every time, correctly.
// A block is a thing a reader would notice GONE, and nothing was gone. What
// differed was inside the cards:
//
//   the two call-outs on the communication card are green and orange on the
//   website, because on that card the colour is the only thing saying which
//   dimension is the close one. The app drew both in the same grey.
//
//   the expectations figure is stepped green / blue / orange by the website.
//   The app printed every figure white, so 82% and 34% looked alike.
//
//   the two donuts are purple and blue. The app drew both white.
//
// In every one of those the server was sending enough and the app was not
// reading it, or the website had a value the payload never carried. Nothing
// was missing at the level anything checked.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// Every field the server actually puts on a card is read by the app's renderer
// for that card's kind. The card list is BUILT here, from a fixture couple,
// rather than parsed: parsing would miss anything spread in with `...`, and
// CALLOUT_TONES arrives exactly that way.
//
// ── WHAT IT CANNOT CHECK ───────────────────────────────────────────────────
// The other direction. A value the website draws that the payload never
// carries is invisible to this, because there is nothing to find: the couple
// map on card two was missing from the app for exactly that reason, and no
// amount of comparing the app to the payload would have said so. That one is
// what eyes on two screens are for, and it is the argument for putting
// presentation values in api/_lib/storycard-style.js where both surfaces read
// one copy, rather than for another scanner.

import { readFileSync } from 'fs';
import { highlightCards } from '../api/_lib/highlight-cards.js';

const ROOT = new URL('..', import.meta.url).pathname;
const app = readFileSync(ROOT + 'attune-app/src/components/highlight-cards.tsx', 'utf8');

/**
 * A couple who trip every optional card: they own the reflection and intimacy
 * exercises and have answered everything. A fixture that produces seven cards
 * silently exempts the two it does not reach.
 */
const DIMS = ['energy', 'expression', 'needs', 'bids', 'conflict', 'repair', 'listening']
  .map((key, i) => ({
    key, label: key, gap: i * 0.4, a: 2 + (i % 3), b: 3 + (i % 2),
    left: 'one end', right: 'the other',
  }));

const ex2 = { mine: { q1: 'a', q2: 'b' }, theirs: { q1: 'a', q2: 'a' } };
const cards = highlightCards({
  dimensions: DIMS,
  coupleTypeId: 'orbit',
  names: { you: 'Ellie', them: 'Preston' },
  expectations: {
    life: [{ aligned: true }, { aligned: false }],
    categories: [{ rows: [{ aligned: true }, { aligned: true }] }],
  },
  reflection: { admired: { you: 'your patience', them: 'their steadiness' } },
  intimacy: {
    dimensions: [{
      key: 'frequency', label: 'Frequency', state: 'aligned',
      distancePct: 4, prompt: 'Something to ask each other.',
    }],
  },
  ex2,
});

/**
 * Fields the CARD WRAPPER consumes, not the body renderer.
 *
 * `tone` and `accent` pick the ground in Card(); `id` keys the list. Listing
 * them here rather than skipping anything unrecognised, so a genuinely new
 * field cannot be waved through by being unfamiliar.
 */
const WRAPPER_FIELDS = new Set(['id', 'kind', 'tone', 'accent']);

/** The body renderer's case block for one card kind. */
function caseBody(kind) {
  const start = app.indexOf(`case '${kind}':`);
  if (start === -1) return null;
  const next = app.indexOf('\n    case ', start + 1);
  const end = next === -1 ? app.indexOf('\n    default', start) : next;
  return app.slice(start, end === -1 ? app.length : end);
}

const problems = [];
const seen = new Set();

for (const card of cards) {
  const body = caseBody(card.kind);
  if (body === null) {
    problems.push(`the app has no renderer for card kind '${card.kind}' (card ${card.id})`);
    continue;
  }
  seen.add(card.kind);

  for (const [key, value] of Object.entries(card)) {
    if (WRAPPER_FIELDS.has(key)) continue;
    // An empty array or a null carries nothing to draw, so a renderer ignoring
    // it is not evidence of anything.
    if (value == null || (Array.isArray(value) && !value.length)) continue;

    // Read directly off the card, or off an element of a card array.
    const direct = new RegExp(`card\\.${key}\\b`);
    const nested = new RegExp(`\\b[a-z]\\.${key}\\b`);
    if (direct.test(body) || nested.test(body)) continue;

    problems.push(
      `card '${card.id}' (kind ${card.kind}) carries .${key}, and the app's `
      + `renderer never reads it`);
  }

  // Fields inside an array of rows: rings carry a colour, call-outs carry
  // three. A renderer that draws the label and drops the colour is the exact
  // miss this exists for.
  for (const [key, value] of Object.entries(card)) {
    if (!Array.isArray(value) || !value.length || typeof value[0] !== 'object') continue;
    for (const sub of Object.keys(value[0])) {
      if (new RegExp(`\\.${sub}\\b`).test(body)) continue;
      problems.push(
        `card '${card.id}' rows carry .${key}[].${sub}, and the app's renderer `
        + 'never reads it');
    }
  }
}

if (problems.length) {
  console.error('[check-storycard-fields] the app is not drawing what the server sends:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('Every value on a card is there because the website draws it. A field the');
  console.error('app ignores is a card that reads differently on the two products, and');
  console.error('the block gate cannot see it: nothing is missing, it is just not shown.');
  process.exit(1);
}

console.log(
  `[check-storycard-fields] ${cards.length} cards across ${seen.size} kinds; `
  + 'every field the server sends is drawn by the app.');
