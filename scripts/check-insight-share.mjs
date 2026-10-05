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

// ── AND WHAT THE SHEET ACTUALLY CARRIES ─────────────────────────────────────
/**
 * Ellie: "I want the message to be titled Attune Relationships Insight of the
 * Day, and include a link to the site, but I want the image to be a picture of
 * the insight of the day storycard that people can view, download, screenshot,
 * etc. I want that storycard to be visible in the text, not just the written
 * quote."
 *
 * The half above is about the WORDS being the same on both surfaces. This half
 * is about what goes with them, and it is here rather than in a file of its own
 * because two gates named after one subject is how they drift.
 *
 * Three things, each with its own way of quietly not happening: the title is a
 * default somebody overrides at one call site and not the other; the link
 * disappears because iOS takes one url and the picture becomes it; the picture
 * never arrives because the card it photographs is not on screen.
 */
{
  const readFile = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
  const bare = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');
  const TITLE = 'Attune Relationships: Insight of the Day';

  const cards = readFile('attune-app/src/components/highlight-cards.tsx');
  if (!/INSIGHT_SHARE_FILE = '[^']+'/.test(cards)) {
    bad.push('no file declares the picture\'s name.');
  }
  if (/INSIGHT_SHARE_FILE = '[^']*:/.test(cards)) {
    bad.push('the picture\'s name has a colon in it. It is a path on disk and a colon is drawn'
      + ' as a slash, so the name arrives wrong.');
  }
  if (!cards.includes(`'${TITLE}'`)) {
    bad.push(`no file declares the title "${TITLE}". She named it; it is not a default to drift`
      + ' from.');
  }

  for (const [rel, where] of [
    ['attune-app/src/components/highlight-cards.tsx', 'the storycard view'],
    ['attune-app/src/app/resources.tsx', 'the Learn banner'],
  ]) {
    const src = bare(readFile(rel));
    const at = src.indexOf('Share the insight of the day');
    if (at === -1) {
      bad.push(`${rel} no longer shares the insight (${where}).`);
      continue;
    }
    const open = src.lastIndexOf('<ShareButton', at);
    const close = src.indexOf('/>', at);
    const el = open === -1 || close === -1 ? '' : src.slice(open, close);
    if (!/title=\{INSIGHT_SHARE_TITLE\}/.test(el)) {
      bad.push(`${where} does not title the share INSIGHT_SHARE_TITLE, so one of the two places`
        + ' says something else.');
    }
    if (!/capture=\{/.test(el)) {
      bad.push(`${where} shares the insight with no card to photograph, so it sends the quote as`
        + ' text. "I want that storycard to be visible in the text, not just the written quote."');
    }
    /**
     * ── THE MESSAGE IS THE TITLE, AND NOTHING ELSE GOES ───────────────────
     * Ellie, having seen the first version: "I don't want the quote and
     * citation written out in the message as well, and I don't want to include
     * the link to the site since the insight pic has that anyways."
     *
     * The card carries the quotation, the citation and the address. Anything of
     * those in the text is the same words twice, and the first version sent all
     * three. This rule used to be the opposite, which is why it is spelled out:
     * a url here is a regression, not a feature coming back.
     */
    if (!/message=\{INSIGHT_SHARE_TITLE\}/.test(el)) {
      bad.push(`${where} sends something other than the title as the message. The picture carries`
        + ' the quotation, the citation and the link; the words beside it are the title.');
    }
    if (/\burl=\{/.test(el)) {
      bad.push(`${where} sends an address alongside the picture. She asked for it gone: "I don't`
        + ' want to include the link to the site since the insight pic has that anyways."');
    }
    if (!/pictureName=\{INSIGHT_SHARE_FILE\}/.test(el)) {
      bad.push(`${where} does not name the picture, so the sheet shows the capture's temporary`
        + ' filename: "the title is a long string of letters and numbers".');
    }
  }

  const btn = bare(readFile('attune-app/src/components/share-button.tsx'));
  if (!/captureRef\(/.test(btn)) bad.push('share-button.tsx captures nothing, so no picture can go.');
  if (!/picture && url \?[^\n]*\$\{url\}/.test(btn)) {
    bad.push('share-button.tsx does not put the address into the message when it sends a picture.'
      + ' iOS takes one url and the picture is it, so a link left in that slot never leaves.'
      + ' This is for the callers that DO send one; the insight is not one of them.');
  }
  if (!/fileName: pictureName/.test(btn)) {
    bad.push('share-button.tsx does not pass the picture\'s name to captureRef, so the sheet'
      + ' falls back to the temporary filename it was given.');
  }
  if (!/url: picture \|\| url/.test(btn)) {
    bad.push('share-button.tsx does not prefer the picture for the url slot, so the card is'
      + ' captured and then not sent.');
  }

  const at = cards.indexOf('export function InsightCardShot');
  if (at === -1) {
    bad.push('InsightCardShot is gone, so the Learn banner has no card to photograph.');
  } else {
    const body = bare(cards.slice(at, at + 1600));
    if (!/left: -\d{4,}/.test(body)) {
      bad.push('InsightCardShot is not off the edge of the screen, so the invisible copy is'
        + ' visible.');
    }
    if (/display: 'none'|opacity: 0\b/.test(body)) {
      bad.push('InsightCardShot is hidden with display or opacity. A view with no layout has'
        + ' nothing to capture, which is why it is moved rather than hidden.');
    }
    if (!/pointerEvents="none"/.test(body)) {
      bad.push('InsightCardShot takes touches, so an invisible card is in front of something.');
    }
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
console.log('  and both places that share it send the storycard as a picture, titled as she asked,'
  + ' with the title as the only words beside it and the picture named so the sheet'
  + ' does not show a temporary filename.');
