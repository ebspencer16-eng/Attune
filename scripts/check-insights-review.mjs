#!/usr/bin/env node
/**
 * INSIGHTS-REVIEW.md says what api/_insights.js says.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * The review document is generated. If it is committed and the words change,
 * it is a document about a previous version of the product, and nobody
 * reviewing it can tell.
 *
 * ── THE BUG IT COMES FROM ─────────────────────────────────────────────────
 * Not this file's own bug. The copy-review document in this repo listed ten
 * action items the product has never rendered, so ten pieces of copy were
 * reviewed and approved that nobody would ever see, while the nine that ship
 * went through no review at all. That is what a stale review document does:
 * it does not look broken, it looks like the product.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * By regenerating and comparing, which is the only check that cannot be fooled
 * by a partial edit. The generator is pure: nothing in it depends on the date,
 * so this can never fail for a reason that is not a reason.
 */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = `${ROOT}INSIGHTS-REVIEW.md`;

const before = (() => { try { return readFileSync(OUT, 'utf8'); } catch { return null; } })();
if (before === null) {
  console.error('[check-insights-review] INSIGHTS-REVIEW.md is missing. Run'
    + ' `node scripts/build-insights-review.mjs`.');
  process.exit(1);
}

execFileSync(process.execPath, [`${ROOT}scripts/build-insights-review.mjs`], { stdio: 'pipe' });
const after = readFileSync(OUT, 'utf8');

if (before !== after) {
  console.error('[check-insights-review] INSIGHTS-REVIEW.md was out of date with'
    + ' api/_insights.js and has been regenerated. Commit it.');
  process.exit(1);
}
console.log('[check-insights-review] the review document is the insight list, regenerated and identical.');
