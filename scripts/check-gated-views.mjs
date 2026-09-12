// Fails the build when a link to something you own renders nothing to a
// signed-out visitor.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// Ellie, from the app: "I clicked the 'start shared budgeting' and it took me
// to the website but a blank page."
//
// Blank, exactly. /app?view=budget renders
//
//     {view === "budget" && pkg.hasBudget && (...)}
//
// and with no session there is no pkg, so the condition is false and the page
// is a header and a back link. Twenty-eight characters. The redirect that
// exists for this does not fire either: it tests `need && pkg && !pkg[need]`,
// and a missing pkg fails that rather than tripping it.
//
// Anyone following a link to an owned page without a session hit this, which
// is every hand-off from the app, every bookmark opened in another browser,
// and every link shared with a partner.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// The auth form opens for a gated view, and the list of gated views is
// derived rather than written down: tool views are the catalogue's own keys,
// exercise views come from the exercise registry with their capability. A
// seventh purchasable thing is covered the day it is added.
//
// It does not check what the page looks like once you are signed in and do
// not own the thing. That is the redirect above, and it works.

import { readFileSync } from 'fs';
import { CATALOGUE } from '../api/_catalogue.js';
import { EXERCISES } from '../api/_exercises.js';

const ROOT = new URL('..', import.meta.url).pathname;
const src = readFileSync(ROOT + 'src/App.jsx', 'utf8');
const problems = [];

const tools = CATALOGUE.filter((c) => c.kind === 'tool').map((c) => c.key);
const owned = EXERCISES.filter((e) => e.capability).map((e) => e.view);
const gated = [...new Set([...tools, ...owned])];

if (gated.length < 4) {
  console.error(`[check-gated-views] only found ${gated.length} gated views; refusing to pass.`);
  process.exit(1);
}

// The auth form has to open for them.
if (!/_urlGatedView/.test(src)) {
  problems.push(
    'src/App.jsx does not work out whether the requested view is one you have to\n'
    + '      own, so a signed-out visitor to one renders whatever the gate leaves\n'
    + '      behind, which was nothing.');
} else {
  const init = src.match(/useState\(!isLoggedIn && \(([^)]*)\)\)/);
  if (!init || !/_urlGatedView/.test(init[1])) {
    problems.push(
      'the auth form does not open for a gated view. _urlGatedView is computed and\n'
      + '      then not used, which is the same blank page with more code.');
  }
  // And it must be derived, not typed out.
  const block = src.slice(src.indexOf('const _urlGatedView'), src.indexOf('const _urlGatedView') + 700);
  if (!/CATALOGUE/.test(block) || !/EXERCISES/.test(block)) {
    problems.push(
      'the gated view list is written out rather than derived from CATALOGUE and\n'
      + '      EXERCISES, so the next thing someone can buy will not be on it.');
  }
}

if (problems.length) {
  console.error('[check-gated-views] a link to an owned page can render nothing:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`[check-gated-views] ${gated.length} views you have to own; all open the auth form when signed out.`);
