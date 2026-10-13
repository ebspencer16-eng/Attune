#!/usr/bin/env node
/**
 * A start tag that never closes, and the page it quietly folds up.
 *
 * ── WHAT HAPPENED ──────────────────────────────────────────────────────────
 * Forty-five <select> tags in public/admin.html looked like this:
 *
 *   <select class="tile-slicer" id="slz-tout" aria-label="Slz tout"<option …
 *
 * The `>` that closes the start tag is missing. An accessibility pass had
 * inserted `aria-label="…"` just before it and taken the bracket with it. The
 * browser then reads `<option` and everything after it as more attributes of
 * the select, until it finds a `>` somewhere in the following markup, and the
 * rest of the page is nested wherever that lands.
 *
 * On Type Analytics the whole page collapsed to zero by zero. Ellie: "the type
 * analytics tiles are going all the way to the sides of the window." Eleven
 * tiles were not being laid out at all. Nothing threw, nothing logged, and the
 * page looked almost right.
 *
 * ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
 * Every HTML file under public/, recursively, for an attribute value followed
 * immediately by something that is not a space, a `>` or a `/`. That is the
 * shape of a start tag that never ended, and it is cheap to find once you know
 * to look.
 *
 * It deliberately does not try to be an HTML validator. It catches this one
 * mistake, which shipped forty-five times.
 */

import { readdirSync, readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;

function htmlFiles(dir, rel = '') {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const path = `${dir}/${entry.name}`;
    const shown = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...htmlFiles(path, shown));
    else if (entry.name.endsWith('.html')) out.push({ path, shown });
  }
  return out;
}

const files = htmlFiles(`${ROOT}public`);
const problems = [];
let tags = 0;

/**
 * The markup, with everything that is not markup blanked.
 *
 * Script and style blocks are full of `<option value="'+x+'"'` and of SVG data
 * URIs, which look exactly like the bug from the outside. Blanking rather than
 * deleting keeps every line number true.
 */
const markupOnly = (src) => src
  .replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length))
  .replace(/<script\b[\s\S]*?<\/script>/gi, (m) => ' '.repeat(m.length))
  .replace(/<style\b[\s\S]*?<\/style>/gi, (m) => ' '.repeat(m.length));

for (const { path, shown } of files) {
  const code = markupOnly(readFileSync(path, 'utf8'));

  /* Walk each start tag to its `>`, respecting quotes. A `<` before that means
     the tag never closed and the parser is reading the next element as more of
     this one's attributes. */
  for (const m of code.matchAll(/<[a-zA-Z][a-zA-Z0-9-]*/g)) {
    tags += 1;
    let quote = null;
    let broke = -1;
    for (let i = m.index + m[0].length; i < code.length; i++) {
      const ch = code[i];
      if (quote) { if (ch === quote) quote = null; continue; }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (ch === '>') break;
      if (ch === '<') { broke = i; break; }
    }
    if (broke < 0) continue;
    const line = code.slice(0, m.index).split('\n').length;
    problems.push(`${shown}:${line} <${m[0].slice(1)}> never closes:\n      …`
      + code.slice(Math.max(0, broke - 70), broke + 20).replace(/\n/g, ' '));
  }
}

if (problems.length) {
  console.error('[check-tag-closure] a start tag is missing the > that ends it:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('The browser reads everything after it as more attributes until it finds a');
  console.error('`>`, so the markup after that point is nested wherever that lands. The page');
  console.error('does not throw and does not log: it folds up. Forty-five of these shipped,');
  console.error('and the symptom was one page laying out at zero by zero.');
  process.exit(1);
}

console.log(`[check-tag-closure] ${files.length} pages under public/, ${tags} start tags outside`
  + ' script and style: every one of them ends with a >.');
