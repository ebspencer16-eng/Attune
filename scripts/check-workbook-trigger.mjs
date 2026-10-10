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
 *   2. The waiting line promises nothing the product cannot do.
 *
 * ── WHERE THE TRIGGER ITSELF IS CHECKED ───────────────────────────────────
 * Not here, any more. This file used to test that api/save-exercise.js asked
 * for a workbook inside its results-ready transition, by reading the file. The
 * trigger moved into api/_lib/completion.js, because the website finishes an
 * exercise without going through that endpoint at all, and
 * check-completion-reach.mjs now RUNS it: four couples, and the build and the
 * alert have to happen at the transition and not on either side of it.
 *
 * Keeping a second, weaker version of that rule here would be two gates on one
 * promise, which drift, and the weaker one wins because it is the one that
 * still passes. So this file keeps the halves that gate does not touch.
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

// ── 2. And the waiting line does not promise an email ──────────────────────
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

console.log(`[check-workbook-trigger] one payload builder, and a waiting line that promises nothing it cannot do: "${generating}". The trigger itself is check-completion-reach.`);
