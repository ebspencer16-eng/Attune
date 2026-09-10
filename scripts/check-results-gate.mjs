// Fails the build when anything decides for itself whether results are open.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// One question, "can this couple see their results", had three answers:
//
//   api/home.js      both partners through the two core exercises
//   api/results.js   both partners through Communication, and nothing else
//   src/App.jsx      my Communication and Expectations, a partner who had
//                    finished those two, and intimacy when the couple owned it
//
// None of them was broken. Each was written when it was written, and the
// product grew exercises none of them was widened for. A couple who owned
// Conflict Patterns and had not finished it were let into the full results
// experience with one section locked, which is the answer no version of the
// rule intended.
//
// api/_lib/results-gate.js is the single answer now. This keeps it single.
//
// ── WHAT IT LOOKS FOR ──────────────────────────────────────────────────────
// Two things, because the rule can be re-implemented two ways.
//
// 1. Every file that gates results must reach the gate. A file that names
//    resultsReady or bothDone and never imports results-gate.js is either
//    reading a value someone else computed, which is fine and it will say so
//    by not computing one, or it is computing its own, which is the bug.
//
// 2. Nothing may enumerate exercises inside a readiness expression. The three
//    old versions were all of the form "ex1 && ex2 && ...". That pattern in a
//    line that also mentions readiness is the rule being restated.
//
// ── WHAT IT DELIBERATELY DOES NOT COVER ────────────────────────────────────
// Whether the gate's answer is USED once obtained. A file could import it,
// call it, and ignore the result. That is not this gate's promise, and
// pretending otherwise would be the kind of check that certifies more than it
// tests. What stops that is that a results screen with no gate on it is
// visible to anyone looking at the product.

import { readFileSync } from 'fs';
import { resultsGate } from '../api/_lib/results-gate.js';

const ROOT = new URL('..', import.meta.url).pathname;

/** Files that decide, or could decide, whether results are open. */
const DECIDERS = ['api/home.js', 'api/results.js', 'src/App.jsx'];

/** Names that mean "results are open" in this codebase. */
const READINESS = /\b(resultsReady|bothDone)\b/;

const problems = [];

for (const file of DECIDERS) {
  const src = readFileSync(ROOT + file, 'utf8');

  if (!/from\s+['"][^'"]*results-gate\.js['"]/.test(src)) {
    problems.push(`${file} decides results readiness without importing api/_lib/results-gate.js`);
  }

  // A readiness assignment that names two or more exercises is the rule being
  // written again. Assignment only: a line that merely passes resultsReady
  // around, or comments describing the history, are not re-implementations.
  src.split('\n').forEach((line, i) => {
    if (/^\s*(\/\/|\*)/.test(line)) return;
    if (!READINESS.test(line)) return;
    if (!/(const|let|var)\s+\w*(resultsReady|bothDone)\w*\s*=/i.test(line)) return;
    const named = ['ex1', 'ex2', 'ex3', 'intimacy', 'conflict']
      .filter((k) => new RegExp(`\\b${k}[A-Z_]?\\w*`).test(line));
    if (named.length >= 2) {
      problems.push(
        `${file}:${i + 1} works out readiness from ${named.join(', ')} directly.\n`
        + `      Call resultsGate() instead; it knows which exercises the couple owns.\n`
        + `      ${line.trim().slice(0, 92)}`);
    }
  });
}

// The gate itself must cover every exercise, not a named subset. It reads the
// registry, so this is checking that it still does.
const gateSrc = readFileSync(ROOT + 'api/_lib/results-gate.js', 'utf8');
if (!/for\s*\(\s*const\s+\w+\s+of\s+EXERCISES\s*\)/.test(gateSrc)) {
  problems.push(
    'api/_lib/results-gate.js no longer walks EXERCISES.\n'
    + '      The whole point is that adding an exercise widens the gate with no edit here.');
}

// ── AND THAT THE ONE RULE ANSWERS CORRECTLY ────────────────────────────────
// Locating the rule is not the same as testing it. These are the cases that
// were actually wrong, written as the couples they happened to.
const cases = [
  {
    name: 'core package, both finished: open',
    pkg: {}, partnerLinked: true,
    mine: { ex1: 1, ex2: 1 }, theirs: { ex1: 1, ex2: 1 },
    ready: true,
  },
  {
    name: "Ellie's case: owns Conflict Patterns, partner has not finished it",
    pkg: { hasConflict: true }, partnerLinked: true,
    mine: { ex1: 1, ex2: 1, conflict: 1 }, theirs: { ex1: 1, ex2: 1 },
    ready: false, reason: 'partner_incomplete', waiting: ['conflict'],
  },
  {
    name: 'does not own Conflict Patterns, so not finishing it cannot block',
    pkg: {}, partnerLinked: true,
    mine: { ex1: 1, ex2: 1 }, theirs: { ex1: 1, ex2: 1 },
    ready: true,
  },
  {
    name: 'owns intimacy and reflection, all four done both sides: open',
    pkg: { hasIntimacy: true, hasAnniversary: true }, partnerLinked: true,
    mine: { ex1: 1, ex2: 1, ex3: 1, intimacy: 1 },
    theirs: { ex1: 1, ex2: 1, ex3: 1, intimacy: 1 },
    ready: true,
  },
  {
    name: 'no partner linked: closed, whatever anyone has finished',
    pkg: {}, partnerLinked: false,
    mine: { ex1: 1, ex2: 1 }, theirs: { ex1: 1, ex2: 1 },
    ready: false, reason: 'no_partner_linked',
  },
  {
    name: 'both still owe something: neither_complete',
    pkg: { hasConflict: true }, partnerLinked: true,
    mine: { ex1: 1, ex2: 1 }, theirs: { ex1: 1, ex2: 1, conflict: 1 },
    ready: false, reason: 'you_incomplete', waiting: ['conflict'],
  },
];

for (const c of cases) {
  const got = resultsGate({
    pkg: c.pkg, mine: c.mine, theirs: c.theirs, partnerLinked: c.partnerLinked,
  });
  if (got.ready !== c.ready) {
    problems.push(`the rule is wrong for "${c.name}": expected ready=${c.ready}, got ${got.ready}`);
    continue;
  }
  if (c.reason && got.reason !== c.reason) {
    problems.push(`"${c.name}": expected reason ${c.reason}, got ${got.reason}`);
  }
  if (c.waiting) {
    const keys = got.waitingOn.map((w) => w.key).sort().join(',');
    if (keys !== c.waiting.sort().join(',')) {
      problems.push(`"${c.name}": expected to wait on ${c.waiting.join(',')}, got ${keys || 'nothing'}`);
    }
  }
}

if (problems.length) {
  console.error('[check-results-gate] results readiness is being decided in more than one place:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('One question, one answer: api/_lib/results-gate.js. Three copies of this');
  console.error('rule is how a couple who had not finished Conflict Patterns was shown');
  console.error('everything else.');
  process.exit(1);
}

console.log(
  `[check-results-gate] ${DECIDERS.length} deciders, all reading one rule; `
  + `${cases.length} readiness cases correct.`);
