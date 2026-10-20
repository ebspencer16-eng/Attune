/* Sweep: every timer/interval/listener, and whether its effect clears it. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

const ROOTS = ['attune-app/src', 'src'];
const files = [];
function walk(d) {
  for (const e of readdirSync(d)) {
    const p = `${d}/${e}`;
    if (e === 'node_modules' || e.startsWith('.')) continue;
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?)$/.test(p)) files.push(p);
  }
}
ROOTS.forEach(walk);

const STARTERS = { setInterval: 'clearInterval', setTimeout: 'clearTimeout' };
const findings = [];
let totalStarts = 0, totalListeners = 0;

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  let ast;
  try { ast = parse(src, { sourceType: 'module', plugins: ['typescript', 'jsx'] }); }
  catch (e) { findings.push([f, 0, `PARSE FAILED: ${e.message}`]); continue; }

  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;
      const name = callee.type === 'Identifier' ? callee.name
        : callee.type === 'MemberExpression' && callee.property.type === 'Identifier' ? callee.property.name : null;
      if (!name) return;

      // Only timers started INSIDE a useEffect body are this sweep's subject:
      // a timer started in a handler is cleared by other means or is fire-once.
      const eff = path.findParent((p) => p.isCallExpression()
        && p.node.callee.type === 'Identifier' && p.node.callee.name === 'useEffect');
      if (!eff) return;

      const line = path.node.loc.start.line;

      /* A setTimeout inside `new Promise(r => setTimeout(r, ms))` is a sleep.
         It resolves on its own and there is no handle to clear, so counting it
         is counting the idiom rather than a leak. Two of this sweep's first
         three findings were this. */
      const inPromise = path.findParent((pp) => pp.isNewExpression()
        && pp.node.callee.type === 'Identifier' && pp.node.callee.name === 'Promise');
      if (inPromise) return;

      /* An effect whose arrow body IS the call returns that call's result, and
         for a subscribe-style API the result is the unsubscribe. That is the
         cleanup, written the short way. The first version of this sweep looked
         for the word `unsubscribe` in the body and reported a correct file. */
      const arrow = eff.node.arguments[0];
      const impliedReturn = arrow
        && (arrow.type === 'ArrowFunctionExpression')
        && arrow.body.type !== 'BlockStatement'
        && arrow.body.start === path.node.start;
      if (impliedReturn) return;

      if (STARTERS[name]) {
        totalStarts++;
        const body = src.slice(eff.node.start, eff.node.end);
        if (!body.includes(STARTERS[name])) findings.push([f, line, `${name} in a useEffect with no ${STARTERS[name]}`]);
      }
      if (name === 'addEventListener' || name === 'addListener') {
        totalListeners++;
        const body = src.slice(eff.node.start, eff.node.end);
        if (!/removeEventListener|\.remove\(\)|subscription|unsubscribe/.test(body)) {
          findings.push([f, line, `${name} in a useEffect with nothing removing it`]);
        }
      }
    },
  });
}

console.log(`files parsed: ${files.length}`);
console.log(`timers started inside useEffect: ${totalStarts}`);
console.log(`listeners added inside useEffect: ${totalListeners}`);
console.log(findings.length ? `\nFINDINGS (${findings.length}):` : '\nnothing: every one is cleared.');
for (const [f, l, m] of findings) console.log(`  ${f}:${l}  ${m}`);
