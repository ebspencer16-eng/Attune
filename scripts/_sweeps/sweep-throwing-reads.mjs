/* Sweep: a method that throws on undefined, called on a chain with no guard,
   in api/. `.toLowerCase()` on a field that is absent is not a blank on a
   page, it is FUNCTION_INVOCATION_FAILED. CLAUDE.md records exactly this
   crashing the insight builder when a fixture stored a number for a string. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

const THROWERS = new Set(['toLowerCase','toUpperCase','toFixed','trim','split','join','map','filter','replace','slice','charAt','padStart','includes','find','reduce','sort','forEach','startsWith','endsWith','flatMap','some','every','indexOf']);

const files = [];
function walk(d) {
  for (const e of readdirSync(d)) {
    const p = `${d}/${e}`;
    if (e === 'node_modules' || e.startsWith('.')) continue;
    if (statSync(p).isDirectory()) walk(p); else if (/\.m?js$/.test(p)) files.push(p);
  }
}
walk('api');

const findings = [];
let calls = 0;

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  let ast;
  try { ast = parse(src, { sourceType: 'module' }); } catch { continue; }

  traverse(ast, {
    CallExpression(path) {
      const c = path.node.callee;
      if (c.type !== 'MemberExpression' || c.property.type !== 'Identifier') return;
      if (!THROWERS.has(c.property.name)) return;

      // The receiver has to be a property chain, not a local or a literal.
      const recv = c.object;
      if (recv.type !== 'MemberExpression') return;
      calls++;

      // Optional anywhere in the chain, or on the call itself, is a guard.
      let n = recv, optional = c.optional === true;
      let depth = 0;
      while (n && (n.type === 'MemberExpression' || n.type === 'OptionalMemberExpression')) {
        if (n.type === 'OptionalMemberExpression' || n.optional) optional = true;
        n = n.object; depth++;
      }
      if (optional) return;
      /* ── WHAT IS ACTUALLY WORTH COUNTING ──────────────────────────────
         The first version counted any property chain with a method on it and
         flagged 68 of 99, which is not a finding, it is a description of how
         this code is written. `cat.items.map` over a question set that ships
         in the repo cannot be undefined.

         The risk is a chain rooted in something that crossed a boundary: a
         request body, or a row that came back from the database. Those can be
         absent, and the method then throws a 500 rather than rendering a
         blank. So the root has to be one of those. */
      const EXTERNAL = new Set(['body','req','data','rows','row','profile','me','partner','session','payload','answers','record','result','results','json','user','order','orders']);
      if (!(n && n.type === 'Identifier' && EXTERNAL.has(n.name))) return;

      const line = c.loc.start.line;
      const text = src.split('\n')[line - 1].trim();

      /* ── A GUARD IS RARELY ON THE SAME LINE ───────────────────────────
         The first version looked only at the call's own line and reported
         all three of its findings as unguarded. Every one was guarded by an
         `Array.isArray(...)` an `if` above it, one of them with a comment
         saying it exists because the oldest stored rows predate the field.

         So the question is whether the receiver is tested anywhere in the
         enclosing function before this point. */
      const chain = src.slice(recv.start, recv.end);
      const fn = path.getFunctionParent();
      const before = src.slice(fn ? fn.node.start : 0, c.start);
      const guarded = before.includes(`Array.isArray(${chain})`)
        || before.includes(`${chain} &&`)
        || before.includes(`${chain}?.`)
        || new RegExp(`if\\s*\\(\\s*!?${chain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(before)
        || /\&\&|\?\s|\|\|/.test(text);
      if (guarded) return;
      findings.push([f, line, c.property.name, text.slice(0, 95)]);
    },
  });
}

console.log(`method calls on a property chain in api/: ${calls}`);
console.log(findings.length ? `\nFINDINGS (${findings.length}):` : '\nnothing.');
for (const [f, l, m, t] of findings) console.log(`  ${f}:${l}  .${m}()\n      ${t}`);
