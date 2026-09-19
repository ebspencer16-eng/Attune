#!/usr/bin/env node
/**
 * The results nav's icons are outlined, and there is one for every section.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie, naming all eight: "All icons should be white outlined not filled in."
 *
 * In SF Symbols the outline is the base name and `.fill` is the solid one, so
 * the rule is that no name in the table ends in `.fill`. It is the kind of
 * decision that gets undone one icon at a time by whoever adds the ninth, and
 * one solid glyph in a row of outlines is the only one anyone looks at.
 *
 * The second half matters more: every group the server can send has to have an
 * icon. The table is a lookup rather than a list on purpose, so a new section
 * draws with a fallback instead of vanishing, but a fallback is a circle and a
 * circle says nothing. This fails the build when the server grows a section
 * the app has no glyph for, which is the moment to choose one rather than the
 * afternoon someone notices a blank.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether a name is a real SF Symbol. Nothing here can know that, and
 * SymbolView draws the fallback if it is not; that is a visible miss on a
 * screen, not a silent one.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const MENU = 'attune-app/src/components/results-menu.tsx';
const src = readFileSync(`${ROOT}${MENU}`, 'utf8');

const block = /const GROUP_ICON: Record<string, string> = \{([\s\S]*?)\};/.exec(src);
if (!block) {
  console.error(`[check-nav-icons] cannot find GROUP_ICON in ${MENU}, so this is checking nothing.`);
  process.exit(1);
}

const icons = {};
for (const m of block[1].matchAll(/'?([\w-]+)'?:\s*'([\w.]+)'/g)) icons[m[1]] = m[2];

const problems = [];
for (const [id, name] of Object.entries(icons)) {
  if (name.endsWith('.fill')) {
    problems.push(`${id} is '${name}', which is the solid variant. Drop the .fill.`);
  }
}

const { resultsNav } = await import(`${ROOT}api/_lib/results-sections.js`);
// Every optional section switched on, so this sees every group that can exist.
for (const g of resultsNav({ hasReflection: true, intimacyReady: true, conflictListed: true })) {
  if (!icons[g.id]) {
    problems.push(`the server can send a section '${g.id}' (${g.label}) and the app has no icon for it.`);
  }
}

if (problems.length) {
  console.error('[check-nav-icons] the results menu:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`[check-nav-icons] ${Object.keys(icons).length} icons, all outlined, one for every section the server can send.`);
