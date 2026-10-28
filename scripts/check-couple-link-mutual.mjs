#!/usr/bin/env node
/**
 * A couple link that does not come back is reported, not followed.
 *
 * ── THE BUG THIS ENCODES ──────────────────────────────────────────────────
 * Ellie, of a couple who had both finished everything they own: "their results
 * aren't generating because it says his are incomplete."
 *
 * api/results.js read the partner with `id = eq.me.partner_profile_id` and
 * asked no further questions. api/partner-sync.js writes that column on BOTH
 * rows when two people are linked, and api/home.js says in its own comment
 * that a one-way link "should not exist" and instruments the case so it shows
 * up. results.js had no equivalent check, so a pointer at the wrong row, or at
 * one that never answered anything, produced a partner with no answers; the
 * gate then reported every exercise the viewer HAD finished as one the partner
 * had not, and the app said "your partner has not finished this yet" about
 * somebody who had finished.
 *
 * Nothing threw and nothing could. A profile row is a profile row. The only
 * tell was a sentence that was not true, which is why it needed somebody to
 * report it rather than a gate to catch it.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * By running the thing, with a stubbed fetch, over the three shapes:
 *
 *   mutual       both rows point at each other   -> the gate decides
 *   one way      the partner does not point back -> partner_link_one_way
 *   missing      the pointer resolves to nothing -> partner_not_found
 *
 * And that a one-way link names no exercise as waiting, because an empty
 * waitingOn is what stops a surface drawing the sentence that was wrong.
 *
 * ── WHAT ANOTHER GATE COVERS ──────────────────────────────────────────────
 * Neutering the check by adding a falsy condition to it, rather than deleting
 * it. `if (somethingUndefined && partner.partner_profile_id !== me.id)` keeps
 * every string this gate looks for and disables the branch, which is
 * CLAUDE.md's "disabling a branch with a constant". Planted, and
 * check-server-undefined catches it, because the name it adds resolves to
 * nothing. Recorded rather than duplicated: two gates on one promise drift,
 * and the weaker one wins because it is the one that still passes.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Repairing the link. That is a database write and Ellie runs those. Nor the
 * copy a surface shows for the new reason: the app falls back to its own
 * "still being prepared" line, which is vague but true, where the old
 * behaviour was specific and false. The copy is named as a gap in TASKS.md
 * because every word a customer reads is hers.
 */
import { readFileSync } from 'node:fs';

const SRC = readFileSync(new URL('../api/results.js', import.meta.url), 'utf8');
const fails = [];

/* The check has to sit BEFORE the gate, or the gate has already decided on a
   partner row it should never have been given. Matching the order rather than
   the presence, because presence is what a hoisted copy would satisfy. */
const posCheck = SRC.indexOf('partner.partner_profile_id !== me.id');
const posGate = SRC.indexOf('const gate = resultsGate({');
if (posCheck < 0) {
  fails.push('api/results.js no longer tests that the partner points back at the viewer.'
    + ' A one-way link then reads as a partner who has finished nothing.');
} else if (posGate < 0) {
  fails.push('api/results.js no longer calls resultsGate, so this gate has lost its subject.');
} else if (posCheck > posGate) {
  fails.push('api/results.js tests the link AFTER calling resultsGate. The gate has already'
    + ' decided by then, on a partner row it should not have been handed.');
}

/* The two endings are different states and must stay different: one is a
   deleted account, the other a half-written link that can be repaired. */
for (const reason of ['partner_link_one_way', 'partner_not_found']) {
  if (!SRC.includes(`reason: '${reason}'`)) {
    fails.push(`api/results.js no longer answers '${reason}'. The two cases are a deleted`
      + ' account and a repairable link, and collapsing them loses which one to act on.');
  }
}

/* An empty waitingOn is the half that stops the false sentence being drawn. */
const oneWayBlock = SRC.slice(SRC.indexOf("reason: 'partner_link_one_way'"), SRC.indexOf("reason: 'partner_link_one_way'") + 420);
if (SRC.includes("reason: 'partner_link_one_way'") && !/waitingOn:\s*\[\]/.test(oneWayBlock)) {
  fails.push('the one-way reply does not send an empty waitingOn. The app draws a line per'
    + ' entry in that list, and an entry is how "your partner has not finished this yet"'
    + ' reaches the screen for somebody who has.');
}

/* And the partner read must ask for the column the check needs, or the check
   compares undefined with an id and fails every couple. */
/* To the closing bracket, not a fixed number of characters. The first version
   capped the window at 400 and the list is longer than that with its comments,
   so the gate reported that it could not find a list that is plainly there:
   a lazy quantifier with a length limit is a window, and a window is the wrong
   shape for a block. */
const colsAt = SRC.indexOf('const cols = [');
const colsEnd = colsAt < 0 ? -1 : SRC.indexOf('];', colsAt);
const colsBlock = colsAt < 0 || colsEnd < 0 ? null : SRC.slice(colsAt, colsEnd);
if (!colsBlock) {
  fails.push('could not find the column list api/results.js selects, so cannot tell whether'
    + ' partner_profile_id is among them.');
} else if (!colsBlock.includes("'partner_profile_id'")) {
  fails.push("api/results.js does not select partner_profile_id, so partner.partner_profile_id"
    + ' is undefined and the mutual-link test would refuse every couple.');
}

if (fails.length) {
  console.error('check-couple-link-mutual FAILED');
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log('[check-couple-link-mutual] api/results.js tests that the partner points back before'
  + ' the gate decides, answers partner_link_one_way and partner_not_found separately, names no'
  + ' exercise as waiting on a one-way link, and selects the column the test needs.');
