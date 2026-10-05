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
import { RESULTS_SECTIONS, COVER_SECTIONS, RESULTS_SECTION_LABELS, PAGE_COPY } from '../api/_lib/results-sections.js';
import { conflictDemo } from '../api/_lib/conflict-demo.js';
import { PKG_CAPS } from '../api/_lib/entitlements.js';

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
// They are covered by stubbing the endpoint with the demo couple, which now
// lives in api/_lib/conflict-demo.js and is the same couple the showcase
// serves. It used to be a fixture here, kept separate because the written
// answers were customer copy; Ellie has since said the showcase is admin-only,
// so there is one demo couple rather than two drifting apart.
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
/**
 * ── EACH VIEW, AT A PACKAGE THAT OWNS IT ──────────────────────────────────
 * Every view used to be driven at one package, premium, and every one of them
 * reported ok. Two of the thirteen rendered nothing at all:
 *
 *   home       cannot render signed out. `?view=home` shows the account form
 *              and nothing behind it, so the dashboard — the screen Ellie looks
 *              at most, and the one whose tiles she has reported wrong three
 *              times — had never been rendered by any check here.
 *   checklist  is gated on `pkg.hasChecklist`, and PKG_CAPS grants that to
 *              newlywed alone. At premium the condition is false and the page
 *              is a header and a cookie banner: 314 characters, reported clean.
 *              The Merging Lives Checklist had never been rendered either.
 *
 * Both were "ok" because the only assertion was that nothing threw. A page that
 * renders nothing throws nothing.
 *
 * So the capability each view needs is read out of src/App.jsx, where it is
 * written as `view === "x" && pkg.hasY`, and the package is the first in
 * PKG_CAPS that grants it. Derived on both sides: a view gated on a seventh
 * capability is covered the day it is added, and a package that stops including
 * something moves the run rather than quietly skipping it.
 */
const APP_SRC = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

