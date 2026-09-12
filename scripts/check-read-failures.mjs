// Fails the build when a screen can wait forever on a read that already failed.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// components/profile-setup.tsx read its copy like this:
//
//   fetchProfileSetupCopy().then((r) => { if (r.ok) setCopy(r.data.copy); });
//
// and rendered <ScreenLoading label="One moment" /> until copy arrived. When
// the read failed, copy stayed null, so the screen sat on "One moment" for as
// long as anyone was willing to wait, with nothing to tap and nothing to read.
// That screen is the first thing someone sees after buying on the website and
// downloading the app, which makes it the worst place in the product for it.
//
// One missing branch. `r.ok` was true or nothing happened.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// A screen that will not render until some value arrives —
//
//   if (!copy) return <ScreenLoading />;
//
// — has to handle the failure of the read that sets that value. Not somewhere
// in the file: profile-setup already had a failure state, set and rendered,
// for its save. A file-level check would have found that and passed. So the
// branch is required at the call site that sets the awaited value.
//
// ── WHY NOT EVERY READ ─────────────────────────────────────────────────────
// The first version of this demanded a failure branch at every reader call and
// flagged fourteen, nearly all of them right as written. Notes fetches tags
// for their labels; results fetches the reader's own marks. Those are
// enrichment: they fail, the screen renders anyway, and nobody is stuck. A
// gate that flags working code is one people learn to skip past.
//
// What separates the bug from the rest is not the read. It is that something
// on screen refuses to move until the read lands.
//
// ── WHAT IT DELIBERATELY DOES NOT COVER ────────────────────────────────────
// Whether the failure is shown well, retried, or worded the way Ellie would
// word it: ScreenError owns that. Writes: check-save-feedback owns those, and
// owns them at file level because for a write the question is whether the
// person is told at all. And a tap whose behaviour depends on fetched data,
// which is how the Workbook tile in app/resources.tsx answered a tap with
// nothing when its load had failed. That one is real and this does not see
// it; the fix there was to load the data with everything else so a focus or a
// pull to refresh retries it.

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'attune-app/src');

const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx$/.test(p)) files.push(p);
  }
})(SRC);

/**
 * Every function in the client a screen waits on.
 *
 * Derived by name, the way check-save-feedback derives its writers, so a new
 * endpoint is covered the day it is added rather than the day someone
 * remembers this file. `async` is optional in the pattern on purpose: leaving
 * it out once produced a list that silently excluded the one function the
 * gate existed for.
 */
const client = readFileSync(join(SRC, 'api/client.ts'), 'utf8');
const READERS = [...new Set(
  [...client.matchAll(/export (?:async )?function ((?:fetch|list|get)[A-Z]\w*)\s*\(/g)].map((m) => m[1]),
)];

if (!READERS.includes('fetchHome')) {
  console.error('[check-read-failures] fetchHome is not in the derived reader list; refusing to pass.');
  console.error(`  found: ${READERS.join(', ') || '(none)'}`);
  process.exit(1);
}
if (READERS.length < 5) {
  console.error(`[check-read-failures] only ${READERS.length} readers found in the client; refusing to pass.`);
  process.exit(1);
}
const READER = new RegExp(`\\b(${READERS.join('|')})\\s*\\(`, 'g');

const problems = [];
let gates = 0;

for (const file of files) {
  const src = blank(readFileSync(file, 'utf8'));
  const rel = file.replace(ROOT, '');

  // What this screen refuses to render without. `if (!copy) return
  // <ScreenLoading/>`, and the same line with several values on it.
  const waitedOn = new Set();
  for (const m of src.matchAll(/if\s*\(([^)]*)\)\s*return\s+([^;]*ScreenLoading[^;]*);/g)) {
    for (const v of m[1].matchAll(/!\s*(\w+)/g)) {
      if (v[1] !== 'loading') waitedOn.add(v[1]);
    }
  }
  if (!waitedOn.size) continue;

  for (const value of waitedOn) {
    // The setter for it. A gate on something that is not state is not ours.
    const decl = src.match(new RegExp(`\\[\\s*${value}\\s*,\\s*(set\\w+)\\s*\\]`));
    if (!decl) continue;
    const setter = decl[1];
    gates += 1;

    let setFromARead = false;
    let anyHandled = false;
    READER.lastIndex = 0;
    for (const m of src.matchAll(READER)) {
      const [start, end] = regionOf(src, m.index);
      const region = src.slice(start, end);
      if (!new RegExp(`\\b${setter}\\s*\\(`).test(region)) continue;
      setFromARead = true;
      const binding = bindingIn(src, m.index, start);
      if (binding && handled(region, binding)) anyHandled = true;
    }

    if (setFromARead && !anyHandled) {
      problems.push(
        `${rel} will not render until ${value} arrives, and the read that sets it\n`
        + `      drops its failing case. When it fails, ${value} stays null and the\n`
        + '      screen waits on a spinner with nothing to tap.');
    }
  }
}

/** Comments blanked out, so a comment cannot satisfy or trip anything. */
function blank(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|\s)\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));
}

/** The block a call's result is handled in: a .then callback, or its own block. */
function regionOf(src, at) {
  const then = src.slice(at).match(/^\w+\s*\([^)]*\)\s*\.then\s*\(/);
  if (then) {
    const open = src.indexOf('{', at + then[0].length);
    if (open > 0) return [open, close(src, open)];
  }
  let depth = 0;
  for (let k = at; k >= 0; k--) {
    if (src[k] === '}') depth++;
    else if (src[k] === '{') {
      if (depth === 0) return [k, close(src, k)];
      depth--;
    }
  }
  return [0, src.length];
}

/** What the result is called: the .then parameter, or the const it is assigned to. */
function bindingIn(src, at, regionStart) {
  const then = src.slice(at).match(/^\w+\s*\([^)]*\)\s*\.then\s*\(\s*\(?\s*(\w+)/);
  if (then) return then[1];
  const before = src.slice(regionStart, at);
  const bind = before.match(/(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?[^;\n]*$/);
  return bind ? bind[1] : null;
}

/** Does this region do something when the read failed? */
function handled(region, n) {
  if (new RegExp(`!\\s*${n}\\.ok`).test(region)) return true;
  if (new RegExp(`\\b${n}\\.error\\b`).test(region)) return true;
  if (new RegExp(`${n}\\.ok\\s*\\?`).test(region)) return true;
  if (new RegExp(`${n}\\.ok`).test(region) && /\belse\b/.test(region)) return true;
  return false;
}

/** Index just past the brace closing the one at `open`. */
function close(src, open) {
  let d = 0;
  for (let k = open; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}' && --d === 0) return k + 1;
  }
  return src.length;
}

if (!gates) {
  console.error('[check-read-failures] found no screen that waits on a fetched value; refusing to pass.');
  process.exit(1);
}

if (problems.length) {
  console.error('[check-read-failures] a screen can wait forever on a read that already failed:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(
  `[check-read-failures] ${gates} screens hold their render until a value arrives; `
  + 'every one handles that read failing.');
