#!/usr/bin/env node
/**
 * Nothing a person wrote is destroyed by one tap without being asked.
 *
 * ── WHAT IT FOUND ─────────────────────────────────────────────────────────
 * The same destruction is offered in three places: the note sheet on the
 * Notes tab, an entry in the journal, and the bin in the marking toolbar on
 * any results page or article. Two of them asked first. The third took the
 * mark off with one tap, and for a mark of kind 'note' that is the reader's
 * own writing, gone with nothing said.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * A call that deletes something a person made, inside a screen or component,
 * has to sit under something that asks: an Alert with two buttons, or a
 * confirming state the UI draws.
 *
 * A highlight and an underline are deliberately NOT asked about: they are
 * marks on somebody else's words, and a confirmation on each would make the
 * feature tiresome. api/_lib has no say in that; it is a product decision and
 * it is written down in attune-app/src/constants/delete-copy.ts.
 *
 * ── WHAT IS EXEMPT, AND WHY ───────────────────────────────────────────────
 * The plumbing underneath a confirmation that already happened: clearToken
 * inside signOut, and forgetEverything inside clearToken. Neither is reached
 * by a tap of its own.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const APP = join(ROOT, 'attune-app/src');

/** Calls that destroy something a person made. */
const DESTRUCTIVE = /\b(deleteAccount|purgeTag|deleteNote|deleteTag|unshareNote)\s*\(/;
/**
 * Anything that ASKS, which is not the same as anything that alerts.
 *
 * The first version matched any Alert.alert nearby, and every one of these
 * paths has a second alert that reports a failure: "Not deleted. Try again in
 * a moment." So a plant that deleted a tag on one tap passed, because the
 * failure message two lines down counted as the question.
 *
 * An alert that asks has a cancel button. That is the whole difference.
 */
const ASKS = /Alert\.alert\([\s\S]{0,420}?style:\s*'cancel'|setConfirming|areYouSure|setPendingDelete/;
/** Plumbing under a confirmation that has already happened. */
const EXEMPT = new Map([
  ['api/auth.ts', 'clearToken inside signOut, which Settings has already confirmed.'],
  ['api/session.ts', 'forgetEverything inside clearToken, which is that same path.'],
]);

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (/\.tsx?$/.test(name)) files.push(p);
  }
}(APP));

const fails = [];
let calls = 0;
const asked = [];

for (const file of files) {
  const rel = file.slice(APP.length + 1);
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    if (!DESTRUCTIVE.test(line)) return;
    if (/^\s*(\*|\/\/)/.test(line)) return;                 // a comment
    if (/^\s*(import|export)\b/.test(line)) return;         // a declaration
    if (EXEMPT.has(rel)) return;
    calls += 1;
    /**
     * The function this sits in, and not the one before it.
     *
     * A fixed window of 40 lines above was too generous: these handlers sit
     * one after another, each with its own confirmation, so a plant that
     * replaced a tag purge with a direct call still found the PREVIOUS
     * handler's cancel button inside the window and passed. Scan back to the
     * nearest declaration instead.
     */
    let start = 0;
    for (let k = i; k >= 0; k -= 1) {
      if (/^\s{0,4}(?:const|let|var|async function|function|export)\s+\w+/.test(lines[k])) { start = k; break; }
    }
    const around = lines.slice(start, i + 6).join('\n');
    if (ASKS.test(around)) { asked.push(`${rel}:${i + 1}`); return; }
    /**
     * Or the screen itself is the confirmation.
     *
     * Deleting an account is not an alert: Settings holds a `confirming`
     * state, asks for the password, and will not arm the button until the
     * word DELETE has been typed. The call that does it sits in its own
     * function, three steps from the thing that asked, and scoping to the
     * enclosing function alone reported it as unconfirmed.
     */
    if (/const \[confirming|setConfirming\(|const armed =/.test(src)) {
      asked.push(`${rel}:${i + 1} (the screen is the confirmation)`);
      return;
    }
    fails.push(`${rel}:${i + 1}  ${line.trim().slice(0, 80)}`
      + '\n      destroys something a person made and nothing above it asks.');
  });
}

if (calls < 5) {
  console.error(`[check-destructive-confirm] only ${calls} destructive calls found in the app.`
    + ' That is fewer than this product has. Refusing to pass.');
  process.exit(1);
}

if (fails.length) {
  console.error('[check-destructive-confirm] a tap destroys something without asking:');
  for (const f of fails) console.error(`  ✗ ${f}`);
  console.error('');
  console.error('  The words are in attune-app/src/constants/delete-copy.ts, so the three places');
  console.error('  this is offered cannot ask three different questions about the same thing.');
  process.exit(1);
}

console.log(`[check-destructive-confirm] ${calls} calls in the app destroy something a person made;`
  + ` every one asks first. ${EXEMPT.size} paths are exempt as plumbing under a confirmation that`
  + ' has already happened.');
