#!/usr/bin/env node
/**
 * No hook sits below an early return.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * attune-app/src/app/resources.tsx had a useMemo below five of them: the
 * loading screen, the checklist, the article reader, the budget and the shelf
 * page. React counts hooks by call order, so a render that took any of those
 * exits ran one hook fewer than the render before it, and React threw
 * "Rendered more hooks than during the previous render" full screen in red.
 *
 * It was found by opening the Learn tab after an unrelated edit, which is the
 * wrong way to find it. Every route out of that screen went through the bad
 * path, and a beta tester would have met it on their first article.
 *
 * ── WHY A SCANNER RATHER THAN A LINT RULE ─────────────────────────────────
 * The eslint rule that covers this is react-hooks/rules-of-hooks, and it is
 * not in this repo's lint setup. Adding it would be better and is a bigger
 * change than one check: it would want a config, a plugin and a pass over
 * every existing warning. This is the one shape of it that actually bit, and
 * it costs nothing.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * Per component function: find the first statement-level `return` that is not
 * the component's last, and fail on any hook call after it at the function's
 * own indentation. Depth is by indentation rather than by parsing, which is
 * why only top-level statements count: a return inside a callback or a nested
 * function is indented further and is not an early exit from the component.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Hooks inside conditionals, loops or callbacks. Those are the other half of
 * the rules of hooks and they need a parser to see properly. This is the half
 * that produced a crash here, stated narrowly so it cannot produce a false
 * positive that gets it loosened until it matches nothing.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DIRS = ['attune-app/src'];

const files = [];
for (const d of DIRS) {
  (function walk(dir) {
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    for (const name of entries) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (/node_modules|\.expo|ios|android/.test(p)) continue;
        walk(p);
        continue;
      }
      if (name.endsWith('.tsx') || name.endsWith('.ts')) files.push(p);
    }
  })(join(ROOT, d));
}

if (files.length < 20) {
  console.error(`[check-hook-order] only scanned ${files.length} files; refusing to pass.`);
  process.exit(1);
}

/** A hook is a call whose name starts `use` followed by a capital. */
const HOOK = /(?:^|[^.\w])(use[A-Z]\w*)\s*\(/;
/**
 * A new top-level scope.
 *
 * Any declaration at column zero, not just the two shapes a component is
 * usually written in. The first version matched `function X(` and
 * `const X = (...) =>` only, so it did not see
 * `const EdgeFadedRow = forwardRef<ScrollView, Props>(function EdgeFadedRow(`
 * and went on attributing that component's hooks to the small helper declared
 * above it. It reported a pure string function as calling
 * useWindowDimensions() after an early return.
 *
 * Widening a matcher is not usually the safe direction. It is here, because
 * what widens is where a scope ENDS: more boundaries means fewer lines
 * wrongly attributed, which can only remove false positives.
 */
const OPENS = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|const|let|var|class)\s+(\w+)/;

const fails = [];

for (const file of files) {
  const rel = file.slice(ROOT.length);
  const lines = readFileSync(file, 'utf8').split('\n');

  let fn = null;
  let returnedAt = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (/^\S/.test(line) && OPENS.test(line)) {
      fn = (line.match(OPENS) || [])[1] || null;
      returnedAt = null;
      continue;
    }
    if (!fn) continue;

    /* Only the function's own statements: exactly two spaces of indent. A
       deeper line is inside something else and its return is not an exit. */
    const own = /^ {2}\S/.test(line);
    if (!own) continue;

    if (/^ {2}return\b/.test(line) || /^ {2}if\s*\(.*\)\s*return\b/.test(line)) {
      if (returnedAt === null) returnedAt = i + 1;
      continue;
    }

    if (returnedAt === null) continue;
    const m = line.match(HOOK);
    if (!m) continue;
    /* A hook named in a comment is not a hook call. */
    if (/^\s*(?:\/\/|\*|\/\*)/.test(line)) continue;
    fails.push(`${rel}:${i + 1} calls ${m[1]}() in ${fn}(), below an early return`
      + ` on line ${returnedAt}. A render that takes that exit runs one hook`
      + ' fewer than the render before it, and React throws "Rendered more hooks'
      + ' than during the previous render" over the whole screen.');
    returnedAt = null;    // one report per function is enough to fix it
  }
}

if (fails.length) {
  console.error('\n check-hook-order: a hook can be skipped.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`[check-hook-order] ${files.length} app files; no hook sits below an early return.`);
