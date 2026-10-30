#!/usr/bin/env node
/**
 * check-jsx-comment-text: no code comment is drawn on a page as text.
 *
 * Inside JSX, `/* ... *\/` and `// ...` are only comments inside braces.
 * Written between two elements without them, they are text, and the browser
 * prints them. An accessibility pass put one above the demographic questions
 * on both sign-up forms in src/App.jsx (d2aa9b66), so every new account and
 * every invited partner saw "/* The visible label is right above this..."
 * five times on the page that makes their account. The build is green on it
 * and nothing errors: it is valid JSX that says something else.
 *
 * Parses every .jsx and .tsx in the website and the app with Babel and fails
 * on a JSX text node holding comment syntax. The AST is what tells a comment
 * in braces (an expression container, fine) from one that is text.
 *
 * Planted: the leak put back on one form fails it, and so does a `//` line
 * between two elements.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';

const ROOT = new URL('..', import.meta.url).pathname;
const require = createRequire(`${ROOT}package.json`);
const { parse } = require('@babel/parser');

// Both surfaces, recursively: a walk that does not recurse is a gate that
// looked at one folder.
const DIRS = ['src', 'attune-app/src'];
const files = [];
const walk = (d) => {
  for (const f of readdirSync(`${ROOT}${d}`)) {
    const p = `${d}/${f}`;
    if (statSync(`${ROOT}${p}`).isDirectory()) { if (!/node_modules/.test(p)) walk(p); }
    else if (/\.(jsx|tsx)$/.test(f)) files.push(p);
  }
};
DIRS.forEach(walk);

if (files.length < 10 || !files.includes('src/App.jsx')) {
  console.error(`[check-jsx-comment-text] found ${files.length} files and ${files.includes('src/App.jsx') ? '' : 'not '}src/App.jsx. Refusing to pass: a gate that has lost its subject must never report success.`);
  process.exit(1);
}

const fails = [];
let texts = 0;
for (const f of files) {
  const src = readFileSync(`${ROOT}${f}`, 'utf8');
  const ast = parse(src, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'JSXText') {
      texts++;
      if (/\/\*|\*\/|^\s*\/\/\s/m.test(node.value)) {
        fails.push(`${f}:${node.loc.start.line} draws "${node.value.trim().replace(/\s+/g, ' ').slice(0, 80)}" as text. Put the comment in braces: {/* ... */}.`);
      }
    }
    for (const k in node) {
      if (k === 'loc' || k === 'leadingComments' || k === 'trailingComments') continue;
      const v = node[k];
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v === 'object') visit(v);
    }
  };
  visit(ast.program);
}

if (fails.length) {
  console.error('[check-jsx-comment-text] a code comment is drawn on a page:');
  for (const x of fails) console.error(`  - ${x}`);
  process.exit(1);
}
console.log(`[check-jsx-comment-text] ${texts} pieces of JSX text across ${files.length} files, none of them a comment.`);
