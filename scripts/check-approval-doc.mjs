// Fails the build when the copy-review document shows copy the product cannot
// render.
//
// ── WHY THIS EXISTS ────────────────────────────────────────────────────────
// Section 7 of the approval document, "Action plan items", showed
// DIM_ACTION_ITEMS: ten items with titles like "Say when you are running
// empty". The product has never rendered them. What a customer actually sees
// is a different nine, PROTOCOLS in api/_lib/comms-plan.js, with titles like
// "Name your recharge needs".
//
// So ten pieces of copy were reviewed and approved that nobody has ever read,
// while nine that ship went through no review at all. The cost is not the
// wasted hours. It is that we believed the action-plan copy was approved.
//
// A review document that shows unshipped copy is worse than no document,
// because it manufactures confidence.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// Every content constant the document presents as shipped must be reachable by
// the product: something under api/ or src/ that is not itself a document
// generator has to read it.
//
// Copy shown as a PROPOSAL is exempt, and has to say so. That is the whole
// point of the exemption: unshipped copy may appear in the document as long as
// it is labelled, so that approved work is not thrown away and the choice
// stays with whoever writes copy.

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const doc = readFileSync(join(ROOT, 'scripts/build_prose_approval_doc.mjs'), 'utf8');

/** Everything the document pulls out of the content snapshot. */
const presented = [...doc.matchAll(/evalConst\(content,\s*'(\w+)'\)/g)].map((m) => m[1]);

/** Constants the document explicitly presents as a proposal rather than shipped. */
const PROPOSAL = (() => {
  const at = doc.indexOf('PROPOSAL, NOT SHIPPED');
  if (at === -1) return new Set();
  // Only as far as the next section banner. Reading to the end of the file
  // would exempt every later section too, which would quietly turn this check
  // off for most of the document.
  const next = doc.indexOf('// ── ', doc.indexOf('\n', at));
  const block = doc.slice(at, next === -1 ? undefined : next);
  return new Set([...block.matchAll(/Object\.entries\((\w+)\)/g)].map((m) => m[1]));
})();

/** Source the product actually ships, excluding the generators themselves. */
function productSource(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) productSource(p, out);
    else if (/\.(js|jsx|ts|tsx)$/.test(e.name) && !e.name.startsWith('build_')) out.push(p);
  }
  return out;
}
const files = [...productSource(join(ROOT, 'api')), ...productSource(join(ROOT, 'src'))]
  .filter((f) => !relative(ROOT, f).startsWith('api/_content/'));
const source = files.map((f) => readFileSync(f, 'utf8')).join('\n');

const problems = [];
for (const name of new Set(presented)) {
  if (PROPOSAL.has(name)) continue;
  // A real read, not a mention in a comment.
  const read = source.split('\n').some((l) => l.includes(name) && !/^\s*(\/\/|\*|\/\*)/.test(l));
  if (!read) {
    problems.push(
      `${name} is presented as shipped copy, and nothing under api/ or src/ reads it.`
      + '\n      Either the product should use it, or the document should label it a proposal.');
  }
}

if (problems.length) {
  console.error('[check-approval-doc] the review document shows copy the product does not ship:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('Reviewing copy nobody sees is worse than not reviewing: it makes us believe');
  console.error('the shipped copy was approved when it never was.');
  process.exit(1);
}

console.log(`[check-approval-doc] ${new Set(presented).size} content sets in the review document; `
  + `${PROPOSAL.size} labelled as proposals, the rest reachable by the product.`);
