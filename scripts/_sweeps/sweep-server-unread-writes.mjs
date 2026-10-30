#!/usr/bin/env node
/**
 * A database write on the server whose answer nobody reads.
 *
 * Two spellings: a supabase-js chain ending in insert/update/upsert/delete
 * whose result is not bound (or is bound without `error`), and a fetch to
 * /rest/v1/ with a write method whose response is never asked `.ok` or
 * `.status`. Each hit is read by a person: a best-effort write (a log, a
 * stamp) is fine; one followed by `ok: true` to a caller is the bug.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from '@babel/parser';
import t from '@babel/traverse'; const traverse = t.default || t;
const ROOT = new URL('../../', import.meta.url).pathname;
const files = []; const walk = (d) => { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) { if (e !== 'node_modules') walk(p); } else if (/\.m?js$/.test(e)) files.push(p); } };
walk(join(ROOT, 'api'));
const out = []; let n = 0;
const methodOf = (call) => { const o = call.arguments[1]; if (o?.type !== 'ObjectExpression') return null; const m = o.properties.find((p) => p.key?.name === 'method'); return m?.value?.value || null; };
for (const f of files) {
  const src = readFileSync(f, 'utf8'); const rel = f.replace(ROOT, '');
  const ast = parse(src, { sourceType: 'module' });
  traverse(ast, {
    CallExpression(p) {
      const c = p.node.callee;
      // supabase-js write
      if (c.type === 'MemberExpression' && ['insert', 'update', 'upsert', 'delete'].includes(c.property.name)) {
        let x = c.object, from = false; while (x) { if (x.type === 'CallExpression' && x.callee.type === 'MemberExpression' && x.callee.property.name === 'from') { from = true; break; } x = x.callee?.object || x.object; }
        if (!from) return;
        // climb to the whole chain
        let top = p; while (top.parentPath && (top.parentPath.isMemberExpression() || (top.parentPath.isCallExpression() && top.parentPath.node.callee === top.node))) top = top.parentPath;
        n++;
        let host = top.parentPath; if (host.isAwaitExpression()) host = host.parentPath;
        if (host.isVariableDeclarator()) {
          const id = host.node.id;
          if (id.type === 'ObjectPattern' && id.properties.some((q) => q.key?.name === 'error')) return;
          if (id.type === 'Identifier') { const b = host.scope.getBinding(id.name); if (b && b.referencePaths.some((r) => r.parentPath.isMemberExpression() && ['error', 'status'].includes(r.parent.property?.name))) return; }
        }
        if (host.isReturnStatement() || host.isArrayExpression() || host.isCallExpression()) return; // handed on
        out.push(`${rel}:${p.node.loc.start.line}  .${c.property.name}() result ${host.type}`);
      }
      // REST write
      if (c.type === 'Identifier' && c.name === 'fetch') {
        const m = methodOf(p.node); if (!m || m === 'GET') return;
        const u = src.slice(p.node.arguments[0].start, p.node.arguments[0].end);
        if (!/rest\/v1/.test(u) && !/Url|URL|url/.test(u)) return;
        if (!/rest\/v1/.test(u)) return;
        n++;
        let host = p.parentPath; if (host.isAwaitExpression()) host = host.parentPath;
        if (host.isVariableDeclarator() && host.node.id.type === 'Identifier') {
          const b = host.scope.getBinding(host.node.id.name);
          if (b && b.referencePaths.some((r) => r.parentPath.isMemberExpression() && ['ok', 'status'].includes(r.parent.property?.name))) return;
          if (b && b.referencePaths.some((r) => r.parentPath.isReturnStatement() || r.parentPath.isCallExpression())) return;
        }
        if (host.isReturnStatement()) return;
        if (host.isMemberExpression() && host.node.property.name === 'then') return;
        out.push(`${rel}:${p.node.loc.start.line}  fetch ${m} ${u.slice(0, 50).replace(/\s+/g, ' ')} -> ${host.type}`);
      }
    },
  });
}
console.log(`${n} server writes; ${out.length} whose answer is not read:`);
for (const x of out) console.log('  ' + x);
