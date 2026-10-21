/**
 * SWEEP: a hand-typed list of keys used to index another list, and whether
 * every key in it RESOLVES.
 *
 * CLAUDE.md records the version that shipped: EXP_LIFE_KEYS named six
 * categories and looked each one up as `lq_<key>`. Five of the six ids did
 * not exist, so five of six rows carried a null answer and a meaningless
 * alignment flag. It survived because a null answer is exactly what an
 * unanswered question looks like.
 *
 * WHAT THIS CAN AND CANNOT SEE, because the first version could not tell the
 * difference and reported thirteen findings, every one of them its own
 * blindness:
 *
 *   MEASURED. A list of string literals whose elements index a STATIC object
 *   or Set declared in this repo, either directly (`MAP[k]`) or through a
 *   built id (`MAP['lq_' + k]`). Resolution there is exact: the keys of the
 *   target are known, so a key that is not among them is a fault.
 *
 *   NOT MEASURED, and counted and named rather than skipped:
 *     - word lists tested against free text (`words.some(w => t.includes(w))`)
 *     - membership lists (`KINDS.includes(x)`), where the list IS the rule
 *     - CSV header lists, which are labels and index nothing
 *     - lists indexing a runtime value (a database row, a Map built from data)
 *   A silent skip is how a sweep becomes evidence for something it never
 *   looked at.
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

const files = execSync(
  "git ls-files 'api/*.js' 'api/**/*.js' 'src/*.jsx' 'attune-app/src/**/*.ts' 'attune-app/src/**/*.tsx' 'public/*.js'",
  { encoding: 'utf8' },
).trim().split('\n').filter(Boolean);

const KEYISH = /^[a-z][a-z0-9_-]{1,28}$/;

/** Every string-literal list, and every static object's key set, per file. */
const lists = [];
const targets = new Map();   // name -> { file, keys:Set, kind }

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parse(src, { sourceType: 'module', plugins: ['jsx', 'typescript', 'optionalChaining', 'nullishCoalescingOperator', 'classProperties'] });
  } catch { continue; }

  traverse(ast, {
    VariableDeclarator(path) {
      const { id, init } = path.node;
      if (!init || id.type !== 'Identifier') return;

      /* A list of keys. */
      if (init.type === 'ArrayExpression') {
        const els = init.elements;
        if (els && els.length >= 3 && els.every((e) => e && e.type === 'StringLiteral')) {
          const keys = els.map((e) => e.value);
          if (keys.every((k) => KEYISH.test(k))) {
            lists.push({ file, line: init.loc.start.line, name: id.name, keys });
          }
        }
        return;
      }

      /* A static object literal: its keys are knowable. */
      if (init.type === 'ObjectExpression') {
        const keys = new Set();
        let plain = true;
        for (const p of init.properties) {
          if (p.type !== 'ObjectProperty' || p.computed) { plain = false; break; }
          const k = p.key.name || p.key.value;
          if (k == null) { plain = false; break; }
          keys.add(String(k));
        }
        if (plain && keys.size >= 3) targets.set(id.name, { file, keys, kind: 'object' });
        return;
      }

      /* new Set([...literals]). */
      if (init.type === 'NewExpression' && init.callee.name === 'Set') {
        const arg = init.arguments[0];
        if (arg && arg.type === 'ArrayExpression' && arg.elements.every((e) => e && e.type === 'StringLiteral')) {
          targets.set(id.name, { file, keys: new Set(arg.elements.map((e) => e.value)), kind: 'set' });
        }
      }
    },
  });
}

/* For each list, find a use of the form TARGET[<el>] or TARGET['pfx' + <el>]
   inside an iteration over that list. Line-level, deliberately: the shape is
   one line and the scope is already established by the iteration. */
const corpus = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]));
const measured = [];
const unmeasured = [];
const faults = [];

for (const L of lists) {
  let pair = null;

  for (const [file, src] of corpus) {
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!new RegExp(`\\b${L.name}\\b`).test(line)) continue;
      /* Which variable does the iteration bind each key to? */
      const bind = line.match(new RegExp(`${L.name}\\s*\\.\\s*(?:map|forEach|flatMap)\\s*\\(\\s*\\(?\\s*([A-Za-z_$][\\w$]*)`))
        || line.match(new RegExp(`for\\s*\\(\\s*(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s+of\\s+${L.name}\\b`));
      if (!bind) continue;
      const v = bind[1];
      /* Look in the next few lines for an index into a static target. */
      for (let j = i; j < Math.min(i + 8, lines.length); j++) {
        const m = lines[j].match(new RegExp(`([A-Z][\\w$]*)\\s*(?:\\[\\s*(?:['"\`]([a-z0-9_]*)['"\`]\\s*\\+\\s*)?${v}\\s*\\]|\\.has\\(\\s*(?:['"\`]([a-z0-9_]*)['"\`]\\s*\\+\\s*)?${v}\\s*\\))`));
        if (m && targets.has(m[1])) { pair = { target: m[1], prefix: m[2] || m[3] || '', at: `${file}:${j + 1}` }; break; }
      }
      if (pair) break;
    }
    if (pair) break;
  }

  if (!pair) { unmeasured.push(L); continue; }

  const t = targets.get(pair.target);
  measured.push({ ...L, ...pair, targetFile: t.file, targetSize: t.keys.size });
  for (const k of L.keys) {
    const want = pair.prefix + k;
    if (!t.keys.has(want)) {
      faults.push({ ...L, key: k, want, target: pair.target, at: pair.at, targetFile: t.file });
    }
  }
}

console.log(`[sweep-key-lists] ${lists.length} hand-typed key lists; ${measured.length} index a static list and are MEASURED; ${unmeasured.length} index nothing static and are NOT measured.`);
for (const m of measured) {
  console.log(`  measured: ${m.name} (${m.keys.length}) -> ${m.target}${m.prefix ? ` via '${m.prefix}'+key` : ''} (${m.targetSize} keys, ${m.targetFile})`);
}
if (unmeasured.length) {
  console.log('  not measured, and why they cannot be:');
  for (const u of unmeasured) console.log(`    ${u.name} (${u.keys.length}) ${u.file}:${u.line}`);
}
console.log('');
if (!faults.length) {
  console.log('  nothing: every key in every measurable list resolves in its target.');
} else {
  for (const f of faults) {
    console.log(`  ${f.file}:${f.line}  ${f.name} -> '${f.key}' looked up as '${f.want}' in ${f.target} (${f.targetFile}), which has no such key`);
  }
  console.log(`\n  ${faults.length} keys that index nothing.`);
}
