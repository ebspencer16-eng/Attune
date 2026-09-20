// Fails the build when a React effect in the app depends on state it also sets.
//
// That is a self-feeding loop. exercise.tsx had one: the effect fetched the
// questions and depended on the state it wrote them to. Every response is a new
// object, so writing it changed the dependency and re-ran the effect. Measured
// at 3,522 fetches in twenty seconds, which is roughly 175 requests a second
// per signed-in person for as long as the screen was open.
//
// Nothing errors, nothing looks wrong on screen, and a fixture hides it
// completely: require returns the same object every time, so React bails out of
// the update and the loop never starts. It only appears against a real network
// response, which is the worst place to find it.
//
// It arrived through an unbounded find and replace that rewrote every matching
// dependency list in the file, not just the intended one.

import { readFileSync, readdirSync, statSync } from 'fs';

const SRC = new URL('../attune-app/src/', import.meta.url);

function sources(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = new URL(entry, dir);
    if (statSync(full).isDirectory()) { out.push(...sources(new URL(`${entry}/`, dir))); continue; }
    if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const setterFor = (name) => 'set' + name[0].toUpperCase() + name.slice(1);
const problems = [];

for (const file of sources(SRC)) {
  const src = readFileSync(file, 'utf8');
  const rel = file.pathname.slice(file.pathname.indexOf('attune-app/'));
  /**
   * ── A ONE-LINE EFFECT IS STILL AN EFFECT ─────────────────────────────
   * This required a newline and exactly two spaces before the closing brace,
   * which is what a multi-line effect at the top level of a component looks
   * like. An effect written on one line matched nothing, so the regex ran past
   * it to the next hook's dependency array and reported that one's deps
   * against this one's body: a false positive, and a one-line effect that
   * really did feed itself would have been invisible.
   *
   * Non-greedy to the FIRST `}, [ ... ]);`, whatever is in front of it. That
   * is narrower than what it replaces, not wider: it can only stop sooner.
   */
  for (const m of src.matchAll(/useEffect\(\(\) => \{([\s\S]*?)\}, \[([^\]]*)\]\);/g)) {
    const [, body, deps] = m;
    for (const dep of deps.split(',').map(d => d.trim()).filter(Boolean)) {
      // A dependency that is not plain state cannot be matched this way, and
      // that is fine: this is a targeted check for the exact shape that bit,
      // not a general exhaustive-deps linter.
      const setter = setterFor(dep);
      if (new RegExp(`\\b${setter}\\s*\\(`).test(body)) {
        problems.push(`${rel}: effect depends on \`${dep}\` and calls ${setter}() inside it.`);
      }
    }
  }
}

if (problems.length) {
  console.error('[check-effect-deps] an effect feeds itself:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('Remove the state from the dependency list. If the effect needs to');
  console.error('re-run on demand, depend on a counter the retry path bumps.');
  process.exit(1);
}

console.log('[check-effect-deps] no effect depends on state it sets.');