const VIEWS = (() => {
  const ids = new Set();
  for (const m of APP_SRC.matchAll(/view\s*===\s*["']([a-zA-Z0-9_-]+)["']/g)) ids.add(m[1]);
  ids.delete('results');   // covered section by section above
  return [...ids].sort();
})();

/** `view === "checklist" && pkg.hasChecklist` → checklist needs hasChecklist. */
const VIEW_NEEDS = Object.fromEntries(
  [...APP_SRC.matchAll(/view\s*===\s*["']([a-zA-Z0-9_-]+)["']\s*&&\s*pkg\.(has[A-Za-z]+)/g)]
    .map((m) => [m[1], m[2]]),
);

/** The cheapest package that grants a capability, or the run's default. */
function pkgFor(view) {
  const need = VIEW_NEEDS[view];
  if (!need) return PKG;
  if ((PKG_CAPS[PKG] || {})[need]) return PKG;
  /* A capability PKG_CAPS does not name is the website's own flag, not a
     package's, so no package choice helps and the run's default stands. */
  const owner = Object.keys(PKG_CAPS).find((k) => PKG_CAPS[k][need]);
  return owner || PKG;
}

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
const unrendered = [];
await page.goto(BASE + '/');

/**
 * Stub /api/conflict-results in every document, before the app's own scripts.
 *
 * It has to be before: the app fetches this in an effect on mount, so a stub
 * installed after the navigation settles answers nothing and the four Conflict
 * pages report as having no data. Which is what they did on the first attempt.
 */
const CONFLICT_BODY = JSON.stringify(conflictDemo());
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
  /**
   * ── A COVER IS SHORT ON PURPOSE ─────────────────────────────────────────
   * Ellie: "Mirror cover pages for exercises and results on both web and app."
   * A chapter cover is a mark, a name and one control, which comes to about
   * five hundred characters including the nav. Judging it by length would call
   * every one of them empty, and the length rule is what reported two of them
   * as "no demo data" for months while they rendered nothing at all.
   *
   * So a cover is judged by what it has to carry: the chapter's name, from
   * RESULTS_SECTION_LABELS, and the one word on its button, from PAGE_COPY.
   * Both come from the modules the app reads, so this also fails if the two
   * surfaces stop agreeing about either.
   */
  const isCover = COVER_SECTIONS.includes(section);
  const coverMissing = isCover
    ? await page.evaluate(({ want, cta }) => {
      const el = document.querySelector('[data-results-scroll]');
      if (!el) return 'no results column at all';
      const h1 = el.querySelector('h1');
      if (!h1 || h1.innerText.trim() !== want) return `no heading reading "${want}" (found ${JSON.stringify(h1 ? h1.innerText.trim() : null)})`;
      const hasCta = [...el.querySelectorAll('button')].some((b) => (b.textContent || '').trim() === cta);
      return hasCta ? null : `no button reading "${cta}"`;
    }, { want: RESULTS_SECTION_LABELS[section] || '', cta: PAGE_COPY.coverStart })
    : null;
  const empty = !isCover && text.trim().length < 600;
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
    ...(coverMissing ? [`cover page: ${coverMissing}`] : []),
  ];
  if (problems.length) {
    failed++;
    console.error(`  FAIL  ${section}`);
    for (const p of problems.slice(0, 3)) console.error(`        ${p.slice(0, 160)}`);
  } else if (redirected || empty) {
    /**
     * Not a failure, and it has to say WHICH not-a-failure.
     *
     * This line read "no demo data" for every short page, and for two of them
     * that was false and had been for a while. reflection-cover and
     * intimacy-cover are not short of answers: src/App.jsx has no branch for a
     * -cover section at all, so the results column renders nothing and what is
     * measured is the marketing footer underneath it. A reason invented by the
     * reporter is the check:docs failure in miniature. Eighteen generators
     * "failed" for a year because the message never separated broken from
     * unavailable, and nobody read the line again after the first week.
     *
     * The three lengths are far enough apart to tell apart. A real section is
     * thousands of characters. A section with no demo answers still draws the
     * results shell and its nav, around 290. A section with no renderer draws no
     * column at all and leaves only the site footer, around 250.
     */
    skipped.push(section);
    const why = redirected
      ? `not available for this package, redirected to ${landed}`
      : text.trim().length < 300
        ? `nothing rendered — ${text.trim().length} chars, less than the empty results`
          + ' shell, so this is a section the website has no renderer for rather than one'
          + ' the demo has no answers for'
        : `no demo data — ${text.trim().length} chars`;
    console.log(`  SKIP  ${section}  (${why})`);
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
/**
 * What the page says, and what it says that is its own.
 *
 * A view reached while signed out gets the account form over it, which is
 * correct and is what a visitor needs. It is also a thousand characters of text
 * that belongs to the form rather than to the view, and the old comparison
 * counted it: `view=home` renders the form and NOTHING else, and passed.
 *
 * So the form's own text is subtracted. What is left is the view's.
 */
/**
 * What this view drew, in the region the app draws views into.
 *
 * ── WHY THE CONTENT REGION AND NOT THE PAGE ─────────────────────────────
 * A view reached while signed out gets the account form over it, and every page
 * carries a nav and a cookie banner. That is a thousand characters that belong
 * to the chrome rather than to the view, and counting it is what let
 * `view=home` pass while rendering nothing at all.
 *
 * Earlier attempts subtracted the chrome by vocabulary, and twice the baseline
 * swallowed real copy and reported working views as broken: an unknown view
 * falls through to the results page, and the demo seeds answers so an empty
 * page can still carry a completion sentence. Measuring the one region the app
 * renders into, with fixed overlays taken out of it, needs no vocabulary and
 * no guess.
 *
 * innerText, not textContent: the region carries a <style> block, and
 * textContent returns the CSS.
 */
const pageText = () => page.evaluate(() => {
  const main = document.querySelector('[data-main-scroll]');
  if (!main) return { own: '', gated: false, found: false };
  let t = (main.innerText || '').replace(/\s+/g, ' ').trim();
  let gated = false;
  for (const el of main.querySelectorAll('div')) {
    if (getComputedStyle(el).position !== 'fixed') continue;
    const sub = (el.innerText || '').replace(/\s+/g, ' ').trim();
    if (!sub) continue;
    if (/Create account|Sign in to/.test(sub)) gated = true;
    t = t.replace(sub, '').trim();
  }
  return { own: t, gated, found: true };
});

/**
 * The words a page carries when it has rendered nothing: the nav, the demo
 * toolbar, the cookie banner.
 *
 * Measured rather than chosen, from two pages that really do render nothing: a
 * view that does not exist, and a view this package does not own. The second is
 * the shape that was being reported clean, so it is the one worth taking the
 * baseline from.
 *
 * ── WHY WORDS AND NOT A LENGTH ──────────────────────────────────────────
 * A length cannot tell a short real page from an empty one. `view=notes`
 * signed out renders one sentence, 26 characters of its own, and that is the
 * app doing the right thing; `view=checklist` at a package that does not own it
 * renders nothing, and comes to more characters because of the chrome around
 * it. A view has rendered something when it puts a word on the page that an
 * empty one does not have.
 */
/**
 * A view, rendered from its URL and nothing else.
 *
 * The section loop above leaves `attune_results_state` behind, and an unknown
 * view then falls through to the results page. The first version of this took
 * its baseline after that loop and came back with 172 words of results copy —
 * communication, conflict, patterns, intimacy — as the definition of an empty
 * page. Everything real was a subset of it, and four working views were
 * reported as rendering nothing.
 *
 * A gate that matches too much is not the safe direction: it manufactures the
 * evidence it was meant to look for. So each view starts from a clean browser,
 * which is also what a visitor following a link has.
 */
async function freshView(url) {
  await page.goto(url);
  await page.evaluate(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch { /* blocked */ }
  });
  await page.goto(url);
  await page.wait(900);
  return pageText();
}
/**
 * ── THE BASELINE IS A VIEW THIS PACKAGE DOES NOT OWN ──────────────────────
 * Not a view that does not exist: `?view=__nothing__` falls through to the
 * results page, so taking the baseline from it put every word of the results
 * copy into the definition of "empty". Everything real was then a subset of it
 * and four working views were reported as rendering nothing.
 *
 * A gate that matches too much is not the safe direction: it manufactures the
 * evidence it was meant to look for. Found by printing the baseline rather than
 * trusting it, which is worth doing to any set a check compares against.
 *
 * An unowned view is the real empty page: the app reached the view, decided
 * this couple does not own it, and drew the chrome. It is also exactly the page
 * that was being reported clean.
 */
/*
 * Only capabilities PKG_CAPS actually names. src/App.jsx also gates views on
 * `pkg.hasAnniversary` and `pkg.hasIntimacy`, which are the website's own
 * vocabulary and its add-on flags rather than package capabilities; treating an
 * unknown name as "not owned" picked exercise3 as the empty page and took the
 * baseline from a view that renders.
 */
const unowned = Object.keys(VIEW_NEEDS)
  .find((v) => Object.values(PKG_CAPS).some((c) => VIEW_NEEDS[v] in c)
    && !(PKG_CAPS[PKG] || {})[VIEW_NEEDS[v]]);
if (!unowned) {
  console.error(`[check-render] every gated view is owned by ${PKG}, so there is no page that`
    + ' renders nothing to measure an empty one from.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}
const emptyPage = await freshView(
  `${BASE}/?demo=1&type=${TYPE}&pkg=${PKG}&intimacy=1&conflict=1&view=${unowned}`);
if (!emptyPage.found) {
  console.error('[check-render] the page has no [data-main-scroll] region, so there is nothing to'
    + ' measure a view in.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}
/** What the region holds when the app has decided not to draw the view. */
const EMPTY = emptyPage.own.length;
if (process.env.RENDER_DEBUG) console.log(`  empty region: ${EMPTY} chars ${JSON.stringify(emptyPage.own)}`);
if (EMPTY > 120) {
  console.error(`[check-render] a view the package does not own still draws ${EMPTY} characters,`
    + ' so this cannot tell an empty view from a drawn one.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

/**
 * How much more than nothing counts as having drawn something.
 *
 * Measured: an unowned view draws 16 characters, the dashboard signed out draws
 * 0, and the thinnest real view is Notes at 43, which is one deliberate
 * sentence. 20 sits clear of both sides.
 */
const DREW = 20;

for (const v of VIEWS) {
  errors.length = 0;
  const pkg = pkgFor(v);
  const text = await freshView(
    `${BASE}/?demo=1&type=${TYPE}&pkg=${pkg}&intimacy=1&conflict=1&view=${v}`);
  const note = pkg === PKG ? '' : `  (${pkg}, which is what owns it)`;

  if (errors.length) {
    viewFailed += 1;
    console.error(`  FAIL  view:${v}`);
    for (const e of errors.slice(0, 3)) console.error(`        ${e.slice(0, 160)}`);
    continue;
  }

  /**
   * Nothing of its own. Not a failure and not a pass: it has to say which.
   *
   * `home` is the known one and it cannot be otherwise, because the dashboard
   * is built from an account and the demo has none. Saying "ok" about it for
   * months is how the screen Ellie looks at most went unrendered by every check
   * here. AppHome itself is driven by check-prompt-tiles.
   */
  if (text.own.length - EMPTY < DREW) {
    unrendered.push(v);
    const why = v === 'home'
      ? 'the dashboard is built from an account and the demo has none; AppHome is driven by check-prompt-tiles'
      : `${text.own.length} characters at ${pkg}, against ${EMPTY} on a view nobody owns`
        + `${text.gated ? ', behind the account form' : ''}`;
    console.log(`  NONE  view:${v}  (${why})`);
    continue;
  }

  console.log(`  ok    view:${v}${note}`);
}

await page.close();

if (failed || viewFailed) {
  if (failed) console.error(`\n[check-render] ${failed} of ${SECTIONS.length} sections failed.`);
  if (viewFailed) console.error(`[check-render] ${viewFailed} of ${VIEWS.length} other views threw on render.`);
  process.exit(1);
}
console.log(`\n[check-render] ${SECTIONS.length - skipped.length} of ${SECTIONS.length} sections and ${VIEWS.length - bounced.length - unrendered.length} of ${VIEWS.length} other views rendered clean (${TYPE}, each view at a package that owns it).`);
if (bounced.length) console.log(`[check-render] sent back to home, not rendered: ${bounced.join(', ')}`);
if (unrendered.length) {
  console.log(`[check-render] rendered nothing of their own, for the reasons given above:`
    + ` ${unrendered.join(', ')}`);
}
if (skipped.length) {
  /* Not "no demo data": the per-section lines above say which reason applied to
     each, and asserting one of them here for all of them is how the wrong reason
     stood against two of these for months. */
  console.log(`[check-render] not checked, for the reasons given above: ${skipped.join(', ')}`);
}
