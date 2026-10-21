#!/usr/bin/env node
/**
 * S40: a side effect started inside a React state updater.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * The conversation ticks provider does this:
 *
 *     setTicks((cur) => {
 *       const next = { ...cur };
 *       ...
 *       setConvoDone(key, done).then((r) => { ... });   // a POST
 *       return next;
 *     });
 *
 * The updater passed to a setter is supposed to be a pure function of the
 * previous state. React is free to call it more than once: it does exactly
 * that in StrictMode, which is how a development build runs, and it may do so
 * when it replays a render. A request started in there is a request sent
 * twice, and a second setter called in there is a state change nobody can
 * trace back.
 *
 * It is not a crash. It is the quiet kind: one extra write to the server per
 * tap, which looks like nothing until two of them race and the loser's answer
 * is the one that lands.
 *
 * ── WHAT IS MEASURED ──────────────────────────────────────────────────────
 * Every `setSomething(fn)` whose function body contains
 *
 *   - a promise started there: a call that is awaited, or has `.then` on it
 *   - another `setSomething(` call
 *
 * Both are objective. Nothing is judged by name.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * A synchronous side effect with no promise and no second setter: writing to a
 * ref, pushing to a module array, calling console. Those are also impure and
 * are mostly harmless when run twice, and including them turned the first run
 * into a list nobody would read.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';

const traverse = _traverse.default || _traverse;
const ROOT = new URL('../..', import.meta.url).pathname;

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(tsx?|jsx?)$/.test(name)) files.push(full);
  }
})(join(ROOT, 'attune-app/src'));
(function walkWeb(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) continue;
    if (/\.(jsx?|tsx?)$/.test(name)) files.push(full);
  }
})(join(ROOT, 'src'));

const findings = [];
let updaters = 0;
let parsedFiles = 0;

/**
 * ── THE HARNESS WAS WRONG TWICE, WHICH IS THE USUAL RATIO ────────────────
 * The first run reported nineteen and eleven of them were the matcher.
 *
 * `setTimeout` matches /^set[A-Z]/. Eight findings were a second setter
 * called inside a timeout callback, which is the ordinary way to clear a
 * flash message and has nothing to do with React's updater contract.
 *
 * And `setConvoDone` matches it too, so the one genuine finding was reported
 * twice: once as the promise it is, and once as a "second setter" it is not.
 *
 * A React state setter is not a name that looks like one. It is the second
 * half of a useState destructure, and that is readable, so it is read.
 */
function settersIn(ast) {
  const names = new Set();
  traverse(ast, {
    VariableDeclarator(path) {
      const init = path.node.init;
      if (init?.type !== 'CallExpression') return;
      const c = init.callee;
      const called = c.type === 'Identifier' ? c.name
        : c.type === 'MemberExpression' && c.property.type === 'Identifier' ? c.property.name : null;
      if (called !== 'useState') return;
      const id = path.node.id;
      if (id.type !== 'ArrayPattern') return;
      const second = id.elements[1];
      if (second?.type === 'Identifier') names.add(second.name);
    },
  });
  return names;
}

for (const f of files) {
  let ast;
  try {
    ast = parse(readFileSync(f, 'utf8'), {
      sourceType: 'module',
      plugins: ['typescript', 'jsx', 'topLevelAwait'],
    });
  } catch { continue; }
  parsedFiles += 1;
  const rel = f.replace(ROOT, '');
  const setters = settersIn(ast);
  if (!setters.size) continue;

  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;
      if (callee.type !== 'Identifier' || !setters.has(callee.name)) return;
      const fn = path.node.arguments[0];
      if (!fn || (fn.type !== 'ArrowFunctionExpression' && fn.type !== 'FunctionExpression')) return;
      updaters += 1;
      const line = path.node.loc?.start.line ?? 0;

      const body = path.get('arguments.0');
      body.traverse({
        AwaitExpression(p) {
          findings.push(`${rel}:${p.node.loc?.start.line} inside ${callee.name}'s updater (line ${line}): an await.`);
        },
        MemberExpression(p) {
          if (p.node.property?.name !== 'then') return;
          if (p.node.object?.type !== 'CallExpression') return;
          const c = p.node.object.callee;
          const named = c.type === 'Identifier' ? c.name
            : c.type === 'MemberExpression' && c.property.type === 'Identifier' ? c.property.name
            : 'a call';
          findings.push(`${rel}:${p.node.loc?.start.line} inside ${callee.name}'s updater (line ${line}):`
            + ` ${named}(...).then(...), a request started where React may run the body twice.`);
        },
        CallExpression(p) {
          const c = p.node.callee;
          if (c.type !== 'Identifier' || !setters.has(c.name)) return;
          if (c.name === callee.name) return;
          findings.push(`${rel}:${p.node.loc?.start.line} inside ${callee.name}'s updater (line ${line}):`
            + ` a second setter, ${c.name}().`);
        },
      });
    },
  });
}

console.log(`[sweep-updater-effects] ${parsedFiles} files parsed, ${updaters} updaters passed to a`
  + ' setter this scan proved came out of a useState.\n');
console.log(`findings: ${findings.length}`);
for (const x of findings) console.log('  ' + x);
