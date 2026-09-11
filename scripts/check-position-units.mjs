// Fails the build when a value reaching a percentage style does not say what
// unit it is in.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// Ellie: "I can see the relationship reflection page but the dots showing our
// placements are missing."
//
// The Marker component took a prop called `left` and wrote
// `left: ${left * 100}%`, so it wanted a fraction. All six call sites passed a
// percentage: the reflection pages pass `pct`, which the server computes as 0
// to 100, and the intimacy rows pass `q.you * 100`, having converted already.
//
// So every marker in the app rendered at up to 10000% and sat far off the
// right-hand edge. Three screens with invisible placement dots, and nothing
// errored, because 10000% is a perfectly valid style value.
//
// It is the third bug of this shape here. `chipText` compared a stored 'A' to
// the number 0 and printed the opposite answer on every snapshot row. The
// `openings` type declared number where the data has always been a letter, so
// tsc enforced the mistake. Now a fraction and a percentage sharing a prop
// name that says neither.
//
// A value crossing a boundary carries a unit, and a name that does not say
// which one is a coin flip that nobody can see land.
//
// ── THE RULE ───────────────────────────────────────────────────────────────
// Anything interpolated into a `%` style must either be named for a percentage
// and used as-is, or be converted inline from something visibly a fraction.
// A name that says nothing, scaled by a factor chosen out of the air, is what
// this catches.

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const APP = join(ROOT, 'attune-app/src');

const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(p)) files.push(p);
  }
})(APP);

/** A name that declares itself a percentage. */
const SAYS_PERCENT = /pct|percent/i;

const problems = [];

for (const file of files) {
  const src = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
  src.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/\b(left|right|top|bottom|width|height):\s*`\$\{([^}]*)\}%`/g)) {
      const [, prop, expr] = m;

      // Converted inline from something visibly a fraction: the division or
      // the * 100 is right there to read.
      const convertsInline = /\*\s*100\b/.test(expr) && /[/(]/.test(expr);
      // Named for a percentage and used as-is, possibly clamped.
      const namedPercent = SAYS_PERCENT.test(expr);

      if (namedPercent && /\*\s*100\b/.test(expr)) {
        problems.push(
          `${file.replace(ROOT, '')}:${i + 1} multiplies a percentage by 100.\n`
          + `      ${prop}: \`\${${expr.trim()}}%\`\n`
          + '      Whatever is named pct is already out of 100; scaling it again puts the\n'
          + '      element off the edge, where nothing errors and nothing is visible.');
        continue;
      }
      if (namedPercent || convertsInline) continue;

      problems.push(
        `${file.replace(ROOT, '')}:${i + 1} builds a percentage from a value whose name\n`
        + `      does not say its unit: ${prop}: \`\${${expr.trim()}}%\`\n`
        + '      Name it for a percentage and use it as-is, or convert inline from\n'
        + '      something visibly a fraction. A prop called `left` scaled by a factor\n'
        + '      chosen out of the air is how every placement dot in the app ended up\n'
        + '      at 10000%.');
    }
  });
}

if (problems.length) {
  console.error('[check-position-units] a position is built from an undeclared unit:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(
  `[check-position-units] ${files.length} files; every percentage style is either `
  + 'named for a percentage or converted inline.');
