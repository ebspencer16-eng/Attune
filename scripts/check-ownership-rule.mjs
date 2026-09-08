// Fails the build when an endpoint works out for itself what a couple owns.
//
// The rule was written out three times inside api/home.js alone: once for the
// exercise capabilities, once for the flat owned list, and once more for the
// budget and checklist resources. Results was about to become a fourth.
//
// This endpoint had already shipped the bug that comes with copies. Premium
// bundles Conflict Patterns and not Physical Intimacy. One copy said the
// opposite, so a premium buyer was told they owned intimacy, which they had
// not bought, and never told they owned conflict, which they had.
//
// api/_lib/ownership.js is the rule. Everything else asks it.

import { readFileSync, readdirSync } from 'fs';

const apiDir = new URL('../api/', import.meta.url);
const OWNER = '_lib/ownership.js';

// A package name tested against a package field is the fingerprint of a copy.
// Matching on the add-on columns alone would flag every honest select list.
const COPY = /(?:pkg|package|pkg_key)\s*===?\s*['"](?:premium|newlywed|anniversary)['"]/;

const problems = [];

function scan(dir, prefix = '') {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) { scan(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`); continue; }
    if (!entry.name.endsWith('.js')) continue;
    const rel = `${prefix}${entry.name}`;
    if (rel === OWNER) continue;
    // The entitlements engine is the other half of this: it turns order rows
    // into capabilities, where package names are the subject matter.
    if (rel === '_lib/entitlements.js') continue;

    const text = readFileSync(new URL(entry.name, dir), 'utf8');
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      // A line of prose about packages is not a rule about packages.
      if (/^\s*(\/\/|\*|\/\*)/.test(lines[i])) continue;
      if (COPY.test(lines[i])) problems.push({ file: rel, line: i + 1, text: lines[i].trim().slice(0, 90) });
    }
  }
}
scan(apiDir);

if (problems.length) {
  console.error('[check-ownership-rule] endpoints deciding ownership for themselves:');
  for (const p of problems) console.error(`  api/${p.file}:${p.line}  ${p.text}`);
  console.error('');
  console.error('Ask api/_lib/ownership.js instead: capabilitiesFor(profile) returns');
  console.error('ownsReflection, ownsIntimacy, ownsConflict, ownsBudget, ownsChecklist,');
  console.error('ownsWorkbook, a caps map keyed the way api/_exercises.js names them,');
  console.error('and a flat owned list.');
  process.exit(1);
}

console.log('[check-ownership-rule] ownership is decided in one place.');
