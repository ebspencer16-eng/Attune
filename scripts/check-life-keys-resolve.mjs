#!/usr/bin/env node
/**
 * Every life-question id the product looks up is a life question.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie: "I only want the PDF workbook to exist, and if the PDF builder uses
 * outdated references, then we need to update those."
 *
 * The workbook's expectations-gaps section was built from a hand-written list
 * of keys looked up as `lq_<key>`: household, emotional, financial, career,
 * children, lifestyle, values. Five of the seven name a question that does not
 * exist. The real ids are lq_location, lq_faith, lq_finances, lq_routine,
 * lq_social and the rest.
 *
 * So five of seven rows carried a null answer for both partners, and
 * public/workbook-render.html drew six of them. Every couple's workbook had a
 * mostly blank section, and the list was written out twice: once in
 * api/_lib/workbook-payload.js and once in src/App.jsx.
 *
 * It survived because every value it produced was a valid value. A null answer
 * with `aligned: false` is exactly what an unanswered question looks like, so a
 * finished couple's workbook was indistinguishable from an unfinished one.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 * Any `'lq_' + x` or `lq_<name>` written as a literal anywhere under api/,
 * src/ or public/ names a question in the registry. That is the general shape
 * of the bug: when one list indexes into another, the check is not that the
 * list is right but that every key in it resolves.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the right questions are in the workbook. That is Ellie's.
 *
 * Mirrored ids. `mirrorLifeId` maps a question to its partner's counterpart and
 * both sides are in the registry, so a mirrored id resolves like any other.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { LIFE_QUESTIONS } from '../api/_questions.js';

const ROOT = new URL('..', import.meta.url).pathname;

const known = new Set(LIFE_QUESTIONS.map((q) => q.id));
if (!known.size) {
  console.error('[check-life-keys-resolve] the question registry lists no life questions.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|jsx|mjs|html)$/.test(name)) out.push(p);
  }
  return out;
}

const files = ['api', 'src', 'public'].flatMap((d) => walk(join(ROOT, d)));
const fails = [];
let checked = 0;

for (const file of files) {
  const rel = file.slice(ROOT.length);
  /* The generated registry itself, and this gate, are where the ids live. */
  if (rel.startsWith('api/_questions')) continue;
  const src = readFileSync(file, 'utf8');

  /* Written out whole: 'lq_location'. */
  for (const m of src.matchAll(/['"`](lq_[a-z0-9_]+)['"`]/g)) {
    checked += 1;
    if (!known.has(m[1])) {
      const line = src.slice(0, m.index).split('\n').length;
      fails.push(`${rel}:${line} looks up "${m[1]}", which is not a life question.\n`
        + '      It resolves to undefined, which reads as unanswered, so nothing errors and the'
        + '\n      workbook simply prints a blank row.');
    }
  }

  /* Built by concatenation: 'lq_' + key. The key comes from a list, so the
     literal to check is the list, not this line. Reported as a shape rather
     than a name, because this is the form the bug actually took and a scan
     cannot resolve the variable. */
  for (const m of src.matchAll(/['"`]lq_['"`]\s*\+/g)) {
    const line = src.slice(0, m.index).split('\n').length;
    fails.push(`${rel}:${line} builds a life-question id by concatenation ('lq_' + something).\n`
      + '      That is how seven keys came to be written out by hand with five of them naming\n'
      + '      no question at all. Map over LIFE_QUESTIONS instead: then there is no key that\n'
      + '      can fail to resolve.');
  }
}

if (!checked) {
  console.error('[check-life-keys-resolve] no life-question id appears anywhere under api/, src/'
    + ' or public/. Refusing to pass: a gate that has lost its subject must never report'
    + ' success.');
  process.exit(1);
}

if (fails.length) {
  console.error('\n check-life-keys-resolve: a key list does not resolve.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-life-keys-resolve] ${checked} life-question ids written out across`
  + ` ${files.length} files, every one of them a question in the registry, and none built by`
  + ' concatenation.');
