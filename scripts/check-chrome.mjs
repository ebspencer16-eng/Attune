// Fails the build when the nav or the footer stops agreeing across pages.
//
// ── WHY A GATE AND NOT A GENERATOR ─────────────────────────────────────────
// The nav is pasted into twenty HTML files and the footer into thirteen. By
// this codebase's own rule that is a generator's job, and a generator is
// buildable: build-pkg-rules.mjs already writes into public/ during the build.
//
// It is not built yet because the measurement said something surprising. The
// nav looked like fifteen different navs and the footer like seven different
// footers. They are not. Once you normalise two things that are *supposed* to
// vary, there is one nav and one footer:
//
//   - the `active` class, which marks the current page and is different on
//     every page by design;
//   - the SVG gradient id, which has to be unique within a document and
//     therefore differs between documents.
//
// So the duplication is real but the drift, in the markup, is almost nil. A
// generator would be the right investment if these were pulling apart. They
// are not, and this gate is what keeps it that way for a fraction of the cost.
//
// If a nav change ever has to be made in twenty files by hand and this gate
// catches the one that was missed, that is the moment to build the generator.
//
// ── HOW IT WORKS AND COUPLE TYPES: WHY THEY ARE NOT HERE ───────────────────
// This paragraph used to say both pages were "now on every nav and every
// footer". That was true for about a day and has been wrong ever since.
//
// The two pages were retired into other pages deliberately. An audit of mine
// measured reachability, found nothing linked them, called them orphaned, and
// they were relinked everywhere on the strength of that framing. They were
// unlinked again in 00752ef and deleted in 1316f37.
//
// The comment stayed. Anyone reading this file to understand the site's chrome
// would have concluded /how-it-works was a live, linked page. Two links in
// src/App.jsx's footer pointed there for weeks afterwards, and because every
// path in that SPA returns index.html they did not 404: they rendered a blank
// page, which nothing reports.
//
// So this gate now covers that footer too, below. And the lesson the stale
// paragraph teaches is worth more than the paragraph: a gate's stated reason
// rots exactly like the code it guards, and a wrong reason is read as fact.
//
// ── WHAT IS NOT COVERED, AND IT MATTERS ────────────────────────────────────
// The <style> block inside <footer>. That block is not the footer's CSS: it
// also carries the sub-page hero (.page-header) and the mobile nav, pasted
// into the footer element on each page, and it HAS drifted, seven ways.
// purpose.html sets .page-header-inner to 1120px where everything else says
// 780px; practice.html carries mobile-nav rules nothing else has; home.html
// and wedding-registry.html are missing most of it.
//
// That is a real design question (which of the seven is right?) and not
// something a gate can answer. It is deliberately out of scope here rather
// than quietly folded in, because a gate that guesses at a design decision
// will encode the guess.

import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const PUBLIC = join(ROOT, 'public');

/**
 * Pages with a deliberately different nav, and why. Each is a real variant,
 * not drift, so each is named rather than pattern-matched.
 */
const NAV_EXEMPT = new Map([
  ['404.html', 'a bare logo, no menu'],
  ['admin.html', 'the internal dashboard, its own nav entirely'],
  ['checkout.html', 'reduced nav: no menu during payment'],
  ['gift-confirmation.html', 'reduced nav, post-purchase'],
]);

function blockOf(text, openRe, tag) {
  const m = openRe.exec(text);
  if (!m) return null;
  let depth = 1;
  const re = new RegExp(`</?${tag}\\b`, 'g');
  re.lastIndex = m.index + m[0].length;
  let mm;
  while ((mm = re.exec(text))) {
    depth += mm[0] === `<${tag}` ? 1 : -1;
    if (depth === 0) return text.slice(m.index, mm.index + tag.length + 3);
  }
  return null;
}

/**
 * Strip what is supposed to vary, keep everything else.
 *
 * If you add something here, you are declaring that it may legitimately differ
 * between pages. Be sure that it may.
 */
function canon(block) {
  // SVG ids have to be unique within a document, so every page named the logo
  // gradient differently: spark_logo_5_2, sfLogoGrad, ct_logo, lg1, wrlogo.
  // Matching those by name meant inventing a pattern per page and missing the
  // next one. Instead, renumber every id in order of appearance along with the
  // url(#...) references that point at it. Two blocks that differ only in what
  // they called their gradient now normalise to the same thing, and a block
  // that genuinely gained or lost an element still differs.
  let n = 0;
  const ids = new Map();
  for (const m of block.matchAll(/\bid="([^"]+)"/g)) {
    if (!ids.has(m[1])) ids.set(m[1], `ID${n++}`);
  }
  let out = block;
  for (const [was, now] of ids) {
    out = out.split(`id="${was}"`).join(`id="${now}"`).split(`url(#${was})`).join(`url(#${now})`);
  }
  return out
    // The current-page marker, and the empty class attribute plus stray
    // whitespace it leaves behind. Without the last two steps a nav whose
    // active link was <a href="/home" class="active"> normalises to
    // <a href="/home" > and never matches one that was plain.
    .replace(/\s*\bactive\b/g, '')
    .replace(/\s*class="\s*"/g, '')
    .replace(/\s+>/g, '>')
    // Whitespace between tags. Some pages write class="logo"><svg and others
    // class="logo"> <svg. That is how the file was formatted, not what it
    // says, and failing a build over it would train people to ignore this.
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .trim();
}

