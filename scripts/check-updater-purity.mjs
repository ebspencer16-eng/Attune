#!/usr/bin/env node
/**
 * A React state updater does not start a request or set another state.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * The function passed to a setter is a pure function of the previous state.
 * React is allowed to call it more than once: StrictMode does so on every
 * call, and a render that gets discarded can do it at any time. So a request
 * started in there is a request sent twice, and a second setter called in
 * there is a state change nobody can trace to a cause.
 *
 * ── WHERE IT CAME FROM ────────────────────────────────────────────────────
 * Four sites, found by sweeping every updater in the app and the website.
 * Three of them wrote to the server from inside an updater: the conversation
 * ticks on both surfaces, which are mine from the same afternoon, and the
 * Learn checklist, which POSTs the whole list on every tap. The fourth called
 * five other setters inside one.
 *
 * None of them was reported by anybody. That is the shape of this: it costs a
 * duplicate write in development, nothing visible in production today, and
 * everything on the day one of those updaters wraps something that is not
 * idempotent.
 *
 * ── WHAT IS CHECKED, AND HOW IT KNOWS WHAT A SETTER IS ────────────────────
 * A setter is the second half of a `useState` destructure, read out of the
 * file. Not a name matching /^set[A-Z]/: `setTimeout` matches that, and the
 * first version of this reported eight timeout callbacks clearing a flash
 * message. `setConvoDone` matches it too, so the one real finding was also
 * reported as a "second setter" it is not.
 *
 * Inside such an updater's body:
 *   - an `await`
 *   - a call with `.then(...)` on it
 *   - a call to another setter from the same file
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * A synchronous side effect with no promise and no second setter: a ref
 * written, a module array pushed, a console call. Those are impure too and
 * are almost always harmless when run twice, and including them made the
 * first list long enough that nobody would read it. This gate is about the
 * two that cost something.
 *
 * The fix is always the same shape: hold the latest value in a ref, written
 * beside the state, and do the work outside the updater.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';

const traverse = _traverse.default || _traverse;
const ROOT = new URL('..', import.meta.url).pathname;

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(tsx?|jsx?)$/.test(name)) files.push(full);
  }
})(join(ROOT, 'attune-app/src'));
for (const name of readdirSync(join(ROOT, 'src'))) {
  const full = join(ROOT, 'src', name);
  if (!statSync(full).isDirectory() && /\.(jsx?|tsx?)$/.test(name)) files.push(full);
}

/** Every name that came out of a useState in this file. */
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
      if (path.node.id.type !== 'ArrayPattern') return;
      const second = path.node.id.elements[1];
      if (second?.type === 'Identifier') names.add(second.name);
    },
  });
  return names;
}

const fails = [];
const unreadable = [];
let updaters = 0;
let parsedFiles = 0;

for (const f of files) {
  let ast;
  try {
    ast = parse(readFileSync(f, 'utf8'), {
      sourceType: 'module', plugins: ['typescript', 'jsx', 'topLevelAwait'],
    });
  } catch (e) {
    /* ── A FILE THIS CANNOT READ IS NOT A FILE THIS HAS CHECKED ──────────
       The first version swallowed a parse failure and carried on. Planting a
       bug with unbalanced braces then produced a clean pass, and the reading
       was "this gate is blind" when the truth was "this gate skipped the
       file". Every file here parses today; one that does not is either
       broken, in which case the build should say so, or written in something
       these plugins do not know, in which case this gate needs widening. */
    unreadable.push(`${f.replace(ROOT, '')}: ${String(e.message).split('\n')[0].slice(0, 90)}`);
    continue;
  }
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
      const at = path.node.loc?.start.line ?? 0;

      path.get('arguments.0').traverse({
        AwaitExpression(p) {
          fails.push(`${rel}:${p.node.loc?.start.line} awaits inside ${callee.name}'s updater (opened line ${at}).`);
        },
        MemberExpression(p) {
          if (p.node.property?.name !== 'then') return;
          if (p.node.object?.type !== 'CallExpression') return;
          const c = p.node.object.callee;
          const named = c.type === 'Identifier' ? c.name
            : c.type === 'MemberExpression' && c.property.type === 'Identifier' ? c.property.name : 'a call';
          fails.push(`${rel}:${p.node.loc?.start.line} starts ${named}(...).then(...) inside`
            + ` ${callee.name}'s updater (opened line ${at}).`);
        },
        CallExpression(p) {
          const c = p.node.callee;
          if (c.type !== 'Identifier' || !setters.has(c.name) || c.name === callee.name) return;
          fails.push(`${rel}:${p.node.loc?.start.line} calls ${c.name}() inside`
            + ` ${callee.name}'s updater (opened line ${at}).`);
        },
      });
    },
  });
}

if (unreadable.length) {
  console.error('[check-updater-purity] a file would not parse, so it was not checked:\n');
  for (const u of unreadable) console.error('  ' + u);
  console.error('\nRefusing to pass: a gate that silently skips its subject reports success');
  console.error('about code nobody read.');
  process.exit(1);
}

if (!updaters) {
  console.error('[check-updater-purity] found no state updaters at all across'
    + ` ${parsedFiles} files. Either useState is written some other way now or this scan`
    + ' has stopped reaching the app. Refusing to pass: a gate that has lost its subject'
    + ' must never report success.');
  process.exit(1);
}

if (fails.length) {
  console.error('[check-updater-purity] a state updater does something React may do twice:\n');
  for (const f of fails) console.error('  ' + f);
  console.error('');
  console.error('An updater is a pure function of the previous state. StrictMode calls it');
  console.error('twice on every set, and a discarded render can call it again at any time.');
  console.error('Hold the latest value in a ref written beside the state, and do the work');
  console.error('outside the updater.');
  process.exit(1);
}

console.log(`[check-updater-purity] ${parsedFiles} of ${files.length} files parsed`
  + ` (the rest are not JavaScript), ${updaters} state updaters;`
  + ' none starts a request or sets another piece of state.');
