/**
 * SWEEP: arithmetic the APP does on a figure the server sent.
 *
 * "The app never scores anything. Results come from /api/results already
 * computed. Two scorers drifting apart is how this product starts lying to
 * people." That promise has one gate, check-budget-mirror, covering the one
 * place the arithmetic is deliberately repeated.
 *
 * The property measured: every binary arithmetic expression in app source
 * where an operand is a member expression naming a RESULT figure (a score, an
 * alignment, a gap, a percentage). Reported with its line, because the honest
 * output here is a short list a person reads rather than a verdict: dividing
 * a score to size a bar is layout and is fine, while adding two scores is the
 * app scoring.
 *
 * Layout maths is excluded by name (width, height, padding, fontSize, insets,
 * an index) because those are arithmetic on the PHONE's numbers, not on the
 * server's. The exclusion list is printed so it can be argued with.
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

const files = execSync("git ls-files 'attune-app/src/**/*.ts' 'attune-app/src/**/*.tsx'", { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);

/** A figure the server computes. */
/* Narrowed after the first run. `value` matched a Reanimated shared value in
   a card's entrance transform, and `total` matched a progress bar counting
   what the person has typed so far: both are the phone's own numbers wearing
   a figure's name. Generic words are out; what is left is only ever a figure
   this product computes on the server. */
const FIGURE = /^(score|scores|alignment|aligned|gap|gaps|distance|percent|percentage|pct|rating|coupleType|band|weight|weighted|dimScore|selfScore|partnerScore|mine|theirs|delta|diff)$/i;
/** The phone's own numbers. */
const LAYOUT = /^(width|height|top|bottom|left|right|x|y|size|fontSize|lineHeight|padding|paddingTop|paddingBottom|margin|marginTop|marginBottom|radius|offset|opacity|index|i|length|duration|scale|insets|window|screen|count|page|cols|columns|rows|gap_|spacing)$/i;

const found = [];
let exprs = 0;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parse(src, { sourceType: 'module', plugins: ['jsx', 'typescript', 'optionalChaining', 'nullishCoalescingOperator', 'classProperties'] });
  } catch (e) { console.log(`  (could not parse ${file}: ${e.message})`); continue; }

  traverse(ast, {
    BinaryExpression(path) {
      if (!['+', '-', '*', '/', '%'].includes(path.node.operator)) return;
      exprs++;
      for (const side of [path.node.left, path.node.right]) {
        const name = propName(side);
        if (!name) continue;
        if (LAYOUT.test(name)) continue;
        if (!FIGURE.test(name)) continue;
        /* Where does it come from? Only interesting if the root is a payload
           object rather than a local accumulator. */
        const root = rootName(side);
        found.push({
          file, line: path.node.loc.start.line, op: path.node.operator, name, root,
          text: src.slice(path.node.start, path.node.end).replace(/\s+/g, ' ').slice(0, 76),
        });
        break;
      }
    },
  });
}

function propName(n) {
  if (!n) return null;
  if (n.type === 'MemberExpression' || n.type === 'OptionalMemberExpression') {
    return n.property && (n.property.name || n.property.value) || null;
  }
  return null;
}
function rootName(n) {
  let cur = n;
  while (cur && (cur.type === 'MemberExpression' || cur.type === 'OptionalMemberExpression')) cur = cur.object;
  return cur && cur.type === 'Identifier' ? cur.name : '?';
}

console.log(`[sweep-app-arithmetic] ${files.length} app files, ${exprs} arithmetic expressions.`);
console.log(`  excluded by name as the phone's own numbers: ${String(LAYOUT).slice(2, -3).replace(/\|/g, ', ')}`);
console.log('');
if (!found.length) {
  console.log('  nothing: no arithmetic in the app touches a figure the server computes.');
} else {
  for (const f of found) {
    console.log(`  ${f.file}:${f.line}  [${f.root}.${f.name}]  ${f.text}`);
  }
  console.log(`\n  ${found.length} to read.`);
}
