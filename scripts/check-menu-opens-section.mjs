#!/usr/bin/env node
/**
 * A row that names a section opens that section.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie: "All rows on insights menu on site open the highlights rather than
 * their specific pages."
 *
 * Every row did set the section it names. The results view then drew the
 * storycards instead, because it renders them whenever `highlightsSeen` is
 * false and that branch does not look at which section was asked for:
 *
 *   {view === "results" && bothDone && !highlightsSeen && ( ...storycards... )}
 *   {view === "results" && bothDone && highlightsSeen && ( ...the section... )}
 *
 * So the id was set, stored, and overruled. Nothing failed; the wrong screen
 * was simply in front. The app already draws the distinction the fix needs:
 * being told results are ready starts with the cards, and opening the Insights
 * tab opens the menu. Asking for a page by name is the second sentence.
 *
 * ── AND THE CARET ─────────────────────────────────────────────────────────
 * Ellie, same message: "Dropdown arrows on site's insights menu don't work."
 * The caret was an aria-hidden span INSIDE the row's own button, so the only
 * thing it could do was what the row does. A disclosure that is part of the
 * thing it claims to disclose cannot work, however it is wired.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 * Read off src/App.jsx, because this is a rule about the website's renderer and
 * there is nothing here that can be run without a browser and a session.
 *
 *   1. Opening a section from the menu also settles the storycards, so the
 *      section asked for is the screen that appears.
 *   2. The caret is a control of its own: a button, outside the row's button,
 *      carrying aria-expanded.
 *   3. The expanded group lists its children and each one opens its own id.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether each section then draws the right content. check-results-coverage and
 * the smoke's 29 sections cover that. This is about which screen you land on,
 * which is the one thing those cannot see.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const src = readFileSync(`${ROOT}src/App.jsx`, 'utf8');
const fails = [];

// ── The menu's handler ──────────────────────────────────────────────────────
const handler = /onOpen=\{\(sectionId\)\s*=>\s*\{([^}]*)\}\}/.exec(src);
if (!handler) {
  console.error('[check-menu-opens-section] src/App.jsx no longer hands AppInsightsMenu an'
    + ' onOpen taking a sectionId. Refusing to pass: a gate that has lost its subject must'
    + ' never report success.');
  process.exit(1);
}
const body = handler[1];

if (!/setActiveResult\(\s*sectionId\s*\)/.test(body)) {
  fails.push('the menu\'s onOpen does not set the section it was given, so every row opens'
    + ' whatever was open last.');
}
/**
 * The storycards have to be settled in the same breath.
 *
 * Matched on the call with its argument rather than on the name: the name
 * appears in this file a dozen times and `setHighlightsSeen(false)` here would
 * be the bug with the fix's own words on it.
 */
if (!/setHighlightsSeen\(\s*true\s*\)/.test(body)) {
  fails.push('the menu\'s onOpen does not settle the storycards, so the section it set is'
    + ' overruled by the `!highlightsSeen` branch and every row lands on Highlights.\n'
    + '      That is what Ellie reported, and the id was never the problem.');
}

// ── The caret is its own control ────────────────────────────────────────────
const menu = (() => {
  const at = src.indexOf('function AppInsightsMenu(');
  if (at === -1) return null;
  const end = src.indexOf('\nfunction ', at + 10);
  return src.slice(at, end === -1 ? src.length : end);
})();

if (!menu) {
  console.error('[check-menu-opens-section] AppInsightsMenu is gone from src/App.jsx.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

/** The caret glyph, and what element it sits in. */
const caretAt = menu.indexOf('&#9662;');
if (caretAt === -1) {
  fails.push('the insights menu draws no caret at all. If the disclosure was removed on'
    + ' purpose, take this half out and say why; if not, the groups have pages under them'
    + ' and nothing offers a way in.');
} else {
  /* The tag that opens the element the caret is inside. */
  const before = menu.slice(0, caretAt);
  const openTag = before.lastIndexOf('<');
  const tag = before.slice(openTag, openTag + 8);
  if (!/^<button/.test(tag)) {
    fails.push(`the caret sits inside a ${tag.trim()} rather than a button of its own, so it`
      + ' cannot do anything the row does not already do. That is exactly how it got reported'
      + ' as not working.');
  }
  if (!/aria-expanded=/.test(menu)) {
    fails.push('the caret carries no aria-expanded, so nothing says whether the group is open,'
      + ' to a reader or to a screen reader.');
  }
}

if (!/setOpenGroup\(/.test(menu)) {
  fails.push('the insights menu holds no open-group state, so the caret has nothing to toggle.');
}
/* And the expanded group opens its children by their own ids. */
if (!/onOpen\(\s*ch\.id\s*\)/.test(menu)) {
  fails.push('an expanded group does not open its children by id, so the disclosure shows a list'
    + ' that goes nowhere, which is worse than the caret that did nothing.');
}

if (fails.length) {
  console.error('\n check-menu-opens-section: the insights menu does not take you where it says.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log('[check-menu-opens-section] a menu row sets its section and settles the storycards,'
  + ' and the caret is a control of its own that opens the pages under a group.');
