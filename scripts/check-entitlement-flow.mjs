// Fails the build when an add-on the entitlement engine grants cannot reach
// the UI.
//
// The client rebuilds its order object in about a dozen places: on sign-in,
// on entitlement recompute, on partner inheritance, from a stored order, from
// an order row. Each one lists the add-ons explicitly.
//
// When the How You Fight add-on was added, every one of those sites was
// missed. The database flag was set, the entitlement engine returned
// addonConflict correctly, and the exercise still never appeared, because the
// object the UI reads was assembled without it. Nothing failed and nothing
// logged.
//
// This compares the add-on fields the shared entitlement engine returns
// against the fields the client carries, so a granted add-on cannot silently
// stop at the boundary again.

import { readFileSync } from 'fs';

const engine = readFileSync(new URL('../api/_lib/entitlements.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

// What computeEntitlements returns, read from its return statement rather than
// restated here.
const ret = engine.match(/return \{ comp: false[\s\S]*?\};/);
if (!ret) {
  console.error('[check-entitlement-flow] could not find the computeEntitlements return.');
  process.exit(1);
}
const granted = [...new Set([...ret[0].matchAll(/\b(addon[A-Z]\w*)/g)].map(m => m[1]))].sort();

// Every line in App.jsx that assigns an add-on into an object literal.
const lines = app.split('\n');
const assignLines = lines
  .map((l, i) => ({ n: i + 1, l }))
  .filter(({ l }) => /\baddon[A-Z]\w*:\s/.test(l));

// Group by the object being built: a run of consecutive assigning lines.
const blocks = [];
let current = null;
for (const { n, l } of assignLines) {
  if (current && n <= current.end + 2) { current.end = n; current.text += '\n' + l; }
  else { current = { start: n, end: n, text: l }; blocks.push(current); }
}

const problems = [];
for (const b of blocks) {
  const present = granted.filter(k => new RegExp(`\\b${k}\\b`).test(b.text));
  // A block mentioning several add-ons is building an order object. One
  // mentioning a single add-on is usually a targeted read, not a rebuild.
  if (present.length < 2) continue;
  const missing = granted.filter(k => !present.includes(k));
  if (missing.length) problems.push({ line: b.start, missing });
}

if (problems.length) {
  console.error('[check-entitlement-flow] add-ons the engine grants but the client drops:');
  for (const p of problems) console.error(`  src/App.jsx:${p.line}  missing: ${p.missing.join(', ')}`);
  console.error(`  engine grants: ${granted.join(', ')}`);
  console.error('Add the missing field, or a purchased add-on will never appear in the UI.');
  process.exit(1);
}

console.log(`[check-entitlement-flow] ${granted.length} add-ons carried through ${blocks.filter(b => granted.filter(k => b.text.includes(k)).length >= 2).length} order-building sites.`);
