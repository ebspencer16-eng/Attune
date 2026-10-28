/**
 * One canvas, two renderers.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie: "I know I approved this, but I was wrong, the coloring and order of
 * the categories for the add-on chart did not change."
 *
 * They had changed. Two functions drew `chart-pkg-addons`: one reading the
 * cube with a slicer, one reading the global ORDERS without. mkChart destroys
 * whatever is on the canvas first, so whichever ran last won, and the edit had
 * gone into the loser. Every gate passed, including the one written for that
 * exact list, because it matched the variable name in the copy nobody drew.
 *
 * ── WHAT THIS MEASURES ────────────────────────────────────────────────────
 * For every canvas id in public/admin.html, how many distinct places name it.
 * A getElementById or a `target:` naming the same canvas from two functions is
 * the shape; one function that draws it twice is not.
 */
import { readFileSync } from 'node:fs';

const src = readFileSync('public/admin.html', 'utf8');
const noComments = src.replace(/\/\*[\s\S]*?\*\//g, ' ');

const canvases = [...new Set([...src.matchAll(/<canvas[^>]*id="([^"]+)"/g)].map((m) => m[1]))];

/* Which function each line sits in: the nearest preceding top-level
   declaration. Crude on purpose, and enough to tell two functions apart. */
const lines = noComments.split('\n');
const owners = [];
let current = '(top level)';
for (const line of lines) {
  /* Only a TOP-LEVEL function starts a new owner. The first version also
     took indented `const dist = (` as an owner, which split one renderer
     into three and reported it as three renderers. An inner helper belongs
     to the function it is written inside. */
  const m = /^(?:async\s+)?function\s+([A-Za-z0-9_$]+)/.exec(line);
  if (m) current = m[1];
  owners.push(current);
}

const findings = [];
for (const id of canvases) {
  const who = new Set();
  lines.forEach((line, i) => {
    /* The markup is where the canvas is declared, not a renderer. Counting it
       gave every canvas two owners and the sweep "found" 38 of 48. */
    if (line.includes('<canvas')) return;
    if (line.includes(`'${id}'`) || line.includes(`"${id}"`)) who.add(owners[i]);
  });
  if (who.size > 1) findings.push({ id, who: [...who] });
}

console.log(`[sweep-two-renderers] ${canvases.length} canvases in public/admin.html.`);
if (!findings.length) {
  console.log('  nothing: every canvas is named from one place.');
} else {
  console.log(`  ${findings.length} named from more than one place:`);
  for (const f of findings) console.log(`    ${f.id.padEnd(24)} ${f.who.join(', ')}`);
  console.log('  Two renderers on one canvas is a race: mkChart destroys the old chart,');
  console.log('  so whichever runs last wins and an edit to the other is invisible.');
}
