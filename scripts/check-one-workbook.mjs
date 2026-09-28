#!/usr/bin/env node
/**
 * Every workbook a customer opens is the page the website prints.
 *
 * ── THE DRIFT, TWICE ──────────────────────────────────────────────────────
 * CLAUDE.md records the first time: a .docx was converted to HTML, then to a
 * PDF, with a font pipeline built for it, while public/workbook-render.html had
 * been there the whole time. Ellie: "This does not look like the workbook we
 * render on the site. Please use the exact same pdf builder."
 *
 * It happened again, quieter. /api/store-workbook built its file by calling
 * /api/generate-workbook, which assembles a .docx out of the `docx` package. The
 * app opens whatever file that stored, first, before anything else, because that
 * is its fast path. So the workbook a tester saw on a phone was a different
 * document in a different format with none of the design of the page that was
 * approved, and the website was printing the right one the whole time.
 *
 * Ellie, again: "the downloaded workbook I'm peeking on the simulator does not
 * have the same look and feel as the workbook we've built online. This is very
 * important to me and you've drifted before, please use the script that already
 * exists."
 *
 * Twice is a pattern, and a pattern needs a gate rather than a third apology.
 *
 * ── WHAT THIS CHECKS ──────────────────────────────────────────────────────
 * Nothing a customer can open is built by the .docx generator. That means
 * store-workbook renders through the PDF builder, and the app never reaches for
 * generate-workbook at all.
 *
 * And the honest fallback: when there is no PDF renderer configured,
 * store-workbook stores nothing rather than storing the .docx under a .pdf name.
 * generate-pdf redirects to the .docx generator when it has no token, so a
 * response that is followed without checking its type is the exact shape this
 * drift takes.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The .docx generator itself, which stays. The website offers it as a download
 * on its own workbook page and that is a customer choosing a Word file on
 * purpose, not a surface quietly serving a different document. What is forbidden
 * is a path that ends in a .docx while the customer asked for the workbook.
 *
 * Not what the PDF looks like. check-workbook-view holds the page to the payload
 * both surfaces send, and a rendered page cannot be compared here.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

const store = readFileSync(`${ROOT}api/store-workbook.js`, 'utf8');
const code = store.split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)).join('\n');

/** The file it stores comes from the PDF builder. */
if (!/\/api\/generate-pdf/.test(code)) {
  fails.push('api/store-workbook.js does not call /api/generate-pdf. That is the'
    + ' builder that renders public/workbook-render.html, which is the workbook the'
    + ' website prints and the one that was approved.');
}
if (/\/api\/generate-workbook\b/.test(code)) {
  fails.push('api/store-workbook.js calls /api/generate-workbook, the .docx'
    + ' generator. The app opens the file this stores before it tries anything'
    + ' else, so that is the document a tester gets, and it is not the one on the'
    + ' website. This is the drift Ellie has reported twice.');
}

/**
 * And it refuses to store anything it cannot confirm is a PDF.
 *
 * Matched on the GUARD, not on the presence of the words. The first version asked
 * whether BROWSERLESS_TOKEN and application/pdf appeared anywhere in the file,
 * and both plants passed: replacing each condition with `false` leaves every
 * string exactly where it was. Disabling a branch with a constant is the way this
 * check would actually be defeated, so it is the way it is tested.
 */
if (!/if\s*\(\s*!process\.env\.BROWSERLESS_TOKEN\s*\)/.test(code)) {
  fails.push('api/store-workbook.js does not refuse to run when no PDF renderer is'
    + ' configured. Without one, generate-pdf redirects to the .docx generator, and'
    + ' storing what comes back puts that document in storage wearing a .pdf name.');
}
if (!/if\s*\(\s*!\/application\\\/pdf\/i\.test\(\s*type\s*\)\s*\)/.test(code)) {
  fails.push('api/store-workbook.js does not test the content type of what it'
    + ' received against application/pdf before storing it. A redirect to the .docx'
    + ' generator answers 200 with a Word file, and nothing about that response says'
    + ' it is the wrong document.');
}
if (/\.docx`/.test(code)) {
  fails.push('api/store-workbook.js still names its file .docx.');
}

/** The app must not reach for the .docx generator on any path. */
const appFiles = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(p)) appFiles.push(p);
  }
})(join(ROOT, 'attune-app/src'));

for (const f of appFiles) {
  const src = readFileSync(f, 'utf8');
  src.split('\n').forEach((line, i) => {
    if (/^\s*(\*|\/\/)/.test(line)) return;
    if (/generate-workbook/.test(line)) {
      fails.push(`${f.replace(ROOT, '')}:${i + 1} reaches for the .docx generator.`
        + ' The app opens the stored PDF, or hands the payload to the browser to'
        + ' draw the same page. It never builds a Word file.'
        + `\n      ${line.trim().slice(0, 120)}`);
    }
  });
}

/** The page everything is supposed to render still exists. */
try {
  const page = readFileSync(`${ROOT}public/workbook-render.html`, 'utf8');
  if (!/workbook-ready/.test(page)) {
    fails.push('public/workbook-render.html has no .workbook-ready marker, which is'
      + ' what generate-pdf waits for before printing. Without it the PDF is'
      + ' whatever had loaded when the timeout fired.');
  }
} catch {
  console.error('[check-one-workbook] public/workbook-render.html is missing. That'
    + ' page IS the workbook. Refusing to pass.');
  process.exit(1);
}

if (fails.length) {
  console.error('\n check-one-workbook: a customer can be handed a different document.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log('[check-one-workbook] the stored file is rendered from'
  + ' public/workbook-render.html through the PDF builder, nothing is stored when'
  + ' there is no renderer, and the app never reaches for the .docx generator.');
