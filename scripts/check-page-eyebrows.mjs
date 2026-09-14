// Fails the build when a results page puts its own section name above its title.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// Ellie asked for five named eyebrows to go. Five went. Then she found more:
//
//   "Noticed the 'how you communicate' and 'what you expect' eyebrows on the
//    results at a glance pages on the site. I want no page eyebrows throughout
//    the results experience."
//
// The ask had always been the general one. It was worked as the five it named,
// because nothing checked the rest, and "removed" was reported on the strength
// of five greps. This is that check.
//
// ── THE RULE ───────────────────────────────────────────────────────────────
// No uppercase label inside the results experience may be the name of a
// results section. The reader arrived through a nav that names the section;
// repeating it directly above the page's own title says it twice.
//
// The section names come from api/_lib/results-sections.js, so renaming a
// section moves this automatically and there is no second list.
//
// ── AND THE SHAPE, NOT ONLY THE WORDS ──────────────────────────────────────
// The first version matched the words between the tags, so it saw
//
//     <div ...uppercase...>PHYSICAL INTIMACY</div>
//
// and missed
//
//     <div ...uppercase...>{REFLECTION_PAGES.eyebrow}</div>
//
// which is the same thing said through a constant. Two reflection pages
// carried exactly that, months after Ellie asked for page eyebrows to go, and
// this reported clean the whole time. Planted back after they were removed,
// the gate still passed, which is how it was found.
//
// So it resolves what it can: the names a constant holds are read from the
// module that holds them, and a small round dot next to an uppercase label
// above a page heading is reported whatever the label says, because that
// arrangement is the thing she asked to be rid of.
//
// ── WHAT IT DELIBERATELY ALLOWS ────────────────────────────────────────────
// Labels that name a BLOCK rather than the page: "Already aligned",
// "Conversations to have", "One thing to try", "Repair", "Where you each
// land". Those are headings inside a page and are not what was asked about.
// The test is whether the words are a section's name.
//
// Storycards are out of scope. They are a shareable reel with no nav around
// them, so a card naming its own subject is the only thing that says what it
// is.

import { readFileSync } from 'fs';
import { resultsNav } from '../api/_lib/results-sections.js';
import { REFLECTION_PAGES } from '../api/_lib/reflection-results.js';

const ROOT = new URL('..', import.meta.url).pathname;

/** Every section and group name the nav shows, from the server's own list. */
const NAMES = new Set();
for (const g of resultsNav({ caps: {}, all: true }) || []) {
  if (g.label) NAMES.add(g.label.toLowerCase());
  for (const c of g.children || []) if (c.label) NAMES.add(c.label.toLowerCase());
}
/**
 * Section names a page might print through a constant rather than as text.
 * Resolved here so a name reached through a registry is not invisible.
 */
const NAMED_CONSTANTS = {
  'REFLECTION_PAGES.eyebrow': REFLECTION_PAGES.eyebrow,
  'REFLECTION_PAGES.plan.eyebrowOwn': REFLECTION_PAGES.plan?.eyebrowOwn,
};

if (NAMES.size < 5) {
  console.error(`[check-page-eyebrows] only found ${NAMES.size} section names; refusing to pass.`);
  process.exit(1);
}

const problems = [];

// ── The website ────────────────────────────────────────────────────────────
// Storycards live in WrappedCard blocks; everything from the first one on is
// the reel and is out of scope.
const site = readFileSync(ROOT + 'src/App.jsx', 'utf8');
const reelAt = site.indexOf('<WrappedCard');
const inScope = reelAt === -1 ? site : site.slice(0, reelAt);
inScope.split('\n').forEach((line, i) => {
  if (!/textTransform:\s*"uppercase"/.test(line)) return;

  // The words, when they are words.
  const m = line.match(/>([A-Za-z][^<>{}]{2,40})</);
  if (m && NAMES.has(m[1].trim().toLowerCase())) {
    problems.push(`src/App.jsx:${i + 1} has a page eyebrow reading "${m[1].trim()}"`);
    return;
  }

  // The words, when they are a constant.
  const c = line.match(/>\{([A-Z][\w.]*)\}</);
  if (c) {
    const value = NAMED_CONSTANTS[c[1]];
    if (value && NAMES.has(String(value).toLowerCase())) {
      problems.push(`src/App.jsx:${i + 1} has a page eyebrow reading "${value}", through ${c[1]}`);
      return;
    }
  }

  // The shape, whatever it says: a small round dot immediately followed by an
  // uppercase tracked label. That is the row, and it is what was asked about.
  if (/borderRadius:\s*"50%"[^>]*\/>\s*<div style=\{\{[^}]*textTransform:\s*"uppercase"/.test(line)) {
    problems.push(`src/App.jsx:${i + 1} has the page dot and eyebrow row above a heading`);
  }
});

// ── The app ────────────────────────────────────────────────────────────────
const app = readFileSync(ROOT + 'attune-app/src/components/results.tsx', 'utf8');
const conflict = readFileSync(ROOT + 'attune-app/src/components/conflict-results.tsx', 'utf8');
for (const [name, text] of [['results.tsx', app], ['conflict-results.tsx', conflict]]) {
  text.split('\n').forEach((line, i) => {
    if (!/Type\.eyebrow/.test(line)) return;
    const m = line.match(/>([A-Za-z][^<>{}]{2,40})</);
    if (!m) return;
    if (!NAMES.has(m[1].trim().toLowerCase())) return;
    problems.push(`attune-app/src/components/${name}:${i + 1} has a page eyebrow reading "${m[1].trim()}"`);
  });
}

if (problems.length) {
  console.error('[check-page-eyebrows] a results page names its own section above its title:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('The nav the reader arrived through already says which section this is.');
  process.exit(1);
}

console.log(`[check-page-eyebrows] no results page repeats its section name; ${NAMES.size} names checked.`);
