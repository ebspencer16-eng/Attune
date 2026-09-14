#!/usr/bin/env node
/**
 * Both surfaces collect the same sections on What Comes Next.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * The groups the server builds for that page are the groups the website builds
 * inline, by id. Not the same items necessarily, but the same sections: a
 * reader on a phone sees a page with the same shape as a reader on a laptop.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * Ellie: "What's next tab in app only has 4 sections. It needs to mirror the
 * what comes next on the site."
 *
 * The page is built twice. The website reaches into every section it has
 * already rendered and assembles six groups; the server's whatComesNext
 * assembled five, and not the same five: it had Conflict and no Communication,
 * while the website had Communication and no Conflict. The communication
 * protocols never reached the page at all, because commsPlan was an expression
 * inside the response payload that nothing else could see.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * The ids the website pushes are read out of src/App.jsx, and the ids the
 * server can build are read out of the module. Neither may hold one the other
 * does not.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the items inside a group match. The website derives some of them
 * from data it has client-side, and the wording differs in places. That is a
 * real difference and a smaller one than a whole missing section; it is worth
 * its own pass and its own gate, not a false claim in this one.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const site = readFileSync(`${ROOT}src/App.jsx`, 'utf8');
const mod = readFileSync(`${ROOT}api/_lib/what-comes-next.js`, 'utf8');

const siteIds = new Set([...site.matchAll(/groups\.push\(\{\s*id:\s*"([\w-]+)"/g)].map((m) => m[1]));
const serverIds = new Set([...mod.matchAll(/groups\.push\(\{\s*\n\s*id:\s*'([\w-]+)'/g)].map((m) => m[1]));

const problems = [];
if (siteIds.size < 4) problems.push(`only found ${siteIds.size} groups in src/App.jsx; there were 6 when this was written.`);
if (serverIds.size < 4) problems.push(`only found ${serverIds.size} groups in the module; there were 6 when this was written.`);

for (const id of siteIds) {
  if (!serverIds.has(id)) problems.push(`the website collects "${id}" on What Comes Next and the server does not, so the app's page is missing it.`);
}
for (const id of serverIds) {
  if (!siteIds.has(id)) problems.push(`the server collects "${id}" and the website does not, so the app's page has a section the website's lacks.`);
}

if (problems.length) {
  console.error('[check-what-comes-next] the two What Comes Next pages are not the same page:\n');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}

console.log(`[check-what-comes-next] ${siteIds.size} groups, the same on both: ${[...siteIds].sort().join(', ')}.`);
