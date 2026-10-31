#!/usr/bin/env node
/**
 * sweep-unguarded-lookups: a value looked up by key in a fixed table, then
 * read from as if the lookup always finds something.
 *
 * The shape of the A237 cart crash: `const cfg = CART_PKGS[item.pkg]` and then
 * `cfg.supportsPhysical`. Every key the code had ever been handed was in the
 * table, until a line with no package arrived; then every render threw.
 *
 * Method. Babel over src/, api/ (recursively), public/*.js and every inline
 * script in public/. A "table" is a name bound to an object literal. Reported:
 *
 *   A. `TABLE[expr].prop`, not optional, where expr is not a literal;
 *   B. `const x = TABLE[expr]` with no `||` / `??` fallback, followed in the
 *      same function by a non-optional `x.prop`, when that function never
 *      tests x (`!x`, `x &&`, `x ?`, `if (x)`, `x == null`, `x ||`).
 *
 * Each finding is a lead, not a verdict: a key that is validated before the
 * lookup is safe and this cannot see that. It reports what it could not
 * parse.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';

const ROOT = new URL('../..', import.meta.url).pathname;
const require = createRequire(`${ROOT}package.json`);
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const files = [];
const walk = (d, test) => {
  for (const f of readdirSync(`${ROOT}${d}`)) {
    const p = `${d}/${f}`;
    if (f === 'node_modules' || f.startsWith('.')) continue;
    if (statSync(`${ROOT}${p}`).isDirectory()) walk(p, test);
    else if (test(f)) files.push(p);
  }
};
walk('src', (f) => /\.(jsx?|mjs)$/.test(f));
walk('api', (f) => /\.(js|mjs)$/.test(f));
for (const f of readdirSync(`${ROOT}public`)) if (f.endsWith('.js') && !f.startsWith('_')) files.push(`public/${f}`);

const units = [];
for (const f of files) units.push({ file: f, code: readFileSync(`${ROOT}${f}`, 'utf8'), line0: 1, module: true });
const htmls = [];
walk('public', (f) => f.endsWith('.html'));
for (const f of files.splice(0).filter((x) => x.endsWith('.html'))) htmls.push(f);
for (const f of htmls) {
  const html = readFileSync(`${ROOT}${f}`, 'utf8');
  const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    if (/\bsrc=|type=["']?(application\/(ld\+)?json|text\/template)/.test(m[1] || '')) continue;
    if (!m[2].trim()) continue;
    units.push({ file: f, code: m[2], line0: html.slice(0, m.index).split('\n').length, module: /module/.test(m[1] || '') });
  }
}

let parsed = 0, unparsed = 0, findings = 0;
const out = [];
for (const u of units) {
  let ast;
  try {
    ast = parse(u.code, { sourceType: u.module ? 'module' : 'script', errorRecovery: true, plugins: ['jsx'] });
  } catch (e) { unparsed++; console.log(`UNPARSED ${u.file}:${u.line0} ${e.message}`); continue; }
  parsed++;
  const line = (n) => u.line0 + (n.loc?.start.line || 1) - 1;
  const isTable = (path, name) => {
    const b = path.scope.getBinding(name);
    if (!b || b.kind === 'param') return false;
    const init = b.path.node.init;
    return !!init && init.type === 'ObjectExpression' && init.properties.length > 1 && b.constantViolations.length === 0;
  };
  const lookup = (path) => path.isMemberExpression() && path.node.computed && path.get('object').isIdentifier()
    && !['NumericLiteral', 'StringLiteral'].includes(path.node.property.type)
    && isTable(path, path.node.object.name);

  traverse(ast, {
    MemberExpression(path) {
      // A: TABLE[expr].prop
      if (path.node.optional || path.node.computed) return;
      const obj = path.get('object');
      if (!lookup(obj)) return;
      const parent = path.parentPath;
      // `TABLE[k].x = ...` is a write and creates nothing; still a crash. Keep.
      findings++;
      out.push(`${u.file}:${line(path.node)} A  ${u.code.slice(path.node.start, path.node.end).slice(0, 90)}`);
    },
    VariableDeclarator(path) {
      // B: const x = TABLE[expr]; ... x.prop
      const init = path.get('init');
      if (!path.get('id').isIdentifier() || !init.node || !lookup(init)) return;
      const name = path.node.id.name;
      const b = path.scope.getBinding(name);
      if (!b) return;
      const fn = path.getFunctionParent() || path.scope.getProgramParent().path;
      const body = u.code.slice(fn.node.start, fn.node.end);
      const n = name.replace(/\$/g, '\\$');
      const guard = new RegExp(`!\\s*${n}\\b|\\b${n}\\s*(&&|\\?[^.?]|\\|\\||==\\s*null|===\\s*undefined)|if\\s*\\(\\s*${n}\\s*\\)|\\(\\s*${n}\\s*\\?`);
      if (guard.test(body)) return;
      const reads = b.referencePaths.filter((r) => r.parentPath.isMemberExpression() && r.parentPath.node.object === r.node && !r.parentPath.node.optional);
      if (!reads.length) return;
      findings++;
      out.push(`${u.file}:${line(path.node)} B  ${u.code.slice(path.node.start, path.node.end).slice(0, 70)}  -> read at ${reads.map((r) => line(r.node)).slice(0, 4).join(',')}`);
    },
  });
}
console.log(out.join('\n'));
console.log(`\n${parsed} scripts parsed (${unparsed} could not be); ${findings} leads.`);
