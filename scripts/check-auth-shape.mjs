#!/usr/bin/env node
/**
 * Every endpoint hands `userForRequest` the three keys it reads.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * api/convos.js called `userForRequest(req)`. That function's one parameter is
 * destructured, `{ token, supabaseUrl, anonKey }`, and a Request carries none
 * of those names, so `token` was undefined on every call and the endpoint
 * answered 401 to everybody from the day it shipped.
 *
 * Nothing could see it from outside. 401 is also the correct answer to a
 * request with no token, so a sweep of the deployed surface reads it as
 * working, and both surfaces put a tick back when a save is refused, which is
 * what they are supposed to do. The symptom was a checkbox that filled and
 * emptied again, which looks like a design decision.
 *
 * CLAUDE.md records the same mistake on `resultsGate`, handed the whole
 * capabilities object rather than its `caps` half, with the result that every
 * optional exercise dropped out of the rule. "When a function takes 'the
 * flags', check which flags, because the object with the right name is not
 * always the object with the right keys."
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * A call to userForRequest passes an object literal, and that literal carries
 * `token`. Not "mentions a token somewhere in the file": the argument itself.
 *
 * And the token has to come off the Authorization header in the same file,
 * because a `token` read from a body is the caller naming themselves.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the token is any good. verify-token.js is about that and
 * check-token-verification.mjs holds it. This is only about the shape of the
 * argument, which is the half a type system would have caught and this
 * codebase has no types on the server.
 *
 * It also says nothing about the other two keys being right, because
 * `supabaseUrl` and `anonKey` are only read on the slow path: a wrong one
 * degrades, a missing `token` refuses everybody.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';

const traverse = _traverse.default || _traverse;
const ROOT = new URL('..', import.meta.url).pathname;

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (name === 'node_modules') continue;
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.js$/.test(name)) files.push(full);
  }
})(join(ROOT, 'api'));

const fails = [];
let calls = 0;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  if (!src.includes('userForRequest')) continue;
  const rel = file.replace(ROOT, '');
  let ast;
  try {
    ast = parse(src, { sourceType: 'module', plugins: ['topLevelAwait'] });
  } catch (e) {
    // A gate that has lost its subject must never report success.
    console.error(`[check-auth-shape] could not parse ${rel}: ${e.message}`);
    process.exit(1);
  }

  /** Where this file gets a token from. The header, or nowhere good. */
  const readsHeader = /headers\.get\(\s*['"]authorization['"]/i.test(src);

  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;
      const name = callee.type === 'Identifier' ? callee.name
        : callee.type === 'MemberExpression' && callee.property.type === 'Identifier' ? callee.property.name
        : null;
      if (name !== 'userForRequest') return;
      calls += 1;
      const line = path.node.loc?.start.line ?? 0;
      const arg = path.node.arguments[0];
      if (!arg || arg.type !== 'ObjectExpression') {
        fails.push(`${rel}:${line} hands userForRequest ${arg ? 'an expression' : 'nothing'}.`
          + ' It destructures { token, supabaseUrl, anonKey }, so anything else means token is'
          + ' undefined and the endpoint refuses everybody.');
        return;
      }
      const keys = arg.properties.map((p) => (
        p.type === 'ObjectProperty' && p.key.type === 'Identifier' ? p.key.name
          : p.type === 'ObjectProperty' && p.key.type === 'StringLiteral' ? p.key.value
            : p.type === 'SpreadElement' ? '...' : null
      ));
      if (keys.includes('...')) {
        fails.push(`${rel}:${line} spreads something into userForRequest's argument.`
          + ' Name the three keys: a spread is a guess about what is in the thing being spread.');
        return;
      }
      if (!keys.includes('token')) {
        fails.push(`${rel}:${line} passes { ${keys.filter(Boolean).join(', ')} } with no token.`);
        return;
      }
      if (!readsHeader) {
        fails.push(`${rel}:${line} passes a token the file never read off the Authorization header.`
          + ' A token from a body is the caller naming themselves.');
      }
    },
  });
}

if (!calls) {
  console.error('[check-auth-shape] found no calls to userForRequest at all.');
  console.error('Either the function was renamed or this scan stopped reaching api/.');
  console.error('Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

if (fails.length) {
  console.error('[check-auth-shape] an endpoint hands userForRequest the wrong shape:');
  for (const f of fails) console.error(`  ${f}`);
  console.error('');
  console.error('The symptom is a 401 for everybody, which looks exactly like a request');
  console.error('with no token, which is why nothing else can see this.');
  process.exit(1);
}

console.log(`[check-auth-shape] ${calls} calls to userForRequest across ${files.length} files, every one given { token, ... } read from the Authorization header.`);
