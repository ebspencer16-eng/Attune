#!/usr/bin/env node
/**
 * The shared insight reads the same from a phone and from a laptop.
 *
 * ── WHY THERE ARE TWO COPIES ──────────────────────────────────────────────
 * An Expo project cannot import from `api/`, so the app builds its share text
 * in `attune-app/src/api/client.ts` and the website builds it from
 * `api/_insights.js`. That is the wall most of this directory is about.
 *
 * ── WHAT IS COMPARED, AND WHY IT IS RUN RATHER THAN READ ──────────────────
 * The answers, over quotations that actually ship, plus the shapes a regex
 * would miss: no citation, a citation of only spaces, a body with its own line
 * breaks. CLAUDE.md's rule for this kind of gate is that it has to execute the
 * copy that ships, so the app's function is lifted out of its TypeScript, its
 * types stripped with esbuild, and run. Comparing the source text would pass on
 * two functions that are spelled alike and behave differently, which is the
 * opposite of what is wanted.
 *
 * The blank line is the part worth protecting. It is what separates a quotation
 * from the person who said it once the text is in a message, and a surface that
 * drops it attributes the quotation on the same line as the quotation.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The url appended beside the text, which is the share sheet's own field on the
 * app and `window.location.origin` on the website, and is not part of this
 * string on either side.
 *
 * Whether the wording of a quotation is right. check-quotes-verbatim opens the
 * source for that.
 */

import { readFileSync } from 'node:fs';

import { transformSync } from 'esbuild';

import { INSIGHTS, insightOfTheDay, insightShareText } from '../api/_insights.js';

const ROOT = new URL('..', import.meta.url).pathname;

/**
 * The app's own function, lifted out of client.ts by brace depth.
 *
 * It throws rather than passing if it cannot find it: a gate that has lost its
 * subject must never report success.
 */
function appShareText() {
  const src = readFileSync(`${ROOT}attune-app/src/api/client.ts`, 'utf8');
  const at = src.indexOf('export function insightShareText');
  if (at === -1) {
    throw new Error('attune-app/src/api/client.ts no longer exports insightShareText.'
      + ' Refusing to pass: a gate that has lost its subject must never report success.');
  }
  const open = src.indexOf('{', src.indexOf(')', at));
  let depth = 0;
  let end = -1;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  if (end === -1) throw new Error('could not find the end of the app\'s insightShareText.');
  const ts = src.slice(at, end).replace(/^export\s+/, '');
  const js = transformSync(`${ts}\nexport { insightShareText };`, { loader: 'ts', format: 'cjs' }).code;
  const mod = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', js)(mod, mod.exports);
  const fn = mod.exports.insightShareText;
  if (typeof fn !== 'function') throw new Error('the app\'s insightShareText did not evaluate.');
  return fn;
}

const theirs = appShareText();

/**
 * What the surfaces actually share, and then the shapes that are not in the list.
 *
 * ── THE FIRST VERSION OF THIS TESTED NOTHING ──────────────────────────────
 * It mapped `INSIGHTS` straight into cases, and no entry in that list carries a
 * `source`: the citation is built on the way out by `insightOfTheDay`, from the
 * author, work and edition. So all forty-nine "real" cases were exercising the
 * no-citation branch, and the summary line said "including every quotation that
 * ships", which is the kind of specific number that stops anyone looking.
 *
 * It is driven through `insightOfTheDay` now, one day per rotation step, which
 * is the object both surfaces are handed and the only one they ever share.
 *
 * The synthetic cases stay. A citation that is absent, blank, or whitespace is
 * where two implementations of "is there a citation" differ, and none of those
 * occur in the rotation.
 */
const DAY = 86400000;
const days = [];
for (let d = 0; d < INSIGHTS.length + 3; d += 1) days.push(insightOfTheDay(new Date(d * DAY)));
const cited = days.filter((r) => String(r.source || '').trim()).length;
if (!cited) {
  console.error('[check-insight-share] not one insight in the rotation carries a citation.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

const cases = [
  ...days.map((r) => ({ body: r.body, source: r.source })),
  { body: 'A sentence.', source: null },
  { body: 'A sentence.', source: undefined },
  { body: 'A sentence.', source: '' },
  { body: 'A sentence.', source: '   ' },
  { body: 'A sentence.', source: '  Someone, A Book  ' },
  { body: 'Two lines.\nSecond line.', source: 'Someone, A Book' },
  { body: '', source: 'Someone, A Book' },
];

const bad = [];
for (const c of cases) {
  const mine = insightShareText(c);
  const other = theirs(c);
  if (mine !== other) {
    bad.push(
      `source ${JSON.stringify(c.source)} over ${JSON.stringify(String(c.body).slice(0, 40))}\n`
      + `      server: ${JSON.stringify(mine)}\n`
      + `      app:    ${JSON.stringify(other)}`);
  }
}

if (bad.length) {
  console.error('\n check-insight-share: the two surfaces share an insight differently.\n');
  for (const b of bad) console.error(`  ✗ ${b}\n`);
  console.error('  api/_insights.js is the one the website reads and'
    + ' attune-app/src/api/client.ts is\n  the one the app reads. They cannot import each'
    + ' other, so they are held equal here.\n');
  process.exit(1);
}

console.log(`[check-insight-share] ${cases.length} cases driven through insightOfTheDay`
  + ` (${cited} of them carrying a real citation) plus 7 shapes the rotation never produces:`
  + ' the app and the website build the same share text, blank line and all.');
