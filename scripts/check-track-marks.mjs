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
const app = readFileSync(ROOT + 'attune-app/src/components/results.tsx', 'utf8');

const problems = [];

for (const [name, want] of Object.entries(TRACK)) {
  const m = app.match(new RegExp(`^const ${name} = (-?[0-9.]+);`, 'm'));
  if (!m) {
    problems.push(
      `attune-app/src/components/results.tsx does not declare ${name}.\n`
      + `      api/_lib/track-marks.js says it is ${want}. Either the app stopped\n`
      + '      using it, in which case remove it from that file, or it was renamed.');
    continue;
  }
  const got = Number(m[1]);
  if (got !== want) {
    problems.push(
      `${name} is ${got} in the app and ${want} in api/_lib/track-marks.js.\n`
      + '      Two products cannot round the placement rule differently: the same\n'
      + '      couple would read as agreeing on one and not on the other.');
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
