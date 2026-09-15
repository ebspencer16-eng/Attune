#!/usr/bin/env node
/**
 * The workbook is built when results open, from one payload builder.
 *
 * ── WHAT WENT WRONG ───────────────────────────────────────────────────────
 * Ellie: "I clicked workbook and it said generating now, we'll email you when
 * it's ready. But shouldn't this have been generated immediately when our
 * results are done? Shouldn't it be there already?"
 *
 * It was generated in the browser, by a block in src/App.jsx that needs the
 * buyer's order in that browser's storage. A couple who finish and only ever
 * open the app never triggered it, and the sentence they were shown promised
 * an email that does not exist anywhere in this product.
 *
 * ── THE TWO RULES ─────────────────────────────────────────────────────────
 *   1. One payload builder. The website and the server must hand the generator
 *      the same object, or a couple gets a different workbook depending on
 *      which surface happened to build it. src/App.jsx imports it now; a
 *      second definition anywhere is the drift.
 *   2. The server triggers it at the moment results open, which is the same
 *      moment api/save-exercise.js tells a partner that the other finished.
 *      A trigger that lives anywhere else is one a phone-only couple can miss.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the .docx is any good, and whether the external PDF service is
 * configured. This is about the workbook existing at all.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const fails = [];

/** Code, with comments stripped: a word in a comment is not a definition. */
const codeOnly = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n');

// ── 1. One builder ─────────────────────────────────────────────────────────
const shared = 'api/_lib/workbook-payload.js';
if (!/export function buildWorkbookPayload/.test(read(shared))) {
  fails.push(`${shared} no longer exports buildWorkbookPayload, which both surfaces import.`);
}
for (const rel of ['src/App.jsx', 'api/store-workbook.js', 'api/store-workbook-pdf.js', 'api/generate-workbook.js']) {
  let src;
  try { src = codeOnly(read(rel)); } catch { continue; }
  if (/function buildWorkbookPayload\s*\(/.test(src)) {
    fails.push(`${rel} defines its own buildWorkbookPayload. One workbook, one payload.`);
  }
}
if (!/from ['"][^'"]*workbook-payload\.js['"]/.test(read('src/App.jsx'))) {
  fails.push('src/App.jsx does not import the shared payload builder.');
}

// ── 2. The trigger sits on the results-ready transition ────────────────────
const save = codeOnly(read('api/save-exercise.js'));
if (!/store-workbook/.test(save)) {
  fails.push('api/save-exercise.js never asks for a workbook, so a couple who only use the app never get one.');
}
if (!/announceIfComplete/.test(save)) {
  fails.push('api/save-exercise.js has no results-ready transition to hang the workbook on.');
}
// Inside that function, not somewhere else in the file: the transition is what
// makes it happen once, for the couple, at the right moment.
// Bounded to that function's own body. Slicing to the end of the file meant
// the helper it calls counted as the call, so deleting the call passed.
const at = save.indexOf('async function announceIfComplete');
const fnEnd = save.indexOf('\n}', at);
const fn = at < 0 ? '' : save.slice(at, fnEnd < 0 ? undefined : fnEnd);
if (!/makeWorkbook|store-workbook/.test(fn)) {
  fails.push('the workbook is asked for outside the results-ready transition, so it can fire at the wrong time.');
}

// ── 3. And the waiting line does not promise an email ──────────────────────
const copy = read('api/_lib/workbook-copy.js');
// Quotes of either kind, and an apostrophe inside a double-quoted one: the
// first version of this could not read "We'll email you", which is the exact
// sentence it exists to refuse.
const generating = (/generating:\s*'((?:[^'\\]|\\.)*)'/.exec(codeOnly(copy))
  || /generating:\s*"((?:[^"\\]|\\.)*)"/.exec(codeOnly(copy)))?.[1] || '';
if (!generating) fails.push('api/_lib/workbook-copy.js has no generating line.');
if (/email/i.test(generating)) {
  fails.push(`the waiting line promises an email: "${generating}". There is no workbook-ready email in this product.`);
}

if (fails.length) {
  console.error('[check-workbook-trigger] the workbook will not reach somebody:');
  for (const f of fails) console.error(`  ${f}`);
  process.exit(1);
}

console.log(`[check-workbook-trigger] one payload builder, a trigger on the results-ready transition, and a waiting line that promises nothing it cannot do: "${generating}"`);
