#!/usr/bin/env node
/**
 * One screen, one name, on both surfaces.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * The website's results sidebar wrote its own labels beside the nav the app
 * renders, and two of them had drifted:
 *
 *   "Communication"     on the website, "Communication Styles" in the app
 *   "Physical Intimacy" on the website, "Physical Intimacy Expectations" in
 *                       the app, which is the exercise's own name and the one
 *                       Ellie asked for by name on What Comes Next
 *
 * Nobody reading one surface would notice. Anyone reading both meets two names
 * for one screen, which is the first thing a designer comparing them will find
 * and the hardest kind of inconsistency to argue is deliberate.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * The sidebar takes its labels from resultsNav. It keeps its own icons, short
 * labels, colours and the two synthetic "Detailed results" rows, which are
 * presentation with no counterpart in the nav; only the name is shared, and the
 * name is the part a reader carries from one surface to the other.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * That no entry in that block writes a literal label, and that every id it
 * names either resolves in the nav or is one of the synthetic rows. Both: a
 * literal is the bug coming back, and an id that resolves nowhere is a label
 * that silently falls back to whatever was typed as the fallback.
 *
 * ── AND THE COLOUR ────────────────────────────────────────────────────────
 * The same sweep found two sections a different colour on each surface:
 * Communication was purple on the website and orange in the app, and
 * Relationship Reflection was blue here and green there. Both times the app
 * agreed with the page's own ground and with SectionColor in the theme, so the
 * sidebar was the odd one out: the dot beside a section's name was a colour
 * that section is nowhere else in the product.
 *
 * It also painted all six expectations categories one green, while each carries
 * a colour of its own that its page is tinted with and that
 * check-category-colors holds both surfaces to. The sidebar was the only place
 * Household and Financial looked like the same thing.
 *
 * ── AND THE TWO PEOPLE ────────────────────────────────────────────────────
 * Every surface marks one partner in orange and the other in blue, on the
 * storycards, the couple map, the ratings, the written pairs. The website reads
 * PERSON_COLORS from api/_lib/storycard-style.js; the app cannot import from
 * api/, so it names them again through its own palette, and nothing watched the
 * pair. They agreed, which is the whole reason nobody would notice the day they
 * stopped, and the same sentence has now been true of a section's label and a
 * section's colour in one sweep.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The page headings inside each section, which come from RESULTS_SECTION_LABELS
 * and PAGE_TITLES and are already shared by both surfaces; check-page-eyebrows
 * and check-results-nav hold those. This is about the list you navigate by.
 *
 * The per-domain tints on the communication rows and the per-category colours
 * on the expectations rows, which are deliberately not the section's colour:
 * those come from COMM_DOMAINS and EXPECTATIONS_CATEGORIES, and
 * check-category-colors holds the second of them.
 */

import { readFileSync } from 'node:fs';

import { resultsNav } from '../api/_lib/results-sections.js';
import { PERSON_COLORS, PERSON_GLANCE_COLORS } from '../api/_lib/storycard-style.js';

const ROOT = new URL('..', import.meta.url).pathname;
const WEB = 'src/App.jsx';
const web = readFileSync(`${ROOT}${WEB}`, 'utf8');
const fails = [];

