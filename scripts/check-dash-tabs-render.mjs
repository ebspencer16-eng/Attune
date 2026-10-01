#!/usr/bin/env node
/**
 * Every dashboard tab draws its content inside the dashboard.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie: "Why is there no relationship journal or notes system on the site?
 * Please build."
 *
 * It was built, and had been for a while. `ConnectedNotesView` is the whole
 * page: the journal composer, the marks grouped by section, the tags, the
 * archive. It rendered correctly at ?view=notes.
 *
 * What was wrong is where its block sat. `{dashTab === "notes" && ...}` was
 * several hundred lines below the dashboard, inside `{view === "exercises" &&
 * ...}`, so it was evaluated on a screen nobody was looking at. Clicking Notes
 * on the dashboard drew nothing at all: no heading, no button, an empty column.
 *
 * Nothing failed. The condition was true, the component existed, the build
 * passed, and the tab was blank. src/App.jsx is fifteen thousand lines of JSX
 * and a block in the wrong branch looks exactly like a block in the right one.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 * That the four tab blocks are siblings: no `{view === "..."` opener appears
 * between the first and the last. A tab block that drifts into another view
 * puts one of those between them, which is what happened.
 *
 * And that every tab in DASH_TABS has a block at all, so a fifth tab cannot be
 * added to the bar with nothing behind it.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether a tab's content is any good, or whether it renders without data.
 * This is about reachability: the one thing that was wrong and the one thing a
 * reader cannot tell from the code.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const src = readFileSync(`${ROOT}src/App.jsx`, 'utf8');
const fails = [];

/** The tab bar's own list, so a new tab is covered the day it is added. */
const listed = (() => {
  const m = /const DASH_TABS = \[([\s\S]*?)\];/.exec(src);
  if (!m) return null;
  return [...m[1].matchAll(/id:\s*"([a-z-]+)"/g)].map((x) => x[1]);
})();

if (!listed || !listed.length) {
  console.error('[check-dash-tabs-render] DASH_TABS could not be read from src/App.jsx.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

/** Where each tab's content block starts. */
const blocks = new Map();
for (const id of listed) {
  const at = src.indexOf(`{dashTab === "${id}" && (`);
  if (at === -1) {
    fails.push(`the tab bar offers "${id}" and nothing renders it.`
      + ' A tab with no block behind it is a tab that draws an empty column.');
    continue;
  }
  blocks.set(id, at);
}

if (blocks.size > 1) {
  const sorted = [...blocks.entries()].sort((a, b) => a[1] - b[1]);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const between = src.slice(first[1], last[1]);

  /**
   * A view opener between the first and last tab block means one of them has
   * left the dashboard. This is the exact shape the Notes tab was in.
   */
  const strayed = [...between.matchAll(/\{view === "([a-z-]+)"/g)].map((m) => m[1]);
  if (strayed.length) {
    fails.push(`the tab blocks are not siblings: \`{view === "${strayed[0]}"\` opens between`
      + ` the "${first[0]}" block and the "${last[0]}" block.\n`
      + '      A tab block inside another view is evaluated on a screen nobody is looking at,'
      + ' and\n      the tab draws nothing. Nothing fails, nothing warns, and the build passes.');
  }
}

if (fails.length) {
  console.error('\n check-dash-tabs-render: a dashboard tab cannot draw its own content.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-dash-tabs-render] ${listed.length} dashboard tabs, every one with a content`
  + ' block, and all of them siblings inside the dashboard.');
