/**
 * One spelling for a forced choice, on every surface that stores or reads one.
 *
 * ── THE BUG THIS ENCODES ──────────────────────────────────────────────────
 * Three surfaces, three spellings of the same answer, and each one correct on
 * its own:
 *
 *   src/App.jsx stored 'A' and 'B'.
 *   attune-app/src/components/conflict-exercise.tsx stored 0 and 1.
 *   api/admin-explore.js read 'a' and 'b'.
 *
 * The results prose is keyed `{ A: ..., B: ... }`. So a couple who answered
 * Conflict Patterns in the APP got nothing for all three forced-choice
 * questions on their results page, and the admin dropped them for everybody
 * whichever surface they used, which Ellie reported as two empty charts:
 * "Some users have answered those questions."
 *
 * Nothing threw. A lookup that misses returns undefined, undefined renders as
 * nothing, and an empty chart looks exactly like a question nobody answered.
 * Measured by running one complete answer set through the real summariser in
 * both spellings: the website's gave {"start":"B"} and the app's gave
 * {"start":1}.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 * Two halves, because either alone passes while the bug is live.
 *
 * Behaviour: every spelling that has ever been stored resolves to the same
 * letter, and a complete answer set summarises identically whichever way its
 * forced choices are written. That is the half that proves a repair.
 *
 * Source: no surface may write its own spelling. A file that stores a forced
 * choice has to use the letters, and the admin has to read through the shared
 * function rather than comparing strings itself.
 */
import { readFileSync } from 'node:fs';

const fail = [];
const { forcedABValue, CONFLICT_QUESTIONS } = await import('../api/_conflict-questions.js');
const { summarizeConflict } = await import('../api/_lib/conflict-results.js');

/* ── EVERY SPELLING EVER STORED RESOLVES THE SAME WAY ──────────────────── */
for (const [raw, want] of [['A', 'A'], ['a', 'A'], [0, 'A'], ['0', 'A'],
                           ['B', 'B'], ['b', 'B'], [1, 'B'], ['1', 'B'],
                           [null, null], [undefined, null], ['', null], [2, null], ['x', null]]) {
  const got = forcedABValue(raw);
  if (got !== want) fail.push(`forcedABValue(${JSON.stringify(raw)}) is ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
}

/* ── THE SAME COUPLE, BOTH SPELLINGS, ONE ANSWER ───────────────────────── */
const ab = CONFLICT_QUESTIONS.filter((q) => q.kind === 'forcedAB').map((q) => q.id);
if (ab.length < 3) fail.push(`only ${ab.length} forced-choice questions found; this gate has lost its subject`);
const base = {};
for (const q of CONFLICT_QUESTIONS) {
  if (q.kind === 'scale') base[q.id] = 2;
  else if (q.kind === 'frequency') base[q.id] = 1;
  else if (q.kind === 'forcedAB') base[q.id] = 'B';
  else if (q.kind === 'pickOne') base[q.id] = (q.options || [])[0]?.label ?? (q.options || [])[0] ?? null;
  else if (q.kind === 'openText') base[q.id] = 'words';
  else if (q.kind === 'rank') base[q.id] = (q.options || []).map((o) => o.label ?? o);
}
const letters = summarizeConflict(base);
const numbers = summarizeConflict({ ...base, ...Object.fromEntries(ab.map((id) => [id, 1])) });
const lower = summarizeConflict({ ...base, ...Object.fromEntries(ab.map((id) => [id, 'b'])) });
if (!letters) fail.push('the letter-spelled answer set did not summarise; the fixture is incomplete, so nothing below was compared');
else {
  for (const [name, other] of [['the app\'s old numbers', numbers], ['lower case', lower]]) {
    if (!other) { fail.push(`${name} did not summarise at all`); continue; }
    if (JSON.stringify(other) !== JSON.stringify(letters)) {
      fail.push(`a couple answering in ${name} gets a different summary from one answering in letters: `
        + `${JSON.stringify(other.openings)} against ${JSON.stringify(letters.openings)}`);
    }
  }
}

/* ── NO SURFACE SPELLS IT ITSELF ───────────────────────────────────────── */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
const admin = strip(readFileSync('api/admin-explore.js', 'utf8'));
if (/raw === '[ab]'/.test(admin)) {
  fail.push("api/admin-explore.js compares a forced choice against 'a' or 'b' itself; read it through forcedABValue");
}
if (!admin.includes('forcedABValue')) fail.push('api/admin-explore.js no longer reads forced choices through forcedABValue');

const appFile = 'attune-app/src/components/conflict-exercise.tsx';
const app = strip(readFileSync(appFile, 'utf8'));
const block = app.slice(app.indexOf("q.kind === 'forcedAB'"));
if (/\[\['A', q\.a, 0\]/.test(block)) fail.push(`${appFile} stores a forced choice as 0 and 1 again; the letters are what every reader keys on`);

if (fail.length) {
  console.error('check-forced-choice-encoding FAILED');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log(`[check-forced-choice-encoding] ${ab.length} forced-choice questions: 13 spellings resolve to one letter, `
  + `a complete answer set summarises identically in letters, numbers and lower case, and no surface spells it itself.`);
