// Fails the build when a results section has no screen in the app.
//
// The app used to show six of twenty-nine sections. The other twenty-three
// were not broken, they simply did not exist, and nothing anywhere said so:
// the website had them, the app did not, and the two were only comparable by
// opening both.
//
// Now every section routes. This keeps it that way. Add a section to
// RESULTS_SECTIONS and this fails until the app can draw it, which is the
// right order: the server decides what results contain, and the app is the one
// that has to keep up.

import { readFileSync } from 'fs';
import { RESULTS_SECTIONS } from '../api/_lib/results-sections.js';

const src = readFileSync(new URL('../attune-app/src/components/results.tsx', import.meta.url), 'utf8');

// Only the routing function. A section id mentioned in a comment or in a
// payload type is not a screen.
const start = src.indexOf('function SectionBody(');
const end = src.indexOf('\nfunction ', start + 10);
const routing = src.slice(start, end === -1 ? undefined : end);

const exact = new Set([...routing.matchAll(/section === '([a-z0-9-]+)'/g)].map((m) => m[1]));
const prefixes = [...routing.matchAll(/section\.startsWith\('([a-z0-9-]+)'\)/g)].map((m) => m[1]);

// ── SECTIONS REACHED THROUGH A LOOKUP ──────────────────────────────────────
// The three Communication domain pages used to be three `section === '...'`
// branches and are now one branch over a map, because they differ only in
// which domain they draw. This gate matched the literal, so the moment the
// literals moved into a table it reported two live screens as missing.
//
// That is the same blind spot the conflict privacy gate had: a checker that
// matches a name cannot see a name reached through a registry, and the fix is
// to resolve the registry rather than to give up the registry. Any object
// literal in the routing function whose keys are section ids counts.
for (const table of routing.matchAll(/Record<string,[^>]*>\s*=\s*\{([\s\S]*?)\}/g)) {
  for (const key of table[1].matchAll(/'([a-z0-9-]+)'\s*:/g)) exact.add(key[1]);
}

const missing = RESULTS_SECTIONS.filter(
  (id) => !exact.has(id) && !prefixes.some((p) => id.startsWith(p)));

if (missing.length) {
  console.error('[check-results-coverage] sections the server sends and the app cannot draw:');
  for (const id of missing) console.error(`  ${id}`);
  console.error('');
  console.error('Add a case to SectionBody in attune-app/src/components/results.tsx.');
  console.error('Falling through to the placeholder is not coverage: it tells the');
  console.error('reader their results are on the website instead.');
  process.exit(1);
}

console.log(`[check-results-coverage] all ${RESULTS_SECTIONS.length} results sections have a screen.`);
