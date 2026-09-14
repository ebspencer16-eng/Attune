#!/usr/bin/env node
/**
 * Nothing the results payload carries goes undrawn in the app.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Every field the app's own types say a results payload contains is named
 * somewhere in the app's results screens. A field the server sends and no
 * screen reads is content a reader on a phone never sees.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * Ellie: "our third action plan item has an additional note on the site that
 * isn't included on the app. I want everything included on the site included
 * on the app, make sure nothing like this gets cut off for any users."
 *
 * The field was `reflect` on the hardest domain's action tile. The server sent
 * it, the app's own type declared it, and no screen drew it, so the tile that
 * tells a couple what to do about their hardest domain was missing the line
 * that says what to do. Nothing failed; the tile just ended early.
 *
 * check-storycard-fields.mjs already does this for the nine storycards. This
 * is the same question asked of everything else on the payload.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * The app's client declares the shape it expects. Every field name in those
 * result types has to appear somewhere in the screens. That is a weak test of
 * "drawn" and a strong test of "never mentioned", which is the failure: a
 * field nobody wrote code for cannot be on screen.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether a field is drawn WELL, or in the right place, or conditionally
 * behind something that never happens. Naming it is the floor.
 *
 * Fields the app deliberately ignores are listed below with the reason. That
 * list is the honest part: adding to it is a decision, not a formality.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const client = readFileSync(`${ROOT}attune-app/src/api/client.ts`, 'utf8');

/** Every .tsx under the app's src, joined: the screens and their components. */
function screens(dir, out = []) {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, name);
    let stat;
    try { stat = readdirSync(join(ROOT, rel)); } catch { stat = null; }
    if (stat) { screens(rel, out); continue; }
    // Not the client itself. It is where the fields are DECLARED, so leaving
    // it in the haystack made every field trivially "named" by its own type
    // and the check passed on a payload nothing drew. Both plants sailed
    // through before this line existed.
    if (rel.endsWith('api/client.ts')) continue;
    if (name.endsWith('.tsx') || name.endsWith('.ts')) out.push(readFileSync(join(ROOT, rel), 'utf8'));
  }
  return out;
}
/**
 * Comments do not count as drawing something.
 *
 * A prose line reading "the colours reflect that" made `reflect` look named
 * while the tile that should print it drew nothing, and the plant for exactly
 * that bug passed twice before this line existed.
 */
const stripComments = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ');

const app = screens('attune-app/src').map(stripComments).join('\n');

/**
 * Fields the app knowingly does not draw.
 *
 * cached          a transport detail, not content.
 * ok / ready      the same.
 * pct / index     numbers a component computes with rather than prints.
 */
const IGNORED = new Set([
  'ok', 'ready', 'cached', 'pct', 'index', 'key', 'id', 'kind', 'type', 'color', 'colour',
  /**
   * Six values the server used to compute and neither surface drew: dimLabel,
   * writtenCount, alignedPct, categoryId, overallState and overallDistancePct.
   * Ellie: "stop sending all". They are gone from the payload and from the
   * app's types, so there is nothing left here to exempt.
   */
]);

/**
 * Fields the app really is cutting, with the work that will fix them.
 *
 * Empty. The two that were here, CommsPlan.protocols and
 * ReflectionResults.widest, were the same bug as O56: the website built What
 * Comes Next inline with a group the server's version did not have. The server
 * builds that group now, so both fields are read.
 *
 * An entry appearing here without a task number is this list being used as a
 * place to put problems.
 */
const KNOWN_GAPS = new Map();

/** The result types the payload is described by. */
const TYPES = ['CommsPlan', 'ReflectionResults', 'ExpectationsSummary', 'IntimacyResults'];
const problems = [];
const gaps = [];
let checked = 0;

for (const typeName of TYPES) {
  const at = client.indexOf(`export type ${typeName} =`);
  if (at < 0) {
    problems.push(`attune-app/src/api/client.ts declares no ${typeName}; this check is reading nothing for it.`);
    continue;
  }
  const end = client.indexOf('\n};', at);
  const body = client.slice(at, end);
  for (const m of body.matchAll(/^\s*\/?\*?\s*(\w+)\??:/gm)) {
    const field = m[1];
    if (IGNORED.has(field)) continue;
    checked++;
    // Named anywhere in the app: as .field, as a destructure, or as a key.
    const named = new RegExp(`[.\\s{,]${field}\\b`).test(app);
    if (!named) {
      const known = KNOWN_GAPS.get(field);
      if (known) { gaps.push(`${typeName}.${field} — ${known}`); continue; }
      problems.push(`${typeName}.${field} is on the payload and the app never names it.`);
    }
  }
}

if (checked < 20) {
  problems.push(`only checked ${checked} fields; there were more than 60 when this was written, so the parse has gone blind.`);
}

if (problems.length) {
  console.error('[check-app-draws-payload] the app is not drawing what the server sends:\n');
  for (const p of problems) console.error('  ' + p);
  console.error('\nEllie: "I want everything included on the site included on the app, make');
  console.error('sure nothing like this gets cut off for any users."');
  process.exit(1);
}

console.log(`[check-app-draws-payload] ${checked} payload fields across ${TYPES.length} result types; the app names every one.`);
for (const g of gaps) console.log(`  known gap, tracked: ${g}`);
