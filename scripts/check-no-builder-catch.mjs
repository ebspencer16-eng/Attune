#!/usr/bin/env node
/**
 * A Supabase query is never ended with `.catch(...)`.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * A query builder from supabase-js has `then` and no `catch`: it is a
 * PromiseLike, not a Promise. So `sb.from('orders').update(x).eq(...).catch(()
 * => {})` does not swallow an error. It throws "catch is not a function" on
 * the spot, and because the builder only sends its request when something
 * calls `then`, the write is never made at all.
 *
 * Found in the A170 sweep, three times in the website. One linked an order to
 * the account at login and sat inside a try, so for as long as it existed the
 * link was never written and nothing said so. Another was in the gift box
 * sign-up form, where the throw reached the form's own catch and every sign-up
 * through it failed before sending the partner's invite (that form was
 * retired with the gift cards and is gone now).
 *
 * It is invisible to everything else here: it is valid JavaScript, it builds,
 * no name is undefined, and the throw is usually caught.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * Every `.catch(...)` call in the website, the app and the server, parsed
 * rather than grepped, whose receiver is a chain containing `.from(` or
 * `.rpc(`, which is how every query here starts. Multi-line chains included,
 * which a line-based grep would miss.
 *
 * ── WHAT IT DOES NOT COVER ────────────────────────────────────────────────
 * A builder held in a variable and caught later (`const q = sb.from(...);
 * q.catch(...)`). Nothing here does that; if something starts to, this check
 * needs to follow the binding.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';

const traverse = _traverse.default || _traverse;
const ROOT = new URL('..', import.meta.url).pathname;
const files = [];
const walk = (d) => {
  for (const e of readdirSync(`${ROOT}${d}`)) {
    if (e === 'node_modules' || e.startsWith('.')) continue;
    const p = `${d}/${e}`;
    if (statSync(`${ROOT}${p}`).isDirectory()) walk(p);
    else if (/\.(jsx?|tsx?|mjs)$/.test(e)) files.push(p);
  }
};
['src', 'api', 'attune-app/src'].forEach(walk);

const fails = [];
let catches = 0;
const chainHasQuery = (node) => {
  let n = node;
  while (n) {
    if (n.type === 'CallExpression') {
      const c = n.callee;
      if (c.type === 'MemberExpression' && !c.computed && ['from', 'rpc'].includes(c.property.name)) return true;
      n = c.type === 'MemberExpression' ? c.object : null;
    } else if (n.type === 'MemberExpression') n = n.object;
    else if (n.type === 'AwaitExpression') n = n.argument;
    else return false;
  }
  return false;
};

for (const f of files) {
  let ast;
  try {
    ast = parse(readFileSync(`${ROOT}${f}`, 'utf8'), { sourceType: 'module', plugins: ['jsx', 'typescript'], errorRecovery: true });
  } catch { continue; }
  traverse(ast, {
    CallExpression(path) {
      const c = path.node.callee;
      if (c.type !== 'MemberExpression' || c.computed || c.property.name !== 'catch') return;
      catches += 1;
      if (chainHasQuery(c.object)) {
        fails.push(`${f}:${path.node.loc.start.line} ends a Supabase query with .catch(). It has no catch: this throws and the request is never sent.`);
      }
    },
  });
}
if (catches < 50) fails.push(`only ${catches} .catch calls found across ${files.length} files. The walk has lost them.`);

if (fails.length) {
  console.error('check-no-builder-catch FAILED');
  for (const x of fails) console.error('  - ' + x);
  process.exit(1);
}
console.log(`[check-no-builder-catch] ${catches} .catch calls across ${files.length} files in the website, the app and the server;`
  + ' none is on a Supabase query, which has no catch and would throw before sending.');
