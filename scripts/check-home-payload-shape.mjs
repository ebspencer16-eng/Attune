#!/usr/bin/env node
/**
 * Both surfaces read /api/home's cards the same way.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie, with a screenshot of the dashboard: "A few problems with this page.
 * Formatting is off." The second prompt card was a tinted square with nothing
 * written in it.
 *
 * `nextActions` returns `{ primary, secondary }` where `secondary` is an ARRAY:
 * `withApp.slice(1, 4)`. The app has always read `secondary[0]`. The website
 * read `secondary` itself as a card, so it rendered an Array: `card.title`
 * undefined, `card.body` undefined, `card.tint` undefined. Every one of those
 * is an ordinary undefined, so nothing threw and nothing warned; it simply drew
 * an empty box.
 *
 * ── WHY MY OWN SCREENSHOTS MISSED IT ──────────────────────────────────────
 * I could not render the dashboard without a session, so I stubbed /api/home
 * and the stub sent `secondary` as an object, because that is what the code I
 * was looking at expected. A fixture built from the reader rather than from the
 * writer confirms whatever the reader believes. CLAUDE.md already says this
 * about gates that feed one side's data to both; it is just as true of a
 * screenshot harness.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 * The engine is RUN, and the shape of what it returns is compared against how
 * each surface reads it. Not a description of the payload: the payload itself.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * What the cards say, which is check-social-lists and the copy gates.
 * Where they go, which is check-card-targets.
 */

import { readFileSync } from 'node:fs';

import { nextActions } from '../api/_lib/next-action.js';
import { EXERCISES } from '../api/_exercises.js';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

/** A state that raises more than one card, so `secondary` is not empty. */
const ex = Object.fromEntries(
  EXERCISES.map((e) => [e.key, { owned: true, mine: false, theirs: false }]),
);
const out = nextActions({
  now: '2026-01-01T12:00:00Z', firstName: 'A', partnerName: 'B',
  profileComplete: false, exercises: ex,
});

if (!out || !out.primary) {
  console.error('[check-home-payload-shape] the engine raised no primary card in a state that'
    + ' should raise several. Refusing to pass: a gate that has lost its subject must never'
    + ' report success.');
  process.exit(1);
}

const secondaryIsArray = Array.isArray(out.secondary);
if (!secondaryIsArray) {
  fails.push('nextActions no longer returns `secondary` as an array. Both surfaces index it as'
    + ' one, so this is a change that needs them both.');
}
if (secondaryIsArray && !out.secondary.length) {
  fails.push('the state chosen here raises only one card, so the shape of `secondary` is not'
    + ' actually being exercised. Refusing to pass on a probe that proves nothing.');
}

/**
 * The website spreads it; the app indexes it. Either is correct, and treating
 * it as a single card is not.
 */
{
  const app = readFileSync(`${ROOT}src/App.jsx`, 'utf8');
  const code = app.replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

  const decl = /const cards = \[([\s\S]{0,400}?)\]/.exec(code);
  if (!decl) {
    fails.push('src/App.jsx no longer builds a `cards` list from the home payload. Refusing to'
      + ' pass: a gate that has lost its subject must never report success.');
  } else {
    const body = decl[1];
    const spreads = /\.\.\.\s*\(?[^,\]]*secondary/.test(body);
    const indexes = /secondary\s*(\?\.)?\[\s*0\s*\]/.test(body);
    if (!spreads && !indexes) {
      fails.push('src/App.jsx puts `feed.secondary` into the card list without spreading it or'
        + ' indexing it.\n'
        + '      It is an array of up to three cards. Used whole, it renders as one card with\n'
        + '      no title, no body and no tint: a card-shaped box with nothing in it.');
    }
  }
}

{
  const home = readFileSync(`${ROOT}attune-app/src/app/index.tsx`, 'utf8');
  const code = home.replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

  /**
   * Every use of `secondary`, and each one has to index it.
   *
   * Asking whether the file indexes it ANYWHERE is not enough: it reads it four
   * times, so a plant that broke one of them left three correct ones behind and
   * the gate passed. The check is per use, which is the rule CLAUDE.md gives
   * about matching a name instead of what follows it.
   */
  /* Property reads only. A bare `\bsecondary\b` also matches the string
     literal `key: 'secondary'`, which is a React key and not a payload. */
  const uses = [...code.matchAll(/\.\s*secondary\b/g)];
  if (!uses.length) {
    fails.push('attune-app/src/app/index.tsx never reads `secondary`, so the second prompt card'
      + ' cannot be drawn. Refusing to pass: a gate that has lost its subject must never report'
      + ' success.');
  }
  for (const u of uses) {
    const end = u.index + u[0].length;
    const after = code.slice(end, end + 26);
    /* `secondary ?? []` is the guard, and the `[0]` follows the closing paren. */
    if (/^\s*(\?\.)?\[\s*0\s*\]/.test(after)) continue;
    if (/^\s*\?\?\s*\[\s*\]\s*\)\s*\[\s*0\s*\]/.test(after)) continue;
    const line = code.slice(0, u.index).split('\n').length;
    fails.push(`attune-app/src/app/index.tsx:${line} uses \`secondary\` without taking an element`
      + ' out of it.\n      It is an array of up to three cards; used whole it has no title and'
      + ' no body.');
  }
}

if (fails.length) {
  console.error('\n check-home-payload-shape: the surfaces disagree about the home payload.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-home-payload-shape] the engine returns one primary and an array of`
  + ` ${out.secondary.length}; the website spreads it and the app indexes it.`);
