// Fails the build when an endpoint can serve one partner the other's Conflict
// Patterns.
//
// ── THE RULE, NOT THE CURRENT STATE ────────────────────────────────────────
// This checks one specific promise. The Conflict Patterns screen tells the
// customer, in words that ship:
//
//   "Not visible to your partner. This is the one section that stays private,
//    always."
//
// (`patternsPrivacy` in api/_conflict-results-prose.js.)
//
// So the rule is: a partner never receives another person's pattern fields.
// It is not "partner data is private", and this gate is deliberately narrow so
// nobody reads it as that.
//
// Two things are explicitly NOT violations, and the gate proves it rather than
// staying silent:
//
//   - Physical Intimacy. Designed as "questions, side by side": both people
//     answer independently and then see both positions. That is the feature.
//     No promise was ever made that it is private between partners.
//   - The conflict fields shared by design: how conflict feels overall, what
//     helps each person reset, the opening choices, and the three written
//     answers. Those are in partnerView on purpose, and a gate that failed on
//     them would be pushing the product somewhere it never agreed to go.
//
// ── WHY IT SCANS EVERY ENDPOINT ────────────────────────────────────────────
// The previous version of this rule lived inside check-conflict-privacy.mjs
// and tested one endpoint. /api/partner-sync returned the whole conflict
// record, patterns included, and had done since it was written. One door
// watched, one open. This one checks every file under api/.

import { readFileSync, readdirSync } from 'fs';
import { holdsColumn, responseLeaks } from './_lib/source-scan.mjs';
import { EXERCISE_COLUMNS } from '../api/_exercises.js';

const apiDir = new URL('../api/', import.meta.url);
const problems = [];

// ── WHAT THIS CHECKS, AND WHAT ITS SIBLING CHECKS ──────────────────────────
// check-conflict-privacy.mjs proves partnerView itself carries no pattern
// data, and that it still carries the fields the screens need. This one
// proves no endpoint bypasses partnerView by returning the raw record.
// Two halves of one rule, not two versions of it.
//
// conflict_data holds the pattern answers. Reading it to summarise is correct;
// putting it in a response is the violation. intimacy_data is not checked, on
// purpose: see the header.
let readers = 0;

function scan(dir, prefix = '') {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) { scan(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`); continue; }
    if (!entry.name.endsWith('.js')) continue;
    const rel = `${prefix}${entry.name}`;
    const text = readFileSync(new URL(entry.name, dir), 'utf8');
    // Named directly, or selected through EXERCISE_COLUMNS.
    if (!holdsColumn(text, 'conflict_data', EXERCISE_COLUMNS)) continue;
    readers++;

    const lines = text.split('\n');
    // Every way the column can reach a response is decided by
    // scripts/_lib/source-scan.mjs, shared with check-intimacy-privacy.mjs.
    // The two gates ask one question about two columns, and they had drifted
    // into asking it differently: this one knew about a spread of the whole
    // row and that one did not, and neither knew about the registry.
    for (const leak of responseLeaks(lines, 'conflict_data')) {
      problems.push({ where: `api/${rel}:${leak.line}`, why: leak.why, line: leak.text });
    }
  }
}
scan(apiDir);

if (problems.length) {
  console.error("[check-partner-privacy] a partner could receive another person's conflict patterns:");
  for (const p of problems) {
    console.error(`  ${p.where}  ${p.why}`);
    if (p.line) console.error(`    ${p.line}`);
  }
  console.error('');
  console.error('The Conflict Patterns screen promises the customer this section stays');
  console.error('private from their partner, always. Summarise server-side and send');
  console.error('partnerView from api/_lib/conflict-partner-view.js, which omits every');
  console.error('pattern field and keeps the ones shared by design.');
  process.exit(1);
}

console.log(`[check-partner-privacy] ${readers} endpoints read conflict_data, none return it. Intimacy is shared by design and not checked here.`);
