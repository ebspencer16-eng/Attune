// Fails the build when the app restates a list the server owns.
//
// CLAUDE.md named three of these: EXERCISES in insights.tsx, CATALOGUE and
// CATEGORIES in resources.tsx. All three were lists typed out by hand in
// attune-app/, each mirroring something the server already knew. Add an add-on
// or a shelf and the site changed while the app went on showing the old set,
// with nothing failing and no error anywhere.
//
// The exercise list has its own gate (check-exercise-registry.mjs, which keys
// off api/_exercises.js). This covers the other two: the purchasable catalogue
// in api/_catalogue.js and the In Practice shelves in api/_lib/post-categories.js.
//
// The rule is the same shape as the exercise gate. Naming two or more members
// of a server-owned list is how a hand-maintained copy starts. The app should
// be rendering what /api/home and /api/posts return, so a screen has no reason
// to contain these strings at all.

import { readFileSync, readdirSync, statSync } from 'fs';
import { CATALOGUE } from '../api/_catalogue.js';
import { POST_CATEGORIES } from '../api/_lib/post-categories.js';

const APP_SRC = new URL('../attune-app/src/', import.meta.url);

/** Every source file under attune-app/src. */
function sources(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = new URL(entry, dir);
    if (statSync(full).isDirectory()) { out.push(...sources(new URL(`${entry}/`, dir))); continue; }
    if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const GROUPS = [
  {
    // Fingerprinted on blurbs, not labels.
    //
    // Labels collide: 'Conflict Patterns' and 'Physical Intimacy' are also
    // results section names, so matching on those flagged the section map in
    // constants/anchors.ts, which is a different list that merely shares words.
    // A gate that fires for the wrong reason is worse than no gate.
    //
    // A blurb is customer-facing copy written for the catalogue and nowhere
    // else, so it appears in the app only if someone copied the catalogue.
    name: 'purchasable catalogue',
    items: CATALOGUE.map(i => i.blurb),
    source: 'api/_catalogue.js, returned by /api/home as `catalogue`',
  },
  {
    name: 'In Practice shelves',
    items: POST_CATEGORIES,
    source: 'api/_lib/post-categories.js, returned by /api/posts as `categories`',
  },
];

const problems = [];

for (const file of sources(APP_SRC)) {
  const text = readFileSync(file, 'utf8');
  const rel = file.pathname.slice(file.pathname.indexOf('attune-app/'));

  for (const group of GROUPS) {
    // Quoted, which is how a list writes a member. A label appearing in prose
    // in a comment is someone explaining the rule, not restating it.
    const present = group.items.filter(
      item => new RegExp(`['"\`]${item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`).test(text));
    if (present.length >= 2) problems.push({ rel, group, present });
  }
}

if (problems.length) {
  console.error('[check-app-derives] the app restates a list the server owns:');
  for (const p of problems) {
    console.error(`  ${p.rel}`);
    console.error(`    ${p.group.name}: ${p.present.join(', ')}`);
    console.error(`    derive from ${p.group.source}`);
  }
  console.error('');
  console.error('Render what the endpoint returns. A hand-copied list goes stale');
  console.error('the moment someone adds an add-on or a shelf, and nothing fails.');
  process.exit(1);
}

const counted = GROUPS.map(g => `${g.items.length} ${g.name}`).join('; ');
console.log(`[check-app-derives] ${counted}; no app-side copies.`);
