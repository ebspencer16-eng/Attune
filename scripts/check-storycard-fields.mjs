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

// ── AND THE PRESENTATION OBJECT ────────────────────────────────────────────
// STORYCARD_STYLE is sent whole on every results payload. `tones`, the eight
// card grounds, was in it from the start and the app read its own local table
// instead: two copies of eight gradients, one of them never consulted, under a
// module whose opening comment says neither surface holds its own copy of a
// colour. Nothing noticed, because a value that is sent and ignored looks
// exactly like a value that is used.
const { STORYCARD_STYLE } = await import('../api/_lib/storycard-style.js');
for (const key of Object.keys(STORYCARD_STYLE)) {
  if (new RegExp(`\\b(SC|style)\\??\\.${key}\\b|\\b${key}:`).test(app)) continue;
  problems.push(
    `api/_lib/storycard-style.js sends .${key} on every results payload, and\n`
    + '      the app never reads it. Either the app has its own copy of that value,\n'
    + '      which is what this module exists to prevent, or it should not be sent.');
}

// ── AND THE APP'S FALLBACKS ARE NOT A SECOND OPINION ───────────────────────
// The app reads these values off the payload and keeps literals beneath them
// "as a last resort for a payload written before that field existed". Its own
// note says so, and adds: "They are not a second opinion: if they ever
// disagree with the module, the module is right."
//
// Nothing was holding them to that. The fallback path is not hypothetical:
// results are frozen, so a couple whose row was written before `tones` was
// sent has no tones in it and hits these literals every time. A stale fallback
// shows exactly those couples the wrong grounds, and only those couples, which
// is the hardest kind of report to act on.
//
// Compared by value, for the keys the app keeps a literal for. Anything the app
// does not keep a fallback for is not this check's business.
{
  const tonesInApp = (() => {
    const at = app.indexOf('const TONES: Record<string, [string, string, string]> = {');
    if (at < 0) return null;
    const open = app.indexOf('{', at);
    let depth = 0; let end = -1;
    for (let i = open; i < app.length; i += 1) {
      if (app[i] === '{') depth += 1;
      else if (app[i] === '}') { depth -= 1; if (depth === 0) { end = i + 1; break; } }
    }
    if (end < 0) return null;
    const out = {};
    for (const m of app.slice(open, end).matchAll(/'?([\w-]+)'?\s*:\s*\[([^\]]+)\]/g)) {
      out[m[1]] = m[2].split(',').map((x) => x.trim().replace(/^'|'$/g, ''));
    }
    return out;
  })();

  if (!tonesInApp || Object.keys(tonesInApp).length < 4) {
    problems.push('the app\'s fallback tone table could not be read, so this gate cannot compare'
      + ' it.\n      A gate that has lost its subject must not report success: the app keeps'
      + '\n      literals for a payload that predates `tones`, and frozen results mean older'
      + '\n      couples hit them on every render.');
  } else {
    for (const [name, want] of Object.entries(STORYCARD_STYLE.tones || {})) {
      const got = tonesInApp[name];
      if (!got) {
        problems.push(`the server has a "${name}" card ground and the app's fallback table has no`
          + ' entry for it, so a couple whose results predate `tones` gets no ground for that card.');
        continue;
      }
      const same = got.length === want.length
        && got.every((c, i) => String(c).toUpperCase() === String(want[i]).toUpperCase());
      if (!same) {
        problems.push(`the "${name}" card ground is [${want.join(', ')}] on the server and`
          + ` [${got.join(', ')}] in the app's fallback.`
          + '\n      The app\'s own note says the module is right when they disagree; this is'
          + '\n      what makes that true rather than stated.');
      }
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
  + 'every field the server sends is drawn by the app, and the app\'s fallback grounds equal '
  + 'the server\'s for every card.');
