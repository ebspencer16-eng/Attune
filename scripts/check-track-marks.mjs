// Fails the build when the app's mark-placement constants stop matching
// api/_lib/track-marks.js.
//
// ── WHY A GATE AND NOT AN IMPORT ───────────────────────────────────────────
// Every scale in the results puts two dots on one line, and when the two land
// in nearly the same place they have to be separated or they print on top of
// each other. The page then says two people answered identically when they did
// not, which is the one thing these charts exist to show.
//
// The rule is four numbers. The website imports them. The app cannot: it is a
// separate Expo project that does not build against api/, and sending four
// integers on every results payload to avoid a gate would be worse than the
// gate. So the app names them and this checks the names still agree.
//
// The app's own comment already said these were the website's numbers and were
// kept by hand. This is that comment made enforceable.

import { readFileSync } from 'fs';
import * as TRACK from '../api/_lib/track-marks.js';

const ROOT = new URL('..', import.meta.url).pathname;

/**
 * Both files that place a mark: the results pages and the storycards.
 *
 * It was only the first. The storycards are their own renderer and had their
 * own numbers, and one of them disagreed: the card divided a score by 4 after
 * subtracting 1 while the website's copy of the same card divided by 5, so the
 * same answer sat in two different places on what is meant to be one card.
 */
const FILES = [
  'attune-app/src/components/results.tsx',
  'attune-app/src/components/highlight-cards.tsx',
];
const sources = FILES.map((f) => ({ file: f, text: readFileSync(ROOT + f, 'utf8') }));

const problems = [];

for (const [name, want] of Object.entries(TRACK)) {
  const seen = sources
    .map(({ file, text }) => {
      const m = text.match(new RegExp(`^const ${name} = (-?[0-9.]+);`, 'm'));
      return m ? { file, got: Number(m[1]) } : null;
    })
    .filter(Boolean);

  if (!seen.length) {
    problems.push(
      `no file in the app declares ${name}.\n`
      + `      api/_lib/track-marks.js says it is ${want}. Either the app stopped\n`
      + '      using it, in which case remove it from that file, or it was renamed.');
    continue;
  }
  for (const { file, got } of seen) {
    if (got !== want) {
      problems.push(
        `${name} is ${got} in ${file} and ${want} in api/_lib/track-marks.js.\n`
        + '      Two products cannot round the placement rule differently: the same\n'
        + '      couple would read as agreeing on one and not on the other.');
    }
  }
}

// The website must be reading the module rather than its own numbers, or there
// are still two copies and this only checks one of them.
const site = readFileSync(ROOT + 'src/App.jsx', 'utf8');
if (!/from ["'][^"']*track-marks\.js["']/.test(site)) {
  problems.push(
    'src/App.jsx does not import api/_lib/track-marks.js, so the website is\n'
    + '      still carrying its own copy of these numbers and this gate is only\n'
    + '      watching one of the two surfaces.');
}

if (problems.length) {
  console.error('[check-track-marks] the two surfaces place marks differently:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(
  `[check-track-marks] ${Object.keys(TRACK).length} placement values agree; `
  + 'the website imports them and the app matches.');
