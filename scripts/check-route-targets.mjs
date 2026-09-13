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
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Not whether a route should exist, and not the catch-all itself, which is
 * Ellie's call and is open on the task list.
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

if (dead.length) {
  console.error('[check-route-targets] a route in vercel.json lands on nothing:\n');
  for (const d of dead) console.error('  ' + d);
  console.error('\nThe catch-all answers these with the app shell, so they look like a');
  console.error('working page and read as four kilobytes of markup with no text in it.');
  console.error('Delete the route, or restore what it pointed at.');
  process.exit(1);
}

console.log(`[check-route-targets] ${routes.length} routes in vercel.json, every destination lands on a file.`);
