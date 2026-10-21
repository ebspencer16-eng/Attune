/**
 * SWEEP: a NaN that reaches a person.
 *
 * `Number('')` is 0, `Number('x')` is NaN, `parseInt(undefined)` is NaN, and
 * NaN renders as the three letters "NaN" in a browser and in React Native.
 * Nothing throws. Arithmetic involving it stays NaN all the way to the screen,
 * so the tell is a figure that reads NaN rather than an error anywhere.
 *
 * The property measured: for every conversion of something to a number, is
 * there a guard between it and the place it is used?
 *
 * A guard is any of: Number.isFinite / Number.isNaN / isNaN, `|| 0`, `?? 0`,
 * a comparison (NaN fails every comparison, so `> 0` is a guard), or the
 * conversion being inside a condition. Checked over the whole enclosing
 * statement and the two lines after it, because that is where this codebase
 * writes them.
 *
 * Reported as three counts, not one, because "unguarded" alone is not a bug:
 * a conversion of a value the code itself produced cannot be NaN. The ones
 * that matter take their input from OUTSIDE: a query string, a request body,
 * a stored answer, a column.
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const files = execSync(
  "git ls-files 'api/*.js' 'api/**/*.js' 'src/*.jsx' 'attune-app/src/**/*.ts' 'attune-app/src/**/*.tsx' 'public/*.js' 'public/*.html'",
  { encoding: 'utf8' },
).trim().split('\n').filter(Boolean);

const CONVERT = /\b(Number|parseInt|parseFloat)\s*\(/g;
/* Two corrections, in opposite directions, and the second is the one that
   matters.
   Widened: NaN loses EVERY comparison, so a relational operator is a real
   guard even when the other side is a variable. Eight of the first fourteen
   findings were `Number(a[id]) >= n ? x : y`, correct for a NaN.
   Then NARROWED, because widening it had manufactured evidence. A window of
   four lines put `featured: r.featured_question === q` two lines below
   `parseInt(rating, 10)` and called the parse guarded. Equality is not a NaN
   guard anyway, and a window reaching into the next property is the
   swallowing failure CLAUDE.md warns about. The guard has to be in the same
   statement. */
/* `|| null` turns a NaN into the no-figure answer, so it is a guard. And
   equality against anything but null is a guard, because NaN equals nothing;
   `== null` is NOT, because it tests for absence and lets a non-numeric
   string straight through. That distinction is the whole difference between
   conflict-results.js, which is listed, and App.jsx's star row, which is not. */
const GUARD = /(Number\.isFinite|Number\.isNaN|\bisNaN\b|\|\|\s*'?0'?\b|\?\?\s*0\b|\|\|\s*null|[<>]=?\s*[\w.'"]|===?\s*(?!null)[\w.'"]|Math\.max|Math\.min|\btoFixed\b)/;

/** Inputs that come from outside this codebase. */
const OUTSIDE = /(req\.|body\.|query|searchParams|params\.|headers|process\.env|localStorage|getItem|answers|\.value|row\.|data\.|json|JSON\.parse|input|e\.target|dataset)/;

let total = 0, guarded = 0;
const risky = [];

for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;        // a comment is not code
    CONVERT.lastIndex = 0;
    let m;
    while ((m = CONVERT.exec(line))) {
      total++;
      /* The STATEMENT, not a window: from this line's start to the first
         `;` or `,` at depth zero after the conversion, which is where a
         property or an argument ends. */
      const stmt = statementAround(line, m.index);
      if (GUARD.test(stmt)) { guarded++; continue; }
      /* The idiom this codebase actually writes, found by reading the first
         ten findings: `const raw = Number(x);` on one line and
         `if (Number.isFinite(raw) && ...)` on the next. So follow the BINDING
         rather than widening the window: a guard counts only if it names the
         variable the conversion was assigned to. Three of the three "takes a
         number from outside" findings were this, all correct. */
      const bound = line.match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*$|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=[^=]/);
      const name = bound && (bound[1] || bound[2]);
      if (name) {
        const after = lines.slice(i + 1, i + 4);
        if (after.some((l) => new RegExp(`\\b${name}\\b`).test(l) && GUARD.test(l))) { guarded++; continue; }
      }
      const arg = line.slice(m.index).slice(0, 90);
      risky.push({ file, line: i + 1, text: arg.trim(), outside: OUTSIDE.test(arg) });
    }
  }
}

/** The conversion plus the rest of its own statement, and nothing beyond. */
function statementAround(line, at) {
  let depth = 0, end = line.length;
  for (let j = at; j < line.length; j++) {
    const ch = line[j];
    if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) { if (depth === 0) { end = j; break; } depth--; }
    else if ((ch === ';' || ch === ',') && depth === 0) { end = j; break; }
  }
  return line.slice(0, end + 1);
}

const fromOutside = risky.filter((r) => r.outside);
console.log(`[sweep-nan-reach] ${files.length} files, ${total} conversions to a number.`);
console.log(`  ${guarded} have a NaN guard in the same statement, or on a following line naming the variable it was assigned to.`);
console.log(`  ${risky.length} do not, and ${fromOutside.length} of those convert something that came from outside this codebase.`);
console.log('');
if (!fromOutside.length) {
  console.log('  nothing: every unguarded conversion is of a value the code produced itself.');
} else {
  for (const r of fromOutside) console.log(`  ${r.file}:${r.line}  ${r.text}`);
  console.log(`\n  ${fromOutside.length} to read.`);
}
if (risky.length - fromOutside.length) {
  console.log(`\n  (${risky.length - fromOutside.length} unguarded conversions of the code's own values, not listed.)`);
}
