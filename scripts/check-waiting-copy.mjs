// Fails the build when a surface writes a waiting sentence instead of reading it.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// "This opens when you have both finished" was typed out by hand in 22 places
// across the website and the app. A couple moving between the dashboard, an
// exercise footer, a locked section and Settings was told the same thing four
// ways in four minutes, which reads as four different states rather than one.
//
// Nothing caused it. It is what happens when a sentence is needed at the point
// it is needed and there is nowhere to put it.
//
// Six situations, not 22. Ellie wrote one line for each. They live in
// api/_lib/waiting-copy.js, the app mirrors them in constants/waiting.ts
// because it cannot import from api/, and this checks three things:
//
//   1. the mirror matches the source, word for word;
//   2. neither surface contains one of the sentences as a literal;
//   3. both surfaces actually read the module, so it cannot be orphaned.
//
// It also carries the phrasings that were replaced, and fails if one comes
// back. That is not belt and braces: reverting a file is how the old wording
// returns, and the checks above cannot see it, because an old sentence is not
// one of the new ones and a file that stops importing the module looks the
// same as a file that never needed it. A revert during testing passed all
// three checks with the old Settings line sitting there.
//
// ── WHAT IT DOES NOT DO ────────────────────────────────────────────────────
// It cannot tell that a NEW waiting sentence has been invented in some other
// words. Nothing can. What it stops is these six drifting into seven, and the
// twenty-two that were there before coming back.

import { readFileSync, readdirSync, statSync } from 'fs';
import { WAITING, WAITING_SENTENCES } from '../api/_lib/waiting-copy.js';

const ROOT = new URL('..', import.meta.url).pathname;
const problems = [];

if (WAITING_SENTENCES.length < 5) {
  console.error('[check-waiting-copy] fewer than five sentences; refusing to pass.');
  process.exit(1);
}

// ── 1. The mirror says the same words ──────────────────────────────────────
const mirror = readFileSync(ROOT + 'attune-app/src/constants/waiting.ts', 'utf8');
for (const [key, text] of Object.entries(WAITING)) {
  if (!mirror.includes(text)) {
    problems.push(
      `the app's mirror is missing the ${key} sentence, so the two products\n`
      + `      say different things in the same situation:\n      "${text}"`);
  }
}
// And nothing extra: a sentence in the mirror that is not in the source is the
// same drift pointing the other way.
for (const m of mirror.matchAll(/^\s*[A-Z_]+: '([^']{25,})',$/gm)) {
  if (!WAITING_SENTENCES.includes(m[1])) {
    problems.push(`the app's mirror carries a sentence the server does not:\n      "${m[1]}"`);
  }
}

// ── 2. Nobody types one out ────────────────────────────────────────────────
const files = [['src/App.jsx', readFileSync(ROOT + 'src/App.jsx', 'utf8')]];
(function walk(dir, prefix) {
  for (const e of readdirSync(dir)) {
    const full = `${dir}/${e}`;
    if (statSync(full).isDirectory()) { walk(full, `${prefix}${e}/`); continue; }
    if (!/\.tsx?$/.test(e)) continue;
    if (`${prefix}${e}` === 'constants/waiting.ts') continue;   // the mirror itself
    files.push([`attune-app/src/${prefix}${e}`, readFileSync(full, 'utf8')]);
  }
})(ROOT + 'attune-app/src', '');

for (const [rel, text] of files) {
  for (const sentence of WAITING_SENTENCES) {
    if (!text.includes(sentence)) continue;
    problems.push(
      `${rel} writes a waiting sentence out instead of reading it:\n`
      + `      "${sentence.slice(0, 70)}..."`);
  }
}

/**
 * The wordings these six replaced. Any one of them reappearing is a revert.
 *
 * Not every one of the original 22: the ones that only differed by a name or a
 * section are covered by their stem here.
 */
const RETIRED = [
  'This opens when you have both finished',
  'This section opens when you have both finished',
  'This section opens once you have finished',
  'Results open once you have both finished',
  'Results open when both of you finish',
  'Your results open when both of you finish',
  'Your results open when you have both finished',
  'Once both of you complete your exercises',
  'Unlocks when both of you finish',
  'Unlocks once both of you finish',
  'Answer on your own. Results unlock',
  'Results unlock when both of you are done',
  'Your answers stay private until both of you are done',
  'This fills in as you finish the exercises',
  'Finish the exercise to open this',
  'Waiting on your partner',
];
for (const [rel, text] of files) {
  for (const dead of RETIRED) {
    if (!text.includes(dead)) continue;
    problems.push(
      `${rel} has a retired waiting phrasing back in it:\n      "${dead}"`);
  }
}

// ── 3. Both surfaces read it ───────────────────────────────────────────────
const site = files[0][1];
if (!/from ['"]\.\.\/api\/_lib\/waiting-copy\.js['"]/.test(site)) {
  problems.push('src/App.jsx does not import the waiting copy, so its sentences are its own.');
}
const appReaders = files.filter(([, t]) => /from '@\/constants\/waiting'/.test(t)).length;
if (appReaders < 5) {
  problems.push(`only ${appReaders} app screens read the waiting copy; there are more than that waiting.`);
}

if (problems.length) {
  console.error('[check-waiting-copy] the six waiting sentences are drifting apart again:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('They are Ellie\'s words and they live in api/_lib/waiting-copy.js.');
  process.exit(1);
}

console.log(
  `[check-waiting-copy] ${WAITING_SENTENCES.length} sentences, one source; `
  + `the app mirror matches and ${appReaders} app screens plus the website read it.`);
