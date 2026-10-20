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

/**
 * ── AND THE OTHER WAY ROUND: A CLOSE TOO MANY, OR TOO FEW ─────────────────
 * The first half catches a start tag that never ends. The same page broke
 * again from the opposite direction: moving the Data quality block out of one
 * place and into another left its `</div>` behind at the old site and dropped
 * it at the new one. Net zero across the file, so nothing was obviously
 * unbalanced, and `#page-types` closed sixty lines early.
 *
 * What that does is subtle and total. Every tile after the stray close is no
 * longer inside the page it belongs to, so it draws underneath every other
 * page's content, and the page switcher cannot hide it. On screen it reads as
 * "the Type Analytics page is empty below the four tiles", which is exactly
 * how I read it, and I went looking at the charts rather than at the markup.
 *
 * So: every element carrying an `id="page-*"` has to open and close, and
 * nothing that belongs to a page may sit outside one. A `<div>` scan is enough
 * here because these pages are divs all the way down, and the first half of
 * this file already proves every start tag ends.
 */
const pageProblems = [];
for (const { path, shown } of files) {
  const raw = readFileSync(path, 'utf8');
  /* Script, style and comments can hold anything that looks like markup.
     Newlines are kept so a reported line number is the file's own. */
  const keepLines = (m) => '\n'.repeat((m.match(/\n/g) || []).length);
  const code = raw
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => `<script>${keepLines(m)}</script>`)
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (m) => `<style>${keepLines(m)}</style>`)
    .replace(/<!--[\s\S]*?-->/g, keepLines);

  for (const idm of code.matchAll(/\sid="(page-[A-Za-z0-9-]+)"/g)) {
    const open = code.lastIndexOf('<div', idm.index);
    if (open < 0) continue;
    let depth = 0;
    let close = -1;
    for (const m of code.slice(open).matchAll(/<div\b[^>]*>|<\/div>/g)) {
      depth += m[0].startsWith('</') ? -1 : 1;
      if (depth === 0) { close = open + m.index + m[0].length; break; }
    }
    const line = code.slice(0, open).split('\n').length;
    if (close < 0) {
      pageProblems.push(`${shown}:${line} #${idm[1]} never closes: there is a </div> missing inside it.`);
      continue;
    }
    /* A page that closes before the next one starts is fine. A page that
       closes early leaves markup between it and the next page, and that
       markup is what goes missing on screen. */
    const after = code.slice(close);
    const nextPage = after.search(/\sid="page-[A-Za-z0-9-]+"/);
    const stray = nextPage < 0 ? after : after.slice(0, nextPage);
    const orphan = (stray.match(/<div\b[^>]*>/g) || []).length;
    if (orphan > 0) {
      const at = code.slice(0, close).split('\n').length;
      pageProblems.push(`${shown}:${at} #${idm[1]} closes here, and ${orphan} block(s) after it`
        + ' belong to that page and are outside it. A </div> too many, usually left behind'
        + ' when a block was moved.');
    }
  }
}

if (pageProblems.length) {
  console.error('[check-tag-closure] a page does not contain its own content:');
  for (const p of pageProblems) console.error(`  ${p}`);
  console.error('');
  console.error('Content outside its .page draws under every other page and the switcher');
  console.error('cannot hide it. On screen the page simply looks empty below the break.');
  process.exit(1);
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
  + ' script and style: every one of them ends with a >, and every id="page-*" block'
  + ' contains the content that belongs to it.');
