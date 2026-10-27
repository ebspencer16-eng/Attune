/**
 * Every class the admin puts on an element, against every class it styles.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * `.btn` had no rule anywhere. Two buttons carry it, Refresh on Engagement and
 * "Show all" under a long table, and both rendered as a bare browser control
 * in a page where every other button is a bordered pill. A class with no
 * stylesheet behind it looks exactly like a styling decision, which is why it
 * survived: nothing is broken, it is just wrong, and only someone who knows
 * what the other buttons look like would question it.
 *
 * ── WHAT IT CANNOT SEE ────────────────────────────────────────────────────
 * A class that exists only to be found by JavaScript, `.tab-panel` and
 * `.qx-section` among them, is correctly unstyled. Those are reported as a
 * separate list rather than as findings, because the interesting answer is
 * "styled nowhere AND queried nowhere", which is a class doing nothing at all.
 *
 * Class names built by concatenation are counted and reported unresolved.
 */
import { readFileSync } from 'node:fs';

const FILE = process.argv[2] || 'public/admin.html';
const src = readFileSync(FILE, 'utf8');

/* Styled: every selector token in a <style> block. */
const styled = new Set();
for (const block of src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
  for (const m of block[1].matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) styled.add(m[1]);
}

/* Used: class="..." in markup and in strings the page builds. */
const used = new Map();
let unresolved = 0;
const lineOf = (i) => src.slice(0, i).split('\n').length;
for (const m of src.matchAll(/class\s*=\s*\\?["']([^"'<>]*)\\?["']/g)) {
  const v = m[1];
  if (/\$\{|'\s*\+|\+\s*'/.test(v)) { unresolved++; continue; }
  for (const c of v.split(/\s+/).filter(Boolean)) {
    if (!/^-?[A-Za-z_][\w-]*$/.test(c)) continue;
    if (!used.has(c)) used.set(c, lineOf(m.index));
  }
}
for (const m of src.matchAll(/classList\.(?:add|toggle|remove)\(\s*["']([\w-]+)["']/g)) {
  if (!used.has(m[1])) used.set(m[1], lineOf(m.index));
}
for (const m of src.matchAll(/className\s*=\s*["']([^"']+)["']/g)) {
  for (const c of m[1].split(/\s+/).filter(Boolean)) if (!used.has(c)) used.set(c, lineOf(m.index));
}

/* Queried: a class the code looks for is doing a job without a rule. */
const queried = new Set();
for (const m of src.matchAll(/querySelector(?:All)?\(\s*["'][^"']*\.([\w-]+)/g)) queried.add(m[1]);
for (const m of src.matchAll(/classList\.contains\(\s*["']([\w-]+)["']/g)) queried.add(m[1]);
for (const m of src.matchAll(/closest\(\s*["']\.([\w-]+)["']/g)) queried.add(m[1]);

const bare = [...used.entries()].filter(([c]) => !styled.has(c));
const doingNothing = bare.filter(([c]) => !queried.has(c));
const forScript = bare.filter(([c]) => queried.has(c));

console.log(`[sweep-undefined-classes] ${FILE}`);
console.log(`  ${styled.size} classes styled, ${used.size} used on an element, `
  + `${unresolved} class attributes built by concatenation and not resolved here.`);
console.log(`  ${forScript.length} unstyled but queried by script, which is correct: `
  + forScript.map(([c]) => c).sort().join(', '));
if (!doingNothing.length) { console.log('  Every other class used has a rule.'); process.exit(0); }
console.log(`  ${doingNothing.length} used, styled nowhere, queried nowhere:`);
for (const [c, line] of doingNothing.sort()) console.log(`    ${c.padEnd(26)} first used at line ${line}`);
