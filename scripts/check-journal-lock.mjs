#!/usr/bin/env node
/**
 * A wrong passcode does not open the journal.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Ellie: "I put in an incorrect password into the simulator (journal asked for
 * expo password) and it still let me in. Can we do sign in with phone passcode
 * on the actual app?"
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * It was not in any of the calls. It was in which outcomes were treated as the
 * same outcome. The whole of unlock() sat inside one try, and the catch opened
 * the journal, because it was written for one case: a build where
 * expo-local-authentication resolves as JavaScript but is not in the binary,
 * where refusing is a door with no key. But a native module that is missing
 * and a passcode that is wrong both arrive as a throw. One catch, two
 * meanings, and the one that mattered lost.
 *
 * That is this codebase's usual failure wearing an unusual costume. It is not
 * two copies of a rule; it is two situations collapsed into one branch, where
 * nothing says they are different and the safer reading is the one that got
 * dropped.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * By running the app's own `lockDecision`, lifted out of the TSX by brace
 * depth and stripped of its types, rather than by reading it. Reading it is a
 * description of the rule, and a description is what drifts.
 *
 * It has to be the copy that ships. An Expo project cannot import from api/,
 * and a .mjs cannot import a .tsx, so the alternative would be a second copy
 * of this mapping living in this file, which is the exact failure the mapping
 * was extracted to avoid. check-card-type-clipping.mjs solved the same problem
 * the same way and for the same reason.
 *
 * If the function is renamed or moved this throws rather than passing. A gate
 * that has lost its subject must never report success.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether Face ID works. That is a native module on a real phone, it cannot
 * run here, and the simulator is not evidence about it: a simulator has no
 * passcode and nothing enrolled, so the honest answer for it is "this device
 * cannot be asked", and the journal opens on it by design. Proving the lock
 * itself needs a TestFlight build, which is in TASKS.md.
 *
 * Not the rest of the app either. This is one screen's door. Everything behind
 * every other screen is behind the account, which is a different promise and a
 * weaker one, and nothing here should be read as widening it.
 */

import { readFileSync } from 'node:fs';
import { transform } from 'esbuild';

const ROOT = new URL('..', import.meta.url).pathname;
const FILE = `${ROOT}attune-app/src/components/journal.tsx`;
const src = readFileSync(FILE, 'utf8');

/** The app's own mapping, made callable. */
async function appDecision() {
  const at = src.indexOf('export function lockDecision(');
  if (at < 0) throw new Error('cannot find `export function lockDecision(` in journal.tsx');
  /**
   * Past the parameter list first. The parameter is destructured and typed, so
   * the first `{` in this function is inside the parentheses, and counting
   * braces from the name closes the function on the parameter's own closing
   * brace. Parens to zero, then braces.
   */
  let parens = 0, bodyAt = -1;
  for (let i = src.indexOf('(', at); i < src.length; i++) {
    if (src[i] === '(') parens++;
    else if (src[i] === ')') { parens--; if (parens === 0) { bodyAt = src.indexOf('{', i); break; } }
  }
  if (bodyAt < 0) throw new Error('cannot find the body of `lockDecision()` in journal.tsx');
  let depth = 0, end = -1, seen = false;
  for (let i = bodyAt; i < src.length; i++) {
    if (src[i] === '{') { depth++; seen = true; }
    else if (src[i] === '}') { depth--; if (seen && depth === 0) { end = i + 1; break; } }
  }
  if (end < 0) throw new Error('cannot find the end of `lockDecision()` in journal.tsx');
  const { code } = await transform(src.slice(at, end).replace(/^export\s+/, ''), { loader: 'ts' });
  return new Function(`${code}; return lockDecision;`)();
}

const lockDecision = await appDecision();
const fails = [];

/**
 * Every way the phone can answer.
 *
 * The four in the middle are the ones the old single catch collapsed. Each is
 * written as the thing that happens rather than as a flag, because the reason
 * a reader needs is what the situation was, not what the argument was called.
 */
const CASES = [
  ['a phone that answered Face ID or the passcode', { probe: 2, auth: { success: true } }, 'open'],
  ['a wrong passcode', { probe: 2, auth: { success: false } }, 'locked'],
  ['a face the phone did not recognise', { probe: 2, auth: { success: false } }, 'locked'],
  ['Not now, or the prompt dismissed', { probe: 2, auth: { success: false } }, 'locked'],
  ['the prompt throwing on a phone that can be asked', { probe: 2, auth: 'threw' }, 'locked'],
  ['no answer at all on a phone that can be asked', { probe: 2, auth: undefined }, 'locked'],
  ['a passcode-only phone that answered', { probe: 1, auth: { success: true } }, 'open'],
  ['a passcode-only phone that refused', { probe: 1, auth: { success: false } }, 'locked'],
  ['a phone with no passcode and nothing enrolled', { probe: 0 }, 'open-unlockable'],
  ['a build with the module missing from the binary', { probe: 'failed' }, 'open'],
];

for (const [what, input, want] of CASES) {
  const got = lockDecision(input);
  if (got !== want) {
    fails.push(`${what}: lockDecision said '${got}', and the journal must be '${want}'.`);
  }
}

/**
 * And the shape of the thing, which the cases above cannot see.
 *
 * lockDecision is only the mapping. It is worth nothing if unlock() stops
 * calling it and decides again, so the callback is held to two things: it
 * calls lockDecision, and the only place it opens the journal is on that
 * function's answer. `setUnlocked(true)` anywhere inside a catch is the bug as
 * originally found, in its original form.
 */
const fn = src.slice(src.indexOf('const unlock = useCallback('));
const bodyEnd = fn.indexOf('\n  }, []);');
if (bodyEnd < 0) {
  fails.push('cannot find the end of unlock() in journal.tsx; this gate has lost half its subject.');
} else {
  const body = fn.slice(0, bodyEnd);
  if (!/lockDecision\(/.test(body)) {
    fails.push('unlock() no longer calls lockDecision. The mapping above is then'
      + ' a description of a rule the screen does not follow, which is worse than'
      + ' no rule: the cases pass and the door is somewhere else.');
  }
  for (const m of body.matchAll(/catch[\s\S]{0,200}?\}/g)) {
    if (/setUnlocked\(\s*true\s*\)/.test(m[0])) {
      fails.push('unlock() opens the journal from inside a catch. That is the'
        + ' original bug exactly: a missing native module and a wrong passcode'
        + ' both arrive as a throw, and a catch that opens cannot tell them'
        + ' apart. The probe is the only thing allowed to open on a throw, and'
        + ' it does it through lockDecision.');
    }
  }
}

if (fails.length) {
  console.error('\n check-journal-lock: the journal opens when it should not.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`✓ check-journal-lock: ${CASES.length} answers through the app's own lockDecision; only a genuine success, or a phone with nothing to ask, opens it.`);
