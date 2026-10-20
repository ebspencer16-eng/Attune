/**
 * Sweep: three functions called calcDimScores. Do they agree?
 *
 * Run, not read. CLAUDE.md: "When a check is about two implementations of one
 * rule, the question is whether they give the same ANSWER, and the inputs are
 * at best a cheap first half."
 */
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import { calcDimScores as engine, DIM_KEYS, QUESTION_WEIGHTS } from '../../api/_type-engine.js';

const ROOT = '/Users/Ellie/Projects/unison/';

/** Lift a function out of a file by brace depth, the check-card-type-clipping trick. */
function lift(file, name, extra = '') {
  const src = readFileSync(ROOT + file, 'utf8');
  const i = src.search(new RegExp(`(^|\\n)\\s*(export )?(async )?function ${name}\\b`));
  if (i === -1) throw new Error(`${name} not found in ${file}`);
  let depth = 0, started = false, j = i;
  for (; j < src.length; j += 1) {
    if (src[j] === '{') { depth += 1; started = true; }
    else if (src[j] === '}') { depth -= 1; if (started && depth === 0) { j += 1; break; } }
  }
  const body = src.slice(i, j).replace(/^\s*export\s+/, '');
  const js = transformSync(extra + '\n' + body + `\nexport default ${name};`,
    { loader: 'ts', format: 'esm' }).code;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
}

const QW = `const QUESTION_WEIGHTS = ${JSON.stringify(QUESTION_WEIGHTS)};
const DIM_KEYS = ${JSON.stringify(DIM_KEYS)};
const FLIPPED_QUESTIONS = new Set(['st1']);`;

const admin = (await lift('api/admin-data.js', 'calcDimScores', QW)).default;
const site  = (await lift('src/App.jsx', 'calcDimScores', QW)).default;

/** Varied answers, not a tidy fixture: a weighting difference vanishes when
 *  every answer in a dimension is the same. */
const ids = [...new Set(Object.values(DIM_KEYS).flat())];
function randomAnswers(seed) {
  let s = seed;
  const next = () => { s = (s * 1103515245 + 12345) % 2147483648; return 1 + (s % 5); };
  return Object.fromEntries(ids.map((id) => [id, next()]));
}

let compared = 0;
const diffs = { admin: [], site: [] };
for (let seed = 1; seed <= 400; seed += 1) {
  const a = randomAnswers(seed);
  const e = engine(a);
  for (const [who, fn] of [['admin', admin], ['site', site]]) {
    let got;
    try { got = fn(a); } catch (err) { diffs[who].push(`seed ${seed}: threw ${err.message}`); continue; }
    for (const dim of Object.keys(DIM_KEYS)) {
      compared += 1;
      const x = e[dim], y = got[dim];
      if (x == null && y == null) continue;
      if (Math.abs((x ?? 0) - (y ?? 0)) > 1e-9) {
        diffs[who].push(`seed ${seed} ${dim}: engine ${x?.toFixed?.(3)} vs ${who} ${y?.toFixed?.(3)}`);
      }
    }
  }
}
console.log(`compared ${compared} dimension scores over 400 answer sets`);
for (const who of ['admin', 'site']) {
  const d = diffs[who];
  console.log(`\n${who}: ${d.length} disagreements`);
  for (const line of d.slice(0, 6)) console.log('  ' + line);
  if (d.length > 6) console.log(`  ... and ${d.length - 6} more`);
}
