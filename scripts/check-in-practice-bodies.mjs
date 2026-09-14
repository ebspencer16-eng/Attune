#!/usr/bin/env node
/**
 * The In Practice bodies the app draws have to be the website's articles.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * api/_in-practice-bodies.js is generated from public/practice/*.html, and
 * the app reads it instead of sending people to the browser. Ellie writes
 * every word a customer reads, once, in the page. So the app has to show the
 * page's words: all of them, and nothing else.
 *
 * Two halves, and neither covers the other:
 *
 *   1. Regenerating changes nothing. An edit to an article that nobody
 *      regenerated leaves the app reading last month's copy. Same shape as
 *      check-email-triggers.mjs and check-pkg-rules.mjs.
 *
 *   2. Every word of every article body appears in the blocks, and every word
 *      in the blocks appears in the article. The first half is the real risk:
 *      the generator walks the elements it knows, so a page that grows a new
 *      one loses a section silently. This counts words rather than trusting
 *      the walk, which is what makes it a check on the method and not a
 *      restatement of it.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Layout. The page draws a callout as a tile and the app draws it as a tile,
 * but nothing here compares them, and a heading that became a paragraph would
 * pass. It is the words that must not drift.
 *
 * The CTA is excluded from both surfaces on purpose, not missing: the app does
 * not sell. The third check below is that it stayed excluded.
 */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const FILE = `${ROOT}api/_in-practice-bodies.js`;

const fresh = execFileSync('node', [`${ROOT}scripts/build-in-practice-bodies.mjs`, '--print'], { encoding: 'utf8' });
const onDisk = readFileSync(FILE, 'utf8');

if (fresh !== onDisk) {
  console.error('[check-in-practice-bodies] api/_in-practice-bodies.js is out of date.');
  console.error('An article was edited and the bodies were not regenerated, so the app is');
  console.error('showing different words from the website.');
  console.error('Run: node scripts/build-in-practice-bodies.mjs');
  const a = onDisk.split('\n');
  const b = fresh.split('\n');
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      console.error(`\n  line ${i + 1}`);
      console.error(`    on disk:    ${(a[i] ?? '(nothing)').slice(0, 160)}`);
      console.error(`    generated:  ${(b[i] ?? '(nothing)').slice(0, 160)}`);
      break;
    }
  }
  process.exit(1);
}

const { IN_PRACTICE } = await import(`${ROOT}api/_in-practice.js`);
const { IN_PRACTICE_BODIES } = await import(FILE);

/** The words a reader reads, in no particular order. */
const words = (s) => s.toLowerCase().replace(/[^a-z0-9']+/g, ' ').trim().split(/\s+/).filter(Boolean);
const plain = (h) => h.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;|&#\d+;/g, ' ').replace(/\s+/g, ' ').trim();
const tally = (list) => list.reduce((m, w) => m.set(w, (m.get(w) || 0) + 1), new Map());

const problems = [];

for (const a of IN_PRACTICE) {
  const body = IN_PRACTICE_BODIES[a.slug];
  if (!body) { problems.push(`${a.slug}: no body, so the app has nothing to draw`); continue; }
  if (!body.blocks?.length) { problems.push(`${a.slug}: no blocks`); continue; }

  const html = readFileSync(`${ROOT}public${a.path}.html`, 'utf8');
  const from = html.indexOf('<div class="article-body"');
  // The CTA closes the readable part of the page. It is the last thing before
  // the related links and the footer, and every article has one.
  const to = html.indexOf('<div class="article-cta"');
  if (from < 0) { problems.push(`${a.slug}: the page has no article-body`); continue; }

  const page = tally(words(plain(html.slice(from, to > 0 ? to : undefined))));
  const drawn = tally(words(body.blocks.map((b) => `${b.label || ''} ${b.text} ${b.source || ''}`).join(' ')));

  const missing = [...page].filter(([w, n]) => (drawn.get(w) || 0) < n);
  const extra = [...drawn].filter(([w, n]) => (page.get(w) || 0) < n);
  if (missing.length) {
    problems.push(`${a.slug}: ${missing.length} words are on the page and not in the app (${missing.slice(0, 6).map(([w]) => w).join(', ')})`);
  }
  if (extra.length) {
    problems.push(`${a.slug}: ${extra.length} words are in the app and not on the page (${extra.slice(0, 6).map(([w]) => w).join(', ')})`);
  }
}

/**
 * The CTA sells, and the app does not sell.
 *
 * check-app-does-not-sell.mjs covers the app's own source. This is the other
 * door into the same screen: copy the server sends it.
 */
const SELLING = [/\/offerings/i, /\/start\b/, /get started/i, /\$\d/, /checkout/i];
for (const [slug, body] of Object.entries(IN_PRACTICE_BODIES)) {
  const all = body.blocks.map((b) => `${b.label || ''} ${b.text} ${b.source || ''}`).join(' ');
  for (const re of SELLING) {
    if (re.test(all)) problems.push(`${slug}: the article's selling copy reached the app (${re})`);
  }
}

if (problems.length) {
  console.error('[check-in-practice-bodies] the app and the website disagree about an article:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

const n = Object.values(IN_PRACTICE_BODIES).reduce((a, b) => a + b.blocks.length, 0);
console.log(`[check-in-practice-bodies] ${IN_PRACTICE.length} articles, ${n} blocks, word for word the same as the pages.`);
