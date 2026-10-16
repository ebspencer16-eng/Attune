#!/usr/bin/env node
/**
 * Every code name a comment mentions, checked against the code.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * CLAUDE.md twice over: "A comment that describes a dead path is worse than no
 * comment." One of those cost an hour chasing a divergence that did not exist.
 * This looks for the shape: a comment naming `someFunction` or a file that is
 * nowhere in the tree.
 *
 * ── WHAT IT FOUND ON ITS FIRST RUN ────────────────────────────────────────
 * 18 flags over 300-odd files. Two were real and both are fixed:
 *
 *   results.tsx called the flag `seenHighlights`. The real one is
 *   `cameFromHighlights`, and it is read once and cleared rather than
 *   remembering anything, which is a different rule from the one the name
 *   implies.
 *
 *   src/App.jsx said a `valenceUnknown` flag "is set on the result so callers
 *   can surface that the score is low-confidence". Nothing ever set it, so no
 *   caller could surface it, and a reader would go looking for it.
 *
 * ── WHY IT IS A PROBE AND NOT A GATE ──────────────────────────────────────
 * It cannot tell tense, and most of the other sixteen flags were comments
 * saying what something USED to be, which is the most valuable kind of comment
 * in this repo. "There was a `notesState` here" is right and this cannot tell
 * it from "`notesState` is read on mount". A build that failed on those would
 * teach people to delete their own history.
 *
 * The rest were gates naming a shape they forbid, like `glancePlanX` or
 * `noArrows`, which do not exist on purpose, and two kinds of comment that are
 * doing their job:
 *
 *   dated history. "That counter was removed on 2026-10-11" in pairing.js, and
 *   `betaResponses` in admin-explore.js, which CLAUDE.md records being removed
 *   along with a comment saying what it had been.
 *
 *   a parenthetical denial. cron-checkin.js says it selects `pkg` "rather than
 *   `has_anniversary` (which doesn't exist as a column)", which is exactly the
 *   thing worth writing down and reads to this probe as a dead name.
 *
 * 22 flags, 2 real. Read the output; do not act on the count.
 *
 * So: run it by hand after a deletion or a rename, and read the output.
 *
 *   node scripts/probe-dead-comments.mjs
 *
 * ── WHAT IT CANNOT SEE ────────────────────────────────────────────────────
 * A name that lives only in Supabase and in no file here. The first run
 * flagged two column names for exactly that reason, which is why the haystack
 * now includes the migrations and the static pages.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = '/Users/Ellie/Projects/unison/';
const DIRS = ['api', 'attune-app/src', 'scripts', 'src'];
const files = [];
const walk = (d) => {
  for (const e of readdirSync(join(ROOT, d))) {
    if (e === 'node_modules' || e.startsWith('.')) continue;
    /* Not itself, and not the other probes. This file's own header names the
       dead identifiers it found, so scanning it reports every one of them a
       second time. CLAUDE.md: a scan that reads a comment as code punishes a
       file for saying what went wrong. */
    if (/^probe-.*\.mjs$/.test(e)) continue;
    const rel = `${d}/${e}`;
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel);
    else if (/\.(js|mjs|ts|tsx|jsx)$/.test(e)) files.push(rel);
  }
};
DIRS.forEach(walk);

/** Everything the code actually defines or imports, anywhere. */
const haystack = new Map();
for (const f of files) haystack.set(f, readFileSync(join(ROOT, f), 'utf8'));
/* Widened after the first run: a comment naming a COLUMN looked dead because
   the haystack was only JavaScript. Migrations and the static pages are where
   those names live. What this still cannot see is a name that exists only in
   Supabase and in no file here, and it says so rather than guessing. */
const extra = [];
for (const d of ['supabase/migrations', 'public']) {
  const walk2 = (dir) => {
    for (const e of readdirSync(join(ROOT, dir))) {
      if (e.startsWith('.')) continue;
      const rel = `${dir}/${e}`;
      if (statSync(join(ROOT, rel)).isDirectory()) walk2(rel);
      else if (/\.(sql|html|json)$/.test(e)) extra.push(readFileSync(join(ROOT, rel), 'utf8'));
    }
  };
  walk2(d);
}
const allCode = [...haystack.values(), ...extra]
  .map((t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1'))
  .join('\n');
const tree = new Set(files.map((f) => f.split('/').pop()));

const looksLikeCode = (w) => /^[a-z][A-Za-z0-9]*[A-Z][A-Za-z0-9]*$/.test(w)
  || /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(w)
  || /\.(js|mjs|ts|tsx|jsx)$/.test(w);

const findings = [];
for (const [f, text] of haystack) {
  const comments = [...text.matchAll(/\/\*[\s\S]*?\*\//g), ...text.matchAll(/(?:^|[^:])\/\/([^\n]*)/g)]
    .map((m) => m[0]);
  const named = new Set();
  for (const c of comments) for (const m of c.matchAll(/`([^`\n]{3,60})`/g)) named.add(m[1].trim());
  for (const n of named) {
    const word = n.replace(/\(\)$/, '').replace(/^[.#]/, '');
    if (!looksLikeCode(word)) continue;
    if (/\.(js|mjs|ts|tsx|jsx)$/.test(word)) {
      if (!tree.has(word.split('/').pop())) findings.push([f, word, 'no file by that name']);
      continue;
    }
    const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    if (!re.test(allCode)) findings.push([f, word, 'not defined or used anywhere']);
  }
}
console.log(`${files.length} files, ${findings.length} name(s) a comment mentions that the code does not have`);
for (const [f, w, why] of findings) console.log(`  ${f}: \`${w}\` ${why}`);
