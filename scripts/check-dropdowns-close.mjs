#!/usr/bin/env node
/**
 * A control that opens closes again when you leave the page it is on.
 *
 * ── HER RULE, GIVEN TWICE ─────────────────────────────────────────────────
 * Ellie, of the Side by Side panel: "I was on one insights page and clicked to
 * the next one and the side by side dropdown was already opened. Dropdowns
 * should always close when you leave the page."
 *
 * And, of the What Comes Next buckets: "I left the app and clicked back in and
 * went to learn, then back to what's next and things to consider was still
 * open. It should auto close whatever dropdown is open if you leave the what
 * comes next page."
 *
 * Two reports, two surfaces, one rule. The second one is why this exists: the
 * first was fixed in the app by keying each page on its section, and nothing
 * checked that the same thing held anywhere else.
 *
 * ── WHY IT IS DRIVEN ──────────────────────────────────────────────────────
 * This is a question about what survives a navigation, and nothing about it is
 * visible in the source. The state may be local to a component that remounts,
 * local to one that does not, or in the DOM itself, which is what a <details>
 * uses. All three read the same.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * For each page here: open the control, go to another results page, come back,
 * and ask whether it is open. It also checks the control opens at all, because
 * a control that never opens passes "it is closed" for the wrong reason.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The app, which this harness cannot drive. The app's half is a fresh mount
 * per page (`key={section}` on SectionBody) plus a close when the screen loses
 * focus, and both are in results.tsx with her words beside them.
 */

import { launch } from './_lib/browser.mjs';

const BASE = process.env.BASE || 'http://localhost:4173';
const TYPE = process.env.TYPE || 'WX';
const PKG = process.env.PKG || 'premium';

/**
 * Each case: the page, what kind of control it has, and a page to go away to.
 *
 * `kind` rather than a snippet of browser code, because `page.evaluate` takes
 * a function and one JSON argument: a string of source passed in its place is
 * wrapped and called, which fails in a way that reads like the page being
 * broken. That cost a run here and a run on the last gate.
 *
 * Whether the control is open is counted rather than asserted, so the report
 * can tell "it did not open" from "it did not close".
 */
const CASES = [
  {
    id: 'what-comes-next',
    away: 'couple-type',
    what: 'a What Comes Next bucket',
    kind: 'pressed',
  },
  {
    id: 'comm-hard',
    away: 'comm-overview',
    what: 'the Side by Side panel on a Communication page',
    kind: 'details',
  },
  {
    id: 'intimacy-how',
    away: 'intimacy-overview',
    what: 'the Side by Side panel on a Physical Intimacy page',
    kind: 'details',
  },
];

/** The controls of one kind on the page, and whether each is open. */
function controlsIn(kind) {
  const root = document.querySelector('[data-results-scroll]') || document.body;
  if (kind === 'pressed') {
    const els = [...root.querySelectorAll('button[aria-pressed]')];
    return els.map((el) => ({ el, open: el.getAttribute('aria-pressed') === 'true' }));
  }
  const els = [...root.querySelectorAll('details')];
  return els.map((d) => ({ el: d.querySelector('summary') || d, open: !!d.open }));
}

const fails = [];
const page = await launch({ width: 430, height: 1400 });

/* The helper above, installed in the page before anything else runs, so both
   calls below read one definition rather than two copies of a selector. */
await page.onNewDocument(`window.__controls = ${controlsIn.toString()};`);

/**
 * Land on a page by loading the site there.
 *
 * Only used to START a case. Going away and back is done inside the page, by
 * the nav, because a reload is not what "leaving the page" means: it throws
 * away every piece of state in the application, so a control that stayed open
 * for the wrong reason would look closed. The first version of this gate
 * navigated by reloading and passed a plant that deleted the close entirely.
 */
