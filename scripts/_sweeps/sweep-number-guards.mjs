/**
 * SWEEP: a JSX guard whose left side is a NUMBER.
 *
 *   {items.length && <Row/>}
 *
 * When the list is empty that expression IS 0, not false. React Native then
 * tries to draw a bare 0 outside a <Text> and throws; the website prints a
 * silent "0" where the block should be. A ternary is fine, because a ternary
 * never hands its test to the renderer.
 *
 * The property measured: for every logical-AND expression in a JSX child
 * position, is the left operand something that can be 0 or ''?
 *
 * Scope: every .jsx/.tsx on all three surfaces. Parsed, not grepped, because
 * the shape is about where an expression SITS, and indentation says nothing
 * about that.
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

const files = execSync(
  "git ls-files '*.jsx' '*.tsx' | grep -v node_modules",
  { encoding: 'utf8' },
).trim().split('\n').filter(Boolean);

/** Names whose `.length` or count reads as a number rather than a flag. */
const COUNTY = /(length|size|count|total|index|idx|num|qty|^n$)/i;

const findings = [];
let guards = 0;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parse(src, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
    });
  } catch (e) {
    findings.push({ file, line: 0, why: `could not parse: ${e.message}` });
    continue;
  }

  traverse(ast, {
    LogicalExpression(path) {
      if (path.node.operator !== '&&') return;
      // Only a guard if the renderer receives it: a JSXExpressionContainer
      // sitting in a child position (not an attribute).
      const parent = path.parent;
      if (parent.type !== 'JSXExpressionContainer') return;
      if (path.parentPath.parent.type === 'JSXAttribute') return;
      guards++;

      // Walk down the left spine: `a && b && <X/>` nests to the left.
      let left = path.node.left;
      while (left.type === 'LogicalExpression' && left.operator === '&&') left = left.right;

      const risky = numberish(left, src);
      if (risky) {
        findings.push({
          file,
          line: left.loc.start.line,
          why: risky,
          text: src.slice(left.start, left.end).slice(0, 70),
        });
      }
    },
  });
}

/** Does this expression evaluate to something falsy-but-renderable? */
function numberish(n) {
  if (n.type === 'MemberExpression' || n.type === 'OptionalMemberExpression') {
    const prop = n.property && (n.property.name || n.property.value);
    if (prop && COUNTY.test(String(prop))) return `a number (.${prop})`;
    return null;
  }
  if (n.type === 'NumericLiteral') return 'a numeric literal';
  if (n.type === 'StringLiteral') return 'a string literal';
  if (n.type === 'Identifier' && COUNTY.test(n.name)) return `a name that reads as a count (${n.name})`;
  if (n.type === 'BinaryExpression' && ['-', '+', '*', '/', '%'].includes(n.operator)) {
    return `arithmetic (${n.operator})`;
  }
  // A call could return anything; only flag the ones that obviously count.
  if (n.type === 'CallExpression') {
    const c = n.callee;
    const prop = c && c.property && c.property.name;
    if (prop && /^(indexOf|search|lastIndexOf)$/.test(prop)) return `${prop}() returns -1 or 0`;
  }
  return null;
}

console.log(`[sweep-number-guards] ${files.length} files, ${guards} JSX && guards.`);
if (!findings.length) {
  console.log('  nothing: every guard tests something that is a flag, not a count.');
} else {
  for (const f of findings) {
    console.log(`  ${f.file}:${f.line}  ${f.why}`);
    if (f.text) console.log(`      ${f.text}`);
  }
  console.log(`\n  ${findings.length} to look at.`);
}
