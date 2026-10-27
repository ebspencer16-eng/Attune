/**
 * Every marketing page is called the same thing in a chart as in the nav.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * The Engagement page's time-per-page chart labelled its columns with raw
 * paths, so a reader who calls a page Packages saw "/offerings". Giving it
 * names means writing them down, and a written-down name is a second copy of
 * something the site's nav already decides. This holds the two together.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * Every path named in api/_lib/page-names.js is a page that exists, and its
 * name is link text the nav actually uses for that path. The nav offers more
 * than one wording for some pages, "Packages" and "Browse Packages" for the
 * same href, and either is a real name, so any of them passes: what this
 * forbids is a name the nav never uses at all.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const { MARKETING_PAGE_NAMES, marketingPageName } = await import('../api/_lib/page-names.js');
const fail = [];

/* Link text per href, from every static page, because the nav is pasted into
   all of them and one page is not evidence about the others. */
const byHref = new Map();
for (const f of readdirSync('public').filter((f) => f.endsWith('.html'))) {
  const src = readFileSync('public/' + f, 'utf8');
  for (const m of src.matchAll(/href="(\/[a-z-]*)"[^>]*>([^<]{1,40})</g)) {
    const text = m[2].replace(/&amp;/g, '&').replace(/\s*[→>]\s*$/, '').trim();
    if (!text) continue;
    if (!byHref.has(m[1])) byHref.set(m[1], new Set());
    byHref.get(m[1]).add(text);
  }
}
if (byHref.size < 5) fail.push(`only ${byHref.size} hrefs found across public/; this gate has lost its subject`);

for (const [path, name] of Object.entries(MARKETING_PAGE_NAMES)) {
  const file = 'public' + path + '.html';
  if (!existsSync(file)) fail.push(`${path} is named "${name}" and there is no ${file}`);
  const texts = byHref.get(path);
  if (!texts) { fail.push(`nothing on the site links to ${path}, so "${name}" cannot be checked against anything`); continue; }
  const match = [...texts].some((t) => t.toLowerCase() === name.toLowerCase() || t.toLowerCase().endsWith(' ' + name.toLowerCase()));
  if (!match) {
    fail.push(`${path} is called "${name}" in the charts and ${[...texts].map((t) => `"${t}"`).join(', ')} in the nav`);
  }
}

/* An unnamed path keeps its path rather than becoming something invented. */
if (marketingPageName('/not-a-page') !== '/not-a-page') fail.push('an unknown path no longer falls back to itself');
if (marketingPageName('/offerings/') !== 'Packages') fail.push('a trailing slash stops a path resolving to its name');

if (fail.length) {
  console.error('check-page-names FAILED');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log(`[check-page-names] ${Object.keys(MARKETING_PAGE_NAMES).length} marketing pages, every one a real page and every name `
  + `link text the site's own nav uses for that path.`);
