#!/usr/bin/env node
/**
 * The four tiles on the app's home screen say where the couple actually is.
 *
 * ── WHAT ELLIE ASKED FOR ───────────────────────────────────────────────────
 * "For a user who has not completed exercises yet, quick access tiles should
 * have slight adjustments. Action plans should be 'Your exercises' and should
 * take you to your status view on insights tab, then, if user completes
 * exercises and unlocks results, it should change to action plan, but if user
 * finishes and partner still hasn't, it should show action plan but should be
 * slightly greyed out and the icon should be a padlock. For a user who hasn't
 * begun exercises, results highlights should be greyed with the padlock icon."
 *
 * Four states for one screen, and the two that matter most are the ones a
 * developer never sees: a couple who have not started, and a couple where one
 * has finished and the other has not. Both of those are most of the product's
 * life and neither is what a test account looks like.
 *
 * ── HOW IT CHECKS ──────────────────────────────────────────────────────────
 * By running the rule over every state rather than reading the screen. That is
 * why it is plain JavaScript in attune-app/src/lib rather than inside the TSX:
 * a rule that cannot be run gets a gate pointed at a copy of it, which is the
 * failure CLAUDE.md spends a page on.
 *
 * The screen half is read, because a React Native component cannot be run from
 * a build step: the tile has to honour `locked` in three ways, and the router
 * has to refuse a locked tile. A tile that is drawn dim and still navigates is
 * the lock being decoration.
 */

import { readFileSync } from 'node:fs';

import { quickTiles } from '../attune-app/src/lib/quick-tiles.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(`${ROOT}${f}`, 'utf8');
const problems = [];

const ex = (mine, theirs = false) => ({
  ex1: { owned: true, mine, theirs }, ex2: { owned: true, mine, theirs },
});
const byId = (tiles) => Object.fromEntries(tiles.map((t) => [t.id, t]));

// ── 1. Nothing finished: the plan tile is the way into the exercises ──────
{
  const t = byId(quickTiles({ exercises: ex(false), resultsReady: false }));
  if (!/your\s*\n?\s*exercises/i.test(t.plan?.label || '')) {
    problems.push(`before anything is finished the second tile reads "${t.plan?.label}";`
      + ' Ellie asked for "Your exercises".');
  }
  if (t.plan?.locked) {
    problems.push('the exercises tile is locked before anything is finished, which is the one'
      + ' moment it is the most useful thing on the screen.');
  }
  if (t.plan?.section) {
    problems.push(`the exercises tile carries section "${t.plan.section}", so it opens a results`
      + ' page. Without one, the Insights tab draws the status table, which is what she asked for.');
  }
  if (!t.highlights?.locked) {
    problems.push('results highlights is open before anything is finished, and there are no'
      + ' highlights until both people have answered.');
  }
}

// ── 2. Finished, waiting on the partner ───────────────────────────────────
{
  const t = byId(quickTiles({ exercises: ex(true), resultsReady: false }));
  if (!/action/i.test(t.plan?.label || '')) {
    problems.push(`once their own exercises are done the tile should read Action plans; it reads`
      + ` "${t.plan?.label}".`);
  }
  if (!t.plan?.locked) {
    problems.push('the action plan is open while the partner has not finished. There is no plan'
      + ' yet: it is built out of both sets of answers.');
  }
  if (!t.highlights?.locked) problems.push('results highlights is open before results are ready.');
}

// ── 3. Both finished ──────────────────────────────────────────────────────
{
  const t = byId(quickTiles({ exercises: ex(true, true), resultsReady: true }));
  for (const id of ['plan', 'highlights']) {
    if (t[id]?.locked) problems.push(`${id} is still locked after results open.`);
  }
  if (t.plan?.section !== 'what-comes-next') {
    problems.push(`the action plan tile opens "${t.plan?.section}" rather than what-comes-next.`);
  }
  if (t.highlights?.section !== 'highlights') {
    problems.push(`the highlights tile opens "${t.highlights?.section}".`);
  }
}

// ── 4. No payload yet is the beginning, not the end ───────────────────────
{
  const t = byId(quickTiles({}));
  if (t.plan?.label?.toLowerCase().includes('action') || !t.highlights?.locked) {
    problems.push('an empty payload reads as a finished couple. The home screen draws from a'
      + ' cache on the first frame, so this is what a cold start shows.');
  }
}

// ── 5. Always four, and the two that never change ─────────────────────────
for (const state of [{}, { exercises: ex(false) }, { exercises: ex(true), resultsReady: true }]) {
  const tiles = quickTiles(state);
  if (tiles.length !== 4) problems.push(`${tiles.length} tiles in one state; the home screen draws four.`);
  const ids = tiles.map((t) => t.id).join(',');
  if (ids !== 'insight,plan,highlights,journal') {
    problems.push(`the tiles came back as ${ids}, in that order. The order is the screen's layout.`);
  }
}

// ── 6. The screen honours it ──────────────────────────────────────────────
{
  const home = read('attune-app/src/app/index.tsx');
  if (!/quickTiles\(/.test(home)) {
    problems.push('the home screen no longer calls quickTiles, so the states above are computed'
      + ' by something this gate cannot see. Refusing to pass: a gate that has lost its subject'
      + ' must never report success.');
  }
  if (!/if \(q\.locked\) return;/.test(home)) {
    problems.push('a locked tile still navigates. The padlock is then decoration on a control'
      + ' that opens an empty page.');
  }
  if (!/disabled=\{!!item\.locked\}/.test(home)) {
    problems.push('a locked tile is still pressable, so it answers a tap with nothing.');
  }
  if (!/opacity: item\.locked \? /.test(home)) {
    problems.push('a locked tile is drawn at full strength. Ellie asked for slightly greyed out.');
  }
  if (!/item\.locked \?[\s\S]{0,120}name=\{'lock'/.test(home)) {
    problems.push('a locked tile does not draw the padlock she asked for.');
  }
}

if (problems.length) {
  console.error('[check-quick-tiles] the home tiles do not say where the couple is:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log('[check-quick-tiles] four tiles in four states: the exercises before results,'
  + ' the plan locked while a partner is still answering, highlights locked until they are ready,'
  + ' and an empty payload reads as the beginning.');
