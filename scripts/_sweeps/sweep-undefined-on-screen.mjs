/* Sweep: a value interpolated into user-visible text that can be undefined.
   `${a.b.c}` renders the string "undefined" rather than throwing, so a missing
   payload field becomes a word on the screen instead of an error anyone sees. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

const files = [];
function walk(d) {
  for (const e of readdirSync(d)) {
    const p = `${d}/${e}`;
    if (e === 'node_modules' || e.startsWith('.')) continue;
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?)$/.test(p)) files.push(p);
  }
}
['attune-app/src', 'src'].forEach(walk);

const findings = [];
let templates = 0;

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  let ast;
  try { ast = parse(src, { sourceType: 'module', plugins: ['typescript', 'jsx'] }); }
  catch { continue; }

  traverse(ast, {
    TemplateLiteral(path) {
      // Only templates that are rendered: inside JSX, or assigned to something
      // a surface prints. A template in a fetch URL is a different question.
      const inJsx = path.findParent((p) => p.isJSXExpressionContainer());
      if (!inJsx) return;
      templates++;
      for (const ex of path.node.expressions) {
        // A chain two deep or more, with no optional chaining and no fallback,
        // is the shape that prints "undefined".
        if (ex.type !== 'MemberExpression') continue;
        let depth = 0, n = ex, optional = false;
        while (n && (n.type === 'MemberExpression' || n.type === 'OptionalMemberExpression')) {
          if (n.type === 'OptionalMemberExpression' || n.optional) optional = true;
          n = n.object; depth++;
        }
        if (depth >= 2 && !optional) {
          const line = ex.loc.start.line;
          findings.push([f, line, src.split('\n')[line - 1].trim().slice(0, 90)]);
        }
      }
    },
  });
}

console.log(`rendered templates examined: ${templates}`);
console.log(findings.length ? `\nFINDINGS (${findings.length}):` : '\nnothing.');
for (const [f, l, t] of findings) console.log(`  ${f}:${l}\n      ${t}`);
