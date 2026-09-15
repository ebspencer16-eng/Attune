#!/usr/bin/env node
/**
 * Every tab returns to its own landing page when you tap it again.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie asked for it on Insights, then found Resources and Notes did not do
 * it: "just like insights, if you are in the category and tap resources or
 * notes again, it should bring you back to the initial landing page for that
 * section." A gesture that works on one tab and not the others is worse than
 * one that works nowhere, because the reader has learned it.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 * Every tab in the tab bar calls useTabReset, and the bar is read out of the
 * app rather than listed here. A fifth tab arriving without it fails this.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * What each one resets, which is genuinely different per tab: Insights has a
 * section and possibly an open exercise, Resources has an article or a tool,
 * Notes has an editor and two expanded lists. Only a person tapping can say
 * whether the state that comes back is the state they meant.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const bar = readFileSync(`${ROOT}attune-app/src/components/app-tabs.tsx`, 'utf8');

/** The tabs, from the bar itself. */
const tabs = [...bar.matchAll(/<NativeTabs\.Trigger\s+name="([\w-]+)"/g)].map((m) => m[1]);
const fails = [];
if (tabs.length < 2) fails.push(`read ${tabs.length} tabs out of app-tabs.tsx; there were 4 when this was written`);

for (const tab of tabs) {
  const file = `attune-app/src/app/${tab}.tsx`;
  let src;
  try {
    src = readFileSync(ROOT + file, 'utf8');
  } catch {
    fails.push(`${file} does not exist, and the tab bar names it`);
    continue;
  }
  if (!/useTabReset\s*\(/.test(src)) {
    fails.push(`${file} does not call useTabReset, so tapping its tab again does nothing`);
  }
}

if (fails.length) {
  console.error('[check-tab-reset] a tab does not take you back to its landing page:');
  for (const f of fails) console.error(`  ${f}`);
  console.error('');
  console.error('useTabReset in attune-app/src/hooks/use-tab-reset.ts. What it resets is');
  console.error("the screen's own business; that it resets at all is not.");
  process.exit(1);
}

console.log(`[check-tab-reset] all ${tabs.length} tabs return to their landing page on a repeat tap.`);