const problems = [];

function compare(kind, openRe, tag, exempt, stripStyle) {
  const groups = new Map();
  for (const name of readdirSync(PUBLIC)) {
    if (!name.endsWith('.html') || exempt.has(name)) continue;
    const rel = `public/${name}`;
    const text = readFileSync(join(PUBLIC, name), 'utf8');
    let block = blockOf(text, new RegExp(openRe), tag);
    if (!block) continue;
    if (stripStyle) block = block.replace(/<style>[\s\S]*?<\/style>/g, '');
    const key = canon(block);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(rel);
  }

  const versions = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  if (!versions.length) {
    problems.push(`no ${kind} found on any page; this gate would pass on nothing`);
    return 0;
  }
  if (versions.length > 1) {
    const [, majority] = versions[0];
    problems.push(
      `${versions.length} different ${kind}s. ${majority.length} pages agree; these do not:\n`
      + versions.slice(1).map(([, files]) => `      ${files.join(', ')}`).join('\n'));
  }
  return versions[0][1].length;
}

const navs = compare('nav', '<nav[^>]*>', 'nav', new Set(NAV_EXEMPT.keys()), true);
const foots = compare('footer', '<footer[^>]*class="[^"]*site-footer[^"]*"[^>]*>', 'footer', new Set(), true);

/**
 * The React app's footer, which is not in public/ and so was invisible above.
 *
 * It cannot share markup with the static footer: one is HTML in twenty-nine
 * files, the other is JSX inside src/App.jsx. What they can share is where
 * they send people. Labels and destinations are compared as a set; order,
 * styling and column grouping are the app's own business.
 *
 * This is the check that was missing. The app's footer listed "How it works"
 * twice, pointing at a page that no longer exists, while every static footer
 * had already moved on to Our Purpose and In Practice.
 */
function appFooterLinks() {
  const src = readFileSync(join(ROOT, 'src/App.jsx'), 'utf8');
  const cols = [...src.matchAll(/\{\s*title:\s*"(Product|Learn|Support)",\s*links:\s*\[([\s\S]*?)\]\s*\}/g)];
  const out = new Map();
  for (const [, , body] of cols) {
    for (const m of body.matchAll(/\["([^"]+)",\s*"([^"]+)"\]/g)) out.set(m[1], m[2]);
  }
  return { cols: cols.length, links: out };
}

function staticFooterLinks() {
  const text = readFileSync(join(PUBLIC, 'home.html'), 'utf8');
  const foot = blockOf(text, /<footer[^>]*class="[^"]*site-footer[^"]*"[^>]*>/, 'footer');
  const out = new Map();
  const links = foot?.match(/<div class="sf-links">[\s\S]*?<\/div>\s*<\/div>/)?.[0] || '';
  for (const m of links.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)) {
    out.set(m[2].replace(/&amp;/g, '&').trim(), m[1]);
  }
  return out;
}

const app = appFooterLinks();
const site = staticFooterLinks();
if (!app.cols || !site.size) {
  problems.push(
    'could not read one of the two footers '
    + `(app columns: ${app.cols}, site links: ${site.size}). `
    + 'A gate that finds nothing passes for the wrong reason.');
} else {
  for (const [label, href] of site) {
    if (!app.links.has(label)) problems.push(`src/App.jsx footer is missing "${label}" (${href})`);
    else if (app.links.get(label) !== href) {
      problems.push(`src/App.jsx footer sends "${label}" to ${app.links.get(label)}, the site sends it to ${href}`);
    }
  }
  for (const [label, href] of app.links) {
    if (!site.has(label)) problems.push(`src/App.jsx footer offers "${label}" (${href}), which no static footer does`);
  }
}

if (problems.length) {
  console.error('[check-chrome] the shared chrome has drifted:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('The nav and footer are pasted into every page. They are allowed to differ');
  console.error('only in the active-page marker and the logo gradient id, both of which this');
  console.error('gate normalises away. Anything else is drift: make the change everywhere,');
  console.error('or name the page in NAV_EXEMPT with the reason it is different.');
  process.exit(1);
}

console.log(
  `[check-chrome] one nav across ${navs} pages (${NAV_EXEMPT.size} named variants), `
  + `one footer across ${foots}, and src/App.jsx's ${site.size} footer links agree with it. `
  + `Footer style blocks are NOT covered; see the header.`);
