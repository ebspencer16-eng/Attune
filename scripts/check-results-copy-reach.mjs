// Fails the build when results copy is typed into src/App.jsx where the app
// cannot read it.
//
// ── WHY THIS KEEPS HAPPENING ───────────────────────────────────────────────
// The website's results are React DOM inside src/App.jsx. Everything the two
// surfaces share has to go through api/, because the app is a separate project
// that cannot import from the website's bundle.
//
// So a sentence typed directly into a results page is a sentence the app will
// never show, and nothing errors: the app renders the page without it and
// looks complete. In one week that produced all of these:
//
//   the two paragraphs of small print under the couple map
//   the five answer labels for the conflict overview chart
//   the four headings Side by Side groups its answers under
//   the two headings on What You Each Wrote
//   "Talk about it", above every intimacy prompt
//   the heading and the line under it on all three Reflection pages
//
// Each was found by Ellie reading both screens. The worst was the ratings
// page, where the app had invented a heading of its own because the real one
// was somewhere it could not reach, so the two products called the same page
// different things.
//
// check-prose-reach.mjs covers api/_content, the versioned copy library. This
// covers the other direction: copy that never got into a shared file at all.
//
// ── HOW IT DECIDES ─────────────────────────────────────────────────────────
// Inside the results renderer only, any JSX text node long enough to be a
// sentence rather than a word on a button. Short labels are not flagged; the
// exemptions below cover the few long ones that are genuinely website chrome.
//
// It does NOT ask whether the same text also exists under api/. The first
// version did, and a planted regression walked straight through it: putting a
// sentence back inline passed, because the sentence was also in the shared
// module it had just been moved to. Reachable-somewhere is not the property
// worth checking. The property is that the website reads it from the shared
// module, and the way to check that is that the literal is not here at all.

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;

const read = (dir, match) => {
  const out = [];
  (function walk(d) {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (match.test(p)) out.push(readFileSync(p, 'utf8'));
    }
  })(dir);
  return out.join('\n');
};

const site = readFileSync(join(ROOT, 'src/App.jsx'), 'utf8');
const api = read(join(ROOT, 'api'), /\.js$/);

/**
 * Long strings that belong to the website and only the website.
 *
 * Each is chrome for a control the app does not have, not something a reader
 * is told about their relationship. Exempting by exact text rather than by
 * pattern, so a new sentence cannot slip in behind one of these.
 */
const WEBSITE_ONLY = [
  // The inline storycard reel. The app's reel is a full-screen modal with its
  // own controls and a native share sheet, so neither sentence describes it.
  'Swipe through each card. Download any to share or save.',
  'Post it to your stories or send it to a friend.',
  // The website's fallback when a couple type cannot be resolved. The app has
  // its own waiting states for this, from the server's own reasons.
  'Complete all exercises to see your couple type.',
  // The website's download fallback for a browser that cannot save the card.
  // The app shares through the system sheet and has no equivalent failure.
  'Download not available. Take a screenshot instead.',
];

const lines = site.split('\n');
const start = lines.findIndex((l) => l.includes('function UnifiedResults('));
const end = lines.findIndex((l, i) => i > start && l.includes('// ── PAGE: WHAT COMES NEXT'));
if (start === -1) {
  console.error('[check-results-copy-reach] cannot find UnifiedResults; refusing to pass.');
  process.exit(1);
}

const problems = [];
lines.slice(start, end > start ? end : start + 4000).forEach((line, i) => {
  if (/^\s*(\/\/|\*)/.test(line)) return;

  /**
   * Two shapes, because the first version only knew one.
   *
   * A JSX text node, `>Some sentence.<`, and a quoted string inside an
   * expression, which is how a conditional writes copy:
   *
   *   {variant === "married" ? "Based on how things are now." : "..."}
   *
   * That one sat in src/App.jsx for as long as the intimacy glance page has
   * existed, and this gate walked past it twice while reporting all clear,
   * because it is not a text node. The app had no line under the names as a
   * result. A checker that knows one of the two ways to write a sentence
   * certifies the other.
   */
  const candidates = [
    ...[...line.matchAll(/>([A-Z][^<>{}]{34,220}?)</g)].map((m) => m[1]),
    ...[...line.matchAll(/["']([A-Z][^"'<>{}]{34,220}?)["']/g)].map((m) => m[1]),
  ];

  for (const raw of candidates) {
    const text = raw.trim();
    if (!/[a-z]{3}/.test(text)) continue;            // not prose
    if (WEBSITE_ONLY.includes(text)) continue;
    const alsoShared = api.includes(text.slice(0, 40).replace(/&amp;/g, '&'));
    problems.push(
      `src/App.jsx:${start + i + 1}\n`
      + `      "${text.slice(0, 96)}"\n`
      + (alsoShared
        ? '      is typed in here AND exists under api/. Two copies of a sentence is\n'
          + '      how the two products end up saying different things. Read the shared one.'
        : '      is typed into the website\'s results, so it exists nowhere the app can\n'
          + '      read it and the app will never show it.'));
  }
});

if (problems.length) {
  console.error('[check-results-copy-reach] results copy the app cannot reach:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('Move it into a module under api/ and send it, the way MAP_CAPTION and');
  console.error('REFLECTION_PAGES are sent. If it is genuinely website chrome, add it to');
  console.error('WEBSITE_ONLY in this file with the reason.');
  process.exit(1);
}

console.log(
  `[check-results-copy-reach] every sentence in the website's results is reachable `
  + `by the app; ${WEBSITE_ONLY.length} website-only strings exempted by name.`);
