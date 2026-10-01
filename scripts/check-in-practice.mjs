// Fails the build when the In Practice index and the page that lists it stop
// agreeing.
//
// ── WHY ────────────────────────────────────────────────────────────────────
// The six pieces are pages on the website. public/practice.html indexes them
// by hand, and api/_in-practice.js now carries the same index so the app can
// show the shelf it has always had and never been able to fill.
//
// That is two copies of the same six titles. practice.html is static with no
// build step, so it cannot import the module, and this holds them together
// instead. Same arrangement check-research.mjs has, for the same reason. If
// that page ever gains a build step, generate it from the module and delete
// this file.
//
// ── WHAT IS COMPARED ───────────────────────────────────────────────────────
// Title, excerpt and link for every article, as a reader sees them. Not the
// markup, and not the read time: the page prints "6 min read" and the module
// stores 6, and reconciling that here would be checking the formatting rather
// than the facts.

import { readFileSync } from 'fs';
import { readdirSync } from 'fs';

import { IN_PRACTICE, shelfFor } from '../api/_in-practice.js';
import { POST_CATEGORIES } from '../api/_lib/post-categories.js';

const page = readFileSync(new URL('../public/practice.html', import.meta.url), 'utf8');

/** Text as a reader sees it: entities resolved, spaces collapsed. */
function plain(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&rsquo;|&#8217;/g, '’')
    .replace(/&#39;|&lsquo;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const text = plain(page);
const problems = [];
let labelCount = 0;
let cardCount = 0;

if (!IN_PRACTICE.length) problems.push('api/_in-practice.js lists no articles.');

for (const a of IN_PRACTICE) {
  if (!page.includes(`href="${a.path}"`)) {
    problems.push(`${a.slug}: nothing on public/practice.html links ${a.path}`);
  }
}

// ── THE OTHER DIRECTION, AND WHY IT IS AN EXACT MATCH ──────────────────────
// The pass above asks whether the module's title appears in the page, which a
// substring satisfies. Planting a bug proved it: changing the page's "conflict
// and repair" to "conflict and repairing" left the module's title still inside
// the page's, and the gate passed. A check that cannot fail on the change it
// exists to catch is worse than not having it.
//
// So each card's own title and excerpt are pulled out of the page and compared
// whole, in both directions.
const CARD = /<a class="post-card" href="([^"]+)"[\s\S]*?<h3 class="post-title">([^<]+)<\/h3>\s*<p class="post-excerpt">([^<]+)<\/p>/g;
const onPage = [...page.matchAll(CARD)].map(([, path, title, excerpt]) => ({
  path, title: plain(title), excerpt: plain(excerpt),
}));

// A card is where an excerpt is written, and only six articles have one. So
// the count is checked against the articles that carry an excerpt, not against
// the whole index: the other six are placeholders on purpose, and the link
// check above already proves the page reaches all twelve.
const withExcerpt = IN_PRACTICE.filter((a) => a.excerpt);
if (onPage.length !== withExcerpt.length) {
  problems.push(
    `public/practice.html has ${onPage.length} cards and api/_in-practice.js has `
    + `${withExcerpt.length} articles with an excerpt. A card is where an excerpt comes from.`);
}

for (const card of onPage) {
  const known = IN_PRACTICE.find((a) => a.path === card.path);
  if (!known) {
    problems.push(`public/practice.html lists ${card.path}, which api/_in-practice.js does not.`);
    continue;
  }
  if (plain(known.title) !== card.title) {
    problems.push(`${known.slug}.title differs:\n      page:   ${card.title}\n      module: ${plain(known.title)}`);
  }
  if (!known.excerpt) {
    problems.push(
      `${known.slug} has a card on the page and no excerpt in the module.\n`
      + '      The card is where the excerpt comes from; copy it across.');
    continue;
  }
  if (plain(known.excerpt) !== card.excerpt) {
    problems.push(`${known.slug}.excerpt differs:\n      page:   ${card.excerpt.slice(0, 90)}\n      module: ${plain(known.excerpt).slice(0, 90)}`);
  }
}

/**
 * Every article the site routes is in the app's index, and nothing else is.
 *
 * The gate used to hold IN_PRACTICE against the cards on practice.html and
 * pass at six. Twelve articles exist: all.html indexes twelve and vercel.json
 * routes twelve. The other six had no card, so they had no excerpt, so they
 * were never added, so the app's shelf carried half the writing on the site
 * and nothing said so.
 *
 * An excerpt is optional. Six have one, from the card each has on
 * practice.html; the other six are placeholders, which is what Ellie asked
 * for: "we need the 12 articles written as placeholders ... but we don't need
 * excerpts". This checks that every article reaches the app, not that every
 * article has been written about twice.
 */
const routes = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const CATEGORY_PAGES = new Set(['all', 'getting-started', 'conflict-and-repair',
  'understanding-each-other', 'couple-types']);
const articles = routes.rewrites
  .map((r) => r.source)
  .filter((x) => x.startsWith('/practice/'))
  .map((x) => x.slice('/practice/'.length))
  .filter((slug) => !CATEGORY_PAGES.has(slug));

