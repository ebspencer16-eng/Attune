// Fails the build when code writes the site's address down for itself.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// `process.env.SITE_URL || 'https://...'` appeared in five handlers and the
// fallback did not agree with itself. stripe-webhook said www; generate-card,
// generate-pdf, store-workbook and generate-workbook-promo said the apex. Two
// more modules kept their own constant. With SITE_URL unset, one order
// produced a www link in the receipt and an apex link on the QR code printed
// for the box.
//
// ── WHY THE HOSTNAME MATTERS ───────────────────────────────────────────────
// The apex answers with a 307 to www, which a browser follows without anyone
// noticing. That is why every apex link in this tree "works" and why this sat
// here. CLAUDE.md states the rule and the reason: "The API base URL is
// https://www.attune-relationships.com. Keep the www." It was written after a
// sign-in bug that cost four rounds of code reading, where the 307 stripped
// the Authorization header.
//
// check-email-links.mjs enforces it for outbound mail, where an image proxy
// may not follow a redirect at all. This is the same rule for everything else,
// including a QR code printed on a card, which is the same bet made permanent.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// 1. No apex origin anywhere in api/, scripts/, src/ or the app.
// 2. Only api/_lib/site.js writes the origin as its own constant. Everything
//    else imports it. A URL that includes a path (a link to a specific page in
//    an email) is left alone: those are already www and rewriting the lot of
//    them is a bigger edit than the bug justifies.
//
// ── WHAT IT DELIBERATELY DOES NOT COVER ────────────────────────────────────
// The canonical, og:url, og:image, twitter:image and JSON-LD tags on the
// static pages, which all name the apex. Those are a decision about which
// hostname search engines should index, and they are wrong in a different way:
// they point at a URL that redirects. Changing thirty of them is an SEO action
// with consequences someone should choose on purpose, so it is written up in
// TASKS.md instead of enforced here.
//
// Also not covered: public/qr-card-v5.html, which is a static page and cannot
// import anything, so it carries its own www constant with a comment saying
// why. It is checked for the apex like everything else.

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const SOURCE = 'api/_lib/site.js';

const files = [];
for (const dir of ['api', 'scripts', 'src', 'attune-app/src', 'public']) {
  (function walk(d) {
    for (const f of readdirSync(join(ROOT, d))) {
      const rel = join(d, f);
      if (statSync(join(ROOT, rel)).isDirectory()) {
        if (/node_modules|\.expo|ios|android/.test(rel)) continue;
        walk(rel);
        continue;
      }
      if (/\.(js|jsx|mjs|ts|tsx|html)$/.test(f)) files.push(rel);
    }
  })(dir);
}

if (files.length < 50) {
  console.error(`[check-site-origin] only scanned ${files.length} files; refusing to pass.`);
  process.exit(1);
}

