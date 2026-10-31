#!/usr/bin/env node
/**
 * sweep-unset-fields: a field read from an object that never has it.
 *
 * The A234 shape. The website's dashboard builds `const pkg = { ...base,
 * hasChecklist, ... }` and AdditionalExercises waited on `pkg.key`. Nothing
 * ever set `key`, so the tiles waited forever and never drew, for anybody,
 * from the day the guard went in. Undefined reads as false and nothing errors.
 *
 * Method. Babel over src/, api/ and public/ scripts. For every `const NAME =`
 * object literal whose shape is knowable, its keys: written properties, plus
 * the keys of anything spread into it when that is itself a knowable literal
 * (a name bound to one, or `TABLE[expr]` / `TABLE[a] || TABLE.b` where every
 * value of TABLE is a literal). A literal with a spread that cannot be
 * resolved is skipped and counted. Then every non-computed `NAME.prop` read
 * (and `NAME?.prop`) where prop is not a key, and where nothing assigns
 * `NAME.prop = ...` anywhere in the file, is reported.
 *
 * Also: a prop passed to a component as `pkg={pkg}` is followed one level,
 * into the component's own `pkg.prop` reads, because that is where A234 was.
 *
 * Leads, not verdicts. `.length`, `.map` and other built-in members of an
 * object are not reported.
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
const units = files.map((f) => ({ file: f, code: readFileSync(process.env.SWAP && f === 'src/App.jsx' ? process.env.SWAP : `${ROOT}${f}`, 'utf8'), line0: 1 }));
const html = [];
walk('public', (f) => f.endsWith('.html') || (f.endsWith('.js') && !f.startsWith('_')));
for (const f of files.splice(units.length)) {
  const src = readFileSync(`${ROOT}${f}`, 'utf8');
  if (f.endsWith('.js')) { units.push({ file: f, code: src, line0: 1 }); continue; }
  const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(src))) {
    if (/\bsrc=|type=["']?(application\/(ld\+)?json|text\/template)/.test(m[1] || '') || !m[2].trim()) continue;
    units.push({ file: f, code: m[2], line0: src.slice(0, m.index).split('\n').length });
  }
}

const BUILTIN = new Set(['length', 'map', 'filter', 'forEach', 'find', 'some', 'every', 'reduce', 'includes', 'indexOf', 'join', 'slice', 'push', 'concat', 'keys', 'toString', 'valueOf', 'hasOwnProperty', 'then', 'constructor']);
let objects = 0, skipped = 0, findings = 0;
const out = [];

for (const u of units) {
  let ast;
  try { ast = parse(u.code, { sourceType: 'unambiguous', errorRecovery: true, plugins: ['jsx'] }); }
  catch (e) { console.log(`UNPARSED ${u.file}: ${e.message}`); continue; }
  const line = (n) => u.line0 + (n.loc?.start.line || 1) - 1;

  // Names assigned a field anywhere in this unit: NAME.prop = ...
  const assigned = new Set();
  traverse(ast, {
    AssignmentExpression(p) {
      const l = p.node.left;
      if (l.type === 'MemberExpression' && !l.computed && l.object.type === 'Identifier') assigned.add(`${l.object.name}.${l.property.name}`);
    },
  });

  /** The keys of an expression's value when it is a knowable literal; null otherwise. */
  const keysOf = (path, depth = 0) => {
    if (!path?.node || depth > 12) return null;
    const n = path.node;
    if (n.type === 'ObjectExpression') {
      const keys = new Set();
      for (const pp of path.get('properties')) {
        const pn = pp.node;
        if (pn.type === 'SpreadElement') {
          const inner = keysOf(pp.get('argument'), depth + 1);
          if (!inner) return null;
          inner.forEach((k) => keys.add(k));
        } else if (pn.computed) return null;
        else keys.add(pn.key.name ?? pn.key.value);
      }
      return keys;
    }
    if (n.type === 'Identifier') {
      const b = path.scope.getBinding(n.name);
      if (!b || b.constantViolations.length || !b.path.isVariableDeclarator()) return null;
      return keysOf(b.path.get('init'), depth + 1);
    }
    if (n.type === 'LogicalExpression' && (n.operator === '||' || n.operator === '??')) {
      const a = keysOf(path.get('left'), depth + 1), c = keysOf(path.get('right'), depth + 1);
      return a && c ? new Set([...a].filter((k) => c.has(k))) : null;
    }
    if (n.type === 'MemberExpression' && n.object.type === 'Identifier') {
      // TABLE[expr] or TABLE.key: the keys every value of TABLE shares.
      const t = keysOf(path.get('object'), depth + 1);
      if (!t) return null;
      const b = path.scope.getBinding(n.object.name);
      const init = b?.path.get('init');
      if (!init?.isObjectExpression()) return null;
      let common = null;
      for (const pp of init.get('properties')) {
        if (pp.node.type !== 'ObjectProperty') return null;
        const k = keysOf(pp.get('value'), depth + 1);
        if (!k) return null;
        common = common ? new Set([...common].filter((x) => k.has(x))) : k;
      }
      return common;
    }
    return null;
  };

  const report = (name, keys, refs, where) => {
    const seen = new Set();
    for (const r of refs) {
      const m = r.parentPath;
      if (!m.isMemberExpression() && !m.isOptionalMemberExpression()) continue;
      if (m.node.object !== r.node || m.node.computed) continue;
      const prop = m.node.property.name;
      if (!prop || keys.has(prop) || BUILTIN.has(prop) || assigned.has(`${name}.${prop}`)) continue;
      if (m.parentPath.isAssignmentExpression() && m.parentPath.node.left === m.node) continue;
      if (seen.has(prop)) continue;
      seen.add(prop); findings++;
      out.push(`${u.file}:${line(m.node)}  ${name}.${prop}  (${where}; keys: ${[...keys].slice(0, 12).join(', ')}${keys.size > 12 ? ', ...' : ''})`);
    }
  };

  traverse(ast, {
    VariableDeclarator(path) {
      if (!path.get('id').isIdentifier() || !path.get('init').isObjectExpression()) return;
      objects++;
      const keys = keysOf(path.get('init'));
      if (process.env.DEBUG && path.node.id.name === process.env.DEBUG) console.log('DEBUG', u.file, line(path.node), keys && [...keys]);
      if (!keys) { skipped++; return; }
      const name = path.node.id.name;
      const b = path.scope.getBinding(name);
      if (!b || b.constantViolations.length) return;
      report(name, keys, b.referencePaths, 'literal');
      // One level into components handed it as a prop of the same name.
      for (const r of b.referencePaths) {
        const attr = r.parentPath?.parentPath;
        if (!attr?.isJSXAttribute()) continue;
        const prop = attr.node.name.name;
        const el = attr.parentPath.node.name;
        if (el?.type !== 'JSXIdentifier') continue;
        const cb = attr.scope.getBinding(el.name);
        const fn = cb?.path;
        if (!fn || !(fn.isFunctionDeclaration() || fn.isVariableDeclarator())) continue;
        const f = fn.isVariableDeclarator() ? fn.get('init') : fn;
        const param = f.get?.('params')?.[0];
        if (!param?.isObjectPattern()) continue;
        for (const pp of param.get('properties')) {
          if (pp.node.key?.name !== prop || !pp.get('value').isIdentifier()) continue;
          const inner = pp.scope.getBinding(pp.node.value.name);
          if (inner) report(`${el.name}(${prop})`, keys, inner.referencePaths, `prop from line ${line(path.node)}`);
        }
      }
    },
  });
}
console.log(out.join('\n'));
console.log(`\n${objects} object literals; ${skipped} skipped for a spread or key that could not be resolved; ${findings} leads.`);
