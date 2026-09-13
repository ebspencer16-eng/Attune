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
import { IN_PRACTICE } from '../api/_in-practice.js';

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
const CATEGORY_PAGES = new Set(['all', 'getting-started', 'when-its-difficult',
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
  + `${IN_PRACTICE.filter((a) => a.excerpt).length} of them with an excerpt.`);
