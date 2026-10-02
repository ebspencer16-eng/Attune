#!/usr/bin/env node
/**
 * The documents a session reads first name files that exist.
 *
 * ── WHY THESE FOUR ────────────────────────────────────────────────────────
 * CLAUDE.md says it twice, about itself: "a stale map is worse than none,
 * because it is the first thing every session reads". It has been wrong about
 * its own repo before. It described /methodology as a live page for weeks after
 * it was deleted, and its list of what the app does and does not have named
 * four things as unbuilt that had been built for a while.
 *
 * So this covers the maps, not the records. CLAUDE.md and the three documents
 * under app/ are what a session is told to work from. AUDIT.md, HANDOFF.md and
 * the PHASE_* files are dated accounts of a past state, and a past-tense finding
 * naming a file that existed then is correct rather than stale. Holding those to
 * the current tree would mean rewriting history to keep a check quiet.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 * Every repo path a map names, resolved against the tree. Found eleven stale
 * paths across six documents when it was written, none of them in these four,
 * and two documents making present-tense claims about features that had been
 * deliberately removed: LMFT_SETUP.md, which configures an integration whose
 * files went in 97cacb6c, and PHASE_5_AUDIT.md, which opens "The production
 * stack has TWO endpoints that generate a workbook". Both now say so at the top.
 *
 * ── A TRAP WORTH KNOWING ──────────────────────────────────────────────────
 * The first version of this scan matched `.js` before `.jsx`, so `src/App.jsx`
 * came back as `src/App.js` and read as missing, along with app.json, eas.json
 * and every .tsx. Eight of the thirteen "findings" were the pattern, not the
 * docs. Longest extension first.
 */

import { existsSync, readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;

/** The maps. Not the records; see above. */
const MAPS = [
  'CLAUDE.md',
  'app/SCREENS.md',
  'app/ONBOARDING.md',
  'app/README.md',
];

const EXT = '(?:jsx|tsx|mjs|json|html|md|sql|js|ts|py)';
const PATH = new RegExp(
  `\\b((?:api|src|scripts|public|supabase|attune-app)/[\\w./-]+?\\.${EXT})(?![\\w])`, 'g');

const fails = [];
let named = 0;

for (const rel of MAPS) {
  let doc;
  try { doc = readFileSync(`${ROOT}${rel}`, 'utf8'); } catch {
    fails.push(`${rel} is gone. It is one of the documents a session is told to read first;`
      + ' if it was retired on purpose, take it out of MAPS here and say why.');
    continue;
  }
  /* Code spans unwrapped, so `api/_lib/x.js` is read as a path. */
  const text = doc.replace(/`([^`]*)`/g, ' $1 ');
  const seen = new Set();
  for (const m of text.matchAll(PATH)) {
    const p = m.group?.(1) ?? m[1];
    if (seen.has(p)) continue;
    seen.add(p);
    named += 1;
    if (!existsSync(`${ROOT}${p}`)) {
      const line = text.slice(0, m.index).split('\n').length;
      fails.push(`${rel}:${line} names ${p}, which is not in the tree.\n`
        + '      Either it moved and the sentence has to follow it, or it was retired and the\n'
        + '      sentence is describing a dead path. Check which with `git log -S` before\n'
        + '      deciding: absence is also what a deliberate deletion looks like.');
    }
  }
}

if (named < 20) {
  console.error(`[check-maps-are-current] only ${named} repo paths across ${MAPS.length}`
    + ' documents, which cannot be right for files that exist to say where things live.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

if (fails.length) {
  console.error('\n check-maps-are-current: a document a session reads first points at nothing.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-maps-are-current] ${named} repo paths named across ${MAPS.length} maps, and`
  + ' every one of them is in the tree.');
