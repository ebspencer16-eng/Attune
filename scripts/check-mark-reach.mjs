#!/usr/bin/env node
/**
 * A page can account for every mark anchored to it.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * A mark anchored to a results section is either drawn by a block on that
 * page, or the page knows it was not. Never neither. What it does about the
 * second case is the app's business; that it can tell the difference is this
 * file's.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * Ellie: "Not seeing the icon on the internal processing page that marks where
 * my note is. That keeps happening, we need to make sure the icons don't
 * randomly vanish."
 *
 * The marker draws from the paragraph holding the marked words. Verified
 * working on that exact page by making a mark and watching the marker appear.
 * Her note was in the "Side by side ... responses" disclosure, which is shut
 * by default, so the paragraph was not rendered and nothing on the page said
 * anything at all.
 *
 * "Keeps happening" is the part worth gating. There is more than one way for a
 * block to be absent: a shut disclosure, a copy edit that changed the words a
 * mark stores, prose that was never a <Prose>. Enumerating them would be a
 * list that goes stale, which is the failure this codebase is organised
 * against. So the rule is the other way round: every rendered block reports
 * what it drew, and anything left over is unplaced.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * By running it. The rule lives in attune-app/src/constants/mark-reach.ts with
 * no imports, so this strips its types with esbuild and executes both
 * functions over fixtures: a mark whose words are on screen, a mark whose
 * words are only inside a block that never rendered, a mark whose words were
 * edited out. A scanner matching on a name would pass on code that had stopped
 * working, which is exactly how the first version of this feature shipped.
 *
 * Then, separately, that the app is wired to it: Prose claims, the provider
 * reports, and the one control that hides prose reads the answer.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the marker is in the right place on the paragraph, or looks right.
 * That is check-track-marks and a pair of eyes. This is only about a mark
 * being accounted for at all.
 */

import { readFileSync } from 'fs';
import { transformSync } from 'esbuild';

const ROOT = new URL('..', import.meta.url).pathname;
const problems = [];

// ── 1. The rule itself, executed ───────────────────────────────────────────
const src = readFileSync(`${ROOT}attune-app/src/constants/mark-reach.ts`, 'utf8');
const compiled = transformSync(src, { loader: 'ts', format: 'cjs' }).code;

let marksIn;
let unplacedMarks;
try {
  const mod = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', compiled)(mod, mod.exports);
  ({ marksIn, unplacedMarks } = mod.exports);
  if (typeof marksIn !== 'function' || typeof unplacedMarks !== 'function') {
    throw new Error('marksIn and unplacedMarks are not both exported');
  }
} catch (e) {
  // Throwing rather than passing: a gate that has lost its subject must never
  // report success.
  console.error('[check-mark-reach] could not evaluate the rule:', e.message);
  process.exit(1);
}

/** One page: the blocks that actually rendered, and the marks anchored to it. */
function placeAll(rendered, marks) {
  const placed = [];
  for (const text of rendered) for (const m of marksIn(text, marks)) placed.push(m.id);
  return unplacedMarks(marks, placed);
}

const INTRO = 'How you handle feelings before sharing thoughts aloud.';
const HIDDEN = 'When your partner needs alone time, your instinct is:';

const CASES = [
  {
    name: 'a mark on a paragraph that is on screen is placed',
    rendered: [INTRO],
    marks: [{ id: 'a', text: 'How you handle feelings' }],
    unplaced: [],
  },
  {
    name: 'a mark inside a collapsed section is unplaced',
    rendered: [INTRO],
    marks: [{ id: 'b', text: 'your instinct is' }],
    unplaced: ['b'],
  },
  {
    name: 'and is placed once that section renders',
    rendered: [INTRO, HIDDEN],
    marks: [{ id: 'b', text: 'your instinct is' }],
    unplaced: [],
  },
  {
    name: 'a mark whose words were edited out is unplaced',
    rendered: ['How you sit with feelings before saying them out loud.'],
    marks: [{ id: 'c', text: 'How you handle feelings' }],
    unplaced: ['c'],
  },
  {
    name: 'two marks in one paragraph are both placed',
    rendered: [INTRO],
    marks: [
      { id: 'd', text: 'How you handle' },
      { id: 'e', text: 'thoughts aloud' },
    ],
    unplaced: [],
  },
  {
    // Not hypothetical: a mark is stored as the words it was made on, and a
    // selection that came back empty would otherwise be claimed by every
    // paragraph on the page, because every string contains the empty string.
    name: 'a mark with no words is claimed by nothing',
    rendered: [INTRO, HIDDEN],
    marks: [{ id: 'f', text: '' }],
    unplaced: ['f'],
  },
  {
    name: 'a page with no marks has nothing unplaced',
    rendered: [INTRO],
    marks: [],
    unplaced: [],
  },
];

for (const c of CASES) {
  const got = placeAll(c.rendered, c.marks).map((m) => m.id);
  const want = c.unplaced;
  if (got.join(',') !== want.join(',')) {
    problems.push(`${c.name}: expected unplaced [${want}], got [${got}]`);
  }
}

// ── 2. And the app is wired to it ──────────────────────────────────────────
//
// Three joins, named rather than counted, because each is a place the rule
// could be true and unused. The first version of this feature had the matching
// inline in Prose, where nothing could see it.
const WIRING = [
  {
    file: 'attune-app/src/components/annotation-context.tsx',
    needs: [
      [/from '@\/constants\/mark-reach'/, 'imports the rule'],
      [/marksIn\(/, 'a block finds its marks through marksIn'],
      [/unplacedMarks\(/, 'the provider asks what is left over'],
      [/claim\(/, 'a block reports what it drew'],
    ],
  },
  {
    file: 'attune-app/src/components/results.tsx',
    needs: [
      [/const \{ unplaced \} = useAnnotations\(\)/, 'the disclosure reads the answer'],
    ],
  },
];

for (const { file, needs } of WIRING) {
  const text = readFileSync(ROOT + file, 'utf8');
  for (const [re, what] of needs) {
    if (!re.test(text)) problems.push(`${file} no longer ${what}.`);
  }
}

if (problems.length) {
  console.error('[check-mark-reach] a mark could go missing without the page knowing:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('A marker that does not draw reads as the feature being broken, and');
  console.error('there is more than one way for the block holding it to be absent.');
  console.error('See attune-app/src/constants/mark-reach.ts.');
  process.exit(1);
}

console.log(
  `[check-mark-reach] ${CASES.length} placement cases through the app's own rule; `
  + 'every mark is either drawn or reported unplaced.',
);
