#!/usr/bin/env node
/**
 * check-palette-keys: every colour the website reads from its palette exists.
 *
 * `C` in src/App.jsx is the website's palette. The results survey read
 * C.orange and C.indigo and the intimacy exercise read C.white, and C had none
 * of them. An undefined colour is not an error anywhere: the style string
 * becomes "1.5px solid undefined" or "linear-gradient(90deg, undefined,
 * undefined)", the browser drops it, and the survey's progress bar simply had
 * no fill. Found by sweep-unset-fields (A222).
 *
 * Method: parse every file under src/ that declares `const C = {...}` at the
 * top level, take its keys, and fail on any `C.name` read in that file, inside
 * any scope where C is that binding, that is not one of them.
 *
 * Not covered: palettes under other names, and the app, whose TypeScript
 * already refuses a property its object does not have.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const ROOT = new URL('..', import.meta.url).pathname;
const require = createRequire(`${ROOT}package.json`);
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const fails = [];
let palettes = 0, reads = 0;
for (const f of readdirSync(`${ROOT}src`).filter((x) => /\.jsx?$/.test(x))) {
  const code = readFileSync(`${ROOT}src/${f}`, 'utf8');
  const ast = parse(code, { sourceType: 'module', plugins: ['jsx'] });
  traverse(ast, {
    Program(p) {
      const b = p.scope.getBinding('C');
      if (!b || !b.path.isVariableDeclarator() || !b.path.get('init').isObjectExpression()) return;
      palettes++;
      const keys = new Set(b.path.node.init.properties.map((x) => x.key?.name ?? x.key?.value));
      for (const r of b.referencePaths) {
        const m = r.parentPath;
        if (!(m.isMemberExpression() || m.isOptionalMemberExpression()) || m.node.object !== r.node || m.node.computed) continue;
        reads++;
        if (!keys.has(m.node.property.name)) fails.push(`src/${f}:${m.node.loc.start.line} reads C.${m.node.property.name}, which the palette does not define.`);
      }
    },
  });
}
if (!palettes) fails.push('no `const C = {...}` palette found under src/. Refusing to pass: a gate that has lost its subject must never report success.');
if (fails.length) {
  console.error('[check-palette-keys] FAILED:\n  ' + fails.join('\n  '));
  process.exit(1);
}
console.log(`[check-palette-keys] ${reads} palette reads across ${palettes} palette${palettes === 1 ? '' : 's'}, every colour defined.`);
