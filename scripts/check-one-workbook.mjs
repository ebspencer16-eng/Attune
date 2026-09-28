#!/usr/bin/env node
/**
 * There is one workbook, and it is the one the PDF service renders.
 *
 * ── THREE BUILDERS, AND I PICKED WRONG TWICE ──────────────────────────────
 * This repo contains three things that will produce a workbook:
 *
 *   1. scripts/build_workbook.py, printed by scripts/render_workbook.mjs with
 *      Playwright, containerised by Dockerfile.workbook, reached through
 *      /api/store-workbook-pdf. Full bleed cover, editorial layout.
 *      THIS IS THE WORKBOOK.
 *   2. public/workbook-render.html, printed by /api/generate-pdf via
 *      Browserless. A simpler page.
 *   3. api/generate-workbook.js, a .docx assembled with the `docx` package.
 *
 * The website has called (1) all along. The app called (3), then I changed it to
 * (2) and wrote a gate saying (2) was correct. Both were wrong, and Ellie has
 * now told me three times: "On my phone this doesn't look anything like the
 * builder we built a long time ago, with the full bleed front page... The one we
 * built looked like an editorial magazine. This has happened before in my claude
 * chats, please locate the correct builder."
 *
 * The previous version of this file is the worst kind of gate: specific,
 * confident, about exactly this, and aimed at the wrong half. It would have kept
 * the app on the wrong document for as long as it passed.
 *
 * ── WHY THE APP WAS ON THE WRONG ONE ──────────────────────────────────────
 * Not taste. /api/store-workbook accepted a user id and assembled the payload on
 * the server; /api/store-workbook-pdf wanted the payload the website builds in
 * the browser, which the app does not have. So the app used the endpoint that
 * would take what it had. That difference is gone: store-workbook-pdf assembles
 * from a user id too, using the same builder store-workbook used.
 *
 * ── WHAT THIS CHECKS ──────────────────────────────────────────────────────
 * Every path a customer can take to a workbook ends at the PDF service. The app
 * asks for it through /api/store-workbook-pdf and has no renderer of its own.
 * The server-side trigger, which fires when a couple's results open, asks the
 * same endpoint. And the service's own pieces are all present, because the thing
 * that makes this builder easy to lose is that it lives in four files with no
 * import edge between them and the rest of the codebase.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The .docx generator stays. The website offers it as its own download and that
 * is a customer choosing a Word file on purpose.
 *
 * public/workbook-render.html stays too. It is what /api/workbook-view serves
 * and the website's own print path, and check-workbook-view holds it to its
 * callers. What is forbidden is the APP reaching for it, because the app's
 * workbook is the PDF.
 *
 * Whether the service is deployed. WORKBOOK_SERVICE_URL is an environment
 * variable on Vercel and a check cannot read it. What it can do is make sure
 * nothing silently substitutes another document when the service is missing,
 * which is the failure that produced this whole mess.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];
const bare = (src) => src.split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)).join('\n');

/** The service's four pieces. Lose one and the workbook cannot be built at all. */
const PIECES = [
  ['scripts/build_workbook.py', 'renders the workbook HTML, cover and all'],
  ['scripts/render_workbook.mjs', 'prints that HTML to PDF with Playwright'],
  ['scripts/service.mjs', 'the HTTP service the two run behind'],
  ['Dockerfile.workbook', 'builds the container they are deployed in'],
];
for (const [f, what] of PIECES) {
  if (!existsSync(`${ROOT}${f}`)) {
    fails.push(`${f} is missing. It ${what}, and it is part of the only builder`
      + ' that produces the workbook Ellie approved. Nothing in api/ imports it, so'
      + ' nothing else would notice it had gone.');
  }
}

/** The endpoint that reaches it. */
const endpoint = bare(readFileSync(`${ROOT}api/store-workbook-pdf.js`, 'utf8'));
if (!/WORKBOOK_SERVICE_URL/.test(endpoint)) {
  fails.push('api/store-workbook-pdf.js no longer posts to the workbook service.');
}
/* Matched on the CALL. Renaming it to payloadForCoupleX was planted and passed,
   because the substring survives. This session has now made that mistake in four
   separate gates, so it is worth stating once more: a name is matched with what
   follows it. */
if (!/payloadForCouple\(/.test(endpoint)) {
  fails.push('api/store-workbook-pdf.js cannot assemble a payload from a user id.'
    + ' That is the only reason the app ever used a different endpoint, and a'
    + ' different endpoint is a different document.');
}

/** Every customer path ends there. */
const appFiles = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(p)) appFiles.push(p);
  }
})(join(ROOT, 'attune-app/src'));

let appAsks = false;
for (const f of appFiles) {
  const src = readFileSync(f, 'utf8');
  src.split('\n').forEach((line, i) => {
    if (/^\s*(\*|\/\/)/.test(line)) return;
    const at = `${f.replace(ROOT, '')}:${i + 1}`;
    if (/store-workbook-pdf/.test(line)) appAsks = true;
    if (/['"`]\/api\/store-workbook['"`]/.test(line)) {
      fails.push(`${at} asks /api/store-workbook, which builds a different document.`
        + ' The workbook is /api/store-workbook-pdf.');
    }
    if (/generate-workbook/.test(line)) {
      fails.push(`${at} reaches for the .docx generator.`);
    }
    if (/workbook-render/.test(line)) {
      fails.push(`${at} opens the website's print page. That is a second renderer`
        + ' and it is not the workbook: it has no full bleed cover and none of the'
        + ' editorial layout. The app asks the service for a PDF.');
    }
  });
}
if (!appAsks) {
  fails.push('no app file asks /api/store-workbook-pdf, so the app has no way to'
    + ' get the workbook at all.');
}

/** And the trigger that builds one the moment a couple's results open. */
const save = bare(readFileSync(`${ROOT}api/save-exercise.js`, 'utf8'));
if (/\/api\/store-workbook['"`]/.test(save)) {
  fails.push('api/save-exercise.js builds the workbook through /api/store-workbook'
    + ' when a couple finishes, so the file waiting for them is the wrong document'
    + ' before they ever tap anything.');
}
if (!/store-workbook-pdf/.test(save)) {
  fails.push('api/save-exercise.js no longer builds a workbook when a couple\'s'
    + ' results open, so nothing is ready when they go looking for it.');
}

if (fails.length) {
  console.error('\n check-one-workbook: a customer can be handed a different document.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log('[check-one-workbook] the workbook is the PDF service: its four pieces'
  + ' are present, the app and the completion trigger both ask'
  + ' /api/store-workbook-pdf, and nothing in the app renders one itself.');
