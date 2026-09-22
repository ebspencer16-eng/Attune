#!/usr/bin/env node
/**
 * Every URL this site publishes keeps the www.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * SITE_URL in api/_lib/site.js is https://www.attune-relationships.com, and
 * the apex answers 307 to it. So an address written without the www is not
 * wrong, exactly: it arrives. It arrives one redirect late, and it is a
 * different string to everything that compares addresses.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * Two of them, the same shape, months apart.
 *
 * The first cost four rounds of code reading and two simulator restarts: a
 * sign-in through the apex was answered with a 307, and the redirect stripped
 * the Authorization header, so the app's token never reached the endpoint. One
 * curl found it. That is why the repo already says, in capitals, keep the www.
 *
 * The second was found by sweeping the deployed site from outside: every one
 * of the twenty URLs in sitemap.xml pointed at the apex, as did robots.txt's
 * own sitemap line, the canonical tag and the og:url and og:image on eleven
 * static pages. Sixty-four addresses, all redirecting, all published: a
 * sitemap is a list of canonical addresses given to a crawler, and every entry
 * in it named a URL that is not the canonical one.
 *
 * Nothing caught it because the existing rule was enforced on outbound email
 * only, by check-email-links.mjs, and a sitemap is not an email.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * The host comes from SITE_URL rather than being typed here, so this cannot
 * disagree with the rest of the product about where the site lives. Anything
 * under public/ naming that host without its subdomain fails.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * api/_lib/http.js, which lists the apex and the www side by side on purpose:
 * that is the CORS allowlist, and the apex has to be on it precisely because
 * requests do arrive there. An allowlist of origins is not a published
 * address, and widening this gate to cover it would make it a gate that
 * matches too much.
 *
 * Not links between pages inside public/ either, when they are relative. A
 * relative href has no host and cannot get this wrong, which is why most of
 * the site was already right.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SITE_URL } from '../api/_lib/site.js';

const ROOT = new URL('..', import.meta.url).pathname;
const host = new URL(SITE_URL).host;              // www.attune-relationships.com
const bare = host.replace(/^www\./, '');          // attune-relationships.com

if (bare === host) {
  console.error('[check-published-urls] SITE_URL has no www to check for; refusing to pass.');
  process.exit(1);
}

/** Everything under public/ that can carry an address. */
const EXTS = ['.html', '.xml', '.txt', '.webmanifest'];
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (EXTS.some((e) => name.endsWith(e))) files.push(p);
  }
})(join(ROOT, 'public'));

if (!files.length) {
  console.error('[check-published-urls] found no pages under public/; refusing to pass.');
  process.exit(1);
}

const apex = new RegExp(`https?://${bare.replace(/\./g, '\\.')}`, 'g');
const fails = [];
let checked = 0;

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  checked += 1;
  const hits = src.match(apex);
  if (!hits) continue;
  const rel = f.slice(ROOT.length);
  fails.push(`${rel}: ${hits.length} address${hits.length === 1 ? '' : 'es'} on ${bare}`
    + ` rather than ${host}. Every one of them answers 307 and redirects, which`
    + ' is a slower page for a reader, a non-canonical URL for a crawler, and'
    + ' the exact shape that once stripped an auth header in the app.');
}

if (fails.length) {
  console.error('\n check-published-urls: the site publishes addresses that redirect.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  console.error(`  The host to use is ${host}, from SITE_URL in api/_lib/site.js.\n`);
  process.exit(1);
}
console.log(`✓ check-published-urls: ${checked} files under public/, every address on ${host}.`);
