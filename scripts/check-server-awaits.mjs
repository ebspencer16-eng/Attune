#!/usr/bin/env node
/**
 * check-server-awaits: no promise on the server is started and left.
 *
 * Promoted from scripts/_sweeps/sweep-floating-promises.mjs (A202), which
 * found eight Sentry reports sent from edge error paths and not awaited, so
 * each was cut off when the function returned: the reports for exactly the
 * moments worth knowing about. A `void x()` is still reported, as a failure,
 * because it is cut off just the same.
 *
 * An edge function is frozen the moment it returns its Response, and a Node
 * function the moment it ends the reply. Anything still in flight then is cut
 * off or never sent: a database write, an email, a push. Locally it usually
 * finishes, because nothing freezes a dev server, so it reads as working.
 *
 * Shape: an expression statement in api/ whose value is a promise and which is
 * not awaited, returned, or collected: `fetch(...)`, a supabase-js chain
 * (`sb.from(...).update(...)`), `x.then(...)`/`.catch(...)`, or a call to an
 * async function declared or imported in the same file. `void x()` counts as
 * a deliberate drop and is reported separately, because it is still cut off.
 *
 * Calls to an imported async function are resolved one level: the imported
 * module is parsed and its exported async functions named.
 *
 * WHAT IT CANNOT SEE, said rather than skipped: a promise assigned to a name
 * and never awaited (`const p = fetch(...)`), and an async METHOD on an
 * imported object (`client.send(...)`). Planted: bare fetch, a supabase
 * chain, an un-awaited imported async call, `void fetch`, and a .then chain;
 * all five fail it.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { parse } from '@babel/parser';
import traverseMod from '@babel/traverse';
const traverse = traverseMod.default || traverseMod;
const ROOT = new URL('../', import.meta.url).pathname;
const files = [];
const walk = (d) => { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) { if (e !== 'node_modules') walk(p); } else if (/\.m?js$/.test(e)) files.push(p); } };
walk(join(ROOT, 'api'));

const asts = new Map();
const ast = (f) => { if (!asts.has(f)) { try { asts.set(f, parse(readFileSync(f, 'utf8'), { sourceType: 'module', plugins: ['jsx'] })); } catch { asts.set(f, null); } } return asts.get(f); };
const asyncExports = new Map();
function asyncNamesOf(f) {
  if (asyncExports.has(f)) return asyncExports.get(f);
  const names = new Set(); asyncExports.set(f, names);
  const a = ast(f); if (!a) return names;
  traverse(a, {
    FunctionDeclaration(p) { if (p.node.async && p.node.id) names.add(p.node.id.name); },
    VariableDeclarator(p) { const i = p.node.init; if (i && (i.type === 'ArrowFunctionExpression' || i.type === 'FunctionExpression') && i.async && p.node.id.type === 'Identifier') names.add(p.node.id.name); },
  });
  return names;
}

const rootCallee = (n) => { while (n) { if (n.type === 'CallExpression') n = n.callee; else if (n.type === 'MemberExpression' || n.type === 'OptionalMemberExpression') n = n.object; else if (n.type === 'OptionalCallExpression') n = n.callee; else break; } return n; };
const chainHasFrom = (n) => { let s = false; let x = n; while (x) { if ((x.type === 'MemberExpression' || x.type === 'OptionalMemberExpression') && x.property.name === 'from') s = true; if ((x.type === 'MemberExpression' || x.type === 'OptionalMemberExpression') && x.property.name === 'rpc') s = true; x = x.callee || x.object; } return s; };

const out = [], voids = [];
for (const f of files) {
  const a = ast(f); if (!a) { console.log('unparsed', f); continue; }
  const local = asyncNamesOf(f);
  const imported = new Map();
  for (const st of a.program.body) {
    if (st.type !== 'ImportDeclaration' || !st.source.value.startsWith('.')) continue;
    let target = resolve(dirname(f), st.source.value); if (!existsSync(target) && existsSync(target + '.js')) target += '.js';
    if (!existsSync(target)) continue;
    const names = asyncNamesOf(target);
    for (const s of st.specifiers) if (s.type === 'ImportSpecifier' && names.has(s.imported.name)) imported.set(s.local.name, s.imported.name);
  }
  const rel = f.replace(ROOT, '');
  const promiseLike = (e) => {
    if (!e || (e.type !== 'CallExpression' && e.type !== 'OptionalCallExpression')) return null;
    const c = e.callee;
    if (c.type === 'MemberExpression' && ['then', 'catch', 'finally'].includes(c.property.name)) return 'then-chain';
    const r = rootCallee(e);
    if (r?.type === 'Identifier' && r.name === 'fetch' && c.type === 'Identifier') return 'fetch';
    if (chainHasFrom(e)) return 'supabase chain';
    if (c.type === 'Identifier' && local.has(c.name)) return `async ${c.name}`;
    if (c.type === 'Identifier' && imported.has(c.name)) return `async import ${c.name}`;
    return null;
  };
  traverse(a, {
    ExpressionStatement(p) {
      let e = p.node.expression;
      if (e.type === 'UnaryExpression' && e.operator === 'void') { const k = promiseLike(e.argument); if (k) voids.push(`${rel}:${e.loc.start.line}  ${k}`); return; }
      const k = promiseLike(e);
      if (!k) return;
      // inside a function that is not async and not on the request path is still a drop; report all
      out.push(`${rel}:${e.loc.start.line}  ${k}`);
    },
  });
}
const unparsed = files.filter((f) => !ast(f));
if (unparsed.length) { console.error('[check-server-awaits] could not parse: ' + unparsed.join(', ')); process.exit(1); }
const bad = [...out, ...voids.map((v) => v + ' (void)')];
if (bad.length) {
  console.error(`[check-server-awaits] ${bad.length} promise(s) started on the server and not waited for. An edge function is frozen when it returns, so each is cut off:`);
  for (const x of bad) console.error('  ' + x);
  console.error('Await it, or return it.');
  process.exit(1);
}
console.log(`[check-server-awaits] ${files.length} server files: every fetch, database chain, .then chain and same-file or imported async call is awaited or returned.`);
