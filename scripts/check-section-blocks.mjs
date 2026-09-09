// Fails the build when the two results experiences stop containing the same
// things.
//
// ── THE PROBLEM THIS EXISTS FOR ────────────────────────────────────────────
// The website renders results in React DOM inside src/App.jsx. The app renders
// them in React Native. They cannot share render code. Everything they share
// is data, so a content fix propagates and a decision about what a page
// CONTAINS does not.
//
// The couple type page drifted three times. The app opened with a card the
// website does not have. It drew the map with no caption where the website
// captions it. It carried a legend the website never had. Every one was found
// by a person looking at both screens and saying "this is still different",
// which is not a process.
//
// api/_lib/section-blocks.js is the inventory both surfaces owe: for each
// section, which blocks it contains. This checks that both actually have them.
//
// ── WHY MARKERS AND NOT INFERENCE ──────────────────────────────────────────
// Each renderer writes a comment where it draws a block:
//
//     // block: couple-type/map
//
// Guessing which JSX corresponds to which idea would be a checker that is
// confidently wrong, which is worse than no checker. A marker is a claim the
// author makes, and this verifies the claim is made in both places.
//
// ── WHAT THIS DOES NOT CHECK ───────────────────────────────────────────────
// How anything looks, what order the blocks are drawn in within a file, or
// whether the copy matches. Order is in the spec as documentation for a person
// and is not enforced, because the two surfaces legitimately stack things
// differently on a phone. This checks presence and absence, which is where the
// drift has actually been.

import { readFileSync } from 'fs';
import { SECTION_BLOCKS, PLANNED, marker } from '../api/_lib/section-blocks.js';

const ROOT = new URL('..', import.meta.url).pathname;

const SURFACES = [
  { name: 'website', file: 'src/App.jsx' },
  { name: 'app', file: 'attune-app/src/components/results.tsx' },
];

const sources = SURFACES.map((s) => ({
  ...s,
  text: readFileSync(ROOT + s.file, 'utf8'),
}));

const problems = [];
let claimed = 0;

for (const [section, blocks] of Object.entries(SECTION_BLOCKS)) {
  for (const block of blocks) {
    const tag = marker(section, block.id);
    const has = sources.map((s) => ({ name: s.name, present: s.text.includes(tag) }));
    const present = has.filter((h) => h.present).map((h) => h.name);
    const missing = has.filter((h) => !h.present).map((h) => h.name);

    if (present.length === sources.length) { claimed += 1; continue; }
    if (present.length === 0) {
      // Neither surface claims it. Either the spec is ahead of both, which is
      // fine while something is being built, or the block is not real.
      problems.push(`${tag}: neither surface claims this block`);
      continue;
    }
    problems.push(
      `${tag}: ${present.join(', ')} has it, ${missing.join(', ')} does not`
      + (block.note ? `\n      ${block.note}` : ''));
  }
}

// A marker in a renderer that the spec does not list is the other direction of
// the same drift: a surface grew something the other was never told about.
for (const s of sources) {
  for (const m of s.text.matchAll(/block:\s*([a-z0-9-]+)\/([a-z0-9-]+)/g)) {
    const [, section, id] = m;
    // A marker for a block that is only PLANNED is fine, and is how a surface
    // gets ahead of adoption: it means that surface is already ready and the
    // section is waiting on the other one. Only a name neither list knows is
    // drift, because that is a surface inventing a block on its own.
    const known = SECTION_BLOCKS[section]?.some((b) => b.id === id)
      || PLANNED[section]?.some((b) => b.id === id);
    if (!known) problems.push(`${s.name} draws ${section}/${id}, which neither the spec nor the queue lists`);
  }
}

if (problems.length) {
  console.error('[check-section-blocks] the two results experiences do not contain the same things:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('api/_lib/section-blocks.js is what both surfaces owe. Add the block to');
  console.error('whichever renderer is missing it and mark it, or remove it from the spec');
  console.error('if it should not exist. A block is something a reader would notice gone.');
  process.exit(1);
}

const total = Object.values(SECTION_BLOCKS).reduce((n, b) => n + b.length, 0);
console.log(`[check-section-blocks] ${claimed} of ${total} blocks present on both surfaces.`);
