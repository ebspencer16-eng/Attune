#!/usr/bin/env node
/**
 * A sentence that lives in a copy module is not typed anywhere else.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * Ellie asked for a gate after I planted one: I replaced an imported constant,
 * INTIMACY_ALL_ALIGNED, with the identical sentence written out inline, ran the
 * five gates that look after copy reaching both surfaces, and all five passed.
 * check-results-copy-reach is scoped to JSX text in src/App.jsx, which is where
 * that failure kept happening, and a string inside a server module is a
 * different shape it cannot see.
 *
 * It matters because an inlined sentence is a sentence your edit will not reach.
 * Nothing breaks, nothing errors, and the two copies drift apart quietly until a
 * customer reads the old one.
 *
 * ── WHY THIS SHAPE AND NOT THE TWO OBVIOUS ONES ───────────────────────────
 * I tried both and measured them before writing this.
 *
 * "No sentence literals in a logic module" flagged 715 lines. Modules like
 * api/_budget.js and api/_checklist.js hold their own copy by design and always
 * have, so the rule would have been loosened until it matched nothing.
 *
 * "No sentence literals in a module that already imports copy" flagged 123, for
 * the same reason: api/_lib/reflection-insights.js holds its prompts and also
 * imports from a prose file, and both are correct.
 *
 * The rule that isolates the bug is narrower and exact. Take every sentence that
 * already HAS a home, by reading the copy modules rather than parsing them, and
 * forbid that exact string anywhere else. There is no judgement in it: either a
 * sentence has a home and is repeated, or it does not. On the codebase as it
 * stands that is 470 sentences and one violation, which is the calibration a gate
 * needs before it is trusted.
 *
 * ── WHAT IT FOUND ─────────────────────────────────────────────────────────
 * src/App.jsx had typed out both lines of ABOUT_YOU, a module it already
 * imports, and the two had already drifted: the website said "Tell us about
 * yourself" where the module, and therefore the app, said "yourselves".
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Copy that lives in only one place. Most of the product's prose is like that
 * and this says nothing about it; check-results-copy-reach covers the direction
 * where a sentence should have been in a shared module and never got there.
 *
 * Short strings. Forty characters and a space, because a label like "Continue"
 * appears in twenty places for good reasons and always will.
 *
 * Where the sentence appears in the other file. A string in a comment is as much
 * a second copy as one in a render, since the comment is what somebody reads
 * when they go looking for the wording.
 *
 * A copy module that stops exporting a sentence. Nothing then has a home, so
 * nothing is compared, and that was planted. It costs nothing to leave uncovered
 * because it cannot ship: every importer breaks and `vite build` reported five
 * errors on the plant. Verified rather than assumed.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

/** Every server module, and the one file the website renders from. */
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.js$/.test(p)) files.push(p.replace(ROOT, ''));
  }
})(join(ROOT, 'api'));
files.push('src/App.jsx');

/**
 * A copy module: one whose job is to hold words.
 *
 * Named rather than guessed, because the distinction is a naming convention this
 * project already keeps. A module that holds copy and is not named this way is
 * not covered, which is a gap in the convention rather than in the check.
 */
const isCopyModule = (p) => /-prose\.js$|-copy\.js$|_content\//.test(p);
const copyModules = files.filter(isCopyModule);

if (copyModules.length < 5) {
  console.error(`[check-copy-has-one-home] found ${copyModules.length} copy modules.`
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

/**
 * Every sentence that has a home, by importing the module and walking what it
 * exports. Reading the values rather than parsing the source, so a sentence
 * nested three objects deep counts the same as a top-level constant.
 */
const home = new Map();
const walkValue = (v, mod) => {
  if (typeof v === 'string') {
    if (v.length >= 40 && /\s/.test(v)) home.set(v, mod);
    return;
  }
  if (Array.isArray(v)) { v.forEach((x) => walkValue(x, mod)); return; }
  if (v && typeof v === 'object') { Object.values(v).forEach((x) => walkValue(x, mod)); }
};
for (const f of copyModules) {
  let m;
  try { m = await import(`${ROOT}${f}`); } catch { continue; }
  for (const v of Object.values(m)) walkValue(v, f);
}

if (home.size < 100) {
  console.error(`[check-copy-has-one-home] only ${home.size} sentences have a home,`
    + ' which is far fewer than this product has. Refusing to pass.');
  process.exit(1);
}

const fails = [];
for (const f of files) {
  if (isCopyModule(f)) continue;
  const src = readFileSync(`${ROOT}${f}`, 'utf8');
  for (const [text, mod] of home) {
    if (!src.includes(text)) continue;
    fails.push(`${f} contains a sentence that lives in ${mod}:\n      "${text.slice(0, 90)}${text.length > 90 ? '…' : ''}"\n`
      + '      Import it. A second copy is a sentence Ellie\'s edit will not reach,'
      + ' and nothing errors when the two drift: a customer just reads the old one.');
  }
}

if (fails.length) {
  console.error('\n check-copy-has-one-home: a sentence is written in two places.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`[check-copy-has-one-home] ${home.size} sentences across ${copyModules.length}`
  + ` copy modules, none of them written out again in the other ${files.length - copyModules.length} files.`);
