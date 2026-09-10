// Fails the build when a stored answer set can be deleted on the strength of a
// read nobody checked.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// Sign-in fetched the profile and threw the error away:
//
//     const { data: profile } = await sb.from('profiles').select('*')...
//
// then restored each exercise from it, clearing the local copy whenever the
// field was absent. A read that failed, on a mobile cold start with no network
// yet or a transient auth hiccup, produces exactly the same `undefined`. So the
// answers were deleted from the device, the dashboard said the exercise had
// never been done, and results locked, until some later load happened to
// succeed and put them back.
//
// Ellie hit it more than once and had no way to know her answers were still on
// the server. They were: answers are only ever written on completion, never as
// null. That is luck in the write path, not safety in the read path.
//
// ── THE RULE ───────────────────────────────────────────────────────────────
// Absence is only absence when the server actually answered. Every clear of a
// stored answer set has to be guarded by something that distinguishes "there
// is nothing" from "we did not hear back".
//
// Mark a clear that is genuinely not a read result with `safe-clear:` and the
// reason, on a comment line just above it.
//
// This is the same lesson as "absence is also what deletion looks like" in
// CLAUDE.md, one layer down: there, an audit could not tell a gap from a
// decision; here, code cannot tell an empty column from a failed request.

import { readFileSync } from 'fs';

const FILES = ['src/App.jsx'];

/** Keys that hold someone's answers. Losing one loses their work. */
const ANSWER_KEYS = /'attune_(ex1|ex2|ex3|intimacy|conflict|budget|checklist)'/;

const problems = [];
let guarded = 0;

for (const file of FILES) {
  const src = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    if (!/localStorage\.removeItem\(/.test(line)) return;
    if (!ANSWER_KEYS.test(line)) return;

    // ── THE GUARD HAS TO BE THIS CLEAR'S OWN ──────────────────────────────
    // Two windows, deliberately different sizes, because widening one window
    // to cover both made this check pass on a planted bug: a neighbouring
    // line's `read.ok` satisfied a clear that had none of its own.
    //
    // A read guard counts only on the clear's own line or the line that opens
    // its branch. A comment explaining a deliberate reset may sit further up,
    // because that is where a comment belongs, and a comment cannot be
    // borrowed from the branch next door the way an identifier can.
    const branch = lines.slice(Math.max(0, i - 1), i + 1).join('\n');
    const readGuard = /\bread\.ok\b|\bok\s*&&|!error|error\s*==\s*null/.test(branch);

    // An explicit marker, not prose. Matching on phrases like "deliberate
    // reset" or "admin reset" let a comment that merely mentioned admin resets
    // vouch for a clear three lines below it, and a planted bug passed. A
    // marker has to be typed on purpose:
    //
    //     // safe-clear: why this is not a read result
    const why = lines.slice(Math.max(0, i - 6), i + 1).join('\n');
    const deliberate = /safe-clear:/.test(why);

    if (readGuard || deliberate) { guarded += 1; return; }

    problems.push(
      `${file}:${i + 1}  clears ${ANNOTATE(line)} with nothing distinguishing\n`
      + '      "the server has none" from "the read failed"');
  });
}

function ANNOTATE(line) {
  return (ANSWER_KEYS.exec(line) || [, 'an answer set'])[0];
}

if (problems.length) {
  console.error('[check-answer-clears] someone\'s answers can be deleted by a failed read:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('Check the error from the read that produced the value, and clear only when');
  console.error('it succeeded. If the clear is a deliberate reset, say so in a comment on');
  console.error('the same lines so this check can tell the difference.');
  process.exit(1);
}

console.log(`[check-answer-clears] ${guarded} clears of stored answers, every one guarded by a successful read.`);
