#!/usr/bin/env node
/**
 * A gate that nothing runs is not a gate.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * Two of them were sitting in scripts/ wired to nothing.
 *
 * check-section-aliases.mjs holds a renamed results page to its old id, because
 * a note is found by that id and nothing else, so a rename makes every mark
 * anyone ever made on that page invisible with no error anywhere. Its own header
 * says it was written "before the second occurrence rather than after it".
 *
 * check-tab-reset.mjs holds every tab to returning to its landing page on a
 * second tap, which Ellie asked for on one tab and then found missing on two
 * others: "a gesture that works on one tab and not the others is worse than one
 * that works nowhere, because the reader has learned it."
 *
 * Both pass today. Neither had ever been in package.json: `git log -S` on the
 * name finds no commit that added or removed it. They were written, they were
 * correct, and they were never connected, so for months they proved nothing.
 *
 * This is the same failure as check:docs reporting eighteen broken generators on
 * every run until nobody read it. Confidence outrunning evidence, in the two
 * directions available: a check nobody reads, and a check nobody runs.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * Every scripts/check-*.mjs is named by `npm run check`, by `npm run smoke`, or
 * by scripts/smoke.mjs, which is where the browser checks are invoked from.
 *
 * ── WHY NOT THE GENERATORS ────────────────────────────────────────────────
 * build-*.mjs is a different kind of thing. Four of them are run by a person on
 * purpose: build-app-icon, build-mark-variants and build-share-card make assets
 * that are then committed, and build-test-couple writes seed data. Wiring those
 * into every build would regenerate committed files on a machine that never
 * asked. The ones that must run do run, and check-doc-generators covers them.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether a gate is any good. A wired gate that matches nothing is still a gate
 * nobody should trust, and the answer to that is planting against it, which is a
 * thing a person does.
 *
 * Whether it runs often enough. A check in smoke runs far less than one in
 * check, and that is a real difference and a deliberate one: smoke needs a
 * browser and several minutes. Being named by either counts here.
 */

import { readdirSync, readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;

const pkg = JSON.parse(readFileSync(`${ROOT}package.json`, 'utf8'));
const smoke = readFileSync(`${ROOT}scripts/smoke.mjs`, 'utf8');

const named = new Set();
for (const cmd of Object.values(pkg.scripts || {})) {
  for (const m of String(cmd).matchAll(/scripts\/([A-Za-z0-9_.-]+\.mjs)/g)) named.add(m[1]);
}
/* smoke.mjs spawns its browser checks by path rather than through a script. */
for (const m of smoke.matchAll(/['"`]scripts\/([A-Za-z0-9_.-]+\.mjs)['"`]/g)) named.add(m[1]);

const gates = readdirSync(`${ROOT}scripts`).filter((f) => /^check-.*\.mjs$/.test(f));

if (!gates.length) {
  console.error('[check-gates-run] found no check-*.mjs at all. Refusing to pass: a gate'
    + ' that has lost its subject must never report success.');
  process.exit(1);
}

const orphans = gates.filter((f) => !named.has(f));

if (orphans.length) {
  console.error('\n check-gates-run: a gate that nothing runs is not a gate.\n');
  for (const o of orphans) {
    console.error(`  ✗ scripts/${o} is not named by npm run check, npm run smoke, or`
      + ' scripts/smoke.mjs.\n      It will never fail, whatever it finds.\n');
  }
  console.error('  Add it to the check chain, or to smoke if it needs a browser. If it is'
    + ' obsolete,\n  delete it: a file that looks like a gate and is not one is worse than'
    + ' no file,\n  because the next person reads the directory and counts it.\n');
  process.exit(1);
}

console.log(`[check-gates-run] all ${gates.length} gates are named by npm run check or by`
  + ' the smoke run, so every one of them can actually fail.');
