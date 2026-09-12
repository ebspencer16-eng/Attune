// Fails the build when a link can ask the website for a view it cannot draw.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// /app?view=practice rendered sixteen characters: the header, and nothing
// else. No error, no redirect, no content. The same blank page Ellie reported
// for "start shared budgeting", arrived at from a different direction.
//
// That link is not hypothetical. api/_lib/pick-up.js offers In Practice as a
// card and api/_lib/notifications.js announces a new post, and both give the
// destination as `/?view=practice`. The app reads that deepLink and routes it
// to the Resources tab, correctly. The website had no view by that name and
// said nothing about it.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// 1. RENDERABLE_VIEWS in src/App.jsx lists exactly the views that file draws,
//    where "draws" means it compares `view` against that name. A view in the
//    set that nothing draws would let a dead link through; one that is drawn
//    but missing from the set is unreachable, because the set is now the gate
//    the URL passes through.
// 2. Every ?view= any server module hands out is either in that set or in
//    VIEW_ALIASES, which is how `practice` reaches Resources.
//
// The second half is the one that found the bug. It matters because the two
// surfaces read the same deepLink and only one of them had been taught the
// whole vocabulary: scripts/check-app-routes.mjs already proves the app can
// follow every route the engine emits, and nothing proved the same for the
// website.
//
// ── WHAT IT DOES NOT COVER ─────────────────────────────────────────────────
// Whether a view renders anything useful once reached. check-render.mjs draws
// all of them in a real browser and is where that question belongs.

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const app = readFileSync(join(ROOT, 'src/App.jsx'), 'utf8');

// ── The declared set ──────────────────────────────────────────────────────
const declaredBlock = app.match(/const RENDERABLE_VIEWS = new Set\(\[([\s\S]*?)\]\);/);
if (!declaredBlock) {
  console.error('[check-app-views] RENDERABLE_VIEWS is not in src/App.jsx; refusing to pass.');
  process.exit(1);
}
const declared = new Set([...declaredBlock[1].matchAll(/"([a-zA-Z0-9_-]+)"/g)].map((m) => m[1]));

// ── What the file actually draws ──────────────────────────────────────────
const drawn = new Set([...app.matchAll(/view\s*===\s*["']([a-zA-Z0-9_-]+)["']/g)].map((m) => m[1]));
// `results` is reached through the results experience rather than a lone
// comparison in this file, and check-render covers it section by section.
drawn.add('results');

// ── Aliases: a name that means a view under another name ──────────────────
const aliasBlock = app.match(/const VIEW_ALIASES = \{([^}]*)\}/);
const aliases = new Map(
  [...(aliasBlock?.[1] || '').matchAll(/(\w+):\s*["'](\w+)["']/g)].map((m) => [m[1], m[2]]),
);

const problems = [];

for (const v of declared) {
  if (!drawn.has(v)) {
    problems.push(
      `RENDERABLE_VIEWS lists "${v}" and nothing in src/App.jsx draws it.\n`
      + '      The set is what a URL is checked against, so this lets a dead link through.');
  }
}
for (const v of drawn) {
  if (!declared.has(v)) {
    problems.push(
      `src/App.jsx draws "${v}" and RENDERABLE_VIEWS does not list it.\n`
      + '      Anyone linking to it is sent to home instead.');
  }
}
for (const [from, to] of aliases) {
  if (!declared.has(to)) {
    problems.push(`VIEW_ALIASES sends "${from}" to "${to}", which is not a view that exists.`);
  }
}

// ── Every ?view= the server hands out ─────────────────────────────────────
const serverFiles = [];
(function walk(d) {
  for (const f of readdirSync(join(ROOT, d))) {
    const rel = join(d, f);
    if (statSync(join(ROOT, rel)).isDirectory()) { walk(rel); continue; }
    if (/\.(js|mjs)$/.test(f)) serverFiles.push(rel);
  }
})('api');

let emitted = 0;
for (const rel of serverFiles) {
  const src = readFileSync(join(ROOT, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|\s)\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));
  for (const m of src.matchAll(/[?&]view=([a-zA-Z0-9_-]+)/g)) {
    const v = m[1];
    emitted += 1;
    if (declared.has(v) || aliases.has(v)) continue;
    problems.push(
      `${rel} hands out ?view=${v}, which the website cannot draw.\n`
      + '      The app may route it somewhere sensible and the website will show\n'
      + '      a header and nothing else. Add it to RENDERABLE_VIEWS if it is a\n'
      + '      view, or to VIEW_ALIASES if it means one under another name.');
  }
}

// ── Path-shaped deepLinks ─────────────────────────────────────────────────
// `/feedback` is a page in public/, not a view in the portal. The same scan
// has to cover it, or moving a page leaves a card pointing at a 404 and the
// ?view= half of this gate would never notice.
let paths = 0;
for (const rel of serverFiles) {
  const src = readFileSync(join(ROOT, rel), 'utf8');
  for (const m of src.matchAll(/deepLink:\s*'(\/[a-z0-9-]+)'/g)) {
    const path = m[1];
    paths += 1;
    const page = join(ROOT, 'public', `${path.slice(1)}.html`);
    let exists = false;
    try { exists = statSync(page).isFile(); } catch { exists = false; }
    if (!exists) {
      problems.push(
        `${rel} hands out ${path}, and public${path}.html does not exist.\n`
        + '      A card pointing at a page that is not there is a 404 with a\n'
        + '      cheerful label on it.');
    }
  }
}

if (!emitted) {
  console.error('[check-app-views] found no ?view= links in api/; refusing to pass.');
  process.exit(1);
}

if (problems.length) {
  console.error('[check-app-views] a link asks for a view that does not exist:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(
  `[check-app-views] ${declared.size} views, ${aliases.size} alias`
  + `${aliases.size === 1 ? '' : 'es'}, ${emitted} view links and ${paths} page links; `
  + 'every one lands somewhere.');
