#!/usr/bin/env node
/**
 * Every field on a Communication action tile is drawn on both surfaces.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * `commsActionPlan` in api/_lib/comms-plan.js builds the three tiles on the
 * Communication overview. Whatever it puts on a tile, the website's
 * comm-overview/action-tiles block and the app's have to draw, and neither may
 * draw a field the server does not send.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * A field called `reflect`: one sentence, added to the hardest domain only,
 * telling the reader what to ask themselves in their next hard conversation.
 * The website drew it and the app did not, so Ellie reported the app missing a
 * line, and it was added to the app. Both surfaces then agreed with each
 * other and neither agreed with the page behind the tile: When Things Get Hard
 * has no prompt on it, on either product.
 *
 * Ellie: "The comms overview 'when things get hard' action item for site and
 * web includes a prompt, but that prompt isn't present on the detailed page on
 * either site or web. Please remove the prompt from the overview page
 * everywhere, and make sure this inconsistency doesn't happen again."
 *
 * ── WHAT THIS CHECKS, AND WHAT IT CANNOT ──────────────────────────────────
 * It checks the half that is mechanical: one tile shape, drawn the same way in
 * both places. A field that reaches one renderer and not the other fails here,
 * which is the first half of what went wrong and the half that took two rounds
 * to notice.
 *
 * It cannot check the other half, which is whether a sentence on a summary is
 * also true of the page it summarises. That is a judgement about meaning and
 * no scanner has it. What it can do is make the shape visible: a field that
 * exists on one of three domains is written here as an exception rather than
 * as a spread, so the next person adding one has to say so out loud.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * By RUNNING the builder over a fixture rather than reading it, so a field
 * added conditionally, spread in, or computed still shows up. The keys it
 * actually emits are the subject; the two renderers' blocks are scanned for
 * each one.
 */

import { readFileSync } from 'node:fs';
import { commsActionPlan } from '../api/_lib/comms-plan.js';
import { COMM_DOMAINS } from '../api/_lib/comm-domains.js';
import { contentFor } from '../api/_content/index.js';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

/**
 * One feedback row per dimension, with a gap on each, so every domain has a
 * lead and the aligned branch and the advice branch both get exercised.
 */
const copy = contentFor();
const feedback = COMM_DOMAINS.flatMap((d, di) => d.dims.map((dim, i) => ({
  dim,
  gap: (i + di) % 3,
  myScore: 2,
  partScore: 4,
  adviceText: i === 0 ? 'Some advice.' : null,
  strengthText: 'A strength.',
})));

const tiles = commsActionPlan({ feedback, copy });
if (tiles.length !== COMM_DOMAINS.length) {
  console.error(`[check-action-tile-fields] built ${tiles.length} tiles for`
    + ` ${COMM_DOMAINS.length} domains; refusing to pass on a fixture that does`
    + ' not exercise the builder.');
  process.exit(1);
}

/** Every key any tile carries, across all three domains. */
const keys = new Set(tiles.flatMap((t) => Object.keys(t)));

/**
 * Keys the renderers use for something other than drawing.
 *
 * `domain` is the React key and the tile's identity; `color` is the border and
 * the rule down its left edge; `dim` is which dimension led the domain, which
 * neither surface prints. They are named here rather than skipped silently, so
 * the list of things not shown is a decision someone wrote down.
 */
const NOT_DRAWN = new Set(['domain', 'color', 'dim']);

/** The two blocks, found by the section-block markers rather than by line. */
const SURFACES = [
  {
    who: 'the website',
    file: 'src/App.jsx',
    marker: '{/* block: comm-overview/action-tiles */}',
    end: '))}',
  },
  {
    who: 'the app',
    file: 'attune-app/src/components/results.tsx',
    marker: '{/* block: comm-overview/action-tiles */}',
    end: '))}',
  },
];

for (const s of SURFACES) {
  const src = readFileSync(`${ROOT}${s.file}`, 'utf8');
  const at = src.indexOf(s.marker);
  if (at < 0) {
    fails.push(`${s.who}: cannot find the comm-overview/action-tiles block in`
      + ` ${s.file}. A gate that has lost its subject must not report success.`);
    continue;
  }
  const stop = src.indexOf(s.end, at);
  const block = src.slice(at, stop < 0 ? at + 4000 : stop);

  for (const k of keys) {
    if (NOT_DRAWN.has(k)) continue;
    if (new RegExp(`\\.${k}\\b`).test(block)) continue;
    fails.push(`${s.who} does not draw \`${k}\`, which commsActionPlan puts on`
      + ' a tile. A field that reaches one surface and not the other is how the'
      + ' overview came to carry a sentence its own detail page does not.');
  }

  /** And the other direction: a renderer reading a field nobody sends. */
  for (const m of block.matchAll(/\b(?:item|tile)\.([a-zA-Z_]\w*)/g)) {
    if (keys.has(m[1])) continue;
    fails.push(`${s.who} draws \`${m[1]}\` on an action tile and`
      + ' commsActionPlan never puts it there. It is either dead markup or a'
      + ' field that was removed from the server and left on one screen.');
  }
}

if (fails.length) {
  console.error('\n check-action-tile-fields: the two surfaces do not draw the same tile.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`✓ check-action-tile-fields: ${keys.size} fields on a Communication action tile,`
  + ` ${keys.size - NOT_DRAWN.size} of them drawn, identically on both surfaces.`);
