// Fails the build when a load-path reload can fire twice for the same reason.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// Ellie: "I waited 2mins, it kept refreshing and never got past 1sec."
//
// src/App.jsx restores exercise answers the server has and the device does
// not, then reloads so the state initialisers re-read localStorage. Its test
// for "already have it" was, for the two record-shaped exercises:
//
//     const hasLocal = !!parsed?.completedAt
//
// intimacy_data and conflict_data land in their column verbatim from the
// client, so the server does not guarantee a completedAt inside them. For a
// record without one, writing the server's copy never makes that true. Fill,
// reload, fill, reload, for as long as the tab is open.
//
// The comment above it said it could not loop.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// Every window.location.reload() that is NOT inside an event handler sits in
// a block that also reads a one-shot marker out of sessionStorage. Not that
// the guard is correct, which a scanner cannot know, but that a guard exists
// and is the kind that survives the reload it guards.
//
// localStorage does not count. If a failed localStorage write is what put the
// page in this state, a localStorage marker is the one thing that cannot be
// trusted to remember.

import { readFileSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;
const raw = readFileSync(ROOT + 'src/App.jsx', 'utf8');
const lines = raw.split('\n');
const problems = [];
let guarded = 0;
let handlers = 0;

lines.forEach((line, i) => {
  if (!/window\.location\.reload\(\)/.test(line)) return;
  // A reload a person triggered is not a loop: it happens once, on a click.
  const near = lines.slice(Math.max(0, i - 12), i + 2).join('\n');
  if (/onClick|onPress|onDone=|onSubmit/.test(near)) { handlers += 1; return; }

  // The enclosing block, generously: sixty lines back is further than any of
  // these guards sit from their reload.
  const block = lines.slice(Math.max(0, i - 60), i + 2).join('\n');
  if (/sessionStorage\.getItem\(/.test(block)) { guarded += 1; return; }

  problems.push(
    `src/App.jsx:${i + 1} reloads on a load path with no one-shot marker.\n`
    + `      ${line.trim().slice(0, 80)}\n`
    + '      If whatever led here is still true afterwards, it reloads again.\n'
    + '      Guard it with a sessionStorage flag set before the reload.');
});

if (!guarded && !handlers && !problems.length) {
  console.error('[check-reload-loop] found no reloads at all; refusing to pass.');
  process.exit(1);
}

if (problems.length) {
  console.error('[check-reload-loop] a reload can fire twice for the same reason:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(
  `[check-reload-loop] ${guarded} load-path reloads, every one behind a one-shot `
  + `marker; ${handlers} triggered by a person.`);
