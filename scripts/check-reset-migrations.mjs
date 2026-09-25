#!/usr/bin/env node
/**
 * A reset migration clears every exercise, not the ones that existed when it
 * was written.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Ellie: "When you reset Carolina and Aaron's and Preston and my accounts,
 * there were errors and roadblocks as we went to complete everything and view
 * results. Please ensure that this change is done cleanly."
 *
 * A reset is a hand-written list of columns, and the exercises are a registry
 * that grows. Migration 038 cleared one exercise because one existed. 042
 * cleared one because it was about one. There are five now, and the next
 * reset written from memory will clear four.
 *
 * ── WHY THE LEFTOVERS MATTER MORE THAN THEY LOOK ──────────────────────────
 * A profile with no answers and a surviving completion flag is a couple the
 * product believes has finished, so it offers results built from nothing. And
 * results are frozen on purpose: couple_results is served back exactly as
 * written and never recomputed, so a reset that leaves that row shows last
 * month's results next to this month's empty answers, and no screen in the
 * product can tell that is wrong.
 *
 * Those are the two that made the earlier resets look broken.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * The column list is DERIVED from api/_exercises.js. Any migration whose name
 * says it is a reset has to name every one of them, and has to clear the
 * frozen results too. Nothing here is a list of columns typed twice.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Not whether the SQL is correct, which needs a database this cannot have.
 * Not the old resets: 038, 040, 041 and 042 are history and are exempt by
 * name, because a migration that has already been run cannot be edited. They
 * are the reason this exists rather than the thing it polices.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { EXERCISE_COLUMNS, EXERCISES } from '../api/_exercises.js';

const ROOT = new URL('..', import.meta.url).pathname;
const DIR = `${ROOT}supabase/migrations/`;

/**
 * Already run, so already history. A migration is a record of what happened;
 * editing one to satisfy a check written afterwards would be a lie about the
 * database.
 */
const HISTORY = new Set([
  '038_reset_ex1_couple_retake.sql',
  '040_reset_ex1_beta_testers.sql',
  '041_rereset_ellie_ex1.sql',
  '042_reset_ex1_after_question_rework.sql',
]);

/**
 * Which migrations are resets.
 *
 * On a word boundary, not on the substring. The first version tested /reset/i
 * and matched `036_admin_presets.sql` and `063_admin_presets_rls.sql`, then
 * reported that the admin presets table fails to clear Physical Intimacy
 * Expectations. A gate that matches too much is not the safe direction: it
 * either gets loosened until it matches nothing, or it manufactures the
 * evidence it was meant to look for.
 */
const IS_RESET = /(^|_)reset(_|\b)/i;

const files = readdirSync(DIR)
  .filter((f) => f.endsWith('.sql') && IS_RESET.test(f) && !HISTORY.has(f));

const fails = [];

for (const f of files) {
  const sql = readFileSync(DIR + f, 'utf8');
  /** Comments explain; only the statements count. */
  const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

  for (const col of EXERCISE_COLUMNS) {
    if (new RegExp(`\\b${col}\\s*=`).test(code)) continue;
    const ex = EXERCISES.find((e) => e.column === col);
    fails.push(`${f} never clears ${col} (${ex?.fullLabel || ex?.label}).`
      + ' A reset that leaves one exercise behind is a couple who cannot retake'
      + ' it and whose results are built partly from answers they gave months'
      + ' ago.');
  }

  if (!/delete\s+from\s+public\.couple_results\b/i.test(code)) {
    fails.push(`${f} never deletes the couple_results row. Results are frozen:`
      + ' that row is served back exactly as written and never recomputed, so a'
      + ' reset that leaves it shows the old results next to empty answers. It'
      + ' is the single thing that made the earlier resets look broken.');
  }

  /* Completion is read straight off the profile by the website, so a cleared
     answer column with a surviving flag is a couple the product thinks is
     finished. Only the three that have these columns. */
  for (const col of ['ex1_completed', 'ex2_completed', 'ex3_completed']) {
    if (new RegExp(`\\b${col}\\s*=`).test(code)) continue;
    fails.push(`${f} never clears ${col}, so the product still believes that`
      + ' exercise is finished.');
  }
}

if (!files.length) {
  console.log('[check-reset-migrations] no current reset migrations to check.');
  process.exit(0);
}

if (fails.length) {
  console.error('\n check-reset-migrations: a reset would leave someone half reset.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`[check-reset-migrations] ${files.length} reset migration(s);`
  + ` each clears all ${EXERCISE_COLUMNS.length} exercise columns, the completion flags and the frozen results.`);