const known = new Set(IN_PRACTICE.map((a) => a.slug));
for (const slug of articles) {
  if (known.has(slug)) continue;
  problems.push(
    `/practice/${slug} is routed on the site and is not in IN_PRACTICE, so the app\n`
    + '      will never show it and nothing says that on purpose.');
}
for (const a of IN_PRACTICE) {
  if (articles.includes(a.slug)) continue;
  problems.push(`IN_PRACTICE lists ${a.slug}, which the site does not route.`);
}

/**
 * ── THE NAME OF A SHELF, ON EVERY PAGE THAT PRINTS IT ─────────────────────
 * Ellie, picking between two names the product was using at the same time:
 * "Conflict and Repair and Understanding Each Other".
 *
 * There were two names because the name was typed in by hand in ninety places.
 * `conflict` was "When It's Difficult" on the shelf pill and "Conflict &
 * Repair" on the cards, in both the ampersand and the `&amp;` spelling, and
 * `understanding` was "Understanding Each Other" on its shelf page and bare
 * "Understanding" on three article pages.
 *
 * Three labels were not a second name for the right shelf, they were the wrong
 * shelf. /practice/how-to-start-a-hard-conversation called itself
 * "Communication", which is not a shelf at all, on its own page and on the
 * eleven related-article cards pointing at it.
 * /practice/staying-current-with-each-other called itself "Understanding" while
 * the server files it under Getting Started. And the Understanding shelf page
 * listed /practice/conflict-vs-repair, which the server files under Conflict and
 * Repair, so an article sat on one shelf in the app and another on the website.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 * Three things, because the page says the same rule three different ways.
 *
 * 1. Every category label anywhere on an In Practice page is a name the product
 *    has. This catches a shelf renamed on the server and not on the pages, and
 *    a second name creeping back.
 * 2. Every card linking to a known article carries exactly one label, and it is
 *    that article's own shelf. Per card rather than per page: a plant that
 *    removed one label of four passed a per-page count, because a check on a
 *    sum cannot see one slot go dark.
 * 3. all.html builds its cards from a JavaScript array of `cat`/`catLabel`
 *    pairs, where the label is a string in a script and no class attribute
 *    appears near it, so the markup sweep cannot see it. One row per article.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Which shelf an article belongs on. That is Ellie's and it is in TASKS.md.
 * This only says the website and the server agree about it.
 *
 * "Couple Types" is a shelf the website has and the app does not: the server
 * maps `couple-types` onto Methodology. It is allowed rather than silently
 * renamed, because collapsing a shelf a reader can browse is a decision rather
 * than a tidy-up, and it is a question for Ellie.
 */
{
  /* Label slots, by the class that makes them one. The eyebrow above an article
     title is styled inline and carries no class, so it is matched by its own
     declaration: a plant relabelled it and the class-based sweep passed. */
  const LABEL_CLASSES = ['article-tag', 'post-tag', 'art-cat', 'cat-pill',
    'related-card-cat', 'related-card-tag', 'coll-title'];
  const LABEL_SLOT = new RegExp(
    `(?:class="(?:${LABEL_CLASSES.join('|')})"[^>]*`
    + '|style="font-size:\\.72rem;color:var\\(--ink\\);font-weight:500;")>([^<]*)<', 'g');

  /**
   * The only name here that is not a shelf.
   *
   * Ellie: "All should exist on both platforms - make sure inconsistencies
   * cannot happen." This set used to also allow "Couple Types" beside
   * "Methodology", on the reasoning that the website had a shelf the app folded
   * into another one. It did not. Both platforms had the same four shelves and
   * the fourth had two names: Methodology on the index pill, Couple Types on
   * its own page, its three cards and its address. The exception was not
   * covering a difference, it was hiding one, which is what an escape hatch in
   * a gate does. There is one name now and nothing is exempt.
   */
  const shelves = new Set([...POST_CATEGORIES, 'All']);
  const bySlug = new Map(IN_PRACTICE.map((a) => [a.slug, a]));

  /** One shelf, one name. No equivalences: that is what let two names stand. */
  const agrees = (label, want) => label === want;

  const dir = new URL('../public/practice/', import.meta.url);
  const pages = [['practice.html', new URL('../public/practice.html', import.meta.url)]];
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.html')).sort()) {
    pages.push([`practice/${f}`, new URL(f, dir)]);
  }

  let labels = 0;
  let cards = 0;

  for (const [name, url] of pages) {
    const html = readFileSync(url, 'utf8');

    // ── 1. Every label is a name the product has ────────────────────────────
    let onThisPage = 0;
    for (const m of html.matchAll(LABEL_SLOT)) {
      const label = plain(m[1]);
      /* A template placeholder is filled in by the page's own script from the
         array checked in part 3, so there is no literal to read here. */
      if (!label || label.includes('${')) continue;
      labels += 1;
      onThisPage += 1;
      if (!shelves.has(label)) {
        problems.push(
          `public/${name} prints the category label "${label}", which is not a shelf.\n`
          + `      The shelves are ${POST_CATEGORIES.join(', ')}.\n`
          + '      A label outside that set files an article where no filter can reach it.');
      }
    }
    if (!onThisPage) {
      problems.push(
        `public/${name} prints no category label at all.\n`
        + '      Either it lost its shelf name, or the markup that carries one was\n'
        + '      renamed and this check can no longer read it. Refusing to pass: a gate\n'
        + '      that has lost its subject must never report success.');
    }

    // ── 2. Every card to a known article wears that article's shelf ─────────
    const CARD = /<a\s+href="\/practice\/([a-z0-9-]+)"\s+class="(art-card|post-card|related-card)"[^>]*>([\s\S]*?)<\/a>/g;
    for (const [, slug, kind, body] of html.matchAll(CARD)) {
      const article = bySlug.get(slug);
      if (!article) continue;
      cards += 1;
      const found = [...body.matchAll(LABEL_SLOT)]
        .map((m) => plain(m[1])).filter((t) => t && !t.includes('${'));
      if (found.length !== 1) {
        problems.push(
          `public/${name} has a ${kind} for /practice/${slug} carrying`
          + ` ${found.length} category labels.\n`
          + '      Every card names the shelf its article is on, exactly once. A card with\n'
          + '      none has lost its shelf name, or the markup that carried it was renamed.');
        continue;
      }
      const want = shelfFor(article);
      if (!agrees(found[0], want)) {
        problems.push(
          `public/${name} labels /practice/${slug} as "${found[0]}" and the server files it\n`
          + `      under "${want}". The app's filter row uses the server's shelf, so the\n`
          + '      two surfaces put the same article in two different places.');
      }
    }

    /* An article page's own label, which no card wraps: a page does not link to
       itself, so nothing above attributes it. Relabelling one passed until this
       was added. */
    const own = /^practice\/([a-z0-9-]+)\.html$/.exec(name);
    const mine = own ? bySlug.get(own[1]) : null;
    if (mine) {
      const want = shelfFor(mine);
      for (const m of html.matchAll(LABEL_SLOT)) {
        const label = plain(m[1]);
        if (!label || label.includes('${')) continue;
        /* Only the labels outside a card. The cards on an article page point at
           other articles and are checked above against their own shelves. */
        const before = html.slice(Math.max(0, m.index - 400), m.index);
        if (/<a\s+href="\/practice\/[a-z0-9-]+"\s+class="(?:art-card|post-card|related-card)"/.test(before)
          && !before.slice(before.lastIndexOf('<a ')).includes('</a>')) continue;
        /* The nav row of shelf pills names every shelf on purpose. */
        if (/class="cat-pill"/.test(html.slice(Math.max(0, m.index - 120), m.index))) continue;
        if (!shelves.has(label)) continue; // already reported in part 1
        if (!agrees(label, want)) {
          problems.push(
            `public/${name} labels itself "${label}" and the server files`
            + ` /practice/${mine.slug}\n      under "${want}". A reader on the page and a`
            + ' reader filtering in the app are told two\n      different things.');
        }
      }
    }
  }

  // ── 3. all.html's own copy, which is a JavaScript array ──────────────────
  {
    const all = readFileSync(new URL('../public/practice/all.html', import.meta.url), 'utf8');
    const rows = [...all.matchAll(/cat:\s*'([a-z-]+)'\s*,\s*catLabel:\s*("[^"]*"|'[^']*')/g)];
    if (rows.length !== IN_PRACTICE.length) {
      problems.push(
        `public/practice/all.html has ${rows.length} cat/catLabel rows and the server has`
        + ` ${IN_PRACTICE.length} articles.\n`
        + '      That array is where the index page\'s cards get their label, one row each.\n'
        + '      A row that is gone, or renamed, is a card labelled by nothing and this\n'
        + '      check can no longer read it.');
    }
    for (const [, cat, raw] of rows) {
      const label = plain(raw.slice(1, -1));
      labels += 1;
      const want = shelfFor({ category: cat });
      if (!agrees(label, want)) {
        problems.push(
          `public/practice/all.html labels the "${cat}" shelf "${label}" and the server\n`
          + `      calls it "${want}". This array is where the index page's cards get their\n`
          + '      label, so the page and the app disagree about the name of a shelf.');
      }
    }
  }

  if (!labels || !cards) {
    problems.push(`found ${labels} category labels and ${cards} article cards across the`
      + ' In Practice pages. Refusing to pass: a gate that has lost its subject must never'
      + ' report success.');
  }
  labelCount = labels;
  cardCount = cards;
}

if (problems.length) {
  console.error('[check-in-practice] the In Practice index has drifted:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('These are the same six pieces. Edit both, or give practice.html a build');
  console.error('step and generate its Recent grid from api/_in-practice.js.');
  process.exit(1);
}

console.log(
  `[check-in-practice] ${articles.length} articles on the site; `
  + `all ${IN_PRACTICE.length} in the app, `
  + `${IN_PRACTICE.filter((a) => a.excerpt).length} of them with an excerpt; `
  + `${labelCount} category labels and ${cardCount} article cards, each naming the shelf`
  + ' the server files that article under.');
