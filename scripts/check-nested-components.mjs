#!/usr/bin/env node
/**
 * No component that holds state is declared inside another component.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * A component declared in another component's body is a NEW component type on
 * every render of the parent, so React throws the subtree away and builds it
 * again rather than updating it. Everything the subtree was holding goes with
 * it: hook state, a ref, a <details> the reader has opened, a half-typed form
 * field, a scroll position.
 *
 * It has cost this product twice.
 *
 * `const Layout = ({ children }) =>` inside UnifiedResults, with two effects
 * that had no dependency array, rebuilt the Communication detail pages about
 * forty-eight times a second. A reader's click opened the Side by Side panel
 * and the next remount replaced it with a fresh shut one. Nothing errored and
 * the console was clean.
 *
 * `PronounPicker` inside App's own JSX held the pronoun somebody had just
 * chosen in `useState`, and wrote it into the hidden input the profile form
 * submits. Any re-render of App put it back to whatever the account already
 * said, in the buttons and in the value. Found by sweeping for the shape, not
 * by anybody noticing.
 *
 * ── WHAT IT FORBIDS, AND WHAT IT DOES NOT ─────────────────────────────────
 * Only the ones that hold something. Thirteen presentational components are
 * still declared inside their parents on the website: a remount costs them
 * work and loses nothing, and moving all thirteen would be a large edit to a
 * 19,000 line file for no behaviour change. If one of them ever grows a
 * `useState`, this is what says so.
 *
 * That is a deliberate line and it is where the cost is. Say it out loud
 * rather than leaving the next person to read "no nested components" into a
 * check that does not mean it.
 *
 * ── WHY IT PARSES RATHER THAN GREPS ───────────────────────────────────────
 * Indentation says nothing about scope. This asks Babel which function body a
 * declaration is in.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { parse } from '@babel/parser';

const ROOT = new URL('..', import.meta.url).pathname;
const TREES = ['src', 'attune-app/src'];

function walk(dir, out = []) {
  for (const n of readdirSync(`${ROOT}${dir}`)) {
    if (n === 'node_modules' || n.startsWith('.')) continue;
    const rel = `${dir}/${n}`;
    if (statSync(`${ROOT}${rel}`).isDirectory()) walk(rel, out);
    else if (/\.(jsx|tsx)$/.test(n)) out.push(rel);
  }
  return out;
}

const isComponentName = (n) => typeof n === 'string' && /^[A-Z]/.test(n);

function hasJsx(node) {
  let found = false;
  (function visit(n) {
    if (found || !n || typeof n !== 'object') return;
    if (n.type === 'JSXElement' || n.type === 'JSXFragment') { found = true; return; }
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v === 'object' && v.type) visit(v);
    }
  })(node);
  return found;
}

/** What a remount would destroy. Empty means nothing. */
function holdsState(body) {
  const holds = [];
  if (/\buseState\b/.test(body)) holds.push('useState');
  if (/\buseReducer\b/.test(body)) holds.push('useReducer');
  if (/\buseRef\b/.test(body)) holds.push('useRef');
  if (/\buseEffect\b|\buseLayoutEffect\b/.test(body)) holds.push('useEffect');
  if (/<details\b/.test(body)) holds.push('an open <details>');
  if (/<input\b|<textarea\b|<select\b/.test(body)) holds.push('a form field');
  if (/scrollTop|scrollIntoView/.test(body)) holds.push('a scroll position');
  return holds;
}

const fails = [];
let scanned = 0;
let nested = 0;

for (const rel of TREES.flatMap((t) => walk(t))) {
  const src = readFileSync(ROOT + rel, 'utf8');
  let ast;
  try {
    ast = parse(src, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
    });
  } catch (e) {
    fails.push(`${rel} could not be parsed (${e.message.slice(0, 70)}), so this check says`
      + ' nothing about it. Refusing to pass quietly about a file it cannot read.');
    continue;
  }
  scanned += 1;

  (function visit(n, stack) {
    if (!n || typeof n !== 'object') return;
    let here = stack;
    let name = null;
    if (n.type === 'FunctionDeclaration' && isComponentName(n.id?.name)) name = n.id.name;
    if (n.type === 'VariableDeclarator' && isComponentName(n.id?.name)
        && (n.init?.type === 'ArrowFunctionExpression' || n.init?.type === 'FunctionExpression')) {
      name = n.id.name;
    }
    if (name) {
      const fn = n.type === 'FunctionDeclaration' ? n : n.init;
      if (hasJsx(fn)) {
        if (stack.length) {
          nested += 1;
          /* Only an element is reconciled as a type. A helper that returns
             markup and is CALLED is a function, and React never compares it. */
          const asElement = new RegExp(`<${name}[\\s/>]`).test(src);
          const holds = holdsState(src.slice(fn.start, fn.end));
          if (asElement && holds.length) {
            fails.push(`${rel}:${n.loc?.start?.line}  <${name}> is declared inside ${stack[stack.length - 1]}`
              + ` and holds ${holds.join(', ')}.\n`
              + `      Every render of ${stack[stack.length - 1]} makes a new component type, so React\n`
              + '      remounts this and throws that away. Move it to module scope and pass what\n'
              + '      it needs as props.');
          }
        }
        here = [...stack, name];
      }
    }
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach((c) => visit(c, here));
      else if (v && typeof v === 'object' && v.type) visit(v, here);
    }
  })(ast.program, []);
}

if (scanned < 20) {
  console.error(`[check-nested-components] only ${scanned} files parsed, which cannot be right.`
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

if (fails.length) {
  console.error('\n check-nested-components: a component that holds state is rebuilt on every'
    + ' render of its parent.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-nested-components] ${scanned} JSX files parsed. ${nested} components are`
  + ' declared inside another and none of them holds state, a ref, an open <details>, a form'
  + ' field or a scroll position. Presentational ones are deliberately allowed: a remount'
  + ' costs them work and loses nothing.');
