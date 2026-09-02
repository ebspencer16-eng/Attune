// Fails the build when public/_pkg-rules.js has drifted from PKG_CAPS.
//
// The generated file is committed so the site works from a plain checkout,
// which means it can go stale if someone edits PKG_CAPS without regenerating.
// This catches that, and points at the one command that fixes it.

import { readFileSync } from 'fs';
import { PKG_CAPS } from '../api/_lib/entitlements.js';

const path = new URL('../public/_pkg-rules.js', import.meta.url);
let text;
try { text = readFileSync(path, 'utf8'); }
catch {
  console.error('[check-pkg-rules] public/_pkg-rules.js is missing.');
  console.error('Run: node scripts/build-pkg-rules.mjs');
  process.exit(1);
}

const m = text.match(/window\.ATTUNE_PKG_INCLUDED = (\{[\s\S]*?\n\});/);
if (!m) {
  console.error('[check-pkg-rules] could not parse the generated file.');
  process.exit(1);
}
const onDisk = JSON.parse(m[1]);

const expected = {};
for (const [key, cap] of Object.entries(PKG_CAPS)) {
  expected[key] = {
    reflection: !!cap.hasReflection,
    budget:     !!cap.hasBudget,
    checklist:  !!cap.hasChecklist,
    intimacy:   !!cap.hasIntimacy,
    conflict:   !!cap.hasConflict,
    workbook:   !!cap.hasWorkbook,
  };
}

const problems = [];
for (const pkg of Object.keys(expected)) {
  if (!onDisk[pkg]) { problems.push(`${pkg}: missing from the generated file`); continue; }
  for (const addon of Object.keys(expected[pkg])) {
    if (onDisk[pkg][addon] !== expected[pkg][addon]) {
      problems.push(`${pkg}.${addon}: PKG_CAPS says ${expected[pkg][addon]}, generated file says ${onDisk[pkg][addon]}`);
    }
  }
}
for (const pkg of Object.keys(onDisk)) {
  if (!expected[pkg]) problems.push(`${pkg}: in the generated file but not in PKG_CAPS`);
}

if (problems.length) {
  console.error('[check-pkg-rules] the generated package rules do not match PKG_CAPS:');
  for (const p of problems) console.error('  ' + p);
  console.error('');
  console.error('Run: node scripts/build-pkg-rules.mjs');
  console.error('Every static page reads that file, so a stale copy means the site');
  console.error('offers add-ons a package already includes, or hides ones it does not.');
  process.exit(1);
}

const n = Object.keys(expected).length;
console.log(`[check-pkg-rules] ${n} packages in sync between PKG_CAPS and public/_pkg-rules.js.`);
