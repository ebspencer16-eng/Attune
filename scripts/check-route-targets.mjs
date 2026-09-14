#!/usr/bin/env node
/**
 * Every route in vercel.json has to land on something that exists.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Each rewrite and redirect destination resolves: an .html file that is in
 * public/, the Vite entry at the repo root, or another route in the same table
 * that itself resolves.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * 97cacb6 removed the LMFT session offering and its page. The rewrite pointing
 * at public/lmft-booking.html stayed. Because the table ends in a catch-all to
 * the app shell, /lmft-booking answered 200 with four kilobytes of markup and
 * no readable text in it, rather than a 404. Nothing links to it any more, so
 * nobody would have found it from the site; a search engine or an old link
 * would have.
 *
 * That is the same shape as three retired URLs answering 200 with a blank
 * shell, found earlier by sweeping the deployed site. The catch-all turns
 * every stale route into a silent success, so the routes have to be checked
 * against the files rather than against what the server answers.
 *
 * Removing the rewrite does not make /lmft-booking a 404: the catch-all still
 * answers it with the app shell. What it fixes is the table, so the next
 * person reading vercel.json is not told a page exists that does not. The 404
 * is O5 in TASKS.md and it is Ellie's call, because it changes routing on the
 * live site.
 *
 * ── AND NO CATCH-ALL ──────────────────────────────────────────────────────
 * The rewrites used to end with /(.*) pointing at the app shell, so every
 * unmatched URL answered 200 with four kilobytes of markup and no readable
 * text: retired pages, typos, stale links from search engines, all of them a
 * blank page with a successful status code. Ellie's call was a real 404, so
 * that entry is gone and Vercel serves 404.html with a 404 status.
 *
 * This fails if it comes back. The app's own /app and /app/(.*) are the two
 * that legitimately point at the shell, because the app really does own every
 * path under them. Anything wider swallows the 404 again.
 *
 * The headers block keeps its own /(.*) and must: that is how the security
 * headers reach every path. A pattern there is not a route.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Not whether a route should exist.
 *
 * Not the app's own routes. /app/(.*) is handled inside the bundle, and
 * check-app-routes.mjs is the one that reads those.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const config = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));

const routes = [
  ...(config.rewrites || []).map(r => ({ ...r, kind: 'rewrite' })),
  ...(config.redirects || []).map(r => ({ ...r, kind: 'redirect' })),
];

/** A destination is reached if it is a file, or another route that is reached. */
function resolves(dest, seen = new Set()) {
  const path = dest.split('#')[0].split('?')[0];
  if (!path.startsWith('/')) return true;            // absolute URL, someone else's problem
  if (seen.has(path)) return false;                  // a loop is not a landing
  seen.add(path);

  if (path.endsWith('.html')) {
    // The Vite entry is generated from the repo root, not from public/.
    if (path === '/index.html') return existsSync(join(ROOT, 'index.html'));
    return existsSync(join(ROOT, 'public' + path));
  }
  if (path.startsWith('/api/')) {
    const name = path.slice('/api/'.length).replace(/\.js$/, '');
    return existsSync(join(ROOT, 'api', name + '.js'));
  }
  if (/\.[a-z0-9]+$/i.test(path)) return existsSync(join(ROOT, 'public' + path));

  // No extension: it has to be another route, or a file under that name.
  if (existsSync(join(ROOT, 'public' + path + '.html'))) return true;
  const next = routes.find(r => r.source === path);
  if (next) return resolves(next.destination, seen);

  // The catch-all takes anything left, which is the problem, not the answer.
  return false;
}

const dead = [];
for (const r of routes) {
  if (!r.destination) continue;
  if (/^https?:/.test(r.destination)) continue;
  if (r.destination.includes(':')) continue;          // a capture group, e.g. /app/:path*
  if (!resolves(r.destination)) {
    dead.push(`${r.kind} ${r.source} -> ${r.destination}, which is not a file and not another route.`);
  }
}

// The catch-all, which is the thing that made every stale route look alive.
const SHELL_OK = new Set(['/app', '/app/(.*)']);
for (const r of config.rewrites || []) {
  if (!/\(\.\*\)|\(\[\^/.test(r.source)) continue;
  if (SHELL_OK.has(r.source)) continue;
  dead.push(
    `rewrite ${r.source} -> ${r.destination} catches everything under it.\n`
    + `      A pattern this wide sends unmatched URLs to a page instead of a 404, which is\n`
    + `      what made retired pages answer 200 with an empty shell. Only /app and\n`
    + `      /app/(.*) may do that, because the app owns every path under them.`);
}

if (dead.length) {
  console.error('[check-route-targets] a route in vercel.json lands on nothing:\n');
  for (const d of dead) console.error('  ' + d);
  console.error('\nThe catch-all answers these with the app shell, so they look like a');
  console.error('working page and read as four kilobytes of markup with no text in it.');
  console.error('Delete the route, or restore what it pointed at.');
  process.exit(1);
}

console.log(`[check-route-targets] ${routes.length} routes in vercel.json: every destination lands on a file, and nothing but /app catches unmatched paths.`);
