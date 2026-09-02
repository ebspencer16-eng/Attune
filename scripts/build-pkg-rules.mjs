// Emits public/_pkg-rules.js from PKG_CAPS, so the static pages stop keeping
// their own copies of which add-ons each package includes.
//
// That rule lived by hand in four places: PKG_CAPS (the server), cart.js
// (PKG_INCLUDED), start.html (a block of `const xIncluded = id === '...'`), and
// the offerings comparison table. When Premium switched from Physical Intimacy
// to Conflict Patterns, three of the four were updated and start.html was not,
// so the main purchase path offered intimacy as included when it was not and
// never offered conflict at all.
//
// Run automatically before build. The generated file is committed so the site
// works from a plain checkout, and check-pkg-rules.mjs fails the build if it
// has drifted from PKG_CAPS.

import { writeFileSync, readFileSync } from 'fs';
import { PKG_CAPS } from '../api/_lib/entitlements.js';

const ADDONS = ['reflection', 'budget', 'checklist', 'intimacy', 'conflict', 'workbook'];

/** Which add-ons a package includes, derived from the capability flags. */
function includedFor(cap) {
  return {
    reflection: !!cap.hasReflection,
    budget:     !!cap.hasBudget,
    checklist:  !!cap.hasChecklist,
    intimacy:   !!cap.hasIntimacy,
    conflict:   !!cap.hasConflict,
    workbook:   !!cap.hasWorkbook,
  };
}

const rules = {};
for (const [key, cap] of Object.entries(PKG_CAPS)) rules[key] = includedFor(cap);

const body = `/* GENERATED FILE. Do not edit.
 *
 * Source: api/_lib/entitlements.js PKG_CAPS
 * Regenerate: node scripts/build-pkg-rules.mjs  (runs automatically on build)
 *
 * Which add-ons each package already includes. Every static page reads this
 * rather than restating it, because four hand-kept copies is how the start
 * flow ended up offering an add-on the package already bundled.
 */
window.ATTUNE_PKG_INCLUDED = ${JSON.stringify(rules, null, 2)};

/** True when this package already includes that add-on. */
window.attuneIncludedInPkg = function (pkg, addon) {
  var r = window.ATTUNE_PKG_INCLUDED[pkg];
  return !!(r && r[addon]);
};
`;

const out = new URL('../public/_pkg-rules.js', import.meta.url);
let existing = '';
try { existing = readFileSync(out, 'utf8'); } catch {}
if (existing !== body) {
  writeFileSync(out, body);
  console.log('[build-pkg-rules] wrote public/_pkg-rules.js');
} else {
  console.log('[build-pkg-rules] public/_pkg-rules.js already current');
}

for (const [k, v] of Object.entries(rules)) {
  const on = ADDONS.filter(a => v[a]);
  console.log(`  ${k.padEnd(12)} includes: ${on.join(', ') || 'nothing'}`);
}
