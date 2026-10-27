/**
 * Every `styles.x` the app reads, against every key its StyleSheet defines.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * React Native resolves `styles.typo` to undefined and renders the element
 * with no styling at all. No error, no warning: the same silence as a CSS
 * class with no rule behind it, which is how twelve buttons in the admin
 * stayed unstyled for months.
 *
 * ── WHAT IT CANNOT SEE ────────────────────────────────────────────────────
 * A style reached through a computed key, `styles[variant]`, which is a
 * perfectly ordinary thing to write. Those are counted and reported as
 * unresolved rather than skipped, because a silent skip is how a sweep becomes
 * evidence for something it never looked at.
 *
 * A file may hold several StyleSheets under different names; each name is
 * tracked separately, so `styles.x` is checked against `styles` and not
 * against the union of every sheet in the file.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.argv[2] || 'attune-app/src';
const files = [];
const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) {
  if (e.isDirectory()) walk(join(d, e.name)); else if (/\.(ts|tsx)$/.test(e.name)) files.push(join(d, e.name)); } };
walk(ROOT);

let defined = 0, read = 0, unresolved = 0;
const missing = [];
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  /* Each sheet: `const NAME = StyleSheet.create({ ... })`, taking keys at the
     top level of that object only. Nested keys belong to a style, not to the
     sheet. */
  const sheets = new Map();
  for (const m of src.matchAll(/(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*StyleSheet\.create\(\s*\{/g)) {
    const from = m.index + m[0].length;
    let depth = 1, i = from;
    while (i < src.length && depth > 0) { const c = src[i]; if (c === '{') depth++; else if (c === '}') depth--; i++; }
    const body = src.slice(from, i - 1);
    const keys = new Set();
    let d = 0;
    for (const k of body.matchAll(/([{}]|(?:^|[,{])\s*([A-Za-z_$][\w$]*)\s*:)/gm)) {
      if (k[1] === '{') { d++; continue; }
      if (k[1] === '}') { d--; continue; }
      if (d === 0 && k[2]) keys.add(k[2]);
    }
    sheets.set(m[1], keys);
    defined += keys.size;
  }
  if (!sheets.size) continue;
  for (const [name, keys] of sheets) {
    const re = new RegExp('\\b' + name + '\\.([A-Za-z_$][\\w$]*)', 'g');
    for (const u of src.matchAll(re)) {
      read++;
      if (!keys.has(u[1])) missing.push({ file, name, key: u[1], line: src.slice(0, u.index).split('\n').length });
    }
    unresolved += [...src.matchAll(new RegExp('\\b' + name + '\\[', 'g'))].length;
  }
}

console.log('[sweep-missing-styles]');
console.log(`  ${defined} style keys defined across ${files.length} files; ${read} read by name; `
  + `${unresolved} read through a computed key and not resolved here.`);
/* ── WHAT THIS SWEEP TURNED OUT NOT TO BE ABOUT ────────────────────────────
   26 keys across 79 files reads like a clean result and is not one. This app
   styles with inline objects, 1400 of them, and uses StyleSheet.create in four
   files. So the subject barely exists here and "found nothing" is a sentence
   about 26 keys rather than about the app's styling.

   Kept, because it converts "probably fine" into a figure and because the bug
   it looks for is real wherever a sheet IS used. But the figure is printed
   beside the inline count so nobody reads it as cover. This is the rule
   CLAUDE.md states about a matcher blind to the common spelling, found by
   looking at the number and not believing it. */
const inline = files.reduce((n, f) => n + (readFileSync(f, 'utf8').match(/style=\{\{/g) || []).length, 0);
console.log(`  For scale: ${inline} inline style objects in the same files, which this cannot see and which cannot have this bug.`);
if (!missing.length) { console.log('  Every style read by name is defined.'); process.exit(0); }
console.log(`  ${missing.length} read and never defined:`);
for (const m of missing) console.log(`    ${m.file}:${m.line}  ${m.name}.${m.key}`);