const start = web.indexOf('const sidebarSections = [');
const end = web.indexOf('// Sidebar render', start);
if (start === -1 || end === -1) {
  console.error(`[check-section-names] the results sidebar is not where this expects it in ${WEB}.`
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}
const block = web.slice(start, end);

const nav = {};
const navColor = {};
for (const g of resultsNav({ hasReflection: true, intimacyReady: true, conflictListed: true })) {
  nav[g.id] = g.label;
  if (g.color) navColor[g.id] = g.color;
  for (const c of (g.children || [])) {
    nav[c.id] = c.label;
    navColor[c.id] = c.color || g.color;
  }
}
if (Object.keys(nav).length < 20) {
  console.error(`[check-section-names] the nav names ${Object.keys(nav).length} pages, which cannot`
    + ' be right. Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

/**
 * The rows that exist only in this sidebar: a heading over each section's
 * detail pages. They are furniture rather than pages, so they have no nav entry
 * and their words are written here. Named so their absence from the nav reads
 * as deliberate rather than as five labels nothing watches.
 */
const OWN_ROWS = /-detail-header$/;

const literals = [...block.matchAll(/id: "([\w-]+)", label: "([^"]+)"/g)];
for (const m of literals) {
  if (OWN_ROWS.test(m[1])) continue;
  fails.push(`${WEB} writes its own label for "${m[1]}": "${m[2]}".\n`
    + `      The nav calls it "${nav[m[1]] || '(nothing: this id is not a page)'}". Take the name`
    + ' from resultsNav, as every other row does, or the two surfaces end up with two names for\n'
    + '      one screen.');
}

const derived = [...block.matchAll(/id: "([\w-]+)", label: navLabel\("([\w-]+)", "([^"]+)"\)/g)];
if (derived.length < 15) {
  console.error(`[check-section-names] only ${derived.length} sidebar rows take their label from the`
    + ' nav; there were 23 when this was written.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}
for (const m of derived) {
  if (m[1] !== m[2]) {
    fails.push(`${WEB} draws "${m[1]}" with the name of "${m[2]}".`);
  }
  if (!nav[m[1]] && !OWN_ROWS.test(m[1])) {
    fails.push(`${WEB} names "${m[1]}", which is not a page the nav knows, so its label falls back`
      + ` to "${m[3]}" and nothing watches that word.`);
  }
}

/*
 * ── NO SECTION ROW PAINTS ITS OWN COLOUR ──────────────────────────────────
 * A group row and its "Detailed results" header take the colour from the nav.
 * A literal on one of those lines is the bug coming back: it is how
 * Communication came to be purple here and orange on the phone.
 *
 * The rows built from COMM_DOMAINS, EXPECTATIONS_CATEGORIES and
 * INTIMACY_DOMAINS are allowed their own, because those pages are tinted per
 * domain; they are spread from a list rather than written out, so they do not
 * match this pattern.
 */
for (const m of block.matchAll(/id: "([\w-]+)"[^\n]*?color: "(#[0-9A-Fa-f]{6})"/g)) {
  const id = m[1];
  const section = id.replace(/-detail-header$/, '');
  if (!nav[section] && !nav[id]) continue;
  fails.push(`${WEB} paints "${id}" ${m[2]} of its own.\n`
    + `      The nav gives it ${navColor[section] || navColor[id] || '(no colour)'}. A colour written here is how`
    + '\n      Communication came to be purple on the website and orange in the app.');
}

// ── The two people are the same two colours on both surfaces ───────────────
{
  const theme = readFileSync(`${ROOT}attune-app/src/constants/attune-theme.ts`, 'utf8');
  const app = readFileSync(`${ROOT}attune-app/src/components/results.tsx`, 'utf8');

  /* Which palette entry the app marks each person with, and what that entry is.
     Read rather than assumed, so renaming the palette entry is not a silent
     change of colour. */
  const named = {};
  for (const m of app.matchAll(/const (YOU|THEM)_COLOR = Palette\.(\w+)/g)) named[m[1]] = m[2];
  if (!named.YOU || !named.THEM) {
    console.error('[check-section-names] the app no longer marks the two people with'
      + ' YOU_COLOR and THEM_COLOR from the palette.'
      + ' Refusing to pass: a gate that has lost its subject must never report success.');
    process.exit(1);
  }
  const value = (key) => {
    const m = new RegExp(`\\b${key}: '(#[0-9A-Fa-f]{6})'`).exec(theme);
    return m ? m[1].toUpperCase() : null;
  };
  const pairs = [['you', named.YOU, 'YOU_COLOR'], ['them', named.THEM, 'THEM_COLOR']];
  for (const [side, entry, konst] of pairs) {
    const got = value(entry);
    const want = (PERSON_COLORS[side] || '').toUpperCase();
    if (!got) {
      fails.push(`the app's ${konst} is Palette.${entry} and the theme has no such colour.`);
    } else if (got !== want) {
      fails.push(`the app marks "${side}" ${got} (Palette.${entry}) and the website marks them`
        + ` ${want} (PERSON_COLORS.${side}).\n`
        + '      One partner is one colour across the whole product: the storycards, the map, the\n'
        + '      ratings, the written pairs. Two values is two people on two surfaces.');
    }
  }
}

/**
 * ── AND THE SAME TWO PEOPLE ON A GLANCE GROUND ────────────────────────────
 * `them` is a lighter blue on the dark glance panel than on a storycard,
 * because #1B5FE8 is almost invisible there. That is deliberate and it was in
 * two places: the app named the pair GLANCE_YOU and GLANCE_THEM, the website
 * wrote both values out in five spots, and nothing held them together.
 *
 * This gate was written for that exact failure on the base pair, and its own
 * header says why it matters: "They agreed, which is the whole reason nobody
 * would notice the day they stopped." It checked the base pair only.
 *
 * The pair is PERSON_GLANCE_COLORS now, the website imports it, and the app's
 * two constants are held to it here the same way its theme is held to the base
 * pair. The app cannot import from api/, which is why this comparison exists
 * rather than a shared import.
 */
{
  const app = readFileSync(`${ROOT}attune-app/src/components/results.tsx`, 'utf8');
  for (const [side, konst] of [['you', 'GLANCE_YOU'], ['them', 'GLANCE_THEM']]) {
    const m = new RegExp(`const ${konst} = '(#[0-9A-Fa-f]{6})'`).exec(app);
    const want = (PERSON_GLANCE_COLORS[side] || '').toUpperCase();
    if (!want) {
      fails.push(`PERSON_GLANCE_COLORS has no "${side}", so this cannot be compared.`);
    } else if (!m) {
      fails.push(`the app no longer declares ${konst}, so the glance pair is being written`
        + ' somewhere this cannot see.');
    } else if (m[1].toUpperCase() !== want) {
      fails.push(`on a glance ground the app marks "${side}" ${m[1].toUpperCase()} (${konst}) and`
        + ` the website marks them ${want} (PERSON_GLANCE_COLORS.${side}).\n`
        + '      One partner is one colour on one ground. Two values is two people again, and this\n'
        + '      is the pair the base check was not looking at.');
    }
  }
  /* And the website must not go back to writing them out. */
  for (const [side, hex] of Object.entries(PERSON_GLANCE_COLORS)) {
    if (side === 'you') continue;
    if (new RegExp(`["']${hex}["']`, 'i').test(web)) {
      fails.push(`${WEB} writes the glance colour ${hex} out as a literal again.`
        + ' PERSON_GLANCE_COLORS is imported there.');
    }
  }
}

if (fails.length) {
  console.error('\n check-section-names: a screen has two names, or two colours.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-section-names] ${derived.length} sidebar rows, every name and every section`
  + ' colour taken from the nav the app renders, so neither surface can call a screen something the'
  + ' other does not, or paint it differently, and the two people are the same two colours on'
  + ' both, on a storycard and on a glance ground.');
