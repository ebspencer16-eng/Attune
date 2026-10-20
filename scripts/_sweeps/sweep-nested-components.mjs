/**
 * Sweep: a React component declared inside another component.
 *
 * ── WHY THIS ONE MATTERS ──────────────────────────────────────────────────
 * Every render of the parent makes a NEW component type, so React throws away
 * the whole subtree and builds it again rather than updating it. That is
 * survivable while renders are rare and catastrophic when they are not.
 *
 * It already cost this product a feature. `const Layout = ({ children }) =>`
 * sat inside UnifiedResults, two effects in the same component had no
 * dependency array, and between them the Communication detail pages rebuilt
 * themselves about forty-eight times a second. A reader's click opened the
 * Side by Side panel and the next remount replaced it with a fresh shut one.
 * Nothing errored and the console was clean.
 *
 * It was found once by hand and nothing has watched for it since.
 *
 * ── WHAT COUNTS ───────────────────────────────────────────────────────────
 * A capitalised function or arrow declared in the body of another capitalised
 * function, where the inner one returns JSX. Parsed rather than grepped,
 * because indentation says nothing about scope.
 *
 * ── WHAT IT DELIBERATELY DOES NOT FLAG ────────────────────────────────────
 * A render helper that returns JSX but is CALLED rather than used as an
 * element. `const row = (x) => <Row ... />` invoked as `row(x)` is a function
 * returning markup, not a component type, and React never reconciles it as
 * one. Those are reported separately and are usually fine.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { parse } from '@babel/parser';

const ROOT = new URL('../../', import.meta.url).pathname;
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

/** Does this function body contain JSX anywhere? */
function returnsJsx(node) {
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

const nested = [];
const helpers = [];
let scanned = 0;

for (const rel of walk('src').concat(walk('attune-app/src'))) {
  const src = readFileSync(ROOT + rel, 'utf8');
  let ast;
  try {
    ast = parse(src, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
    });
  } catch (e) { console.error(`  (could not parse ${rel}: ${e.message.slice(0, 60)})`); continue; }
  scanned += 1;

  /* Walk with a stack of enclosing component names. */
  (function visit(n, stack) {
    if (!n || typeof n !== 'object') return;
    let here = stack;
    let declaredName = null;

    if (n.type === 'FunctionDeclaration' && isComponentName(n.id?.name)) declaredName = n.id.name;
    if (n.type === 'VariableDeclarator' && isComponentName(n.id?.name)
        && (n.init?.type === 'ArrowFunctionExpression' || n.init?.type === 'FunctionExpression')) {
      declaredName = n.id.name;
    }

    if (declaredName) {
      const fn = n.type === 'FunctionDeclaration' ? n : n.init;
      if (returnsJsx(fn)) {
        if (stack.length) {
          const line = n.loc?.start?.line;
          /* Used as an element somewhere, or merely called? */
          const asElement = new RegExp(`<${declaredName}[\\s/>]`).test(src);
          /**
           * What a remount would actually destroy.
           *
           * A nested component is only a bug when something is lost by
           * throwing it away: hook state, a ref, a <details> a reader has
           * opened, a form field mid-typing, a scroll position. A stateless
           * presentational one remounts invisibly and costs only work.
           *
           * Read off the function's own node. A brace walk from its first
           * line gave Sidebar two lines and Entry two lines, which is this
           * file's own lesson about printing one case end to end before
           * believing a column.
           */
          const body = src.slice(fn.start, fn.end);
          const holds = [];
          if (/\buseState\b/.test(body)) holds.push('useState');
          if (/\buseReducer\b/.test(body)) holds.push('useReducer');
          if (/\buseRef\b/.test(body)) holds.push('useRef');
          if (/\buseEffect\b|\buseLayoutEffect\b/.test(body)) holds.push('useEffect');
          if (/<details\b/.test(body)) holds.push('<details>');
          if (/<input\b|<textarea\b|<select\b/.test(body)) holds.push('form field');
          if (/scrollTop|scrollIntoView/.test(body)) holds.push('scroll');
          (asElement ? nested : helpers).push({
            rel, name: declaredName, inside: stack[stack.length - 1], line,
            lines: body.split('\n').length, holds,
          });
        }
        here = [...stack, declaredName];
      }
    }

    for (const k of Object.keys(n)) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach((c) => visit(c, here));
      else if (v && typeof v === 'object' && v.type) visit(v, here);
    }
  })(ast.program, []);
}

console.log(`${scanned} JSX/TSX files parsed\n`);
console.log(`=== DECLARED INSIDE ANOTHER COMPONENT AND USED AS AN ELEMENT: ${nested.length} ===`);
console.log('Each of these remounts its whole subtree on every render of its parent.\n');
const costly = nested.filter((h) => h.holds.length);
const cheap = nested.filter((h) => !h.holds.length);
console.log(`  ${costly.length} hold something a remount destroys:\n`);
for (const h of costly) {
  console.log(`  ${h.rel}:${h.line}  <${h.name}> inside ${h.inside}  (${h.lines} lines)`);
  console.log(`      holds: ${h.holds.join(', ')}`);
}
console.log(`\n  ${cheap.length} are presentational: a remount costs work and loses nothing.\n`);
for (const h of cheap) console.log(`  ${h.rel}:${h.line}  <${h.name}> inside ${h.inside}  (${h.lines} lines)`);
console.log(`\n=== returns JSX, never used as an element: ${helpers.length} ===`);
console.log('Render helpers. Called rather than reconciled, so not the same bug.\n');
for (const h of helpers.slice(0, 15)) console.log(`  ${h.rel}:${h.line}  ${h.name} inside ${h.inside}`);
if (helpers.length > 15) console.log(`  ... and ${helpers.length - 15} more`);