/** A meta tag or structured-data line that names a hostname for search engines. */
const SEO = /rel=["']canonical|og:url|og:image|twitter:image|twitter:url|"url":|"logo":/;

/**
 * Files that may hold the origin themselves, each for a reason.
 *
 * api/_lib/site.js          is the source.
 * api/_lib/http.js          is a CORS allowlist. It has to name the apex as
 *                           well as www, because a request can arrive at
 *                           either, and refusing the apex would break exactly
 *                           the redirect this codebase is careful about.
 * src/App.jsx               is a browser bundle. Importing site.js would put
 *                           `process.env.SITE_URL` in front of a browser,
 *                           where `process` does not exist, and the whole site
 *                           would fail to boot. It keeps a literal and it is
 *                           still checked for the apex.
 * public/qr-card-v5.html    static, no modules, same reasoning.
 * public/gift-cards.html   the other printed card, same reasoning. Its four
 *                           templates said attune.com until this gate learned
 *                           to look for a domain that is not ours at all.
 * attune-app/src/api/client.ts  a separate package that cannot import api/,
 *                           so the app keeps one of its own and every other
 *                           file in it imports that. Its comment carries why
 *                           www matters there: React Native's fetch drops the
 *                           Authorization header across the apex's 307, which
 *                           is the bug that produced this rule. It had five
 *                           copies when this was written.
 */
const EXEMPT = new Set([
  SOURCE,
  'api/_lib/http.js',
  'src/App.jsx',
  'public/qr-card-v5.html',
  'public/gift-cards.html',
  'attune-app/src/api/client.ts',
]);

const apex = [];
const copies = [];
const wrong = [];

/**
 * A hostname that is not ours.
 *
 * The apex rule above assumes the domain is right and only the host is wrong.
 * Four gift-card templates told the recipient of a printed card to "visit
 * attune.com", which answers 200 and belongs to somebody else, and one In
 * Practice article published a contact address at hello@attune.com. Both were
 * invisible to every check here, because neither contains the string this file
 * was looking for.
 *
 * `attune.com` is the one that happened. `attunerelationships.com` is the same
 * mistake with the hyphen dropped, which is what a hand-typed URL looks like.
 */
const NOT_OURS = /(?<![-\w])(attune\.com|attunerelationships\.com|attune\.app|attune\.io)\b/i;

for (const rel of files) {
  const src = readFileSync(join(ROOT, rel), 'utf8');
  const lines = src.split('\n');

  // This file names the domain it forbids, in its own comment and its own
  // pattern. Nowhere else has that excuse.
  if (rel !== 'scripts/check-site-origin.mjs') {
    lines.forEach((line, i) => {
      if (NOT_OURS.test(line)) wrong.push(`${rel}:${i + 1}`);
    });
  }

  lines.forEach((line, i) => {
    if (/https:\/\/attune-relationships\.com/.test(line)) {
      if (rel.startsWith('public/') && SEO.test(line)) return;   // an SEO decision, see above
      if (rel === 'api/_lib/http.js') return;                    // the CORS allowlist names both
      apex.push(`${rel}:${i + 1}`);
    }
  });

  if (EXEMPT.has(rel)) continue;
  // The origin written as its own value: a bare origin, no path after it.
  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*|<!--)/.test(line)) return;                 // a comment describing it
    if (!/['"`]https:\/\/www\.attune-relationships\.com['"`]/.test(line)) return;
    copies.push(`${rel}:${i + 1}`);
  });
}

const problems = [];
if (wrong.length) {
  problems.push(
    `${wrong.length} reference${wrong.length === 1 ? '' : 's'} to a domain that is not ours: `
    + `${wrong.slice(0, 6).join(', ')}${wrong.length > 6 ? ', …' : ''}\n`
    + '      The site is attune-relationships.com. attune.com is a live site\n'
    + '      belonging to someone else, and it was printed on the gift cards.');
}
if (apex.length) {
  problems.push(
    `${apex.length} apex URL${apex.length === 1 ? '' : 's'}: ${apex.slice(0, 6).join(', ')}${apex.length > 6 ? ', …' : ''}\n`
    + '      The apex 307s to www. Keep the www, as CLAUDE.md says and as the\n'
    + '      sign-in bug that cost four rounds taught.');
}
if (copies.length) {
  const inApp = copies.filter((c) => c.startsWith('attune-app/'));
  const onServer = copies.filter((c) => !c.startsWith('attune-app/'));
  if (onServer.length) {
    problems.push(
      `the origin is written out in ${onServer.join(', ')}\n`
      + `      Import { SITE_URL } from ${SOURCE}. The fallback disagreed with\n`
      + '      itself for months because it existed in five places.');
  }
  if (inApp.length) {
    problems.push(
      `the origin is written out in ${inApp.join(', ')}\n`
      + "      Import { SITE_URL } from '@/api/client'. The app had five copies\n"
      + '      of this string, and they agreed only by luck.');
  }
}

if (problems.length) {
  console.error('[check-site-origin] the site address is written down more than once:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`[check-site-origin] ${files.length} files scanned; one origin, no apex outside the SEO tags.`);
