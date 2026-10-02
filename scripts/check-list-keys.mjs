#!/usr/bin/env node
/**
 * A list of elements carries a key on every element in it.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie: "On insights page in app, I'm seeing a warning 'Each child in a list
 * should have a unique ke...'"
 *
 * It was the budget tool. Two of its four section blocks are built inside a
 * `.map`, and `section()` is a helper that returns a `<View>`: a key passed to
 * a helper goes nowhere, because React needs it on the element the helper
 * returns, not on the call. The helper took no key at all.
 *
 * Two things made it hard to find. The warning names no file, and all four tabs
 * mount when the app launches, so a warning raised by a component on Learn
 * appears while someone is looking at Insights. It was reported against the
 * wrong screen through no fault of the report.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 * Every `.map(...)` whose callback returns a call to a local helper that
 * returns JSX. The helper's own outermost element has to carry a key. That is
 * the shape a scan for `.map(... => <Tag` cannot see, and the shape every
 * element-returning helper in this codebase has.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Plain `.map(x => <Tag key=...>)`, which is already the overwhelming majority
 * and which React's own warning finds immediately in development. This is for
 * the indirect form, which is the one that survives.
 *
 * Whether the keys are unique. A duplicate key raises a different warning and
 * needs the values, which are runtime.
 */

import { readFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|jsx)$/.test(name)) out.push(p);
  }
  return out;
}

const files = [
  ...walk(join(ROOT, 'attune-app/src')),
  ...walk(join(ROOT, 'src')),
];

/**
 * A `const <fn> = (...) => (<Tag ...>` declaration, read by depth.
 *
 * @returns { tag, attrs } of the element it returns, or null.
 */
function declReturning(src, fn) {
  const at = new RegExp(`const\\s+${fn}\\s*=\\s*\\(`).exec(src);
  if (!at) return null;
  const open = src.indexOf('(', at.index);
  let depth = 0;
  let close = -1;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '(') depth += 1;
    else if (src[i] === ')') {
      depth -= 1;
      if (depth === 0) { close = i; break; }
    }
  }
  if (close === -1) return null;
  /* Past an optional return-type annotation to the arrow, then the element. */
  const after = src.slice(close + 1, close + 6000);
  /* Concise body: `=> (<Tag ...>`. */
  const concise = /^[^=\n]*=>\s*\(\s*\n?\s*<(\w+)([^>]*?)>/s.exec(after);
  if (concise) return { tag: concise[1], attrs: concise[2] };
  /**
   * Block body: `=> { ... return (<Tag ...> }`. `money()` is written this way,
   * and a matcher that only knew the concise form reported it unresolvable and
   * skipped it, along with eight others.
   */
  const block = /^[^=\n]*=>\s*\{/s.exec(after);
  if (!block) return null;
  const ret = /\breturn\s*\(\s*\n?\s*<(\w+)([^>]*?)>/s.exec(after.slice(block[0].length));
  if (!ret) return null;
  return { tag: ret[1], attrs: ret[2] };
}

/** The text inside a call's parentheses, by depth. */
function argsOf(src, from) {
  const open = src.indexOf('(', from);
  if (open === -1) return '';
  let depth = 0;
  for (let i = open; i < Math.min(src.length, open + 30000); i += 1) {
    if (src[i] === '(') depth += 1;
    else if (src[i] === ')') {
      depth -= 1;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  return '';
}

const fails = [];
const unresolved = [];
let checked = 0;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const rel = file.slice(ROOT.length);

  for (const m of src.matchAll(/\.map\(/g)) {
    const body = argsOf(src, m.index + 4);
    const arrow = /=>\s*/.exec(body);
    if (!arrow) continue;
    let rest = body.slice(arrow.index + arrow[0].length).replace(/^\s+/, '');
    if (rest.startsWith('(')) rest = rest.slice(1).replace(/^\s+/, '');

    /* Only the indirect form: the callback returns a CALL, not an element. */
    const call = /^([A-Za-z_$][\w$]*)\s*\(/.exec(rest);
    if (!call) continue;
    const fn = call[1];

    /**
     * The helper, declared in the same file, that returns JSX directly.
     *
     * The parameter list is matched by depth rather than with `[^)]*`. A
     * callback parameter, `(v: string) => void`, closes that character class
     * early, so `money()` and `chip()` were reported as unresolvable and went
     * unchecked. Nine of them did. This is the same mistake the gate for the
     * workbook image made an hour earlier, in the same session.
     */
    const decl = declReturning(src, fn);
    if (!decl) {
      /**
       * A helper this cannot resolve.
       *
       * Counted and named rather than skipped. A plant that renamed a helper's
       * declaration made this gate pass silently, which is the same blindness
       * it exists to catch: the list is still there, and nothing checked it.
       * Most of these are imported helpers or ones that do not return JSX, so
       * it reports rather than fails.
       */
      unresolved.push(`${rel}:${src.slice(0, m.index).split('\n').length} -> ${fn}()`);
      continue;
    }
    checked += 1;

    if (!/\bkey\b\s*=/.test(decl.attrs)) {
      const line = src.slice(0, m.index).split('\n').length;
      fails.push(`${rel}:${line} maps over a list and returns ${fn}(), whose <${decl.tag}> carries`
        + ' no key.\n'
        + '      A key handed to a helper goes nowhere: React needs it on the element the\n'
        + '      helper returns. Give the helper a `key` parameter and put it on that element.');
    }
  }
}

if (!checked) {
  console.log('[check-list-keys] no list builds its elements through a helper, so there is'
    + ' nothing of this shape to get wrong.');
  process.exit(0);
}

if (fails.length) {
  console.error('\n check-list-keys: a list is built without keys.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-list-keys] ${checked} lists build their elements through a helper, and every`
  + ' one of those helpers keys the element it returns'
  + (unresolved.length
    ? `; ${unresolved.length} call a helper this could not resolve and were not checked.`
    : '.'));
for (const u of unresolved) console.log(`  unchecked  ${u}`);