const land = async (section) => {
  await page.evaluate((s) => localStorage.setItem(
    'attune_results_state',
    JSON.stringify({ activeResult: s, highlightsSeen: true }),
  ), section);
  await page.goto(`${BASE}/?demo=1&type=${TYPE}&pkg=${PKG}&intimacy=1&conflict=1&view=results`);
  await page.wait(900);
};

/**
 * Move a page, the way a reader does, with the arrows every results page has.
 *
 * The arrows rather than the nav, because the nav at a phone width lists
 * whatever is beside the current page and a domain page is not always in it:
 * Physical Intimacy's pill row carries its six dimensions and not the two
 * domain pages. The arrows are on every page and go somewhere real.
 */
const arrow = async (which) => {
  const went = await page.evaluate((glyph) => {
    /* The page arrows are the two fixed ones. An action item's own arrow is
       the same character, so matching on the glyph alone pressed a row and
       went to the page that row came from: the gate reported a page change it
       had caused itself. */
    const hit = [...document.querySelectorAll('button')]
      .find((b) => (b.textContent || '').trim() === glyph
        && getComputedStyle(b).position === 'fixed'
        && b.getBoundingClientRect().width > 0);
    if (!hit) return false;
    hit.click();
    return true;
  }, which);
  await page.wait(700);
  return went;
};

/** Click the first control of this kind. */
const clickFirst = (kind) => page.evaluate((k) => {
  /* eslint-disable no-eval */
  const list = window.__controls(k);
  if (!list.length) return 'none';
  const { el } = list[0];
  /* `el.click()`, not a dispatched MouseEvent. A <details> toggles on the
     click's DEFAULT action, and the default action of an untrusted event does
     not run, so a dispatched click leaves the panel shut and this gate
     reported a working control as broken.

     `click()` carries no coordinates, which is clientX 0, which is inside the
     results column's page-back zone. That turned the page out from under the
     assertion until `summary` was added to the list of things that handler
     leaves alone, which was a real fault: tapping the panel near either edge
     of the column opened it and paged at the same time. */
  el.click();
  return 'clicked';
}, kind);

const anyOpen = (kind) => page.evaluate(
  (k) => window.__controls(k).filter((c) => c.open).length,
  kind,
);

try {
  await page.goto(`${BASE}/`);
  for (const c of CASES) {
    await land(c.id);
    const found = await clickFirst(c.kind);
    if (found === 'none') {
      fails.push(`${c.what}: no such control on /${c.id}, so this case measured nothing.`
        + ' Refusing to call that a pass.');
      continue;
    }
    await page.wait(300);
    const opened = await anyOpen(c.kind);
    if (!opened) {
      fails.push(`${c.what}: clicking it did not open it, so the rest of this case would pass`
        + ' for the wrong reason.');
      continue;
    }

    /* Away, and back, inside the page. Forward first where there is a page
       ahead, back first on the last page of the whole experience. */
    const forwardFirst = await arrow('\u203A');
    const left = forwardFirst || await arrow('\u2039');
    const back = left ? await arrow(forwardFirst ? '\u2039' : '\u203A') : false;
    if (!left || !back) {
      fails.push(`${c.what}: could not move ${left ? 'back to' : 'away from'} /${c.id} with the`
        + " page arrows, so this case measured nothing.");
      continue;
    }
    const landed = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('attune_results_state') || '{}').activeResult; }
      catch { return null; }
    });
    if (landed !== c.id) {
      fails.push(`${c.what}: after going away and back the page is ${landed}, not ${c.id}.`);
      continue;
    }
    const still = await anyOpen(c.kind);
    if (still) {
      fails.push(`${c.what} was still open after leaving /${c.id} for /${c.away} and coming`
        + ' back. Ellie: "Dropdowns should always close when you leave the page."');
    }
  }
} finally {
  await page.close();
}

if (fails.length) {
  console.error('\n check-dropdowns-close: something stayed open across a page change.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-dropdowns-close] ${CASES.length} controls on three results pages: each one`
  + ' opens, and each one is closed again after leaving the page and coming back.');
