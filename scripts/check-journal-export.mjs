#!/usr/bin/env node
/**
 * Every action item on What Comes Next can be kept, and what is kept is the
 * item.
 *
 * ── WHAT SHE ASKED FOR ────────────────────────────────────────────────────
 * Ellie, B106: "On the right side of each action item row on the whats next
 * page, there should be the grey arrow, but also a note icon. If the user taps
 * the note icon, the action item should be exported to their relationship
 * journal where they can leave commentary, just like we offer for the insight
 * of the day export to journal."
 *
 * Two promises, and they fail differently:
 *
 *   the control is there on every row, not on the first one or on the ones
 *     that happen to carry a section;
 *   and it opens the SAME sheet the insight of the day opens, which is what
 *     "just like" means. A second component that also writes a journal entry
 *     is a second thing to keep in step, and this codebase's whole failure
 *     mode is two copies of one rule.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * The website half is driven: open the page, open a bucket, count the rows and
 * their controls, press one, and read what the sheet says it will keep. A
 * structural check could not tell a button that opens a sheet from a button
 * that opens nothing.
 *
 * The app half cannot be driven by this harness, so what is checked there is
 * the part that would make it drift: results.tsx must reach the journal
 * through SaveToJournal and must not write a note itself.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the entry arrives in the journal, which is /api/notes and is covered
 * by check-annotation-source and the notes probe. This is about the control
 * and the text it carries.
 */

import { readFileSync } from 'node:fs';

import { launch } from './_lib/browser.mjs';

const BASE = process.env.BASE || 'http://localhost:4173';
const TYPE = process.env.TYPE || 'WX';
const PKG = process.env.PKG || 'premium';
const ROOT = new URL('..', import.meta.url).pathname;

const fails = [];

/* ── 1. The app reaches the journal through the one sheet ─────────────────── */
const app = readFileSync(`${ROOT}attune-app/src/components/results.tsx`, 'utf8');
if (!/import \{ SaveToJournal \} from '@\/components\/journal'/.test(app)) {
  fails.push('attune-app/src/components/results.tsx does not import SaveToJournal, so whatever'
    + ' it opens from the note icon is not the sheet the insight of the day opens.');
}
if (!/<SaveToJournal\s/.test(app)) {
  fails.push('results.tsx imports SaveToJournal and never renders it.');
}
/* And does not write an entry itself. `createNote` here would be a second
   implementation of keeping something, which is how the two ways to save
   drift apart. */
