// Render smoke test. Loads every results section in a real browser and fails
// on any page error or unresolved token in the rendered text.
//
// This exists because esbuild does not flag undefined variable references. A
// scope crash builds clean and throws at render: extracting buildCommsProtocols
// pulled glancePlan out of PersonalityResults with it, the build passed, and
// the comms glance page threw a ReferenceError for every user. Only a real
// render catches that class.
//
// Not part of `npm run build` — it needs a browser and a running preview, so
// Vercel cannot run it. `npm run smoke` builds, starts a preview, runs this and
// stops the preview.
//
// It used to require Playwright and a Chromium build through two hardcoded
// absolute paths inside one sandbox, so it could not run on any machine anyone
// actually works on. It drives whatever Chrome is installed now, over the
// DevTools protocol, with no dependency. See scripts/_lib/browser.mjs.
//
// Optional: BASE=http://127.0.0.1:4173 TYPE=WX PKG=premium CHROME=/path/to/chrome

import { launch } from './_lib/browser.mjs';
import { RESULTS_SECTIONS } from '../api/_lib/results-sections.js';

const BASE = process.env.BASE || 'http://localhost:4173';
const TYPE = process.env.TYPE || 'WX';
const PKG = process.env.PKG || 'premium';

// The sections come from the registry, not from a list kept here.
//
// This was written out by hand and had gone stale: it asked for exp-convo-5,
// which does not exist. There are five expectations categories, so the
// conversations are 0 to 4. A phantom section reports as skipped, which reads
// like missing demo data rather than a list that stopped matching the product.
//
// Conflict is excluded because its results come from /api/conflict-results,
// which the demo does not stand up. Excluded by name, from the same registry,
// so it stays correct if the conflict section list changes.
const SECTIONS = RESULTS_SECTIONS.filter((id) => !id.startsWith('conflict-'));

// Anything in braces that survived to the screen, plus the two words that mean
// a value was missing rather than absent.
const LEAK = /\{[A-Za-z_][A-Za-z0-9_]*\}|\[[WXYZ] partner name\]|\bundefined\b|\bNaN\b/g;

const page = await launch({ width: 1280, height: 1200 });

const errors = [];
page.on('pageerror', (text) => errors.push('pageerror: ' + text));
page.on('console', (m) => {
  // 403/404 are the demo's missing Supabase calls, not render failures.
  if (m.type === 'error' && !/403|404|Failed to load resource/.test(m.text)) errors.push('console: ' + m.text);
});

let failed = 0;
const skipped = [];
await page.goto(BASE + '/');

for (const section of SECTIONS) {
  errors.length = 0;
  await page.evaluate(
    (s) => localStorage.setItem('attune_results_state', JSON.stringify({ activeResult: s, highlightsSeen: true })),
    section,
  );
  // intimacy=1 because Premium no longer bundles Physical Intimacy; it is an
  // add-on now, and without this flag the eight intimacy sections have no demo
  // data and the run silently covers 18 of 26 instead of 26.
  await page.goto(`${BASE}/?demo=1&type=${TYPE}&pkg=${PKG}&intimacy=1&view=results`);
  await page.wait(900);

  // Read the results column, not the whole document: a section the demo has no
  // data for still renders the shell and the marketing footer, which is long
  // enough to pass a body-length check while showing the user nothing.
  const text = await page.evaluate(() => {
    const el = document.querySelector('[data-results-scroll]');
    return (el ? el.innerText : document.body.innerText) || '';
  });
  const leaks = [...new Set((text.match(LEAK) || []))];
  // A section the demo has no data for still renders the shell and the site
  // footer, so the column is not empty: it comes to ~290 characters of nav
  // links and nothing else. Every real section is several times that. 600 sits
  // well clear of both.
  const empty = text.trim().length < 600;
  // A section this couple cannot reach now redirects to highlights rather than
  // rendering blank, so a length check alone would call it clean. Ask where we
  // actually landed.
  const landed = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('attune_results_state') || '{}').activeResult; } catch { return null; }
  });
  const redirected = landed && landed !== section;

  const problems = [
    ...errors,
    ...(leaks.length ? ['leaked: ' + leaks.slice(0, 4).join(', ')] : []),
  ];
  if (problems.length) {
    failed++;
    console.error(`  FAIL  ${section}`);
    for (const p of problems.slice(0, 3)) console.error(`        ${p.slice(0, 160)}`);
  } else if (redirected || empty) {
    // Not a failure: the section exists but the demo has no answers for it, so
    // there is nothing to render and nothing to check. Reported loudly rather
    // than silently passed, because a section that can never be seen in demo
    // is also a section nobody has visually reviewed.
    skipped.push(section);
    console.log(`  SKIP  ${section}  (${redirected ? 'not available for this package, redirected to ' + landed : 'no demo data — ' + text.trim().length + ' chars'})`);
  } else {
    console.log(`  ok    ${section}`);
  }
}

await page.close();

if (failed) {
  console.error(`\n[check-render] ${failed} of ${SECTIONS.length} sections failed.`);
  process.exit(1);
}
console.log(`\n[check-render] ${SECTIONS.length - skipped.length} of ${SECTIONS.length} sections rendered clean (${TYPE}, ${PKG}).`);
if (skipped.length) console.log(`[check-render] skipped, no demo data: ${skipped.join(', ')}`);
