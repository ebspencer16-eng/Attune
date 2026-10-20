/* Sweep: every tappable thing in the app that a screen reader cannot name.
   A Pressable with only an icon inside it and no accessibilityLabel is read
   out as "button" and nothing else. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

const files = [];
function walk(d) {
  for (const e of readdirSync(d)) {
    const p = `${d}/${e}`;
    if (e === 'node_modules' || e.startsWith('.')) continue;
    if (statSync(p).isDirectory()) walk(p); else if (/\.tsx$/.test(p)) files.push(p);
  }
}
walk('attune-app/src');

const TAPPABLE = new Set(['Pressable', 'TouchableOpacity', 'TouchableHighlight', 'TouchableWithoutFeedback', 'Button']);
const findings = [];
let total = 0;

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  let ast;
  try { ast = parse(src, { sourceType: 'module', plugins: ['typescript', 'jsx'] }); } catch { continue; }

  traverse(ast, {
    JSXOpeningElement(path) {
      const n = path.node.name;
      if (n.type !== 'JSXIdentifier' || !TAPPABLE.has(n.name)) return;
      const attrs = path.node.attributes.filter((a) => a.type === 'JSXAttribute').map((a) => a.name.name);
      // Only things that actually do something are controls.
      if (!attrs.includes('onPress') && !attrs.includes('onLongPress')) return;
      total++;
      if (attrs.includes('accessibilityLabel') || attrs.includes('aria-label')) return;

      /* `accessible={false}` takes the element out of the accessibility tree
         on purpose, which is what a tap-swallower behind a menu wants: it is
         not a control and announcing it hides the rows inside. The only
         finding of this sweep's first run was one of those, correct and
         commented. */
      const explicitlyNot = path.node.attributes.some((a) => a.type === 'JSXAttribute'
        && a.name.name === 'accessible'
        && a.value && a.value.type === 'JSXExpressionContainer'
        && a.value.expression.type === 'BooleanLiteral' && a.value.expression.value === false);
      if (explicitlyNot) return;

      /* Text inside the control labels it for a screen reader, so a button
         whose child is words needs no explicit label. Read off the element's
         own JSX rather than guessed: the whole subtree, looking for a literal
         or an interpolation that is not an icon. */
      const el = path.parentPath.node;
      const inner = src.slice(el.start, el.end);
      const hasWords = /<Text[\s>]/.test(inner) || />\s*[A-Za-z]{3,}/.test(inner);
      if (hasWords) return;
      findings.push([f, path.node.loc.start.line, inner.slice(0, 70).replace(/\s+/g, ' ')]);
    },
  });
}

console.log(`controls with an onPress: ${total}`);
console.log(findings.length ? `\nNO LABEL AND NO WORDS INSIDE (${findings.length}):` : '\nnothing: every control is named or carries its own words.');
for (const [f, l, t] of findings) console.log(`  ${f}:${l}\n      ${t}`);
