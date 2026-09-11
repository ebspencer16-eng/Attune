// Render smoke test. Loads every results section, and then every other view
// the website has, in a real browser, and fails on any page error or
// unresolved token in the rendered text.
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

import { readFileSync } from 'fs';

import { launch } from './_lib/browser.mjs';
import { RESULTS_SECTIONS } from '../api/_lib/results-sections.js';
import { conflictFixture } from './_lib/conflict-fixture.mjs';

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
// Conflict is included now. It used to be excluded, because its results come
// from /api/conflict-results and the demo cannot stand that up, so the four
// Conflict pages were the only results pages nothing had ever rendered.
//
// That is precisely where a break hid: the website moved to reading that
// endpoint, the demo path never fetched, and all four sat on "Loading. One
// moment." forever. The smoke test reported 26 of 26 the whole time, which is
// a green tick for a set that deliberately left out the risky part.
//
// They are covered by stubbing the endpoint with a fixture. See
// scripts/_lib/conflict-fixture.mjs for why that is a fixture and not demo
// data.
const SECTIONS = RESULTS_SECTIONS;

/**
 * ── THE OTHER THIRTEEN PAGES ───────────────────────────────────────────────
 * Results had thirty pages under test and the rest of the website had none.
 *
 * The class of break this file exists for is a scope crash: esbuild does not
 * flag an undefined variable reference, so the build is clean and the page
 * throws on render. That has nothing to do with results. It is a property of
 * src/App.jsx being one file of fifteen thousand lines, and every view in it
 * is equally exposed. Exercise 1, the dashboard, the account page and the
 * three tools could each have been throwing for months with every gate green.
 *
 * The list is read out of App.jsx rather than written here, because a list of
 * views typed into a test is the thing this repo keeps getting wrong: the old
 * hardcoded section list asked for a section that does not exist, and nobody
 * noticed because a phantom reports as a skip.
 *
 * `?view=` is the app's own entry point for this, the same one the results
 * run already uses.
 */
const VIEWS = (() => {
  const src = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const ids = new Set();
  for (const m of src.matchAll(/view\s*===\s*["']([a-zA-Z0-9_-]+)["']/g)) ids.add(m[1]);
  ids.delete('results');   // covered section by section above
  return [...ids].sort();
})();

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

/**
 * Stub /api/conflict-results in every document, before the app's own scripts.
 *
 * It has to be before: the app fetches this in an effect on mount, so a stub
 * installed after the navigation settles answers nothing and the four Conflict
 * pages report as having no data. Which is what they did on the first attempt.
 */
const CONFLICT_BODY = JSON.stringify(conflictFixture());
await page.onNewDocument(`
  (() => {
    const body = ${JSON.stringify(CONFLICT_BODY)};
    const real = window.fetch.bind(window);
    window.fetch = (url, opts) => {
      const u = typeof url === 'string' ? url : (url && url.url) || '';
      if (u.includes('/api/conflict-results')) {
        return Promise.resolve(new Response(body, {
          status: 200, headers: { 'Content-Type': 'application/json' },
        }));
      }
      return real(url, opts);
    };
  })();
`);

for (const section of SECTIONS) {
  errors.length = 0;
  await page.evaluate(
    (s) => localStorage.setItem('attune_results_state', JSON.stringify({ activeResult: s, highlightsSeen: true })),
    section,
  );
  // intimacy=1 because Premium no longer bundles Physical Intimacy; it is an
  // add-on now, and without this flag the eight intimacy sections have no demo
  // data and the run silently covers 18 of 26 instead of 26.
  // conflict=1 makes the demo path actually fetch, which the stub then answers.
  await page.goto(`${BASE}/?demo=1&type=${TYPE}&pkg=${PKG}&intimacy=1&conflict=1&view=results`);
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

/**
 * The rest of the website, one view at a time.
 *
 * Only page errors count here. A view that redirects to home because the demo
 * package does not own it, or that renders a sign-in wall, is behaving
 * correctly; what is being looked for is a throw. That is deliberately a
 * weaker check than the one above, and it is still the one that would have
 * caught the crash this file was written for.
 */
let viewFailed = 0;
const bounced = [];
console.log('');

/**
 * What home looks like, so a view that bounced to it can be told apart from
 * one that rendered.
 *
 * Without this the run is worth very little: an effect sends a view the demo
 * package does not own straight back to home, so thirteen ok lines could be
 * the home page thirteen times and the report would read the same. A gate that
 * passes for the wrong reason is worse than no gate, and "every page is clean"
 * is exactly the sentence nobody re-examines.
 *
 * A bounce is not a failure. It is the app doing what it should. It is only
 * reported so the number at the end says how many views were actually seen.
 */
const pageText = () => page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').trim());
await page.goto(`${BASE}/?demo=1&type=${TYPE}&pkg=${PKG}&intimacy=1&conflict=1&view=home`);
await page.wait(900);
const homeText = await pageText();

for (const v of VIEWS) {
  errors.length = 0;
  await page.goto(`${BASE}/?demo=1&type=${TYPE}&pkg=${PKG}&intimacy=1&conflict=1&view=${v}`);
  await page.wait(900);
  const text = await pageText();
  if (errors.length) {
    viewFailed += 1;
    console.error(`  FAIL  view:${v}`);
    for (const e of errors.slice(0, 3)) console.error(`        ${e.slice(0, 160)}`);
  } else if (v !== 'home' && text === homeText) {
    bounced.push(v);
    console.log(`  BACK  view:${v}  (sent back to home, so nothing of its own was rendered)`);
  } else {
    console.log(`  ok    view:${v}`);
  }
}

await page.close();

if (failed || viewFailed) {
  if (failed) console.error(`\n[check-render] ${failed} of ${SECTIONS.length} sections failed.`);
  if (viewFailed) console.error(`[check-render] ${viewFailed} of ${VIEWS.length} other views threw on render.`);
  process.exit(1);
}
console.log(`\n[check-render] ${SECTIONS.length - skipped.length} of ${SECTIONS.length} sections and ${VIEWS.length - bounced.length} of ${VIEWS.length} other views rendered clean (${TYPE}, ${PKG}).`);
if (bounced.length) console.log(`[check-render] sent back to home, not rendered: ${bounced.join(', ')}`);
if (skipped.length) console.log(`[check-render] skipped, no demo data: ${skipped.join(', ')}`);
