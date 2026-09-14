#!/usr/bin/env node
/**
 * The phone's nav offers every section the sidebar does.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * The website's mobile pill row is built from the same list as its sidebar,
 * so a section cannot exist on a laptop and be missing on a phone.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * Ellie: "Physical intimacy results section is still missing from my web view,
 * it's not listed in the pill shaped nav buttons up top."
 *
 * The pill row was a hand-written list of five beside a sidebar of eight. It
 * had no Conflict Patterns at all, and its intimacy entry was guarded by a
 * second reading of the same condition, so whether the two agreed depended on
 * which of two expressions was true. On a phone, a whole section a couple had
 * paid for simply was not there.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * By reading the source: the pill row has to be derived from sidebarSections
 * rather than from a list of its own. A list of literals inside that component
 * is the bug, whatever it happens to contain today.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The app, which has no pill row: it draws the server's nav directly, and
 * check-results-nav.mjs is what keeps that honest.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const site = readFileSync(`${ROOT}src/App.jsx`, 'utf8');

const at = site.indexOf('const MobileTabBar');
if (at < 0) {
  console.error('[check-mobile-nav] cannot find MobileTabBar in src/App.jsx.');
  process.exit(1);
}
const end = site.indexOf('\n  );', at);
const bar = site.slice(at, end);

const problems = [];
if (!/sidebarSections/.test(bar)) {
  problems.push('the pill row does not read sidebarSections, so it is a second list of what the results contain.');
}
// A row of object literals with their own ids is the shape that went stale.
const literals = [...bar.matchAll(/\{\s*id:\s*"[a-z-]+"\s*,\s*label:/g)];
if (literals.length) {
  problems.push(`the pill row writes ${literals.length} section(s) out by hand. The sidebar's list is the one the results are built from.`);
}

if (problems.length) {
  console.error('[check-mobile-nav] the phone and the laptop can offer different sections:\n');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}

console.log('[check-mobile-nav] the pill row is derived from the sidebar, so both offer the same sections.');
