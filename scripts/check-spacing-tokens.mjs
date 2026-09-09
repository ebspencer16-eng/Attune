// Fails the build when a page uses the spacing scale without loading it.
//
// ── WHAT GOES WRONG WITHOUT THIS ───────────────────────────────────────────
// public/tokens.css defines --s-xs through --s-3xl, and 1,607 padding, margin
// and gap values across 38 pages now read them. A CSS custom property that is
// not defined does not fall back to anything useful: the declaration is
// invalid at computed-value time and the property takes its inherited or
// initial value. For padding that is 0.
//
// So a page that uses var(--s-lg) without <link href="/tokens.css"> does not
// look slightly wrong. Every gap on it collapses at once. That failure is
// silent in review, because the file that broke it is a different file.
//
// This is the gate the tokens file traded for. Twenty copies of a spacing
// scale in twenty :root blocks could never fall out of sync with themselves;
// one shared file can fail to load. The trade is worth it, but only with this
// check standing behind it.
//
// ── THE TWO HALVES ─────────────────────────────────────────────────────────
// 1. Every page that uses a token links the file.
// 2. Every token a page uses is actually defined in that file. A typo like
//    var(--s-xxl) is the same silent collapse, and reads as intentional.
//
// Neither half catches the other's failure.

import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const PUBLIC = join(ROOT, 'public');
const TOKENS_FILE = 'tokens.css';

const defined = new Set(
  [...readFileSync(join(PUBLIC, TOKENS_FILE), 'utf8').matchAll(/(--s-[a-z0-9]+)\s*:/g)]
    .map((m) => m[1]),
);
if (!defined.size) {
  console.error(`[check-spacing-tokens] public/${TOKENS_FILE} defines no --s-* variables.`);
  process.exit(1);
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const problems = [];
let users = 0;

for (const abs of walk(PUBLIC)) {
  const rel = relative(ROOT, abs);
  const text = readFileSync(abs, 'utf8');

  const used = [...text.matchAll(/var\(\s*(--s-[a-z0-9]+)\s*\)/g)].map((m) => m[1]);
  if (!used.length) continue;
  users++;

  // Half one: it has to be loaded.
  if (!/<link[^>]+href="\/tokens\.css"/.test(text)) {
    problems.push(`${rel} uses ${[...new Set(used)].join(', ')} but does not link /${TOKENS_FILE}`);
  }

  // Half two: it has to exist.
  for (const name of new Set(used)) {
    if (!defined.has(name)) {
      problems.push(`${rel} uses ${name}, which public/${TOKENS_FILE} does not define`);
    }
  }
}

if (problems.length) {
  console.error('[check-spacing-tokens] the spacing scale is not reaching every page that reads it:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error(`An undefined --s-* does not fall back. Padding becomes 0 and the page`);
  console.error(`collapses silently. Add <link rel="stylesheet" href="/${TOKENS_FILE}"> before`);
  console.error(`the page's <style>, or fix the variable name.`);
  process.exit(1);
}

console.log(`[check-spacing-tokens] ${users} pages read the spacing scale; all load it, all names defined.`);
