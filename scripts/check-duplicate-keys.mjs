#!/usr/bin/env node
/**
 * No object literal writes the same key twice.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * A repeated key in an object literal is not an error. The later one wins, and
 * nothing anywhere says so.
 *
 * It cost the Learn page fix. The block above the In Practice sheet takes a
 * minimum height, which is the whole of that fix, and the style object already
 * carried `minHeight: 0` from when the budget was a `height`. My new line went
 * in above it, so the zero won and the block had no minimum at all from the
 * moment the fix shipped.
 *
 * check-learn-gap passed throughout, because its harness builds the block from
 * the budget expression lifted out of src/App.jsx rather than rendering that
 * style object. A gate pointed at the wrong copy of a rule reports success
 * about code nobody runs, which this codebase already knew; what was new is
 * that the wrong copy was the one written for the gate.
 *
 * ── WHY A PARSER AND NOT A GREP ───────────────────────────────────────────
 * The first version of this walked lines and counted braces, and it reported
 * three findings of which two were the two branches of a ternary:
 * `cond ? { id, subtitle } : { id, subtitle }`. Two objects, one key each, and
 * a line-based scan cannot tell them apart. A gate that matches too much either
 * gets loosened until it matches nothing or manufactures the finding it was
 * meant to look for, so this asks Babel for the object expressions and checks
 * each one's own properties.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * Every object literal under api/, src/, public/ and the app, for a plain key
 * written twice. Computed keys are skipped because two of them can be the same
 * at runtime and a parser cannot know; spreads are skipped because overriding a
 * spread is the point of one.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The same key set on an element twice through different mechanisms: a style
 * object and a className, or a prop passed twice through a spread. Those are
 * real and this cannot see them. And duplicate keys in JSON, which has its own
 * rules and no literals worth scanning here.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';

const traverse = _traverse.default || _traverse;
const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

function files(dir, out = []) {
  let entries;
  try { entries = readdirSync(join(ROOT, dir)); } catch { return out; }
  for (const name of entries) {
    const rel = join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) {
      if (/node_modules|\.expo|dist|\.next/.test(name)) continue;
      files(rel, out);
      continue;
    }
    if (/\.(js|jsx|mjs|ts|tsx)$/.test(name)) out.push(rel);
  }
  return out;
}

const targets = ['api', 'src', 'public', 'attune-app/src'].flatMap((d) => files(d));
if (targets.length < 50) {
  console.error(`[check-duplicate-keys] only found ${targets.length} files to read, which cannot be`
    + ' right. Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

let scanned = 0;
let objects = 0;

for (const rel of targets) {
  const src = readFileSync(join(ROOT, rel), 'utf8');
  let ast;
  try {
    ast = parse(src, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript', 'classProperties', 'objectRestSpread', 'optionalChaining',
        'nullishCoalescingOperator', 'dynamicImport', 'topLevelAwait'],
      errorRecovery: true,
    });
  } catch (e) {
    fails.push(`${rel} would not parse, so it was not checked: ${String(e.message).slice(0, 90)}`);
    continue;
  }
  scanned += 1;

  traverse(ast, {
    ObjectExpression(path) {
      objects += 1;
      const seen = new Map();
      for (const prop of path.node.properties) {
        if (prop.type !== 'ObjectProperty' && prop.type !== 'ObjectMethod') continue;
        if (prop.computed) continue;
        const k = prop.key;
        const name = k.type === 'Identifier' ? k.name
          : (k.type === 'StringLiteral' ? k.value
            : (k.type === 'NumericLiteral' ? String(k.value) : null));
        if (name == null) continue;
        /* A getter and a setter for one name are a pair, not a repeat. */
        const kind = prop.kind && prop.kind !== 'init' ? `${prop.kind}:` : '';
        const id = kind + name;
        if (seen.has(id)) {
          fails.push(`${rel}:${prop.loc?.start.line} writes "${name}" a second time in one object;`
            + ` the first, at line ${seen.get(id)}, is discarded.`
            + '\n      Nothing errors on this. The Learn page budget was overridden by a'
            + '\n      `minHeight: 0` three lines below it for a whole day.');
        } else {
          seen.set(id, prop.loc?.start.line);
        }
      }
    },
  });
}

if (fails.length) {
  console.error('[check-duplicate-keys] An object writes the same key twice and loses the first:');
  for (const f of fails) console.error(`  ${f}`);
  process.exit(1);
}

console.log(`[check-duplicate-keys] ${objects} object literals across ${scanned} files; none writes`
  + ' a key twice.');
