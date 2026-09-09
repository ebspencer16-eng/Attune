// Fails the build when a page uses a shared token without loading tokens.css.
//
// ── WHAT GOES WRONG WITHOUT THIS ───────────────────────────────────────────
// public/tokens.css holds the spacing scale (--s-*) and the palette (--ink,
// --warm, --orange and the rest). Across 38 pages, 1,607 spacing values and
// every colour now read from it. A CSS custom property that is not defined
// does not fall back to anything useful: the declaration is invalid at
// computed-value time and the property takes its inherited or initial value.
// For padding that is 0. For a background colour it is transparent, and for
// text it is whatever the parent happened to be.
//
// So a page that uses var(--s-lg) or var(--ink) without
// <link href="/tokens.css"> does not look slightly wrong. Every gap collapses
// and every colour falls back at once. That failure is silent in review,
// because the file that broke it is a different file.
//
// This is the gate the tokens file traded for. Nineteen copies of the palette
// in nineteen :root blocks could not fail to load; they just quietly drifted,
// and twelve of thirty variables had. One shared file cannot drift, but it can
// fail to reach a page. The trade is worth it, but only with this check
// standing behind it.
//
// ── A PAGE MAY STILL DISAGREE ──────────────────────────────────────────────
// Some pages deliberately override a shared value: legal and privacy-choices
// use a lighter --ink, start uses its own --indigo. Those declarations stay in
// the page's own :root and win, because the page's <style> comes after the
// link. This gate does not object to an override. It objects to a page that
// reads a token nothing has defined.
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
  [...readFileSync(join(PUBLIC, TOKENS_FILE), 'utf8').matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)]
    .map((m) => m[1]),
);
if (!defined.size) {
  console.error(`[check-tokens] public/${TOKENS_FILE} defines no variables.`);
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

/** cart.css is the other shared sheet, loaded by twelve pages. */
const cartDefined = new Set(
  [...readFileSync(join(PUBLIC, 'cart.css'), 'utf8').matchAll(/(--[a-z0-9-]+)\s*:/g)]
    .map((m) => m[1]),
);

const problems = [];
let users = 0;

for (const abs of walk(PUBLIC)) {
  const rel = relative(ROOT, abs);
  const text = readFileSync(abs, 'utf8');

  // Only uses with no fallback. var(--accent, #6C7FFF) is correct CSS whether
  // or not --accent exists, and flagging it would teach people to ignore this
  // gate, which is worse than not having one.
  const used = [...new Set(
    [...text.matchAll(/var\(\s*(--[a-z0-9-]+)\s*\)/g)].map((m) => m[1]),
  )];
  if (!used.length) continue;
  users++;

  // Anything the page declares itself, in any rule, not only :root. A page's
  // own private variables are its own business.
  const own = new Set([...text.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));

  // Plus anything it can reach by having loaded a shared sheet.
  const linksTokens = /<link[^>]+href="\/tokens\.css"/.test(text);
  const linksCart = /<link[^>]+href="\/cart\.css"/.test(text);
  const reachable = new Set([
    ...own,
    ...(linksTokens ? defined : []),
    ...(linksCart ? cartDefined : []),
  ]);

  const orphans = used.filter((n) => !reachable.has(n));
  if (!orphans.length) continue;

  // The two halves are one question asked once: is every name this page reads
  // defined somewhere this page can see? Naming the likely cause helps, but
  // the check is the same either way.
  const shared = orphans.filter((n) => defined.has(n));
  const unknown = orphans.filter((n) => !defined.has(n));
  if (shared.length) {
    problems.push(`${rel} reads ${shared.join(', ')} but does not link /${TOKENS_FILE}`);
  }
  if (unknown.length) {
    problems.push(`${rel} reads ${unknown.join(', ')}, which nothing it can see defines`);
  }
}

if (problems.length) {
  console.error('[check-tokens] a shared token is not reaching a page that reads it:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error(`An undefined custom property does not fall back. Padding becomes 0,`);
  console.error(`backgrounds go transparent, and the page breaks silently. Add`);
  console.error(`<link rel="stylesheet" href="/${TOKENS_FILE}"> before the page's <style>,`);
  console.error(`or fix the variable name.`);
  process.exit(1);
}

console.log(`[check-tokens] ${users} pages read shared tokens; all load them, all names defined.`);
