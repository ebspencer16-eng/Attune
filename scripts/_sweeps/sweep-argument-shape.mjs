#!/usr/bin/env node
/**
 * S39: every function that unpacks its argument, against every call site.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Both of 2026-10-20's bugs were one shape. `userForRequest` destructures
 * { token, supabaseUrl, anonKey } and was handed a Request, so the token was
 * undefined and the endpoint refused everybody. `jsonBody` answers { body } or
 * { error } and its caller read the body's own fields off that wrapper, so the
 * key was undefined and the endpoint refused a good body.
 *
 * CLAUDE.md already records a third: `resultsGate` handed the whole
 * capabilities object rather than its `caps` half, which dropped every
 * optional exercise out of the rule. "When a function takes 'the flags', check
 * which flags, because the object with the right name is not always the object
 * with the right keys."
 *
 * Three of these is a shape, and a shape can be counted.
 *
 * ── WHAT IS MEASURED ──────────────────────────────────────────────────────
 * For every function whose first parameter is destructured, every call to it
 * by that name. A finding is a call whose argument is an object this scan can
 * read and whose keys have NOTHING in common with the ones the function reads.
 *
 * Zero overlap, not partial. A caller that passes four of five keys is usually
 * relying on a default; a caller that passes none of them is handing over a
 * different kind of thing entirely, which is what all three bugs were.
 *
 * ── WHAT IT CANNOT SEE, SAID OUT LOUD ─────────────────────────────────────
 * An argument this scan cannot resolve to an object literal: a parameter, a
 * call's return, a property. Those are counted and printed rather than
 * skipped, because a silent skip is how a sweep becomes evidence for something
 * it never looked at. The one resolvable case among them that matters is a
 * bare `req`/`request`, which is the convos bug, and that is reported.
 *
 * A name defined twice with different parameter shapes is ambiguous here and
 * is counted separately rather than guessed at.
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
    else if (/\.(js|mjs|jsx)$/.test(name)) files.push(full);
  }
})(join(ROOT, 'api'));
files.push(join(ROOT, 'src/App.jsx'));

const parsed = new Map();
for (const f of files) {
  try {
    parsed.set(f, parse(readFileSync(f, 'utf8'), {
      sourceType: 'module', plugins: ['topLevelAwait', 'jsx'],
    }));
  } catch { /* a file this cannot parse is one the build already refuses */ }
}

/** name -> { keys:Set, required:Set, where:string } or 'ambiguous' */
const shapes = new Map();
const keysOf = (pattern) => {
  const keys = new Set(); const required = new Set();
  for (const p of pattern.properties) {
    if (p.type === 'RestElement') continue;
    const name = p.key?.type === 'Identifier' ? p.key.name
      : p.key?.type === 'StringLiteral' ? p.key.value : null;
    if (!name) continue;
    keys.add(name);
    if (p.value?.type !== 'AssignmentPattern') required.add(name);
  }
  return { keys, required };
};

for (const [f, ast] of parsed) {
  const rel = f.replace(ROOT, '');
  traverse(ast, {
    'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression'(path) {
      const node = path.node;
      const first = node.params[0];
      if (!first || first.type !== 'ObjectPattern') return;
      let name = node.id?.name || null;
      if (!name && path.parent.type === 'VariableDeclarator' && path.parent.id.type === 'Identifier') {
        name = path.parent.id.name;
      }
      if (!name) return;
      const { keys, required } = keysOf(first);
      if (!keys.size) return;
      const prev = shapes.get(name);
      if (prev && prev !== 'ambiguous') {
        const same = prev.keys.size === keys.size && [...keys].every((k) => prev.keys.has(k));
        if (!same) { shapes.set(name, 'ambiguous'); return; }
      }
      if (!prev) shapes.set(name, { keys, required, where: rel });
    },
  });
}

