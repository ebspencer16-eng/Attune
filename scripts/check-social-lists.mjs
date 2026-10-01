#!/usr/bin/env node
/**
 * SOCIAL-LISTS.md says what the product says.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * This document leaves the company. Ellie hands it to the social and graphics
 * team, who set the words into artwork, and artwork is slow to correct and
 * public when it is wrong. A stale heading in here becomes a graphic of a
 * heading the app does not have.
 *
 * ── THE BUG IT COMES FROM ─────────────────────────────────────────────────
 * Not its own. /email-preview held six hand-written mock-ups while the product
 * sent nineteen emails, and the copy-review document listed ten action items
 * nothing ever rendered. Both were surfaces built to show the product that
 * quietly became a second draft of it. This file is the same kind of surface
 * pointed outward, which is worse.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * By regenerating and comparing, which is the only check a partial edit cannot
 * fool. The generator is pure and pins its own dates, so this can never fail
 * for a reason that is not a reason.
 */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = `${ROOT}SOCIAL-LISTS.md`;

const before = (() => { try { return readFileSync(OUT, 'utf8'); } catch { return null; } })();
if (before === null) {
  console.error('[check-social-lists] SOCIAL-LISTS.md is missing. Run'
    + ' `node scripts/build-social-lists.mjs`.');
  process.exit(1);
}

execFileSync(process.execPath, [`${ROOT}scripts/build-social-lists.mjs`], { stdio: 'pipe' });
const after = readFileSync(OUT, 'utf8');

if (before !== after) {
  console.error('[check-social-lists] SOCIAL-LISTS.md was out of date with the home'
    + ' priority engine or the In Practice index, and has been regenerated. Commit it.\n'
    + '  This document goes to the graphics team, so a stale heading here becomes a'
    + ' graphic\n  of a heading the app does not have.');
  process.exit(1);
}

console.log('[check-social-lists] the lists for the graphics team are the product,'
  + ' regenerated and identical.');