if (/\bcreateNote\s*\(/.test(app)) {
  fails.push('results.tsx calls createNote directly. Keeping an action item goes through'
    + ' SaveToJournal, which is what the insight of the day uses; two writers of the same'
    + ' kind of entry is two things to keep in step.');
}
/* Every row gets the control, not the ones with a section. */
if (!/onKeep=\{/.test(app)) {
  fails.push('no row in results.tsx is given an onKeep, so no action item can be kept.');
}

/* ── 2. The website half, driven ──────────────────────────────────────────── */
for (const width of [390, 1280]) {
  const page = await launch({ width, height: 1500 });
  try {
    await page.goto(`${BASE}/`);
    await page.evaluate(() => localStorage.setItem(
      'attune_results_state',
      JSON.stringify({ activeResult: 'what-comes-next', highlightsSeen: true }),
    ));
    await page.goto(`${BASE}/?demo=1&type=${TYPE}&pkg=${PKG}&intimacy=1&conflict=1&view=results`);
    await page.wait(1100);
    const where = `at ${width} points`;

    /* Open the first bucket. The tiles carry an aria-label naming the bucket
       and its count, which is how a tile is told from the journal square. */
    const opened = await page.evaluate(() => {
      const root = document.querySelector('[data-results-scroll]') || document.body;
      const tile = [...root.querySelectorAll('button[aria-pressed]')][0];
      if (!tile) return null;
      const b = tile.getBoundingClientRect();
      const x = Math.round(b.left + b.width / 2), y = Math.round(b.top + b.height / 2);
      for (const t of ['mousedown', 'click']) {
        tile.dispatchEvent(new MouseEvent(t, { bubbles: true, clientX: x, clientY: y }));
      }
      return tile.getAttribute('aria-label');
    });
    if (!opened) {
      fails.push(`${where}: no bucket tile on What Comes Next, so there are no rows to keep.`);
      continue;
    }
    await page.wait(300);

    /* Every row has both controls. A row is a block carrying a keep button;
       the arrow is counted against the same rows rather than against the page,
       so a page with one row and two arrows cannot pass. */
    const rows = await page.evaluate(() => {
      const root = document.querySelector('[data-results-scroll]') || document.body;
      /* Drawn, not merely present. `hidden` on the button leaves every
         attribute this gate reads exactly where it was, and the first version
         passed a plant that added it: a control that exists is not a control
         anybody can press. */
      const drawn = (n) => {
        const b = n.getBoundingClientRect();
        return b.width > 8 && b.height > 8;
      };
      const keeps = [...root.querySelectorAll('button[aria-label^="Keep "]')].filter(drawn);
      const arrows = [...root.querySelectorAll('button[aria-label^="Open "]')].filter(drawn);
      return {
        keeps: keeps.length,
        arrows: arrows.length,
        /* The first row's own words, to compare against what the sheet says it
           will keep. */
        first: keeps.length
          ? (keeps[0].closest('div')?.textContent || '').slice(0, 60)
          : null,
        label: keeps.length ? keeps[0].getAttribute('aria-label') : null,
      };
    });
    if (!rows.keeps) {
      fails.push(`${where}: the open bucket (${opened}) has no note icon on any row.`
        + ' Ellie asked for one on every action item.');
      continue;
    }
    if (rows.keeps !== rows.arrows) {
      fails.push(`${where}: ${rows.keeps} note icon(s) and ${rows.arrows} arrow(s) on the open`
        + ' bucket. Every row carries both.');
    }

    /* Press it, and read what the sheet says it is keeping. */
    await page.evaluate(() => {
      const root = document.querySelector('[data-results-scroll]') || document.body;
      const keep = root.querySelector('button[aria-label^="Keep "]');
      const b = keep.getBoundingClientRect();
      const x = Math.round(b.left + b.width / 2), y = Math.round(b.top + b.height / 2);
      for (const t of ['mousedown', 'click']) {
        keep.dispatchEvent(new MouseEvent(t, { bubbles: true, clientX: x, clientY: y }));
      }
    });
    await page.wait(400);
    const sheet = await page.evaluate(() => {
      const el = document.querySelector('[role="dialog"]');
      if (!el) return null;
      return { text: (el.textContent || '').slice(0, 400), has: !!el.querySelector('textarea, input') };
    });
    if (!sheet) {
      /* Where we are matters here: a keep that navigates leaves no sheet, and
         "opened nothing" would be the wrong sentence for it. */
      const after = await page.evaluate(() => {
        try { return JSON.parse(localStorage.getItem('attune_results_state') || '{}').activeResult; }
        catch { return null; }
      });
      fails.push(after !== 'what-comes-next'
        ? `${where}: keeping an item navigated to ${after} instead of opening the sheet.`
        : `${where}: the note icon opened nothing. It is supposed to open the same sheet`
          + ' the insight of the day opens.');
      continue;
    }
    if (!sheet.has) {
      fails.push(`${where}: the sheet that opened has nowhere to write. Ellie: "where they can`
        + ' leave commentary."');
    }
    /* The words in the sheet are the row's. Compared on the first six words of
       the row, because the sheet wraps them in quotation marks and the row
       carries its arrow's label too. */
    const stem = (rows.label || '').replace(/^Keep "/, '').split(/\s+/).slice(0, 6).join(' ');
    if (stem && !sheet.text.includes(stem)) {
      fails.push(`${where}: the sheet does not carry the row's words. It should keep the action`
        + ` item itself; the row begins "${stem}" and the sheet says "${sheet.text.slice(0, 80)}".`);
    }

    /* And the page is still What Comes Next: the keep control must not page. */
    const landed = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('attune_results_state') || '{}').activeResult; }
      catch { return null; }
    });
    if (landed !== 'what-comes-next') {
      fails.push(`${where}: keeping an item navigated to ${landed}.`);
    }
  } finally {
    await page.close();
  }
}

if (fails.length) {
  console.error('\n check-journal-export: an action item cannot be kept.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log('[check-journal-export] at 390 and 1280 points: every action item in an open bucket'
  + " carries a note icon and an arrow, the note icon opens the insight of the day's own sheet"
  + " with that item's words in it, and the app reaches the journal through the same component.");
