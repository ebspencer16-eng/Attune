// Fails the build when the "this week" protocols stop having one home.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// The nine protocols existed twice: as a literal in src/App.jsx and as
// PROTOCOLS in api/_lib/comms-plan.js. Same nine dimensions, same titles, same
// instructions, maintained by hand in two files with nothing checking them.
//
// They had drifted. The listening title read "Match presence to what's needed"
// on the website with a straight apostrophe, and with a curly one on the
// server, which is what the app reads. One character, and nobody would ever
// have found it by looking. Package inclusion started in exactly this shape
// and ended up in four places.
//
// src/App.jsx now calls commsProtocols. This is what stops it drifting back.
//
// ── AND THE DIMENSION WITH NO PROTOCOL ─────────────────────────────────────
// There are ten communication dimensions and nine protocols. A couple whose
// widest gap in a domain is Reassurance sees nothing under "This week" for it.
//
// That is flagged rather than failed, because the fix is a piece of copy that
// has to be written by whoever writes copy, and a build that cannot pass until
// someone writes a sentence is a build that gets its check deleted. It is in
// the approval document as section 7's missing item, which is where a decision
// about it will actually be made.

import { readFileSync } from 'fs';
import { PROTOCOLS } from '../api/_lib/comms-plan.js';
import { DIM_KEYS } from '../api/_type-engine.js';

const problems = [];
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

// ── One home ───────────────────────────────────────────────────────────────
// A second copy announces itself by containing the protocol titles.
const titles = PROTOCOLS.map(([, title]) => title);
const inApp = titles.filter((t) => app.includes(t));
if (inApp.length) {
  problems.push(
    `src/App.jsx contains ${inApp.length} protocol title(s) of its own: ${inApp.slice(0, 3).join('; ')}`
    + '\n      It should call commsProtocols from api/_lib/comms-plan.js instead.');
}
if (!/\bcommsProtocols\b/.test(app)) {
  problems.push('src/App.jsx no longer calls commsProtocols. The website and the app would drift.');
}

// ── The list itself is well formed ─────────────────────────────────────────
for (const [dim, title, thisWeek] of PROTOCOLS) {
  if (!dim || !title || !thisWeek) problems.push(`a protocol is missing a field: ${JSON.stringify([dim, title])}`);
  if (!(dim in DIM_KEYS)) problems.push(`protocol "${title}" names ${dim}, which is not a dimension`);
}
const seen = new Set();
for (const [dim] of PROTOCOLS) {
  if (seen.has(dim)) problems.push(`two protocols for ${dim}`);
  seen.add(dim);
}

if (problems.length) {
  console.error('[check-protocols] the protocol list is drifting:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

const missing = Object.keys(DIM_KEYS).filter((d) => !seen.has(d));
console.log(`[check-protocols] ${PROTOCOLS.length} protocols, one copy, read by both surfaces.`);
if (missing.length) {
  console.log(`[check-protocols] no protocol yet for: ${missing.join(', ')}. `
    + 'A couple whose widest gap is one of these sees nothing under "This week". '
    + 'Needs copy; flagged in the approval document.');
}
