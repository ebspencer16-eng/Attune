// Fails the build when a customer-facing surface cannot show the privacy
// notice.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// public/_flags.js carries the launch flags and the privacy notice, and nine
// static pages load it. index.html, which is the whole of the portal and the
// app's web build, did not. So the portal showed no notice at all.
//
// That was untidy for as long as the notice was only a notice. It became a
// defect the day the notice became a consent gate for the EU, the UK, the EEA
// and Switzerland: somebody who buys on the website and then only ever opens
// /app was never asked, and Sentry, which is what a decline stops, was never
// offered the question.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// 1. Every customer-facing page loads _flags.js. Derived: every HTML file
//    under public/ that is not an internal tool, plus index.html.
// 2. The "get the app" bar inside it skips the portal, which draws its own.
//    Without that check, loading the file there puts two identical bars on
//    the same page.
//
// ── WHAT IS DELIBERATELY EXEMPT ────────────────────────────────────────────
// admin.html, the two QR card templates and email-preview.html. None of them
// is a page a customer lands on: one is Ellie's dashboard behind a password,
// two are print templates rendered to PDF, and the fourth is a preview of an
// email. 404.html is exempt because it is what a visitor sees when a URL is
// wrong, and a consent gate on top of an error page helps nobody.

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

const EXEMPT = new Set([
  'admin.html',            // behind a password, not a customer surface
  'qr-card-v5.html',       // print template, rendered to PDF
  'qr-cards-print.html',   // print template
  'email-preview.html',    // a preview of an email
  '404.html',              // an error page is not the place to ask
  'workbook-render.html',  // print template, rendered to PDF by api/generate-pdf.js
  'portal.html',           // a redirect stub, nobody reads it
]);

const pages = ['index.html'];
(function walk(dir) {
  for (const f of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, f);
    if (statSync(join(ROOT, rel)).isDirectory()) { walk(rel); continue; }
    if (!f.endsWith('.html')) continue;
    if (EXEMPT.has(f)) continue;
    pages.push(rel);
  }
})('public');

if (pages.length < 10) {
  console.error(`[check-notice-reach] only found ${pages.length} pages; refusing to pass.`);
  process.exit(1);
}

const problems = [];
for (const p of pages) {
  if (/_flags\.js/.test(read(p))) continue;
  problems.push(
    `${p} does not load /_flags.js, so it shows no privacy notice.\n`
    + '      Where consent is required, nobody on this page is ever asked.');
}

// The duplicate-bar guard.
const flags = read('public/_flags.js')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|\s)\/\/[^\n]*/g, ' ');
if (!/getElementById\('root'\)/.test(flags)) {
  problems.push(
    'public/_flags.js does not skip its "get the app" bar inside the React app.\n'
    + '      index.html loads this file now, and the portal draws its own bar, so\n'
    + '      the page would carry two identical ones.');
}

if (problems.length) {
  console.error('[check-notice-reach] a page cannot show the privacy notice:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`[check-notice-reach] ${pages.length} customer-facing pages, every one loads the notice.`);
