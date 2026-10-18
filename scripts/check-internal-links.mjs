// Fails the build when a link on the site points at nothing.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// Twelve In Practice articles carried "How it works" in the nav and the mobile
// menu, twenty-five links in all, pointing at /how-it-works. That page was
// retired into /methodology in 5c1924e, and /methodology was itself removed in
// 75376b4. Neither removal reached the article pages.
//
// The links did not 404. vercel.json ends with a catch-all that sends every
// unmatched path to the single-page app, so /how-it-works answers 200 with the
// app shell, and the app shell signed out draws nothing. A reader on a
// published article clicked "How it works" and got a blank page with a
// successful status code, which is the one kind of broken that neither a
// person nor a search engine can report.
//
// CLAUDE.md tells the first half of this story already: the retirement was
// deliberate, an audit that measured reachability without asking intent put
// the pages back, and that had to be undone. This is the other half. The
// question was never whether /how-it-works should exist. It was whether
// anything still points at it.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// Every internal href in public/**.html and src/App.jsx resolves to one of:
// a file in public/, a rewrite or redirect source in vercel.json, /app, or an
// /api/ route.
//
// The extensionless form is deliberately NOT assumed to work. Vercel does not
// serve /purpose for public/purpose.html unless something says so, which is
// what the seventy-four rewrites in vercel.json are for. Treating the .html
// file as proof that the clean URL works would mean a new page could be added,
// linked, and never routed, and this would call it fine.
//
// ── WHAT IT DOES NOT COVER ─────────────────────────────────────────────────
// Fragments. #privacy on /legal is not checked, and an anchor that moves is a
// different and quieter problem. External links: whether someone else's site
// still has the page is not something a build can know. And hrefs built at
// runtime, `/practice/${a.slug}` in practice/all.html, where the slug comes
// from a list this cannot evaluate.
//
// ── THE CATCH-ALL IS STILL THERE ───────────────────────────────────────────
// This checks our own links. A bookmark, a search result or somebody else's
// link to a retired page still lands on the blank shell rather than
// public/404.html, which exists and is unreachable. That is a routing decision
// in vercel.json and it is noted in TASKS.md rather than changed here.

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;

const cfg = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
const sources = new Set([
  ...(cfg.rewrites || []).map((r) => r.source),
  ...(cfg.redirects || []).map((r) => r.source),
]);

// Everything that exists under public/, by the path a browser would ask for.
const served = new Set();
(function walk(dir) {
  for (const f of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, f);
    if (statSync(join(ROOT, rel)).isDirectory()) { walk(rel); continue; }
    served.add('/' + relative('public', rel));
  }
})('public');

if (served.size < 20) {
  console.error(`[check-internal-links] only ${served.size} files under public/; refusing to pass.`);
  process.exit(1);
}

function resolves(href) {
  const path = href.split('#')[0].split('?')[0].replace(/\/$/, '') || '/';
  if (path === '/' || path.startsWith('/app') || path.startsWith('/api/')) return true;
  return served.has(path) || sources.has(path);
}

const files = [];
(function walk(dir) {
  for (const f of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, f);
    if (statSync(join(ROOT, rel)).isDirectory()) { walk(rel); continue; }
    if (f.endsWith('.html')) files.push(rel);
  }
})('public');
files.push('src/App.jsx');

const dead = new Map();
let checked = 0;

for (const rel of files) {
  const src = readFileSync(join(ROOT, rel), 'utf8');
  for (const m of src.matchAll(/href=["'](\/[^"'>]*)["']/g)) {
    const href = m[1];
    if (href.startsWith('//')) continue;   // protocol-relative, not ours
    if (href.includes('${')) continue;     // built at runtime
    checked += 1;
    if (resolves(href)) continue;
    if (!dead.has(href)) dead.set(href, new Set());
    dead.get(href).add(rel);
  }
}

/**
 * ── AND THE LINKS THE APP SENDS SOMEBODY TO ───────────────────────────────
 * The app opens the website for the things it deliberately does not do:
 * legal, privacy choices, buying an add-on, an article's page. Those are
 * addresses too, and this gate did not look at them.
 *
 * The share sheet in the post reader built `${SITE_URL}/in-practice/${id}`.
 * These pages are at /practice/<slug>, so every article anyone shared from a
 * phone sent their friend to a 404. Nothing on this side could have known,
 * because the shape was assembled in the app out of a belief about the site.
 *
 * Paths only: a query string or a fragment is for the page to read. The local
 * alias counts, because half the app writes `const SITE = SITE_URL` and then
 * `${SITE}/legal`.
 */
const appFiles = [];
(function walkApp(dir) {
  for (const f of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, f);
    if (statSync(join(ROOT, rel)).isDirectory()) {
      if (/node_modules|\.expo|dist|ios|android/.test(f)) continue;
      walkApp(rel);
      continue;
    }
    if (/\.(ts|tsx)$/.test(f)) appFiles.push(rel);
  }
}('attune-app/src'));

let appChecked = 0;
for (const rel of appFiles) {
  const src = readFileSync(join(ROOT, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, pre) => pre + ' '.repeat(m.length - pre.length));
  const aliased = /const SITE = SITE_URL/.test(src);
  const patterns = [/\$\{SITE_URL\}(\/[A-Za-z0-9\-._/]*)/g];
  if (aliased) patterns.push(/\$\{SITE\}(\/[A-Za-z0-9\-._/]*)/g);
  for (const re of patterns) {
    for (const m of src.matchAll(re)) {
      const href = m[1].split(/[?#]/)[0];
      if (!href || href === '/') continue;
      appChecked += 1;
      if (resolves(href)) continue;
      if (!dead.has(href)) dead.set(href, new Set());
      dead.get(href).add(rel);
    }
  }
}

if (checked < 100) {
  console.error(`[check-internal-links] only found ${checked} links; refusing to pass.`);
  process.exit(1);
}

if (dead.size) {
  console.error('[check-internal-links] a link on the site points at nothing:');
  for (const [href, where] of [...dead].sort()) {
    const list = [...where].sort();
    console.error(`  ${href} — ${list.length} file${list.length === 1 ? '' : 's'}: ${list.slice(0, 4).join(', ')}${list.length > 4 ? ', …' : ''}`);
    console.error('      It answers 200 with the app shell, which draws nothing signed out.');
  }
  process.exit(1);
}

console.log(`[check-internal-links] ${checked} internal links across ${files.length} files, and`
  + ` ${appChecked} addresses the app sends somebody to across ${appFiles.length} app files;`
  + ' every one resolves.');