/** Resolve an argument to a set of keys, or say why not. */
function argKeys(arg, scopePath) {
  if (!arg) return { kind: 'none' };
  if (arg.type === 'ObjectExpression') {
    if (arg.properties.some((p) => p.type === 'SpreadElement')) return { kind: 'spread' };
    const names = arg.properties
      .map((p) => (p.key?.type === 'Identifier' ? p.key.name
        : p.key?.type === 'StringLiteral' ? p.key.value : null))
      .filter(Boolean);
    return { kind: 'object', names: new Set(names) };
  }
  if (arg.type === 'Identifier') {
    const binding = scopePath.scope.getBinding(arg.name);
    const init = binding?.path?.node?.init;
    if (init?.type === 'ObjectExpression') {
      if (init.properties.some((p) => p.type === 'SpreadElement')) return { kind: 'spread' };
      const names = init.properties
        .map((p) => (p.key?.type === 'Identifier' ? p.key.name
          : p.key?.type === 'StringLiteral' ? p.key.value : null))
        .filter(Boolean);
      return { kind: 'object', names: new Set(names), via: arg.name };
    }
    if (binding?.kind === 'param') return { kind: 'param', name: arg.name };
    return { kind: 'name', name: arg.name };
  }
  return { kind: arg.type };
}

const findings = [];
const requestShaped = [];
const unresolved = [];
const counted = { object: 0, unresolved: 0, spread: 0, ambiguous: 0, none: 0 };

for (const [f, ast] of parsed) {
  const rel = f.replace(ROOT, '');
  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;
      const name = callee.type === 'Identifier' ? callee.name : null;
      if (!name) return;
      const shape = shapes.get(name);
      if (!shape) return;
      if (shape === 'ambiguous') { counted.ambiguous += 1; return; }
      const line = path.node.loc?.start.line ?? 0;
      const got = argKeys(path.node.arguments[0], path);

      if (got.kind === 'object') {
        counted.object += 1;
        const overlap = [...got.names].filter((k) => shape.keys.has(k));
        if (!overlap.length) {
          findings.push(`${rel}:${line} ${name}({ ${[...got.names].join(', ') || '(empty)'} })`
            + ` but it reads { ${[...shape.keys].join(', ')} } (${shape.where}). No key in common.`);
        }
        return;
      }
      if (got.kind === 'spread') { counted.spread += 1; return; }
      if (got.kind === 'none') {
        counted.none += 1;
        if (shape.required.size) {
          findings.push(`${rel}:${line} ${name}() with no argument, and it reads`
            + ` { ${[...shape.required].join(', ')} } with no defaults (${shape.where}).`);
        }
        return;
      }
      counted.unresolved += 1;
      unresolved.push(`${rel}:${line} ${name}(${got.name || got.kind}) reads`
        + ` { ${[...shape.keys].join(', ')} }`);
      /* The one unresolvable shape worth naming: a request object handed to a
         function that wants three named fields. That is api/convos.js exactly. */
      /* ── THE HARNESS WAS WRONG FIRST ────────────────────────────────
         This list had `ctx` and `context` in it and reported
         orderConfirmationHtml(ctx) in api/send-order-email.js. That ctx is
         `{ ...body, setupUrl, giftUrl }`: a bag built for exactly this, and
         its keys come from the request body, so no static scan can read them.
         `ctx` is the conventional name for the thing this is looking for the
         ABSENCE of. Only the names that mean "the HTTP request itself", which
         is the bug that prompted the sweep. */
      if ((got.kind === 'param' || got.kind === 'name')
        && /^(req|request|res|response|event)$/.test(got.name || '')) {
        requestShaped.push(`${rel}:${line} ${name}(${got.name}) where it reads`
          + ` { ${[...shape.keys].join(', ')} } (${shape.where}).`);
      }
    },
  });
}

console.log(`[sweep-argument-shape] ${parsed.size} files; ${shapes.size} functions unpack their first argument.`);
console.log(`calls read: ${counted.object} as an object, ${counted.unresolved} not resolvable here,`
  + ` ${counted.spread} carrying a spread, ${counted.none} with no argument,`
  + ` ${counted.ambiguous} to a name declared twice with different shapes.\n`);

console.log(`no key in common: ${findings.length}`);
for (const x of findings) console.log('  ' + x);

console.log(`\na request-shaped name where named fields are wanted: ${requestShaped.length}`);
for (const x of requestShaped) console.log('  ' + x);

/* Named, not skipped. A sweep that cannot see something has to say what. */
console.log(`\ncalls this scan could not resolve to an object, listed rather than skipped: ${unresolved.length}`);
for (const x of unresolved) console.log('  ' + x);
