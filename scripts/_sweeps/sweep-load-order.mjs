#!/usr/bin/env node
/**
 * sweep-load-order: a page script that reads a `let`, `const` or `class` before
 * the line that creates it, while the page is loading.
 *
 * The shape that stopped checkout in the A211 branch: `validateForm` ran at
 * load, through `renderItemsStep`, and read `let _showMissing`, declared two
 * hundred lines further down. ReferenceError, and nothing after it in the
 * script ever ran: no card form, no order button. Valid JavaScript, a green
 * build, and only a page with a cart in it ever reached the line.
 *
 * Method. Every inline <script> in public/ (recursively), parsed with Babel,
 * scopes resolved. Walk the top-level statements in order. A statement that is
 * not a declaration runs now, and so does every top-level function it calls,
 * transitively. Inside what runs, any reference to a top-level let/const/class
 * whose declaration has not been reached yet is reported, with the chain of
 * calls that got there.
 *
 * What it treats as NOT running at load: a function handed to
 * addEventListener, setTimeout, setInterval, requestAnimationFrame, a
 * promise's then/catch/finally, or assigned to an `on*` property. Everything
 * else nested is assumed to run, which over-reports (a callback stored for
 * later) rather than under-reports. Each finding is a lead to read, not a
 * verdict. Module scripts are skipped: they defer, and import order is a
 * different question.
 *
 * First run: three leads, one false. `window.svTsToggle = function` in
 * admin.html was counted as running at load; a function stored on a property
 * or in a const runs when called, and the call graph follows it from there.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';

const ROOT = new URL('../..', import.meta.url).pathname;
const require = createRequire(`${ROOT}package.json`);
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const pages = [];
const walk = (d) => {
  for (const f of readdirSync(`${ROOT}${d}`)) {
    const p = `${d}/${f}`;
    if (statSync(`${ROOT}${p}`).isDirectory()) walk(p);
    else if (f.endsWith('.html')) pages.push(p);
  }
};
walk('public');

const LATER_CALLS = new Set(['addEventListener', 'setTimeout', 'setInterval', 'requestAnimationFrame', 'then', 'catch', 'finally', 'requestIdleCallback', 'observe']);
let scripts = 0, findings = 0;

for (const page of pages) {
  const html = readFileSync(`${ROOT}${page}`, 'utf8');
  const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1] || '';
    if (/\bsrc=/.test(attrs) || /type=["']?(module|application\/(ld\+)?json|text\/template)/.test(attrs)) continue;
    const code = m[2];
    if (!code.trim()) continue;
    const line0 = html.slice(0, m.index).split('\n').length;
    let ast;
    try { ast = parse(code, { sourceType: 'script', errorRecovery: true }); } catch (e) { console.log(`PARSE ${page}:${line0} ${e.message}`); continue; }
    scripts++;

    const fns = new Map();          // top-level function name -> path
    const tdz = new Map();          // top-level let/const/class name -> declaration start
    let program;
    traverse(ast, {
      Program(p) {
        program = p;
        for (const st of p.get('body')) {
          if (st.isFunctionDeclaration() && st.node.id) fns.set(st.node.id.name, st);
          // `const f = () => ...` is called by name like a declaration is.
          if (st.isVariableDeclaration()) {
            st.get('declarations').forEach((d) => {
              const init = d.get('init');
              if (d.node.id.type === 'Identifier' && (init.isArrowFunctionExpression() || init.isFunctionExpression())) fns.set(d.node.id.name, init);
            });
          }
          if (st.isVariableDeclaration() && st.node.kind !== 'var') {
            for (const d of st.node.declarations) for (const n of Object.keys(require('@babel/types').getBindingIdentifiers(d.id))) tdz.set(n, st.node.start);
          }
          if (st.isClassDeclaration() && st.node.id) tdz.set(st.node.id.name, st.node.start);
        }
      },
    });
    if (!tdz.size) continue;

    const deferred = (path) => {
      // Is this function handed to something that calls it later?
      const parent = path.parentPath;
      if (parent?.isCallExpression() && parent.node.arguments.includes(path.node)) {
        const callee = parent.node.callee;
        const name = callee.type === 'MemberExpression' ? callee.property?.name : callee.name;
        if (LATER_CALLS.has(name)) return true;
      }
      // Stored for later: `window.x = function`, `el.onclick = ...`, `const f = () =>`.
      // Its body runs when something calls it, which the call graph follows.
      if (parent?.isAssignmentExpression() && parent.node.right === path.node) return true;
      if (parent?.isVariableDeclarator() && parent.node.init === path.node) return true;
      if (parent?.isObjectProperty() || parent?.isObjectMethod()) return true;
      return false;
    };

    const reported = new Set();
    // What a piece of code does when it runs now, before position `at`.
    const run = (path, at, chain, seen) => {
      path.traverse({
        Function(fp) { if (fp !== path && deferred(fp)) fp.skip(); },
        Identifier(ip) {
          const name = ip.node.name;
          if (!ip.isReferencedIdentifier()) return;
          const binding = ip.scope.getBinding(name);
          if (!binding || binding.scope !== program.scope) return;
          if (tdz.has(name) && tdz.get(name) > at) {
            const key = `${name}@${chain.join('>')}`;
            if (!reported.has(key)) {
              reported.add(key); findings++;
              const declLine = line0 + code.slice(0, tdz.get(name)).split('\n').length - 1;
              console.log(`${page}: \`${name}\` (declared at line ${declLine}) read at load via ${chain.join(' -> ')}`);
            }
          }
          if (fns.has(name) && ip.parentPath.isCallExpression() && ip.parentPath.node.callee === ip.node && !seen.has(name)) {
            seen.add(name);
            run(fns.get(name), at, [...chain, name + '()'], seen);
          }
        },
      });
    };

    for (const st of program.get('body')) {
      if (st.isFunctionDeclaration()) continue;
      const at = st.node.start;
      const line = line0 + code.slice(0, at).split('\n').length - 1;
      // A declaration's initialiser runs now too.
      run(st, at, [`line ${line}`], new Set());
    }
  }
}
console.log(`\n${scripts} inline scripts across ${pages.length} pages; ${findings} reads of a name before its declaration, at load.`);
