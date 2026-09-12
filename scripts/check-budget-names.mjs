// Fails the build when the two surfaces key a budget by different names.
//
// ── WHY THIS IS NOT COSMETIC ───────────────────────────────────────────────
// A budget stores incomes and personal spending as { [name]: amount }. The
// name is a key, not a label.
//
// The website writes account.name, which is profiles.name in full. The app's
// home payload sends firstName, the first word of it. Building the app screen
// against firstName would have meant a couple called "Ellie Bowman" writing
// their income under "Ellie Bowman" on a laptop and reading "Ellie" on a
// phone: each surface showing the other's figures as empty, and overwriting
// them on the next save.
//
// Nothing would have thrown. Both screens would have looked like they worked.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
//   1. /api/tool-data sends budgetNames from profiles.name, not a first word.
//   2. The app's budget screen takes its names from that payload and from
//      nothing else, in particular not from firstName.

import { readFileSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;
const endpoint = readFileSync(ROOT + 'api/tool-data.js', 'utf8');
const screen = readFileSync(ROOT + 'attune-app/src/components/budget.tsx', 'utf8');
const problems = [];

// 1. The endpoint sends them, whole.
if (!/budgetNames\s*:/.test(endpoint)) {
  problems.push('api/tool-data.js does not send budgetNames, so the app has to guess the key.');
}
if (!/you:\s*profile\.name/.test(endpoint)) {
  problems.push('budgetNames.you is not profiles.name, which is the key the website writes.');
}
if (/split\(\/\\s\+\/\)/.test(endpoint) || /\.split\(' '\)\[0\]/.test(endpoint)) {
  problems.push('api/tool-data.js shortens a name. A shortened name is a different key.');
}

// 2. The screen reads them from the payload and not from home.
if (!/budgetNames\?\.you/.test(screen)) {
  problems.push('the budget screen does not read budgetNames from its own payload.');
}
if (/firstName/.test(screen)) {
  problems.push(
    'the budget screen mentions firstName. That is the first word of the name,\n'
    + '      and the budget is keyed by the whole one.');
}

if (problems.length) {
  console.error('[check-budget-names] the two surfaces would key a budget differently:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('A budget is { [name]: amount }. A different name is a different budget,');
  console.error('and neither screen would show an error.');
  process.exit(1);
}

console.log('[check-budget-names] both surfaces key the budget by the full profile name.');
