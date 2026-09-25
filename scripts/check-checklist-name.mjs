#!/usr/bin/env node
/**
 * The checklist has one name, and it is not "Starting Out".
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Ellie: "Make sure every reference to the checklist is called 'Merging lives
 * checklist' not starting out checklist. In packages, quick checkouts,
 * checkout, etc."
 *
 * ── WHY A CHECK AND NOT A RENAME ──────────────────────────────────────────
 * The rename was twenty-four places across nine files: the catalogue, the
 * receipt email, the Stripe webhook's line items, the checkout page's tags and
 * its two add-on prompts, the quick-start page, the cart, the feedback survey,
 * the admin, and the app. A product name typed into twenty-four files comes
 * apart again the first time someone adds a twenty-fifth, and the twenty-fifth
 * is always a checkout line or a receipt, where a customer reads it next to a
 * price.
 *
 * The title itself has one definition, CHECKLIST_COPY.title in api/_checklist.js,
 * and everything that can import does. The static pages cannot import, which is
 * what this exists for.
 *
 * ── WHAT IT DOES NOT FORBID ───────────────────────────────────────────────
 * "Starting Out" on its own. That is the newlywed PACKAGE: the Starting Out
 * Collection, sold on three pages and named in the receipt, and Ellie did not
 * ask for that to change. Only the pairing is wrong, so only the pairing is
 * matched: the two words with "checklist" close behind them.
 *
 * Matching the bare phrase would have flagged a dozen correct lines about the
 * package, which is a gate that matches too much, and this repo has already
 * had one of those this week.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CHECKLIST_COPY } from '../api/_checklist.js';

const ROOT = new URL('..', import.meta.url).pathname;
const DIRS = ['api', 'src', 'public', 'attune-app/src'];
const EXTS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.html', '.md'];

/** The name, from the one place it is defined. */
const NAME = CHECKLIST_COPY.title;
if (!/merging lives/i.test(NAME)) {
  console.error(`[check-checklist-name] CHECKLIST_COPY.title is "${NAME}", which is`
    + ' not the name Ellie asked for. Refusing to pass: this check takes the'
    + ' name from there, so a wrong name there would make it enforce the wrong'
    + ' thing everywhere.');
  process.exit(1);
}

/** The old name: the two words, then "checklist" within a few characters. */
const OLD = /starting\s*out\s{0,3}(?:\w+\s){0,1}check\s?list/i;

const files = [];
for (const d of DIRS) {
  (function walk(dir) {
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    for (const name of entries) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (/node_modules|\.expo|ios|android|dist/.test(p)) continue;
        walk(p);
        continue;
      }
      if (EXTS.some((e) => name.endsWith(e))) files.push(p);
    }
  })(join(ROOT, d).replace(/\/$/, ''));
}

if (files.length < 50) {
  console.error(`[check-checklist-name] only scanned ${files.length} files; refusing to pass.`);
  process.exit(1);
}

const fails = [];
for (const f of files) {
  const rel = f.slice(ROOT.length);
  if (rel === 'scripts/check-checklist-name.mjs') continue;
  const src = readFileSync(f, 'utf8');
  src.split('\n').forEach((line, i) => {
    if (!OLD.test(line)) return;
    fails.push(`${rel}:${i + 1} still calls it the Starting Out checklist.`
      + ` It is "${NAME}". The package is still the Starting Out Collection and`
      + ' that is not what this is about.');
  });
}

if (fails.length) {
  console.error('\n check-checklist-name: the checklist has two names.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`[check-checklist-name] ${files.length} files; the checklist is "${NAME}" everywhere.`);
