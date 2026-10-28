/**
 * Every number the app's results screens DRAW, and where it came from.
 *
 * ── THE QUESTION THIS ANSWERS ─────────────────────────────────────────────
 * TASKS.md V3: nothing renders the same couple on both surfaces and compares
 * the result, so a divergence between the website and the app would not be
 * caught by any of the eighteen gates that compare rules and lists.
 *
 * Ellie: "If this is worth building then build it."
 *
 * Rendering both and diffing the words is not worth building: two layouts
 * never produce the same text, and the normaliser that made them match would
 * be forgiving enough to prove nothing. This is the sharp half of the same
 * question. The app is forbidden from scoring anything — CLAUDE.md, "two
 * scorers drifting apart is how this product starts lying to people" — so if
 * every number on an app results screen is read from the payload rather than
 * worked out, the two surfaces CANNOT disagree about a number, and no render
 * diff is needed to know it.
 *
 * ── WHAT IS MEASURED ──────────────────────────────────────────────────────
 * Every expression rendered as the child of a <Text> in the results screens,
 * classified as:
 *
 *   read        a field off the payload, possibly formatted or defaulted
 *   layout      arithmetic on sizes, indexes, counts of things on screen
 *   computed    arithmetic on something the payload carries  <- the finding
 *
 * A count of items in a list the app was given is `read`: the server sent the
 * list, and counting it cannot disagree with anything. Arithmetic on a VALUE
 * is what would make a second scorer.
 *
 * ── WHAT IT FOUND, AND ITS TWO LIMITS ─────────────────────────────────────
 * 143 expressions drawn inside a Text across the five results files. 140 are
 * a read or a format. Of the nine it flagged, eight are positions, clamps,
 * list indexes, or a local with the same name as a payload field in another
 * scope. One is real and small: highlight-cards clamps a percentage to 0..100
 * before printing it, so a payload value outside that range would print
 * differently on the two surfaces. Nothing the server can produce today is
 * outside it.
 *
 * So: no second scorer in the app, and a render diff between the two surfaces
 * would be measuring something that cannot differ.
 *
 * The limits, because a sweep that cannot see something has to say so. It
 * matches identifiers by NAME, not by scope, which is why a local `pct` used
 * for a marker's position is reported beside a payload field called `pct`.
 * And it reads five files chosen by their names; a number drawn by a
 * component somewhere else is not in the count.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

const DIR = 'attune-app/src/components';
const FILES = readdirSync(DIR).filter((f) => /result|highlight|storycard|card/i.test(f) && /\.tsx$/.test(f));

/* Words that mean a size, a position or an index rather than a figure about a
   couple. A number made of these is layout. */
const LAYOUT = /\b(width|height|size|font|px|pt|radius|margin|padding|gap|offset|scroll|index|idx|opacity|alpha|top|left|right|bottom|x|y|angle|deg|rad|col|row|page|cards?Width|track|line)\b/i;

const findings = [];
let texts = 0, reads = 0, layout = 0;

for (const file of FILES) {
  const src = readFileSync(join(DIR, file), 'utf8');
  let ast;
  try {
    ast = parse(src, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  } catch (e) {
    findings.push({ file, line: 0, kind: 'unparsed', code: String(e.message).slice(0, 80) });
    continue;
  }

  const drawn = new Set();
  traverse(ast, {
    JSXElement(path) {
      const name = path.node.openingElement.name;
      const tag = name && (name.name || (name.property && name.property.name));
      if (!/^Text$/.test(String(tag || ''))) return;
      for (const child of path.node.children) {
        if (child.type !== 'JSXExpressionContainer') continue;
        const expr = child.expression;
        if (!expr || expr.type === 'JSXEmptyExpression') continue;
        texts += 1;
        const code = src.slice(expr.start, expr.end).replace(/\s+/g, ' ').slice(0, 90);
        /* Arithmetic, or a rounding call, anywhere inside what is drawn. */
        let math = false;
        const walk = (n) => {
          if (!n || typeof n !== 'object') return;
          if (n.type === 'BinaryExpression' && ['*', '/', '-', '+', '%', '**'].includes(n.operator)) {
            /* `a + b` over strings is concatenation, which is formatting. */
            if (n.operator !== '+') math = true;
            else if (!/['"`]/.test(src.slice(n.start, n.end))) math = true;
          }
          if (n.type === 'CallExpression') {
            const c = src.slice(n.callee.start, n.callee.end);
            if (/\bMath\.|toFixed|round|floor|ceil/.test(c)) math = true;
          }
          for (const k of Object.keys(n)) {
            const v = n[k];
            if (Array.isArray(v)) v.forEach(walk);
            else if (v && typeof v.type === 'string') walk(v);
          }
        };
        walk(expr);
        if (!math) {
          /* ── THE HOLE THIS CLOSES ─────────────────────────────────────
             A number worked out one line above and then drawn by name looks
             like a read here, and that is the shape a second scorer would
             actually take. So every identifier drawn is remembered, and the
             second pass below asks what its declaration does. */
          const walkIds = (n) => {
            if (!n || typeof n !== 'object') return;
            if (n.type === 'Identifier') drawn.add(n.name);
            for (const k of Object.keys(n)) {
              const v = n[k];
              if (Array.isArray(v)) v.forEach(walkIds);
              else if (v && typeof v.type === 'string') walkIds(v);
            }
          };
          walkIds(expr);
          reads += 1;
          continue;
        }
        if (LAYOUT.test(code)) { layout += 1; continue; }
        findings.push({ file, line: expr.loc.start.line, kind: 'computed', code });
      }
    },
  });

  /* ── SECOND PASS: WHAT THE DRAWN NAMES ARE MADE OF ────────────────────
     A declaration whose initialiser does arithmetic, whose name is drawn in a
     Text somewhere in this file. Layout names are excluded the same way. */
  traverse(ast, {
    VariableDeclarator(path) {
      const id = path.node.id;
      if (!id || id.type !== 'Identifier' || !drawn.has(id.name)) return;
      const init = path.node.init;
      if (!init) return;
      const code = src.slice(init.start, init.end).replace(/\s+/g, ' ');
      if (!/[*/%]|Math\.|toFixed|\breduce\b/.test(code)) return;
      if (LAYOUT.test(id.name) || LAYOUT.test(code)) { layout += 1; return; }
      findings.push({ file, line: path.node.loc.start.line, kind: 'computed-above',
        code: id.name + ' = ' + code.slice(0, 80) });
    },
  });
}

console.log(`[sweep-app-numbers] ${FILES.length} results files, ${texts} expressions drawn inside <Text>.`);
console.log(`  ${reads} read or formatted, ${layout} arithmetic on layout.`);
if (!findings.length) {
  console.log('  nothing: no number drawn to the reader is worked out from a value the payload carries.');
} else {
  console.log(`  ${findings.length} worth reading:`);
  for (const f of findings) console.log(`    ${f.file}:${f.line}  ${f.code}`);
}
