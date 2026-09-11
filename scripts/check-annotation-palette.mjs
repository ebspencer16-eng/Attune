// Fails the build when the app's annotation palette stops matching the
// server's.
//
// ── WHY A GATE AND NOT AN IMPORT ───────────────────────────────────────────
// A highlight stores a colour KEY, not a colour. Both surfaces turn that key
// into an ink and a wash, so a key that resolves differently means a mark made
// on a laptop is a different colour on a phone, which reads as a different
// mark rather than as a bug.
//
// The server validates against its list and refuses anything else, so the two
// lists disagreeing does not corrupt data: it makes the app unable to save a
// colour it offers, or unable to draw one it stored. Both are silent.
//
// The app cannot import from api/. Sending five colours on every payload to
// avoid a gate would be worse than the gate, and this is the same arrangement
// as api/_lib/track-marks.js.
//
// It also checks the sentence splitter, because that is the other half of a
// mark finding its way home: a mark is matched to its sentence by text, so a
// splitter that loses or alters a character orphans every mark on the block.

import { readFileSync } from 'fs';
import {
  ANNOTATION_COLORS, ANNOTATION_KINDS, DEFAULT_ANNOTATION_COLOR,
} from '../api/_lib/annotations.js';

const ROOT = new URL('..', import.meta.url).pathname;
const app = readFileSync(ROOT + 'attune-app/src/constants/annotations.ts', 'utf8');

const problems = [];

// ── The palette, key by key, field by field ────────────────────────────────
for (const col of ANNOTATION_COLORS) {
  const entry = app.match(
    new RegExp(`\\{\\s*key:\\s*'${col.key}',[^}]*\\}`),
  );
  if (!entry) {
    problems.push(
      `the app has no '${col.key}' colour. The server offers it, so a mark made\n`
      + '      on the website in that colour has nothing to draw it with here.');
    continue;
  }
  for (const field of ['name', 'ink', 'wash']) {
    const m = entry[0].match(new RegExp(`${field}:\\s*'([^']*)'`));
    if (!m) { problems.push(`the app's '${col.key}' has no ${field}`); continue; }
    if (m[1] !== col[field]) {
      problems.push(
        `'${col.key}' ${field} is ${m[1]} in the app and ${col[field]} on the server.\n`
        + '      The same mark would be two different colours on the two products.');
    }
  }
}

// And nothing extra: a colour the app offers that the server refuses is a
// picker option that fails to save.
for (const m of app.matchAll(/\{\s*key:\s*'(\w+)',/g)) {
  if (ANNOTATION_COLORS.some((c) => c.key === m[1])) continue;
  problems.push(
    `the app offers a '${m[1]}' colour the server does not. Choosing it returns\n`
    + '      "invalid annotation kind or colour" and the mark is never made.');
}

for (const kind of ANNOTATION_KINDS) {
  if (app.includes(`'${kind}'`)) continue;
  problems.push(`the app does not know the '${kind}' annotation kind.`);
}

if (!app.includes(`'${DEFAULT_ANNOTATION_COLOR}'`)) {
  problems.push(`the app's fallback colour is not ${DEFAULT_ANNOTATION_COLOR}, so an unknown key resolves differently on each surface.`);
}

/**
 * The fallback has to be a colour that exists.
 *
 * The check above proves the two surfaces agree on which key is the fallback.
 * Agreeing on a key that was retired from the palette is the failure it cannot
 * see, and it is the worse one: annotationColor() returns undefined on both,
 * the app asserts non-null on it, and reading `tone.ink` throws. That is not a
 * missing colour on one mark. It is the results screen going white for anyone
 * who has ever marked a sentence, and only for them.
 *
 * Retiring a colour is the ordinary way to get here: five keys, one of them
 * also named somewhere else as the default, and nothing connecting the two.
 */
if (!ANNOTATION_COLORS.some((c) => c.key === DEFAULT_ANNOTATION_COLOR)) {
  problems.push(
    `the fallback colour '${DEFAULT_ANNOTATION_COLOR}' is not in the palette, so\n`
    + '      annotationColor() returns undefined for every unknown key and the\n'
    + '      results screen throws for anyone who has marked a sentence.');
}

// ── The tokeniser must not alter the text ──────────────────────────────────
// A mark is stored as the text it covers and found again by matching that text
// inside the paragraph. Gain or lose a character and every mark on that block
// is orphaned: stored, counted, and invisible.
const src = readFileSync(ROOT + 'attune-app/src/components/annotatable.tsx', 'utf8');
const fnSrc = src.slice(src.indexOf('export function tokenize'));
const bodyStart = fnSrc.indexOf('{');
const body = fnSrc.slice(bodyStart + 1, fnSrc.indexOf('\n}'));
let tokenize;
try {
  // eslint-disable-next-line no-new-func
  tokenize = new Function('text', body.replace(/: string\[\]/g, ''));
} catch (e) {
  problems.push(`cannot evaluate tokenize to check it: ${e.message}`);
}

if (tokenize) {
  const cases = [
    'One thing. Another thing that is long enough to stand on its own. A third one here.',
    'She said e.g. this and that, which runs on for a while without stopping anywhere.',
    'A score of 3.5 means something specific, and the sentence keeps going after it.',
    'Short. Also short.',
    'Trailing spaces matter too.   ',
    '',
    'No terminator at all',
  ];
  for (const c of cases) {
    let out;
    try { out = tokenize(c); } catch (e) {
      problems.push(`tokenize threw on ${JSON.stringify(c.slice(0, 40))}: ${e.message}`);
      continue;
    }
    if (out.join('') !== c) {
      problems.push(
        `tokenize is not lossless on ${JSON.stringify(c.slice(0, 40))}.\n`
        + '      A mark is found again by matching its text inside the paragraph, so a\n'
        + '      character gained or lost orphans every mark on that block: stored,\n'
        + '      counted, and invisible.');
    }
    // And a token must never be empty: an empty span is an untappable word,
    // which is a word a reader cannot select.
    if (out.some((t) => t === '')) {
      problems.push(`tokenize produced an empty token on ${JSON.stringify(c.slice(0, 40))}.`);
    }
  }
}

if (problems.length) {
  console.error('[check-annotation-palette] the two surfaces would draw marks differently:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(
  `[check-annotation-palette] ${ANNOTATION_COLORS.length} colours and `
  + `${ANNOTATION_KINDS.length} kinds agree; the word split is lossless.`);
