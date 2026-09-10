// Fails the build when the results nav can list a section the payload cannot
// fill.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// Ellie: "No info filled in on our app's relationship reflection pages."
//
// /api/results decides two things separately. Which sections exist, which
// becomes the nav, and which payloads to build. Those were two independent
// judgements written in two places, and for Relationship Reflection they
// disagreed:
//
//   nav      hasReflection: ownership.ownsReflection
//   payload  reflection:    ownership.ownsReflection && bothDone('ex3')
//
// A couple who owned the exercise and had not both finished it got four nav
// entries leading to four pages with nothing on them. Nothing errored. The nav
// was answering "did you buy this" and the data was answering "did you both do
// it", and only one of those is the question a reader is asking.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// That the two conditions are the same expression, by reading the source of
// the endpoint rather than by running it: standing up a couple with every
// combination of ownership and completion means building the fixture that
// decides the answer, which is a test of the fixture.
//
// It pins the pairing for reflection and intimacy. Conflict is deliberately
// exempt and says why below.

import { readFileSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;
const src = readFileSync(ROOT + 'api/results.js', 'utf8');

const problems = [];

// ── 1. The nav and the flat list must be the same object ───────────────────
// They were two identical literals. Two copies of a rule agree right up until
// one is edited.
const navArg = src.match(/nav:\s*resultsNav\(([^)]*)\)/)?.[1]?.trim();
const secArg = src.match(/sections:\s*sectionsWithLabels\(([^)]*)\)/)?.[1]?.trim();
if (!navArg || !secArg) {
  problems.push('cannot find the resultsNav / sectionsWithLabels calls in api/results.js');
} else if (navArg !== secArg || navArg.startsWith('{')) {
  problems.push(
    'the nav and the section list are built from different arguments:\n'
    + `      resultsNav(${navArg})\n`
    + `      sectionsWithLabels(${secArg})\n`
    + '      Pass one object to both. Two literals is two rules.');
}

/**
 * Sections whose nav entry must carry the same condition as their payload.
 *
 * `flag` is the field passed to resultsNav; `payload` is the const built
 * further up. Both are read out of the source and compared as text, so a
 * change to either without the other fails here.
 */
const PAIRED = [
  { name: 'reflection', flag: 'hasReflection', payload: 'reflection' },
  { name: 'intimacy', flag: 'intimacyReady', payload: 'intimacy' },
];

for (const { name, flag, payload } of PAIRED) {
  const navCond = src.match(new RegExp(`${flag}:\\s*([^,\\n]+)`))?.[1]?.trim();
  // `const reflection = (<cond>)` / `const intimacy = (<cond>)`
  const dataCond = src.match(
    new RegExp(`const ${payload} = \\(([^)]*(?:\\([^)]*\\))?[^)]*)\\)\\s*\\n?\\s*\\?`))?.[1]?.trim();

  if (!navCond) { problems.push(`cannot find the nav condition for ${name} (${flag})`); continue; }
  if (!dataCond) { problems.push(`cannot find the payload condition for ${name}`); continue; }

  // Compared after stripping whitespace: these are written on one line in one
  // place and wrapped in the other.
  const norm = (t) => t.replace(/\s+/g, ' ').trim();
  if (norm(navCond) !== norm(dataCond)) {
    problems.push(
      `${name} is listed in the nav under a different condition than the one that\n`
      + '      builds its data, so the nav can offer pages the payload leaves empty:\n'
      + `      nav:     ${norm(navCond)}\n`
      + `      payload: ${norm(dataCond)}`);
  }
}

// ── 2. Conflict is exempt, and that has to stay deliberate ─────────────────
// Half of Conflict Patterns is a person's own answers, which render as soon as
// they finish rather than waiting on their partner. A page with only your half
// on it is the intended page there, which is true of no other section. If the
// exemption ever stops being written down, it stops being a decision.
if (!/conflictListed: ownership\.ownsConflict/.test(src)) {
  problems.push(
    'conflictListed is no longer plain ownership. That was deliberate: half of\n'
    + '      Conflict Patterns renders from one person’s answers alone. If this is a\n'
    + '      real change, say so here and in api/results.js.');
}

if (problems.length) {
  console.error('[check-section-payloads] the nav can offer a section the data cannot fill:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('A section in the nav is a promise that there is something on the other');
  console.error('side of it. "Did you buy this" and "did you both do it" are different');
  console.error('questions, and only the second one answers what a reader is asking.');
  process.exit(1);
}

console.log(
  `[check-section-payloads] nav and section list share one description; `
  + `${PAIRED.length} paired sections agree, conflict exempt by design.`);
