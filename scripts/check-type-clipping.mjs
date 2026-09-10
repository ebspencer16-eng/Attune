// Fails the build when a font size is raised above its line height.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// Ellie: "Storycard 5 '80%' text is cut off on top."
//
// Every entry in the app's type scale carries a fixed lineHeight. The
// storycard figure style was fontSize 64 in a 66 point line box, and the
// expectations card overrode the size to 72 and left the box alone. React
// Native does not grow a line box to fit a glyph; it clips, from the top. So
// the figure lost its upper edge on one card out of nine, on a screen made to
// be screenshotted.
//
// Nothing was wrong on the style itself, and nothing was wrong on the card
// that inherited it unchanged. The bug lived entirely in the override, which
// is why it survived: tsc is happy, the build is clean, and the only symptom
// is a few missing pixels that look like a font quirk.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// Any style that spreads a Type entry and raises fontSize past that entry's
// lineHeight without setting a new one. It reads the type scale rather than
// holding a copy, so changing the scale changes what counts.
//
// ── WHAT IT CANNOT SEE ─────────────────────────────────────────────────────
// An override split across lines, or one that goes through a local alias
// (`const hero = { ...Type.hero }` and then `[hero, { fontSize: 90 }]`). That
// second shape is the one that actually bit, so the file that had it now
// derives its line height from the size instead of letting the two be set
// apart. This catches the direct form and is a floor, not a proof.

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const APP = join(ROOT, 'attune-app/src');

const theme = readFileSync(join(APP, 'constants/attune-theme.ts'), 'utf8');
const SCALE = {};
for (const m of theme.matchAll(/(\w+):\s*\{[^}]*fontSize:\s*(\d+),\s*lineHeight:\s*(\d+)/g)) {
  SCALE[m[1]] = { size: Number(m[2]), line: Number(m[3]) };
}
if (!Object.keys(SCALE).length) {
  console.error('[check-type-clipping] could not read the type scale; refusing to pass.');
  process.exit(1);
}

const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(p)) files.push(p);
  }
})(APP);

const problems = [];
for (const file of files) {
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    const size = line.match(/fontSize:\s*(\d+)/);
    if (!size || /lineHeight/.test(line)) return;
    for (const [name, v] of Object.entries(SCALE)) {
      if (!new RegExp(`Type\\.${name}\\b`).test(line)) continue;
      if (Number(size[1]) <= v.line) continue;
      problems.push(
        `${file.replace(ROOT, '')}:${i + 1}\n`
        + `      Type.${name} has lineHeight ${v.line}; fontSize is raised to ${size[1]}.\n`
        + '      React Native clips the glyph from the top rather than growing the box.\n'
        + `      ${line.trim().slice(0, 90)}`);
    }
  });
}

if (problems.length) {
  console.error('[check-type-clipping] a glyph is taller than the line box it sits in:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('Set lineHeight alongside fontSize, or derive one from the other so the');
  console.error('two cannot be changed apart.');
  process.exit(1);
}

console.log(
  `[check-type-clipping] ${files.length} files, ${Object.keys(SCALE).length} type sizes; `
  + 'no glyph is taller than its line box.');
